import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PlaceResult {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  google_place_id: string;
  google_maps_url: string;
  phone: string | null;
  website: string | null;
  opening_hours: string[] | null;
  description: string | null;
  municipality: string;
  rating: number | null;
  rating_count: number | null;
  price_level: string | null;
  distance_meters: number;
}

function formatPriceLevel(priceLevel: string | undefined): string | null {
  if (!priceLevel) return null;
  const levels: Record<string, string> = {
    "PRICE_LEVEL_FREE": "Gratis",
    "PRICE_LEVEL_INEXPENSIVE": "€",
    "PRICE_LEVEL_MODERATE": "€€",
    "PRICE_LEVEL_EXPENSIVE": "€€€",
    "PRICE_LEVEL_VERY_EXPENSIVE": "€€€€",
  };
  return levels[priceLevel] || null;
}

function extractMunicipality(addressComponents: any[] | undefined): string {
  if (!addressComponents) return "Onbekend";
  
  // Try locality first
  const locality = addressComponents.find((c: any) => 
    c.types?.includes("locality")
  );
  if (locality) return locality.longText || locality.shortText;
  
  // Fallback to administrative_area_level_4
  const adminArea4 = addressComponents.find((c: any) => 
    c.types?.includes("administrative_area_level_4")
  );
  if (adminArea4) return adminArea4.longText || adminArea4.shortText;
  
  // Fallback to administrative_area_level_3
  const adminArea3 = addressComponents.find((c: any) => 
    c.types?.includes("administrative_area_level_3")
  );
  if (adminArea3) return adminArea3.longText || adminArea3.shortText;
  
  return "Onbekend";
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { google_type, latitude, longitude, radius_meters = 5000, max_results = 20 } = await req.json();

    if (!google_type || !latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: google_type, latitude, longitude" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) {
      console.error("GOOGLE_PLACES_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Google Places API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Searching for ${google_type} near ${latitude}, ${longitude} within ${radius_meters}m`);

    const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location,places.id,places.nationalPhoneNumber,places.websiteUri,places.regularOpeningHours,places.googleMapsUri,places.rating,places.userRatingCount,places.editorialSummary,places.addressComponents,places.priceLevel",
      },
      body: JSON.stringify({
        includedTypes: [google_type],
        maxResultCount: Math.min(max_results, 20), // API max is 20
        locationRestriction: {
          circle: {
            center: { latitude, longitude },
            radius: radius_meters,
          },
        },
        languageCode: "nl",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Places API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Google Places API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const places = data.places || [];

    console.log(`Found ${places.length} places for type ${google_type}`);

    const results: PlaceResult[] = places.map((place: any) => ({
      name: place.displayName?.text || "Onbekend",
      address: place.formattedAddress || "",
      latitude: place.location?.latitude || 0,
      longitude: place.location?.longitude || 0,
      google_place_id: place.id || "",
      google_maps_url: place.googleMapsUri || "",
      phone: place.nationalPhoneNumber || null,
      website: place.websiteUri || null,
      opening_hours: place.regularOpeningHours?.weekdayDescriptions || null,
      description: place.editorialSummary?.text || null,
      municipality: extractMunicipality(place.addressComponents),
      rating: place.rating || null,
      rating_count: place.userRatingCount || null,
      price_level: formatPriceLevel(place.priceLevel),
      distance_meters: calculateDistance(latitude, longitude, place.location?.latitude || 0, place.location?.longitude || 0),
    }));

    // Sort by distance
    results.sort((a, b) => a.distance_meters - b.distance_meters);

    return new Response(
      JSON.stringify({ places: results, total: results.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in import-google-places:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
