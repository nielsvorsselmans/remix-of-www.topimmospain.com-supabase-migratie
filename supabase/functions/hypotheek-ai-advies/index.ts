import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Je bent een ervaren hypotheekadviseur gespecialiseerd in Spaanse hypotheken voor Nederlandstalige klanten. Je schrijft in het Nederlands.

Je ontvangt een volledig hypotheekrapport als JSON. Schrijf een persoonlijke analyse in 3-4 korte alinea's (max 300 woorden totaal).

Richtlijnen:
- Begin met een persoonlijke begroeting met de naam van de klant
- Benoem de sterke punten van hun financiële profiel
- Wees eerlijk over knelpunten en risico's, maar blijf constructief
- Geef concrete, actionable tips die VERDER gaan dan de standaard aanbevelingen
- Verwijs naar specifieke bedragen en percentages uit het rapport
- VERZIN GEEN nieuwe rentepercentages, bedragen of voorwaarden die niet in het rapport staan
- Schrijf warm en professioneel, alsof je tegenover de klant zit
- Eindig met een bemoedigende noot of concrete volgende stap
- Gebruik GEEN markdown headers (#), alleen gewone alinea's`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportData } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `Hier is het hypotheekrapport:\n\n${JSON.stringify(reportData, null, 2)}`,
            },
          ],
          stream: false,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Te veel verzoeken, probeer het later opnieuw." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI-tegoed is op. Neem contact op met de beheerder." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ advies: content }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("hypotheek-ai-advies error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Onbekende fout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
