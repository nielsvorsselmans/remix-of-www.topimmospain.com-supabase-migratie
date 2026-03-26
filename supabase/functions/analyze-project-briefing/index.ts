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
}

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
  features: string[] | null;
}

const ANALYSIS_TOOL = {
  type: "function",
  function: {
    name: "return_analysis",
    description: "Return the strategic analysis of the project for social media briefing",
    parameters: {
      type: "object",
      properties: {
        projectNameInternal: {
          type: "string",
          description: "Internal project reference name"
        },
        // LAYER 1: STRATEGIC ANGLES (The Choice)
        strategicAngles: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "Unique ID (angle_1, angle_2, etc.)" },
              title: { type: "string", description: "Short catchy title (e.g., 'Schaarste & Bewezen Succes')" },
              description: { type: "string", description: "2 sentences: Why does this angle work? What pain/desire does it touch?" },
              targetAudienceFit: { 
                type: "string", 
                enum: ["INVESTOR", "LIFESTYLE", "BOTH"],
                description: "Which audience fits best"
              },
              suggestedHook: { type: "string", description: "Suggested opening sentence for this angle" }
            },
            required: ["id", "title", "description", "targetAudienceFit"]
          },
          description: "2-3 fundamentally different strategic angles"
        },
        // LAYER 2: ANALYST NOTES (The Nuance)
        analystContextDraft: {
          type: "string",
          description: "Rich CEO memo with subtle details, warnings, golden nuggets. Write as if briefing a senior copywriter."
        },
        // LAYER 3: SPECS CHECKLIST (Evidence)
        specsChecklist: {
          type: "array",
          items: {
            type: "object",
            properties: {
              text: { type: "string", description: "The spec/fact in Dutch" },
              selected: { type: "boolean", description: "Whether to pre-select this spec" },
              category: { 
                type: "string", 
                enum: ["SCARCITY", "FINANCIAL", "LIFESTYLE", "LOCATION"],
                description: "Category of this spec"
              }
            },
            required: ["text", "selected", "category"]
          },
          description: "4-8 factual specs with categories"
        },
        locationMysteryHint: {
          type: "string",
          description: "A mystery location hint WITHOUT the city name (in Dutch)"
        },
        suggestedCTAs: {
          type: "array",
          items: { type: "string" },
          description: "3-5 short CTA keywords (max 10 characters each)"
        }
      },
      required: [
        "strategicAngles",
        "analystContextDraft",
        "specsChecklist",
        "locationMysteryHint",
        "suggestedCTAs"
      ]
    }
  }
};

const DEFAULT_BRAINSTORMER_PROMPT = `Jij bent een Real Estate Strateeg gespecialiseerd in Spaans vastgoed voor Top Immo Spain.
Lees deze projectdata. Ik heb nog geen strakke output nodig, ik wil dat je DIEP nadenkt.

ANALYSEER KRITISCH:
1. Wat is de 'Oneerlijke Voorsprong' van dit project? (prijs, locatie, schaarste, timing?)
2. Welke specs zijn écht relevant en opvallend?
3. Welke marketing fluff moeten we negeren?
4. Strategische positionering: Pre-launch, Key-ready, of Resale?
5. Welke invalshoek zou een investeerder/genieter triggeren?

Geef een beknopte maar kritische analyse in vrije tekst.`;

