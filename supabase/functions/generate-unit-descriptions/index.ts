import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UnitTypeSpec {
  key: string;
  label: string;
  bedrooms: number;
  areaSqm: number;
  terraceSqm: number;
  floor: string;
  solarium: boolean;
  garden: boolean;
  plotSizeSqm: number | null;
  seaViews: boolean;
  mountainViews: boolean;
  poolViews: boolean;
  communalPool: boolean;
  privatePool: boolean;
  elevator: boolean;
  airconditioning: boolean;
  parking: number | null;
  bathrooms: number;
  orientation: string | null;
  price: number;
}

const UNIT_DESCRIPTION_PROMPT = `Je bent een vastgoedredacteur die kopers helpt het verschil te begrijpen tussen woningtypes binnen hetzelfde project.

TAAK: Genereer voor elk woningtype een korte, warme beschrijving die dit type plaatst binnen het project.

REGELS:
1. Schrijf vanuit het klantperspectief, gebruik "u" of "je"
2. GEEN superlatieven: geen "prachtig", "schitterend", "uniek", "droomwoning"
3. Benadruk wat dit type WEL heeft dat andere types NIET hebben
4. Vergelijk impliciet met de andere types (bijv. "het ruimste type" of "als enige met eigen tuin")
5. Wees feitelijk en concreet - noem m2, verdieping, specifieke kenmerken
6. Schrijf in het Nederlands
7. Gebruik GEEN uitroeptekens

PER TYPE:
- intro: 60-80 woorden, warme beschrijving die dit type positioneert
- highlights: 3-4 bullet points die dit type onderscheiden van de rest (kort, feitelijk)
- livingAdvantage: 1 warme zin over hoe het voelt om hier te wonen`;

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
    const { projectId, forceRefresh = false } = await req.json();

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "projectId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[UnitDescriptions] Starting for project: ${projectId}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch project metadata
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name, display_title, city, region, ai_unit_descriptions, description")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      console.error("[UnitDescriptions] Project fetch error:", projectError);
      return new Response(
        JSON.stringify({ error: "Project niet gevonden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return cached if available
    if (project.ai_unit_descriptions && !forceRefresh) {
      console.log("[UnitDescriptions] Returning cached descriptions");
      return new Response(
        JSON.stringify({ descriptions: project.ai_unit_descriptions, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch properties
    const { data: properties, error: propsError } = await supabase
      .from("properties")
      .select(`
        id, property_type, bedrooms, bathrooms, area_sqm, terrace_area_sqm, 
        plot_size_sqm, floor, solarium, garden, sea_views, mountain_views, 
        pool_views, communal_pool, private_pool, elevator, airconditioning, 
        parking, orientation, price
      `)
      .eq("project_id", projectId)
      .in("status", ["beschikbaar", "available", "Beschikbaar", "Available"]);

    if (propsError) {
      console.error("[UnitDescriptions] Properties fetch error:", propsError);
      return new Response(
        JSON.stringify({ error: "Kon woningen niet ophalen" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!properties || properties.length === 0) {
      return new Response(
        JSON.stringify({ error: "Geen woningen gevonden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group by property_type + bedrooms
    const typeGroups = new Map<string, typeof properties>();
    for (const prop of properties) {
      const key = `${(prop.property_type || "apartment").toLowerCase()}_${prop.bedrooms || 2}bed`;
      if (!typeGroups.has(key)) {
        typeGroups.set(key, []);
      }
      typeGroups.get(key)!.push(prop);
    }

    // Build spec list per type (use first property as representative)
    const typeSpecs: UnitTypeSpec[] = [];
    for (const [key, group] of typeGroups) {
      const rep = group[0];
      const pt = (rep.property_type || "").toLowerCase();

      let label: string;
      if (pt.includes("penthouse") || pt.includes("atico") || pt.includes("ático")) {
        label = "Penthouse";
      } else if (pt.includes("ground") || pt.includes("baja") || pt.includes("planta baja")) {
        label = "Begane grond appartement";
      } else if (pt.includes("villa")) {
        label = "Villa";
      } else if (pt.includes("townhouse") || pt.includes("adosado")) {
        label = "Herenhuis";
      } else {
        label = "Appartement";
      }

      typeSpecs.push({
        key,
        label: `${rep.bedrooms}-slaapkamer ${label}`,
        bedrooms: rep.bedrooms || 2,
        areaSqm: rep.area_sqm || 0,
        terraceSqm: rep.terrace_area_sqm || 0,
        floor: rep.floor || "onbekend",
        solarium: !!rep.solarium,
        garden: !!rep.garden,
        plotSizeSqm: rep.plot_size_sqm,
        seaViews: !!rep.sea_views,
        mountainViews: !!rep.mountain_views,
        poolViews: !!rep.pool_views,
        communalPool: !!rep.communal_pool,
        privatePool: !!rep.private_pool,
        elevator: !!rep.elevator,
        airconditioning: !!rep.airconditioning,
        parking: rep.parking,
        bathrooms: rep.bathrooms || 2,
        orientation: rep.orientation,
        price: rep.price || 0,
      });
    }

    console.log(`[UnitDescriptions] Found ${typeSpecs.length} unique types: ${typeSpecs.map(t => t.key).join(", ")}`);

    // Check for API key
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI API key niet geconfigureerd" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build context
    const projectContext = {
      name: project.display_title || project.name,
      location: [project.city, project.region].filter(Boolean).join(", "),
      types: typeSpecs.map(t => ({
        key: t.key,
        label: t.label,
        specs: {
          slaapkamers: t.bedrooms,
          badkamers: t.bathrooms,
          woonoppervlak: `${t.areaSqm} m²`,
          terras: `${t.terraceSqm} m²`,
          verdieping: t.floor,
          solarium: t.solarium ? "ja" : "nee",
          eigen_tuin: t.garden ? "ja" : "nee",
          tuin_oppervlak: t.plotSizeSqm ? `${t.plotSizeSqm} m²` : "nvt",
          zeezicht: t.seaViews ? "ja" : "nee",
          bergzicht: t.mountainViews ? "ja" : "nee",
          zwembadzicht: t.poolViews ? "ja" : "nee",
          gemeenschappelijk_zwembad: t.communalPool ? "ja" : "nee",
          prive_zwembad: t.privatePool ? "ja" : "nee",
          lift: t.elevator ? "ja" : "nee",
          airco: t.airconditioning ? "ja" : "nee",
          parkeerplaatsen: t.parking || 0,
          orientatie: t.orientation || "onbekend",
          vanafprijs: `€${t.price.toLocaleString("nl-NL")}`,
        },
      })),
    };

    // Build tool schema with dynamic type keys
    const typeProperties: Record<string, any> = {};
    for (const spec of typeSpecs) {
      typeProperties[spec.key] = {
        type: "object",
        properties: {
          intro: { type: "string", description: "60-80 woorden beschrijving" },
          highlights: {
            type: "array",
            items: { type: "string" },
            description: "3-4 onderscheidende kenmerken",
          },
          livingAdvantage: { type: "string", description: "1 warme zin over het woongevoel" },
        },
        required: ["intro", "highlights", "livingAdvantage"],
        additionalProperties: false,
      };
    }

    console.log(`[UnitDescriptions] Calling AI (gemini-2.5-flash) ...`);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: UNIT_DESCRIPTION_PROMPT },
          {
            role: "user",
            content: `Genereer beschrijvingen voor de woningtypes in dit project:\n\n${JSON.stringify(projectContext, null, 2)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_unit_descriptions",
              description: "Save the generated unit type descriptions",
              parameters: {
                type: "object",
                properties: typeProperties,
                required: typeSpecs.map(t => t.key),
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_unit_descriptions" } },
      }),
    });

    console.log(`[UnitDescriptions] AI responded: ${aiResponse.status} in ${Date.now() - startTime}ms`);

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit bereikt" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits op" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("[UnitDescriptions] AI error:", errorText.substring(0, 500));
      return new Response(
        JSON.stringify({ error: "AI fout" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("[UnitDescriptions] No tool call in response");
      return new Response(
        JSON.stringify({ error: "Onverwacht AI response formaat" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let descriptions: Record<string, any>;
    try {
      descriptions = JSON.parse(toolCall.function.arguments);
    } catch (parseError) {
      console.error("[UnitDescriptions] Parse error:", parseError);
      return new Response(
        JSON.stringify({ error: "Kon AI response niet verwerken" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[UnitDescriptions] Parsed ${Object.keys(descriptions).length} type descriptions`);

    // Save to database
    const { error: updateError } = await supabase
      .from("projects")
      .update({ ai_unit_descriptions: descriptions })
      .eq("id", projectId);

    if (updateError) {
      console.error("[UnitDescriptions] Save error:", updateError);
    } else {
      console.log("[UnitDescriptions] Saved successfully");
    }

    console.log(`[UnitDescriptions] Complete in ${Date.now() - startTime}ms`);

    return new Response(
      JSON.stringify({ descriptions, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[UnitDescriptions] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
