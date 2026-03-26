import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXTERNAL_API_URL = 'https://xeiyoaocyyjrnsxbxyev.supabase.co/functions/v1/api-blog-posts';
const VIVA_API_KEY = Deno.env.get('VIVA_VASTGOED_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!VIVA_API_KEY) {
      throw new Error('VIVA_VASTGOED_API_KEY is not configured');
    }

    console.log('Fetching blog posts from external API...');

    // Fetch all posts from external API
    const response = await fetch(`${EXTERNAL_API_URL}?limit=1000`, {
      headers: {
        'x-api-key': VIVA_API_KEY,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`External API returned ${response.status}`);
    }

    const responseData = await response.json();
    
    // Extract posts array from response (handle both direct array and {data: []} format)
    const externalPosts = Array.isArray(responseData) ? responseData : (responseData.data || []);
    console.log(`Fetched ${externalPosts.length} posts from external API`);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Transform posts to local schema
    const postsToInsert = externalPosts.map((post: any) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      category: post.category,
      intro: post.intro,
      content: { html: post.content }, // Convert string to jsonb structure
      meta_description: post.meta_description || null,
      meta_keywords: post.meta_keywords || null,
      author: post.author || 'Top Immo Spain',
      featured_image: post.featured_image || null,
      seo_bullets: post.seo_bullets || [],
      online_limitation: post.online_limitation || null,
      example_section: post.example_section || null,
      summary: post.summary || null,
      published: post.published ?? true,
      published_at: post.published_at || post.created_at,
      created_at: post.created_at,
      updated_at: post.updated_at,
    }));

    console.log(`Inserting ${postsToInsert.length} posts into local database...`);

    // Insert posts in batches of 50 to avoid hitting limits
    const batchSize = 50;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < postsToInsert.length; i += batchSize) {
      const batch = postsToInsert.slice(i, i + batchSize);
      
      const { data, error } = await supabaseClient
        .from('blog_posts')
        .upsert(batch, { onConflict: 'id' });

      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
        console.log(`Batch ${i / batchSize + 1} inserted successfully`);
      }
    }

    console.log(`Import complete: ${successCount} successful, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Blog posts imported successfully',
        stats: {
          total: externalPosts.length,
          successful: successCount,
          errors: errorCount,
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error importing blog posts:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