const DEFAULT_FORMALIZER_PROMPT = `Jij bent de Senior Strateeg voor Top Immo Spain.
Vertaal de brainstorm naar een gestructureerde briefing met KEUZES.

## JOUW DOEL:
Geef de gebruiker de keuze uit 2-3 fundamenteel verschillende strategische invalshoeken (Angles) 
en bereid een diepgaande context-tekst voor.

## OUTPUT STRUCTUUR:

### 1. Strategic Angles (De Keuze)
Definieer 2-3 VERSCHILLENDE manieren om dit project te positioneren:
- Angle 1: Focus op schaarste/timing/financieel (voor de INVESTOR)
- Angle 2: Focus op lifestyle/genieten/beleving (voor de LIFESTYLE)
- Angle 3 (optioneel): Hybride of unieke invalshoek (voor BOTH)

Per angle geef je:
- Een pakkende titel (bv. "Schaarste & Bewezen Succes")
- 2 zinnen uitleg: Waarom werkt dit? Welke pijn/verlangen raakt het?
- Voor welke doelgroep past dit het beste?
- Een voorgestelde hook/opening

### 2. Analyst Context Draft (De Nuance)
Schrijf een "CEO Memo" met:
- De echte sterke punten (geen marketing)
- Waarschuwingen of nuances (bv. "de prijs lijkt hoog maar is voor de villa")
- "Golden Nuggets" die de Writer moet verwerken
- Concrete suggesties voor de copy
- Dit veld wordt door de gebruiker bewerkt en integraal naar de Writer gestuurd

### 3. Specs Checklist (Ondersteuning)
Categoriseer de feiten:
- SCARCITY: "Nog maar 3 units beschikbaar", "Fase 3 (bewezen)"
- FINANCIAL: "Vanaf €189k", "8% verhuurrendement verwacht"
- LIFESTYLE: "Zwembad op dak", "Grote terrassen (25m²+)"
- LOCATION: "5 min lopen naar strand", "Bij golfbaan"

## REGELS:
1. Mystery Location: Noem NOOIT de stadsnaam
2. Anti-Fluff: Geen "droom", "paradijs", "uniek" - alleen feiten
3. Angle Diversiteit: De angles moeten écht verschillend zijn, niet variaties op hetzelfde thema
4. Context Rijkheid: De analyst_context_draft moet rijk genoeg zijn om de Writer te voeden

Genereer de output via de return_analysis functie.`;

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

  try {
    const { projectId } = await req.json();

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "projectId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Dual-Core Analysis] Starting for project: ${projectId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch project data
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name, city, region, description, status, completion_date, price_from, price_to, property_types, highlights, is_resale")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      console.error("Project fetch error:", projectError);
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch associated properties
    const { data: properties, error: propertiesError } = await supabase
      .from("properties")
      .select("id, bedrooms, bathrooms, area_sqm, terrace_area_sqm, plot_size_sqm, property_type, price, status, features")
      .eq("project_id", projectId)
      .limit(20);

    if (propertiesError) {
      console.error("Properties fetch error:", propertiesError);
    }

    const projectData = project as ProjectData;
    const propertiesData = (properties || []) as PropertyData[];

    // Fetch prompts from database
    const { data: promptsData } = await supabase
      .from("ai_prompts")
      .select("prompt_key, prompt_text")
      .in("prompt_key", ["project_briefing_brainstormer", "project_briefing_formalizer"]);

    const promptsMap = new Map(promptsData?.map(p => [p.prompt_key, p.prompt_text]) || []);
    const brainstormerPrompt = promptsMap.get("project_briefing_brainstormer") || DEFAULT_BRAINSTORMER_PROMPT;
    const formalizerPrompt = promptsMap.get("project_briefing_formalizer") || DEFAULT_FORMALIZER_PROMPT;

    // Prepare context
    const projectContext = JSON.stringify({
      project: projectData,
      properties: propertiesData,
    }, null, 2);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // ============================================
    // STAP 1: BRAINSTORMER (Gemini 2.5 Pro - Creatief)
    // ============================================
    console.log("[Dual-Core] Step 1: Calling Brainstormer (Gemini 2.5 Pro)...");
    
    const brainstormResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: brainstormerPrompt },
          { role: "user", content: `Analyseer dit project en geef je strategische inzichten:\n\n${projectContext}` }
        ]
        // No tools - free text output
      }),
    });

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
      console.error("[Dual-Core] Brainstormer error:", brainstormResponse.status, errorText);
      throw new Error(`Brainstormer AI error: ${brainstormResponse.status}`);
    }

    const brainstormData = await brainstormResponse.json();
    const brainstormInsights = brainstormData.choices?.[0]?.message?.content || "";
    
    console.log("[Dual-Core] Brainstorm insights received:", brainstormInsights.substring(0, 200) + "...");

    // ============================================
    // STAP 2: FORMALIZER (GPT-5-mini - Strikt JSON)
    // ============================================
    console.log("[Dual-Core] Step 2: Calling Formalizer (GPT-5-mini)...");

    const formalizeResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: formalizerPrompt },
          { 
            role: "user", 
            content: `PROJECTDATA:\n${projectContext}\n\n---\n\nSTRATEGISCHE ANALYSE VAN DE BRAINSTORMER:\n${brainstormInsights}\n\n---\n\nGenereer nu de gestructureerde briefing output.` 
          }
        ],
        tools: [ANALYSIS_TOOL],
        tool_choice: { type: "function", function: { name: "return_analysis" } }
      }),
    });

    if (!formalizeResponse.ok) {
      if (formalizeResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit bereikt, probeer het later opnieuw" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (formalizeResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits op, voeg credits toe aan je workspace" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await formalizeResponse.text();
      console.error("[Dual-Core] Formalizer error:", formalizeResponse.status, errorText);
      throw new Error(`Formalizer AI error: ${formalizeResponse.status}`);
    }

    const formalizeData = await formalizeResponse.json();
    
    // Extract the tool call result
    const toolCall = formalizeData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "return_analysis") {
      console.error("[Dual-Core] Unexpected Formalizer response:", JSON.stringify(formalizeData));
      throw new Error("Unexpected Formalizer response format");
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    console.log("[Dual-Core] Analysis complete!");

    // Return analysis with brainstorm insights for transparency
    return new Response(
      JSON.stringify({
        ...analysis,
        _brainstormInsights: brainstormInsights
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Dual-Core] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
