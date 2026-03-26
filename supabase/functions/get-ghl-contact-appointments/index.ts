import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GHLAppointment {
  id: string;
  title?: string;
  startTime: string;
  endTime: string;
  appointmentStatus?: string;
  calendarId?: string;
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

    console.log(`Fetching appointments for GHL contact: ${ghl_contact_id}`);

    // Fetch appointments from GHL
    const ghlResponse = await fetch(
      `https://services.leadconnectorhq.com/contacts/${ghl_contact_id}/appointments`,
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
      
      // Return cached data if GHL fails
      const { data: cachedAppointments } = await supabase
        .from('ghl_contact_appointments')
        .select('*')
        .eq('crm_lead_id', crm_lead_id)
        .order('start_time', { ascending: false });

      return new Response(JSON.stringify({ 
        appointments: cachedAppointments || [],
        from_cache: true,
        ghl_error: errorText,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ghlData = await ghlResponse.json();
    const ghlAppointments: GHLAppointment[] = ghlData.events || [];

    console.log(`Found ${ghlAppointments.length} appointments from GHL`);

    // Get existing local data for appointments (preserve all local fields during sync)
    const { data: existingAppointments } = await supabase
      .from('ghl_contact_appointments')
      .select(`
        ghl_appointment_id, 
        local_notes, 
        is_summary_published, 
        summary_headline, 
        summary_short, 
        summary_full, 
        summary_category, 
        client_pseudonym, 
        key_topics
      `)
      .eq('crm_lead_id', crm_lead_id);

    interface ExistingAppointmentData {
      local_notes: string | null;
      is_summary_published: boolean | null;
      summary_headline: string | null;
      summary_short: string | null;
      summary_full: string | null;
      summary_category: string | null;
      client_pseudonym: string | null;
      key_topics: string[] | null;
    }

    const existingDataMap = new Map<string, ExistingAppointmentData>(
      (existingAppointments || []).map(a => [a.ghl_appointment_id, {
        local_notes: a.local_notes,
        is_summary_published: a.is_summary_published,
        summary_headline: a.summary_headline,
        summary_short: a.summary_short,
        summary_full: a.summary_full,
        summary_category: a.summary_category,
        client_pseudonym: a.client_pseudonym,
        key_topics: a.key_topics,
      }])
    );

    // Sync appointments to local database
    for (const appointment of ghlAppointments) {
      const existingData: Partial<ExistingAppointmentData> = existingDataMap.get(appointment.id) || {};
      
      const { error: upsertError } = await supabase
        .from('ghl_contact_appointments')
        .upsert({
          crm_lead_id,
          ghl_appointment_id: appointment.id,
          title: appointment.title || 'Afspraak',
          start_time: appointment.startTime,
          end_time: appointment.endTime,
          status: appointment.appointmentStatus,
          calendar_id: appointment.calendarId,
          synced_at: new Date().toISOString(),
          // Preserve ALL local data during sync:
          local_notes: existingData.local_notes || null,
          is_summary_published: existingData.is_summary_published || false,
          summary_headline: existingData.summary_headline || null,
          summary_short: existingData.summary_short || null,
          summary_full: existingData.summary_full || null,
          summary_category: existingData.summary_category || null,
          client_pseudonym: existingData.client_pseudonym || null,
          key_topics: existingData.key_topics || null,
        }, {
          onConflict: 'ghl_appointment_id',
          ignoreDuplicates: false,
        });

      if (upsertError) {
        console.error('Error upserting appointment:', upsertError);
      }
    }

    // Fetch all appointments from database
    const { data: allAppointments, error: fetchError } = await supabase
      .from('ghl_contact_appointments')
      .select('*')
      .eq('crm_lead_id', crm_lead_id)
      .order('start_time', { ascending: false });

    if (fetchError) {
      console.error('Error fetching appointments:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch appointments' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      appointments: allAppointments,
      ghl_synced_count: ghlAppointments.length,
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
