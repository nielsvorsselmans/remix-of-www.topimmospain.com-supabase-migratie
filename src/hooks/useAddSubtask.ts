import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useAddSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      saleId,
      title,
      phase,
      orderIndex,
    }: {
      saleId: string;
      title: string;
      phase: string;
      orderIndex: number;
    }) => {
      const { error } = await supabase.from("sale_milestones").insert({
        sale_id: saleId,
        title,
        phase,
        order_index: orderIndex,
        customer_visible: false,
        partner_visible: false,
      });
      if (error) throw error;
      return { saleId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["aftersales"] });
      queryClient.invalidateQueries({ queryKey: ["sale-checklist"] });
      queryClient.invalidateQueries({ queryKey: ["all-open-tasks"] });
      if (result?.saleId) {
        queryClient.invalidateQueries({ queryKey: ["sale", result.saleId] });
      }
      toast.success("Subtaak toegevoegd");
    },
    onError: () => {
      toast.error("Fout bij toevoegen subtaak");
    },
  });
}
