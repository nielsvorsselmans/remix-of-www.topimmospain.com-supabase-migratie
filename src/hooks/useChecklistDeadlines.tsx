import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { subMonths, addDays, isAfter, differenceInDays } from "date-fns";
import type { TaskPriority } from "./useUpdateChecklistItem";

// Phase dependencies for determining if previous phase is complete
export const PHASE_DEPENDENCIES: Record<string, string | null> = {
  reservatie: null,
  koopcontract: 'reservatie',
  voorbereiding: 'koopcontract',
  akkoord: 'voorbereiding',
  overdracht: 'akkoord',
};

// Calculate dynamic priority based on deadline and phase completion
export function calculateDynamicPriority(
  targetDate: string | null,
  previousPhaseComplete: boolean
): TaskPriority {
  if (!targetDate || !previousPhaseComplete) return 'low';
  
  const deadline = new Date(targetDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);
  
  const daysUntilDeadline = differenceInDays(deadline, today);
  return daysUntilDeadline <= 7 ? 'high' : 'medium';
}

// Unified trigger types
export type DeadlineTrigger = 
  | 'sale_created' 
  | 'contract_uploaded' 
  | 'deposit_received' 
  | 'customer_signed' 
  | 'purchase_contract_signed' 
  | 'adjustments_completed' 
  | 'expected_delivery'
  | 'notary_completed';

// Consolidated deadline rule - single source of truth
export interface DeadlineRule {
  templateKey: string;
  phase: 'reservatie' | 'koopcontract' | 'voorbereiding' | 'akkoord' | 'overdracht' | 'nazorg';
  trigger: DeadlineTrigger;
  triggerTemplateKey: string | null; // The template_key to check for completion
  offsetDays?: number;
  offsetLabel: string;
  triggerLabel: string;
  priority: TaskPriority;
  useDeliveryDateCalculation?: 'voorbereiding' | 'akkoord' | 'overdracht';
}

