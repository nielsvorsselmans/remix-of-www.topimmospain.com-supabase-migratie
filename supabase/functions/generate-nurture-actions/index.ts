import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Phase-aware strategy mapping
function getPhaseStrategy(phase: string | null): string {
  const strategies: Record<string, string> = {
    orientatie: `STRATEGISCH DOEL: Educeren en vertrouwen opbouwen.
- Focus op kennisdeling: stuur oriëntatiegids, artikelen over aankoopproces, calculators.
- Doel: klant moet zich veilig voelen en begrijpen hoe investeren in Spanje werkt.
- NIET pushen richting bezichtiging of aankoop — dat is te vroeg.
- Zachte CTA's: "Bekijk eens...", "Misschien interessant om te lezen..."`,

    selectie: `STRATEGISCH DOEL: Vergelijken faciliteren en shortlist helpen maken.
- Focus op specifieke projecten die passen bij voorkeuren.
- Stuur vergelijkingen, projectdetails, ROI-berekeningen voor specifieke woningen.
- Help de klant een shortlist van 2-3 projecten samen te stellen.
- CTA's: "Welk project spreekt je het meest aan?", "Zullen we een vergelijking maken?"`,

    bezichtiging: `STRATEGISCH DOEL: Bezichtigingsreis concreet maken.
- Focus op praktische info: vluchten, planning, wat te verwachten bij bezichtiging.
- Stuur reisplanning-gerelateerde content, travel guide info.
- Help de klant de stap naar Spanje te zetten.
- CTA's: "Wanneer zou je kunnen komen?", "Zullen we de bezichtiging plannen?"`,

    aankoop: `STRATEGISCH DOEL: Vertrouwen in proces bevestigen, snelheid houden.
- Focus op juridische/fiscale content, NIE-nummer, hypotheek.
- Bevestig dat het proces goed loopt, verwijs naar relevante artikelen.
- Houd momentum, maar zonder druk.
- CTA's: "Heb je nog vragen over het proces?", "Laten we de volgende stap bespreken."`,

    overdracht: `STRATEGISCH DOEL: After-sales, review vragen, verhuur-content.
- Focus op verhuurmogelijkheden, beheer, ervaringen delen.
- Vraag om review of referral.
- CTA's: "Hoe bevalt je nieuwe woning?", "Ken je iemand die ook geïnteresseerd is?"`,

    beheer: `STRATEGISCH DOEL: After-sales, review vragen, verhuur-content.
- Focus op verhuurmogelijkheden, beheer, rendementsupdates.
- Vraag om review of referral.
- CTA's: "Hoe gaat het met de verhuur?", "Wil je je ervaring delen?"`,
  };

  return strategies[phase || 'orientatie'] || strategies.orientatie;
}

// Persona-aware tone mapping
function getPersonaTone(personaType: string | null, investmentGoal: string | null): string {
  if (!personaType && !investmentGoal) {
    return `PERSONA & TOON: Onbekend persona — gebruik een neutrale, warme, adviserende toon. Combineer een beetje data met een beetje sfeer.`;
  }

  const persona = (personaType || '').toLowerCase();
  const goal = (investmentGoal || '').toLowerCase();

  if (persona.includes('rendement') || persona.includes('investor') || goal.includes('rendement') || goal.includes('investering') || goal.includes('roi')) {
    return `PERSONA & TOON: Rendements-investeerder.
- Gebruik cijfers, ROI-berekeningen, box3-voordelen, vergelijkingen.
- Spreek rationeel en zakelijk, maar menselijk.
- Verwijs naar calculators, marktdata, concrete rendementen.
- Vermijd te emotionele of sfeervolle taal — deze klant wil feiten.`;
  }

  if (persona.includes('lifestyle') || persona.includes('genieter') || goal.includes('eigen gebruik') || goal.includes('genieten')) {
    return `PERSONA & TOON: Lifestyle-genieter.
- Gebruik sfeervolle, beeldende taal: zon, rust, kwaliteit van leven.
- Focus op locatie, levensstijl, ervaringen van andere kopers.
- Verwijs naar klantverhalen, regio-informatie, foto's.
- Minder nadruk op cijfers, meer op beleving en zekerheid.`;
  }

  if (persona.includes('ontdekker') || persona.includes('onzeker') || persona.includes('starter')) {
    return `PERSONA & TOON: Voorzichtige ontdekker.
- Gebruik geruststellende, stap-voor-stap taal.
- Focus op "het is normaal om vragen te hebben", ervaringsverhalen.
- Verwijs naar de oriëntatiegids, basis-artikelen, FAQ's.
- Bied altijd aan om vragen te beantwoorden — geen druk.`;
  }

  return `PERSONA & TOON: ${personaType || investmentGoal} — pas je toon aan op dit type klant. Wees warm en adviserend.`;
}

