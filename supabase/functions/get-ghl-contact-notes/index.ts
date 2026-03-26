import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GHLNote {
  id: string;
  body: string;
  dateAdded: string;
  userId?: string;
}

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

    const { ghl_contact_id, crm_lead_id } = await req.json();

    if (!ghl_contact_id || !crm_lead_id) {
      return new Response(JSON.stringify({ error: 'Missing ghl_contact_id or crm_lead_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Fetching notes for GHL contact: ${ghl_contact_id}`);

    // Fetch notes from GHL
    const ghlResponse = await fetch(
      `https://services.leadconnectorhq.com/contacts/${ghl_contact_id}/notes`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ghlApiKey}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
        },
      }
    );

    if (!ghlResponse.ok) {
      const errorText = await ghlResponse.text();
      console.error('GHL API error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to fetch notes from GHL', details: errorText }), {
        status: ghlResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ghlData = await ghlResponse.json();
    const ghlNotes: GHLNote[] = ghlData.notes || [];

    console.log(`Found ${ghlNotes.length} notes from GHL`);

    // Sync notes to local database
    for (const note of ghlNotes) {
      const { error: upsertError } = await supabase
        .from('ghl_contact_notes')
        .upsert({
          crm_lead_id,
          ghl_note_id: note.id,
          body: note.body,
          source: 'ghl',
          ghl_date_added: note.dateAdded,
          synced_at: new Date().toISOString(),
        }, {
          onConflict: 'ghl_note_id',
          ignoreDuplicates: false,
        });

      if (upsertError) {
        console.error('Error upserting note:', upsertError);
      }
    }

    // Fetch all notes (GHL + local) from database
    const { data: allNotes, error: fetchError } = await supabase
      .from('ghl_contact_notes')
      .select('*')
      .eq('crm_lead_id', crm_lead_id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching notes:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch notes' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      notes: allNotes,
      ghl_synced_count: ghlNotes.length,
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
