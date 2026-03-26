import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { invalidateLeadQueries } from "@/hooks/useDropOffLead";

export interface NurtureAction {
  id: string;
  crm_lead_id: string;
  suggested_action: string;
  action_type: string;
  due_date: string | null;
  completed_at: string | null;
  completed_by: string | null;
  context_summary: string | null;
  source_appointment_id: string | null;
  resource_url: string | null;
  resource_type: string | null;
  generated_message: string | null;
  generated_message_subject: string | null;
  action_result: string | null;
  action_result_note: string | null;
  feedback_due_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useNurtureActions(crmLeadId: string | null) {
  return useQuery({
    queryKey: ["nurture-actions", crmLeadId],
    queryFn: async () => {
      if (!crmLeadId) return [];
      const { data, error } = await supabase
        .from("lead_nurture_actions")
        .select("*")
        .eq("crm_lead_id", crmLeadId)
        .order("due_date", { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data as NurtureAction[];
    },
    enabled: !!crmLeadId,
  });
}

export function useNurtureQueue() {
  return useQuery({
    queryKey: ["nurture-queue"],
    queryFn: async () => {
      const { data: leads, error: leadsError } = await supabase
        .from("crm_leads")
        .select("id, first_name, last_name, email, phone, follow_up_status, journey_phase, updated_at")
        .eq("follow_up_status", "nurture_ai")
        .order("updated_at", { ascending: false });

      if (leadsError) throw leadsError;
      if (!leads?.length) return [];

      const leadIds = leads.map((l) => l.id);

      const [actionsResult, profilesResult] = await Promise.all([
        supabase
          .from("lead_nurture_actions")
          .select("*")
          .in("crm_lead_id", leadIds)
          .order("due_date", { ascending: true, nullsFirst: false }),
        supabase
          .from("customer_profiles")
          .select("crm_lead_id, explicit_preferences, inferred_preferences")
          .in("crm_lead_id", leadIds),
      ]);

      if (actionsResult.error) throw actionsResult.error;
      const actions = actionsResult.data || [];
      const profiles = profilesResult.data || [];

      return leads.map((lead) => {
        const leadProfile = profiles.find((p) => p.crm_lead_id === lead.id);
        return {
          ...lead,
          actions: actions.filter((a) => a.crm_lead_id === lead.id) as NurtureAction[],
          pendingActions: actions.filter((a) => a.crm_lead_id === lead.id && !a.completed_at).length,
          nextDueDate: actions
            .filter((a) => a.crm_lead_id === lead.id && !a.completed_at && a.due_date)
            .sort((a, b) => (a.due_date! > b.due_date! ? 1 : -1))[0]?.due_date || null,
          profile: leadProfile || null,
        };
      });
    },
  });
}

export interface SetNurtureResult {
  leadId: string;
  actions: NurtureAction[];
}

export function useSetNurtureStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      appointmentId,
      notes,
    }: {
      leadId: string;
      appointmentId?: string;
      notes?: string;
    }): Promise<SetNurtureResult> => {
      const { error } = await supabase
        .from("crm_leads")
        .update({
          follow_up_status: "nurture_ai",
          updated_at: new Date().toISOString(),
        })
        .eq("id", leadId);

      if (error) throw error;

      if (notes) {
        const { error: fnError } = await supabase.functions.invoke(
          "generate-nurture-actions",
          {
            body: { crmLeadId: leadId, notes, appointmentId },
          }
        );

        if (fnError) {
          console.error("Failed to generate nurture actions:", fnError);
        }
      }

      const query = supabase
        .from("lead_nurture_actions")
        .select("*")
        .eq("crm_lead_id", leadId)
        .order("due_date", { ascending: true, nullsFirst: false });

      if (appointmentId) {
        query.eq("source_appointment_id", appointmentId);
      }

      const { data: actions, error: fetchError } = await query;

      if (fetchError) {
        console.error("Failed to fetch nurture actions:", fetchError);
        return { leadId, actions: [] };
      }

      return { leadId, actions: (actions || []) as NurtureAction[] };
    },
    onSuccess: (result) => {
      invalidateLeadQueries(queryClient, result.leadId);
      queryClient.invalidateQueries({ queryKey: ["nurture-actions", result.leadId] });
      queryClient.invalidateQueries({ queryKey: ["nurture-queue"] });
      toast.success("Lead in AI nurture queue geplaatst");
    },
    onError: (error) => {
      console.error("Error setting nurture status:", error);
      toast.error("Kon nurture status niet instellen");
    },
  });
}

