import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth check - require authenticated user
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const _authClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { error: authError } = await _authClient.auth.getClaims(authHeader.replace('Bearer ', ''));
  if (authError) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all blog posts without summaries
    const { data: posts, error: fetchError } = await supabase
      .from('blog_posts')
      .select('id, title, intro, content, category')
      .or('summary.is.null,summary.eq.')
      .eq('published', true);

    if (fetchError) {
      console.error('Error fetching posts:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch posts', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!posts || posts.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No posts need summaries', generated: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${posts.length} posts without summaries`);

    const results = {
      total: posts.length,
      success: 0,
      failed: 0,
      errors: [] as any[]
    };

    // Generate summaries for each post
    for (const post of posts) {
      try {
        console.log(`Generating summary for post: ${post.title}`);

        // Extract text from content JSON
        let contentText = '';
        if (post.content && typeof post.content === 'object') {
          const content = post.content as any;
          if (Array.isArray(content.blocks)) {
            contentText = content.blocks
              .filter((block: any) => block.type === 'paragraph' && block.data?.text)
              .map((block: any) => block.data.text.replace(/<[^>]*>/g, ''))
              .join(' ')
              .slice(0, 2000); // Limit to first 2000 chars for context
          }
        }

        const prompt = `Je bent een SEO expert die samenvattingen schrijft die geoptimaliseerd zijn voor Google featured snippets.

Schrijf een korte, directe samenvatting van 2-3 zinnen voor dit blog artikel over vastgoed in Spanje.

Titel: ${post.title}
Categorie: ${post.category}
Intro: ${post.intro}
Content preview: ${contentText}

De samenvatting moet:
- Direct het belangrijkste antwoord geven (wat, waarom, hoe)
- 2-3 zinnen zijn (max 150 woorden)
- Concrete, bruikbare informatie bevatten
- Geoptimaliseerd zijn voor voice search en featured snippets
- Professioneel en adviserend klinken (Top Immo Spain toon)

Geef ALLEEN de samenvatting terug, geen extra uitleg of markdown formatting.`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'Je bent een SEO expert voor vastgoed content.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 200,
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error(`AI API error for post ${post.id}:`, aiResponse.status, errorText);
          results.failed++;
          results.errors.push({ post_id: post.id, title: post.title, error: `AI API error: ${aiResponse.status}` });
          continue;
        }

        const aiData = await aiResponse.json();
        const summary = aiData.choices[0]?.message?.content?.trim();

        if (!summary) {
          console.error(`No summary generated for post ${post.id}`);
          results.failed++;
          results.errors.push({ post_id: post.id, title: post.title, error: 'No summary generated' });
          continue;
        }

        // Update post with generated summary
        const { error: updateError } = await supabase
          .from('blog_posts')
          .update({ summary })
          .eq('id', post.id);

        if (updateError) {
          console.error(`Error updating post ${post.id}:`, updateError);
          results.failed++;
          results.errors.push({ post_id: post.id, title: post.title, error: updateError.message });
        } else {
          console.log(`Successfully generated summary for: ${post.title}`);
          results.success++;
        }

      } catch (error) {
        console.error(`Error processing post ${post.id}:`, error);
        results.failed++;
        results.errors.push({ 
          post_id: post.id, 
          title: post.title, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Summary generation complete`,
        results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
