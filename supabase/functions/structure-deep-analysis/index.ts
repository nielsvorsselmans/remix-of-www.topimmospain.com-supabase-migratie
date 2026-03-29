import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tool definition for structured output
const STRUCTURE_TOOL = {
  type: "function",
  function: {
    name: "structure_analysis",
    description: "Return the structured analysis for website display",
    parameters: {
      type: "object",
      properties: {
        heroContent: {
          type: "object",
          properties: {
            marketingTitle: { 
              type: "string", 
              description: "Krachtige marketing titel voor hero (max 6 woorden, NIET 'Diverse woningen in...')" 
            },
            subtitle: { 
              type: "string", 
              description: "Korte ondertitel met belangrijkste USP (max 12 woorden)" 
            },
            personaSectionTitle: { 
              type: "string", 
              description: "Titel voor persona sectie (bijv. 'Jouw leven in [Projectnaam]')" 
            },
            personaSectionSubtitle: { 
              type: "string", 
              description: "Subtitel die nodigt tot ontdekken (1 zin)" 
            }
          },
          required: ["marketingTitle", "subtitle", "personaSectionTitle", "personaSectionSubtitle"]
        },
        personas: {
          type: "object",
          properties: {
            vakantie: {
              type: "object",
              properties: {
                title: { type: "string", description: "Title for vacation persona" },
                description: { type: "string", description: "2-3 sentences about vacation use" },
                highlights: { 
                  type: "array", 
                  items: { type: "string" },
                  description: "4-5 concrete highlights for vacation buyers"
                }
              },
              required: ["title", "description", "highlights"]
            },
            investering: {
              type: "object",
              properties: {
                title: { type: "string", description: "Title for investment persona" },
                description: { type: "string", description: "2-3 sentences about investment potential" },
                highlights: { 
                  type: "array", 
                  items: { type: "string" },
                  description: "4-5 financial/yield highlights"
                },
                estimatedYield: { type: "string", description: "Expected yield range (e.g., '6-8%')" },
                yieldNote: { type: "string", description: "Brief explanation of yield estimate" }
              },
              required: ["title", "description", "highlights", "estimatedYield", "yieldNote"]
            },
            wonen: {
              type: "object",
              properties: {
                title: { type: "string", description: "Title for permanent living persona" },
                description: { type: "string", description: "2-3 sentences about daily living" },
                highlights: { 
                  type: "array", 
                  items: { type: "string" },
                  description: "4-5 practical highlights for permanent residents"
                }
              },
              required: ["title", "description", "highlights"]
            }
          },
          required: ["vakantie", "investering", "wonen"]
        },
        unfairAdvantage: {
          type: "object",
          properties: {
            headline: { type: "string", description: "One powerful sentence USP" },
            details: { 
              type: "array", 
              items: { type: "string" },
              description: "2-3 supporting bullet points"
            }
          },
          required: ["headline", "details"]
        },
        goldenNuggets: {
          type: "array",
          items: { type: "string" },
          description: "5 unieke, klantgerichte voordelen geschreven in tweede persoon (U/Je). Focus op wat de koper eraan heeft, niet interne feiten."
        },
        warnings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              text: { type: "string", description: "Klantgerichte tekst over dit aandachtspunt, geschreven voor de potentiële koper" },
              severity: { 
                type: "string", 
                enum: ["info", "warning"],
                description: "info = goed om te weten, warning = beïnvloedt uw beslissing"
              }
            },
            required: ["text", "severity"]
          },
          description: "Transparante, eerlijke informatie voor de potentiële koper"
        },
        audienceScores: {
          type: "object",
          properties: {
            investor: { type: "string", enum: ["hoog", "medium", "laag"] },
            holidaymaker: { type: "string", enum: ["hoog", "medium", "laag"] },
            permanent: { type: "string", enum: ["hoog", "medium", "laag"] }
          },
          required: ["investor", "holidaymaker", "permanent"]
        }
      },
      required: ["heroContent", "personas", "unfairAdvantage", "goldenNuggets", "warnings", "audienceScores"]
    }
  }
};

