import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ListLeadsRequest {
  journey_phase?: string;
  updated_since?: string;
  limit?: number;
  // V2:
  // follow_up_status?: string;
  // lead_temperature?: string;
  // has_meetings?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth: verify JWT + admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body: ListLeadsRequest = req.method === 'POST' ? await req.json() : {};
    const limit = Math.min(Math.max(body.limit ?? 100, 1), 500);

    // Build query
    let query = supabase
      .from('crm_leads')
      .select('id, first_name, last_name, email, journey_phase, follow_up_status, last_visit_at, updated_at')
      .order('last_visit_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    // V1 filters
    if (body.journey_phase) {
      query = query.eq('journey_phase', body.journey_phase);
    }

    if (body.updated_since) {
      query = query.gte('updated_at', body.updated_since);
    }

    // V2 filters go here:
    // if (body.follow_up_status) query = query.eq('follow_up_status', body.follow_up_status);
    // if (body.lead_temperature) query = query.eq('lead_temperature', body.lead_temperature);

    const { data: leads, error: queryError } = await query;

    if (queryError) {
      console.error('Query error:', queryError);
      return new Response(JSON.stringify({ error: 'Failed to fetch leads' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mappedLeads = (leads || []).map((l: any) => ({
      crm_lead_id: l.id,
      first_name: l.first_name,
      last_name: l.last_name,
      email: l.email,
      journey_phase: l.journey_phase,
      follow_up_status: l.follow_up_status,
      last_visit_at: l.last_visit_at,
      updated_at: l.updated_at,
    }));

    const filters: Record<string, any> = { limit };
    if (body.journey_phase) filters.journey_phase = body.journey_phase;
    if (body.updated_since) filters.updated_since = body.updated_since;

    return new Response(JSON.stringify({
      count: mappedLeads.length,
      filters,
      leads: mappedLeads,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
