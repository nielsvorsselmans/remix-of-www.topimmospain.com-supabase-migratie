import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { typedFrom } from "./typed-client";
import type { ExternalListingSubmission } from "./types";

// Admin: fetch submissions for a specific lead
export function useExternalSubmissions(crmLeadId: string | null) {
  return useQuery({
    queryKey: ["external-submissions", crmLeadId],
    queryFn: async () => {
      if (!crmLeadId) return [];
      const { data, error } = await typedFrom("external_listing_submissions")
        .select("*")
        .eq("crm_lead_id", crmLeadId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ExternalListingSubmission[];
    },
    enabled: !!crmLeadId,
  });
}

// Customer: fetch own submissions
export function useCustomerSubmissions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["customer-submissions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await typedFrom("external_listing_submissions")
        .select("*")
        .eq("submitted_by_user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ExternalListingSubmission[];
    },
    enabled: !!user?.id,
  });
}


// Customer: submit a URL (accepts leadId to avoid redundant crm_leads lookup)
export function useSubmitExternalUrl(leadId: string | null | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ sourceUrl, message }: { sourceUrl: string; message?: string }) => {
      if (!user?.id) throw new Error("Niet ingelogd");
      if (!leadId) throw new Error("Geen klantprofiel gevonden");

      const { error } = await typedFrom("external_listing_submissions")
        .insert({
          crm_lead_id: leadId,
          submitted_by_user_id: user.id,
          source_url: sourceUrl,
          customer_message: message || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-submissions"] });
      toast.success("URL ingediend! We bekijken dit zo snel mogelijk.");
    },
    onError: (error: any) => {
      toast.error(`Indienen mislukt: ${error.message}`);
    },
  });
}

// Admin: review a submission (approve/reject)
export function useReviewSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      submissionId,
      action,
      adminResponse,
    }: {
      submissionId: string;
      action: "approved" | "rejected";
      adminResponse?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await typedFrom("external_listing_submissions")
        .update({
          status: action,
          admin_response: adminResponse || null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", submissionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["external-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["pending-submissions-count"] });
    },
  });
}

// Admin: toggle self-service for a lead
export function useToggleSelfService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, enabled }: { leadId: string; enabled: boolean }) => {
      const { error } = await typedFrom("crm_leads")
        .update({ can_submit_external_urls: enabled })
        .eq("id", leadId);
      if (error) throw error;
    },
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: ["klant", leadId] });
      queryClient.invalidateQueries({ queryKey: ["klant-self-service", leadId] });
      queryClient.invalidateQueries({ queryKey: ["customer-lead-id"] });
      toast.success("Self-service instelling opgeslagen");
    },
    onError: () => {
      toast.error("Instelling opslaan mislukt");
    },
  });
}

// Admin: count pending submissions across all leads
export function usePendingSubmissionsCount() {
  return useQuery({
    queryKey: ["pending-submissions-count"],
    queryFn: async () => {
      const { count, error } = await typedFrom("external_listing_submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending_review");
      if (error) throw error;
      return count || 0;
    },
  });
}