// All deadline rules - single consolidated configuration
export const DEADLINE_RULES: DeadlineRule[] = [
  // ===== RESERVATIE FASE =====
  // Na sale_created
  { templateKey: 'res_koperdata', phase: 'reservatie', trigger: 'sale_created', triggerTemplateKey: null, offsetDays: 1, offsetLabel: '+1 dag', triggerLabel: 'Na aanmaken verkoop', priority: 'high' },
  { templateKey: 'res_contract_upload', phase: 'reservatie', trigger: 'sale_created', triggerTemplateKey: null, offsetDays: 7, offsetLabel: '+7 dagen', triggerLabel: 'Na aanmaken verkoop', priority: 'medium' },
  // Na contract_uploaded
  { templateKey: 'res_advocaat', phase: 'reservatie', trigger: 'contract_uploaded', triggerTemplateKey: 'res_contract_upload', offsetDays: 0, offsetLabel: 'direct', triggerLabel: 'Na contract upload', priority: 'high' },
  { templateKey: 'res_klant_ondertekend', phase: 'reservatie', trigger: 'contract_uploaded', triggerTemplateKey: 'res_contract_upload', offsetDays: 3, offsetLabel: '+3 dagen', triggerLabel: 'Na contract upload', priority: 'high' },
  { templateKey: 'res_developer_ondertekend', phase: 'reservatie', trigger: 'contract_uploaded', triggerTemplateKey: 'res_contract_upload', offsetDays: 3, offsetLabel: '+3 dagen', triggerLabel: 'Na contract upload', priority: 'medium' },
  { templateKey: 'res_aanbetaling', phase: 'reservatie', trigger: 'contract_uploaded', triggerTemplateKey: 'res_contract_upload', offsetDays: 3, offsetLabel: '+3 dagen', triggerLabel: 'Na contract upload', priority: 'high' },
  // Na deposit_received
  { templateKey: 'res_betaalplan', phase: 'reservatie', trigger: 'deposit_received', triggerTemplateKey: 'res_aanbetaling', offsetDays: 5, offsetLabel: '+5 dagen', triggerLabel: 'Na aanbetaling ontvangen', priority: 'high' },
  { templateKey: 'res_facturen', phase: 'reservatie', trigger: 'deposit_received', triggerTemplateKey: 'res_aanbetaling', offsetDays: 5, offsetLabel: '+5 dagen', triggerLabel: 'Na aanbetaling ontvangen', priority: 'medium' },
  { templateKey: 'res_extras', phase: 'reservatie', trigger: 'deposit_received', triggerTemplateKey: 'res_aanbetaling', offsetDays: 5, offsetLabel: '+5 dagen', triggerLabel: 'Na aanbetaling ontvangen', priority: 'medium' },
  
  // ===== KOOPCONTRACT FASE =====
  // Na customer_signed (reservatiecontract)
  { templateKey: 'koop_grondplan', phase: 'koopcontract', trigger: 'customer_signed', triggerTemplateKey: 'res_klant_ondertekend', offsetDays: 30, offsetLabel: '+30 dagen', triggerLabel: 'Na reservatie ondertekening', priority: 'medium' },
  { templateKey: 'koop_specificaties', phase: 'koopcontract', trigger: 'customer_signed', triggerTemplateKey: 'res_klant_ondertekend', offsetDays: 30, offsetLabel: '+30 dagen', triggerLabel: 'Na reservatie ondertekening', priority: 'medium' },
  { templateKey: 'koop_bouwvergunning', phase: 'koopcontract', trigger: 'customer_signed', triggerTemplateKey: 'res_klant_ondertekend', offsetDays: 30, offsetLabel: '+30 dagen', triggerLabel: 'Na reservatie ondertekening', priority: 'medium' },
  { templateKey: 'koop_kadastraal', phase: 'koopcontract', trigger: 'customer_signed', triggerTemplateKey: 'res_klant_ondertekend', offsetDays: 30, offsetLabel: '+30 dagen', triggerLabel: 'Na reservatie ondertekening', priority: 'medium' },
  { templateKey: 'koop_eigendomsregister', phase: 'koopcontract', trigger: 'customer_signed', triggerTemplateKey: 'res_klant_ondertekend', offsetDays: 30, offsetLabel: '+30 dagen', triggerLabel: 'Na reservatie ondertekening', priority: 'medium' },
  { templateKey: 'koop_bankgarantie', phase: 'koopcontract', trigger: 'customer_signed', triggerTemplateKey: 'res_klant_ondertekend', offsetDays: 30, offsetLabel: '+30 dagen', triggerLabel: 'Na reservatie ondertekening', priority: 'medium' },
  { templateKey: 'koop_contract', phase: 'koopcontract', trigger: 'customer_signed', triggerTemplateKey: 'res_klant_ondertekend', offsetDays: 30, offsetLabel: '+30 dagen', triggerLabel: 'Na reservatie ondertekening', priority: 'high' },
  { templateKey: 'koop_klant_ondertekend', phase: 'koopcontract', trigger: 'customer_signed', triggerTemplateKey: 'res_klant_ondertekend', offsetDays: 30, offsetLabel: '+30 dagen', triggerLabel: 'Na reservatie ondertekening', priority: 'high' },
  { templateKey: 'koop_developer_ondertekend', phase: 'koopcontract', trigger: 'customer_signed', triggerTemplateKey: 'res_klant_ondertekend', offsetDays: 30, offsetLabel: '+30 dagen', triggerLabel: 'Na reservatie ondertekening', priority: 'medium' },
  
  // ===== VOORBEREIDING FASE =====
  // Na purchase_contract_signed (koopcontract)
  { templateKey: 'voorb_elektriciteit', phase: 'voorbereiding', trigger: 'purchase_contract_signed', triggerTemplateKey: 'koop_klant_ondertekend', offsetLabel: '8m voor oplevering', triggerLabel: 'Na koopcontract ondertekening', priority: 'medium', useDeliveryDateCalculation: 'voorbereiding' },
  { templateKey: 'voorb_afmetingen', phase: 'voorbereiding', trigger: 'purchase_contract_signed', triggerTemplateKey: 'koop_klant_ondertekend', offsetLabel: '8m voor oplevering', triggerLabel: 'Na koopcontract ondertekening', priority: 'medium', useDeliveryDateCalculation: 'voorbereiding' },
  { templateKey: 'voorb_extras_docs', phase: 'voorbereiding', trigger: 'purchase_contract_signed', triggerTemplateKey: 'koop_klant_ondertekend', offsetLabel: '8m voor oplevering', triggerLabel: 'Na koopcontract ondertekening', priority: 'medium', useDeliveryDateCalculation: 'voorbereiding' },
  { templateKey: 'voorb_gesprek', phase: 'voorbereiding', trigger: 'purchase_contract_signed', triggerTemplateKey: 'koop_klant_ondertekend', offsetLabel: '8m voor oplevering', triggerLabel: 'Na koopcontract ondertekening', priority: 'high', useDeliveryDateCalculation: 'voorbereiding' },
  { templateKey: 'voorb_aanpassingen', phase: 'voorbereiding', trigger: 'purchase_contract_signed', triggerTemplateKey: 'koop_klant_ondertekend', offsetLabel: '8m voor oplevering', triggerLabel: 'Na koopcontract ondertekening', priority: 'medium', useDeliveryDateCalculation: 'voorbereiding' },
  
  // ===== AKKOORD FASE =====
  // Na adjustments_completed
  { templateKey: 'akk_specs_compleet', phase: 'akkoord', trigger: 'adjustments_completed', triggerTemplateKey: 'voorb_aanpassingen', offsetLabel: '4m voor oplevering', triggerLabel: 'Na aanpassingen doorgegeven', priority: 'high', useDeliveryDateCalculation: 'akkoord' },
  { templateKey: 'akk_grondplan', phase: 'akkoord', trigger: 'adjustments_completed', triggerTemplateKey: 'voorb_aanpassingen', offsetLabel: '4m voor oplevering', triggerLabel: 'Na aanpassingen doorgegeven', priority: 'medium', useDeliveryDateCalculation: 'akkoord' },
  { templateKey: 'akk_elektriciteit', phase: 'akkoord', trigger: 'adjustments_completed', triggerTemplateKey: 'voorb_aanpassingen', offsetLabel: '4m voor oplevering', triggerLabel: 'Na aanpassingen doorgegeven', priority: 'medium', useDeliveryDateCalculation: 'akkoord' },
  { templateKey: 'akk_extras', phase: 'akkoord', trigger: 'adjustments_completed', triggerTemplateKey: 'voorb_aanpassingen', offsetLabel: '4m voor oplevering', triggerLabel: 'Na aanpassingen doorgegeven', priority: 'medium', useDeliveryDateCalculation: 'akkoord' },
  { templateKey: 'akk_definitief', phase: 'akkoord', trigger: 'adjustments_completed', triggerTemplateKey: 'voorb_aanpassingen', offsetLabel: '4m voor oplevering', triggerLabel: 'Na aanpassingen doorgegeven', priority: 'high', useDeliveryDateCalculation: 'akkoord' },
  { templateKey: 'akk_doorgegeven', phase: 'akkoord', trigger: 'adjustments_completed', triggerTemplateKey: 'voorb_aanpassingen', offsetLabel: '4m voor oplevering', triggerLabel: 'Na aanpassingen doorgegeven', priority: 'medium', useDeliveryDateCalculation: 'akkoord' },
  
  // ===== OVERDRACHT FASE =====
  { templateKey: 'overd_notaris_datum', phase: 'overdracht', trigger: 'expected_delivery', triggerTemplateKey: null, offsetDays: -14, offsetLabel: '14d voor oplevering', triggerLabel: 'Voor opleverdatum', priority: 'high', useDeliveryDateCalculation: 'overdracht' },
  { templateKey: 'overd_snagging', phase: 'overdracht', trigger: 'expected_delivery', triggerTemplateKey: null, offsetDays: -7, offsetLabel: '7d voor oplevering', triggerLabel: 'Voor opleverdatum', priority: 'high', useDeliveryDateCalculation: 'overdracht' },
  
  // ===== NAZORG FASE (getriggerd door notarisdatum) =====
  { templateKey: 'overd_notariele_akte', phase: 'nazorg', trigger: 'notary_completed', triggerTemplateKey: null, offsetDays: 7, offsetLabel: '+7d na notaris', triggerLabel: 'Na notarisdatum', priority: 'medium' },
  { templateKey: 'overd_epc', phase: 'nazorg', trigger: 'notary_completed', triggerTemplateKey: null, offsetDays: 14, offsetLabel: '+14d na notaris', triggerLabel: 'Na notarisdatum', priority: 'medium' },
  { templateKey: 'overd_bewoonbaarheid', phase: 'nazorg', trigger: 'notary_completed', triggerTemplateKey: null, offsetDays: 14, offsetLabel: '+14d na notaris', triggerLabel: 'Na notarisdatum', priority: 'medium' },
  { templateKey: 'overd_nutsvoorzieningen', phase: 'nazorg', trigger: 'notary_completed', triggerTemplateKey: null, offsetDays: 30, offsetLabel: '+30d na notaris', triggerLabel: 'Na notarisdatum', priority: 'medium' },
  { templateKey: 'overd_belastingen', phase: 'nazorg', trigger: 'notary_completed', triggerTemplateKey: null, offsetDays: 30, offsetLabel: '+30d na notaris', triggerLabel: 'Na notarisdatum', priority: 'medium' },
  { templateKey: 'overd_vve', phase: 'nazorg', trigger: 'notary_completed', triggerTemplateKey: null, offsetDays: 30, offsetLabel: '+30d na notaris', triggerLabel: 'Na notarisdatum', priority: 'medium' },
  { templateKey: 'overd_verzekering', phase: 'nazorg', trigger: 'notary_completed', triggerTemplateKey: null, offsetDays: 30, offsetLabel: '+30d na notaris', triggerLabel: 'Na notarisdatum', priority: 'medium' },
  { templateKey: 'overd_financieel', phase: 'nazorg', trigger: 'notary_completed', triggerTemplateKey: null, offsetDays: 30, offsetLabel: '+30d na notaris', triggerLabel: 'Na notarisdatum', priority: 'medium' },
  { templateKey: 'overd_followup', phase: 'nazorg', trigger: 'notary_completed', triggerTemplateKey: null, offsetDays: 14, offsetLabel: '+14d na notaris', triggerLabel: 'Na notarisdatum', priority: 'medium' },
  { templateKey: 'overd_review', phase: 'nazorg', trigger: 'notary_completed', triggerTemplateKey: null, offsetDays: 30, offsetLabel: '+30d na notaris', triggerLabel: 'Na notarisdatum', priority: 'low' },
  { templateKey: 'overd_archief', phase: 'nazorg', trigger: 'notary_completed', triggerTemplateKey: null, offsetDays: 30, offsetLabel: '+30d na notaris', triggerLabel: 'Na notarisdatum', priority: 'low' },
];

