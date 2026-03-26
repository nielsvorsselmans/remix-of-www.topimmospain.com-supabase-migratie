import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { XMLParser } from 'https://esm.sh/fast-xml-parser@4.3.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RestoreStats {
  total_in_xml: number;
  total_sold_in_db: number;
  properties_restored: number;
  projects_restored: number;
  duration_ms: number;
  errors: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const stats: RestoreStats = {
    total_in_xml: 0,
    total_sold_in_db: 0,
    properties_restored: 0,
    projects_restored: 0,
    duration_ms: 0,
    errors: [],
  };

  try {
    // Validate admin key
    const body = await req.json().catch(() => ({}));
    const adminKey = body.adminKey || '';
    const expectedKey = Deno.env.get('ADMIN_RESTORE_KEY');
    
    if (!expectedKey) {
      return new Response(
        JSON.stringify({ error: 'Function not properly configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (adminKey !== expectedKey) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid admin key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Restore] Starting property and project restoration...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download XML feed
    const xmlUrl = Deno.env.get('REDSP_XML_URL') || 'https://xml.redsp.net/files/416/27423pmn36o/test-redsp_v4.xml';
    
    console.log('[Restore] Downloading XML feed...');
    const xmlResponse = await fetch(xmlUrl, {
      headers: { 'Accept': 'application/xml' },
    });

    if (!xmlResponse.ok) {
      throw new Error(`Failed to fetch XML: ${xmlResponse.status} ${xmlResponse.statusText}`);
    }

    const xmlText = await xmlResponse.text();
    console.log(`[Restore] XML downloaded: ${(xmlText.length / 1024 / 1024).toFixed(2)} MB`);

    // Parse XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
    const xmlData = parser.parse(xmlText);

    // Extract property references from XML
    let properties = xmlData?.root?.property || [];
    if (!Array.isArray(properties)) {
      properties = properties ? [properties] : [];
    }

    const xmlApiIds = properties
      .map((p: any) => String(p.ref))
      .filter((ref: any) => ref && ref !== 'undefined');

    stats.total_in_xml = xmlApiIds.length;
    console.log(`[Restore] Found ${stats.total_in_xml} properties in XML feed`);

    // Get all sold RedSP properties
    const { data: soldProperties, error: fetchError } = await supabase
      .from('properties')
      .select('id, api_id, project_id')
      .eq('api_source', 'redsp')
      .eq('status', 'sold');

    if (fetchError) {
      throw new Error(`Failed to fetch sold properties: ${fetchError.message}`);
    }

    stats.total_sold_in_db = soldProperties?.length || 0;
    console.log(`[Restore] Found ${stats.total_sold_in_db} sold properties in database`);

    // Find properties that are in XML but marked as sold
    const xmlApiIdSet = new Set(xmlApiIds);
    const propertiesToRestore = soldProperties?.filter(p => xmlApiIdSet.has(p.api_id)) || [];
    
    console.log(`[Restore] Found ${propertiesToRestore.length} properties to restore (in XML but marked sold)`);

    // Restore properties in batches
    const batchSize = 100;
    const propertyIdsToRestore = propertiesToRestore.map(p => p.id);
    
    for (let i = 0; i < propertyIdsToRestore.length; i += batchSize) {
      const batch = propertyIdsToRestore.slice(i, i + batchSize);
      
      const { error: updateError } = await supabase
        .from('properties')
        .update({ 
          status: 'available', 
          pending_sold_at: null 
        })
        .in('id', batch);

      if (updateError) {
        stats.errors.push(`Batch ${i / batchSize + 1} update error: ${updateError.message}`);
        console.error(`[Restore] Batch update error:`, updateError);
      } else {
        stats.properties_restored += batch.length;
        console.log(`[Restore] Restored batch ${i / batchSize + 1}: ${batch.length} properties`);
      }
    }

    console.log(`[Restore] Total properties restored: ${stats.properties_restored}`);

    // Get unique project IDs from restored properties
    const affectedProjectIds = [...new Set(propertiesToRestore.map(p => p.project_id).filter(Boolean))];
    console.log(`[Restore] Found ${affectedProjectIds.length} affected projects`);

    // Get all sold/sold_out projects
    const { data: soldProjects, error: projectFetchError } = await supabase
      .from('projects')
      .select('id, name, status')
      .in('status', ['sold', 'sold_out']);

    if (projectFetchError) {
      stats.errors.push(`Failed to fetch sold projects: ${projectFetchError.message}`);
      console.error(`[Restore] Project fetch error:`, projectFetchError);
    } else {
      console.log(`[Restore] Found ${soldProjects?.length || 0} sold/sold_out projects to check`);

      // For each sold project, check if it now has available properties
      for (const project of soldProjects || []) {
        const { count, error: countError } = await supabase
          .from('properties')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', project.id)
          .eq('status', 'available');

        if (countError) {
          stats.errors.push(`Count error for project ${project.id}: ${countError.message}`);
          continue;
        }

        if (count && count > 0) {
          // Project has available properties, restore to active
          const { error: projectUpdateError } = await supabase
            .from('projects')
            .update({ status: 'active' })
            .eq('id', project.id);

          if (projectUpdateError) {
            stats.errors.push(`Failed to restore project ${project.name}: ${projectUpdateError.message}`);
          } else {
            stats.projects_restored++;
            console.log(`[Restore] Restored project: ${project.name} (${count} available properties)`);
          }
        }
      }
    }

    stats.duration_ms = Date.now() - startTime;

    console.log(`[Restore] Complete!`, stats);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Restored ${stats.properties_restored} properties and ${stats.projects_restored} projects`,
        stats,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Restore] Fatal error:', error);
    stats.duration_ms = Date.now() - startTime;
    stats.errors.push(errorMessage);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        stats,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
