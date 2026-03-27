import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to create URL-friendly slug
const createSlug = (city: string): string => {
  return city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

// Helper to extract JSON from markdown codeblocks
const extractJsonFromMarkdown = (text: string): string => {
  // Remove ```json or ``` wrapper if present
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }
  return text.trim();
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { city, country = 'Spanje', extended = false } = await req.json();
    
    if (!city) {
      return new Response(
        JSON.stringify({ error: 'City parameter is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client with service role for cache access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Checking cache for city info: ${city}, ${country}, extended: ${extended}`);

    // Check if city info is already cached
    const { data: cachedInfo, error: cacheError } = await supabase
      .from('city_info_cache')
      .select('*')
      .eq('city', city)
      .eq('country', country)
      .maybeSingle();

    if (cacheError) {
      console.error('Error checking cache:', cacheError);
    }

    // Return cached info if available and complete
    if (cachedInfo?.description && (!extended || cachedInfo.investment_info)) {
      console.log(`Cache hit for ${city}, ${country}`);
      return new Response(
        JSON.stringify({ 
          ...cachedInfo,
          cached: true
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Cache miss or incomplete, generating AI content for: ${city}, ${country}`);

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Prepare AI prompt based on extended flag
    const systemPrompt = extended
      ? 'Je bent een lokale expert over Spaanse steden en dorpen. Genereer uitgebreide, gestructureerde informatie over de locatie voor vastgoedinvesteerders. Antwoord in JSON formaat met: description (400-500 woorden), highlights (array van 5-7 key facts als strings), investment_info (200-300 woorden over investeringspotentieel), distance_to_beach_km (schatting in kilometers), distance_to_airport_km (schatting naar dichtstbijzijnde luchthaven). Schrijf in een warme, menselijke tone-of-voice.'
      : 'Je bent een lokale expert over Spaanse steden en dorpen. Geef korte, informatieve en boeiende informatie over de locatie die potentiële vastgoedinvesteerders interesseert. Focus op leefbaarheid, voorzieningen, bereikbaarheid en de unieke charme van de locatie. Schrijf in een warme, menselijke tone-of-voice.';

    const userPrompt = extended
      ? `Genereer uitgebreide informatie over ${city} in ${country} in JSON formaat met de volgende velden:
- description: Een uitgebreide beschrijving (400-500 woorden) over de sfeer, karakter, voorzieningen, bereikbaarheid, afstand tot strand, en waarom het aantrekkelijk is voor investeerders
- highlights: Array van 5-7 korte key facts (bijv. ["Rustig dorpsleven", "10 min naar strand", "Groeiende expat community"])
- investment_info: Tekst over investeringspotentieel (200-300 woorden) - focus op ROI potentieel, verhuurmogelijkheden, markttrends, kapitaalgroei
- distance_to_beach_km: Geschatte afstand naar dichtstbijzijnde strand in kilometers (integer)
- distance_to_airport_km: Geschatte afstand naar dichtstbijzijnde grote luchthaven in kilometers (integer)

Schrijf in Nederlandse taal, vriendelijk en adviserend.`
      : `Schrijf een beknopte beschrijving (ongeveer 150-200 woorden) over ${city} in ${country}. Focus op:
- De sfeer en karakter van de plaats
- Belangrijkste voorzieningen (winkels, restaurants, scholen)
- Bereikbaarheid (luchthaven, snelwegen)
- Afstand tot de kust/strand indien relevant
- Wat het aantrekkelijk maakt om hier te wonen of te investeren

Schrijf in Nederlandse taal, vriendelijk en adviserend.`;

    // Call Lovable AI Gateway
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: extended ? 1200 : 400,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI Gateway returned ${aiResponse.status}: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const generatedText = aiData.choices?.[0]?.message?.content;

    if (!generatedText) {
      throw new Error('No content generated by AI');
    }

    console.log('Successfully generated city info');

    // Parse response based on extended flag
    let updateData: any;
    const slug = createSlug(city);

    if (extended) {
      try {
        // Strip markdown codeblocks before parsing
        const cleanedText = extractJsonFromMarkdown(generatedText);
        const parsed = JSON.parse(cleanedText);
        updateData = {
          city,
          country,
          slug,
          description: parsed.description || cleanedText,
          highlights: parsed.highlights || [],
          investment_info: parsed.investment_info || null,
          distance_to_beach_km: parsed.distance_to_beach_km || null,
          distance_to_airport_km: parsed.distance_to_airport_km || null,
        };
      } catch (e) {
        // Fallback if not valid JSON
        console.warn('Could not parse extended content as JSON, storing as description only');
        updateData = {
          city,
          country,
          slug,
          description: generatedText,
          highlights: [],
          investment_info: null,
          distance_to_beach_km: null,
          distance_to_airport_km: null,
        };
      }
    } else {
      updateData = {
        city,
        country,
        slug,
        description: generatedText,
      };
    }

    // Upsert to cache
    const { data: upsertedData, error: upsertError } = await supabase
      .from('city_info_cache')
      .upsert(updateData, {
        onConflict: 'city,country',
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Error caching city info:', upsertError);
      // Continue anyway, cache failure shouldn't block the response
    } else {
      console.log(`Cached city info for ${city}, ${country}`);
    }

    return new Response(
      JSON.stringify({ 
        ...(upsertedData || updateData),
        cached: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating city info:', errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});