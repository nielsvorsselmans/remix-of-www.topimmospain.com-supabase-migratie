import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PHASE_ORDER = ['geblokkeerd', 'reservatie', 'koopcontract', 'voorbereiding', 'akkoord', 'overdracht', 'nazorg'] as const;

function daysBetween(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function escalationLevel(waitingSince: string | null): string {
  if (!waitingSince) return 'friendly';
  const days = daysBetween(waitingSince);
  if (days < 7) return 'friendly';
  if (days < 14) return 'urgent';
  return 'formal';
}

function detectActivePhase(openMilestones: any[], notaryPassed: boolean): string | null {
  for (const phase of PHASE_ORDER) {
    if (phase === 'nazorg') {
      if (notaryPassed && openMilestones.some((m: any) => m.phase === phase)) {
        return 'nazorg';
      }
      continue;
    }
    if (openMilestones.some((m: any) => m.phase === phase)) {
      return phase;
    }
  }
  return null;
}

function getPhaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    reservatie: 'Reservatie',
    koopcontract: 'Koopcontract',
    voorbereiding: 'Voorbereiding',
    akkoord: 'Akkoord',
    overdracht: 'Overdracht',
    nazorg: 'Nazorg',
  };
  return labels[phase] || phase;
}

async function buildSaleContext(supabase: any, saleId: string) {
  const [saleResult, milestonesResult, paymentsResult, customersResult, choicesResult, remindersResult] = await Promise.all([
    supabase.from("sales").select("id, property_id, status, created_at, notary_date, expected_delivery_date, projects:project_id(name, development_ref, city)").eq("id", saleId).single(),
    supabase.from("sale_milestones").select("id, title, description, phase, priority, target_date, completed_at, waiting_since, waiting_for, order_index, template_key, prerequisite_for").eq("sale_id", saleId).order("order_index", { ascending: true }),
    supabase.from("sale_payments").select("id, title, amount, due_date, status, paid_at, waiting_since, waiting_for").eq("sale_id", saleId).order("due_date", { ascending: true }),
    supabase.from("sale_customers").select("role, crm_lead:crm_lead_id(first_name, last_name, email, phone)").eq("sale_id", saleId),
    supabase.from("sale_choices").select("id, title, type, status, category, description, notes, requested_at, quote_requested_at, quote_uploaded_at, quote_amount, via_developer, is_included, gifted_by_tis, customer_decision, created_at, completed_at, waiting_since, waiting_for").eq("sale_id", saleId),
    supabase.from("aftersales_reminders").select("id, reminder_date, note, status, milestone_id").eq("sale_id", saleId).eq("status", "pending").order("reminder_date", { ascending: true }),
  ]);

  if (saleResult.error || !saleResult.data) return null;

  const sale = saleResult.data;
  const milestones = milestonesResult.data || [];
  const payments = paymentsResult.data || [];
  const customers = customersResult.data || [];
  const allChoices = choicesResult?.data || [];
  const pendingReminders = remindersResult?.data || [];
  const project = sale.projects as any;
  const openMilestones = milestones.filter((m: any) => !m.completed_at);
  const completedMilestones = milestones.filter((m: any) => m.completed_at);
  const waitingMilestones = openMilestones.filter((m: any) => m.waiting_since);
  const overdueMilestones = openMilestones.filter((m: any) => m.target_date && new Date(m.target_date) < new Date());
  const unpaidPayments = payments.filter((p: any) => !p.paid_at);
  const buyerCustomers = customers.filter((c: any) => c.role === 'buyer');
  const openChoices = allChoices.filter((c: any) => !c.completed_at);

  // Phase-awareness
  const today = new Date();
  const notaryDate = sale.notary_date;
  const notaryPassed = notaryDate ? new Date(notaryDate) <= today : false;
  const activePhase = detectActivePhase(openMilestones, notaryPassed);

  const parts: string[] = [];
  parts.push(`Verkoop: ${project?.name || 'Onbekend project'} in ${project?.city || 'onbekend'}`);
  parts.push(`Ontwikkelaar: ${project?.development_ref || 'Onbekend'}`);
  parts.push(`Status: ${sale.status}`);

  // Notary date context
  if (notaryDate) {
    const daysUntil = Math.ceil((new Date(notaryDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (notaryPassed) {
      parts.push(`Notarisdatum: ${notaryDate} (${Math.abs(daysUntil)}d geleden — nazorgtaken zijn nu relevant)`);
    } else {
      parts.push(`Notarisdatum: ${notaryDate} (over ${daysUntil} dagen — nazorgtaken zijn NOG NIET relevant)`);
    }
  } else {
    parts.push(`Notarisdatum: nog niet ingepland`);
  }
  if (sale.expected_delivery_date) {
    parts.push(`Verwachte oplevering: ${sale.expected_delivery_date}`);
  }

  if (buyerCustomers.length > 0) {
    const names = buyerCustomers.map((c: any) => {
      const lead = c.crm_lead as any;
      return lead ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim() : 'Onbekend';
    }).join(', ');
    parts.push(`Klant(en): ${names}`);
  }

  parts.push(`\nTaken: ${milestones.length} totaal (${completedMilestones.length} voltooid, ${openMilestones.length} open)`);

  // === FASE-BEWUSTE CONTEXT ===
  if (activePhase) {
    const phaseIndex = PHASE_ORDER.indexOf(activePhase as any);
    parts.push(`\n🎯 ACTIEVE FASE: ${getPhaseLabel(activePhase).toUpperCase()} (fase ${phaseIndex + 1}/${PHASE_ORDER.length})`);

    // Active phase tasks
    const activePhaseOpenTasks = openMilestones.filter((m: any) => m.phase === activePhase);
    const activePhaseCompletedTasks = completedMilestones.filter((m: any) => m.phase === activePhase);
    const totalInPhase = activePhaseOpenTasks.length + activePhaseCompletedTasks.length;
    parts.push(`Voortgang: ${activePhaseCompletedTasks.length}/${totalInPhase} taken voltooid`);

    parts.push(`\nActieve taken in fase "${getPhaseLabel(activePhase)}" (${activePhaseOpenTasks.length}):`);
    activePhaseOpenTasks.forEach((m: any) => {
      const info = [`- [${m.id}] "${m.title}" (prioriteit: ${m.priority || 'normaal'})`];
      if (m.target_date) info.push(`  deadline: ${m.target_date}`);
      if (m.description) info.push(`  notitie: ${m.description}`);
      if (m.waiting_since) info.push(`  ⏳ wacht ${daysBetween(m.waiting_since)}d op: ${m.waiting_for || 'onbekend'} (${escalationLevel(m.waiting_since)})`);
      if (m.target_date && new Date(m.target_date) < today) info.push(`  ⚠️ ${daysBetween(m.target_date)}d over deadline`);
      // Dynamic prerequisites
      if (m.prerequisite_for) {
        const targetTask = milestones.find((t: any) => t.id === m.prerequisite_for);
        if (targetTask) info.push(`  🔗 prerequisite voor: "${targetTask.title}"`);
      }
      const dynamicBlockers = milestones.filter((t: any) => t.prerequisite_for === m.id && !t.completed_at);
      if (dynamicBlockers.length > 0) {
        info.push(`  📌 geblokkeerd door: "${dynamicBlockers[0].title}" (eerst voltooien)`);
      }
      parts.push(info.join('\n'));
    });

    // Future phases
    const futurePhaseTasks: Record<string, any[]> = {};
    for (const phase of PHASE_ORDER) {
      if (phase === activePhase) continue;
      const pIdx = PHASE_ORDER.indexOf(phase);
      if (pIdx <= phaseIndex) continue; // already passed
      if (phase === 'nazorg' && !notaryPassed) {
        const nazorgTasks = openMilestones.filter((m: any) => m.phase === 'nazorg');
        if (nazorgTasks.length > 0) {
          futurePhaseTasks['nazorg'] = nazorgTasks;
        }
        continue;
      }
      const tasks = openMilestones.filter((m: any) => m.phase === phase);
      if (tasks.length > 0) {
        futurePhaseTasks[phase] = tasks;
      }
    }

    if (Object.keys(futurePhaseTasks).length > 0) {
      parts.push(`\nGeplande taken voor latere fases:`);
      for (const [phase, tasks] of Object.entries(futurePhaseTasks)) {
        const note = phase === 'nazorg' ? ' (pas relevant na notarisdatum)' : '';
        parts.push(`  ${getPhaseLabel(phase)}${note}: ${tasks.length} open taken`);
        tasks.forEach((m: any) => {
          parts.push(`    - "${m.title}"`);
        });
      }
    }
  } else {
    parts.push(`\n✅ Alle fases zijn afgerond.`);
  }

  // Enrich choices with waiting duration info (same logic as briefing)
  const enrichedChoices = openChoices.map((c: any) => {
    const waitDate = c.quote_requested_at || c.requested_at || c.created_at;
    const daysWaiting = waitDate ? daysBetween(waitDate) : 0;
    const choiceEscalation = daysWaiting > 14 ? 'formal' : daysWaiting > 7 ? 'urgent' : 'friendly';
    
    let waitDescription = '';
    if (c.status === 'pending_quote' || c.status === 'sent_to_developer') {
      waitDescription = `offerte aangevraagd ${daysWaiting}d geleden, nog geen reactie van ontwikkelaar`;
    } else if (c.status === 'quote_received' && !c.customer_decision) {
      const receiveDate = c.quote_uploaded_at || c.created_at;
      const daysReceived = receiveDate ? daysBetween(receiveDate) : 0;
      waitDescription = `offerte ontvangen ${daysReceived}d geleden, wacht op klantbeslissing`;
    } else if ((c.status === 'open' || c.status === 'proposed_to_customer') && c.via_developer) {
      waitDescription = `moet nog bij ontwikkelaar worden aangevraagd`;
    } else if (c.status === 'waiting_confirmation') {
      waitDescription = `wacht op bevestiging van ontwikkelaar (${daysWaiting}d)`;
    }

    return { ...c, daysWaiting, choiceEscalation, waitDescription, isExplicitlyWaiting: !!c.waiting_since };
  });

  const pendingDevChoices = enrichedChoices.filter((c: any) => 
    c.status === 'pending_quote' || c.status === 'sent_to_developer' || c.status === 'waiting_confirmation'
  );
  const needsRequestChoices = enrichedChoices.filter((c: any) => 
    (c.status === 'open' || c.status === 'proposed_to_customer') && c.via_developer
  );
  const awaitingDecisionChoices = enrichedChoices.filter((c: any) => 
    c.status === 'quote_received' && !c.customer_decision
  );
  const completedChoices = allChoices.filter((c: any) => c.completed_at);

  if (enrichedChoices.length > 0) {
    parts.push(`\n=== KEUZES & EXTRA'S (${enrichedChoices.length} open, ${completedChoices.length} afgerond) ===`);
    
    if (pendingDevChoices.length > 0) {
      parts.push(`\n⚠️ WACHT OP OFFERTE VAN ONTWIKKELAAR (${pendingDevChoices.length}):`);
      pendingDevChoices.forEach((c: any) => {
        let line = `- [${c.id}] "${c.title}" (categorie: ${c.category || 'onbekend'}) — ${c.waitDescription} — escalatie: ${c.choiceEscalation}`;
        if (c.waiting_since) line += ` — ⏳ wacht ${daysBetween(c.waiting_since)}d op: ${c.waiting_for || 'onbekend'}`;
        if (c.notes) line += ` — notitie: ${c.notes}`;
        parts.push(line);
      });
    }
    
    if (needsRequestChoices.length > 0) {
      parts.push(`\n📋 NOG NIET AANGEVRAAGD BIJ ONTWIKKELAAR (${needsRequestChoices.length}):`);
      needsRequestChoices.forEach((c: any) => {
        parts.push(`- [${c.id}] "${c.title}" (categorie: ${c.category || 'onbekend'})${c.description ? ` — ${c.description}` : ''}`);
      });
    }
    
    if (awaitingDecisionChoices.length > 0) {
      parts.push(`\n🔄 OFFERTE ONTVANGEN, WACHT OP KLANTBESLISSING (${awaitingDecisionChoices.length}):`);
      awaitingDecisionChoices.forEach((c: any) => {
        parts.push(`- [${c.id}] "${c.title}" — €${c.quote_amount || '?'} — ${c.waitDescription}`);
      });
    }
    
    const otherChoices = enrichedChoices.filter((c: any) => 
      !pendingDevChoices.includes(c) && !needsRequestChoices.includes(c) && !awaitingDecisionChoices.includes(c)
    );
    if (otherChoices.length > 0) {
      parts.push(`\nOverige openstaande keuzes (${otherChoices.length}):`);
      otherChoices.forEach((c: any) => {
        parts.push(`- [${c.id}] "${c.title}" (status: ${c.status}, type: ${c.type}${c.is_included ? ', inbegrepen' : ''}${c.gifted_by_tis ? ', cadeau van TIS' : ''})`);
      });
    }
  }

  if (payments.length > 0) {
    parts.push(`\nBetalingen (${payments.length} totaal):`);
    payments.forEach((p: any) => {
      const statusLabel = p.paid_at ? '✅ betaald' : '⏳ openstaand';
      let line = `- [${p.id}] "${p.title}" €${p.amount} — vervaldatum: ${p.due_date || 'onbekend'} — ${statusLabel}`;
      if (p.waiting_since) line += ` — ⏳ wacht ${daysBetween(p.waiting_since)}d op: ${p.waiting_for || 'onbekend'} (${escalationLevel(p.waiting_since)})`;
      parts.push(line);
    });
  }

  if (pendingReminders.length > 0) {
    parts.push(`\nGeplande herinneringen/follow-ups (${pendingReminders.length}):`);
    pendingReminders.forEach((r: any) => {
      const overdue = new Date(r.reminder_date) < new Date() ? ' ⚠️ VERLOPEN' : '';
      parts.push(`- [${r.id}] ${r.reminder_date}${overdue}: "${r.note || 'geen notitie'}"${r.milestone_id ? ` (gekoppeld aan milestone ${r.milestone_id})` : ''}`);
    });
  }

  return { context: parts.join('\n'), milestones, openMilestones, activePhase };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { saleId, messages } = await req.json();
    if (!saleId || !messages?.length) {
      return new Response(JSON.stringify({ error: 'Missing saleId or messages' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.user.id;

    // Build sale context
    const saleData = await buildSaleContext(supabase, saleId);
    if (!saleData) {
      return new Response(JSON.stringify({ error: 'Sale not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const activePhaseLabel = saleData.activePhase ? getPhaseLabel(saleData.activePhase) : 'onbekend';

    // Fetch custom prompt and model from ai_prompts table
    let customPrompt: string | null = null;
    let customModel: string | null = null;
    try {
      const { data: promptConfig } = await supabase
        .from("ai_prompts")
        .select("prompt_text, model_id")
        .eq("prompt_key", "aftersales_copilot_chat")
        .maybeSingle();
      if (promptConfig) {
        customPrompt = promptConfig.prompt_text;
        customModel = promptConfig.model_id;
      }
    } catch (e) {
      console.error("Failed to fetch custom prompt, using default:", e);
    }

    const basePrompt = customPrompt || `Je bent een intelligente aftersales-assistent bij een vastgoedmakelaar in Spanje. Je helpt de aftersales-manager met het opvolgen van verkopen.

FASE-BEWUSTE INSTRUCTIES:
- De verkoop doorloopt 6 fases in volgorde: Reservatie → Koopcontract → Voorbereiding → Akkoord → Overdracht → Nazorg.
- Focus je op de ACTIEVE FASE.
- Taken uit toekomstige fases zijn "gepland voor later". Noem ze alleen als de manager er specifiek naar vraagt.
- Nazorgtaken zijn NIET relevant zolang de notarisdatum niet verstreken is.

VOORWAARDEN VOOR FASEDOORGANG:
- Reservatie → Koopcontract: reserveringscontract ondertekend, aanbetaling voldaan
- Koopcontract → Voorbereiding: koopcontract ondertekend door beide partijen
- Voorbereiding → Akkoord: alle specificaties en opties bepaald
- Akkoord → Overdracht: alle akkoorden goedgekeurd, financiering rond
- Overdracht → Nazorg: notariële akte gepasseerd, sleutels overgedragen

TAAK-VOLGORDE (aanbevolen prioritering per fase, niet blokkerend):

RESERVATIE:
1. Koperdata verzamelen → 2. Reservatiecontract uploaden → 3. Advocaat informeren
4. Reservatiecontract: klant tekent → 5. Developer tekent (altijd NA klant)
6. Betaalplan opstellen → 7. Facturen genereren (volgt uit betaalplan)

KOOPCONTRACT:
1. Bankgarantie regelen → 2. Koopcontract opstellen (vereist bankgarantie)
3. Klant ondertekent koopcontract → 4. Developer ondertekent
- Eerste aanbetaling pas opvragen NA bankgarantie

VOORBEREIDING → AKKOORD (cross-fase):
- Elektriciteitsplan moet klaar zijn VÓÓR akkoord elektriciteit
- Afmetingenplan moet klaar zijn VÓÓR akkoord grondplan
- Extra's documentatie moet klaar zijn VÓÓR akkoord extra's

AKKOORD:
1. Offertes aanvragen → 2. Offertes ontvangen → 3. Beslissing nemen
4. Alle akkoorden (grondplan + elektriciteit + extra's) → 5. Definitief akkoord → 6. Doorgeven aan ontwikkelaar

OVERDRACHT:
1. Notarisdatum vastleggen → 2. Snagging/oplevering (rond opleverdatum)

NAZORG:
1. Notariële akte → 2. Nutsvoorzieningen overzetten
3. Follow-up call → 4. Financiële controle → 5. Dossier archiveren

Gebruik deze volgorde om prioriteiten te stellen in je advies. Als een taak "te vroeg" wordt afgevinkt is dat prima, maar adviseer altijd de optimale volgorde.

JOUW TAKEN:
1. Beantwoord vragen over de status, met focus op de actieve fase
2. Genereer berichten op verzoek
3. Stel acties voor wanneer relevant
4. Waarschuw als voorwaarden voor de volgende fase ontbreken

REGELS:
- Communiceer in het Nederlands
- Wees concreet en actiegericht
- Als je acties voorstelt, gebruik ALTIJD de propose_actions tool
- Gebruik de milestone IDs uit de context bij acties

WACHTSTATUS & ESCALATIE:
- < 3 dagen: geparkeerd, geen actie nodig
- 3-6 dagen: check of opvolging nodig is
- 7-13 dagen: urgente opvolging
- 14+ dagen: formele escalatie

DUPLICAAT-PREVENTIE:
- Controleer ALTIJD bestaande taken VOORDAT je add_followup_task gebruikt.
- COMBINEER NOOIT set_reminder + add_followup_task voor hetzelfde onderwerp.

BESCHRIJVINGEN BIJ ACTIES:
- "description" moet ALTIJD de NAAM van de taak, WAT er gebeurt, en WAAROM bevatten.

BESCHIKBARE ACTIE-TYPES:
- postpone_task, set_reminder, update_priority, mark_waiting, complete_task, add_followup_task, schedule_notary, update_payment, add_payment, delete_payment
- update_choice_status, add_choice_note, request_developer_quote

MARK_WAITING WERKT VOOR ALLE ENTITEITEN:
- Voor taken: gebruik milestone_id + waiting_for
- Voor keuzes/offertes: gebruik choice_id + waiting_for
- Voor betalingen: gebruik payment_id + waiting_for

KEUZE-ACTIES:
- update_choice_status: Wijzig de status van een keuze (choice_id + new_status vereist). Gebruik statussen: open, proposed_to_customer, sent_to_developer, pending_quote, quote_received, waiting_confirmation, approved, rejected, completed, not_wanted.
- add_choice_note: Voeg een notitie toe aan een keuze (choice_id + note vereist).
- request_developer_quote: Markeer een keuze als "offerte aangevraagd bij ontwikkelaar" — zet status naar sent_to_developer en registreert quote_requested_at (choice_id vereist).`;

    const modelToUse = customModel || "google/gemini-2.5-flash";

    const todayISO = new Date().toISOString().split('T')[0];
    const todayHuman = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date());

    const systemPrompt = `${basePrompt}

VANDAAG is: ${todayISO} (${todayHuman}).
ALLE datums die je voorstelt (reminder_date, new_date, target_date, notary_date, due_date) MOETEN in de toekomst liggen. Stel NOOIT een datum voor die vóór vandaag valt.
UITZONDERING: Bij schedule_notary mag een datum in het verleden worden voorgesteld als de makelaar bevestigt dat de notariële akte al gepasseerd is.

CONTEXT OVER DEZE VERKOOP:
${saleData.context}

De ACTIEVE FASE is: ${activePhaseLabel}.`;


    const tools = [
      {
        type: "function",
        function: {
          name: "propose_actions",
          description: "Propose database actions for the manager to confirm. These will NOT be executed automatically — the manager must approve each action.",
          parameters: {
            type: "object",
            properties: {
              actions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ["postpone_task", "set_reminder", "update_priority", "mark_waiting", "complete_task", "add_followup_task", "schedule_notary", "update_payment", "add_payment", "delete_payment", "update_choice_status", "add_choice_note", "request_developer_quote"] },
                    choice_id: { type: "string", description: "UUID of the choice to modify (for choice actions)" },
                    new_status: { type: "string", description: "New status for update_choice_status" },
                    description: { type: "string", description: "Human-readable description of what this action does" },
                    milestone_id: { type: "string", description: "UUID of the milestone to modify" },
                    new_date: { type: "string", description: "New target date (YYYY-MM-DD) for postpone_task" },
                    reminder_date: { type: "string", description: "Date (YYYY-MM-DD) for set_reminder" },
                    note: { type: "string", description: "Note for the reminder" },
                    priority: { type: "string", enum: ["high", "medium", "low"], description: "New priority for update_priority" },
                    waiting_for: { type: "string", description: "Who/what we're waiting for (works with milestone_id, choice_id, or payment_id)" },
                    title: { type: "string", description: "Title of the new follow-up task or payment" },
                    phase: { type: "string", description: "Phase for the new task (reservatie/koopcontract/voorbereiding/akkoord/overdracht)" },
                    target_date: { type: "string", description: "Target date (YYYY-MM-DD) for the new task" },
                    notary_date: { type: "string", description: "Date (YYYY-MM-DD) for the notary appointment" },
                    notary_office: { type: "string", description: "Name of the notary office" },
                    notary_notes: { type: "string", description: "Additional notes for the notary appointment" },
                    payment_id: { type: "string", description: "UUID of the payment to modify or delete" },
                    amount: { type: "number", description: "Payment amount in euros" },
                    due_date: { type: "string", description: "Due date (YYYY-MM-DD) for payment" },
                    due_condition: { type: "string", description: "Condition for payment (e.g. 'Bij ondertekening koopcontract')" },
                    percentage: { type: "number", description: "Percentage of total sale price" },
                    status: { type: "string", enum: ["pending", "paid", "overdue"], description: "Payment status" },
                  },
                  required: ["type", "description"],
                  additionalProperties: false,
                },
              },
            },
            required: ["actions"],
            additionalProperties: false,
          },
        },
      },
    ];

    // Build messages for AI - only include role and content
    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({ role: m.role, content: m.content })),
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: aiMessages,
        tools,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit bereikt, probeer het later opnieuw." }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits op, voeg credits toe." }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiResult = await response.json();
    const choice = aiResult.choices?.[0];
    const message = choice?.message;

    let responseText = message?.content || '';
    let proposedActions: any[] = [];

    // Extract tool calls if any
    if (message?.tool_calls?.length) {
      for (const toolCall of message.tool_calls) {
        if (toolCall.function?.name === 'propose_actions') {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            proposedActions = args.actions || [];
          } catch (e) {
            console.error("Failed to parse tool call args:", e);
          }
        }
      }
    }

    // === SERVER-SIDE DATE VALIDATION ===
    // Auto-correct any proposed dates that are in the past
    const todayDate = new Date(todayISO);
    const correctionDate = new Date(todayDate);
    correctionDate.setDate(correctionDate.getDate() + 3);
    const correctionISO = correctionDate.toISOString().split('T')[0];

    const dateFields = ['reminder_date', 'new_date', 'target_date', 'notary_date', 'due_date'] as const;
    for (const action of proposedActions) {
      for (const field of dateFields) {
        if (action[field]) {
          const proposedDate = new Date(action[field]);
          if (proposedDate < todayDate) {
            // Allow past dates for schedule_notary (notary already passed)
            if (action.type === 'schedule_notary' && field === 'notary_date') {
              console.log(`[date-validation] Allowing past notary_date for schedule_notary: ${action[field]}`);
              continue;
            }
            const originalDate = action[field];
            action[field] = correctionISO;
            action.description = `${action.description} (datum automatisch gecorrigeerd van ${originalDate} naar ${correctionISO})`;
            console.log(`[date-validation] Corrected ${field}: ${originalDate} → ${correctionISO}`);
          }
        }
      }
    }

    // Save conversation
    const allMessages = [
      ...messages,
      {
        role: 'assistant',
        content: responseText,
        proposed_actions: proposedActions.length > 0 ? proposedActions : undefined,
      },
    ];

    // Upsert conversation
    const { data: existing } = await supabase
      .from('aftersales_copilot_conversations')
      .select('id')
      .eq('sale_id', saleId)
      .eq('created_by', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      await supabase
        .from('aftersales_copilot_conversations')
        .update({ messages: allMessages, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('aftersales_copilot_conversations')
        .insert({ sale_id: saleId, messages: allMessages, created_by: userId });
    }

    return new Response(JSON.stringify({
      message: responseText,
      proposed_actions: proposedActions,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error("chat-aftersales-copilot error:", e);
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
