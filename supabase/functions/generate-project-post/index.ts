import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// New strategic briefing input interface
interface StrategicBriefingInput {
  selectedAngle: {
    id: string;
    title: string;
    description: string;
    targetAudienceFit: "INVESTOR" | "LIFESTYLE" | "BOTH";
    suggestedHook?: string;
  };
  userContextNotes: string;
  selectedSpecs: string[];
  locationHint: string;
  ctaKeyword: string;
}

interface PostRequest {
  projectId: string;
  briefing: StrategicBriefingInput;
  brainstormInsights?: string;
  platform?: "linkedin" | "facebook" | "instagram";
}

const DEFAULT_WRITER_PROMPT = `Je bent een LinkedIn copywriter gespecialiseerd in vastgoedinvesteringen in Spanje.
Je schrijft voor Top Immo Spain - een professioneel bureau dat Nederlandstalige investeerders begeleidt.

STIJLREGELS:
1. Korte zinnen. Veel witregels. Makkelijk scanbaar.
2. NOOIT "droom", "paradijs", "uniek", "prachtig" gebruiken - alleen concrete feiten
3. GEEN makelaarstaal of buzzwords
4. Focus op de gekozen strategische angle
5. De locatie NOOIT bij naam noemen - gebruik de mystery hint
6. Schrijf in het Nederlands

STRUCTUUR:
- Hook: Pak de aandacht met een bold statement of vraag (max 1-2 zinnen)
- Body: 3-5 korte paragrafen die de strategie uitwerken
- CTA: Volg de SMART CTA LOGICA hieronder

---

SMART CTA LOGICA:

Wij hebben van elk project de volgende ASSETS beschikbaar:
1. Plannen & Indelingen
2. Foto's & Renders (soms video/drone)
3. Rendementsprognose (gebaseerd op vergelijkbare panden)
4. Kostenoverzicht (aankoopkosten + jaarlijkse kosten)
5. Fiscale Impact (Box 3 berekening)
6. Financieringsmogelijkheden

JOUW OPDRACHT:
Kies de assets die logisch aansluiten bij de 'Angle' van je post.

SCENARIO 1: INVESTEERDERS POST (targetAudienceFit = "INVESTOR")
Bied aan: "De volledige investeringsfiche inclusief huurprognoses, kostenplaatje en Box 3 impact."
Voorbeeld CTA formules:
- "Wil je de harde cijfers zien? Reageer met '{triggerWord}' en ik stuur je de prognose en het kostenoverzicht privé."
- "Benieuwd naar het rendement van vergelijkbare appartementen hier? Reageer '{triggerWord}' en je krijgt de cijfers."

SCENARIO 2: LIFESTYLE POST (targetAudienceFit = "LIFESTYLE")
Bied aan: "Alle foto's, de plattegronden en de video van het showhouse."
Voorbeeld CTA formules:
- "Benieuwd of jouw meubels hier passen? Reageer met '{triggerWord}' en ik stuur je de plannen en de videotour."
- "Wil je zien hoe het eruit ziet? Reageer '{triggerWord}' voor de foto's en plattegronden."

SCENARIO 3: HYBRIDE POST (targetAudienceFit = "BOTH")
Bied aan: "Het complete dossier: van plannen tot rendement."
Voorbeeld CTA formules:
- "Wil je de foto's, plannen én de verhuurprognose van de buren zien? Reageer '{triggerWord}' en je ontvangt het dossier."
- "Benieuwd naar het volledige plaatje? Reageer '{triggerWord}' en ik stuur je alles: plannen, cijfers én de videotour."

BELANGRIJKE CTA REGELS:
1. LAGE DREMPEL: Gebruik "Ik stuur het privé" of "je ontvangt het in DM"
2. SPECIFIEK: "Rendement van gelijkaardige appartementen" klinkt geloofwaardiger dan "Gegarandeerd rendement"
3. EINDIG MET VRAAG: Altijd een concrete vraag, niet een statement
4. GEBRUIK TRIGGER WORD: Verwijs naar het exacte triggerword uit de briefing

---

BELANGRIJK:
Je hebt een STRATEGISCHE BRIEFING ontvangen. Dit is geen vrijblijvend advies - volg de gekozen strategie nauwgezet.`;

const POST_TOOL = {
  type: "function",
  function: {
    name: "return_posts",
    description: "Return two post variations with hook, body, CTA, and trigger word",
    parameters: {
      type: "object",
      properties: {
        variation1: {
          type: "object",
          properties: {
            hook: { type: "string", description: "Attention-grabbing opening (1-2 sentences)" },
            body: { type: "string", description: "Main content following the strategy (3-5 short paragraphs)" },
            cta: { type: "string", description: "Specifieke CTA die past bij de doelgroep. Noem concrete assets (plannen/cijfers/foto's). Lage drempel, eindigt met vraag, bevat trigger word." },
            triggerWord: { type: "string", description: "The keyword people should comment" },
          },
          required: ["hook", "body", "cta", "triggerWord"],
        },
        variation2: {
          type: "object",
          properties: {
            hook: { type: "string", description: "Attention-grabbing opening (1-2 sentences)" },
            body: { type: "string", description: "Main content following the strategy (3-5 short paragraphs)" },
            cta: { type: "string", description: "Specifieke CTA die past bij de doelgroep. Noem concrete assets (plannen/cijfers/foto's). Lage drempel, eindigt met vraag, bevat trigger word." },
            triggerWord: { type: "string", description: "The keyword people should comment" },
          },
          required: ["hook", "body", "cta", "triggerWord"],
        },
      },
      required: ["variation1", "variation2"],
    },
  },
};

