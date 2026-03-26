import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PHASE_ORDER = ['geblokkeerd', 'reservatie', 'koopcontract', 'voorbereiding', 'akkoord', 'overdracht', 'nazorg'] as const;

type Mode = 'briefing' | 'developer_message' | 'customer_update' | 'call_points' | 'daily_briefing' | 'bulk_developer_message';

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
    geblokkeerd: 'Geblokkeerd', reservatie: 'Reservatie', koopcontract: 'Koopcontract', voorbereiding: 'Voorbereiding',
    akkoord: 'Akkoord', overdracht: 'Overdracht', nazorg: 'Nazorg',
  };
  return labels[phase] || phase;
}

async function buildSaleContext(supabase: any, saleId: string) {
  const queries: Promise<any>[] = [
    supabase
      .from("sales")
      .select("id, property_id, status, created_at, notary_date, expected_delivery_date, projects:project_id(name, development_ref, city)")
      .eq("id", saleId)
      .single(),
    supabase
      .from("sale_milestones")
      .select("id, title, description, phase, priority, target_date, completed_at, waiting_since, waiting_for, order_index, milestone_group, prerequisite_for")
      .eq("sale_id", saleId)
      .order("order_index", { ascending: true }),
    supabase
      .from("sale_payments")
      .select("id, title, amount, due_date, status, paid_at, waiting_since, waiting_for")
      .eq("sale_id", saleId)
      .order("due_date", { ascending: true }),
    supabase
      .from("sale_customers")
      .select("role, crm_lead:crm_lead_id(first_name, last_name, email, phone)")
      .eq("sale_id", saleId),
    // Always fetch choices with rich fields
    supabase
      .from("sale_choices")
      .select("id, title, type, status, category, description, notes, requested_at, quote_requested_at, quote_uploaded_at, quote_amount, via_developer, is_included, gifted_by_tis, customer_decision, customer_choice_type, created_at, completed_at, waiting_since, waiting_for")
      .eq("sale_id", saleId),
  ];

  const results = await Promise.all(queries);
  const [saleResult, milestonesResult, paymentsResult, customersResult, choicesResult] = results;

  if (saleResult.error || !saleResult.data) return null;

  const sale = saleResult.data;
  const milestones = milestonesResult.data || [];
  const payments = paymentsResult.data || [];
  const customers = customersResult.data || [];
  const allChoices = choicesResult?.data || [];
  // Separate open vs completed choices
  const choices = allChoices.filter((c: any) => !c.completed_at);
  const completedChoices = allChoices.filter((c: any) => c.completed_at);
  const project = sale.projects as any;
  const openMilestones = milestones.filter((m: any) => !m.completed_at);
  const completedMilestones = milestones.filter((m: any) => m.completed_at);
  const waitingMilestones = openMilestones.filter((m: any) => m.waiting_since);
  const overdueMilestones = openMilestones.filter((m: any) => m.target_date && new Date(m.target_date) < new Date());
  const unpaidPayments = payments.filter((p: any) => !p.paid_at);
  const buyerCustomers = customers.filter((c: any) => c.role === 'buyer');

  // Enrich choices with waiting duration info
  const enrichedChoices = choices.map((c: any) => {
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

  const contextParts: string[] = [];
  contextParts.push(`Verkoop: ${project?.name || 'Onbekend project'} in ${project?.city || 'onbekend'}`);
  contextParts.push(`Ontwikkelaar: ${project?.development_ref || 'Onbekend'}`);
  contextParts.push(`Status: ${sale.status}`);
  contextParts.push(`Aangemaakt: ${sale.created_at}`);

  // Add notary date context
  const notaryDate = sale.notary_date;
  const expectedDelivery = sale.expected_delivery_date;
  const today = new Date();
  const notaryPassed = notaryDate ? new Date(notaryDate) <= today : false;
  
  if (notaryDate) {
    const daysUntilNotary = Math.ceil((new Date(notaryDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (notaryPassed) {
      contextParts.push(`Notarisdatum: ${notaryDate} (${Math.abs(daysUntilNotary)}d geleden — nazorgtaken zijn nu relevant)`);
    } else {
      contextParts.push(`Notarisdatum: ${notaryDate} (over ${daysUntilNotary} dagen — nazorgtaken zijn NOG NIET relevant)`);
    }
  } else {
    contextParts.push(`Notarisdatum: nog niet ingepland`);
  }
  if (expectedDelivery) {
    contextParts.push(`Verwachte oplevering: ${expectedDelivery}`);
  }

  // Phase-aware categorization
  const activePhase = detectActivePhase(openMilestones, notaryPassed);

  if (buyerCustomers.length > 0) {
    const names = buyerCustomers.map((c: any) => {
      const lead = c.crm_lead as any;
      return lead ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim() : 'Onbekend';
    }).join(', ');
    contextParts.push(`Klant(en): ${names}`);
  }

  contextParts.push(`\nTotaal taken: ${milestones.length} (${completedMilestones.length} voltooid, ${openMilestones.length} open)`);

  if (activePhase) {
    const phaseIndex = PHASE_ORDER.indexOf(activePhase as any);
    const activePhaseOpen = openMilestones.filter((m: any) => m.phase === activePhase);
    const activePhaseCompleted = completedMilestones.filter((m: any) => m.phase === activePhase);
    const totalInPhase = activePhaseOpen.length + activePhaseCompleted.length;

    contextParts.push(`\n🎯 ACTIEVE FASE: ${getPhaseLabel(activePhase).toUpperCase()} (fase ${phaseIndex + 1}/${PHASE_ORDER.length}, ${activePhaseCompleted.length}/${totalInPhase} voltooid)`);

    const activeWaiting = waitingMilestones.filter((m: any) => m.phase === activePhase);
    if (activeWaiting.length > 0) {
      contextParts.push(`\nWachtende taken in actieve fase (${activeWaiting.length}):`);
      activeWaiting.forEach((m: any) => {
        const days = daysBetween(m.waiting_since);
        contextParts.push(`- "${m.title}" — wacht ${days}d op: ${m.waiting_for || 'onbekend'} (escalatie: ${escalationLevel(m.waiting_since)})`);
      });
    }

    const activeOverdue = overdueMilestones.filter((m: any) => m.phase === activePhase);
    if (activeOverdue.length > 0) {
      contextParts.push(`\nAchterstallige taken in actieve fase (${activeOverdue.length}):`);
      activeOverdue.forEach((m: any) => {
        const days = daysBetween(m.target_date!);
        contextParts.push(`- "${m.title}" — ${days}d over deadline`);
      });
    }

    contextParts.push(`\nActieve taken in fase "${getPhaseLabel(activePhase)}" (${activePhaseOpen.length}):`);
    activePhaseOpen.forEach((m: any) => {
      const taskParts = [`- "${m.title}" (prioriteit: ${m.priority || 'normaal'})`];
      if (m.target_date) taskParts.push(`  deadline: ${m.target_date}`);
      if (m.description) taskParts.push(`  notitie: ${m.description}`);
      if (m.waiting_since) taskParts.push(`  ⏳ wacht ${daysBetween(m.waiting_since)}d op: ${m.waiting_for || 'onbekend'}`);
      contextParts.push(taskParts.join('\n'));
    });

    // Future phases summary
    const futureTasks = openMilestones.filter((m: any) => m.phase !== activePhase);
    if (futureTasks.length > 0) {
      contextParts.push(`\nGeplande taken voor latere fases (${futureTasks.length}):`);
      const byPhase: Record<string, number> = {};
      futureTasks.forEach((m: any) => { byPhase[m.phase] = (byPhase[m.phase] || 0) + 1; });
      for (const [phase, count] of Object.entries(byPhase)) {
        const note = phase === 'nazorg' && !notaryPassed ? ' (pas relevant na notarisdatum)' : '';
        contextParts.push(`  ${getPhaseLabel(phase)}${note}: ${count} open taken`);
      }
    }
  } else {
    contextParts.push(`\n✅ Alle fases zijn afgerond.`);
  }

  // Detailed choices/extras section
  if (enrichedChoices.length > 0) {
    contextParts.push(`\n=== KEUZES & EXTRA'S (${enrichedChoices.length} open, ${completedChoices.length} afgerond) ===`);
    
    if (pendingDevChoices.length > 0) {
      contextParts.push(`\n⚠️ WACHT OP OFFERTE VAN ONTWIKKELAAR (${pendingDevChoices.length}):`);
      pendingDevChoices.forEach((c: any) => {
        let line = `- "${c.title}" (categorie: ${c.category || 'onbekend'}) — ${c.waitDescription} — escalatie: ${c.choiceEscalation}`;
        if (c.waiting_since) line += ` — ⏳ wacht ${daysBetween(c.waiting_since)}d op: ${c.waiting_for || 'onbekend'}`;
        if (c.notes) line += ` — notitie: ${c.notes}`;
        contextParts.push(line);
      });
    }
    
    if (needsRequestChoices.length > 0) {
      contextParts.push(`\n📋 NOG NIET AANGEVRAAGD BIJ ONTWIKKELAAR (${needsRequestChoices.length}):`);
      needsRequestChoices.forEach((c: any) => {
        contextParts.push(`- "${c.title}" (categorie: ${c.category || 'onbekend'})${c.description ? ` — ${c.description}` : ''}`);
      });
    }
    
    if (awaitingDecisionChoices.length > 0) {
      contextParts.push(`\n🔄 OFFERTE ONTVANGEN, WACHT OP KLANTBESLISSING (${awaitingDecisionChoices.length}):`);
      awaitingDecisionChoices.forEach((c: any) => {
        contextParts.push(`- "${c.title}" — €${c.quote_amount || '?'} — ${c.waitDescription}`);
      });
    }
    
    const otherChoices = enrichedChoices.filter((c: any) => 
      !pendingDevChoices.includes(c) && !needsRequestChoices.includes(c) && !awaitingDecisionChoices.includes(c)
    );
    if (otherChoices.length > 0) {
      contextParts.push(`\nOverige openstaande keuzes (${otherChoices.length}):`);
      otherChoices.forEach((c: any) => {
        contextParts.push(`- "${c.title}" (status: ${c.status}, type: ${c.type}${c.is_included ? ', inbegrepen' : ''}${c.gifted_by_tis ? ', cadeau van TIS' : ''})`);
      });
    }
  }

  if (unpaidPayments.length > 0) {
    contextParts.push(`\nOpenstaande betalingen:`);
    unpaidPayments.forEach((p: any) => {
      let line = `- "${p.title}" €${p.amount} — vervaldatum: ${p.due_date || 'onbekend'}`;
      if (p.waiting_since) line += ` — ⏳ wacht ${daysBetween(p.waiting_since)}d op: ${p.waiting_for || 'onbekend'} (${escalationLevel(p.waiting_since)})`;
      contextParts.push(line);
    });
  }

  if (completedMilestones.length > 0) {
    contextParts.push(`\nVoltooide taken (laatste 10):`);
    completedMilestones.slice(-10).forEach((m: any) => {
      contextParts.push(`- "${m.title}" — voltooid op ${m.completed_at}`);
    });
  }

  return {
    context: contextParts.join('\n'),
    sale,
    project,
    milestones,
    openMilestones,
    completedMilestones,
    waitingMilestones,
    overdueMilestones,
    payments,
    unpaidPayments,
    customers,
    buyerCustomers,
    choices,
    enrichedChoices,
    pendingDevChoices,
    needsRequestChoices,
    awaitingDecisionChoices,
  };
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

    const body = await req.json();
    const { saleId, mode, taskId, channel, language: langParam, developerName } = body as {
      saleId?: string;
      mode: Mode;
      taskId?: string;
      channel?: 'email' | 'whatsapp';
      language?: 'nl' | 'es';
      developerName?: string;
    };

    if (!mode) {
      return new Response(JSON.stringify({ error: 'Missing mode' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // daily_briefing and bulk_developer_message don't require saleId
    if (!saleId && mode !== 'daily_briefing' && mode !== 'bulk_developer_message') {
      return new Response(JSON.stringify({ error: 'Missing saleId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.user.id;

    // Determine language: default 'es' for developer_message, 'nl' for rest
    const language = langParam || (mode === 'developer_message' || mode === 'bulk_developer_message' ? 'es' : 'nl');

    // Fetch message history for escalation awareness (if saleId provided)
    let messageHistory: any[] = [];
    if (saleId) {
      const { data: historyData } = await supabase
        .from("aftersales_ai_messages")
        .select("mode, channel, language, content, created_at")
        .eq("sale_id", saleId)
        .order("created_at", { ascending: false })
        .limit(5);
      messageHistory = historyData || [];
    }

    let systemPrompt = '';
    let userPrompt = '';
    let toolsDef: any[] = [];
    let toolChoice: any = undefined;

    // === DAILY BRIEFING MODE ===
    if (mode === 'daily_briefing') {
      // Fetch all sales with open milestones
      const { data: allSales } = await supabase
        .from("sales")
        .select("id, status, created_at, projects:project_id(name, development_ref, city)")
        .not("status", "in", '("geannuleerd","afgerond")');

      if (!allSales || allSales.length === 0) {
        return new Response(JSON.stringify({ mode, result: { message: 'Geen actieve verkopen gevonden.' } }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch milestones for all active sales
      const saleIds = allSales.map((s: any) => s.id);
      const { data: allMilestones } = await supabase
        .from("sale_milestones")
        .select("sale_id, title, phase, priority, target_date, completed_at, waiting_since, waiting_for")
        .in("sale_id", saleIds)
        .is("completed_at", null);

      const milestonesBySale = new Map<string, any[]>();
      (allMilestones || []).forEach((m: any) => {
        if (!milestonesBySale.has(m.sale_id)) milestonesBySale.set(m.sale_id, []);
        milestonesBySale.get(m.sale_id)!.push(m);
      });

      // Build aggregated context
      const salesSummaries: string[] = [];
      for (const sale of allSales) {
        const ms = milestonesBySale.get(sale.id) || [];
        if (ms.length === 0) continue;
        const project = sale.projects as any;
        const waiting = ms.filter((m: any) => m.waiting_since);
        const overdue = ms.filter((m: any) => m.target_date && new Date(m.target_date) < new Date());
        const urgency = overdue.length * 3 + waiting.length * 2;
        if (urgency === 0 && ms.length < 2) continue; // skip low-activity

        salesSummaries.push(`📌 ${project?.name || 'Onbekend'} (${project?.development_ref || '?'}) — Status: ${sale.status}
  Open: ${ms.length} taken | Achterstallig: ${overdue.length} | Wachtend: ${waiting.length}
  ${overdue.map((m: any) => `  ⚠️ "${m.title}" — ${daysBetween(m.target_date)}d over deadline`).join('\n')}
  ${waiting.map((m: any) => `  ⏳ "${m.title}" — ${daysBetween(m.waiting_since)}d wachtend op ${m.waiting_for || '?'}`).join('\n')}`);
      }

      const todayISO = new Date().toISOString().split('T')[0];
      const todayHuman = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date());
      systemPrompt = `Je bent een ervaren aftersales-manager bij een vastgoedmakelaar. Je helpt de makelaar zijn dag te plannen. Communiceer in het Nederlands. Wees concreet en actiegericht.\n\nVANDAAG is: ${todayISO} (${todayHuman}). Alle voorgestelde datums MOETEN in de toekomst liggen.`;
      userPrompt = `Hier is een overzicht van alle actieve verkopen:\n\n${salesSummaries.join('\n\n')}\n\nMaak een dagplanning: welke verkopen moet ik vandaag opvolgen, in welke volgorde, met welke concrete actie? Maximaal 8 items.`;

      toolsDef = [{
        type: "function",
        function: {
          name: "daily_briefing",
          description: "Return a prioritized daily plan across all sales",
          parameters: {
            type: "object",
            properties: {
              actions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    priority: { type: "string", enum: ["critical", "high", "medium"] },
                    sale_name: { type: "string" },
                    action: { type: "string" },
                    reason: { type: "string" },
                  },
                  required: ["priority", "sale_name", "action", "reason"],
                  additionalProperties: false,
                },
              },
              summary: { type: "string" },
            },
            required: ["actions", "summary"],
            additionalProperties: false,
          },
        },
      }];
      toolChoice = { type: "function", function: { name: "daily_briefing" } };

    // === BULK DEVELOPER MESSAGE ===
    } else if (mode === 'bulk_developer_message') {
      if (!developerName) {
        return new Response(JSON.stringify({ error: 'Missing developerName for bulk mode' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Find all sales for this developer with waiting tasks
      const { data: devSales } = await supabase
        .from("sales")
        .select("id, status, property_id, projects:project_id(name, development_ref, city)")
        .not("status", "in", '("geannuleerd","afgerond")');

      const matchingSales = (devSales || []).filter((s: any) => {
        const p = s.projects as any;
        return p?.development_ref?.toLowerCase().includes(developerName.toLowerCase());
      });

      if (matchingSales.length === 0) {
        return new Response(JSON.stringify({ mode, result: { message: `Geen actieve verkopen gevonden voor ${developerName}.` } }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const saleIds = matchingSales.map((s: any) => s.id);
      const { data: waitingTasks } = await supabase
        .from("sale_milestones")
        .select("sale_id, title, waiting_since, waiting_for, description")
        .in("sale_id", saleIds)
        .not("waiting_since", "is", null)
        .is("completed_at", null);

      const tasksBySale: string[] = [];
      for (const sale of matchingSales) {
        const tasks = (waitingTasks || []).filter((t: any) => t.sale_id === sale.id);
        if (tasks.length === 0) continue;
        const project = sale.projects as any;
        tasksBySale.push(`Verkoop: ${project?.name || 'Onbekend'}
${tasks.map((t: any) => `  - "${t.title}" — wacht ${daysBetween(t.waiting_since)}d${t.waiting_for ? ` op: ${t.waiting_for}` : ''}`).join('\n')}`);
      }

      if (tasksBySale.length === 0) {
        return new Response(JSON.stringify({ mode, result: { message: `Geen wachtende taken gevonden voor ${developerName}.` } }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const ch = channel || 'email';
      const langInstructions = language === 'es'
        ? 'Schrijf het bericht in het Spaans. Gebruik een professionele en beleefde toon.'
        : 'Schrijf het bericht in het Nederlands.';

      systemPrompt = `Je bent een professionele vastgoedmakelaar die communiceert met projectontwikkelaars. ${langInstructions}`;
      userPrompt = `Schrijf een ${ch === 'whatsapp' ? 'kort WhatsApp-bericht' : 'professionele e-mail'} naar ontwikkelaar "${developerName}" waarin je alle openstaande punten bundelt.

Openstaande punten per verkoop:
${tasksBySale.join('\n\n')}

Combineer alles in één overzichtelijk bericht. Vraag per punt om een update of actie.`;

      toolsDef = [{
        type: "function",
        function: {
          name: "bulk_developer_message",
          description: "Return a combined message for a developer across multiple sales",
          parameters: {
            type: "object",
            properties: {
              subject: { type: "string" },
              message: { type: "string" },
              tone: { type: "string", enum: ["friendly", "urgent", "formal"] },
            },
            required: ["subject", "message", "tone"],
            additionalProperties: false,
          },
        },
      }];
      toolChoice = { type: "function", function: { name: "bulk_developer_message" } };

    } else {
      // === SINGLE-SALE MODES ===
      const saleContext = await buildSaleContext(supabase, saleId!);
      if (!saleContext) {
        return new Response(JSON.stringify({ error: 'Sale not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { context, project, milestones, buyerCustomers, enrichedChoices, pendingDevChoices } = saleContext;

      // History context
      let historyContext = '';
      if (messageHistory.length > 0) {
        historyContext = `\n\nEerdere AI-berichten voor deze verkoop (laatste ${messageHistory.length}):\n` +
          messageHistory.map((h: any) => `- ${h.created_at} [${h.mode}/${h.channel || '-'}]: ${h.content.substring(0, 200)}...`).join('\n') +
          '\n\nLet op: als er al eerder berichten zijn gestuurd over hetzelfde onderwerp, escaleer de toon en verwijs naar het vorige contact.';
      }

      if (mode === 'briefing') {
      // Fetch custom briefing prompt and model
      let briefingPrompt: string | null = null;
      let briefingModel: string | null = null;
      try {
        const { data: promptConfig } = await supabase
          .from("ai_prompts")
          .select("prompt_text, model_id")
          .eq("prompt_key", "aftersales_copilot_briefing")
          .maybeSingle();
        if (promptConfig) {
          briefingPrompt = promptConfig.prompt_text;
          briefingModel = promptConfig.model_id;
        }
      } catch (e) {
        console.error("Failed to fetch briefing prompt, using default:", e);
      }

      const bTodayISO = new Date().toISOString().split('T')[0];
      const bTodayHuman = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date());
      const dateInjection = `\n\nVANDAAG is: ${bTodayISO} (${bTodayHuman}). Alle voorgestelde datums MOETEN in de toekomst liggen.`;

      systemPrompt = (briefingPrompt || `Je bent een ervaren aftersales-manager bij een vastgoedmakelaar in Spanje. Je helpt makelaars bij het prioriteren van hun dagelijkse taken per verkoop. Je communiceert in het Nederlands. Wees concreet, direct en actiegericht.

FASE-BEWUSTE PRIORITERING:
- De verkoop doorloopt 6 fases: Reservatie → Koopcontract → Voorbereiding → Akkoord → Overdracht → Nazorg.
- Focus je briefing UITSLUITEND op de actieve fase (aangegeven met 🎯 in de context).
- Taken uit latere fases zijn "gepland" en hoeven vandaag geen aandacht.
- Nazorgtaken zijn NIET relevant zolang de notarisdatum niet verstreken is.

WACHTSTATUS & ESCALATIE:
- Taken met wachtstatus < 3 dagen oud zijn "geparkeerd" — NIET opnemen in de actie-lijst tenzij er een andere reden is.
- Taken met wachtstatus 3-6 dagen: monitor, check of opvolging nodig is.
- Taken met wachtstatus 7-13 dagen: urgente opvolging nodig, opnemen in briefing.
- Taken met wachtstatus 14+ dagen: CRITICAL escalatie.

VOORWAARDEN VOOR FASEDOORGANG:
- Financieringsdocumenten moeten compleet zijn VÓÓR de notaris ingepland kan worden.
- Als er voorwaarden ontbreken voor de volgende fase, benoem dit expliciet als bottleneck.

TAAK-VOLGORDE (aanbevolen prioritering per fase, niet blokkerend):

RESERVATIE:
1. Koperdata → 2. Contract uploaden → 3. Advocaat → 4. Klant tekent → 5. Developer tekent
6. Betaalplan → 7. Facturen (volgt uit betaalplan)

KOOPCONTRACT:
1. Bankgarantie → 2. Koopcontract (vereist bankgarantie) → 3. Klant tekent → 4. Developer tekent
- Aanbetaling pas NA bankgarantie

VOORBEREIDING → AKKOORD:
- Elektriciteitsplan VÓÓR akkoord elektriciteit
- Afmetingenplan VÓÓR akkoord grondplan
- Extra's docs VÓÓR akkoord extra's

AKKOORD:
1. Offertes aanvragen → 2. Ontvangen → 3. Beslissing
4. Alle akkoorden → 5. Definitief → 6. Doorgeven

OVERDRACHT:
1. Notarisdatum → 2. Snagging

NAZORG:
1. Notariële akte → 2. Nutsvoorzieningen → 3. Follow-up → 4. Financieel → 5. Archivering

Gebruik deze volgorde om prioriteiten te stellen in je briefing. Adviseer altijd de optimale volgorde.

BELANGRIJK over extra's en offertes:
- Openstaande offertes bij de ontwikkelaar zijn vaak de grootste bottleneck. Identificeer deze expliciet.
- Als een offerte al >7 dagen wacht, markeer dit als HIGH priority.
- Als een offerte al >14 dagen wacht, markeer dit als CRITICAL.

TIMING:
- Als er geen taken zijn die VANDAAG actie vereisen in de actieve fase, is "alles onder controle" een geldig antwoord. Geef dan status: "on_track".
- Focus alleen op taken die de makelaar vandaag kan en moet doen.`) + dateInjection;
        userPrompt = `Analyseer de volgende verkoop en geef een prioriteiten-briefing. Focus op de actieve fase.\n\n${context}${historyContext}\n\nGeef maximaal 5 actiepunten uit de actieve fase, geordend op urgentie. Identificeer bottlenecks en stel concrete volgende stappen voor. Let EXTRA op openstaande offertes/extra's die lang op antwoord wachten. Als er geen actie nodig is vandaag, geef dan status "on_track".`;
        toolsDef = [{
          type: "function",
          function: {
            name: "aftersales_briefing",
            description: "Return a prioritized briefing for this sale",
            parameters: {
              type: "object",
              properties: {
                status: { type: "string", enum: ["action_needed", "on_track"], description: "on_track als er vandaag geen actie nodig is" },
                actions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      priority: { type: "string", enum: ["critical", "high", "medium"] },
                      action: { type: "string" },
                      reason: { type: "string" },
                      suggestion: { type: "string" },
                    },
                    required: ["priority", "action", "reason"],
                    additionalProperties: false,
                  },
                },
                summary: { type: "string" },
                next_action_date: { type: "string", description: "Datum waarop de volgende actie verwacht wordt (YYYY-MM-DD)" },
              },
              required: ["status", "actions", "summary"],
              additionalProperties: false,
            },
          },
        }];
        toolChoice = { type: "function", function: { name: "aftersales_briefing" } };

      } else if (mode === 'developer_message') {
        const targetTask = taskId ? milestones.find((m: any) => m.id === taskId) : null;
        const level = targetTask ? escalationLevel(targetTask.waiting_since) : 'friendly';
        const waitDays = targetTask?.waiting_since ? daysBetween(targetTask.waiting_since) : 0;
        const ch = channel || 'email';

        const langInstructions = language === 'es'
          ? 'Schrijf het bericht in het Spaans. Gebruik een professionele en beleefde toon.'
          : 'Schrijf het bericht in het Nederlands.';

        // Build specific pending quotes instructions
        let quotesInstruction = '';
        if (pendingDevChoices.length > 0) {
          quotesInstruction = `\n\nBELANGRIJK — OPENSTAANDE OFFERTES BIJ DEZE ONTWIKKELAAR:
${pendingDevChoices.map((c: any) => `- "${c.title}" (categorie: ${c.category || '?'}) — aangevraagd ${c.daysWaiting}d geleden — escalatie: ${c.choiceEscalation}${c.notes ? ` — context: ${c.notes}` : ''}`).join('\n')}

Je MOET voor elke openstaande offerte hierboven een concreet verzoek formuleren in het bericht. Noem elke offerte bij naam.
${pendingDevChoices.some((c: any) => c.choiceEscalation === 'formal') ? 'Sommige offertes wachten al >14 dagen. Gebruik een formele toon en verwijs naar eerdere verzoeken.' : ''}
${pendingDevChoices.some((c: any) => c.choiceEscalation === 'urgent') ? 'Sommige offertes wachten al >7 dagen. Benadruk de urgentie.' : ''}`;
        }

        const needsRequest = (saleContext as any).needsRequestChoices || [];
        let requestInstruction = '';
        if (needsRequest.length > 0) {
          requestInstruction = `\n\nNIEUWE AANVRAGEN (nog niet eerder gecommuniceerd):
${needsRequest.map((c: any) => `- "${c.title}" (categorie: ${c.category || '?'})${c.description ? ` — ${c.description}` : ''}`).join('\n')}
Vraag de ontwikkelaar ook om een offerte/reactie voor deze items.`;
        }

        systemPrompt = `Je bent een professionele vastgoedmakelaar die communiceert met projectontwikkelaars in Spanje. ${langInstructions} Pas je toon aan op basis van het escalatieniveau: friendly=vriendelijk en beleefd, urgent=vriendelijk maar met nadruk op urgentie, formal=formeel en zakelijk met duidelijke deadline.${historyContext ? ' Als er eerder berichten zijn gestuurd, verwijs daarnaar en verhoog de urgentie.' : ''}

KERNREGEL: Als er openstaande offertes/extra's zijn, is het ESSENTIEEL dat je deze ALLEMAAL expliciet benoemt in het bericht. Dit is de primaire reden voor het contacteren van de ontwikkelaar.`;
        userPrompt = `Schrijf een ${ch === 'whatsapp' ? 'kort WhatsApp-bericht' : 'professionele e-mail'} naar de ontwikkelaar "${project?.developer_name || 'de ontwikkelaar'}".

${targetTask ? `Specifieke taak: "${targetTask.title}"
Wacht al ${waitDays} dagen${targetTask.waiting_for ? ` op: ${targetTask.waiting_for}` : ''}
Escalatieniveau: ${level}` : ''}

Context verkoop:\n${context}${historyContext ? `\n\nEerdere berichten:\n${historyContext}` : ''}${quotesInstruction}${requestInstruction}`;

        toolsDef = [{
          type: "function",
          function: {
            name: "developer_message",
            description: "Return a message to send to the developer",
            parameters: {
              type: "object",
              properties: {
                subject: { type: "string" },
                message: { type: "string" },
                tone: { type: "string", enum: ["friendly", "urgent", "formal"] },
                pending_quotes: {
                  type: "array",
                  description: "List of pending quotes/extras mentioned in the message",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      days_waiting: { type: "number" },
                      action_requested: { type: "string" },
                    },
                    required: ["title", "days_waiting", "action_requested"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["subject", "message", "tone"],
              additionalProperties: false,
            },
          },
        }];
        toolChoice = { type: "function", function: { name: "developer_message" } };

      } else if (mode === 'customer_update') {
        const ch = channel || 'email';
        const customerNames = buyerCustomers.map((c: any) => {
          const lead = c.crm_lead as any;
          return lead?.first_name || 'klant';
        }).join(' en ');

        systemPrompt = `Je bent een warme en professionele vastgoedadviseur die klanten op de hoogte houdt van hun aankoopproces in Spanje. Je schrijft in het Nederlands. Je toon is geruststellend, persoonlijk en informatief. Gebruik de voornaam van de klant.`;
        userPrompt = `Schrijf een ${ch === 'whatsapp' ? 'kort WhatsApp-bericht' : 'warme e-mail'} aan ${customerNames} met een statusupdate over hun aankoop.

Context:\n${context}${historyContext}

Vermeld wat er is afgerond, waar aan gewerkt wordt, en wat de volgende stappen zijn. Wees positief maar eerlijk.`;

        toolsDef = [{
          type: "function",
          function: {
            name: "customer_update",
            description: "Return a status update message for the customer",
            parameters: {
              type: "object",
              properties: {
                subject: { type: "string" },
                message: { type: "string" },
                greeting: { type: "string" },
              },
              required: ["subject", "message"],
              additionalProperties: false,
            },
          },
        }];
        toolChoice = { type: "function", function: { name: "customer_update" } };

      } else if (mode === 'call_points') {
        const targetTask = taskId ? milestones.find((m: any) => m.id === taskId) : null;

        systemPrompt = `Je bent een ervaren aftersales-manager die een makelaar voorbereidt op een telefoongesprek. Schrijf in het Nederlands. Wees beknopt en concreet.

BELANGRIJK: Als er openstaande offertes/extra's zijn die bij de ontwikkelaar liggen, voeg dan ALTIJD een gesprekspunt toe over deze offertes. Noem ze bij naam met de wachtduur.`;
        userPrompt = `Genereer gesprekspunten voor een telefoongesprek over deze verkoop.${targetTask ? `\n\nFocus op taak: "${targetTask.title}"${targetTask.waiting_for ? ` (wacht op: ${targetTask.waiting_for})` : ''}` : ''}

Context:\n${context}${historyContext}

Geef 3-5 concrete gesprekspunten met suggesties voor wat te zeggen. Als er openstaande offertes zijn, maak hier een apart punt van.`;

        toolsDef = [{
          type: "function",
          function: {
            name: "call_points",
            description: "Return structured talking points for a phone call",
            parameters: {
              type: "object",
              properties: {
                call_with: { type: "string" },
                points: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      topic: { type: "string" },
                      suggestion: { type: "string" },
                      priority: { type: "string", enum: ["must_discuss", "should_discuss", "nice_to_have"] },
                    },
                    required: ["topic", "suggestion", "priority"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["call_with", "points"],
              additionalProperties: false,
            },
          },
        }];
        toolChoice = { type: "function", function: { name: "call_points" } };
      } else {
        return new Response(JSON.stringify({ error: 'Invalid mode' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Call AI gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: briefingModel || "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: toolsDef,
        tool_choice: toolChoice,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", status, errorText);

      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Te veel verzoeken, probeer het later opnieuw.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: 'AI-credits zijn op. Voeg credits toe in je workspace.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: 'AI service error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    let result: any;
    if (!toolCall?.function?.arguments) {
      const content = aiData.choices?.[0]?.message?.content || '';
      result = { message: content };
    } else {
      result = JSON.parse(toolCall.function.arguments);
    }

    // === SERVER-SIDE DATE VALIDATION ===
    // Correct any dates in the past (e.g. next_action_date in briefings)
    const valToday = new Date().toISOString().split('T')[0];
    const valTodayDate = new Date(valToday);
    const valCorrectionDate = new Date(valTodayDate);
    valCorrectionDate.setDate(valCorrectionDate.getDate() + 3);
    const valCorrectionISO = valCorrectionDate.toISOString().split('T')[0];

    if (result.next_action_date && new Date(result.next_action_date) < valTodayDate) {
      console.log(`[date-validation] Corrected next_action_date: ${result.next_action_date} → ${valCorrectionISO}`);
      result.next_action_date = valCorrectionISO;
    }

    // Save to history
    const displayText = result.message || result.subject || JSON.stringify(result).substring(0, 500);
    await supabase.from("aftersales_ai_messages").insert({
      sale_id: saleId || null,
      task_id: taskId || null,
      mode,
      channel: channel || null,
      language,
      content: displayText,
      result,
      created_by: userId,
    });

    return new Response(JSON.stringify({ mode, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in generate-aftersales-action:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