// Lookup helpers
export function getDeadlineRule(templateKey: string): DeadlineRule | undefined {
  return DEADLINE_RULES.find(r => r.templateKey === templateKey);
}

export function getDeadlineRulesByTrigger(trigger: DeadlineTrigger): DeadlineRule[] {
  return DEADLINE_RULES.filter(r => r.trigger === trigger);
}

// Helper functie om deadline te berekenen
export function calculateDeadline(baseDate: string, offsetDays: number): string {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split('T')[0];
}

// Helper functie voor voorbereiding deadline berekening
export function calculateVoorbereidingDeadline(
  expectedDeliveryDate: string | null,
  purchaseContractSignedAt: string
): { deadline: string; usedFallback: boolean } {
  const signingDate = new Date(purchaseContractSignedAt);
  const thirtyDaysAfterSigning = addDays(signingDate, 30);
  const today = new Date();
  
  if (expectedDeliveryDate) {
    const deliveryDate = new Date(expectedDeliveryDate);
    const eightMonthsBefore = subMonths(deliveryDate, 8);
    
    if (isAfter(eightMonthsBefore, today)) {
      return {
        deadline: eightMonthsBefore.toISOString().split('T')[0],
        usedFallback: false
      };
    }
  }
  
  return {
    deadline: thirtyDaysAfterSigning.toISOString().split('T')[0],
    usedFallback: true
  };
}

