import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useUpdatePurchaseCostAmount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      purchaseCostId, 
      actualAmount,
      isFinalized,
      paymentProofUrl,
    }: { 
      purchaseCostId: string; 
      actualAmount: number;
      isFinalized?: boolean;
      paymentProofUrl?: string | null;
    }) => {
      const updateData: {
        actual_amount: number;
        is_finalized: boolean;
        payment_proof_url?: string | null;
      } = {
        actual_amount: actualAmount,
        is_finalized: isFinalized ?? true,
      };

      // Only include payment_proof_url if explicitly provided
      if (paymentProofUrl !== undefined) {
        updateData.payment_proof_url = paymentProofUrl;
      }

      const { error } = await supabase
        .from("sale_purchase_costs")
        .update(updateData)
        .eq("id", purchaseCostId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-total-investment"] });
      queryClient.invalidateQueries({ queryKey: ["sale-purchase-costs"] });
      toast.success("Bedrag bijgewerkt");
    },
    onError: (error) => {
      console.error("Error updating purchase cost:", error);
      toast.error("Fout bij bijwerken bedrag");
    },
  });
}
