import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAnthropic, MODEL_SONNET } from '../_shared/ai-client.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LocationAmenity {
  name: string;
  distance_meters: number;
  rating?: number;
  types?: string[];
}

interface LocationIntelligence {
  nearbyAmenities?: {
    stranden?: LocationAmenity[];
    golfbanen?: LocationAmenity[];
    restaurants?: LocationAmenity[];
    supermarkten?: LocationAmenity[];
    ziekenhuizen?: LocationAmenity[];
    luchthavens?: LocationAmenity[];
    marinas?: LocationAmenity[];
    treinstations?: LocationAmenity[];
    scholen?: LocationAmenity[];
  };
  cachedAt?: string;
}

interface RentalCacheData {
  annualRevenue?: number;
  occupancy?: number;
  avgDailyRate?: number;
}

interface RentalComparable {
  name: string;
  revenue?: { annual: number };
  ratings?: { overall: number };
}

const DEFAULT_BRAINSTORMER_PROMPT = `Jij bent een Senior Real Estate Investment Analyst voor Top Immo Spain.

## BELANGRIJKE CONTEXT:

### Tijdscontext
Vandaag is: {{analysisContext.currentDate}} (jaar {{analysisContext.currentYear}})
Gebruik dit voor berekeningen rond oplevering, timing en marktcontext.

### Woningtypes vs Units
De 'propertyTypes' array bevat de VERSCHILLENDE woningconfiguraties (bv. "2-bed appartement", "3-bed penthouse").
Van elk type zijn meerdere units beschikbaar voor verkoop - het exacte totale aantal units is NIET gespecificeerd.
'inventory.propertyTypesCount' = aantal VERSCHILLENDE woningtypes (schema's/configuraties).
Focus op de KENMERKEN en WAARDE van elk type, niet op aantallen units.

---

Je krijgt ALLE beschikbare data over een project. Analyseer dit GRONDIG.

## WAT JE KRIJGT:
- Project metadata (naam, prijs, status, locatie)
- ALLE woningtypes met volledige specs (m², terrassen, features, prijzen)
- Location Intelligence (nabije stranden, golf, restaurants, ziekenhuizen - uit Google Places)
- Rental Intelligence (verhuurdata van vergelijkbare woningen - uit AirROI)
  BELANGRIJK: Occupancy is uitgedrukt als percentage (bv. 65% betekent 65% bezetting)

## ANALYSEER KRITISCH:

### 1. UNFAIR ADVANTAGE
- Wat maakt dit project ECHT bijzonder? (niet marketing)
- Prijs/m² vs. vergelijkbare projecten?
- Locatievoordelen die niet makkelijk te repliceren zijn?
- Timing (pre-launch, key-ready, laatste units)?

### 2. PROPERTY TYPE ANALYSE
- Welk type biedt de beste waarde? (prijs per m²)
- Welk type is het meest interessant voor verhuur?
- Welk type voor eigen gebruik?
- Zijn er opvallende verschillen tussen types?

### 3. RENTAL POTENTIAL (als data beschikbaar)
- Realistische yield verwachting gebaseerd op AirROI data
- Vergelijking met de comparables
- Seizoensgebondenheid (als zichtbaar in data)
- Waarschuwingen of kansen

### 4. LOCATIE SCORE
- Strand toegankelijkheid (meters, welke stranden?)
- Golf toegankelijkheid
- Dagelijkse voorzieningen (supermarkten, restaurants)
- Zorg (ziekenhuizen, apotheken)
- Luchthaven bereikbaarheid

### 5. TARGET AUDIENCE FIT
Beoordeel eerlijk:
- INVESTEERDER: Hoog/Medium/Laag + waarom
- VAKANTIEGANGER: Hoog/Medium/Laag + waarom  
- PERMANENTE BEWONER: Hoog/Medium/Laag + waarom

### 6. WAARSCHUWINGEN
- Wat zijn de ECHTE nadelen?
- Waar moet een koper op letten?
- Welke verwachtingen moeten we temperen?

### 7. GOLDEN NUGGETS
- Welke details zijn perfect voor marketing?
- Welke feiten onderscheiden dit van concurrentie?

Geef een uitgebreide analyse (600-1000 woorden) in vrije tekst.
Wees kritisch, eerlijk en concreet. Geen marketing fluff.`;

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
  const { data: { user }, error: authError } = await _authClient.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const { projectId, saveToDatabase = false } = await req.json();

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "projectId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Deep Analysis] Starting for project: ${projectId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ============================================
    // STEP 1: Fetch ALL Project Data
    // ============================================
    console.log("[Deep Analysis] Step 1: Fetching project data...");
    
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(`
        id, name, display_title, description, highlights,
        city, region, country, latitude, longitude,
        price_from, price_to, status, completion_date,
        property_types, property_count, is_resale,
        min_bedrooms, max_bedrooms,
        location_intelligence,
        ai_rewritten_description
      `)
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      console.error("Project fetch error:", projectError);
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // STEP 2: Fetch ALL Properties with Full Specs
    // ============================================
    console.log("[Deep Analysis] Step 2: Fetching properties...");
    
    const { data: properties, error: propertiesError } = await supabase
      .from("properties")
      .select(`
        id, title, description, price, property_type,
        bedrooms, bathrooms, area_sqm, usable_area_sqm,
        terrace_area_sqm, plot_size_sqm, features,
        pool, communal_pool, private_pool, garden, parking,
        sea_views, mountain_views, garden_views, village_views, pool_views, open_views,
        airconditioning, heating, elevator,
        distance_to_beach_m, distance_to_golf_m,
        key_ready, off_plan, delivery_date, status
      `)
      .eq("project_id", projectId)
      .order("bedrooms", { ascending: true })
      .order("price", { ascending: true });

    if (propertiesError) {
      console.error("Properties fetch error:", propertiesError);
    }

    const propertiesData = properties || [];
    console.log(`[Deep Analysis] Found ${propertiesData.length} properties`);

    // ============================================
    // STEP 3: Fetch Rental Data from Cache
    // ============================================
    console.log("[Deep Analysis] Step 3: Fetching rental data...");
    
    const { data: rentalCache, error: rentalError } = await supabase
      .from("rental_comparables_cache")
      .select("bedrooms, bathrooms, guests, data, comparables")
      .eq("project_id", projectId);

    if (rentalError) {
      console.error("Rental cache fetch error:", rentalError);
    }

    const rentalData = rentalCache || [];
    console.log(`[Deep Analysis] Found ${rentalData.length} rental cache entries`);

    // ============================================
    // STEP 4: Build Rich Context Object
    // ============================================
    console.log("[Deep Analysis] Step 4: Building context...");
    
    const locationIntel = project.location_intelligence as LocationIntelligence | null;
    
    const contextData = {
      // Tijdscontext voor accurate analyse
      analysisContext: {
        currentDate: new Date().toISOString().split('T')[0],  // "2026-01-25"
        currentYear: new Date().getFullYear(),                 // 2026
        note: "Gebruik deze datum voor alle tijdsgebonden berekeningen"
      },
      
      // Project Overview
      project: {
        name: project.name,
        displayTitle: project.display_title,
        description: project.description,
        location: { 
          city: project.city, 
          region: project.region,
          country: project.country,
          coordinates: project.latitude && project.longitude 
            ? { lat: project.latitude, lng: project.longitude }
            : null
        },
        priceRange: { 
          from: project.price_from, 
          to: project.price_to,
          formatted: project.price_from && project.price_to
            ? `€${(project.price_from / 1000).toFixed(0)}k - €${(project.price_to / 1000).toFixed(0)}k`
            : null
        },
        status: project.status,
        completionDate: project.completion_date,
        isResale: project.is_resale,
        highlights: project.highlights,
        bedroomRange: { min: project.min_bedrooms, max: project.max_bedrooms },
        // Verduidelijk: we kennen enkel het aantal types, niet het totaal aantal units
        inventory: {
          propertyTypesCount: propertiesData.length,
          note: "Dit zijn de VERSCHILLENDE woningtypes/configuraties. Van elk type zijn meerdere units beschikbaar, maar het exacte totale aantal is niet bekend."
        },
        aiDescription: project.ai_rewritten_description
      },
      
      // Property Types Analysis
      propertyTypes: propertiesData.map(p => ({
        type: p.property_type,
        title: p.title,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        livingArea: p.area_sqm,
        usableArea: p.usable_area_sqm,
        terraceArea: p.terrace_area_sqm,
        plotSize: p.plot_size_sqm,
        price: p.price,
        pricePerSqm: p.area_sqm && p.price ? Math.round(p.price / p.area_sqm) : null,
        features: p.features,
        amenities: {
          pool: p.pool || p.communal_pool || p.private_pool,
          privatePool: p.private_pool,
          garden: p.garden,
          parking: p.parking,
          airco: p.airconditioning,
          heating: p.heating,
          elevator: p.elevator
        },
        views: {
          sea: p.sea_views,
          mountain: p.mountain_views,
          garden: p.garden_views,
          village: p.village_views,
          pool: p.pool_views,
          open: p.open_views
        },
        distances: {
          toBeach: p.distance_to_beach_m,
          toGolf: p.distance_to_golf_m
        },
        isKeyReady: p.key_ready,
        isOffPlan: p.off_plan,
        deliveryDate: p.delivery_date,
        status: p.status
      })),
      
      // Location Intelligence (Google Places) - using Dutch field names from enrich-project-landing
      locationIntelligence: locationIntel?.nearbyAmenities ? {
        beaches: locationIntel.nearbyAmenities.stranden?.slice(0, 5).map(b => ({
          name: b.name,
          distance: `${b.distance_meters}m`
        })),
        golf: locationIntel.nearbyAmenities.golfbanen?.slice(0, 3).map(g => ({
          name: g.name,
          distance: `${(g.distance_meters / 1000).toFixed(1)}km`
        })),
        restaurants: {
          count: locationIntel.nearbyAmenities.restaurants?.length || 0,
          nearest: locationIntel.nearbyAmenities.restaurants?.slice(0, 3).map(r => ({
            name: r.name,
            distance: `${r.distance_meters}m`
          }))
        },
        supermarkets: locationIntel.nearbyAmenities.supermarkten?.slice(0, 3).map(s => ({
          name: s.name,
          distance: `${s.distance_meters}m`
        })),
        hospitals: locationIntel.nearbyAmenities.ziekenhuizen?.slice(0, 2).map(h => ({
          name: h.name,
          distance: `${(h.distance_meters / 1000).toFixed(1)}km`
        })),
        airports: locationIntel.nearbyAmenities.luchthavens?.slice(0, 2).map(a => ({
          name: a.name,
          distance: `${(a.distance_meters / 1000).toFixed(0)}km`
        })),
        marinas: locationIntel.nearbyAmenities.marinas?.slice(0, 2).map(m => ({
          name: m.name,
          distance: `${(m.distance_meters / 1000).toFixed(1)}km`
        })),
        trainStations: locationIntel.nearbyAmenities.treinstations?.slice(0, 2).map(t => ({
          name: t.name,
          distance: `${(t.distance_meters / 1000).toFixed(1)}km`
        }))
      } : null,
      
      // Rental Intelligence (AirROI)
      rentalIntelligence: rentalData.length > 0 ? rentalData.map(cache => {
        const data = cache.data as RentalCacheData | null;
        const comparables = cache.comparables as RentalComparable[] | null;
        
        return {
          forType: `${cache.bedrooms} slaapkamer(s), ${cache.bathrooms} badkamer(s)`,
          annualRevenue: data?.annualRevenue ? `€${data.annualRevenue.toLocaleString()}` : null,
          // Occupancy is al opgeslagen als integer (0-100), niet vermenigvuldigen
          occupancyRate: data?.occupancy ? `${data.occupancy}%` : null,
          avgNightlyRate: data?.avgDailyRate ? `€${Math.round(data.avgDailyRate)}` : null,
          comparablesCount: comparables?.length || 0,
          topComparables: comparables?.slice(0, 5).map(c => ({
            name: c.name,
            annualRevenue: c.revenue?.annual ? `€${c.revenue.annual.toLocaleString()}` : null,
            rating: c.ratings?.overall
          }))
        };
      }) : null
    };

    // ============================================
    // STEP 5: Fetch Prompt AND Model from Database
    // ============================================
    console.log("[Deep Analysis] Step 5: Fetching prompt and model...");
    
    const { data: promptData } = await supabase
      .from("ai_prompts")
      .select("prompt_text, model_id")
      .eq("prompt_key", "project_deep_analysis_brainstormer")
      .single();

    const brainstormerPrompt = promptData?.prompt_text || DEFAULT_BRAINSTORMER_PROMPT;
    // Map any legacy Gemini model IDs to the Anthropic model; always use Sonnet for deep analysis
    console.log(`[Deep Analysis] Using model: ${MODEL_SONNET} (DB model_id: ${promptData?.model_id ?? "default"})`);

    // ============================================
    // STEP 6: Call Brainstormer AI
    // ============================================
    console.log(`[Deep Analysis] Step 6: Calling Brainstormer...`);

    const brainstormInsights = await callAnthropic(
      brainstormerPrompt,
      `Analyseer dit project grondig:\n\n${JSON.stringify(contextData, null, 2)}`,
      { model: MODEL_SONNET, maxTokens: 2048 }
    );
    
    console.log("[Deep Analysis] Brainstorm complete! Length:", brainstormInsights.length);

    // ============================================
    // STEP 7: Optionally Save to Database
    // ============================================
    if (saveToDatabase) {
      console.log("[Deep Analysis] Step 7: Saving to database...");
      
      const { error: updateError } = await supabase
        .from("projects")
        .update({
          deep_analysis_brainstorm: brainstormInsights,
          deep_analysis_updated_at: new Date().toISOString()
        })
        .eq("id", projectId);

      if (updateError) {
        console.error("[Deep Analysis] Save error:", updateError);
        throw new Error("Failed to save analysis to database");
      }
    }

    // Return the analysis with context data for debugging
    return new Response(
      JSON.stringify({
        brainstormInsights,
        contextData,
        dataSourcesStatus: {
          project: true,
          properties: propertiesData.length,
          locationIntelligence: !!locationIntel,
          rentalData: rentalData.length
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Deep Analysis] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