// Helper functie voor akkoord deadline berekening
export function calculateAkkoordDeadline(
  expectedDeliveryDate: string | null,
  adjustmentsCompletedAt: string
): { deadline: string; usedFallback: boolean; cappedToDelivery: boolean } {
  const completedDate = new Date(adjustmentsCompletedAt);
  const thirtyDaysAfterCompletion = addDays(completedDate, 30);
  const today = new Date();
  
  let targetDate: Date;
  let usedFallback = true;
  let cappedToDelivery = false;
  
  if (expectedDeliveryDate) {
    const deliveryDate = new Date(expectedDeliveryDate);
    const fourMonthsBefore = subMonths(deliveryDate, 4);
    
    if (isAfter(fourMonthsBefore, today)) {
      targetDate = fourMonthsBefore;
      usedFallback = false;
    } else {
      targetDate = thirtyDaysAfterCompletion;
    }
    
    if (isAfter(targetDate, deliveryDate)) {
      targetDate = deliveryDate;
      cappedToDelivery = true;
    }
  } else {
    targetDate = thirtyDaysAfterCompletion;
  }
  
  return {
    deadline: targetDate.toISOString().split('T')[0],
    usedFallback,
    cappedToDelivery
  };
}

// Trigger to milestone template key mapping
const TRIGGER_MILESTONE_KEYS: Record<DeadlineTrigger, string | null> = {
  sale_created: null,
  contract_uploaded: 'res_contract_upload',
  deposit_received: 'res_aanbetaling',
  customer_signed: 'res_klant_ondertekend',
  purchase_contract_signed: 'koop_klant_ondertekend',
  adjustments_completed: 'voorb_aanpassingen',
  expected_delivery: null,
  notary_completed: null,
};

