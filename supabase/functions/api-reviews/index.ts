import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse query parameters from the request URL
    const url = new URL(req.url);
    const location = url.searchParams.get('location');
    const customerType = url.searchParams.get('customer_type');
    const propertyType = url.searchParams.get('property_type');
    const investmentType = url.searchParams.get('investment_type');
    const featured = url.searchParams.get('featured');
    const hasFullStory = url.searchParams.get('has_full_story');
    const storySlug = url.searchParams.get('story_slug');
    const limit = url.searchParams.get('limit');
    const contextTag = url.searchParams.get('context_tag');
    const source = url.searchParams.get('source');
    const importStatus = url.searchParams.get('import_status');

    console.log('Fetching reviews from database with filters:', { 
      location, 
      customerType, 
      propertyType, 
      investmentType,
      featured,
      hasFullStory,
      storySlug,
      limit,
      contextTag,
      source,
      importStatus
    });

    // Build query
    let query = supabase
      .from('reviews')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    // Apply filters
    if (location) {
      query = query.ilike('location', `%${location}%`);
    }
    if (customerType) {
      query = query.eq('customer_type', customerType);
    }
    if (propertyType) {
      query = query.eq('property_type', propertyType);
    }
    if (investmentType) {
      query = query.eq('investment_type', investmentType);
    }
    if (featured) {
      query = query.eq('featured', featured === 'true');
    }
    if (hasFullStory) {
      query = query.eq('has_full_story', hasFullStory === 'true');
    }
    if (storySlug) {
      query = query.eq('story_slug', storySlug);
    }
    if (contextTag) {
      // Support multiple context tags separated by comma
      const tags = contextTag.split(',').map(t => t.trim());
      query = query.overlaps('context_tags', tags);
    }
    if (source) {
      query = query.eq('source', source);
    }
    if (importStatus) {
      query = query.eq('import_status', importStatus);
    }
    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data: reviews, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch reviews from database', details: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Successfully fetched reviews:', reviews.length, 'items');

    // If fetching a single story by slug, enrich with build updates
    let enrichedReviews = reviews;
    if (storySlug && reviews.length === 1 && reviews[0].sale_id) {
      const review = reviews[0];
      try {
        // Get project info via sale
        const { data: sale } = await supabase
          .from('sales')
          .select('project_id, projects (id, name, slug, city, region, featured_image)')
          .eq('id', review.sale_id)
          .single();

        const projectInfo = sale?.projects ? {
          project_id: sale.projects.id,
          project_name: sale.projects.name,
          project_slug: sale.projects.slug,
          project_city: sale.projects.city,
          project_region: sale.projects.region,
          project_image: sale.projects.featured_image,
        } : null;

        if (sale?.project_id) {
          // Get project-level build updates (visible_public)
          const { data: projectVideoLinks } = await supabase
            .from('project_video_links')
            .select(`
              id,
              visible_public,
              is_featured,
              project_videos (
                id, video_url, title, description, video_date, video_type, thumbnail_url, media_type, image_urls
              )
            `)
            .eq('project_id', sale.project_id)
            .or('visible_public.eq.true,visible_portal.eq.true')
            .in('project_videos.video_type', ['bouwupdate', 'drone'])
            .order('order_index', { ascending: true });

          // Also get sale-specific updates
          const { data: saleVideoLinks } = await supabase
            .from('sale_video_links')
            .select(`
              id,
              project_videos (
                id, video_url, title, description, video_date, video_type, thumbnail_url, media_type, image_urls
              )
            `)
            .eq('sale_id', review.sale_id);

          // Combine and deduplicate by video id
          const allLinks = [
            ...(projectVideoLinks || []),
            ...(saleVideoLinks || []),
          ];

          const seenIds = new Set<string>();
          const buildUpdates = allLinks
            .filter((link: any) => link.project_videos && link.project_videos.id)
            .filter((link: any) => {
              if (seenIds.has(link.project_videos.id)) return false;
              seenIds.add(link.project_videos.id);
              return true;
            })
            .map((link: any) => ({
              id: link.project_videos.id,
              video_url: link.project_videos.video_url,
              title: link.project_videos.title,
              description: link.project_videos.description,
              video_date: link.project_videos.video_date,
              video_type: link.project_videos.video_type,
              thumbnail_url: link.project_videos.thumbnail_url,
              media_type: link.project_videos.media_type,
              image_urls: link.project_videos.image_urls || [],
            }))
            .sort((a: any, b: any) => new Date(a.video_date).getTime() - new Date(b.video_date).getTime());

          console.log('Found build updates for story:', buildUpdates.length);
          enrichedReviews = [{ ...review, build_updates: buildUpdates, ...projectInfo }];
        } else if (projectInfo) {
          enrichedReviews = [{ ...review, ...projectInfo }];
        }
      } catch (err) {
        console.error('Error fetching build updates:', err);
        // Non-fatal: return review without build updates
      }
    }

    // Return the data with CORS headers
    return new Response(
      JSON.stringify(enrichedReviews),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in api-reviews function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        stack: errorStack 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