const DEFAULT_STRUCTURER_PROMPT = `Jij bent een Content Structureerder voor Top Immo Spain.

Je krijgt een strategische analyse (brainstorm) van een vastgoedproject en moet deze omzetten naar gestructureerde JSON voor de website.

## JOUW DOEL:
Extraheer de belangrijkste inzichten en structureer ze voor de detailpagina componenten.

## OUTPUT STRUCTUUR:

### 1. Hero Content (voor de pagina header)

**marketingTitle**: Krachtige, korte titel (max 6 woorden)
- VERBODEN: "Diverse woningen in..." of alleen de locatie herhalen
- WEL: Een concept/merkgevoel zoals "Mar Menor Residence" of "Costa Gardens Resort"
- Gebruik de projectnaam als die sterk is, anders verzin een passende naam
- Moet pakkend en memorabel zijn

**subtitle**: 1 zin met de kernbelofte (max 12 woorden)
- Focus op wat dit project UNIEK maakt
- Bijv: "Moderne appartementen direct aan de Mar Menor" of "Luxe golf-living met zeezicht"

**personaSectionTitle**: Titel voor de lifestyle sectie
- Persoonlijk en uitnodigend: "Jouw leven in Mar Menor Residence"

**personaSectionSubtitle**: Korte zin die nodigt tot verkennen
- Bijv: "Ontdek welke levensstijl het beste bij jou past"

### 2. Personas (voor PersonaSwitcher component)
Maak voor ELKE persona content die specifiek is voor DIT project:

**Vakantie persona:**
- Title: "[Projectnaam] als vakantiewoning"
- Description: 2-3 zinnen waarom dit project perfect is voor vakantiebezoekers
- Highlights: 4-5 concrete, project-specifieke voordelen

**Investering persona:**
- Title: "[Projectnaam] als investering"  
- Description: 2-3 zinnen over het investeringspotentieel
- Highlights: 4-5 financiële/rendement highlights
- EstimatedYield: Geschat verhuurrendement ("X-Y%")
- YieldNote: 1 zin uitleg

**Wonen persona:**
- Title: "Permanent wonen in [Projectnaam]"
- Description: 2-3 zinnen over dagelijks leven
- Highlights: 4-5 praktische voordelen

### 3. Unfair Advantage
- Headline: 1 krachtige zin
- Details: 2-3 bullets

### 4. Golden Nuggets (voor potentiële kopers)
5 unieke, concrete feiten die een potentiële koper direct aanspreken.
- Schrijf in de TWEEDE PERSOON ("U geniet van..." of "Je hebt toegang tot...")
- Focus op VOORDELEN voor de koper, niet technische kenmerken
- Wees concreet en specifiek (afstanden, aantallen, etc.)
- Voorbeelden:
  ✓ "Het strand ligt op 500 meter loopafstand van uw woning"
  ✓ "U beschikt over 3 communale zwembaden en een fitnessruimte"
  ✗ "Goede ligging nabij strand" (te vaag)
  ✗ "High rental potential" (intern, niet klantgericht)

### 5. Waarschuwingen (voor potentiële kopers)
Eerlijke, transparante informatie die de klant helpt een weloverwogen beslissing te maken.
- Schrijf vanuit het perspectief van de koper
- Gebruik neutrale, niet-alarmerende taal
- Severity "info": Praktische informatie die goed is om te weten
  Voorbeeld: "Het project is nog in aanbouw, oplevering verwacht in Q4 2026"
- Severity "warning": Aandachtspunten die invloed kunnen hebben op uw beslissing
  Voorbeeld: "De dichtstbijzijnde supermarkt ligt op 3 km, een auto is aan te raden"

### 6. Audience Scores
Beoordeel geschiktheid: "hoog" | "medium" | "laag"

## REGELS:
1. Gebruik ALLEEN informatie uit de gegeven brainstorm
2. Wees specifiek, geen vage beschrijvingen
3. Yields alleen als rental data beschikbaar was
4. Waarschuwingen = eerlijke transparantie
5. Golden Nuggets moeten écht uniek zijn
6. Marketing titel moet PAKKEND zijn, niet generiek!

Genereer de output via de structure_analysis functie.`;

// Timeout helper
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

  const startTime = Date.now();

  try {
    const { projectId, brainstormText } = await req.json();

    if (!projectId || !brainstormText) {
      return new Response(
        JSON.stringify({ error: "projectId en brainstormText zijn verplicht" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Structure] Starting for project: ${projectId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch project name for context
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("name")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      console.error("[Structure] Project fetch error:", projectError);
      return new Response(
        JSON.stringify({ error: "Project niet gevonden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch structurer prompt
    const { data: promptData } = await supabase
      .from("ai_prompts")
      .select("prompt_text, model_id")
      .eq("prompt_key", "deep_analysis_structurer")
      .single();

    const structurerPrompt = promptData?.prompt_text || DEFAULT_STRUCTURER_PROMPT;
    const modelId = promptData?.model_id || "google/gemini-2.5-flash";

    console.log(`[Structure] Using model: ${modelId}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Call AI to structure the brainstorm
    const response = await fetchWithTimeout(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            { role: "system", content: structurerPrompt },
            { 
              role: "user", 
              content: `PROJECT: ${project.name}\n\n---\n\nDEEP ANALYSIS BRAINSTORM:\n${brainstormText}\n\n---\n\nStructureer deze analyse voor de website.` 
            }
          ],
          tools: [STRUCTURE_TOOL],
          tool_choice: { type: "function", function: { name: "structure_analysis" } }
        }),
      },
      45000
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit bereikt, probeer later opnieuw" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "API credits op, neem contact op met support" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("[Structure] AI error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI structurering mislukt" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== "structure_analysis") {
      console.error("[Structure] No valid tool response");
      return new Response(
        JSON.stringify({ error: "Geen geldige AI response" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let structuredData;
    try {
      structuredData = JSON.parse(toolCall.function.arguments);
    } catch (parseError) {
      console.error("[Structure] JSON parse error:", toolCall.function.arguments?.substring(0, 500));
      return new Response(
        JSON.stringify({ error: "AI output kon niet worden geparsed" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Structure] Analysis structured in ${Date.now() - startTime}ms`);

    // Save structured data to project
    const { error: updateError } = await supabase
      .from("projects")
      .update({
        deep_analysis_structured: structuredData,
      })
      .eq("id", projectId);

    if (updateError) {
      console.error("[Structure] Update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Kon gestructureerde data niet opslaan" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        structured: structuredData,
        processingTimeMs: Date.now() - startTime
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Structure] Error after ${Date.now() - startTime}ms:`, error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
