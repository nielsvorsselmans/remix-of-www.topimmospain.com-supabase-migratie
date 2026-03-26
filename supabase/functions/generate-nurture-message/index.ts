import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { actionId } = await req.json();
    if (!actionId) {
      return new Response(
        JSON.stringify({ error: 'Missing actionId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch the action
    const { data: action, error: actionError } = await supabase
      .from("lead_nurture_actions")
      .select("*")
      .eq("id", actionId)
      .single();

    if (actionError || !action) {
      return new Response(
        JSON.stringify({ error: 'Action not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch lead, profile, appointments and favorites in parallel
    const [leadResult, profileResult, appointmentsResult] = await Promise.all([
      supabase
        .from("crm_leads")
        .select("first_name, last_name, email, phone, journey_phase, country")
        .eq("id", action.crm_lead_id)
        .single(),
      supabase
        .from("customer_profiles")
        .select("explicit_preferences, inferred_preferences, favorite_projects")
        .eq("crm_lead_id", action.crm_lead_id)
        .maybeSingle(),
      supabase
        .from("ghl_contact_appointments")
        .select("start_time, title, local_notes, summary_headline, summary_short")
        .eq("crm_lead_id", action.crm_lead_id)
        .order("start_time", { ascending: false })
        .limit(3),
    ]);

    const lead = leadResult.data;
    const profile = profileResult.data;
    const recentAppointments = appointmentsResult.data || [];
    const explicit = (profile?.explicit_preferences as any) || {};
    const firstName = lead?.first_name || 'de klant';

    // Fetch favorite project names
    let favoriteProjectNames: string[] = [];
    if (profile?.favorite_projects?.length) {
      const { data: projects } = await supabase
        .from("projects")
        .select("name, city")
        .in("id", profile.favorite_projects);
      if (projects?.length) {
        favoriteProjectNames = projects.map((p: any) => `${p.name}${p.city ? ` (${p.city})` : ''}`);
      }
    }

    // Build conversation history for context
    let conversationContext = '';
    if (recentAppointments.length > 0) {
      const historyLines = recentAppointments
        .reverse()
        .map((a: any) => {
          const date = a.start_time ? new Date(a.start_time).toLocaleDateString('nl-NL') : '';
          const headline = a.summary_headline || a.title || 'Gesprek';
          const details = a.local_notes || a.summary_short || '';
          return `- ${date}: ${headline}${details ? `\n  ${details}` : ''}`;
        })
        .join('\n');
      conversationContext = `\nLaatste gesprekken met deze klant:\n${historyLines}`;
    }

    // Channel-specific system prompt
    const channelInstructions: Record<string, string> = {
      whatsapp: `Genereer een kort, informeel WhatsApp-bericht.
REGELS:
- Maximaal 3-4 zinnen
- Informeel: gebruik "je/jij", niet "u"
- Emoji is toegestaan maar overdrijf niet (max 2)
- Begin NIET met "Hoi [naam]" als je de naam niet kent
- Begin met de naam als je die wel kent: "Hoi ${firstName},"
- Eindig met een duidelijke maar zachte call-to-action
- Geen onderwerpregels
- Geen formele afsluiting, gewoon je naam: "Groet, [makelaar]"`,

      email: `Genereer een professioneel maar warm email-bericht met onderwerpregels.
REGELS:
- Onderwerpregels: kort, specifiek, geen clickbait
- Begin met "Beste ${firstName}," of "Hoi ${firstName},"
- Introduceer kort waarom je schrijft (verwijs naar eerder gesprek)
- Kern: de actie/content/info die je deelt
- Sluit af met een duidelijke CTA
- Formele maar warme afsluiting: "Met vriendelijke groet," of "Hartelijke groet,"
- Voeg [makelaar naam] en "Top Immo Spain" toe als ondertekening`,

      call: `Genereer gesprekspunten voor een telefoongesprek.
REGELS:
- Format als bullet points
- Begin met 2-3 open vragen om het gesprek te starten
- Voeg 2-3 inhoudelijke punten toe die je wilt bespreken
- Sluit af met een concreet vervolgvoorstel
- Geen letterlijk script — het zijn richtpunten
- Toon: warm, geïnteresseerd, niet salesachtig`,

      content: `Genereer een kort begeleidend bericht bij het delen van content.
REGELS:
- Kort introductiezinnetje waarom je dit deelt
- Verwijs naar het gesprek of de interesse van de klant
- Maak het persoonlijk, niet generiek
- Format als email-achtig bericht met onderwerp`,

      trip_planning: `Genereer een bericht over het plannen van een bezichtigingsreis.
REGELS:
- Begin met enthousiasme over het bezoek
- Verwijs naar de specifieke reisperiode die de klant noemde
- Noem concrete volgende stappen: vlucht, accommodatie, bezichtigingsplanning
- Als er favoriete projecten zijn, noem die als bezichtigingskandidaten
- Eindig met een concrete vraag of voorstel voor de planning
- Format als email met onderwerp`,
    };

    const channelInstruction = channelInstructions[action.action_type] || channelInstructions.email;

    // Build persona context
    let personaContext = '';
    if (explicit.persona_type || explicit.investment_goal) {
      const persona = explicit.persona_type || '';
      const goal = explicit.investment_goal || '';
      if (persona.toLowerCase().includes('rendement') || goal.toLowerCase().includes('rendement') || goal.toLowerCase().includes('roi')) {
        personaContext = 'De klant is een rendements-investeerder. Gebruik cijfers en feiten, wees zakelijk maar menselijk.';
      } else if (persona.toLowerCase().includes('lifestyle') || goal.toLowerCase().includes('genieten')) {
        personaContext = 'De klant is een lifestyle-genieter. Gebruik sfeervolle taal, focus op beleving en levensstijl.';
      } else if (persona.toLowerCase().includes('ontdekker')) {
        personaContext = 'De klant is een voorzichtige ontdekker. Wees geruststellend en stap-voor-stap.';
      }
    }

    const systemPrompt = `Je bent een copywriter voor Top Immo Spain, gespecialiseerd in warme, persoonlijke communicatie over vastgoedinvesteren in Spanje.

${channelInstruction}

${personaContext ? `KLANTPROFIEL: ${personaContext}` : ''}

SPECIFICITEIT-REGEL:
- Verwijs ALTIJD naar specifieke onderwerpen uit het laatste gesprek. Noem projecten bij naam. Wees concreet, niet generiek.
- Als de klant over een holding-structuur, box3, hypotheek of ander specifiek onderwerp sprak, verwijs daar direct naar.
- Gebruik NOOIT generieke openingszinnen als "zoals besproken" zonder te specificeren WAT er besproken is.

CONTEXT:
- Klant: ${lead?.first_name || ''} ${lead?.last_name || ''}
- Fase: ${lead?.journey_phase || 'orientatie'}
- Land: ${lead?.country || 'onbekend'}
${explicit.budget_min ? `- Budget: €${explicit.budget_min}k - €${explicit.budget_max || '?'}k` : ''}
${explicit.preferred_regions?.length ? `- Regio voorkeur: ${explicit.preferred_regions.join(', ')}` : ''}
${favoriteProjectNames.length > 0 ? `- Favoriete projecten: ${favoriteProjectNames.join(', ')}` : ''}
${conversationContext}

De actie die uitgevoerd moet worden:
"${action.suggested_action}"
${action.resource_url ? `Relevante link: ${action.resource_url}` : ''}
${action.context_summary ? `Gesprekssamenvatting: ${action.context_summary}` : ''}

Genereer het bericht met de generate_message tool.`;

    const toolDef: any = {
      type: "function",
      function: {
        name: "generate_message",
        description: "Generate a ready-to-send message for a nurture action",
        parameters: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Het volledige bericht, klaar om te kopiëren en te versturen",
            },
          },
          required: ["message"],
          additionalProperties: false,
        },
      },
    };

    // Add subject field for email/content types
    if (action.action_type === 'email' || action.action_type === 'content' || action.action_type === 'trip_planning') {
      toolDef.function.parameters.properties.subject = {
        type: "string",
        description: "Onderwerpregel voor de email",
      };
      toolDef.function.parameters.required = ["message", "subject"];
    }

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
          { role: "user", content: "Genereer het bericht voor deze actie." },
        ],
        tools: [toolDef],
        tool_choice: { type: "function", function: { name: "generate_message" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ error: 'Failed to generate message' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== "generate_message") {
      return new Response(JSON.stringify({ error: 'Invalid AI response' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const result = JSON.parse(toolCall.function.arguments);

    // Save generated message to database
    const updateData: any = { generated_message: result.message };
    if (result.subject) {
      updateData.generated_message_subject = result.subject;
    }

    await supabase
      .from("lead_nurture_actions")
      .update(updateData)
      .eq("id", actionId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: result.message, 
        subject: result.subject || null 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in generate-nurture-message:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
