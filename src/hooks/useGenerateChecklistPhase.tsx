import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TaskPriority } from "./useUpdateChecklistItem";
import {
  getDeadlineRule,
  calculateDeadline,
} from "./useChecklistDeadlines";
import {
  GEBLOKKEERD_CHECKLIST,
  RESERVATIE_CHECKLIST,
  KOOPCONTRACT_CHECKLIST,
  VOORBEREIDING_CHECKLIST,
  AKKOORD_CHECKLIST,
  OVERDRACHT_CHECKLIST,
  NAZORG_CHECKLIST,
} from "./checklistTemplates";

// Phase configuration with templates
export const PHASE_TEMPLATES = {
  geblokkeerd: {
    template: GEBLOKKEERD_CHECKLIST,
    label: 'Geblokkeerd',
  },
  reservatie: {
    template: RESERVATIE_CHECKLIST,
    label: 'Reservatie',
  },
  koopcontract: {
    template: KOOPCONTRACT_CHECKLIST,
    label: 'Koopcontract',
  },
  voorbereiding: {
    template: VOORBEREIDING_CHECKLIST,
    label: 'Voorbereiding',
  },
  akkoord: {
    template: AKKOORD_CHECKLIST,
    label: 'Akkoord',
  },
  overdracht: {
    template: OVERDRACHT_CHECKLIST,
    label: 'Overdracht',
  },
  nazorg: {
    template: NAZORG_CHECKLIST,
    label: 'Nazorg',
  },
} as const;

export type ChecklistPhase = keyof typeof PHASE_TEMPLATES;

interface GeneratePhaseParams {
  saleId: string;
  phase: ChecklistPhase;
}

interface DeadlineResult {
  targetDate: string | null;
  priority: TaskPriority;
}

interface SaleData {
  created_at: string | null;
  expected_delivery_date: string | null;
}

// Calculate deadline based on rule configuration
function calculateItemDeadline(
  templateKey: string,
  sale: SaleData | null
): DeadlineResult {
  const rule = getDeadlineRule(templateKey);
  
  if (!rule) {
    return { targetDate: null, priority: 'low' };
  }

  // Only set initial deadlines for sale_created and expected_delivery triggers
  // Other triggers (contract_uploaded, customer_signed, etc.) are set via cascade hooks
  switch (rule.trigger) {
    case 'sale_created':
      if (sale?.created_at && rule.offsetDays !== undefined) {
        return {
          targetDate: calculateDeadline(sale.created_at, rule.offsetDays),
          priority: rule.priority,
        };
      }
      break;
      
    case 'expected_delivery':
      if (sale?.expected_delivery_date && rule.offsetDays !== undefined) {
        const deliveryDate = new Date(sale.expected_delivery_date);
        deliveryDate.setDate(deliveryDate.getDate() + rule.offsetDays);
        return {
          targetDate: deliveryDate.toISOString().split('T')[0],
          priority: rule.priority,
        };
      }
      break;
  }

  // Return priority from rule even if no deadline yet
  return { targetDate: null, priority: rule.priority };
}

// Generic hook to generate checklist items for any phase
export function useGenerateChecklistPhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, phase }: GeneratePhaseParams) => {
      const phaseConfig = PHASE_TEMPLATES[phase];
      
      // 1. Fetch sale data for deadline calculations
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .select("created_at, expected_delivery_date")
        .eq("id", saleId)
        .single();

      if (saleError) throw saleError;

      // 2. Check existing items for this phase
      const { data: existing } = await supabase
        .from("sale_milestones")
        .select("template_key")
        .eq("sale_id", saleId)
        .eq("phase", phase);

      const existingKeys = new Set(existing?.map(e => e.template_key) || []);

      // 3. Filter to only missing items
      const itemsToCreate = phaseConfig.template.filter(
        item => !existingKeys.has(item.key)
      );

      if (itemsToCreate.length === 0) {
        return { created: 0, phase };
      }

      // 4. Calculate deadlines per item and build milestone records
      const milestones = itemsToCreate.map(item => {
        const deadlineResult = calculateItemDeadline(
          item.key,
          sale
        );

        // Get customerVisible from template, default to true
        const customerVisible = 'customerVisible' in item 
          ? (item as { customerVisible?: boolean }).customerVisible ?? true
          : true;

        // Get group from template
        const group = 'group' in item 
          ? (item as { group?: string }).group ?? null
          : null;

        return {
          sale_id: saleId,
          title: item.title,
          description: item.description,
          phase: phase,
          template_key: item.key,
          order_index: item.order,
          customer_visible: customerVisible,
          partner_visible: false,
          target_date: deadlineResult.targetDate,
          priority: deadlineResult.priority,
          milestone_group: group,
        };
      });

      // 5. Insert all milestones
      const { error } = await supabase
        .from("sale_milestones")
        .insert(milestones);

      if (error) throw error;
      return { created: itemsToCreate.length, phase };
    },
    onSuccess: (result, { saleId }) => {
      queryClient.invalidateQueries({ queryKey: ["sale-checklist", saleId] });
      queryClient.invalidateQueries({ queryKey: ["all-open-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["sale", saleId] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      
      const label = PHASE_TEMPLATES[result.phase].label;
      if (result.created > 0) {
        toast.success(`${result.created} ${label} taken toegevoegd`);
      } else {
        toast.info(`${label} checklist was al compleet`);
      }
    },
    onError: (_, { phase }) => {
      toast.error(`Fout bij genereren ${PHASE_TEMPLATES[phase].label} checklist`);
    },
  });
}

