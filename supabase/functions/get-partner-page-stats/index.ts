import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { partner_id, days } = await req.json();
    if (!partner_id) {
      return new Response(JSON.stringify({ error: 'partner_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify the user owns this partner OR is admin
    const { data: partnerCheck } = await supabase
      .from('partners')
      .select('id')
      .eq('id', partner_id)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: adminCheck } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!partnerCheck && !adminCheck) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Calculate date filter
    const daysFilter = days && days > 0 ? days : null; // null = all time
    const sinceDate = daysFilter
      ? new Date(Date.now() - daysFilter * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Strategy 1: Direct partner_id filter on tracking_events (preferred)
    // Strategy 2: Fallback via partner_referrals → visitor_ids (for historical data)
    
    // Fetch ALL events with pagination
    const allEvents: { path: string; visitor_id: string }[] = [];
    const PAGE_SIZE = 1000;

    // Try direct partner_id first
    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      let query = supabase
        .from('tracking_events')
        .select('path, visitor_id')
        .eq('partner_id', partner_id)
        .eq('event_name', 'page_view')
        .range(offset, offset + PAGE_SIZE - 1);

      if (sinceDate) {
        query = query.gte('occurred_at', sinceDate);
      }

      const { data: events, error: eventsError } = await query;
      if (eventsError) throw eventsError;

      if (events && events.length > 0) {
        allEvents.push(...events);
      }
      hasMore = (events?.length || 0) === PAGE_SIZE;
      offset += PAGE_SIZE;
    }

    // Fallback: if no direct partner_id events, try via visitor_ids
    if (allEvents.length === 0) {
      const { data: referrals, error: refError } = await supabase
        .from('partner_referrals')
        .select('visitor_id')
        .eq('partner_id', partner_id);

      if (refError) throw refError;

      const visitorIds = referrals?.map(r => r.visitor_id).filter(Boolean) || [];
      if (visitorIds.length > 0) {
        offset = 0;
        hasMore = true;
        while (hasMore) {
          let query = supabase
            .from('tracking_events')
            .select('path, visitor_id')
            .in('visitor_id', visitorIds)
            .eq('event_name', 'page_view')
            .range(offset, offset + PAGE_SIZE - 1);

          if (sinceDate) {
            query = query.gte('occurred_at', sinceDate);
          }

          const { data: events, error: eventsError } = await query;
          if (eventsError) throw eventsError;

          if (events && events.length > 0) {
            allEvents.push(...events);
          }
          hasMore = (events?.length || 0) === PAGE_SIZE;
          offset += PAGE_SIZE;
        }
      }
    }

    if (allEvents.length === 0) {
      return new Response(JSON.stringify({ page_stats: [] }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Aggregate by path
    const pathStats: Record<string, { visitors: Set<string>; views: number }> = {};
    allEvents.forEach(event => {
      if (!event.path) return;
      if (!pathStats[event.path]) {
        pathStats[event.path] = { visitors: new Set(), views: 0 };
      }
      pathStats[event.path].views++;
      if (event.visitor_id) {
        pathStats[event.path].visitors.add(event.visitor_id);
      }
    });

    const page_stats = Object.entries(pathStats)
      .map(([path, stats]) => ({
        path,
        unique_visitors: stats.visitors.size,
        total_views: stats.views,
      }))
      .sort((a, b) => b.total_views - a.total_views)
      .slice(0, 50);

    return new Response(JSON.stringify({ page_stats }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in get-partner-page-stats:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