// ============================================================
// CONSOLIDATED HOOK: useCascadeDeadlines
// Replaces: useSetContractUploadDeadlines, useSetDepositReceivedDeadlines,
//           useSetCustomerSignedDeadlines, useSetPurchaseContractSignedDeadlines,
//           useSetAdjustmentsCompletedDeadlines
// ============================================================
export function useCascadeDeadlines() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, trigger }: { saleId: string; trigger: DeadlineTrigger }) => {
      // Get base date for the trigger
      let triggerDate: string;
      let expectedDeliveryDate: string | null = null;

      if (trigger === 'sale_created') {
        const { data: sale, error } = await supabase
          .from("sales")
          .select("created_at")
          .eq("id", saleId)
          .single();
        if (error || !sale) throw new Error("Sale niet gevonden");
        triggerDate = sale.created_at;
      } else if (trigger === 'expected_delivery') {
        const { data: sale, error } = await supabase
          .from("sales")
          .select("expected_delivery_date")
          .eq("id", saleId)
          .single();
        if (error || !sale?.expected_delivery_date) throw new Error("Opleverdatum niet gevonden");
        triggerDate = sale.expected_delivery_date;
        expectedDeliveryDate = sale.expected_delivery_date;
      } else if (trigger === 'notary_completed') {
        const { data: sale, error } = await supabase
          .from("sales")
          .select("notary_date")
          .eq("id", saleId)
          .single();
        if (error || !sale?.notary_date) throw new Error("Notarisdatum niet gevonden");
        triggerDate = sale.notary_date;
      } else {
        // Get the trigger milestone's completed_at date
        const triggerTemplateKey = TRIGGER_MILESTONE_KEYS[trigger];
        if (!triggerTemplateKey) throw new Error("Ongeldige trigger");

        const { data: triggerMilestone, error } = await supabase
          .from("sale_milestones")
          .select("completed_at")
          .eq("sale_id", saleId)
          .eq("template_key", triggerTemplateKey)
          .single();

        if (error || !triggerMilestone?.completed_at) {
          throw new Error(`Trigger milestone niet voltooid: ${triggerTemplateKey}`);
        }
        triggerDate = triggerMilestone.completed_at;
      }

      // For voorbereiding/akkoord, also fetch expected_delivery_date
      if (trigger === 'purchase_contract_signed' || trigger === 'adjustments_completed') {
        const { data: sale } = await supabase
          .from("sales")
          .select("expected_delivery_date")
          .eq("id", saleId)
          .single();
        expectedDeliveryDate = sale?.expected_delivery_date || null;
      }

      // Get all rules for this trigger
      const rules = getDeadlineRulesByTrigger(trigger);
      
      // Fetch all incomplete milestones for the relevant phases
      const phases = [...new Set(rules.map(r => r.phase))];
      const { data: milestones, error: milestonesError } = await supabase
        .from("sale_milestones")
        .select("id, template_key, phase")
        .eq("sale_id", saleId)
        .in("phase", phases)
        .is("completed_at", null);

      if (milestonesError) throw milestonesError;

      const updates: { id: string; target_date: string; priority: TaskPriority }[] = [];
      let usedFallback = false;
      let cappedToDelivery = false;
      let hasDeliveryDate = !!expectedDeliveryDate;

      for (const milestone of milestones || []) {
        const rule = rules.find(r => r.templateKey === milestone.template_key);
        if (!rule) continue;

        let targetDate: string;

        // Calculate deadline based on rule type
        if (rule.trigger === 'notary_completed') {
          // Simple offset from notary date
          targetDate = calculateDeadline(triggerDate, rule.offsetDays || 0);
        } else if (rule.useDeliveryDateCalculation === 'voorbereiding') {
          const result = calculateVoorbereidingDeadline(expectedDeliveryDate, triggerDate);
          targetDate = result.deadline;
          usedFallback = result.usedFallback;
        } else if (rule.useDeliveryDateCalculation === 'akkoord') {
          const result = calculateAkkoordDeadline(expectedDeliveryDate, triggerDate);
          targetDate = result.deadline;
          usedFallback = result.usedFallback;
          cappedToDelivery = result.cappedToDelivery;
        } else if (rule.useDeliveryDateCalculation === 'overdracht') {
          const deliveryDate = new Date(triggerDate);
          deliveryDate.setDate(deliveryDate.getDate() + (rule.offsetDays || 0));
          targetDate = deliveryDate.toISOString().split('T')[0];
        } else {
          // Simple offset calculation
          targetDate = calculateDeadline(triggerDate, rule.offsetDays || 0);
        }

        updates.push({
          id: milestone.id,
          target_date: targetDate,
          priority: rule.priority,
        });
      }

      // Batch update all deadlines
      for (const update of updates) {
        const { error } = await supabase
          .from("sale_milestones")
          .update({ target_date: update.target_date, priority: update.priority })
          .eq("id", update.id);

        if (error) throw error;
      }

      return { 
        updated: updates.length, 
        trigger,
        usedFallback,
        cappedToDelivery,
        hasDeliveryDate 
      };
    },
    onSuccess: (result, { saleId, trigger }) => {
      queryClient.invalidateQueries({ queryKey: ["sale-checklist", saleId] });
      queryClient.invalidateQueries({ queryKey: ["all-open-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["sale", saleId] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      
      if (result.updated === 0) return;

      // Custom success messages based on trigger
      const messages: Record<DeadlineTrigger, string> = {
        sale_created: `${result.updated} initële deadlines ingesteld`,
        contract_uploaded: `${result.updated} deadlines ingesteld voor volgende taken`,
        deposit_received: `${result.updated} deadlines ingesteld (5 dagen na aanbetaling)`,
        customer_signed: `${result.updated} koopcontract deadlines ingesteld (30 dagen)`,
        purchase_contract_signed: result.usedFallback 
          ? (result.hasDeliveryDate 
            ? `${result.updated} voorbereiding deadlines ingesteld (30 dagen - oplevering nadert)`
            : `${result.updated} voorbereiding deadlines ingesteld (30 dagen) - geen opleverdatum`)
          : `${result.updated} voorbereiding deadlines ingesteld (8 maanden voor oplevering)`,
        adjustments_completed: result.cappedToDelivery
          ? `${result.updated} akkoord deadlines ingesteld (begrensd tot opleverdatum)`
          : (result.usedFallback 
            ? (result.hasDeliveryDate 
              ? `${result.updated} akkoord deadlines ingesteld (30 dagen - oplevering nadert)`
              : `${result.updated} akkoord deadlines ingesteld (30 dagen) - geen opleverdatum`)
            : `${result.updated} akkoord deadlines ingesteld (4 maanden voor oplevering)`),
        expected_delivery: `${result.updated} overdracht deadlines ingesteld`,
        notary_completed: `${result.updated} nazorg deadlines ingesteld (na notarisdatum)`,
      };

      const isWarning = trigger === 'purchase_contract_signed' && result.usedFallback && !result.hasDeliveryDate ||
                        trigger === 'adjustments_completed' && (result.cappedToDelivery || (result.usedFallback && !result.hasDeliveryDate));
      
      if (isWarning) {
        toast.warning(messages[trigger]);
      } else {
        toast.success(messages[trigger]);
      }
    },
    onError: (_, { trigger }) => {
      const errorMessages: Record<DeadlineTrigger, string> = {
        sale_created: "Fout bij instellen initële deadlines",
        contract_uploaded: "Fout bij instellen deadlines",
        deposit_received: "Fout bij instellen deadlines na aanbetaling",
        customer_signed: "Fout bij instellen koopcontract deadlines",
        purchase_contract_signed: "Fout bij instellen voorbereiding deadlines",
        adjustments_completed: "Fout bij instellen akkoord deadlines",
        expected_delivery: "Fout bij instellen overdracht deadlines",
        notary_completed: "Fout bij instellen nazorg deadlines",
      };
      toast.error(errorMessages[trigger]);
    },
  });
}