// Hook to generate ALL missing phases at once (optimized version)
export function useGenerateAllMissingPhases() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (saleId: string) => {
      // 1. Fetch sale data for deadline calculations
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .select("created_at, expected_delivery_date")
        .eq("id", saleId)
        .single();

      if (saleError) throw saleError;

      // 2. Get all existing milestones for this sale
      const { data: existing } = await supabase
        .from("sale_milestones")
        .select("template_key")
        .eq("sale_id", saleId);

      const existingKeys = new Set(existing?.map(e => e.template_key) || []);

      // 3. Build all missing items across all phases
      const allItemsToCreate: Array<{
        sale_id: string;
        title: string;
        description: string;
        phase: string;
        template_key: string;
        order_index: number;
        customer_visible: boolean;
        partner_visible: boolean;
        target_date: string | null;
        priority: TaskPriority;
        milestone_group: string | null;
      }> = [];

      const phases: ChecklistPhase[] = ['geblokkeerd', 'reservatie', 'koopcontract', 'voorbereiding', 'akkoord', 'overdracht', 'nazorg'];

      for (const phase of phases) {
        const phaseConfig = PHASE_TEMPLATES[phase];
        const missingItems = phaseConfig.template.filter(item => !existingKeys.has(item.key));

        for (const item of missingItems) {
          const deadlineResult = calculateItemDeadline(
            item.key,
            sale
          );

          const customerVisible = 'customerVisible' in item 
            ? (item as { customerVisible?: boolean }).customerVisible ?? true
            : true;

          const group = 'group' in item 
            ? (item as { group?: string }).group ?? null
            : null;

          allItemsToCreate.push({
            sale_id: saleId,
            title: item.title,
            description: item.description,
            phase: phase,
            template_key: item.key,
            order_index: item.order,
            customer_visible: customerVisible,
            partner_visible: false,
            target_date: deadlineResult.targetDate,
            priority: deadlineResult.priority,
            milestone_group: group,
          });
        }
      }

      if (allItemsToCreate.length === 0) {
        return { created: 0, phases: [] as string[] };
      }

      // 4. Insert all missing items at once
      const { error } = await supabase
        .from("sale_milestones")
        .insert(allItemsToCreate);

      if (error) throw error;

      // Determine which phases were added
      const addedPhases = [...new Set(allItemsToCreate.map(item => item.phase))];

      return { created: allItemsToCreate.length, phases: addedPhases };
    },
    onSuccess: (result, saleId) => {
      queryClient.invalidateQueries({ queryKey: ["sale-checklist", saleId] });
      queryClient.invalidateQueries({ queryKey: ["all-open-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["sale", saleId] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      if (result.created > 0) {
        const phaseLabels = result.phases.map(p => PHASE_TEMPLATES[p as ChecklistPhase]?.label || p);
        toast.success(`${result.created} taken toegevoegd voor: ${phaseLabels.join(', ')}`);
      } else {
        toast.info("Alle fases waren al compleet");
      }
    },
    onError: () => {
      toast.error("Fout bij genereren ontbrekende taken");
    },
  });
}
