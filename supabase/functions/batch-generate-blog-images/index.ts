import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { onlyMissing = true, batchSize = 1, maxPosts = 5 } = await req.json();
    
    console.log('Starting batch blog image generation', { onlyMissing, batchSize, maxPosts });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch blog posts that need images (limit to prevent timeout)
    let query = supabase
      .from('blog_posts')
      .select('id, title, intro, category, featured_image')
      .limit(maxPosts);
    
    if (onlyMissing) {
      query = query.or('featured_image.is.null,featured_image.eq.');
    }
    
    const { data: posts, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch blog posts: ${fetchError.message}`);
    }

    if (!posts || posts.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No blog posts need images',
          stats: { total: 0, successful: 0, failed: 0, skipped: 0 }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    console.log(`Found ${posts.length} blog posts to process`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const results = {
      total: posts.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [] as Array<{ postId: string; title: string; error: string }>
    };

    // Process in batches to avoid overwhelming the AI service
    for (let i = 0; i < posts.length; i += batchSize) {
      const batch = posts.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(posts.length / batchSize)}`);

      await Promise.all(
        batch.map(async (post) => {
          try {
            console.log(`Generating image for: ${post.title}`);

            // Generate image prompt
            const imagePrompt = `Professional, high-quality featured image for a blog article about "${post.title}". 
            Context: ${post.intro.substring(0, 200)}
            Style: Modern, clean, professional illustration suitable for a real estate investment blog.
            Category: ${post.category}
            Requirements: 16:9 aspect ratio, Mediterranean colors (blue, white, terracotta), no text overlay, ultra high resolution.`;

            // Call Lovable AI
            const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'google/gemini-3-pro-image-preview',
                messages: [{ role: 'user', content: imagePrompt }],
                modalities: ['image', 'text']
              }),
            });

            if (!aiResponse.ok) {
              throw new Error(`AI generation failed: ${aiResponse.status}`);
            }

            const aiData = await aiResponse.json();
            const imageBase64 = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
            
            if (!imageBase64) {
              throw new Error('No image generated');
            }

            // Convert and upload
            const base64Data = imageBase64.split(',')[1];
            const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            const fileName = `blog-${post.id}-${Date.now()}.png`;

            const { error: uploadError } = await supabase.storage
              .from('blog-images')
              .upload(fileName, imageBuffer, {
                contentType: 'image/png',
                upsert: true
              });

            if (uploadError) {
              throw new Error(`Upload failed: ${uploadError.message}`);
            }

            const { data: { publicUrl } } = supabase.storage
              .from('blog-images')
              .getPublicUrl(fileName);

            // Update blog post
            const { error: updateError } = await supabase
              .from('blog_posts')
              .update({ featured_image: publicUrl })
              .eq('id', post.id);

            if (updateError) {
              throw new Error(`Update failed: ${updateError.message}`);
            }

            results.successful++;
            console.log(`✓ Successfully generated image for: ${post.title}`);

          } catch (error) {
            results.failed++;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            results.errors.push({
              postId: post.id,
              title: post.title,
              error: errorMessage
            });
            console.error(`✗ Failed to generate image for ${post.title}:`, errorMessage);
          }
        })
      );

      // Add delay between batches to respect rate limits and prevent timeout
      if (i + batchSize < posts.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('Batch generation complete:', results);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Batch generation complete: ${results.successful} successful, ${results.failed} failed`,
        stats: results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in batch-generate-blog-images:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});