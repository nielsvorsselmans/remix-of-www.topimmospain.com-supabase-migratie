import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useArchiveInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (insightId: string) => {
      const { error } = await supabase
        .from("insights")
        .update({ 
          archived: true, 
          archived_at: new Date().toISOString() 
        })
        .eq("id", insightId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      queryClient.invalidateQueries({ queryKey: ["insights-to-validate"] });
      queryClient.invalidateQueries({ queryKey: ["validated-insights"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-stats"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-counts"] });
      toast.success("Inzicht gearchiveerd");
    },
    onError: (error) => {
      toast.error("Fout bij archiveren: " + error.message);
    },
  });
}

export function useRestoreInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (insightId: string) => {
      const { error } = await supabase
        .from("insights")
        .update({ 
          archived: false, 
          archived_at: null 
        })
        .eq("id", insightId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-stats"] });
      toast.success("Inzicht hersteld");
    },
    onError: (error) => {
      toast.error("Fout bij herstellen: " + error.message);
    },
  });
}

export function useDeleteInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (insightId: string) => {
      // First delete any conversation_insights links
      await supabase
        .from("conversation_insights")
        .delete()
        .eq("insight_id", insightId);

      // Then delete the insight
      const { error } = await supabase
        .from("insights")
        .delete()
        .eq("id", insightId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      queryClient.invalidateQueries({ queryKey: ["insights-to-validate"] });
      queryClient.invalidateQueries({ queryKey: ["validated-insights"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-stats"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-counts"] });
      toast.success("Inzicht definitief verwijderd");
    },
    onError: (error) => {
      toast.error("Fout bij verwijderen: " + error.message);
    },
  });
}

export function useBulkArchiveInsights() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (insightIds: string[]) => {
      const { error } = await supabase
        .from("insights")
        .update({ 
          archived: true, 
          archived_at: new Date().toISOString() 
        })
        .in("id", insightIds);

      if (error) throw error;
      return insightIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      queryClient.invalidateQueries({ queryKey: ["insights-to-validate"] });
      queryClient.invalidateQueries({ queryKey: ["validated-insights"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-stats"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-counts"] });
      toast.success(`${count} inzichten gearchiveerd`);
    },
    onError: (error) => {
      toast.error("Fout bij archiveren: " + error.message);
    },
  });
}
