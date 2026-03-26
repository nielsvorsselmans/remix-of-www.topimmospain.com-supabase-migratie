import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { XMLParser } from 'https://esm.sh/fast-xml-parser@4.3.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Minimum time before a property is definitively marked as sold (24 hours)
const PENDING_SOLD_THRESHOLD_MS = 24 * 60 * 60 * 1000;

// Maximum number of properties that can be marked as pending sold in a single run
const MAX_PENDING_SOLD_PER_RUN = 50;

interface CheckSoldStats {
  total_in_xml: number;
  total_in_db: number;
  newly_pending_sold: number;
  confirmed_sold: number;
  reactivated: number;
  projects_marked_sold: number;
  stale_force_sold: number;
  duration_ms: number;
  aborted: boolean;
  abort_reason?: string;
}

/**
 * Fetch ALL rows matching a query using pagination to bypass the 1000-row default limit.
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const stats: CheckSoldStats = {
    total_in_xml: 0,
    total_in_db: 0,
    newly_pending_sold: 0,
    confirmed_sold: 0,
    reactivated: 0,
    projects_marked_sold: 0,
    stale_force_sold: 0,
    duration_ms: 0,
    aborted: false,
  };

  try {
    console.log('[Check Sold] Starting two-phase sold properties check...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get XML API IDs — either provided or downloaded
    let xmlApiIds: Set<string>;
    let requestBody: { xml_api_ids?: string[] } = {};
    
    try { requestBody = await req.json(); } catch { /* no body */ }

    if (requestBody.xml_api_ids && Array.isArray(requestBody.xml_api_ids) && requestBody.xml_api_ids.length > 0) {
      xmlApiIds = new Set(requestBody.xml_api_ids);
      console.log(`[Check Sold] Using provided ${xmlApiIds.size} API IDs`);
    } else {
      console.log('[Check Sold] No API IDs provided, downloading XML...');
      const xmlUrl = Deno.env.get('REDSP_XML_URL');
      if (!xmlUrl) throw new Error('REDSP_XML_URL environment variable not set');

      const xmlResponse = await fetch(xmlUrl, { headers: { 'Accept': 'application/xml' } });
      if (!xmlResponse.ok) throw new Error(`Failed to fetch XML: ${xmlResponse.status}`);

      const xmlText = await xmlResponse.text();
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
      const xmlData = parser.parse(xmlText);
      let properties = xmlData?.root?.property || [];
      if (!Array.isArray(properties)) properties = properties ? [properties] : [];
      xmlApiIds = new Set(properties.map((p: any) => p.ref).filter((ref: any) => ref));
    }

    stats.total_in_xml = xmlApiIds.size;
    console.log(`[Check Sold] Found ${stats.total_in_xml} properties in XML feed`);

    // PAGINATED: Get ALL active RedSP properties (not just first 1000)
    const existingProperties = await fetchAllPaginated(
      supabase,
      'properties',
      'api_id, status, pending_sold_at, updated_at',
      (q: any) => q.eq('api_source', 'redsp').neq('status', 'sold')
    );

    stats.total_in_db = existingProperties.length;
    console.log(`[Check Sold] Found ${stats.total_in_db} active RedSP properties in database (paginated)`);

    // Validate XML feed completeness
    if (stats.total_in_db > 100 && stats.total_in_xml < stats.total_in_db * 0.5) {
      stats.aborted = true;
      stats.abort_reason = `XML feed seems incomplete: ${stats.total_in_xml} vs ${stats.total_in_db} in DB`;
      console.error(`[Check Sold] ABORTED: ${stats.abort_reason}`);
      stats.duration_ms = Date.now() - startTime;
      return new Response(JSON.stringify({ success: false, stats }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const now = new Date();
    const thresholdTime = new Date(now.getTime() - PENDING_SOLD_THRESHOLD_MS);

    const newlyMissing: string[] = [];
    const confirmedSold: string[] = [];
    const staleForceSold: string[] = [];
    const returned: string[] = [];

    for (const prop of existingProperties) {
      const inXml = xmlApiIds.has(prop.api_id);
      const hasPendingSold = prop.pending_sold_at !== null;
      
      if (!inXml) {
        if (!hasPendingSold) {
          // Check if this property hasn't been updated by the feed in a long time
          // If updated_at is older than 24h, it's stale — mark as sold immediately
          const lastUpdate = prop.updated_at ? new Date(prop.updated_at) : null;
          if (lastUpdate && lastUpdate < thresholdTime) {
            staleForceSold.push(prop.api_id);
          } else {
            newlyMissing.push(prop.api_id);
          }
        } else {
          const pendingTime = new Date(prop.pending_sold_at);
          if (pendingTime < thresholdTime) {
            confirmedSold.push(prop.api_id);
          }
          // else: still within grace period, leave it
        }
      } else if (hasPendingSold) {
        returned.push(prop.api_id);
      }
    }

    console.log(`[Check Sold] Newly missing: ${newlyMissing.length}, Stale force-sold: ${staleForceSold.length}, Confirmed: ${confirmedSold.length}, Returned: ${returned.length}`);

    // Check for anomaly: too many newly missing
    if (newlyMissing.length > MAX_PENDING_SOLD_PER_RUN) {
      stats.aborted = true;
      stats.abort_reason = `Anomaly: ${newlyMissing.length} properties would be pending sold (max: ${MAX_PENDING_SOLD_PER_RUN})`;
      console.error(`[Check Sold] ABORTED: ${stats.abort_reason}`);
      stats.duration_ms = Date.now() - startTime;
      return new Response(JSON.stringify({ success: false, stats }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Step 1: Mark newly missing as pending sold
    if (newlyMissing.length > 0) {
      const { error } = await supabase
        .from('properties')
        .update({ pending_sold_at: now.toISOString(), updated_at: now.toISOString() })
        .eq('api_source', 'redsp')
        .in('api_id', newlyMissing);
      if (error) console.error(`[Check Sold] Error marking pending sold:`, error.message);
      else stats.newly_pending_sold = newlyMissing.length;
    }

    // Step 2: Reactivate returned properties
    if (returned.length > 0) {
      const { error } = await supabase
        .from('properties')
        .update({ pending_sold_at: null, updated_at: now.toISOString() })
        .eq('api_source', 'redsp')
        .in('api_id', returned);
      if (error) console.error(`[Check Sold] Error reactivating:`, error.message);
      else stats.reactivated = returned.length;
    }

    // Step 3: Confirm sold (pending 24h+) AND stale properties (not updated 24h+, not in XML)
    const allToMarkSold = [...confirmedSold, ...staleForceSold];
    if (allToMarkSold.length > 0) {
      // Process in batches of 100 to avoid query limits
      for (let i = 0; i < allToMarkSold.length; i += 100) {
        const batch = allToMarkSold.slice(i, i + 100);
        const { error } = await supabase
          .from('properties')
          .update({ status: 'sold', pending_sold_at: null, updated_at: now.toISOString() })
          .eq('api_source', 'redsp')
          .in('api_id', batch);
        if (error) console.error(`[Check Sold] Error confirming sold batch:`, error.message);
      }
      
      stats.confirmed_sold = confirmedSold.length;
      stats.stale_force_sold = staleForceSold.length;
      console.log(`[Check Sold] Marked ${confirmedSold.length} confirmed + ${staleForceSold.length} stale as sold`);

      // Update project statuses for affected projects
      const soldProps = await fetchAllPaginated(
        supabase,
        'properties',
        'project_id',
        (q: any) => q.eq('api_source', 'redsp').in('api_id', allToMarkSold).not('project_id', 'is', null)
      );

      const affectedProjectIds = [...new Set(soldProps.map((p: any) => p.project_id).filter(Boolean))];

      for (const projectId of affectedProjectIds) {
        const { count } = await supabase
          .from('properties')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', projectId)
          .eq('status', 'available');

        if (count === 0) {
          const { error } = await supabase
            .from('projects')
            .update({ status: 'sold_out', updated_at: now.toISOString() })
            .eq('id', projectId)
            .not('status', 'in', '("sold","sold_out")');
          if (!error) stats.projects_marked_sold++;
        }
      }

      if (stats.projects_marked_sold > 0) {
        console.log(`[Check Sold] Marked ${stats.projects_marked_sold} projects as sold_out`);
      }
    }

    stats.duration_ms = Date.now() - startTime;
    console.log(`[Check Sold] Completed in ${stats.duration_ms}ms`, stats);

    return new Response(
      JSON.stringify({ success: true, stats }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Check Sold] Error:', error);
    stats.duration_ms = Date.now() - startTime;
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error', stats }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