export function useCompleteNurtureAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (actionId: string) => {
      const feedbackDueAt = new Date();
      feedbackDueAt.setHours(feedbackDueAt.getHours() + 48);

      const { error } = await supabase
        .from("lead_nurture_actions")
        .update({
          completed_at: new Date().toISOString(),
          feedback_due_at: feedbackDueAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", actionId);

      if (error) throw error;
      return actionId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nurture-actions"] });
      queryClient.invalidateQueries({ queryKey: ["nurture-queue"] });
      queryClient.invalidateQueries({ queryKey: ["all-nurture-actions"] });
      queryClient.invalidateQueries({ queryKey: ["pending-feedback-actions"] });
      toast.success("Actie afgerond — feedback over 48 uur verwacht");
    },
    onError: () => {
      toast.error("Kon actie niet afronden");
    },
  });
}

export function useSubmitActionFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      actionId,
      result,
      note,
    }: {
      actionId: string;
      result: "response_received" | "no_response" | "appointment_made" | "unsubscribed";
      note?: string;
    }) => {
      const { error } = await supabase
        .from("lead_nurture_actions")
        .update({
          action_result: result,
          action_result_note: note || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", actionId);

      if (error) throw error;
      return actionId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nurture-actions"] });
      queryClient.invalidateQueries({ queryKey: ["nurture-queue"] });
      queryClient.invalidateQueries({ queryKey: ["all-nurture-actions"] });
      queryClient.invalidateQueries({ queryKey: ["pending-feedback-actions"] });
      toast.success("Feedback opgeslagen");
    },
    onError: () => {
      toast.error("Kon feedback niet opslaan");
    },
  });
}

export function usePendingFeedbackActions() {
  return useQuery({
    queryKey: ["pending-feedback-actions"],
    queryFn: async () => {
      const { data: actions, error } = await supabase
        .from("lead_nurture_actions")
        .select("*")
        .not("completed_at", "is", null)
        .is("action_result", null)
        .lte("feedback_due_at", new Date().toISOString())
        .order("feedback_due_at", { ascending: true });

      if (error) throw error;
      if (!actions?.length) return [];

      const leadIds = [...new Set(actions.map((a) => a.crm_lead_id))];
      const { data: leads } = await supabase
        .from("crm_leads")
        .select("id, first_name, last_name, email")
        .in("id", leadIds);

      const leadMap = new Map(
        (leads || []).map((l) => [
          l.id,
          {
            name: [l.first_name, l.last_name].filter(Boolean).join(" ") || l.email || "Onbekend",
            email: l.email,
          },
        ])
      );

      return actions.map((a) => ({
        ...a,
        lead_name: leadMap.get(a.crm_lead_id)?.name || "Onbekend",
        lead_email: leadMap.get(a.crm_lead_id)?.email || null,
        lead_id: a.crm_lead_id,
      })) as NurtureActionWithLead[];
    },
  });
}

export function useGenerateNurtureMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (actionId: string) => {
      const { data, error } = await supabase.functions.invoke(
        "generate-nurture-message",
        { body: { actionId } }
      );

      if (error) throw error;
      return data as { message: string; subject: string | null };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nurture-actions"] });
      queryClient.invalidateQueries({ queryKey: ["nurture-queue"] });
    },
    onError: (error: any) => {
      console.error("Error generating message:", error);
      if (error?.message?.includes('429') || error?.status === 429) {
        toast.error("Te veel verzoeken, probeer het later opnieuw");
      } else if (error?.message?.includes('402') || error?.status === 402) {
        toast.error("AI credits op, neem contact op met beheerder");
      } else {
        toast.error("Kon bericht niet genereren");
      }
    },
  });
}

export interface NurtureActionWithLead extends NurtureAction {
  lead_name: string;
  lead_email: string | null;
  lead_id: string;
}

export function useAllNurtureActions() {
  return useQuery({
    queryKey: ["all-nurture-actions"],
    queryFn: async () => {
      const { data: actions, error } = await supabase
        .from("lead_nurture_actions")
        .select("*")
        .is("completed_at", null)
        .order("due_date", { ascending: true, nullsFirst: false });

      if (error) throw error;
      if (!actions?.length) return [];

      const leadIds = [...new Set(actions.map((a) => a.crm_lead_id))];
      const { data: leads } = await supabase
        .from("crm_leads")
        .select("id, first_name, last_name, email")
        .in("id", leadIds);

      const leadMap = new Map(
        (leads || []).map((l) => [
          l.id,
          {
            name: [l.first_name, l.last_name].filter(Boolean).join(" ") || l.email || "Onbekend",
            email: l.email,
          },
        ])
      );

      return actions.map((a) => ({
        ...a,
        lead_name: leadMap.get(a.crm_lead_id)?.name || "Onbekend",
        lead_email: leadMap.get(a.crm_lead_id)?.email || null,
        lead_id: a.crm_lead_id,
      })) as NurtureActionWithLead[];
    },
  });
}
