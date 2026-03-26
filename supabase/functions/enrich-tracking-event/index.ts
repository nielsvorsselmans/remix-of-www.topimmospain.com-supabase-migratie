import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { visitor_id, user_id, path, event_name, event_params } = await req.json();

    if (!path || (!visitor_id && !user_id)) {
      return new Response(
        JSON.stringify({ error: 'path and either visitor_id or user_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate inputs
    if (typeof visitor_id !== 'string' || visitor_id.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid visitor_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof path !== 'string' || path.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Invalid path' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the most recent page_view event - search by user_id first, then visitor_id
    let query = supabase
      .from('tracking_events')
      .select('id, event_params')
      .eq('path', path)
      .eq('event_name', 'page_view')
      .order('occurred_at', { ascending: false })
      .limit(1);

    if (user_id) {
      query = query.eq('user_id', user_id);
    } else if (visitor_id) {
      query = query.eq('visitor_id', visitor_id);
    }

    const { data: recentEvent, error: fetchError } = await query.maybeSingle();

    if (fetchError) {
      console.error('[Enrich] Error fetching event:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch event' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!recentEvent) {
      return new Response(
        JSON.stringify({ success: false, message: 'No matching event found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Merge existing params with new params
    const existingParams = (recentEvent.event_params as Record<string, unknown>) || {};
    const enrichedParams = {
      ...existingParams,
      ...(event_params || {}),
    };

    // Update the event
    const { error: updateError } = await supabase
      .from('tracking_events')
      .update({
        event_name: event_name || 'blog_view',
        event_params: enrichedParams,
      })
      .eq('id', recentEvent.id);

    if (updateError) {
      console.error('[Enrich] Error updating event:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update event' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Enrich] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