// Timing based on temperature
function getTimingInstruction(temperature: string | null, timeline: string | null): string {
  let timing = '';
  
  const temp = (temperature || 'warm').toLowerCase();
  if (temp === 'hot' || temp === 'heet') {
    timing = `TIMING: Hot lead — acties plannen op 1-3 dagen. Snelle opvolging is cruciaal.`;
  } else if (temp === 'warm') {
    timing = `TIMING: Warme lead — acties plannen op 3-7 dagen. Regelmatig contact maar niet dagelijks.`;
  } else {
    timing = `TIMING: Koele/koude lead — acties plannen op 7-14 dagen. Geef ruimte maar blijf in beeld.`;
  }

  if (timeline) {
    timing += `\nKlant-tijdlijn: "${timeline}" — stem je urgentie hierop af. Als de klant binnenkort wil kopen, plan sneller. Als het "ooit" is, neem het rustiger.`;
  }

  return timing;
}

// Helper to call AI gateway
async function callAI(apiKey: string, messages: any[], tools?: any[], toolChoice?: any) {
  const body: any = {
    model: "google/gemini-2.5-pro",
    messages,
  };
  if (tools) body.tools = tools;
  if (toolChoice) body.tool_choice = toolChoice;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI gateway error:", response.status, errorText);
    throw { status: response.status, message: errorText };
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw { status: 500, message: "No tool call in AI response" };
  return JSON.parse(toolCall.function.arguments);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { crmLeadId, notes, appointmentId, dryRun } = await req.json();

    if (!crmLeadId || !notes) {
      return new Response(
        JSON.stringify({ error: 'Missing crmLeadId or notes' }),
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

    // Fetch all context in parallel
    const [leadResult, blogResult, profileResult, appointmentsResult, existingActionsResult, manualEventsResult] = await Promise.all([
      supabase
        .from("crm_leads")
        .select("first_name, last_name, email, phone, journey_phase, country, admin_notes, ghl_contact_id")
        .eq("id", crmLeadId)
        .single(),
      supabase
        .from("blog_posts")
        .select("title, slug, category")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("customer_profiles")
        .select("explicit_preferences, inferred_preferences, favorite_projects, viewed_projects, viewed_blog_posts, lead_temperature, engagement_data")
        .eq("crm_lead_id", crmLeadId)
        .maybeSingle(),
      supabase
        .from("ghl_contact_appointments")
        .select("start_time, title, local_notes, summary_headline, summary_short")
        .eq("crm_lead_id", crmLeadId)
        .order("start_time", { ascending: false })
        .limit(5),
      supabase
        .from("lead_nurture_actions")
        .select("suggested_action, action_type, due_date, completed_at, resource_url, action_result, action_result_note")
        .eq("crm_lead_id", crmLeadId)
        .order("created_at", { ascending: false }),
      supabase
        .from("manual_events")
        .select("event_date, event_type, title, description, notes, summary_full, summary_category, key_topics")
        .eq("crm_lead_id", crmLeadId)
        .order("event_date", { ascending: false })
        .limit(10),
    ]);

    const lead = leadResult.data;
    const blogPosts = blogResult.data || [];
    const profile = profileResult.data;
    const previousAppointments = appointmentsResult.data || [];
    const existingActions = existingActionsResult.data || [];
    const manualEvents = manualEventsResult.data || [];

    // Build manual events context
    let manualEventsContext = '';
    if (manualEvents.length > 0) {
      const eventLines = manualEvents
        .reverse()
        .map((e: any) => {
          const date = e.event_date ? new Date(e.event_date).toLocaleDateString('nl-NL') : 'onbekend';
          const title = e.title || 'Evenement';
          const type = e.event_type || 'onbekend';
          const content = e.summary_full || e.notes || e.description || '';
          const topics = e.key_topics?.length ? `Topics: ${e.key_topics.join(', ')}` : '';
          return `- ${date}: [${type}] ${title}${content ? ` — ${content}` : ''}${topics ? `\n  ${topics}` : ''}`;
        })
        .join('\n');
      manualEventsContext = `\nHandmatige events & notities (chronologisch):\n${eventLines}`;
    }

    // Extract profile preferences
    const explicit = (profile?.explicit_preferences as any) || {};
    const inferred = (profile?.inferred_preferences as any) || {};

    // Fetch favorite project details if available
    let favoriteProjectNames: string[] = [];
    if (profile?.favorite_projects?.length) {
      const { data: projects } = await supabase
        .from("projects")
        .select("name, city, region")
        .in("id", profile.favorite_projects);
      
      if (projects?.length) {
        favoriteProjectNames = projects.map((p: any) => `${p.name} (${p.city || p.region || 'onbekend'})`);
      }
    }

    // Build lead context
    const leadContext = lead
      ? `Klant: ${lead.first_name || ''} ${lead.last_name || ''}, Email: ${lead.email || 'onbekend'}, Fase: ${lead.journey_phase || 'orientatie'}, Land: ${lead.country || 'onbekend'}`
      : '';

    // Build conversation history
    let conversationHistory = '';
    if (previousAppointments.length > 0) {
      const historyLines = previousAppointments
        .reverse()
        .map((a: any) => {
          const date = a.start_time ? new Date(a.start_time).toLocaleDateString('nl-NL') : 'onbekend';
          const headline = a.summary_headline || a.title || 'Gesprek';
          const summary = a.summary_short || '';
          const details = a.local_notes || '';
          return `- ${date}: ${headline}${summary ? ` — ${summary}` : ''}${details ? `\n  Gespreksdetails: ${details}` : ''}`;
        })
        .join('\n');
      conversationHistory = `\nGesprekshistorie (vorige gesprekken, chronologisch):\n${historyLines}`;
    }

    // Build existing actions context with feedback data
    let existingActionsContext = '';
    if (existingActions.length > 0) {
      const actionLines = existingActions.map((a: any) => {
        let status = a.completed_at ? '✅ Afgerond' : `⏳ Gepland (${a.due_date || 'geen datum'})`;
        if (a.action_result) {
          const resultLabels: Record<string, string> = {
            response_received: '✅ Reactie ontvangen',
            no_response: '❌ Geen reactie',
            appointment_made: '📅 Afspraak gemaakt',
            unsubscribed: '🚫 Afgemeld',
          };
          status = resultLabels[a.action_result] || a.action_result;
        }
        let line = `- [${status}] ${a.suggested_action} (${a.action_type})${a.resource_url ? ` → ${a.resource_url}` : ''}`;
        if (a.action_result_note) {
          line += `\n  Reactie-notitie: "${a.action_result_note}"`;
        }
        return line;
      }).join('\n');
      existingActionsContext = `\nBestaande nurture acties voor deze lead (inclusief feedback):\n${actionLines}`;
    }

    // Build feedback summary for channel preference analysis
    let feedbackSummary = '';
    const actionsWithFeedback = existingActions.filter((a: any) => a.action_result);
    if (actionsWithFeedback.length > 0) {
      const channelResults: Record<string, { responded: number; noResponse: number }> = {};
      for (const a of actionsWithFeedback) {
        if (!channelResults[a.action_type]) channelResults[a.action_type] = { responded: 0, noResponse: 0 };
        if (a.action_result === 'response_received' || a.action_result === 'appointment_made') {
          channelResults[a.action_type].responded++;
        } else if (a.action_result === 'no_response') {
          channelResults[a.action_type].noResponse++;
        }
      }
      const channelLines = Object.entries(channelResults).map(([channel, stats]) => {
        return `- ${channel}: ${stats.responded} reactie(s), ${stats.noResponse} geen reactie`;
      }).join('\n');
      feedbackSummary = `\nKanaal-responsiviteit (op basis van eerdere acties):\n${channelLines}`;
    }

    // Build admin notes context
    let adminNotesContext = '';
    if (lead?.admin_notes) {
      adminNotesContext = `\nInterne notities makelaar:\n${lead.admin_notes}`;
    }

    // Build engagement data context
    let engagementContext = '';
    if (profile) {
      const engagement = (profile.engagement_data as any) || {};
      const engParts: string[] = [];
      if (engagement.total_visits) engParts.push(`Totaal bezoeken: ${engagement.total_visits}`);
      if (engagement.total_page_views) engParts.push(`Pagina's bekeken: ${engagement.total_page_views}`);
      if (engagement.total_project_views) engParts.push(`Projecten bekeken: ${engagement.total_project_views}`);
      if (engagement.total_time_on_site_seconds) {
        const hours = Math.floor(engagement.total_time_on_site_seconds / 3600);
        const mins = Math.floor((engagement.total_time_on_site_seconds % 3600) / 60);
        engParts.push(`Tijd op site: ${hours > 0 ? `${hours}u ` : ''}${mins}m`);
      }
      if (engagement.engagement_depth) engParts.push(`Engagement: ${engagement.engagement_depth}`);
      if (engParts.length) {
        engagementContext = `\nWebsite gedrag:\n${engParts.map(p => `- ${p}`).join('\n')}`;
      }
    }

    // Fetch viewed project names
    let viewedProjectsContext = '';
    if (profile?.viewed_projects?.length) {
      const viewedIds = profile.viewed_projects.slice(0, 10);
      const { data: viewedProjects } = await supabase
        .from("projects")
        .select("name, city")
        .in("id", viewedIds);
      if (viewedProjects?.length) {
        viewedProjectsContext = `\nLaatst bekeken projecten: ${viewedProjects.map((p: any) => `${p.name} (${p.city || ''})`).join(', ')}`;
      }
    }

    // Fetch viewed blog post titles
    let viewedBlogContext = '';
    if (profile?.viewed_blog_posts?.length) {
      const blogIds = profile.viewed_blog_posts.slice(0, 10);
      const { data: viewedBlogs } = await supabase
        .from("blog_posts")
        .select("title")
        .in("id", blogIds);
      if (viewedBlogs?.length) {
        viewedBlogContext = `\nGelezen artikelen: ${viewedBlogs.map((b: any) => `"${b.title}"`).join(', ')}`;
      }
    }

    // Build customer profile context
    let profileContext = '';
    if (profile) {
      const parts: string[] = [];
      if (explicit.budget_min || explicit.budget_max) {
        parts.push(`Budget: €${explicit.budget_min || '?'}k - €${explicit.budget_max || '?'}k`);
      }
      if (explicit.preferred_regions?.length) {
        parts.push(`Regio voorkeur: ${explicit.preferred_regions.join(', ')}`);
      }
      if (explicit.investment_goal) {
        parts.push(`Doel: ${explicit.investment_goal}`);
      }
      if (explicit.timeline) {
        parts.push(`Tijdlijn: ${explicit.timeline}`);
      }
      if (explicit.persona_type) {
        parts.push(`Persona: ${explicit.persona_type}`);
      }
      if (inferred?.common_cities?.length) {
        parts.push(`Meest bekeken regio's: ${inferred.common_cities.join(', ')}`);
      }
      if (profile.viewed_projects?.length) {
        parts.push(`Bekeken projecten: ${profile.viewed_projects.length}`);
      }
      if (favoriteProjectNames.length > 0) {
        parts.push(`Favoriete projecten: ${favoriteProjectNames.join(', ')}`);
      } else if (profile.favorite_projects?.length) {
        parts.push(`Favoriete projecten: ${profile.favorite_projects.length}`);
      }
      if (parts.length) {
        profileContext = `\nKlantprofiel:\n${parts.map(p => `- ${p}`).join('\n')}`;
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // STAP 1: ANALYSE — Begrijp de lead diepgaand
    // ═══════════════════════════════════════════════════════════════

    const rawContext = `${leadContext}
${profileContext}
${engagementContext}
${viewedProjectsContext}
${viewedBlogContext}
${feedbackSummary}
${conversationHistory}
${manualEventsContext}
${existingActionsContext}
${adminNotesContext}`;

    const analysisSystemPrompt = `Je bent een ervaren lead-analist voor Top Immo Spain, gespecialiseerd in het analyseren van klantrelaties rond vastgoedinvesteringen in Spanje.

Je taak is ALLEEN analyseren — je genereert GEEN acties. Je krijgt alle beschikbare data over een lead en maakt een diepgaande analyse.

ANALYSEER:
1. SITUATIE-SAMENVATTING: Wat is de huidige staat van deze lead? Waar staan ze in hun reis?
2. RELATIE-DIEPTE: Hoeveel interacties zijn er geweest? Hoe is de toon van de relatie? Is er al vertrouwen opgebouwd?
3. WAT IS AL BESPROKEN/GEDEELD: Welke onderwerpen, artikelen, calculators of content is al gedeeld of besproken? Wees specifiek.
4. BLOKKADES: Detecteer concrete blokkades die de klant tegenhouden (partner moet meebeslissen, financiering onduidelijk, huidige woning moet verkocht, twijfel over regio, etc.)
5. EMOTIONELE STAAT: Hoe voelt de klant zich? Enthousiast, twijfelend, onzeker, gefrustreerd, ongeduldig, afwachtend?
6. AANBEVOLEN STRATEGIE: Wat zou de volgende logische stap zijn? Push of pull? Afwachten of actief benaderen? Waarom?
7. PROFIEL-UPDATES: Wat kun je afleiden over persona_type, investment_goal, timeline, lead_temperature uit de data?
8. ESCALATIE: Moet deze lead misschien losgelaten worden? Na hoeveel rondes nurture-acties zonder respons is het tijd om te stoppen of de aanpak drastisch te wijzigen?
9. WEBSITE GEDRAG: Analyseer het website gedrag — welke projecten/artikelen bekijkt de klant? Wat zegt dit over hun interesses en intentie?
10. KANAAL-VOORKEUR: Bekijk de feedback op eerdere acties — via welk kanaal reageert de klant het best? Waar reageert de klant NIET op?

BELANGRIJK:
- Kijk naar het AANTAL bestaande nurture acties en of ze zijn afgerond. Als er meerdere rondes acties zijn zonder dat ze afgerond worden, is dat een signaal van non-respons.
- Kijk naar de TIJDLIJN van interacties — wanneer was het laatste echte contact?
- Bekijk feedback op eerdere acties (reactie ontvangen / geen reactie) om kanaalvoorkeur te bepalen.
- Analyseer website engagement (bezoeken, bekeken projecten, gelezen artikelen) als "warmte-signalen".
- Wees eerlijk en kritisch. Als de data beperkt is, zeg dat.`;

    const analysisUserPrompt = `Nieuwe gespreksnotities/context:
${notes}

Alle beschikbare data over deze lead:
${rawContext}

Analyseer deze lead grondig met de analyze_lead tool.`;

    console.log(`AI SDR Stap 1: Analyseer lead ${crmLeadId}...`);

    let analysis: any;
    try {
      analysis = await callAI(
        LOVABLE_API_KEY,
        [
          { role: "system", content: analysisSystemPrompt },
          { role: "user", content: analysisUserPrompt },
        ],
        [
          {
            type: "function",
            function: {
              name: "analyze_lead",
              description: "Gestructureerde analyse van een lead",
              parameters: {
                type: "object",
                properties: {
                  situation_summary: {
                    type: "string",
                    description: "Samenvatting van de huidige staat en positie van deze lead (2-4 zinnen)",
                  },
                  relationship_depth: {
                    type: "string",
                    description: "Beschrijving van de relatiediepte: aantal interacties, toon, vertrouwensniveau",
                  },
                  already_shared: {
                    type: "array",
                    items: { type: "string" },
                    description: "Lijst van content, onderwerpen of informatie die al gedeeld of besproken is",
                  },
                  detected_blockades: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", description: "Type blokkade: financiering, partner, timing, regio_twijfel, informatie_gebrek, anders" },
                        description: { type: "string", description: "Concrete beschrijving van de blokkade" },
                        severity: { type: "string", enum: ["low", "medium", "high"], description: "Ernst van de blokkade" },
                      },
                      required: ["type", "description", "severity"],
                      additionalProperties: false,
                    },
                    description: "Gedetecteerde blokkades die de klant tegenhouden",
                  },
                  emotional_state: {
                    type: "string",
                    description: "Emotionele staat van de klant: enthousiast, twijfelend, onzeker, gefrustreerd, ongeduldig, afwachtend, neutraal",
                  },
                  recommended_strategy: {
                    type: "string",
                    description: "Aanbevolen strategie voor de volgende stap: wat doen, waarom, push of pull?",
                  },
                  profile_updates: {
                    type: "object",
                    description: "Afgeleide profielgegevens. Laat velden leeg/null als niet af te leiden.",
                    properties: {
                      persona_type: { type: "string", description: "rendements-investeerder, lifestyle-genieter, voorzichtige ontdekker, of ander type" },
                      investment_goal: { type: "string", description: "rendement, eigen gebruik, combinatie, etc." },
                      timeline: { type: "string", description: "binnen 6 maanden, volgend jaar, geen haast, etc." },
                      lead_temperature: { type: "string", enum: ["hot", "warm", "cold"], description: "hot/warm/cold" },
                    },
                    additionalProperties: false,
                  },
                  escalation_needed: {
                    type: "boolean",
                    description: "Moet deze lead losgelaten worden of moet de aanpak drastisch wijzigen? True als meerdere rondes nurture zonder respons.",
                  },
                  escalation_reason: {
                    type: "string",
                    description: "Alleen invullen als escalation_needed=true. Reden waarom escalatie nodig is.",
                  },
                  nurture_round_count: {
                    type: "number",
                    description: "Geschat aantal eerdere nurture-rondes op basis van bestaande acties",
                  },
                  preferred_channel: {
                    type: "string",
                    description: "Voorkeurskanaal op basis van feedback-data: whatsapp, email, call, of null als onbekend",
                  },
                  behavioral_signals: {
                    type: "array",
                    items: { type: "string" },
                    description: "Gedragssignalen afgeleid van website-activiteit: bijv. 'Bekijkt veel projecten in Marbella', 'Heeft kosten-artikelen gelezen', 'Hoge engagement'",
                  },
                },
                required: ["situation_summary", "relationship_depth", "already_shared", "detected_blockades", "emotional_state", "recommended_strategy", "profile_updates", "escalation_needed", "nurture_round_count"],
                additionalProperties: false,
              },
            },
          },
        ],
        { type: "function", function: { name: "analyze_lead" } }
      );
    } catch (err: any) {
      if (err.status === 429 || err.status === 402) {
        return new Response(
          JSON.stringify({ error: err.status === 429 ? 'Rate limit exceeded' : 'Payment required' }),
          { status: err.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw err;
    }

    console.log(`AI SDR Stap 1 klaar: escalation=${analysis.escalation_needed}, rounds=${analysis.nurture_round_count}, state=${analysis.emotional_state}`);

    // ═══════════════════════════════════════════════════════════════
    // STAP 2: ACTIE-GENERATIE — Genereer concrete acties op basis van analyse
    // ═══════════════════════════════════════════════════════════════

    const phaseStrategy = getPhaseStrategy(lead?.journey_phase);
    const personaTone = getPersonaTone(
      analysis.profile_updates?.persona_type || explicit.persona_type,
      analysis.profile_updates?.investment_goal || explicit.investment_goal
    );
    const timingInstruction = getTimingInstruction(
      analysis.profile_updates?.lead_temperature || profile?.lead_temperature,
      analysis.profile_updates?.timeline || explicit.timeline
    );

    // Build content catalog for step 2
    const articlesList = blogPosts
      .map((p: any) => `- "${p.title}" (/blog/${p.slug}) [${p.category}]`)
      .join('\n');

    const calculators = [
      { name: 'Aankoopkosten calculator', path: '/dashboard/calculators/aankoopkosten' },
      { name: 'ROI calculator', path: '/dashboard/calculators/roi' },
      { name: 'Leningcalculator', path: '/dashboard/calculators/lening' },
      { name: 'Box 3 calculator', path: '/dashboard/calculators/box3' },
    ];
    const calculatorsList = calculators.map(c => `- ${c.name} (${c.path})`).join('\n');

    const contentCatalog = `
Beschikbare content (gebruik exacte URLs):

Artikelen:
${articlesList || '(geen artikelen beschikbaar)'}

Calculators:
${calculatorsList}

Oriëntatiegids: beschikbaar via /dashboard/orientatie`;

    // Format analysis for step 2
    const analysisForStep2 = `
═══ LEAD-ANALYSE (van stap 1) ═══
SITUATIE: ${analysis.situation_summary}
RELATIE-DIEPTE: ${analysis.relationship_depth}
EMOTIONELE STAAT: ${analysis.emotional_state}
AANBEVOLEN STRATEGIE: ${analysis.recommended_strategy}
ESCALATIE NODIG: ${analysis.escalation_needed ? `JA — ${analysis.escalation_reason || 'meerdere rondes zonder respons'}` : 'Nee'}
NURTURE-RONDES: ${analysis.nurture_round_count || 0}
BLOKKADES: ${analysis.detected_blockades?.length ? analysis.detected_blockades.map((b: any) => `[${b.severity}] ${b.type}: ${b.description}`).join('; ') : 'Geen gedetecteerd'}
AL GEDEELD: ${analysis.already_shared?.length ? analysis.already_shared.join(', ') : 'Niets bekend'}
${favoriteProjectNames.length > 0 ? `FAVORIETE PROJECTEN: ${favoriteProjectNames.join(', ')}` : ''}
${analysis.preferred_channel ? `VOORKEURSKANAAL: ${analysis.preferred_channel}` : ''}
${analysis.behavioral_signals?.length ? `GEDRAGSSIGNALEN: ${analysis.behavioral_signals.join('; ')}` : ''}
═══════════════════════════════════`;

    const actionSystemPrompt = `Je bent een AI Sales Development Representative (SDR) voor Top Immo Spain. Je genereert concrete opvolgacties op basis van een analyse die een collega-analist voor je heeft gemaakt.

${phaseStrategy}

${personaTone}

${timingInstruction}

KANAAL-SPECIFIEKE INSTRUCTIES:
- WhatsApp: Kort (2-3 zinnen max), informeel, emoji is ok. Alleen links, geen bijlagen.
- Email: Gestructureerd met context en duidelijke CTA. Mag langer en formeler.
- Call: Formuleer als gesprekspunten met OPEN VRAGEN. Geen script, wel duidelijke doelen.
- Content: Specifiek artikel/calculator/gids aanraden met exacte URL.

KANAAL-VOORKEUR (BELANGRIJK):
- Als de analyse een VOORKEURSKANAAL vermeldt, gebruik dat kanaal voor de belangrijkste actie.
- Als de klant nooit reageert op email maar wel op WhatsApp, gebruik WhatsApp.
- Als er geen kanaalvoorkeur bekend is, wissel af tussen kanalen.

GEDRAGSSIGNALEN (BELANGRIJK):
- Als de analyse GEDRAGSSIGNALEN bevat, gebruik deze om je acties te personaliseren.
- Verwijs naar specifieke projecten die de klant recent heeft bekeken op de website.
- Als de klant artikelen over kosten/fiscaliteit leest, stuur relevante calculators.
- Als de klant veel projecten bekijkt, is dit een warmte-signaal — overweeg een belactie.

FEEDBACK-CONTEXT:
- Als er reactie-notities zijn bij eerdere acties, gebruik die context om het gesprek voort te zetten.
- Bijvoorbeeld: als de klant eerder heeft gevraagd om info over Marbella, verwijs daar direct naar.

PULL-STRATEGIE (BELANGRIJK):
Niet alleen content pushen — stel ook open vragen die de klant aan het denken zetten:
- "Wat houdt je op dit moment het meest bezig rond je plannen in Spanje?"
- "Heb je al een idee welke regio het meest bij je past?"
- "Wat zou je over de streep trekken om de volgende stap te zetten?"
Doel: de klant laten PRATEN over hun situatie, niet alleen content consumeren.

FLEXIBEL AANTAL ACTIES:
- Genereer 1-4 acties, afhankelijk van de situatie.
- Soms is 1 goede actie beter dan 4 matige.
- Als escalatie nodig is, genereer maximaal 1 laatste "hail mary" actie of stel voor om te pauzeren.

ANTI-HERHALING:
- De analyse bevat wat al gedeeld/besproken is. Stel GEEN content voor die al gedeeld is.
- Focus op de VOLGENDE LOGISCHE STAP.

BEZICHTIGINGSREIS-DETECTIE:
Als de analyse een bezoekwens vermeldt, genereer ALTIJD een trip_planning actie.

${contentCatalog}`;

    const actionUserPrompt = `${analysisForStep2}

Oorspronkelijke gespreksnotities:
${notes}

${leadContext ? `Lead: ${leadContext}` : ''}

Genereer opvolgacties met de generate_nurture_actions tool. Baseer je acties op de bovenstaande analyse. Gebruik de pull-strategie: stel open vragen naast content-suggesties.`;

    console.log(`AI SDR Stap 2: Genereer acties voor lead ${crmLeadId}...`);

    let result: any;
    try {
      result = await callAI(
        LOVABLE_API_KEY,
        [
          { role: "system", content: actionSystemPrompt },
          { role: "user", content: actionUserPrompt },
        ],
        [
          {
            type: "function",
            function: {
              name: "generate_nurture_actions",
              description: "Generate follow-up actions for a nurture lead",
              parameters: {
                type: "object",
                properties: {
                  context_summary: {
                    type: "string",
                    description: "Korte samenvatting van het gesprek en de analyse (1-2 zinnen)",
                  },
                  urgency_note: {
                    type: "string",
                    description: "Optioneel: beschrijving van gedetecteerde blokkade of urgentie. Leeg laten als geen blokkade.",
                  },
                  actions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        suggested_action: {
                          type: "string",
                          description: "Beschrijving van de opvolgactie, afgestemd op het kanaal",
                        },
                        action_type: {
                          type: "string",
                          enum: ["email", "call", "content", "whatsapp", "trip_planning"],
                          description: "Type actie",
                        },
                        days_from_now: {
                          type: "number",
                          description: "Aantal dagen vanaf nu voor de due date",
                        },
                        resource_url: {
                          type: "string",
                          description: "Optionele deeplink URL naar content",
                        },
                        resource_type: {
                          type: "string",
                          enum: ["article", "calculator", "guide", "project"],
                          description: "Type resource",
                        },
                      },
                      required: ["suggested_action", "action_type", "days_from_now"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["context_summary", "actions"],
                additionalProperties: false,
              },
            },
          },
        ],
        { type: "function", function: { name: "generate_nurture_actions" } }
      );
    } catch (err: any) {
      if (err.status === 429 || err.status === 402) {
        return new Response(
          JSON.stringify({ error: err.status === 429 ? 'Rate limit exceeded' : 'Payment required' }),
          { status: err.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw err;
    }

    console.log(`AI SDR Stap 2 klaar: ${result.actions?.length || 0} acties gegenereerd voor lead ${crmLeadId}`);

    const now = new Date();

    // Build context summary with urgency note
    let contextSummary = result.context_summary;
    if (result.urgency_note) {
      contextSummary += ` ⚠️ ${result.urgency_note}`;
    }

    // Auto-profiling from step 1 analysis
    const profileUpdates = analysis.profile_updates;
    if (profileUpdates && Object.keys(profileUpdates).length > 0) {
      try {
        const { data: currentProfile } = await supabase
          .from("customer_profiles")
          .select("explicit_preferences, lead_temperature")
          .eq("crm_lead_id", crmLeadId)
          .maybeSingle();

        if (currentProfile) {
          const currentPrefs = (currentProfile.explicit_preferences as any) || {};
          const updates: any = {};
          let hasUpdates = false;

          if (!currentPrefs.persona_type && profileUpdates.persona_type) {
            updates.persona_type = profileUpdates.persona_type;
            hasUpdates = true;
          }
          if (!currentPrefs.investment_goal && profileUpdates.investment_goal) {
            updates.investment_goal = profileUpdates.investment_goal;
            hasUpdates = true;
          }
          if (!currentPrefs.timeline && profileUpdates.timeline) {
            updates.timeline = profileUpdates.timeline;
            hasUpdates = true;
          }

          if (hasUpdates) {
            const mergedPrefs = { ...currentPrefs, ...updates };
            await supabase
              .from("customer_profiles")
              .update({ explicit_preferences: mergedPrefs, updated_at: new Date().toISOString() })
              .eq("crm_lead_id", crmLeadId);
            console.log(`AI SDR: auto-profiled lead ${crmLeadId} with:`, updates);
          }

          if (!currentProfile.lead_temperature && profileUpdates.lead_temperature) {
            await supabase
              .from("customer_profiles")
              .update({ lead_temperature: profileUpdates.lead_temperature, updated_at: new Date().toISOString() })
              .eq("crm_lead_id", crmLeadId);
            console.log(`AI SDR: set lead_temperature to ${profileUpdates.lead_temperature} for lead ${crmLeadId}`);
          }
        }
      } catch (profileErr) {
        console.error("AI SDR: failed to auto-profile:", profileErr);
      }
    }

    // Build actions with dates
    const actionsToInsert = result.actions.map((action: any) => {
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + (action.days_from_now || 1));

      return {
        crm_lead_id: crmLeadId,
        suggested_action: action.suggested_action,
        action_type: action.action_type,
        due_date: dueDate.toISOString().split("T")[0],
        context_summary: contextSummary,
        source_appointment_id: appointmentId || null,
        resource_url: action.resource_url || null,
        resource_type: action.resource_type || null,
      };
    });

    // In dry run mode, return actions without saving
    if (dryRun) {
      const previewActions = actionsToInsert.map((action: any, index: number) => ({
        ...action,
        id: `preview-${index}`,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        completed_at: null,
        completed_by: null,
        generated_message: null,
        generated_message_subject: null,
      }));

      return new Response(
        JSON.stringify({
          success: true,
          dryRun: true,
          actions: previewActions,
          context: contextSummary,
          analysis: {
            situation_summary: analysis.situation_summary,
            emotional_state: analysis.emotional_state,
            recommended_strategy: analysis.recommended_strategy,
            escalation_needed: analysis.escalation_needed,
            escalation_reason: analysis.escalation_reason,
            detected_blockades: analysis.detected_blockades,
            nurture_round_count: analysis.nurture_round_count,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert actions into database
    const { error: insertError } = await supabase
      .from("lead_nurture_actions")
      .insert(actionsToInsert);

    if (insertError) {
      console.error("Error inserting nurture actions:", insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save actions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, actionsCount: actionsToInsert.length, context: contextSummary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in generate-nurture-actions:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
