import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { checkAndUpdateSaleStatus } from "./useAutoSaleStatusTransition";

// Re-export templates from the dedicated templates file
export {
  GEBLOKKEERD_CHECKLIST,
  RESERVATIE_CHECKLIST,
  KOOPCONTRACT_CHECKLIST,
  VOORBEREIDING_CHECKLIST,
  AKKOORD_CHECKLIST,
  OVERDRACHT_CHECKLIST,
  NAZORG_CHECKLIST,
  type ChecklistKey,
} from "./checklistTemplates";

// Main checklist item type
export interface SaleChecklistItem {
  id: string;
  sale_id: string;
  title: string;
  description: string | null;
  completed_at: string | null;
  target_date: string | null;
  priority: 'high' | 'medium' | 'low' | null;
  phase: string | null;
  template_key: string | null;
  order_index: number;
  customer_visible: boolean;
  partner_visible: boolean;
  waiting_since: string | null;
  waiting_for: string | null;
  milestone_group: string | null;
  prerequisite_for: string | null;
}

// Main hook to fetch sale checklist
export function useSaleChecklist(saleId: string | undefined) {
  return useQuery({
    queryKey: ["sale-checklist", saleId],
    queryFn: async () => {
      if (!saleId) return [];

      const { data, error } = await supabase
        .from("sale_milestones")
        .select("*")
        .eq("sale_id", saleId)
        .in("phase", ["reservatie", "koopcontract", "voorbereiding", "akkoord", "overdracht", "nazorg"])
        .order("phase", { ascending: true })
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data as SaleChecklistItem[];
    },
    enabled: !!saleId,
  });
}

// Re-export generate hooks from the generic module
export {
  useGenerateChecklistPhase,
  useGenerateAllMissingPhases,
  PHASE_TEMPLATES,
  type ChecklistPhase,
} from "./useGenerateChecklistPhase";

export function useToggleChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      itemId, 
      isCompleted,
      saleId 
    }: { 
      itemId: string; 
      isCompleted: boolean;
      saleId: string;
    }) => {
      const { error } = await supabase
        .from("sale_milestones")
        .update({
          completed_at: isCompleted ? new Date().toISOString() : null,
        })
        .eq("id", itemId);

      if (error) throw error;
      return { saleId };
    },
    onSuccess: async (_, { saleId }) => {
      queryClient.invalidateQueries({ queryKey: ["sale-checklist"] });
      queryClient.invalidateQueries({ queryKey: ["sale", saleId] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["aftersales"] });
      
      // Check if status should be auto-updated
      await checkAndUpdateSaleStatus(saleId);
    },
    onError: () => {
      toast.error("Fout bij bijwerken taak");
    },
  });
}
