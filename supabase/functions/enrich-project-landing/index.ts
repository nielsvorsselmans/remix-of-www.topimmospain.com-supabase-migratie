import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NearbyPlace {
  name: string;
  distance_meters: number;
  google_place_id: string;
  latitude: number | null;
  longitude: number | null;
}

interface LocationIntelligence {
  coordinates: { lat: number; lng: number };
  nearbyAmenities: Record<string, NearbyPlace[]>;
  note: string;
  fetchedAt?: string;
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

interface CategorySetting {
  google_type: string;
  label: string;
  radius_meters: number;
  max_results: number;
}

async function fetchCategorySettings(supabase: any): Promise<CategorySetting[]> {
  const { data, error } = await supabase
    .from("location_category_settings")
    .select("google_type, label, radius_meters, max_results")
    .eq("is_active", true)
    .order("sort_order");

  if (error || !data?.length) {
    console.log("[EnrichLanding] Using fallback categories, DB error:", error?.message);
    return [
      { google_type: "beach", label: "stranden", radius_meters: 5000, max_results: 5 },
      { google_type: "golf_course", label: "golfbanen", radius_meters: 15000, max_results: 5 },
      { google_type: "supermarket", label: "supermarkten", radius_meters: 2000, max_results: 5 },
      { google_type: "restaurant", label: "restaurants", radius_meters: 1000, max_results: 5 },
      { google_type: "hospital", label: "ziekenhuizen", radius_meters: 15000, max_results: 5 },
      { google_type: "airport", label: "luchthavens", radius_meters: 60000, max_results: 5 },
    ];
  }

  return data;
}

async function fetchNearbyPlaces(
  lat: number,
  lng: number,
  apiKey: string,
  categories: CategorySetting[]
): Promise<Record<string, NearbyPlace[]>> {
  const results: Record<string, NearbyPlace[]> = {};

  const promises = categories.map(async (category) => {
    try {
      const response = await fetch(
        "https://places.googleapis.com/v1/places:searchNearby",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "places.id,places.displayName,places.location",
          },
          body: JSON.stringify({
            includedTypes: [category.google_type],
            maxResultCount: category.max_results,
            locationRestriction: {
              circle: {
                center: { latitude: lat, longitude: lng },
                radius: category.radius_meters,
              },
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log(`[EnrichLanding] ${category.google_type}: ${data.places?.length || 0} places found`);
        
        const places = (data.places || []).map((place: { id?: string; displayName?: { text?: string }; location?: { latitude: number; longitude: number } }) => ({
          name: place.displayName?.text || "Onbekend",
          distance_meters: place.location
            ? calculateDistance(lat, lng, place.location.latitude, place.location.longitude)
            : 0,
          google_place_id: place.id || "",
          latitude: place.location?.latitude ?? null,
          longitude: place.location?.longitude ?? null,
        }));
        
        places.sort((a: NearbyPlace, b: NearbyPlace) => a.distance_meters - b.distance_meters);
        
        const uniquePlaces = places.filter((place: NearbyPlace, index: number, self: NearbyPlace[]) =>
          index === self.findIndex((p) => 
            (place.google_place_id && p.google_place_id === place.google_place_id) || p.name === place.name
          )
        );
        
        return { label: category.label.toLowerCase(), places: uniquePlaces };
      } else {
        const errorText = await response.text();
        console.error(`[EnrichLanding] ${category.google_type} API error (${response.status}):`, errorText.substring(0, 300));
        return { label: category.label.toLowerCase(), places: [] };
      }
    } catch (error) {
      console.error(`[EnrichLanding] Error fetching ${category.google_type}:`, error);
      return { label: category.label.toLowerCase(), places: [] };
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

  try {
    const body = await req.json();
    const { projectId, forceRefresh = false } = body;

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "projectId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[EnrichLanding] Starting for project: ${projectId}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch project with coordinates and cached data
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name, latitude, longitude, location_intelligence, enrichment_status")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      console.error("[EnrichLanding] Project fetch error:", projectError);
      return new Response(
        JSON.stringify({ error: "Project niet gevonden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PERMANENT CACHE: Return cached data if it exists and not forcing refresh
    const cachedLocationData = project.location_intelligence as LocationIntelligence | null;
    
    if (cachedLocationData && !forceRefresh) {
      console.log(`[EnrichLanding] Returning permanently cached data`);
      return new Response(
        JSON.stringify({ 
          locationIntelligence: cachedLocationData,
          cached: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Race condition protection: check if another request is already enriching
    if (project.enrichment_status === "in_progress" && !forceRefresh) {
      console.log("[EnrichLanding] Enrichment already in progress, skipping");
      return new Response(
        JSON.stringify({ 
          error: "Enrichment is al bezig",
          locationIntelligence: cachedLocationData,
          cached: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for coordinates
    if (!project.latitude || !project.longitude) {
      console.log("[EnrichLanding] No coordinates available for project");
      return new Response(
        JSON.stringify({ 
          error: "Project heeft geen coördinaten",
          locationIntelligence: null,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for Google API key
    const googleApiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!googleApiKey) {
      console.error("[EnrichLanding] GOOGLE_PLACES_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Google Places API key niet geconfigureerd" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Set enrichment_status to in_progress (lock)
    await supabase
      .from("projects")
      .update({ enrichment_status: "in_progress" })
      .eq("id", projectId);

    try {
      const categorySettings = await fetchCategorySettings(supabase);
      console.log(`[EnrichLanding] Loaded ${categorySettings.length} active categories`);

      const reason = forceRefresh ? "forced refresh" : "no cache";
      console.log(`[EnrichLanding] Fetching fresh data (${reason}) for ${project.latitude}, ${project.longitude}`);

      const nearbyAmenities = await fetchNearbyPlaces(
        project.latitude,
        project.longitude,
        googleApiKey,
        categorySettings
      );

      const locationIntelligence: LocationIntelligence = {
        coordinates: { lat: project.latitude, lng: project.longitude },
        nearbyAmenities,
        note: "Afstanden zijn hemelsbreed berekend.",
        fetchedAt: new Date().toISOString(),
      };

      console.log(`[EnrichLanding] Location intelligence fetched: ${Object.keys(nearbyAmenities).length} categories`);

      // Save to database and reset enrichment status
      const { error: updateError } = await supabase
        .from("projects")
        .update({
          location_intelligence: locationIntelligence,
          location_intelligence_updated_at: new Date().toISOString(),
          enrichment_status: "done",
        })
        .eq("id", projectId);

      if (updateError) {
        console.error("[EnrichLanding] Failed to cache location intelligence:", updateError);
      } else {
        console.log("[EnrichLanding] Location intelligence cached permanently");
      }

      console.log(`[EnrichLanding] Complete in ${Date.now() - startTime}ms`);

      return new Response(
        JSON.stringify({
          locationIntelligence,
          cached: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (enrichError) {
      // Reset enrichment status on failure
      await supabase
        .from("projects")
        .update({ enrichment_status: "idle" })
        .eq("id", projectId);
      throw enrichError;
    }
  } catch (error) {
    console.error("[EnrichLanding] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
