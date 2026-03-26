import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ICP_VALIDATION_TOOL = {
  type: "function",
  function: {
    name: "validate_insight_icp",
    description: "Validate an insight against the Ideal Customer Profile and optionally refine it",
    parameters: {
      type: "object",
      properties: {
        icp_score: {
          type: "integer",
          minimum: 1,
          maximum: 5,
          description: "Relevance score: 1=individual noise, 2=niche, 3=partially relevant, 4=broadly relevant, 5=core need"
        },
        persona_match: {
          type: "array",
          items: {
            type: "string",
            enum: ["rendement", "genieter", "ontdekker"]
          },
          description: "Which personas match this insight"
        },
        validation_notes: {
          type: "string",
          description: "Brief explanation of why this insight does or doesn't fit the ICP"
        },
        refined_insight: {
          type: "string",
          description: "Reformulated insight for broader relevance (only if score <= 3)"
        }
      },
      required: ["icp_score", "persona_match", "validation_notes"],
      additionalProperties: false
    }
  }
};

serve(async (req) => {
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
    const { insightId } = await req.json();
    
    if (!insightId) {
      return new Response(
        JSON.stringify({ error: "insightId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the insight
    const { data: insight, error: insightError } = await supabase
      .from("insights")
      .select("*")
      .eq("id", insightId)
      .single();

    if (insightError || !insight) {
      return new Response(
        JSON.stringify({ error: "Insight not found", details: insightError }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the ICP validation prompt
    const { data: promptData } = await supabase
      .from("ai_prompts")
      .select("prompt_text")
      .eq("prompt_key", "icp_validation")
      .single();

    const systemPrompt = promptData?.prompt_text || getDefaultPrompt();

    // Build the user prompt with insight context
    const userPrompt = `
Analyseer het volgende inzicht:

LABEL: ${insight.label}
GENORMALISEERD INZICHT: ${insight.normalized_insight || insight.label}
THEMA: ${insight.theme || "Niet gecategoriseerd"}
IMPACT: ${insight.impact || "Onbekend"}
FREQUENTIE: ${insight.frequency || 1} keer genoemd

${insight.source_quotes ? `BRONQUOTES: ${insight.source_quotes}` : ""}

Valideer dit inzicht tegen onze ICP en geef je beoordeling.
    `.trim();

    console.log("Validating insight:", insight.label);

    // Call AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [ICP_VALIDATION_TOOL],
        tool_choice: { type: "function", function: { name: "validate_insight_icp" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI response:", JSON.stringify(aiData, null, 2));

    // Extract the tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "validate_insight_icp") {
      throw new Error("No valid tool call in AI response");
    }

    const validation = JSON.parse(toolCall.function.arguments);
    console.log("Validation result:", validation);

    // Update the insight with validation results
    const { data: updatedInsight, error: updateError } = await supabase
      .from("insights")
      .update({
        icp_validated: true,
        icp_score: validation.icp_score,
        icp_persona_match: validation.persona_match,
        icp_validation_notes: validation.validation_notes,
        refined_insight: validation.refined_insight || null,
        validated_at: new Date().toISOString()
      })
      .eq("id", insightId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating insight:", updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        insight: updatedInsight,
        validation 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in validate-insight-icp:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getDefaultPrompt(): string {
  return `Je bent een ICP-Validatie Expert voor Top Immo Spain.

JOUW 3 KERNPERSONA'S:

1. DE RENDEMENTSGERICHTE INVESTEERDER (35-65 jaar)
   - Primaire motivatie: slim rendement op spaargeld
   - Kernbehoefte: zekerheid (juridisch, financieel, procesmatig)

2. DE GENIETER-INVESTEERDER (40-70 jaar)
   - Primaire motivatie: investeren én een plek om te genieten
   - Kernbehoefte: levenskwaliteit, rust, zon

3. DE ORIËNTERENDE ONTDEKKER (35-55 jaar)
   - Primaire motivatie: net begonnen met oriënteren
   - Kernbehoefte: veilige plek om rustig te leren

BEOORDEEL:
- Relevantie score 1-5
- Welke persona's matchen
- Korte uitleg
- Bij score ≤ 3: hervormd inzicht`;
}
