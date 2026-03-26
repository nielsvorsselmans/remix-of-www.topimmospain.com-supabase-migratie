import { useAuth } from "@/hooks/useAuth";
import { useCustomerPreview } from "@/contexts/CustomerPreviewContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface EffectiveCustomer {
  userId: string | null;
  crmLeadId: string | null;
  ghlContactId: string | null; // Renamed from crmUserId
  isPreviewMode: boolean;
  isLoading: boolean;
}

/**
 * Hook that returns the effective customer context.
 * In normal mode: returns the logged-in user's data
 * In preview mode: returns the preview customer's data
 */
export function useEffectiveCustomer(): EffectiveCustomer {
  const { user } = useAuth();
  const { isPreviewMode, previewCustomer, previewCrmLeadId, isLoadingPreview, isInitialized } = useCustomerPreview();

  // Fetch crmLeadId for logged-in user (only when not in preview mode AND when initialized)
  // IMPORTANT: useQuery must be called unconditionally to follow React Hooks rules
  const { data: userCrmLead, isLoading: isLoadingCrmLead } = useQuery({
    queryKey: ["user-crm-lead", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("crm_leads")
        .select("id, ghl_contact_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching CRM lead:", error);
        return null;
      }

      return data || null;
    },
    // Only run query when: user exists, not in preview mode, AND context is initialized
    enabled: !!user?.id && !isPreviewMode && isInitialized,
    // CRM lead ID is very stable - cache for 10 minutes
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Wait for preview context to be initialized before making any decisions
  // This prevents race conditions where we fetch admin's data before preview mode is determined
  if (!isInitialized) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[useEffectiveCustomer] Not initialized yet');
    }
    return {
      userId: null,
      crmLeadId: null,
      ghlContactId: null,
      isPreviewMode: false,
      isLoading: true,
    };
  }

  if (isPreviewMode) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[useEffectiveCustomer] Preview mode', {
        previewCrmLeadId,
        isLoadingPreview,
      });
    }
    return {
      userId: previewCustomer?.user_id || null,
      crmLeadId: previewCrmLeadId,
      ghlContactId: null, // Not needed in preview mode
      isPreviewMode: true,
      isLoading: isLoadingPreview,
    };
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[useEffectiveCustomer] Normal mode', {
      userId: user?.id,
      userCrmLead,
      isLoadingCrmLead,
    });
  }

  return {
    userId: user?.id || null,
    crmLeadId: userCrmLead?.id || null,
    ghlContactId: userCrmLead?.ghl_contact_id || null,
    isPreviewMode: false,
    isLoading: isLoadingCrmLead,
  };
}
