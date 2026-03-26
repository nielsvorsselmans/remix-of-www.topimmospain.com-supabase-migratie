import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface SnaggingInspection {
  id: string;
  sale_id: string;
  label: string;
  inspection_date: string;
  inspection_type: string | null;
  inspector_name: string | null;
  status: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useInspections(saleId: string) {
  return useQuery({
    queryKey: ["snagging-inspections", saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("snagging_inspections")
        .select("*")
        .eq("sale_id", saleId)
        .order("inspection_date", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as SnaggingInspection[];
    },
  });
}

export function useCreateInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, label, inspectionDate }: { saleId: string; label: string; inspectionDate?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("snagging_inspections")
        .insert({
          sale_id: saleId,
          label,
          inspection_date: inspectionDate || new Date().toISOString().split("T")[0],
          created_by: user.user?.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as SnaggingInspection;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["snagging-inspections", vars.saleId] });
    },
    onError: (err: any) => {
      toast({ title: "Aanmaken mislukt", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpdateInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, saleId, label, inspectionDate, notes }: { id: string; saleId: string; label?: string; inspectionDate?: string; notes?: string }) => {
      const updates: any = { updated_at: new Date().toISOString() };
      if (label !== undefined) updates.label = label;
      if (inspectionDate !== undefined) updates.inspection_date = inspectionDate;
      if (notes !== undefined) updates.notes = notes;

      const { error } = await supabase
        .from("snagging_inspections")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["snagging-inspections", vars.saleId] });
    },
    onError: (err: any) => {
      toast({ title: "Opslaan mislukt", description: err.message, variant: "destructive" });
    },
  });
}

export function useDeleteInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, saleId }: { id: string; saleId: string }) => {
      const { error } = await supabase
        .from("snagging_inspections")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["snagging-inspections", vars.saleId] });
      queryClient.invalidateQueries({ queryKey: ["voice-recordings", vars.saleId] });
    },
    onError: (err: any) => {
      toast({ title: "Verwijderen mislukt", description: err.message, variant: "destructive" });
    },
  });
}
