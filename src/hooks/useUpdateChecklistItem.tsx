import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TaskPriority = 'high' | 'medium' | 'low';

export function useUpdateChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      itemId, 
      updates,
      saleId 
    }: { 
      itemId: string; 
      updates: {
        title?: string;
        description?: string | null;
        target_date?: string | null;
        priority?: TaskPriority;
        customer_visible?: boolean;
        waiting_since?: string | null;
        waiting_for?: string | null;
      };
      saleId?: string;
    }) => {
      const { error } = await supabase
        .from("sale_milestones")
        .update(updates)
        .eq("id", itemId);

      if (error) throw error;
      return { saleId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["sale-checklist"] });
      queryClient.invalidateQueries({ queryKey: ["all-open-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["customer-sale-detail"] });
      queryClient.invalidateQueries({ queryKey: ["aftersales"] });
      if (result?.saleId) {
        queryClient.invalidateQueries({ queryKey: ["sale", result.saleId] });
        queryClient.invalidateQueries({ queryKey: ["sales"] });
      }
    },
    onError: () => {
      toast.error("Fout bij bijwerken taak");
    },
  });
}
