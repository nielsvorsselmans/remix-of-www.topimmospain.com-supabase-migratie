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
  
  const locality = addressComponents.find((c: any) => 
    c.types?.includes("locality")
  );
  if (locality) return locality.longText || locality.shortText;
  
  const adminArea4 = addressComponents.find((c: any) => 
    c.types?.includes("administrative_area_level_4")
  );
  if (adminArea4) return adminArea4.longText || adminArea4.shortText;
  
  const adminArea3 = addressComponents.find((c: any) => 
    c.types?.includes("administrative_area_level_3")
  );
  if (adminArea3) return adminArea3.longText || adminArea3.shortText;
  
  return "Onbekend";
}

function mapPlaceToResult(place: any): PlaceResult {
  return {
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
  };
}

const FIELD_MASK = "displayName,formattedAddress,location,id,nationalPhoneNumber,websiteUri,regularOpeningHours,googleMapsUri,rating,userRatingCount,editorialSummary,addressComponents,priceLevel";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mode, place_id, query, latitude, longitude, radius_meters = 5000, max_results = 20 } = await req.json();

    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) {
      console.error("GOOGLE_PLACES_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Google Places API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // MODE 1: Lookup by Place ID
    if (mode === "place_id" || place_id) {
      if (!place_id) {
        return new Response(
          JSON.stringify({ error: "Missing place_id parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Looking up place by ID: ${place_id}`);

      const response = await fetch(`https://places.googleapis.com/v1/places/${place_id}`, {
        method: "GET",
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": FIELD_MASK,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Google Places API error:", response.status, errorText);
        return new Response(
          JSON.stringify({ error: `Google Places API error: ${response.status}`, details: errorText }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const place = await response.json();
      const result = mapPlaceToResult(place);

      return new Response(
        JSON.stringify({ place: result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // MODE 2: Text Search
    if (mode === "search" || query) {
      if (!query) {
        return new Response(
          JSON.stringify({ error: "Missing query parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Searching for: "${query}" ${latitude && longitude ? `near ${latitude},${longitude}` : ''}`);

      const requestBody: any = {
        textQuery: query,
        maxResultCount: Math.min(max_results, 20),
        languageCode: "nl",
      };

      // Add location bias if coordinates provided
      if (latitude && longitude) {
        requestBody.locationBias = {
          circle: {
            center: { latitude, longitude },
            radius: radius_meters,
          },
        };
      }

      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": `places.${FIELD_MASK.split(',').join(',places.')}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Google Places API error:", response.status, errorText);
        return new Response(
          JSON.stringify({ error: `Google Places API error: ${response.status}`, details: errorText }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      const places = data.places || [];

      console.log(`Found ${places.length} places for query "${query}"`);

      const results: PlaceResult[] = places.map(mapPlaceToResult);

      return new Response(
        JSON.stringify({ places: results, total: results.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Missing required parameters. Provide either 'place_id' for lookup or 'query' for search." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in google-places-lookup:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
