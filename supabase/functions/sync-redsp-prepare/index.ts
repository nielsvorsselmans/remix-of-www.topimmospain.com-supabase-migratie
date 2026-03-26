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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    console.log('[RedSP Prepare] Downloading XML feed...');
    const xmlUrl = getXmlUrl();
    
    const xmlResponse = await fetch(xmlUrl);
    if (!xmlResponse.ok) {
      throw new Error(`Failed to fetch XML: ${xmlResponse.status} ${xmlResponse.statusText}`);
    }
    
    const xmlText = await xmlResponse.text();
    console.log(`[RedSP Prepare] XML fetched, size: ${xmlText.length} bytes`);
    
    // Parse XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text",
      parseAttributeValue: true,
      trimValues: true,
    });
    
    const xmlDoc = parser.parse(xmlText);
    const properties = xmlDoc?.root?.property || xmlDoc?.property || [];
    const propertyArray = Array.isArray(properties) ? properties : [properties];
    
    console.log(`[RedSP Prepare] Parsed ${propertyArray.length} properties`);
    
    // Calculate batch info
    const batchSize = 100;
    const totalBatches = Math.ceil(propertyArray.length / batchSize);
    
    // Create sync_log entry
    const { data: syncLog, error: logError } = await supabase
      .from('sync_logs')
      .insert({
        sync_type: 'redsp',
        status: 'running',
        started_at: new Date().toISOString(),
        batch_info: {
          totalBatches,
          batchSize,
          currentBatch: 0,
          percentage: 0,
          totalInXml: propertyArray.length
        },
        total_processed: 0,
        new_count: 0,
        updated_count: 0,
        error_count: 0,
        last_offset: 0
      })
      .select()
      .single();
    
    if (logError) {
      console.error('[RedSP Prepare] Failed to create sync log:', logError);
      throw logError;
    }
    
    console.log(`[RedSP Prepare] Created sync_log: ${syncLog.id}`);
    
    // Return ONLY metadata - NO propertyArray to avoid memory limits
    return new Response(
      JSON.stringify({
        success: true,
        syncLogId: syncLog.id,
        totalProperties: propertyArray.length,
        totalBatches,
        batchSize
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[RedSP Prepare] Error:', errorMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
