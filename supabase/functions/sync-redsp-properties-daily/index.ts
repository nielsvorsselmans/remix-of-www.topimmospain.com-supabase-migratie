import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { XMLParser } from 'https://esm.sh/fast-xml-parser@4.3.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getXmlUrl = () => Deno.env.get('REDSP_XML_URL') || 'https://xml.redsp.net/files/416/27423pmn36o/test-redsp_v4.xml';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let syncLogId: string | undefined;
  let supabaseClient: any;

  try {
    supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const startTime = new Date().toISOString();
    console.log('[Daily Sync] Starting daily RedSP properties sync at', startTime);

    // Create sync log entry
    const { data: syncLogEntry, error: syncLogError } = await supabaseClient
      .from('sync_logs')
      .insert({
        sync_type: 'redsp_daily',
        started_at: startTime,
        status: 'running',
      })
      .select()
      .single();

    if (syncLogError) {
      console.error('[Daily Sync] Failed to create sync log entry:', syncLogError);
    }
    syncLogId = syncLogEntry?.id;

    // Download and parse XML ONCE
    const xmlUrl = getXmlUrl();
    console.log('[Daily Sync] Downloading XML feed...', xmlUrl);
    const xmlResponse = await fetch(xmlUrl);
    
    if (!xmlResponse.ok) {
      throw new Error(`Failed to fetch XML: ${xmlResponse.status} ${xmlResponse.statusText}`);
    }
    
    const xmlText = await xmlResponse.text();
    console.log(`[Daily Sync] XML fetched, size: ${xmlText.length} bytes (${(xmlText.length / 1024 / 1024).toFixed(2)} MB)`);
    
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text",
      parseAttributeValue: true,
      trimValues: true,
    });
    
    const xmlDoc = parser.parse(xmlText);
    if (!xmlDoc) throw new Error('Failed to parse XML');
    
    const properties = xmlDoc?.root?.property || xmlDoc?.property || [];
    const propertyArray = Array.isArray(properties) ? properties : [properties];
    
    console.log(`[Daily Sync] Parsed ${propertyArray.length} properties from XML`);

    const batchSize = 100;
    let offset = 0;
    // Only track columns that exist in sync_logs
    let totalStats = {
      totalProcessed: 0,
      newProperties: 0,
      updatedProperties: 0,
      priceChanges: 0,
      errors: 0,
      projectsCreated: 0,
      projectsUpdated: 0,
      propertiesLinked: 0,
      markedAsSold: 0,
      projectsMarkedSold: 0,
    };
    const errorDetails: any[] = [];
    const totalBatches = Math.ceil(propertyArray.length / batchSize);
    let currentBatch = 0;
    const maxRetries = 3;
    const retryDelayMs = 2000;

    async function invokeBatchWithRetry(batchPropertyArray: any[], batchNum: number): Promise<{ success: boolean; data?: any; error?: string }> {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[Daily Sync] Batch ${batchNum} attempt ${attempt}/${maxRetries}`);
          
          const { data, error } = await supabaseClient.functions.invoke('sync-redsp-properties', {
            body: {
              offset: 0,
              limit: batchSize,
              property_array: batchPropertyArray
            }
          });

          if (error) {
            console.error(`[Daily Sync] Batch ${batchNum} attempt ${attempt} failed:`, error);
            if (attempt < maxRetries) { await new Promise(r => setTimeout(r, retryDelayMs)); continue; }
            return { success: false, error: error.message || 'Unknown error' };
          }

          if (data?.success) {
            return { success: true, data };
          } else {
            console.error(`[Daily Sync] Batch ${batchNum} attempt ${attempt} returned unsuccessful`);
            if (attempt < maxRetries) { await new Promise(r => setTimeout(r, retryDelayMs)); continue; }
            return { success: false, error: data?.error || 'Unsuccessful response' };
          }
        } catch (e) {
          console.error(`[Daily Sync] Batch ${batchNum} attempt ${attempt} exception:`, e);
          if (attempt < maxRetries) { await new Promise(r => setTimeout(r, retryDelayMs)); continue; }
          return { success: false, error: e instanceof Error ? e.message : 'Exception' };
        }
      }
      return { success: false, error: 'Max retries exceeded' };
    }

    // Process all batches sequentially
    while (offset < propertyArray.length) {
      currentBatch++;
      console.log(`[Daily Sync] Processing batch ${currentBatch}/${totalBatches} at offset ${offset}`);

      const batchPropertyArray = propertyArray.slice(offset, offset + batchSize);
      const result = await invokeBatchWithRetry(batchPropertyArray, currentBatch);

      if (result.success && result.data) {
        console.log(`[Daily Sync] Batch ${currentBatch} completed:`, result.data.stats);
        totalStats.totalProcessed += result.data.stats.processed || 0;
        totalStats.newProperties += result.data.stats.new_properties || 0;
        totalStats.updatedProperties += result.data.stats.updated_properties || 0;
        totalStats.priceChanges += result.data.stats.price_changes || 0;
        totalStats.errors += result.data.stats.errors || 0;
      } else {
        totalStats.errors++;
        errorDetails.push({ batch: currentBatch, offset, error: result.error, retriesFailed: true });
        console.error(`[Daily Sync] Batch ${currentBatch} failed after ${maxRetries} retries: ${result.error}`);
      }

      offset += batchSize;

      // Update sync log progress — only use existing columns
      if (syncLogId) {
        await supabaseClient
          .from('sync_logs')
          .update({
            total_processed: totalStats.totalProcessed,
            new_count: totalStats.newProperties,
            updated_count: totalStats.updatedProperties,
            price_changes: totalStats.priceChanges,
            error_count: totalStats.errors,
            last_offset: offset,
            batch_info: { 
              currentBatch, 
              totalBatches, 
              batchSize,
              percentage: Math.round((currentBatch / totalBatches) * 100)
            }
          })
          .eq('id', syncLogId);
      }
    }

    // Link projects
    console.log('[Daily Sync] Calling link-projects...');
    try {
      const { data: linkData, error: linkError } = await supabaseClient.functions.invoke('sync-redsp-link-projects');
      if (linkError) {
        errorDetails.push({ step: 'link-projects', error: linkError.message });
      } else if (linkData?.success) {
        console.log('[Daily Sync] Link projects completed:', linkData.stats);
        totalStats.projectsCreated += linkData.stats?.projectsCreated || 0;
        totalStats.projectsUpdated += linkData.stats?.projectsUpdated || 0;
        totalStats.propertiesLinked += linkData.stats?.propertiesLinked || 0;
      } else {
        errorDetails.push({ step: 'link-projects', error: linkData?.error || 'Unknown error' });
      }
    } catch (linkErr) {
      errorDetails.push({ step: 'link-projects', error: linkErr instanceof Error ? linkErr.message : 'Exception' });
    }

    // Check sold properties
    console.log('[Daily Sync] Calling check-sold-properties...');
    try {
      const xmlApiIds = propertyArray.map((p: any) => p.ref).filter((ref: any) => ref);
      console.log(`[Daily Sync] Passing ${xmlApiIds.length} API IDs to check-sold-properties`);
      
      const { data: checkData, error: checkError } = await supabaseClient.functions.invoke('check-sold-properties', {
        body: { xml_api_ids: xmlApiIds }
      });
      
      if (checkError) {
        errorDetails.push({ step: 'check-sold-properties', error: checkError.message });
      } else if (checkData?.success) {
        console.log('[Daily Sync] Check sold properties completed:', checkData.stats);
        totalStats.markedAsSold = (checkData.stats?.confirmed_sold || 0);
        totalStats.projectsMarkedSold = (checkData.stats?.projects_marked_sold || 0);
      } else if (checkData?.stats?.abort_reason) {
        console.log('[Daily Sync] Check sold properties aborted:', checkData.stats.abort_reason);
      } else {
        errorDetails.push({ step: 'check-sold-properties', error: checkData?.error || 'Unknown error' });
      }
    } catch (checkErr) {
      errorDetails.push({ step: 'check-sold-properties', error: checkErr instanceof Error ? checkErr.message : 'Exception' });
    }

    const endTime = new Date().toISOString();
    console.log('[Daily Sync] Completed at', endTime, 'Stats:', totalStats);

    // Final sync log update — only existing columns
    if (syncLogId) {
      const { error: updateError } = await supabaseClient
        .from('sync_logs')
        .update({
          completed_at: endTime,
          status: totalStats.errors > 0 ? 'completed_with_errors' : 'success',
          total_processed: totalStats.totalProcessed,
          new_count: totalStats.newProperties,
          updated_count: totalStats.updatedProperties,
          price_changes: totalStats.priceChanges,
          error_count: totalStats.errors,
          projects_created: totalStats.projectsCreated,
          projects_updated: totalStats.projectsUpdated,
          properties_linked: totalStats.propertiesLinked,
          marked_as_sold: totalStats.markedAsSold,
          projects_marked_sold: totalStats.projectsMarkedSold,
          error_details: errorDetails.length > 0 ? errorDetails : null,
          batch_info: { batchSize, totalBatches, currentBatch: totalBatches, percentage: 100 }
        })
        .eq('id', syncLogId);

      if (updateError) {
        console.error('[Daily Sync] Failed to update sync log:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, stats: totalStats, syncLogId, completedAt: endTime }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Daily Sync] Fatal error:', error);
    
    // Always finalize sync log even on fatal error
    if (syncLogId && supabaseClient) {
      try {
        await supabaseClient
          .from('sync_logs')
          .update({
            completed_at: new Date().toISOString(),
            status: 'failed',
            error_details: [{ fatal: true, error: error instanceof Error ? error.message : 'Unknown error' }],
          })
          .eq('id', syncLogId);
      } catch (logErr) {
        console.error('[Daily Sync] Failed to update sync log on fatal error:', logErr);
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
