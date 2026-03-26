import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCustomer } from "./useEffectiveCustomer";

interface CustomerProfile {
  id: string;
  user_id: string | null;
  visitor_id: string | null;
  crm_user_id: string | null;
  crm_lead_id: string | null;
  explicit_preferences: any;
  inferred_preferences: any;
  engagement_data: any;
  viewed_projects: string[];
  favorite_projects: string[];
  viewed_blog_posts: string[];
  viewed_stories: string[];
  data_completeness_score: number | null;
  lead_temperature: string | null;
  orientation_progress: Record<string, any> | null;
  crm_lead_phone?: string | null;
}

export const useCustomerProfile = () => {
  const { userId, crmLeadId, isLoading: isLoadingCustomer } = useEffectiveCustomer();

  const query = useQuery({
    queryKey: ["customer-profile", crmLeadId, userId],
    queryFn: async () => {
      // Prioriteit: crm_lead_id > user_id
      if (crmLeadId) {
        const { data, error } = await supabase
          .from("customer_profiles")
          .select(`
            *,
            crm_leads!crm_lead_id (phone)
          `)
          .eq("crm_lead_id", crmLeadId)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          const crmLeadsData = data.crm_leads as { phone: string | null } | null;
          return {
            ...data,
            crm_lead_phone: crmLeadsData?.phone || null,
          } as CustomerProfile;
        }
      }

      // Fallback: zoek via user_id
      if (userId) {
        const { data, error } = await supabase
          .from("customer_profiles")
          .select(`
            *,
            crm_leads!crm_lead_id (phone)
          `)
          .eq("user_id", userId)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          const crmLeadsData = data.crm_leads as { phone: string | null } | null;
          return {
            ...data,
            crm_lead_phone: crmLeadsData?.phone || null,
          } as CustomerProfile | null;
        }
        return null;
      }

      return null;
    },
    enabled: (!!crmLeadId || !!userId) && !isLoadingCustomer,
  });

  return {
    ...query,
    isLoading: query.isLoading || isLoadingCustomer,
  };
};
