import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Default prompt for Hook Optimizer
const DEFAULT_HOOK_OPTIMIZER_PROMPT = `Jij bent een Viral LinkedIn Copywriter.

Je krijgt een post die al geschreven is. Jouw enige taak is om de perfecte 'Stop-the-scroll' openingszin (Hook) te schrijven.

ANALYSEER EERST:
Lees de draft_post. Wat is de 'Golden Nugget' of de grootste belofte in deze tekst?
(Bv. Is het een hoog rendement? Een unieke locatie? Een probleem dat wordt opgelost?)

GENEREER 5 VARIANTEN (HOOKS):

1. THE PATTERN INTERRUPT (Visueel/Gewaagd):
   - Gebruik een Emoji of een kort, dwingend statement.
   - Bv: "🟩 Dit project klopt niet." of "Stop even met scrollen."

2. THE SPECIFICITY HOOK (Cijfers/Feiten):
   - Haal het hardste cijfer uit de tekst.
   - Bv: "6% rendement en 1e lijns zeezicht. Voor €250k."

3. THE VELVET ROPE (Mysterie/Schaarste):
   - Speel in op het feit dat dit niet voor iedereen is.
   - Bv: "Nergens online te vinden, maar vandaag op mijn bureau."

4. THE CONTRARIAN (Tegen de stroom in):
   - Zeg iets wat mensen niet verwachten over Spanje/Vastgoed.
   - Bv: "Waarom je nu NIET in Marbella moet kopen."

5. THE IMAGINATION (Sfeer) OF THE DIRECT BENEFIT:
   - Als LIFESTYLE doelgroep: "Stel je voor..." hooks
   - Als INVESTOR doelgroep: Directe benefit hook

REGELS:
- Maximaal 2 regels per hook.
- Geen clickbait die de tekst niet waarmaakt.
- De hook moet naadloos aansluiten op de eerste alinea van de draft_post.`;

// Tool definition for structured output
const HOOKS_TOOL = {
  type: "function",
  function: {
    name: "return_hooks",
    description: "Return the 5 viral hook variations and analysis",
    parameters: {
      type: "object",
      properties: {
        analysis: {
          type: "string",
          description: "Korte analyse van de Golden Nugget in de post (max 2 zinnen)"
        },
        patternInterrupt: {
          type: "string",
          description: "Hook 1: Visueel/Gewaagd met emoji of bold statement (max 2 regels)"
        },
        specificityHook: {
          type: "string",
          description: "Hook 2: Cijfers en harde feiten uit de tekst (max 2 regels)"
        },
        velvetRope: {
          type: "string",
          description: "Hook 3: Mysterie en schaarste (max 2 regels)"
        },
        contrarian: {
          type: "string",
          description: "Hook 4: Tegen de verwachting in (max 2 regels)"
        },
        imaginationOrBenefit: {
          type: "string",
          description: "Hook 5: 'Stel je voor...' voor LIFESTYLE of directe benefit voor INVESTOR (max 2 regels)"
        }
      },
      required: ["analysis", "patternInterrupt", "specificityHook", "velvetRope", "contrarian", "imaginationOrBenefit"],
      additionalProperties: false
    }
  }
};

serve(async (req) => {
  // Handle CORS preflight
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
    const { draftPost, targetAudience, projectName } = await req.json();

    if (!draftPost) {
      return new Response(
        JSON.stringify({ error: "draftPost is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch custom prompt and model if exists
    const { data: promptData } = await supabase
      .from("ai_prompts")
      .select("prompt_text, model_id")
      .eq("prompt_key", "hook_optimizer")
      .maybeSingle();

    const systemPrompt = promptData?.prompt_text || DEFAULT_HOOK_OPTIMIZER_PROMPT;
    const hookModel = promptData?.model_id || "google/gemini-3-flash-preview";

    // Build user prompt
    const userPrompt = `TARGET AUDIENCE: ${targetAudience || "BOTH"}
${projectName ? `PROJECT: ${projectName}` : ""}

DRAFT POST:
${draftPost}

Analyseer deze post en genereer 5 virale hook varianten via de return_hooks functie.`;

    // Call AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Calling AI Gateway for hook optimization (${hookModel})...`);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: hookModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [HOOKS_TOOL],
        tool_choice: { type: "function", function: { name: "return_hooks" } },
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
          JSON.stringify({ error: "Insufficient credits. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI Response received");

    // Extract tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "return_hooks") {
      throw new Error("Invalid AI response: no tool call found");
    }

    const hooks = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify(hooks),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Hook optimization error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
