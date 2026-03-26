import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isPast, isToday, parseISO, differenceInDays } from "date-fns";
import { MILESTONE_GROUPS } from "./checklistTemplates";

/* ── shared types ── */

export interface SaleMilestone {
  id: string;
  title: string;
  description: string | null;
  phase: string | null;
  priority: string | null;
  target_date: string | null;
  completed_at: string | null;
  waiting_since: string | null;
  waiting_for: string | null;
  sale_id: string;
  order_index: number;
  milestone_group: string | null;
}

export interface SaleChoice {
  id: string;
  title: string;
  type: string;
  status: string;
  quote_requested_at: string | null;
  sale_id: string;
}

export interface SalePayment {
  id: string;
  title: string;
  amount: number;
  due_date: string | null;
  status: string;
  paid_at: string | null;
  sale_id: string;
}

export interface Reminder {
  id: string;
  sale_id: string;
  milestone_id: string | null;
  note: string;
  reminder_date: string;
  status: string;
}

export type EscalationLevel = "friendly" | "firm" | "urgent" | "escalation";

export interface WaitingTaskWithEscalation extends SaleMilestone {
  escalation_level: EscalationLevel;
  waiting_days: number;
}

/** A single objective (milestone_group) summary for a sale */
export interface ObjectiveSummary {
  group_key: string;
  label: string;
  phase: string;
  total_steps: number;
  completed_steps: number;
  is_complete: boolean;
  next_action: SaleMilestone | null;
  is_blocked: boolean;
  overdue_tasks: SaleMilestone[];
  waiting_tasks: SaleMilestone[];
}

/** Phase order for active phase detection */
const PHASE_ORDER = ["reservatie", "koopcontract", "voorbereiding", "akkoord", "overdracht", "nazorg"];

export interface PhaseSummary {
  phase: string;
  total: number;
  completed: number;
  is_active: boolean;
}

export interface SaleSummary {
  sale_id: string;
  project_name: string | null;
  property_description: string | null;
  phase: string | null;
  // progress
  total_milestones: number;
  completed_milestones: number;
  // active phase
  active_phase: string | null;
  active_phase_tasks: SaleMilestone[];
  phase_summaries: PhaseSummary[];
  // objectives
  objectives: ObjectiveSummary[];
  overdue_objectives: number;
  blocked_objectives: number;
  // alerts
  overdue_tasks: SaleMilestone[];
  upcoming_tasks: SaleMilestone[];
  open_choices: SaleChoice[];
  pending_payments: SalePayment[];
  missing_invoice_count: number;
  waiting_tasks: SaleMilestone[];
  waiting_tasks_escalated: WaitingTaskWithEscalation[];
  // reminders
  pending_reminders: Reminder[];
  overdue_reminders: Reminder[];
  // computed
  urgency_score: number;
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = parseISO(dateStr);
  return isPast(d) && !isToday(d);
}

export function getEscalationLevel(waitingSince: string | null): { level: EscalationLevel; days: number } {
  if (!waitingSince) return { level: "friendly", days: 0 };
  const days = differenceInDays(new Date(), parseISO(waitingSince));
  if (days >= 14) return { level: "escalation", days };
  if (days >= 7) return { level: "urgent", days };
  if (days >= 3) return { level: "firm", days };
  return { level: "friendly", days };
}

export const ESCALATION_CONFIG: Record<EscalationLevel, { label: string; colorClass: string }> = {
  friendly: { label: "Geparkeerd", colorClass: "text-purple-600 bg-purple-50 dark:text-purple-300 dark:bg-purple-900/20" },
  firm: { label: "Opvolgen", colorClass: "text-orange-600 bg-orange-50 dark:text-orange-300 dark:bg-orange-900/20" },
  urgent: { label: "Dringend", colorClass: "text-red-600 bg-red-50 dark:text-red-300 dark:bg-red-900/20" },
  escalation: { label: "Kritiek", colorClass: "text-red-800 bg-red-100 dark:text-red-200 dark:bg-red-900/40" },
};

/** Detect the active phase: first phase with incomplete tasks */
function detectActivePhase(milestones: SaleMilestone[]): string | null {
  for (const phase of PHASE_ORDER) {
    const phaseTasks = milestones.filter(m => m.phase === phase);
    if (phaseTasks.length === 0) continue;
    const hasIncomplete = phaseTasks.some(m => m.completed_at === null);
    if (hasIncomplete) return phase;
  }
  return null;
}

