import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RefreshPayload {
  crm_user_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: RefreshPayload = await req.json();
    console.log('[GHL Refresh] Refreshing contact data for crm_user_id:', payload.crm_user_id);

    // Fetch contact details from GoHighLevel
    const ghlApiKey = Deno.env.get('GOHIGHLEVEL_API_KEY');
    if (!ghlApiKey) {
      throw new Error('GOHIGHLEVEL_API_KEY not configured');
    }

    console.log('[GHL Refresh] Fetching from GoHighLevel API...');
    const ghlResponse = await fetch(
      `https://services.leadconnectorhq.com/contacts/${payload.crm_user_id}`,
      {
        headers: {
          'Authorization': `Bearer ${ghlApiKey}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
      }
    );

    if (!ghlResponse.ok) {
      throw new Error(`GoHighLevel API returned status ${ghlResponse.status}`);
    }

    const ghlData = await ghlResponse.json();
    const contact = ghlData.contact || {};
    
    // Only update fields if GHL has data (don't overwrite with null)
    const updatedFields: Record<string, any> = {
      last_ghl_refresh_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    if (contact.firstName) updatedFields.first_name = contact.firstName;
    if (contact.lastName) updatedFields.last_name = contact.lastName;
    if (contact.email) updatedFields.email = contact.email;
    if (contact.phone) updatedFields.phone = contact.phone;

    console.log('[GHL Refresh] Updating crm_leads with GHL data:', updatedFields);
    
    // Fix: search by ghl_contact_id, not crm_user_id
    const { data: updated, error: updateError } = await supabase
      .from('crm_leads')
      .update(updatedFields)
      .eq('ghl_contact_id', payload.crm_user_id)
      .select()
      .single();

    if (updateError) {
      console.error('[GHL Refresh] Error updating crm_leads:', updateError);
      throw updateError;
    }

    console.log('[GHL Refresh] Successfully refreshed contact data');
    return new Response(
      JSON.stringify({ 
        success: true, 
        updated_fields: Object.keys(updatedFields).filter(k => k !== 'updated_at'),
        contact: updated
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[GHL Refresh] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
