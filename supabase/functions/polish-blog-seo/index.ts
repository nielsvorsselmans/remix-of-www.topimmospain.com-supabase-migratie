import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, intro, meta_description, primary_keyword, category } = await req.json();

    if (!primary_keyword) {
      return new Response(
        JSON.stringify({ success: true, fixes: {}, message: 'No primary keyword provided, skipping SEO polish' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Determine what needs fixing
    const kwLower = primary_keyword.toLowerCase();
    const needsMetaDesc = !meta_description || meta_description.length === 0 || meta_description.length > 155;
    const needsKeywordInTitle = !title?.toLowerCase().includes(kwLower);
    const needsKeywordInIntro = !intro?.toLowerCase().includes(kwLower);

    if (!needsMetaDesc && !needsKeywordInTitle && !needsKeywordInIntro) {
      return new Response(
        JSON.stringify({ success: true, fixes: {}, message: 'All SEO checks already pass' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build targeted instructions
    const fixInstructions: string[] = [];
    if (needsMetaDesc) {
      fixInstructions.push(`- meta_description: Schrijf een SEO meta description van maximaal 155 tekens. Verwerk het keyword "${primary_keyword}" natuurlijk. Beschrijf waar het artikel over gaat en motiveer de lezer om te klikken.`);
    }
    if (needsKeywordInTitle) {
      fixInstructions.push(`- title: Pas de titel aan zodat het keyword "${primary_keyword}" er natuurlijk in verwerkt is. Behoud de stijl en lengte (max 60 tekens). Huidige titel: "${title}"`);
    }
    if (needsKeywordInIntro) {
      fixInstructions.push(`- intro: Herschrijf de introductie zodat het keyword "${primary_keyword}" er natuurlijk in verwerkt is. Behoud de warme, adviserende toon. Huidige intro: "${intro}"`);
    }

    const prompt = `Je bent een SEO-specialist voor Top Immo Spain. Fix de volgende SEO-problemen voor een blogartikel in de categorie "${category || 'Algemeen'}".

Huidige titel: "${title}"
Primary keyword: "${primary_keyword}"

Geef ALLEEN de velden terug die aangepast moeten worden. Antwoord uitsluitend met geldig JSON.

Te fixen:
${fixInstructions.join('\n')}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        tools: [{
          type: 'function',
          function: {
            name: 'seo_fixes',
            description: 'Return the SEO fixes for the blog post',
            parameters: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Optimized title with keyword (only if title needed fixing)' },
                intro: { type: 'string', description: 'Rewritten intro with keyword (only if intro needed fixing)' },
                meta_description: { type: 'string', description: 'SEO meta description max 155 chars (only if meta desc needed fixing)' },
              },
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'seo_fixes' } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit bereikt. Probeer het over een minuut opnieuw.', success: false }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI-tegoed onvoldoende.', success: false }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI call failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let fixes: Record<string, string> = {};

    if (toolCall?.function?.arguments) {
      fixes = JSON.parse(toolCall.function.arguments);
    }

    // Validate: only return fields that actually needed fixing
    const validatedFixes: Record<string, string> = {};
    if (needsMetaDesc && fixes.meta_description) {
      validatedFixes.meta_description = fixes.meta_description.substring(0, 155);
    }
    if (needsKeywordInTitle && fixes.title) {
      validatedFixes.title = fixes.title.substring(0, 70);
    }
    if (needsKeywordInIntro && fixes.intro) {
      validatedFixes.intro = fixes.intro;
    }

    console.log('SEO polish fixes:', Object.keys(validatedFixes));

    return new Response(
      JSON.stringify({ success: true, fixes: validatedFixes, message: `Fixed ${Object.keys(validatedFixes).length} SEO issues` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in polish-blog-seo:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, success: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
