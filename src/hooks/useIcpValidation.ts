import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface IcpInsight {
  id: string;
  label: string;
  normalized_insight: string | null;
  theme: string | null;
  impact_score: string | null;
  frequency: number | null;
  suggested_archetype: string | null;
  icp_validated: boolean | null;
  icp_score: number | null;
  icp_persona_match: string[] | null;
  icp_validation_notes: string | null;
  refined_insight: string | null;
  validated_at: string | null;
  created_at: string | null;
}

// Fetch insights that need ICP validation
export function useInsightsToValidate() {
  return useQuery({
    queryKey: ["insights-to-validate"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insights")
        .select("*")
        .eq("icp_validated", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as IcpInsight[];
    },
  });
}

// Fetch validated insights
export function useValidatedInsights() {
  return useQuery({
    queryKey: ["validated-insights"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insights")
        .select("*")
        .eq("icp_validated", true)
        .order("validated_at", { ascending: false });

      if (error) throw error;
      return data as IcpInsight[];
    },
  });
}

// Validate a single insight
export function useValidateInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (insightId: string) => {
      const { data, error } = await supabase.functions.invoke("validate-insight-icp", {
        body: { insightId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["insights-to-validate"] });
      queryClient.invalidateQueries({ queryKey: ["validated-insights"] });
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-counts"] });
      
      const score = data?.validation?.icp_score;
      if (score >= 4) {
        toast.success(`Inzicht gevalideerd met score ${score}/5`);
      } else if (score >= 2) {
        toast.info(`Inzicht hervormd (score ${score}/5)`);
      } else {
        toast.warning(`Inzicht gemarkeerd als ruis (score ${score}/5)`);
      }
    },
    onError: (error) => {
      console.error("Validation error:", error);
      toast.error(`Validatie mislukt: ${error.message}`);
    },
  });
}

// Skip validation for an insight (mark as validated without AI)
export function useSkipValidation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ insightId, reason }: { insightId: string; reason?: string }) => {
      const { data, error } = await supabase
        .from("insights")
        .update({
          icp_validated: true,
          icp_score: 0,
          icp_validation_notes: reason || "Handmatig overgeslagen",
          validated_at: new Date().toISOString(),
        })
        .eq("id", insightId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insights-to-validate"] });
      queryClient.invalidateQueries({ queryKey: ["validated-insights"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-counts"] });
      toast.success("Inzicht overgeslagen");
    },
    onError: (error) => {
      toast.error(`Fout: ${error.message}`);
    },
  });
}

// Get count of insights to validate
export function useIcpValidationCount() {
  return useQuery({
    queryKey: ["icp-validation-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("insights")
        .select("*", { count: "exact", head: true })
        .eq("icp_validated", false);

      if (error) throw error;
      return count || 0;
    },
  });
}

// Bulk validate insights
export function useBulkValidateInsights() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (insightIds: string[]) => {
      const results = [];
      for (const id of insightIds) {
        try {
          const { data, error } = await supabase.functions.invoke("validate-insight-icp", {
            body: { insightId: id },
          });
          if (error) throw error;
          results.push({ id, success: true, data });
        } catch (err) {
          results.push({ id, success: false, error: err });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["insights-to-validate"] });
      queryClient.invalidateQueries({ queryKey: ["validated-insights"] });
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-counts"] });
      
      const successful = results.filter(r => r.success).length;
      const failed = results.length - successful;
      
      if (failed === 0) {
        toast.success(`${successful} inzichten gevalideerd`);
      } else {
        toast.warning(`${successful} gevalideerd, ${failed} mislukt`);
      }
    },
    onError: (error) => {
      toast.error(`Bulk validatie mislukt: ${error.message}`);
    },
  });
}