/** Build phase summaries */
function buildPhaseSummaries(milestones: SaleMilestone[], activePhase: string | null): PhaseSummary[] {
  return PHASE_ORDER.map(phase => {
    const tasks = milestones.filter(m => m.phase === phase);
    return {
      phase,
      total: tasks.length,
      completed: tasks.filter(m => m.completed_at !== null).length,
      is_active: phase === activePhase,
    };
  }).filter(p => p.total > 0);
}

/** Build objective summaries from milestones, applying cascade-blocking logic */
function buildObjectives(milestones: SaleMilestone[]): ObjectiveSummary[] {
  const groups = new Map<string, SaleMilestone[]>();
  for (const m of milestones) {
    const key = m.milestone_group || `ungrouped_${m.id}`;
    const arr = groups.get(key) || [];
    arr.push(m);
    groups.set(key, arr);
  }

  const objectives: ObjectiveSummary[] = [];

  for (const [groupKey, tasks] of groups) {
    tasks.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

    const groupInfo = MILESTONE_GROUPS[groupKey];
    const completed = tasks.filter(t => t.completed_at !== null);
    const incomplete = tasks.filter(t => t.completed_at === null);

    let foundWaiting = false;
    const overdueNonBlocked: SaleMilestone[] = [];
    const waitingTasks: SaleMilestone[] = [];
    let isBlocked = false;
    let nextAction: SaleMilestone | null = null;

    for (const task of incomplete) {
      if (foundWaiting) {
        isBlocked = true;
        continue;
      }

      if (task.waiting_since) {
        foundWaiting = true;
        waitingTasks.push(task);
        continue;
      }

      if (!nextAction) {
        nextAction = task;
      }

      if (isOverdue(task.target_date)) {
        overdueNonBlocked.push(task);
      }
    }

    objectives.push({
      group_key: groupKey,
      label: groupInfo?.label || tasks[0]?.title || groupKey,
      phase: groupInfo?.phase || tasks[0]?.phase || '',
      total_steps: tasks.length,
      completed_steps: completed.length,
      is_complete: completed.length === tasks.length,
      next_action: nextAction,
      is_blocked: isBlocked || foundWaiting,
      overdue_tasks: overdueNonBlocked,
      waiting_tasks: waitingTasks,
    });
  }

  return objectives;
}