serve(async (req) => {
  // Handle CORS
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
    const { projectId, briefing, brainstormInsights, platform = "linkedin" } = await req.json() as PostRequest;

    if (!projectId || !briefing) {
      return new Response(
        JSON.stringify({ error: "projectId and briefing are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch project data
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("name, city, description, featured_image, price_from, price_to, status")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      console.error("Project fetch error:", projectError);
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch custom prompt and model if exists
    const { data: promptData } = await supabase
      .from("ai_prompts")
      .select("prompt_text, model_id")
      .eq("prompt_key", "project_post_writer")
      .single();

    const writerPrompt = promptData?.prompt_text || DEFAULT_WRITER_PROMPT;
    const writerModel = promptData?.model_id || "google/gemini-3-flash-preview";

    // Build the strategic user prompt
    const audienceLabels: Record<string, string> = {
      INVESTOR: "Investeerder - Focus op cijfers, rendement en verhuur",
      LIFESTYLE: "Genieter - Focus op levensstijl, zon en beleving",
      BOTH: "Beide doelgroepen - Hybride aanpak",
    };

    const userPrompt = `
## PROJECT INFO
- Naam: ${project.name}
- Prijsrange: €${project.price_from?.toLocaleString("nl-NL") || "?"} - €${project.price_to?.toLocaleString("nl-NL") || "?"}

## BESCHIKBARE ASSETS (voor CTA)
Dit project heeft de volgende materialen beschikbaar om te delen:
- Plattegronden en indelingen
- Foto's en renders${project.featured_image ? " (inclusief hoofdfoto)" : ""}
- Rendementsprognose op basis van vergelijkbare panden
- Volledig kostenoverzicht (aankoop + jaarlijks)
- Box 3 / fiscale impact berekening
- Financieringsopties via Spaanse hypotheek

→ Kies de assets die passen bij de doelgroep van deze post.

---

## STRATEGISCHE BRIEFING (gevalideerd door de gebruiker)

### 1. LEIDRAAD (De gekozen strategie)
**Titel:** ${briefing.selectedAngle.title}
**Beschrijving:** ${briefing.selectedAngle.description}
**Doelgroep:** ${audienceLabels[briefing.selectedAngle.targetAudienceFit]}
${briefing.selectedAngle.suggestedHook ? `**Voorgestelde hook:** "${briefing.selectedAngle.suggestedHook}"` : ""}

→ Dit is je RODE DRAAD. Elk element van de post moet hierop aansluiten.

### 2. CONTEXT NOTES (De nuance van de gebruiker)
${briefing.userContextNotes}

→ Dit bevat de subtiele details, waarschuwingen en "Golden Nuggets".
  Verwerk deze inzichten in de body copy. Dit is HEILIG.

### 3. ONDERBOUWING (De feiten)
${briefing.selectedSpecs.length > 0 ? briefing.selectedSpecs.map(s => `- ${s}`).join("\n") : "- Geen specs geselecteerd"}

→ Gebruik deze als bulletpoints of concrete bewijzen.

### 4. MYSTERY LOCATION
"${briefing.locationHint}"

→ Gebruik dit in plaats van de stadsnaam "${project.city}". NOEM NOOIT de stad!

### 5. CTA TRIGGER WORD
"${briefing.ctaKeyword}"

→ Dit is wat mensen moeten reageren voor meer info.

---

${brainstormInsights ? `## EXTRA CONTEXT (Strategische analyse van de AI Analist)
${brainstormInsights}

---` : ""}

## OPDRACHT
Schrijf 2 verschillende LinkedIn post variaties die de gekozen strategie volgen:
- **Variatie 1:** Meer directe, assertieve approach
- **Variatie 2:** Meer storytelling, emotionele approach

Beide variaties moeten:
1. De gekozen strategie "${briefing.selectedAngle.title}" als rode draad hebben
2. De context notes verwerken (deze zijn heilig!)
3. De mystery location gebruiken (noem NIET "${project.city}")
4. Eindigen met een CTA die vraagt om "${briefing.ctaKeyword}" te reageren

Platform: ${platform}
    `.trim();

    // Call AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log("Generating posts with strategic briefing:", {
      projectName: project.name,
      angleTitle: briefing.selectedAngle.title,
      audienceFit: briefing.selectedAngle.targetAudienceFit,
      specsCount: briefing.selectedSpecs.length,
      ctaKeyword: briefing.ctaKeyword,
    });

    console.log(`[Writer] Using model: ${writerModel}`);
    
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: writerModel,
        messages: [
          { role: "system", content: writerPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [POST_TOOL],
        tool_choice: { type: "function", function: { name: "return_posts" } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI response received");

    // Extract tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "return_posts") {
      console.error("Unexpected AI response format:", aiData);
      throw new Error("AI did not return expected post format");
    }

    const posts = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({
        ...posts,
        project: {
          name: project.name,
          city: project.city,
          featuredImage: project.featured_image,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating post:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
