import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProjectMetadata {
  price_from: number | null;
  price_to: number | null;
  min_bedrooms: number | null;
  max_bedrooms: number | null;
  property_types: string[];
  property_count: number;
}

/**
 * Fetch ALL rows using pagination to bypass the 1000-row default limit.
 */
async function fetchAllPaginated(
  supabase: any,
  table: string,
  select: string,
  filters: (query: any) => any,
  pageSize = 1000
): Promise<any[]> {
  const allRows: any[] = [];
  let from = 0;

  while (true) {
    let query = supabase.from(table).select(select).range(from, from + pageSize - 1);
    query = filters(query);
    const { data, error } = await query;

    if (error) throw new Error(`Paginated fetch error on ${table}: ${error.message}`);
    if (!data || data.length === 0) break;

    allRows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return allRows;
}

async function calculateProjectMetadata(
  supabase: any,
  projectId: string
): Promise<ProjectMetadata> {
  const properties = await fetchAllPaginated(
    supabase,
    'properties',
    'price, bedrooms, property_type, status',
    (q: any) => q.eq('project_id', projectId)
  );

  if (properties.length === 0) {
    return { price_from: null, price_to: null, min_bedrooms: null, max_bedrooms: null, property_types: [], property_count: 0 };
  }

  const availableProps = properties.filter((p: any) => p.status !== 'sold');
  const prices = availableProps.map((p: any) => Number(p.price)).filter((p: number) => p > 0);
  const bedrooms = availableProps.map((p: any) => Number(p.bedrooms)).filter((b: number) => b > 0);
  const types = [...new Set(availableProps.map((p: any) => p.property_type).filter((t: any): t is string => t !== null && t !== undefined))];

  return {
    price_from: prices.length > 0 ? Math.min(...prices) : null,
    price_to: prices.length > 0 ? Math.max(...prices) : null,
    min_bedrooms: bedrooms.length > 0 ? Math.min(...bedrooms) : null,
    max_bedrooms: bedrooms.length > 0 ? Math.max(...bedrooms) : null,
    property_types: types,
    property_count: availableProps.length,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    console.log('[Link Projects] Starting project linking...');

    // PAGINATED: Get ALL unlinked properties (not just first 1000)
    const unlinkedProps = await fetchAllPaginated(
      supabase,
      'properties',
      'development_id, city, region, country, latitude, longitude, image_url, images, address, property_type',
      (q: any) => q.not('development_id', 'is', null).is('project_id', null)
    );

    if (unlinkedProps.length === 0) {
      console.log('[Link Projects] No unlinked properties found');
      return new Response(
        JSON.stringify({ success: true, stats: { projectsCreated: 0, projectsUpdated: 0, propertiesLinked: 0 } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group by development_id
    const devRefMap = new Map<string, any>();
    for (const prop of unlinkedProps) {
      if (prop.development_id && !devRefMap.has(prop.development_id)) {
        devRefMap.set(prop.development_id, prop);
      }
    }

    const uniqueRefs = Array.from(devRefMap.keys());
    console.log(`[Link Projects] Found ${uniqueRefs.length} unique development_ids to process (from ${unlinkedProps.length} unlinked properties)`);

    // Batch fetch existing projects
    const { data: existingProjects } = await supabase
      .from('projects')
      .select('id, development_ref')
      .in('development_ref', uniqueRefs);

    const existingProjectMap = new Map(
      (existingProjects || []).map((p: any) => [p.development_ref, p.id])
    );

    let projectsCreated = 0;
    let projectsUpdated = 0;
    let propertiesLinked = 0;

    for (const devRef of uniqueRefs) {
      try {
        const sample = devRefMap.get(devRef);
        if (!sample) continue;

        let featured_image: string | null = sample.image_url || null;
        if (!featured_image && sample.images && Array.isArray(sample.images) && sample.images.length > 0) {
          featured_image = typeof sample.images[0] === 'string' ? sample.images[0] : null;
        }

        let projectId: string;
        const existingProjectId = existingProjectMap.get(devRef);

        if (existingProjectId) {
          projectId = existingProjectId;
          projectsUpdated++;
        } else {
          const { data: newProject, error: insertError } = await supabase
            .from('projects')
            .insert({
              development_ref: devRef,
              name: `Project ${sample.city || 'Onbekend'}`,
              display_title: `Diverse woningen in ${sample.city || 'Spanje'}`,
              project_key: `dev-${String(devRef).toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
              city: sample.city,
              location: sample.address,
              region: sample.region,
              country: sample.country || 'Spanje',
              latitude: sample.latitude,
              longitude: sample.longitude,
              featured_image,
              active: true,
              status: 'active',
            })
            .select('id')
            .single();

          if (insertError || !newProject) {
            console.error(`[Link Projects] Error creating project for ${devRef}:`, insertError);
            continue;
          }

          projectId = newProject.id;
          projectsCreated++;
          console.log(`[Link Projects] Created project ${projectId} for ${devRef}`);
        }

        // Link all properties with this development_id
        const { count } = await supabase
          .from('properties')
          .update({ project_id: projectId })
          .eq('development_id', devRef)
          .is('project_id', null);

        propertiesLinked += count || 0;

        // Update project metadata
        const metadata = await calculateProjectMetadata(supabase, projectId);
        const newStatus = metadata.property_count > 0 ? 'active' : 'sold_out';
        
        await supabase
          .from('projects')
          .update({
            price_from: metadata.price_from,
            price_to: metadata.price_to,
            min_bedrooms: metadata.min_bedrooms,
            max_bedrooms: metadata.max_bedrooms,
            property_types: metadata.property_types,
            property_count: metadata.property_count,
            status: newStatus,
          })
          .eq('id', projectId);

        if (metadata.property_count > 0) {
          await supabase
            .from('projects')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', projectId)
            .in('status', ['sold', 'sold_out']);
        }

        console.log(`[Link Projects] Linked ${count || 0} properties to project ${projectId}, status: ${newStatus}`);
      } catch (error) {
        console.error(`[Link Projects] Error processing ${devRef}:`, error);
      }
    }

    console.log(`[Link Projects] Complete: ${projectsCreated} created, ${projectsUpdated} updated, ${propertiesLinked} linked`);

    return new Response(
      JSON.stringify({ success: true, stats: { projectsCreated, projectsUpdated, propertiesLinked } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Link Projects] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