export function useAftersalesBySale() {
  return useQuery({
    queryKey: ["aftersales", "by-sale"],
    queryFn: async () => {
      // 1. All sales with project info
      const { data: sales, error: sErr } = await supabase
        .from("sales")
        .select("id, property_description, status, project:projects(name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (sErr) throw sErr;

      // 2. All milestones — fetch in batches per sale to avoid 1000 row limit
      const saleIds = (sales || []).map((s: any) => s.id);
      const milestones: any[] = [];
      const BATCH_SIZE = 50;
      for (let i = 0; i < saleIds.length; i += BATCH_SIZE) {
        const batch = saleIds.slice(i, i + BATCH_SIZE);
        const { data: batchData, error: mErr } = await supabase
          .from("sale_milestones")
          .select("id, title, description, phase, priority, target_date, completed_at, waiting_since, waiting_for, sale_id, order_index, milestone_group")
          .in("sale_id", batch);
        if (mErr) throw mErr;
        if (batchData) milestones.push(...batchData);
      }

      // 3. Open choices
      const { data: choices, error: cErr } = await supabase
        .from("sale_choices")
        .select("id, title, type, status, quote_requested_at, sale_id")
        .in("status", ["pending_quote", "quote_received", "open"])
        .limit(500);
      if (cErr) throw cErr;

      // 4. Pending payments
      const { data: payments, error: pErr } = await supabase
        .from("sale_payments")
        .select("id, title, amount, due_date, status, paid_at, sale_id")
        .eq("status", "pending")
        .limit(500);
      if (pErr) throw pErr;

      // 5. Missing invoices
      const { data: paidPayments, error: ppErr } = await supabase
        .from("sale_payments")
        .select("id, sale_id")
        .not("paid_at", "is", null)
        .limit(500);
      if (ppErr) throw ppErr;

      const { data: invoices, error: iErr } = await supabase
        .from("sale_invoices")
        .select("sale_payment_id")
        .eq("invoice_type", "developer")
        .not("sale_payment_id", "is", null);
      if (iErr) throw iErr;

      const invoicedIds = new Set((invoices || []).map((i) => i.sale_payment_id));
      const missingBySale = new Map<string, number>();
      (paidPayments || []).forEach((p: any) => {
        if (!invoicedIds.has(p.id)) {
          missingBySale.set(p.sale_id, (missingBySale.get(p.sale_id) || 0) + 1);
        }
      });

      // 6. Pending reminders
      const { data: reminders, error: rErr } = await supabase
        .from("aftersales_reminders")
        .select("id, sale_id, milestone_id, note, reminder_date, status")
        .eq("status", "pending")
        .limit(500);
      if (rErr) throw rErr;

      // Group everything per sale
      const milestonesBySale = new Map<string, SaleMilestone[]>();
      (milestones || []).forEach((m: any) => {
        const arr = milestonesBySale.get(m.sale_id) || [];
        arr.push(m);
        milestonesBySale.set(m.sale_id, arr);
      });

      const choicesBySale = new Map<string, typeof choices>();
      (choices || []).forEach((c: any) => {
        const arr = choicesBySale.get(c.sale_id) || [];
        arr.push(c);
        choicesBySale.set(c.sale_id, arr);
      });

      const paymentsBySale = new Map<string, typeof payments>();
      (payments || []).forEach((p: any) => {
        const arr = paymentsBySale.get(p.sale_id) || [];
        arr.push(p);
        paymentsBySale.set(p.sale_id, arr);
      });

      const remindersBySale = new Map<string, Reminder[]>();
      (reminders || []).forEach((r: any) => {
        const arr = remindersBySale.get(r.sale_id) || [];
        arr.push(r);
        remindersBySale.set(r.sale_id, arr);
      });

      // Build summaries
      const summaries: SaleSummary[] = [];

      (sales || []).forEach((sale: any) => {
        const ms = milestonesBySale.get(sale.id) || [];
        if (ms.length === 0) return;

        const completed = ms.filter((m) => m.completed_at !== null);
        const incomplete = ms.filter((m) => m.completed_at === null);
        const saleChoices = choicesBySale.get(sale.id) || [];
        const salePayments = paymentsBySale.get(sale.id) || [];
        const missingInvCount = missingBySale.get(sale.id) || 0;
        const overduePayments = salePayments.filter((p: any) => isOverdue(p.due_date));
        const saleReminders = remindersBySale.get(sale.id) || [];
        const overdueReminders = saleReminders.filter(r => isOverdue(r.reminder_date));

        // Active phase
        const activePhase = detectActivePhase(ms as SaleMilestone[]);
        const activePhaseTasks = activePhase
          ? (ms as SaleMilestone[]).filter(m => m.phase === activePhase && m.completed_at === null)
          : [];
        const phaseSummaries = buildPhaseSummaries(ms as SaleMilestone[], activePhase);

        // Build objectives with cascade logic
        const objectives = buildObjectives(ms as SaleMilestone[]);
        const overdueObjectives = objectives.filter(o => !o.is_complete && o.overdue_tasks.length > 0);
        const blockedObjectives = objectives.filter(o => !o.is_complete && o.is_blocked);

        // Flatten overdue tasks from non-blocked objectives only
        const actionableOverdue = overdueObjectives.flatMap(o => o.overdue_tasks);
        const allWaiting = objectives.flatMap(o => o.waiting_tasks);

        // Escalated waiting tasks
        const waitingEscalated: WaitingTaskWithEscalation[] = allWaiting.map(t => {
          const { level, days } = getEscalationLevel(t.waiting_since);
          return { ...t, escalation_level: level, waiting_days: days };
        });

        // Urgency: overdue objectives * 3 + overdue payments * 2 + waiting * 2 + choices + missing invoices + overdue reminders * 2
        const urgency = overdueObjectives.length * 3 + overduePayments.length * 2 + allWaiting.length * 2 + saleChoices.length + missingInvCount + overdueReminders.length * 2;

        summaries.push({
          sale_id: sale.id,
          project_name: sale.project?.name || null,
          property_description: sale.property_description || null,
          phase: sale.status || null,
          total_milestones: ms.length,
          completed_milestones: completed.length,
          active_phase: activePhase,
          active_phase_tasks: activePhaseTasks,
          phase_summaries: phaseSummaries,
          objectives,
          overdue_objectives: overdueObjectives.length,
          blocked_objectives: blockedObjectives.length,
          overdue_tasks: actionableOverdue,
          upcoming_tasks: incomplete.filter((m) => !isOverdue(m.target_date)).slice(0, 3) as SaleMilestone[],
          open_choices: saleChoices as SaleChoice[],
          pending_payments: salePayments as SalePayment[],
          missing_invoice_count: missingInvCount,
          waiting_tasks: allWaiting,
          waiting_tasks_escalated: waitingEscalated,
          pending_reminders: saleReminders,
          overdue_reminders: overdueReminders,
          urgency_score: urgency,
        });
      });

      // Sort: most urgent first
      summaries.sort((a, b) => b.urgency_score - a.urgency_score);

      return summaries;
    },
  });
}
