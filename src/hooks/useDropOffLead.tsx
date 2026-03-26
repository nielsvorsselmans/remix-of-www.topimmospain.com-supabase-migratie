import { useMutation, useQueryClient, QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Centralized drop-off reasons - single source of truth
export const DROP_OFF_REASONS = [
  { value: "budget", label: "Budget past niet" },
  { value: "timing", label: "Timing is niet goed" },
  { value: "region", label: "Geen passende regio/locatie" },
  { value: "property_type", label: "Geen passend woningtype" },
  { value: "personal", label: "Persoonlijke omstandigheden" },
  { value: "competitor", label: "Gaat verder met andere partij" },
  { value: "no_interest", label: "Geen interesse meer" },
  { value: "other", label: "Anders" },
] as const;

export type DropOffReason = typeof DROP_OFF_REASONS[number]["value"];

// Helper to get label for a reason
export const getDropOffReasonLabel = (reason: string | null): string =>
  DROP_OFF_REASONS.find((r) => r.value === reason)?.label || reason || "Onbekend";

// Shared query keys to invalidate - exported for use in other hooks
export const LEAD_QUERY_KEYS = ["klant", "klanten", "leads-to-follow", "kopers"] as const;

// Exported helper to invalidate all lead-related queries - can be used by other hooks
export function invalidateLeadQueries(queryClient: QueryClient, leadId?: string) {
  LEAD_QUERY_KEYS.forEach((key) => {
    queryClient.invalidateQueries({
      queryKey: leadId && key === "klant" ? [key, leadId] : [key],
    });
  });
}

// Helper for date-only ISO string
const toDateString = (date: Date | null): string | null =>
  date ? date.toISOString().split("T")[0] : null;

interface DropOffData {
  leadId: string;
  currentPhase: string;
  reason: DropOffReason;
  notes: string;
  recontactAllowed: boolean;
  recontactAfter: Date | null;
}

export function useDropOffLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: DropOffData) => {
      const { error } = await supabase
        .from("crm_leads")
        .update({
          follow_up_status: "dropped_off",
          dropped_off_at: new Date().toISOString(),
          dropped_off_phase: data.currentPhase,
          dropped_off_reason: data.reason,
          dropped_off_notes: data.notes || null,
          recontact_allowed: data.recontactAllowed,
          recontact_after: toDateString(data.recontactAfter),
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.leadId);

      if (error) throw error;
      return data.leadId;
    },
    onSuccess: (leadId) => {
      invalidateLeadQueries(queryClient, leadId);
      toast.success("Lead gemarkeerd als afgehaakt");
    },
    onError: (error) => {
      console.error("Error marking lead as dropped off:", error);
      toast.error("Kon lead niet markeren als afgehaakt");
    },
  });
}

export function useReactivateDroppedLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from("crm_leads")
        .update({
          follow_up_status: "active",
          dropped_off_at: null,
          dropped_off_phase: null,
          dropped_off_reason: null,
          dropped_off_notes: null,
          recontact_allowed: null,
          recontact_after: null,
          reactivated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", leadId);

      if (error) throw error;
      return leadId;
    },
    onSuccess: (leadId) => {
      invalidateLeadQueries(queryClient, leadId);
      toast.success("Lead gereactiveerd");
    },
    onError: (error) => {
      console.error("Error reactivating lead:", error);
      toast.error("Kon lead niet reactiveren");
    },
  });
}
