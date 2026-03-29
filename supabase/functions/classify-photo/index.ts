import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAnthropicVisionWithTool, MODEL_SONNET } from '../_shared/ai-client.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Niet geautoriseerd");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Niet geautoriseerd");

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) throw new Error("Geen admin rechten");

    const { imageUrl } = await req.json();
    if (!imageUrl) throw new Error("imageUrl is verplicht");

    const classification = await callAnthropicVisionWithTool(
      "Je bent een foto-classificatie assistent. Analyseer de foto en bepaal de categorie en relevante tags.",
      "Analyseer deze foto en classificeer deze. Bepaal de categorie en geef 3-5 relevante beschrijvende tags.",
      imageUrl,
      {
        name: "classify_photo",
        description: "Classificeer een foto met categorie en tags",
        input_schema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              enum: ["headshot", "speaking", "location", "lifestyle", "office"],
              description: "De categorie van de foto. headshot = portretfoto/gezicht, speaking = presentatie/podium, location = locatie/gebouw/landschap, lifestyle = casual/ontspannen, office = kantoor/werkplek",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "3-5 beschrijvende tags in het Nederlands, bijv: buitenshuis, professioneel, zomer, strand, formeel",
            },
          },
          required: ["category", "tags"],
        },
      },
      { model: MODEL_SONNET }
    );

    return new Response(JSON.stringify(classification), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("classify-photo error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Onbekende fout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
