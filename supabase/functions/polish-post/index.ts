import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SENIOR_EDITOR_PROMPT_KEY = "senior_editor";

const DEFAULT_SENIOR_EDITOR_PROMPT = `Jij bent de Hoofdredacteur van Top Immo Spain.

Je ontvangt een ruwe tekst (draft) en een gekozen opening (hook).

JOUW TAAK:
Smeed deze samen tot één perfect lopende LinkedIn post.

STIJLREGELS (STRICT):

1. HET RITME (Witregels):
   - Schrijf nooit alinea's van meer dan 2 regels.
   - Gebruik veel witregels. LinkedIn is mobiel; witruimte is lucht.
   - Wissel af: Een statement van 1 zin. Dan een blokje van 2 zinnen.

2. SCHRAP WOLLIGHEID (Kill your darlings):
   - Verwijder woorden als: 'eigenlijk', 'in principe', 'zullen', 'worden', 'echter'.
   - Maak zinnen actief.
   - FOUT: "Er kan worden gesteld dat dit een unieke kans is."
   - GOED: "Dit is een unieke kans."

3. DE CONNECTIE (Hook -> Body):
   - Begin DIRECT met de selected_hook.
   - Zorg dat de eerste zin daarna de belofte van de hook waarmaakt of uitlegt.
   - Verwijder herhalingen die in de draft stonden.

4. VISUELE OPMAAK (Top Immo Spain Huisstijl):
   - Gebruik '🟩' om de status of het thema aan te geven (indien passend).
   - Gebruik '➡️' of '✅' voor opsommingen.
   - Gebruik '💡' voor het inzicht.
   - Gebruik '📉' of '💰' bij cijfers.

5. TONE OF VOICE:
   - Kordaat. Zelfverzekerd.
   - Geen verkoop-schreeuwerij (GEEN HOOFDLETTERS in zinnen).
   - Eindig met de specifieke CTA uit de draft, maar maak hem dwingend.

6. VERBODEN:
   - Gebruik GEEN hashtags (#) in de post.
   - Gebruik NOOIT de naam 'Viva Vastgoed' — wij zijn Top Immo Spain.
   - Geen generieke afsluiters als "Wat denk jij?" zonder context.

OUTPUT FORMAT (KRITIEK):
- Retourneer de complete post als één doorlopende TEKST.
- Begin direct met de hook, gevolgd door witregels en de body.
- Eindig met de CTA.
- GEEN JSON object of structuur.
- GEEN labels zoals "hook:", "body:", "cta:" - alleen de leesbare tekst zelf.`;

const POLISH_TOOL = {
  type: "function",
  function: {
    name: "return_polished_post",
    description: "Return the polished, LinkedIn-ready post as a single continuous text string. NOT a JSON object. Just the complete post text with proper line breaks and formatting.",
    parameters: {
      type: "object",
      properties: {
        polishedPost: {
          type: "string",
          description: "The complete LinkedIn post as plain readable text. Starts with the hook, followed by body paragraphs separated by blank lines (\\n\\n), ending with the CTA. NO JSON structure, NO field labels like 'hook:' or 'body:' - just the human-readable post exactly as it should appear on LinkedIn."
        }
      },
      required: ["polishedPost"],
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
    const { selectedHook, draftBody, draftCta, targetAudience } = await req.json();

    if (!selectedHook || !draftBody || !draftCta) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: selectedHook, draftBody, draftCta" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client to fetch custom prompt
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try to fetch custom prompt and model
    let systemPrompt = DEFAULT_SENIOR_EDITOR_PROMPT;
    let editorModel = "google/gemini-3-flash-preview";
    
    const { data: promptData } = await supabase
      .from("ai_prompts")
      .select("prompt_text, model_id")
      .eq("prompt_key", SENIOR_EDITOR_PROMPT_KEY)
      .maybeSingle();

    if (promptData?.prompt_text) {
      systemPrompt = promptData.prompt_text;
    }
    if (promptData?.model_id) {
      editorModel = promptData.model_id;
    }

    // Construct the user prompt
    const userPrompt = `GESELECTEERDE HOOK:
${selectedHook}

DRAFT BODY:
${draftBody}

DRAFT CTA:
${draftCta}

DOELGROEP: ${targetAudience || "BOTH"}

Smeed dit nu samen tot één perfecte LinkedIn post.`;

    console.log(`[polish-post] Processing request for targetAudience: ${targetAudience}, model: ${editorModel}`);

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: editorModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [POLISH_TOOL],
        tool_choice: { type: "function", function: { name: "return_polished_post" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("[polish-post] AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("[polish-post] AI response received");

    // Extract the tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function?.name !== "return_polished_post") {
      console.error("[polish-post] Unexpected response format:", JSON.stringify(aiResponse));
      throw new Error("Unexpected AI response format");
    }

    const polishedResult = JSON.parse(toolCall.function.arguments);
    console.log("[polish-post] Post polished successfully");

    return new Response(
      JSON.stringify(polishedResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[polish-post] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
