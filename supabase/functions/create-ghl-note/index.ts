import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ghlApiKey = Deno.env.get('GOHIGHLEVEL_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { ghl_contact_id, crm_lead_id, body } = await req.json();

    if (!ghl_contact_id || !crm_lead_id || !body) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Creating note for GHL contact: ${ghl_contact_id}`);

    // Create note in GHL
    const ghlResponse = await fetch(
      `https://services.leadconnectorhq.com/contacts/${ghl_contact_id}/notes`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ghlApiKey}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body }),
      }
    );

    let ghlNoteId = null;
    
    if (ghlResponse.ok) {
      const ghlData = await ghlResponse.json();
      ghlNoteId = ghlData.note?.id;
      console.log('Note created in GHL:', ghlNoteId);
    } else {
      const errorText = await ghlResponse.text();
      console.error('GHL API error (continuing with local save):', errorText);
    }

    // Save note locally
    const { data: newNote, error: insertError } = await supabase
      .from('ghl_contact_notes')
      .insert({
        crm_lead_id,
        ghl_note_id: ghlNoteId,
        body,
        source: 'admin_portal',
        synced_at: ghlNoteId ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting note:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to save note' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      note: newNote,
      synced_to_ghl: !!ghlNoteId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
