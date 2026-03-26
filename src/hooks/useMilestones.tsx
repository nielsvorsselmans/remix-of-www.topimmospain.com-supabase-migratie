import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { invalidateLeadQueries } from "@/hooks/useDropOffLead";

interface MarkMilestoneCompleteParams {
  leadId: string;
  templateKey: string;
}

export function useMarkMilestoneComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, templateKey }: MarkMilestoneCompleteParams) => {
      const { error } = await supabase
        .from("journey_milestones")
        .update({ completed_at: new Date().toISOString() })
        .eq("crm_lead_id", leadId)
        .eq("template_key", templateKey);

      if (error) throw error;
      return { leadId, templateKey };
    },
    onSuccess: ({ leadId }) => {
      invalidateLeadQueries(queryClient, leadId);
      toast.success("Milestone bijgewerkt");
    },
    onError: (error) => {
      console.error("Error updating milestone:", error);
      toast.error("Kon milestone niet bijwerken");
    },
  });
}

// Specific convenience hooks for common milestones
export function useMarkCallDone() {
  const markMilestone = useMarkMilestoneComplete();

  return useMutation({
    mutationFn: async (leadId: string) => {
      return markMilestone.mutateAsync({ leadId, templateKey: "ori_call_gevoerd" });
    },
    onSuccess: () => {
      toast.success("Call gemarkeerd als gevoerd");
    },
    onError: () => {
      toast.error("Kon milestone niet bijwerken");
    },
  });
}

export function useMarkInvitationSent() {
  const markMilestone = useMarkMilestoneComplete();

  return useMutation({
    mutationFn: async (leadId: string) => {
      return markMilestone.mutateAsync({ leadId, templateKey: "ori_uitnodiging_verstuurd" });
    },
    onSuccess: () => {
      toast.success("Uitnodiging gemarkeerd als verstuurd");
    },
    onError: () => {
      toast.error("Kon milestone niet bijwerken");
    },
  });
}