// ============================================================
// RECALCULATE ALL DEADLINES HOOK (unchanged logic, kept separate)
// ============================================================
export function useRecalculateDeadlines() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (saleId: string) => {
      // Fetch sale and all milestone completion dates
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .select("created_at, expected_delivery_date, notary_date")
        .eq("id", saleId)
        .single();

      if (saleError || !sale) throw new Error("Sale niet gevonden");

      // Fetch trigger milestone dates
      const triggerKeys = ['res_contract_upload', 'res_klant_ondertekend', 'koop_klant_ondertekend', 'voorb_aanpassingen', 'res_aanbetaling', 'overd_notaris_datum'];
      const { data: triggerMilestones } = await supabase
        .from("sale_milestones")
        .select("template_key, completed_at")
        .eq("sale_id", saleId)
        .in("template_key", triggerKeys);

      const triggerDates: Record<string, string | null> = {};
      for (const tm of triggerMilestones || []) {
        if (tm.template_key) triggerDates[tm.template_key] = tm.completed_at;
      }

      // Fetch all incomplete milestones
      const { data: milestones, error: milestonesError } = await supabase
        .from("sale_milestones")
        .select("id, template_key, completed_at, phase")
        .eq("sale_id", saleId)
        .in("phase", ["reservatie", "koopcontract", "voorbereiding", "akkoord", "overdracht", "nazorg"]);

      if (milestonesError) throw milestonesError;

      let updatedCount = 0;

      for (const milestone of milestones || []) {
        if (milestone.completed_at) continue;

        const rule = getDeadlineRule(milestone.template_key || '');
        if (!rule) continue;

        let targetDate: string | null = null;

        // Determine base date based on trigger
        let baseDate: string | null = null;
        switch (rule.trigger) {
          case 'sale_created':
            baseDate = sale.created_at;
            break;
          case 'contract_uploaded':
            baseDate = triggerDates['res_contract_upload'] || null;
            break;
          case 'deposit_received':
            baseDate = triggerDates['res_aanbetaling'] || null;
            break;
          case 'customer_signed':
            baseDate = triggerDates['res_klant_ondertekend'] || null;
            break;
          case 'purchase_contract_signed':
            baseDate = triggerDates['koop_klant_ondertekend'] || null;
            break;
          case 'adjustments_completed':
            baseDate = triggerDates['voorb_aanpassingen'] || null;
            break;
          case 'expected_delivery':
            baseDate = sale.expected_delivery_date;
            break;
          case 'notary_completed':
            baseDate = (sale as any).notary_date;
            break;
          case 'notary_completed':
            baseDate = (sale as any).notary_date;
            break;
        }

        if (!baseDate) continue;

        // Calculate deadline
        if (rule.trigger === 'notary_completed') {
          targetDate = calculateDeadline(baseDate, rule.offsetDays || 0);
        } else if (rule.useDeliveryDateCalculation === 'voorbereiding') {
          const result = calculateVoorbereidingDeadline(sale.expected_delivery_date, baseDate);
          targetDate = result.deadline;
        } else if (rule.useDeliveryDateCalculation === 'akkoord') {
          const result = calculateAkkoordDeadline(sale.expected_delivery_date, baseDate);
          targetDate = result.deadline;
        } else if (rule.useDeliveryDateCalculation === 'overdracht') {
          const deliveryDate = new Date(baseDate);
          deliveryDate.setDate(deliveryDate.getDate() + (rule.offsetDays || 0));
          targetDate = deliveryDate.toISOString().split('T')[0];
        } else if (rule.offsetDays !== undefined) {
          targetDate = calculateDeadline(baseDate, rule.offsetDays);
        }

        if (targetDate) {
          const { error } = await supabase
            .from("sale_milestones")
            .update({ target_date: targetDate, priority: rule.priority })
            .eq("id", milestone.id);

          if (error) throw error;
          updatedCount++;
        }
      }

      return { updated: updatedCount };
    },
    onSuccess: (result, saleId) => {
      queryClient.invalidateQueries({ queryKey: ["sale-checklist", saleId] });
      queryClient.invalidateQueries({ queryKey: ["all-open-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["sale", saleId] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success(`${result.updated} deadlines herberekend`);
    },
    onError: () => {
      toast.error("Fout bij herberekenen deadlines");
    },
  });
}

