import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Fetching appointments with unpublished summaries...");

    // Fetch all appointments with notes that haven't been published OR are missing summary_full
    const { data: appointments, error: fetchError } = await supabase
      .from('ghl_contact_appointments')
      .select('id, local_notes, title, summary_full')
      .not('local_notes', 'is', null)
      .neq('local_notes', '')
      .or('is_summary_published.is.null,is_summary_published.eq.false,summary_full.is.null');

    if (fetchError) {
      console.error("Error fetching appointments:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${appointments?.length || 0} appointments to process`);

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No appointments to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const results = [];

    for (const appointment of appointments) {
      console.log(`Processing appointment ${appointment.id}...`);
      
      const plainTextNotes = stripHtml(appointment.local_notes || '');
      
      if (!plainTextNotes || plainTextNotes.length < 10) {
        console.log(`Skipping appointment ${appointment.id} - notes too short`);
        continue;
      }

      const systemPrompt = `Je bent een expert in het anonimiseren en samenvatten van klantgesprekken voor Top Immo Spain.

Je taak is om gespreksnotities om te zetten naar een gestructureerde, anonieme samenvatting die:
1. Potentiële klanten vertrouwen geeft in het oriëntatieproces
2. Laat zien hoe gesprekken verlopen richting een bezichtigingsreis
3. Volledig anoniem is - geen echte namen, projectnamen of herkenbare details

STRIKTE ANONIMISERINGSREGELS:
- Vervang namen door "een stel", "de investeerder", "een ondernemer"
- Exacte budgetten → gebruik ranges ("circa 2-3 ton", "een substantieel budget")
- VERWIJDER: telefoonnummers, emails, specifieke adressen, bedrijfsnamen

ABSOLUUT VERBODEN (nooit noemen):
- Specifieke projectnamen of woningvoorbeelden
- Portaal-functionaliteit of online systemen
- "Fase 2", "tweede fase", of interne processen
- Technische details over dienstverlening

STRUCTUUR voor summaryFull (250-350 woorden):
Begin ALTIJD met een representatieve quote van de klant (fictief maar passend bij de situatie) tussen aanhalingstekens.
Daarna 4 secties met markdown ## headers:

## De situatie
Schets wie de klant is (geanonimiseerd), hun achtergrond en wat hen naar Top Immo Spain bracht. 2-3 zinnen.

## De kernvragen
Welke onderwerpen kwamen aan bod? Gebruik bullet points met **vetgedrukte** labels. Bijvoorbeeld:
- **Locatiekeuze:** Waar aan de kust zijn de beste mogelijkheden?
- **Budget en kosten:** Wat zijn realistische verwachtingen?

## Wat het gesprek opleverde
Concrete inzichten en uitkomsten. Wat weet de klant nu wel dat ze daarvoor niet wisten? 2-4 zinnen.

## Volgende stap
Gebruik "Wij" of "Top Immo Spain" als subject - NOOIT "de adviseur" of andere onpersoonlijke termen.
Eindig met de bezichtigingsreis als logische vervolgstap. 1-2 zinnen.

Voorbeelden:
- "Wij stellen nu een selectie van woningen samen..."
- "Samen met Top Immo Spain plannen ze een bezichtigingsreis..."
- "Wij hebben hen alle informatie gegeven om de volgende stap te zetten..."

CATEGORIEËN:
- orientatie: Eerste kennismaking
- financiering: Hypotheek, budget
- regio: Locatievragen
- rendement: Huurinkomsten, ROI
- proces: Aankoopproces
- bezichtiging: Reis plannen

TOON: Warm, menselijk, informatief. Dit zijn echte mensen met echte dromen.`;

      const userPrompt = `Analyseer de volgende gespreksnotities en genereer een gestructureerde, anonieme samenvatting.

Afspraaktype: ${appointment.title || 'Gesprek'}

Notities:
${plainTextNotes}

Genereer een samenvatting met de generate_summary tool:
1. headline: Pakkende titel (max 10 woorden) die de essentie vangt
2. summaryShort: Korte teaser (max 25 woorden) voor cards
3. summaryFull: Uitgebreide samenvatting (250-350 woorden) met quote + 4 secties
4. category: Kies uit: orientatie, financiering, regio, rendement, proces, bezichtiging
5. clientPseudonym: Geanonimiseerde beschrijving (bijv. "Een stel uit Nederland")
6. keyTopics: Array van 3-5 besproken onderwerpen

VERBODEN: projectnamen, portaal, "fase 2", specifieke woningen`;

      try {
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
                        description: "Uitgebreide samenvatting (250-350 woorden). Start met een representatieve quote. Daarna 4 secties met ## headers: De situatie, De kernvragen (met bullet points), Wat het gesprek opleverde, Volgende stap. NOOIT projectnamen of portaal noemen."
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
          console.error(`AI error for appointment ${appointment.id}:`, response.status);
          continue;
        }

        const data = await response.json();
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
        
        if (!toolCall || toolCall.function.name !== "generate_summary") {
          console.error(`Invalid AI response for appointment ${appointment.id}`);
          continue;
        }

        const summary = JSON.parse(toolCall.function.arguments);
        console.log(`Generated summary for appointment ${appointment.id}:`, summary.headline);

        // Update the appointment with the generated summary
        const { error: updateError } = await supabase
          .from('ghl_contact_appointments')
          .update({
            summary_headline: summary.headline,
            summary_short: summary.summaryShort,
            summary_full: summary.summaryFull,
            summary_category: summary.category,
            client_pseudonym: summary.clientPseudonym,
            key_topics: summary.keyTopics,
            is_summary_published: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', appointment.id);

        if (updateError) {
          console.error(`Error updating appointment ${appointment.id}:`, updateError);
          continue;
        }

        results.push({
          id: appointment.id,
          headline: summary.headline,
          success: true
        });

      } catch (aiError) {
        console.error(`Error processing appointment ${appointment.id}:`, aiError);
      }
    }

    console.log(`Bulk processing complete. Processed ${results.length} appointments.`);

    return new Response(
      JSON.stringify({ 
        message: `Successfully processed ${results.length} appointments`,
        processed: results.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in bulk-generate-summaries function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
