import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProjectData {
  id: string;
  name: string;
  city: string | null;
  region: string | null;
  description: string | null;
  status: string | null;
  completion_date: string | null;
  price_from: number | null;
  price_to: number | null;
  property_types: string[] | null;
  highlights: string[] | null;
  is_resale: boolean | null;
  latitude: number | null;
  longitude: number | null;
  location_intelligence: LocationIntelligence | null;
  location_intelligence_updated_at: string | null;
}

interface NearbyPlace {
  name: string;
  distance_meters: number;
}

interface LocationIntelligence {
  coordinates: { lat: number; lng: number };
  nearbyAmenities: Record<string, NearbyPlace[]>;
  note: string;
  fetchedAt?: string;
}

// Cache validity: 180 days (6 maanden)
const CACHE_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;

interface PropertyData {
  id: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  terrace_area_sqm: number | null;
  plot_size_sqm: number | null;
  property_type: string | null;
  price: number | null;
  status: string | null;
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Fetch nearby places using Google Places API
async function fetchNearbyPlaces(
  lat: number,
  lng: number,
  apiKey: string
): Promise<Record<string, NearbyPlace[]>> {
  const categories = [
    { type: "beach", label: "stranden", radius: 5000 },
    { type: "golf_course", label: "golfbanen", radius: 15000 },
    { type: "supermarket", label: "supermarkten", radius: 2000 },
    { type: "restaurant", label: "restaurants", radius: 1000 },
    { type: "hospital", label: "ziekenhuizen", radius: 15000 },
    { type: "airport", label: "luchthavens", radius: 60000 },
  ];

  const results: Record<string, NearbyPlace[]> = {};

  // Process categories in parallel for speed
  const promises = categories.map(async (category) => {
    try {
      const response = await fetch(
        "https://places.googleapis.com/v1/places:searchNearby",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "places.displayName,places.location",
          },
          body: JSON.stringify({
            includedTypes: [category.type],
            maxResultCount: 5,
            locationRestriction: {
              circle: {
                center: { latitude: lat, longitude: lng },
                radiusMeters: category.radius,
              },
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Debug logging to see what the API returns
        console.log(`[Brainstorm] ${category.type} API response:`, JSON.stringify(data).substring(0, 500));
        
        if (!data.places || data.places.length === 0) {
          console.log(`[Brainstorm] ${category.type}: No places found within ${category.radius}m radius`);
        }
        
        const places = (data.places || []).map((place: { displayName?: { text?: string }; location?: { latitude: number; longitude: number } }) => ({
          name: place.displayName?.text || "Onbekend",
          distance_meters: place.location
            ? calculateDistance(lat, lng, place.location.latitude, place.location.longitude)
            : 0,
        }));
        // Sort by distance
        places.sort((a: NearbyPlace, b: NearbyPlace) => a.distance_meters - b.distance_meters);
        return { label: category.label, places };
      } else {
        const errorText = await response.text();
        console.error(`[Brainstorm] ${category.type} API error (${response.status}):`, errorText.substring(0, 300));
        return { label: category.label, places: [] };
      }
    } catch (error) {
      console.error(`[Brainstorm] Error fetching ${category.type}:`, error);
      return { label: category.label, places: [] };
    }
  });

  const categoryResults = await Promise.all(promises);
  for (const result of categoryResults) {
    if (result.places.length > 0) {
      results[result.label] = result.places;
    }
  }

  return results;
}

const DEFAULT_BRAINSTORMER_PROMPT = `Jij bent een Real Estate Strateeg gespecialiseerd in Spaans vastgoed voor Top Immo Spain.
Lees deze projectdata. Ik heb nog geen strakke output nodig, ik wil dat je DIEP nadenkt.

## ANALYSEER KRITISCH:

### 1. Oneerlijke Voorsprong
Wat maakt dit project ECHT uniek? Kijk voorbij de standaard marketingtaal.
- Is het de prijs t.o.v. de markt?
- Is het de locatie (zeldzaam/strategisch)?
- Is het de schaarste (laatste units, unieke configuratie)?
- Is het de timing (vroeg instappen, key-ready)?

### 2. Harde Feiten
Welke specificaties zijn écht relevant en opvallend?
- Ongewoon grote terrassen?
- Uitzonderlijke buitenruimte?
- Bijzondere voorzieningen?

### 3. Marketing Fluff Identificatie
Welke woorden/claims in de data zijn holle marketing?
- "Droom", "Paradijs", "Uniek" zonder onderbouwing
- Overdreven superlatieven
- Vage beloftes

### 4. Strategische Positionering
Hoe zou je dit project positioneren?
- Pre-launch voordeel (vroege vogel korting, keuze units)?
- Key-ready genot (direct verhuren/genieten)?
- Resale opportunity (schaars, onder marktwaarde)?

### 5. Doelgroep Trigger
Welke invalshoek zou een investeerder of genieter ECHT triggeren?
Denk aan echte zorgen en verlangens, niet marketingpraatjes.

Geef een beknopte maar kritische analyse in vrije tekst. 
Wees eerlijk over zwakke punten.`;

// Timeout helper with AbortController
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 25000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
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

  const startTime = Date.now();
  let projectId: string | undefined;

  try {
    const body = await req.json();
    projectId = body.projectId;
    const analysisId = body.analysisId;
    const forceRefreshLocation = body.forceRefreshLocation || false;

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "projectId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Brainstorm] Starting for project: ${projectId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch project data including coordinates and cached location intelligence
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name, city, region, description, status, completion_date, price_from, price_to, property_types, highlights, is_resale, latitude, longitude, location_intelligence, location_intelligence_updated_at")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      console.error("[Brainstorm] Project fetch error:", projectError);
      return new Response(
        JSON.stringify({ error: "Project niet gevonden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Brainstorm] Project fetched in ${Date.now() - startTime}ms`);

    // Fetch associated properties
    const { data: properties, error: propertiesError } = await supabase
      .from("properties")
      .select("id, bedrooms, bathrooms, area_sqm, terrace_area_sqm, plot_size_sqm, property_type, price, status")
      .eq("project_id", projectId)
      .limit(20); // More properties for better context

    if (propertiesError) {
      console.error("[Brainstorm] Properties fetch error:", propertiesError);
    }

    const projectData = project as ProjectData;
    const propertiesData = (properties || []) as PropertyData[];

    console.log(`[Brainstorm] Data fetched in ${Date.now() - startTime}ms, ${propertiesData.length} properties`);

    // Fetch brainstormer prompt and model from database
    const { data: promptData } = await supabase
      .from("ai_prompts")
      .select("prompt_text, model_id")
      .eq("prompt_key", "project_briefing_brainstormer")
      .single();

    const brainstormerPrompt = promptData?.prompt_text || DEFAULT_BRAINSTORMER_PROMPT;
    const brainstormerModel = promptData?.model_id || "google/gemini-2.5-pro";

    // Check for cached location intelligence or fetch fresh
    let locationIntelligence: LocationIntelligence | null = null;
    const cachedLocationData = projectData.location_intelligence as LocationIntelligence | null;
    const cachedUpdatedAt = projectData.location_intelligence_updated_at;
    
    // Check if cache is valid (exists and less than 30 days old)
    const cacheValid = cachedLocationData && 
      cachedUpdatedAt &&
      (Date.now() - new Date(cachedUpdatedAt).getTime()) < CACHE_MAX_AGE_MS;
    
    if (cacheValid && !forceRefreshLocation) {
      // Use cached data
      console.log(`[Brainstorm] Using cached location intelligence (updated: ${cachedUpdatedAt})`);
      locationIntelligence = cachedLocationData;
    } else if (projectData.latitude && projectData.longitude) {
      // Fetch fresh data
      const googleApiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
      if (googleApiKey) {
        const reason = forceRefreshLocation ? "forced refresh" : (cachedLocationData ? "cache expired" : "no cache");
        console.log(`[Brainstorm] Fetching fresh location intelligence (${reason}) for ${projectData.latitude}, ${projectData.longitude}`);
        try {
          const nearbyAmenities = await fetchNearbyPlaces(
            projectData.latitude,
            projectData.longitude,
            googleApiKey
          );
          locationIntelligence = {
            coordinates: { lat: projectData.latitude, lng: projectData.longitude },
            nearbyAmenities,
            note: "Afstanden zijn hemelsbreed berekend. Gebruik deze info om de locatie beter te begrijpen.",
            fetchedAt: new Date().toISOString()
          };
          console.log(`[Brainstorm] Location intelligence fetched: ${Object.keys(nearbyAmenities).length} categories`);
          
          // Save to database for future use
          const { error: updateError } = await supabase
            .from("projects")
            .update({
              location_intelligence: locationIntelligence,
              location_intelligence_updated_at: new Date().toISOString()
            })
            .eq("id", projectId);
          
          if (updateError) {
            console.error("[Brainstorm] Failed to cache location intelligence:", updateError);
          } else {
            console.log("[Brainstorm] Location intelligence cached successfully");
          }
        } catch (error) {
          console.error("[Brainstorm] Failed to fetch location intelligence:", error);
        }
      } else {
        console.log("[Brainstorm] GOOGLE_PLACES_API_KEY not configured, skipping location intelligence");
      }
    } else {
      console.log("[Brainstorm] No coordinates available for project");
    }

    // Prepare context - streamlined for faster processing
    const projectContext = JSON.stringify({
      project: {
        name: projectData.name,
        city: projectData.city,
        region: projectData.region,
        description: projectData.description,
        status: projectData.status,
        completion_date: projectData.completion_date,
        price_from: projectData.price_from,
        price_to: projectData.price_to,
        property_types: projectData.property_types,
        highlights: projectData.highlights?.slice(0, 10), // More highlights for context
        is_resale: projectData.is_resale,
      },
      properties: propertiesData.map(p => ({
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        area_sqm: p.area_sqm,
        terrace_area_sqm: p.terrace_area_sqm,
        plot_size_sqm: p.plot_size_sqm,
        property_type: p.property_type,
        price: p.price,
        status: p.status,
      })),
      locationIntelligence,
    }, null, 2);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Call Brainstormer using configured model (default: gemini-2.5-pro for deep reasoning)
    console.log(`[Brainstorm] Calling AI (${brainstormerModel})...`);
    
    let brainstormResponse: Response;
    try {
      brainstormResponse = await fetchWithTimeout(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: brainstormerModel,
            messages: [
              { role: "system", content: brainstormerPrompt },
              { role: "user", content: `Analyseer dit project en geef je strategische inzichten:\n\n${projectContext}` }
            ]
          }),
        },
        45000 // 45 second timeout for Pro model
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.error("[Brainstorm] Request timed out after 45s");
        return new Response(
          JSON.stringify({ error: "De analyse duurt te lang (timeout na 45s). Probeer het opnieuw." }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw error;
    }

    console.log(`[Brainstorm] AI responded with status ${brainstormResponse.status} in ${Date.now() - startTime}ms`);

    if (!brainstormResponse.ok) {
      if (brainstormResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit bereikt, probeer het later opnieuw" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (brainstormResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits op, voeg credits toe aan je workspace" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await brainstormResponse.text();
      console.error("[Brainstorm] AI Error:", brainstormResponse.status, errorText.substring(0, 500));
      return new Response(
        JSON.stringify({ error: `AI fout (${brainstormResponse.status}): probeer opnieuw` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const brainstormData = await brainstormResponse.json();
    const brainstormInsights = brainstormData.choices?.[0]?.message?.content || "";
    
    if (!brainstormInsights) {
      console.error("[Brainstorm] Empty response from AI");
      return new Response(
        JSON.stringify({ error: "Lege response van AI, probeer opnieuw" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Brainstorm] Insights received (${brainstormInsights.length} chars) in ${Date.now() - startTime}ms`);

    // CLEANUP: Delete all existing analyses for this project before creating new one
    // This ensures each project has exactly one analysis at any time
    const { error: cleanupError, count: deletedCount } = await supabase
      .from("project_briefing_analyses")
      .delete()
      .eq("project_id", projectId);
    
    if (cleanupError) {
      console.error("[Brainstorm] Cleanup error:", cleanupError);
      // Not fatal, continue with new analysis
    } else if (deletedCount && deletedCount > 0) {
      console.log(`[Brainstorm] Cleaned up ${deletedCount} old analysis record(s) for project ${projectId}`);
    }

    // Create new analysis (always fresh, no update logic needed)
    const { data: newAnalysis, error: insertError } = await supabase
      .from("project_briefing_analyses")
      .insert({
        project_id: projectId,
        brainstorm_insights: brainstormInsights,
        status: "brainstorm_ready",
      })
      .select("id")
      .single();
    
    let savedAnalysisId: string | undefined;
    if (insertError) {
      console.error("[Brainstorm] Insert analysis error:", insertError);
    } else {
      savedAnalysisId = newAnalysis?.id;
    }

    console.log(`[Brainstorm] Complete in ${Date.now() - startTime}ms`);

    return new Response(
      JSON.stringify({
        analysisId: savedAnalysisId,
        brainstormInsights,
        projectName: projectData.name,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Brainstorm] Error after ${Date.now() - startTime}ms:`, error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
