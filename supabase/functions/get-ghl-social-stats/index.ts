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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();
    if (!roleData) throw new Error('Admin access required');

    const apiKey = Deno.env.get('GOHIGHLEVEL_API_KEY');
    const locationId = Deno.env.get('GOHIGHLEVEL_LOCATION_ID');
    if (!apiKey) throw new Error('GOHIGHLEVEL_API_KEY not configured');
    if (!locationId) throw new Error('GOHIGHLEVEL_LOCATION_ID not configured');

    const body = await req.json();
    const { action } = body; // "overview" or "refresh-posts"

    if (action === 'overview') {
      // Fetch account-level statistics
      const { accountIds } = body;
      if (!accountIds || accountIds.length === 0) {
        throw new Error('accountIds required for overview');
      }

      const response = await fetch(
        `https://services.leadconnectorhq.com/social-media-posting/statistics`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Version': '2021-07-28',
          },
          body: JSON.stringify({ locationId, accountIds }),
        }
      );

      const responseText = await response.text();
      console.log('GHL Statistics response:', response.status, responseText);

      if (!response.ok) {
        throw new Error(`GHL Statistics API error (${response.status}): ${responseText}`);
      }

      const data = JSON.parse(responseText);
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'refresh-posts') {
      // Fetch per-post engagement for published posts with ghl_post_id
      const { data: publishedPosts } = await supabase
        .from('social_posts')
        .select('id, ghl_post_id')
        .eq('status', 'published')
        .not('ghl_post_id', 'is', null);

      if (!publishedPosts || publishedPosts.length === 0) {
        return new Response(JSON.stringify({ success: true, updated: 0 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let updated = 0;
      const errors: string[] = [];

      for (const post of publishedPosts) {
        try {
          const response = await fetch(
            `https://services.leadconnectorhq.com/social-media-posting/${locationId}/posts/${post.ghl_post_id}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Version': '2021-07-28',
              },
            }
          );

          if (!response.ok) {
            errors.push(`Post ${post.ghl_post_id}: ${response.status}`);
            continue;
          }

          const postData = await response.json();
          const metrics = postData.metrics || postData.analytics || {};

          const updateData: Record<string, unknown> = {
            engagement_updated_at: new Date().toISOString(),
          };

          // GHL may return metrics in various shapes
          if (metrics.likes !== undefined) updateData.likes = metrics.likes;
          if (metrics.comments !== undefined) updateData.comments = metrics.comments;
          if (metrics.impressions !== undefined) updateData.impressions = metrics.impressions;
          if (metrics.reach !== undefined) updateData.reach = metrics.reach;

          // Also check top-level fields
          if (postData.likes !== undefined) updateData.likes = postData.likes;
          if (postData.comments !== undefined) updateData.comments = postData.comments;
          if (postData.impressions !== undefined) updateData.impressions = postData.impressions;
          if (postData.reach !== undefined) updateData.reach = postData.reach;

          await supabase
            .from('social_posts')
            .update(updateData)
            .eq('id', post.id);

          updated++;
        } catch (e) {
          errors.push(`Post ${post.ghl_post_id}: ${e instanceof Error ? e.message : 'Unknown'}`);
        }
      }

      return new Response(JSON.stringify({ success: true, updated, total: publishedPosts.length, errors }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action. Use "overview" or "refresh-posts"');
  } catch (error) {
    console.error('Error in get-ghl-social-stats:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
