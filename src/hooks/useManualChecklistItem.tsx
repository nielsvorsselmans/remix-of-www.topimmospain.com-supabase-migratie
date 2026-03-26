import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AddChecklistItemData {
  saleId: string;
  title: string;
  description?: string;
  phase: string;
  targetDate?: string;
  priority?: 'high' | 'medium' | 'low';
  customerVisible?: boolean;
  prerequisiteFor?: string;
}

export interface EditChecklistItemData {
  itemId: string;
  title: string;
  description?: string;
  saleId?: string;
  prerequisiteFor?: string | null;
}

export function useAddChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      saleId,
      title,
      description,
      phase,
      targetDate,
      priority = 'medium',
      customerVisible = true,
      prerequisiteFor,
    }: AddChecklistItemData) => {
      // Get highest order_index for this phase
      const { data: existing } = await supabase
        .from("sale_milestones")
        .select("order_index")
        .eq("sale_id", saleId)
        .eq("phase", phase)
        .order("order_index", { ascending: false })
        .limit(1);

      const nextOrder = (existing?.[0]?.order_index ?? 0) + 1;

      const { error } = await supabase.from("sale_milestones").insert({
        sale_id: saleId,
        title,
        description: description || null,
        phase,
        template_key: null,
        order_index: nextOrder,
        target_date: targetDate || null,
        priority,
        customer_visible: customerVisible,
        partner_visible: false,
        prerequisite_for: prerequisiteFor || null,
      });

      if (error) throw error;
      return { saleId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["sale-checklist"] });
      if (result?.saleId) {
        queryClient.invalidateQueries({ queryKey: ["sale", result.saleId] });
      }
      toast.success("Taak toegevoegd");
    },
    onError: () => {
      toast.error("Fout bij toevoegen taak");
    },
  });
}

export function useDeleteChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, saleId }: { itemId: string; saleId?: string }) => {
      // Only delete items without template_key (manual tasks)
      const { error } = await supabase
        .from("sale_milestones")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
      return { saleId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["sale-checklist"] });
      if (result?.saleId) {
        queryClient.invalidateQueries({ queryKey: ["sale", result.saleId] });
      }
      toast.success("Taak verwijderd");
    },
    onError: () => {
      toast.error("Fout bij verwijderen taak");
    },
  });
}

export function useEditChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, title, description, saleId, prerequisiteFor }: EditChecklistItemData) => {
      const updateData: Record<string, any> = { title, description: description || null };
      if (prerequisiteFor !== undefined) {
        updateData.prerequisite_for = prerequisiteFor || null;
      }
      const { error } = await supabase
        .from("sale_milestones")
        .update(updateData)
        .eq("id", itemId);

      if (error) throw error;
      return { saleId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["sale-checklist"] });
      if (result?.saleId) {
        queryClient.invalidateQueries({ queryKey: ["sale", result.saleId] });
      }
      toast.success("Taak bijgewerkt");
    },
    onError: () => {
      toast.error("Fout bij bijwerken taak");
    },
  });
}
