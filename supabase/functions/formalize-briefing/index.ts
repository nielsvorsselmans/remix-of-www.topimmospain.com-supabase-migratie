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
        analystContextDraft: {
          type: "string",
          description: "Rich CEO memo with subtle details, warnings, golden nuggets. Write as if briefing a senior copywriter."
        },
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
- Angle 3 (optioneel maar sterk aanbevolen): Hybride of unieke invalshoek (voor BOTH)

Per angle geef je:
- Een pakkende titel (bv. "Schaarste & Bewezen Succes")
- 2-3 zinnen uitleg: Waarom werkt dit? Welke pijn/verlangen raakt het?
- Voor welke doelgroep past dit het beste?
- Een voorgestelde hook/opening

### 2. Analyst Context Draft (De Nuance) - CRUCIAAL
Schrijf een uitgebreide "CEO Memo" (minimaal 150 woorden) met:
- De echte sterke punten (geen marketing fluff)
- Waarschuwingen of nuances (bv. "de prijs lijkt hoog maar omvat een gemeubileerde villa")
- "Golden Nuggets" die de Writer absoluut moet verwerken
- Concrete suggesties voor de copy en tone-of-voice
- Context over de doelgroep en wat hen aanspreekt
- Dit veld wordt door de gebruiker bewerkt en integraal naar de Writer gestuurd

### 3. Specs Checklist (Ondersteuning)
Categoriseer de feiten (minimaal 6, maximaal 10):
- SCARCITY: "Nog maar 3 units beschikbaar", "Fase 3 (bewezen track record)"
- FINANCIAL: "Vanaf €189k", "8% verhuurrendement verwacht", "Prijsstijging van 12% t.o.v. fase 1"
- LIFESTYLE: "Zwembad op dak", "Grote terrassen (25m²+)", "Eigen wellness"
- LOCATION: "5 min lopen naar strand", "Bij golfbaan", "Rustige wijk"

## STEM & TOON:
- Je bent de Senior Property Curator: enthousiast maar niet schreeuwerig
- "Show, Don't Tell": Zeg niet "luxe" maar "vloerverwarming en Italiaans marmer"
- Geen holle clichés: vertaal "droomparadijs" naar concrete features

## REGELS:
1. Mystery Location: Noem NOOIT de stadsnaam, schets de setting sfeervol
2. Anti-Fluff: Geen "droom", "paradijs", "uniek" - alleen feiten
3. Angle Diversiteit: De 3 angles moeten écht verschillend zijn, niet variaties op hetzelfde thema
4. Context Rijkheid: De analyst_context_draft moet rijk genoeg zijn (150+ woorden) om de Writer te voeden
5. Genereer altijd 3 angles tenzij het project echt geen derde invalshoek rechtvaardigt

Genereer de output via de return_analysis functie.`;

// Timeout helper with AbortController
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 45000
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

// Helper to call formalizer with configurable model
async function callFormalizer(
  prompt: string,
  context: string,
  insights: string,
  apiKey: string,
  model: string = "google/gemini-2.5-flash",
  timeoutMs: number = 45000
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    const response = await fetchWithTimeout(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: `PROJECTDATA:\n${context}\n\n---\n\nSTRATEGISCHE ANALYSE:\n${insights}\n\n---\n\nGenereer de briefing.` }
          ],
          tools: [ANALYSIS_TOOL],
          tool_choice: { type: "function", function: { name: "return_analysis" } }
        }),
      },
      timeoutMs
    );
    
    if (!response.ok) {
      return { success: false, error: `API error: ${response.status}` };
    }
    
    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall || toolCall.function.name !== "return_analysis") {
      return { success: false, error: "Geen geldige tool response" };
    }
    
    try {
      const result = JSON.parse(toolCall.function.arguments);
      return { success: true, result };
    } catch (parseError) {
      console.error("[Formalize] JSON parse error:", toolCall.function.arguments?.substring(0, 500));
      return { success: false, error: "AI output kon niet worden geparsed" };
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { success: false, error: `Timeout na ${timeoutMs / 1000} seconden` };
    }
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
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

  try {
    const { projectId, analysisId, brainstormInsights } = await req.json();

    if (!projectId || !brainstormInsights) {
      return new Response(
        JSON.stringify({ error: "projectId en brainstormInsights zijn verplicht" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Formalize] Starting for project: ${projectId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch project data for context
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name, city, region, description, status, completion_date, price_from, price_to, property_types, highlights, is_resale")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      console.error("[Formalize] Project fetch error:", projectError);
      return new Response(
        JSON.stringify({ error: "Project niet gevonden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch associated properties - reduced for speed
    const { data: properties } = await supabase
      .from("properties")
      .select("id, bedrooms, bathrooms, area_sqm, terrace_area_sqm, plot_size_sqm, property_type, price, status")
      .eq("project_id", projectId)
      .limit(10);

    const projectData = project as ProjectData;
    const propertiesData = (properties || []) as PropertyData[];

    console.log(`[Formalize] Data fetched in ${Date.now() - startTime}ms`);

    // Fetch formalizer prompt and model
    const { data: promptData } = await supabase
      .from("ai_prompts")
      .select("prompt_text, model_id")
      .eq("prompt_key", "project_briefing_formalizer")
      .single();

    const formalizerPrompt = promptData?.prompt_text || DEFAULT_FORMALIZER_PROMPT;
    const formalizerModel = promptData?.model_id || "google/gemini-2.5-flash";

    const projectContext = JSON.stringify({
      project: projectData,
      properties: propertiesData,
    }, null, 2);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Run formalization with configured model
    console.log(`[Formalize] Calling Formalizer (${formalizerModel})...`);
    
    const formalizeResult = await callFormalizer(
      formalizerPrompt,
      projectContext,
      brainstormInsights,
      LOVABLE_API_KEY,
      formalizerModel
    );

    if (!formalizeResult.success) {
      console.error("[Formalize] Formalizer failed:", formalizeResult.error);
      return new Response(
        JSON.stringify({ error: formalizeResult.error || "Formalisatie mislukt" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const analysis = formalizeResult.result;
    console.log(`[Formalize] Analysis complete in ${Date.now() - startTime}ms`);

    // Update the analysis record with formalized result
    if (analysisId) {
      const { error: updateError } = await supabase
        .from("project_briefing_analyses")
        .update({
          brainstorm_edited: brainstormInsights,
          brainstorm_approved_at: new Date().toISOString(),
          formalized_result: analysis,
          status: "formalized",
          updated_at: new Date().toISOString(),
        })
        .eq("id", analysisId);
      
      if (updateError) {
        console.error("[Formalize] Update analysis error:", updateError);
      }
    }

    return new Response(
      JSON.stringify({
        ...analysis,
        _brainstormInsights: brainstormInsights
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Formalize] Error after ${Date.now() - startTime}ms:`, error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
