import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CLASSIFICATION_SYSTEM_PROMPT = `Je bent een content classificatie expert voor Top Immo Spain.
Je taak is om elk inzicht te classificeren naar het beste content archetype.

ARCHETYPES:
1. LEAD_MAGNET - Educatieve content over complexe onderwerpen
   - Thema's: JURIDISCH, FINANCIEEL, BELASTING, FISCAAL
   - Keywords: "hoe werkt", "regels", "kosten", "proces", "berekening"
   - Inzicht types: vraag, behoefte, verwarring

2. HOT_TAKE - Mythbusting content die angsten adresseert
   - Thema's: JURIDISCH (krakers), FINANCIEEL (timing), LOCATIE (vooroordelen)
   - Keywords: "angst", "mythe", "bang", "iedereen zegt", "risico"
   - Inzicht types: angst, weerstand, mythe

3. AUTHORITY - Vertrouwensopbouwende content
   - Thema's: EMOTIE, PROCES, VERHUUR, VERTROUWEN
   - Keywords: "spannend", "gevoel", "twijfel", "partner", "vertrouwen"
   - Inzicht types: emotie, twijfel, bezorgdheid

REGELS:
- Analyseer het thema, label en de normalized_insight
- Kies het archetype dat het beste past
- Als een inzicht angst of mythe bevat → HOT_TAKE
- Als een inzicht een vraag of behoefte aan uitleg bevat → LEAD_MAGNET
- Als een inzicht emotie of vertrouwen betreft → AUTHORITY
- Bij twijfel, kies AUTHORITY als veilige default`;

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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get insights without suggested_archetype
    const { data: insights, error: fetchError } = await supabase
      .from('insights')
      .select('id, label, type, theme, subtheme, normalized_insight, raw_quote')
      .is('suggested_archetype', null)
      .order('frequency', { ascending: false });

    if (fetchError) {
      throw fetchError;
    }

    if (!insights || insights.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Geen inzichten om te classificeren',
        processed: 0,
        total: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Classifying ${insights.length} insights...`);

    const results: { id: string; archetype: string; success: boolean }[] = [];
    const batchSize = 5;

    // Process in batches to avoid rate limits
    for (let i = 0; i < insights.length; i += batchSize) {
      const batch = insights.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (insight) => {
        try {
          const userPrompt = `Classificeer dit inzicht:

THEMA: ${insight.theme || 'Onbekend'}
SUBTHEMA: ${insight.subtheme || 'Onbekend'}
TYPE: ${insight.type}
LABEL: ${insight.label}
GENORMALISEERD: ${insight.normalized_insight}
QUOTE: ${insight.raw_quote}

Antwoord met ALLEEN één van deze woorden: LEAD_MAGNET, HOT_TAKE, of AUTHORITY`;

          const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                { role: 'system', content: CLASSIFICATION_SYSTEM_PROMPT },
                { role: 'user', content: userPrompt }
              ],
              temperature: 0.1,
              max_tokens: 50
            }),
          });

          if (!response.ok) {
            console.error(`AI error for insight ${insight.id}:`, response.status);
            return { id: insight.id, archetype: 'authority', success: false };
          }

          const aiResult = await response.json();
          const content = aiResult.choices?.[0]?.message?.content?.trim().toUpperCase() || '';
          
          // Extract archetype from response
          let archetype = 'authority'; // default
          if (content.includes('LEAD_MAGNET')) {
            archetype = 'lead_magnet';
          } else if (content.includes('HOT_TAKE')) {
            archetype = 'hot_take';
          } else if (content.includes('AUTHORITY')) {
            archetype = 'authority';
          }

          // Update the insight
          const { error: updateError } = await supabase
            .from('insights')
            .update({ suggested_archetype: archetype })
            .eq('id', insight.id);

          if (updateError) {
            console.error(`Update error for insight ${insight.id}:`, updateError);
            return { id: insight.id, archetype, success: false };
          }

          return { id: insight.id, archetype, success: true };
        } catch (err) {
          console.error(`Error processing insight ${insight.id}:`, err);
          return { id: insight.id, archetype: 'authority', success: false };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to avoid rate limits
      if (i + batchSize < insights.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const successCount = results.filter(r => r.success).length;
    const archetypeCounts = results.reduce((acc, r) => {
      acc[r.archetype] = (acc[r.archetype] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return new Response(JSON.stringify({
      success: true,
      message: `${successCount} van ${insights.length} inzichten geclassificeerd`,
      processed: successCount,
      total: insights.length,
      distribution: archetypeCounts,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Classification error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
