import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notes, appointmentTitle } = await req.json();
    
    if (!notes || notes.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'No notes provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Je bent een AI-assistent voor Top Immo Spain, gespecialiseerd in het anonimiseren en samenvatten van klantgesprekken over vastgoedinvesteren in Spanje.

Je taak is om ruwe gespreksnotities om te zetten naar een gestructureerde, anonieme samenvatting die andere potentiële investeerders kan helpen en inspireren.

STAP 1: ANALYSEER EERST (intern, niet in de output)
Voordat je begint met schrijven, beantwoord deze vragen voor jezelf:
1. Waar woont de klant momenteel? (Nederland, België, etc.)
2. Heeft de klant al een woning in Spanje? Zo ja, waar en wat is de situatie?
3. Wat is de AANLEIDING voor hun zoektocht? (verkoop bestaande woning, eerste investering, etc.)
4. Wat zijn de kernvragen en obstakels?

ANONIMISERINGSREGELS (STRIKT):
1. VERWIJDER alle persoonlijke informatie:
   - Namen van personen → vervang door type klant ("de investeerder", "het stel")
   - Exacte budgetten → gebruik ranges ("een substantieel budget", "circa 2-3 ton")
   - Telefoonnummers, emailadressen → volledig verwijderen
   - Specifieke adressen → alleen regio's noemen
   - Bedrijfsnamen → "een ondernemer" of weglaten

2. FILTER UIT DE SAMENVATTING (NIET noemen):
   - Portaal-functionaliteit of online systemen
   - Specifieke projectnamen of woningvoorbeelden
   - Interne processen van Top Immo Spain
   - Technische details over de dienstverlening

3. BEHOUD (anoniem):
   - Type investeerder en gezinssituatie
   - Doelen en motivaties
   - Kernvragen en twijfels
   - Regio-voorkeuren (algemeen)

STRUCTUUR VOOR summaryFull (MARKDOWN):
Schrijf een gestructureerde samenvatting met deze 4 secties:

## Situatieschets
Beschrijf kort wie de klant is (anoniem) en wat hun uitgangssituatie is.
LET OP: Analyseer zorgvuldig WAAR een bestaande woning zich bevindt (Spanje of thuisland).

## Uitdagingen & Vragen
- Bullet points met kernvragen
- Alleen relevante kernzaken, geen randzaken

## Besproken Oplossingen
Welk algemeen advies is gegeven? GEEN specifieke projecten of woningen noemen.
Houd het algemeen: "passende opties in de gewenste regio" i.p.v. specifieke namen.

## Volgende Stappen
Hoe gaat Top Immo Spain de klant verder begeleiden?
ALTIJD eindigen met perspectief op een bezichtigingsreis naar Spanje.
Bijvoorbeeld: "Na het afstemmen van de wensen, wordt een bezichtigingsreis gepland..."

TONE OF VOICE:
- Warm en adviserend
- Empathisch en begripvol
- Helder en toegankelijk
- Altijd richting een bezoek aan Spanje

CATEGORIEËN (kies de meest passende):
- orientatie: Eerste kennismaking, algemene vragen
- financiering: Hypotheek, overwaarde, lening, budget
- regio: Vragen over specifieke regio's in Spanje
- rendement: ROI, huurinkomsten, waardevermeerdering
- proces: Aankoopproces, juridisch, notaris
- bezichtiging: Bezichtigingsreis plannen`;

    const userPrompt = `Analyseer de volgende gespreksnotities en genereer een anonieme, gestructureerde samenvatting.

BELANGRIJK: Lees de notities zorgvuldig en bepaal eerst:
- Waar woont de klant? (thuisland)
- Heeft de klant al vastgoed in Spanje?
- Wat is de aanleiding voor dit gesprek?

Afspraaktype: ${appointmentTitle || 'Gesprek'}

Notities:
${notes}

Genereer een complete samenvatting met de generate_summary tool. 
- summaryFull moet een volledige Markdown-gestructureerde tekst zijn met alle 4 de secties.
- Noem GEEN specifieke projecten of woningen.
- Gebruik "Top Immo Spain" i.p.v. "de consultant".
- Eindig volgende stappen altijd met perspectief op een bezichtigingsreis.`;

    console.log("Calling Lovable AI for summary generation...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_summary",
              description: "Generate an anonymous structured summary of a client conversation",
              parameters: {
                type: "object",
                properties: {
                  headline: {
                    type: "string",
                    description: "Een pakkende, korte headline (max 60 karakters) die de kern van het gesprek samenvat"
                  },
                  summaryShort: {
                    type: "string",
                    description: "Een korte, anonieme samenvatting van het gesprek (max 150 karakters)"
                  },
                  summaryFull: {
                    type: "string",
                    description: "Volledige gestructureerde samenvatting in Markdown met de 4 secties: Situatieschets, Uitdagingen & Vragen, Besproken Oplossingen, Volgende Stappen. Minimaal 200 woorden, maximaal 400 woorden."
                  },
                  category: {
                    type: "string",
                    enum: ["orientatie", "financiering", "regio", "rendement", "proces", "bezichtiging"],
                    description: "De hoofdcategorie van het gesprek"
                  },
                  clientPseudonym: {
                    type: "string",
                    description: "Een korte anonieme omschrijving van het type klant (bijv. 'Een investeerder uit Nederland')"
                  },
                  keyTopics: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 belangrijke onderwerpen uit het gesprek als tags"
                  }
                },
                required: ["headline", "summaryShort", "summaryFull", "category", "clientPseudonym", "keyTopics"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_summary" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to generate summary' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log("AI response received:", JSON.stringify(data, null, 2));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "generate_summary") {
      console.error("Unexpected AI response format:", data);
      return new Response(
        JSON.stringify({ error: 'Invalid AI response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const summary = JSON.parse(toolCall.function.arguments);
    console.log("Generated summary:", summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in generate-summary function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
