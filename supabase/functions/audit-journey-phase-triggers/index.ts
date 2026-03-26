import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only GET allowed
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Validate AUDIT_SECRET
    const auditSecret = Deno.env.get('AUDIT_SECRET');
    if (!auditSecret) {
      console.error('[audit-journey-phase-triggers] AUDIT_SECRET not configured');
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    if (!constantTimeEqual(token, auditSecret)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Execute hardcoded read-only query
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: leads, error } = await supabase
      .from('crm_leads')
      .select(`
        id,
        journey_phase,
        customer_project_selections(id),
        customer_viewing_trips(id)
      `)
      .eq('journey_phase', 'orientatie');

    if (error) {
      console.error('[audit-journey-phase-triggers] Query error:', error.message);
      return new Response(JSON.stringify({ error: 'Query failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Filter: only leads with at least one assignment or viewing trip
    const flagged = (leads || [])
      .filter((l: any) =>
        (l.customer_project_selections && l.customer_project_selections.length > 0) ||
        (l.customer_viewing_trips && l.customer_viewing_trips.length > 0)
      )
      .map((l: any) => ({
        crm_lead_id: l.id,
        journey_phase: l.journey_phase,
        has_project_assignment: (l.customer_project_selections?.length ?? 0) > 0,
        has_viewing_trip: (l.customer_viewing_trips?.length ?? 0) > 0,
      }));

    return new Response(JSON.stringify({
      count: flagged.length,
      leads: flagged,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[audit-journey-phase-triggers] Error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
