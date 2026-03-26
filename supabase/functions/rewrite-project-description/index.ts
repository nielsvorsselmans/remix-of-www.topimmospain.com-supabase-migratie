import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PersonaContent {
  title: string;
  description: string;
  highlights: string[];
  estimatedYield?: string;
}

interface AIRewrittenDescription {
  description: string;
  forWhom: string[];
  notForWhom: string[];
  keyFacts: string[];
  personas: {
    vakantie: PersonaContent;
    investering: PersonaContent & { estimatedYield: string };
    wonen: PersonaContent;
  };
}

const REWRITE_PROMPT = `Je bent een redacteur voor een vastgoedwebsite die duidelijke, eerlijke informatie geeft aan investeerders.

TAAK: Herschrijf de projectbeschrijving en genereer persona-specifieke content.

REGELS:
1. VERWIJDER alle superlatieve woorden: "prachtig", "schitterend", "uniek", "droomwoning", "paradijs", "oase", "juweel"
2. VERWIJDER alle overdreven beloftes en vage claims
3. SCHRIJF feitelijk en concreet - wat krijgt de koper precies?
4. GEBRUIK actieve zinnen
5. GEEN uitroeptekens
6. MAXIMAAL 120 woorden voor de beschrijving
7. Gebruik de locatie-informatie (afstanden tot strand, golf, etc.) in je teksten waar relevant

PERSONA RICHTLIJNEN:
- vakantie: Focus op ontspanning, locatie, strand, restaurants, klimaat. Schrijf vanuit "geniet van..."
- investering: Focus op rendement, verhuurpotentieel, kostenstructuur, marktpositie. Schrijf zakelijk en feitelijk.
- wonen: Focus op dagelijks leven, voorzieningen, ziekenhuizen, scholen, community. Schrijf vanuit "woon hier..."

Elke persona heeft:
- title: Korte titel (max 8 woorden)
- description: Beschrijving (max 80 woorden) specifiek voor die persona
- highlights: 5 bullet points relevant voor die persona

De investering persona heeft ook:
- estimatedYield: Geschat bruto rendement als string (bijv. "5-7%"). Baseer dit op de locatie en type vastgoed, wees conservatief.`;

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

    console.log(`[RewriteDescription] Starting for project: ${projectId}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch project with description, cached AI data, and location intelligence
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(`
        id, name, display_title, description, city, region,
        price_from, price_to, status, completion_date,
        property_types, highlights,
        ai_rewritten_description, ai_rewritten_at,
        location_intelligence, rewrite_status
      `)
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      console.error("[RewriteDescription] Project fetch error:", projectError);
      return new Response(
        JSON.stringify({ error: "Project niet gevonden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for cached AI description (with personas)
    const cachedDescription = project.ai_rewritten_description as AIRewrittenDescription | null;
    const cachedAt = project.ai_rewritten_at;

    // Return cached if exists, has personas, and not forcing refresh
    if (cachedDescription?.personas && !forceRefresh) {
      console.log(`[RewriteDescription] Returning cached description with personas (written: ${cachedAt})`);
      return new Response(
        JSON.stringify({
          aiDescription: cachedDescription,
          cached: true,
          rewrittenAt: cachedAt,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Race condition protection: check if another request is already rewriting
    if (project.rewrite_status === "in_progress" && !forceRefresh) {
      console.log("[RewriteDescription] Rewrite already in progress, skipping");
      return new Response(
        JSON.stringify({ 
          error: "Rewrite is al bezig",
          aiDescription: cachedDescription,
          cached: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for original description
    if (!project.description) {
      console.log("[RewriteDescription] No description available — skipping gracefully (V3 fallback)");
      return new Response(
        JSON.stringify({ aiDescription: null, cached: false, skipped: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for Lovable API key
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("[RewriteDescription] LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI API key niet geconfigureerd" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build context for AI including location intelligence
    const locationInfo = project.location_intelligence as { nearbyAmenities?: Record<string, Array<{ name: string; distance_meters: number }>> } | null;
    const context = {
      name: project.display_title || project.name,
      location: [project.city, project.region].filter(Boolean).join(", "),
      description: project.description,
      priceFrom: project.price_from,
      priceTo: project.price_to,
      status: project.status,
      completionDate: project.completion_date,
      propertyTypes: project.property_types,
      highlights: project.highlights?.slice(0, 10),
      nearbyAmenities: locationInfo?.nearbyAmenities || null,
    };

    // Set rewrite_status to in_progress (lock)
    await supabase
      .from("projects")
      .update({ rewrite_status: "in_progress" })
      .eq("id", projectId);

    try {
      console.log(`[RewriteDescription] Calling AI (gemini-2.5-flash-lite) to rewrite description...`);
      // Call Lovable AI with fast, cheap model
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: REWRITE_PROMPT },
            { 
              role: "user", 
              content: `Herschrijf de beschrijving van dit project en genereer persona-content:\n\n${JSON.stringify(context, null, 2)}` 
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "save_rewritten_description",
                description: "Save the rewritten project description with persona content",
                parameters: {
                  type: "object",
                  properties: {
                    description: { 
                      type: "string",
                      description: "Herschreven beschrijving (max 120 woorden)"
                    },
                    forWhom: { 
                      type: "array",
                      items: { type: "string" },
                      description: "3-4 punten voor wie dit project geschikt is"
                    },
                    notForWhom: { 
                      type: "array",
                      items: { type: "string" },
                      description: "2-3 punten voor wie dit project NIET geschikt is"
                    },
                    keyFacts: { 
                      type: "array",
                      items: { type: "string" },
                      description: "5 bullet points met concrete feiten"
                    },
                    personas: {
                      type: "object",
                      description: "Persona-specifieke content voor drie doelgroepen",
                      properties: {
                        vakantie: {
                          type: "object",
                          properties: {
                            title: { type: "string", description: "Korte titel (max 8 woorden)" },
                            description: { type: "string", description: "Beschrijving (max 80 woorden)" },
                            highlights: { type: "array", items: { type: "string" }, description: "5 highlights" },
                          },
                          required: ["title", "description", "highlights"],
                          additionalProperties: false,
                        },
                        investering: {
                          type: "object",
                          properties: {
                            title: { type: "string", description: "Korte titel (max 8 woorden)" },
                            description: { type: "string", description: "Beschrijving (max 80 woorden)" },
                            highlights: { type: "array", items: { type: "string" }, description: "5 highlights" },
                            estimatedYield: { type: "string", description: "Geschat bruto rendement (bijv. 5-7%)" },
                          },
                          required: ["title", "description", "highlights", "estimatedYield"],
                          additionalProperties: false,
                        },
                        wonen: {
                          type: "object",
                          properties: {
                            title: { type: "string", description: "Korte titel (max 8 woorden)" },
                            description: { type: "string", description: "Beschrijving (max 80 woorden)" },
                            highlights: { type: "array", items: { type: "string" }, description: "5 highlights" },
                          },
                          required: ["title", "description", "highlights"],
                          additionalProperties: false,
                        },
                      },
                      required: ["vakantie", "investering", "wonen"],
                      additionalProperties: false,
                    },
                  },
                  required: ["description", "forWhom", "notForWhom", "keyFacts", "personas"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "save_rewritten_description" } },
        }),
      });

      console.log(`[RewriteDescription] AI responded with status ${aiResponse.status} in ${Date.now() - startTime}ms`);

      if (!aiResponse.ok) {
        // Reset status on failure
        await supabase.from("projects").update({ rewrite_status: "idle" }).eq("id", projectId);
        
        if (aiResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit bereikt, probeer het later opnieuw" }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (aiResponse.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits op, voeg credits toe aan je workspace" }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const errorText = await aiResponse.text();
        console.error("[RewriteDescription] AI Error:", aiResponse.status, errorText.substring(0, 500));
        return new Response(
          JSON.stringify({ error: `AI fout (${aiResponse.status}): probeer opnieuw` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiData = await aiResponse.json();
      
      // Extract structured response from tool call
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) {
        console.error("[RewriteDescription] No tool call in response");
        await supabase.from("projects").update({ rewrite_status: "idle" }).eq("id", projectId);
        return new Response(
          JSON.stringify({ error: "Onverwacht AI response formaat" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let aiDescription: AIRewrittenDescription;
      try {
        aiDescription = JSON.parse(toolCall.function.arguments);
      } catch (parseError) {
        console.error("[RewriteDescription] Failed to parse AI response:", parseError);
        await supabase.from("projects").update({ rewrite_status: "idle" }).eq("id", projectId);
        return new Response(
          JSON.stringify({ error: "Kon AI response niet verwerken" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[RewriteDescription] AI description with personas parsed successfully`);

      // Save to database
      const { error: updateError } = await supabase
        .from("projects")
        .update({
          ai_rewritten_description: aiDescription,
          ai_rewritten_at: new Date().toISOString(),
          rewrite_status: "done",
        })
        .eq("id", projectId);

      if (updateError) {
        console.error("[RewriteDescription] Failed to save AI description:", updateError);
      } else {
        console.log("[RewriteDescription] AI description with personas saved successfully");
      }

      console.log(`[RewriteDescription] Complete in ${Date.now() - startTime}ms`);

      return new Response(
        JSON.stringify({
          aiDescription,
          cached: false,
          rewrittenAt: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (rewriteError) {
      // Reset rewrite status on failure
      await supabase.from("projects").update({ rewrite_status: "idle" }).eq("id", projectId);
      throw rewriteError;
    }
  } catch (error) {
    console.error("[RewriteDescription] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
