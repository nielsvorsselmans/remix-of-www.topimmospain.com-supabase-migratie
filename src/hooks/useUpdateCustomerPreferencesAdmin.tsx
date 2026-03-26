import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calculateProfileCompleteness } from "@/utils/profileCompleteness";

interface ExplicitPreferences {
  budget_min?: number;
  budget_max?: number;
  preferred_regions?: string[];
  preferred_cities?: string[];
  bedrooms_min?: number;
  bedrooms_max?: number;
  property_types?: string[];
  investment_goal?: string;
  timeline?: string;
  persona_type?: string;
  spain_visit_planned?: string;
  spain_visit_arrival_date?: string;
  spain_visit_departure_date?: string;
  phone?: string;
}

interface PreferencesSource {
  [key: string]: 'admin' | 'customer';
}

interface UpdatePreferencesParams {
  crmLeadId: string;
  preferences: Partial<ExplicitPreferences>;
}

export const useUpdateCustomerPreferencesAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ crmLeadId, preferences }: UpdatePreferencesParams) => {
      // Get the user_id from crm_leads for syncing
      const { data: lead, error: leadError } = await supabase
        .from("crm_leads")
        .select("user_id")
        .eq("id", crmLeadId)
        .single();

      if (leadError) throw leadError;
      if (!lead) throw new Error("Lead not found");

      // Search for existing profile via crm_lead_id (primary) or user_id (fallback)
      let existingProfile = null;
      
      // First try by crm_lead_id
      const { data: profileByLeadId } = await supabase
        .from("customer_profiles")
        .select("id, explicit_preferences, preferences_source, user_id")
        .eq("crm_lead_id", crmLeadId)
        .maybeSingle();
      
      existingProfile = profileByLeadId;
      
      // Fallback: search by user_id if no profile found and user_id exists
      if (!existingProfile && lead.user_id) {
        const { data: profileByUserId } = await supabase
          .from("customer_profiles")
          .select("id, explicit_preferences, preferences_source, user_id, crm_lead_id")
          .eq("user_id", lead.user_id)
          .maybeSingle();
        
        existingProfile = profileByUserId;
      }

      const existingPreferences = (existingProfile?.explicit_preferences || {}) as ExplicitPreferences;
      const existingSource = (existingProfile?.preferences_source || {}) as PreferencesSource;

      // Merge preferences
      const updatedPreferences = {
        ...existingPreferences,
        ...preferences,
      };

      // Update source tracking - mark all updated fields as 'admin'
      const updatedSource = { ...existingSource };
      Object.keys(preferences).forEach(key => {
        updatedSource[key] = 'admin';
      });

      // Calculate new completeness score
      const newCompletenessScore = calculateProfileCompleteness(updatedPreferences);

      if (existingProfile) {
        // Update existing profile + sync crm_lead_id and user_id if missing
        const updateData: any = {
          explicit_preferences: updatedPreferences,
          preferences_source: updatedSource,
          data_completeness_score: newCompletenessScore,
          updated_at: new Date().toISOString(),
        };
        
        // Sync crm_lead_id if profile was found by user_id but missing crm_lead_id
        if (!existingProfile.crm_lead_id) {
          updateData.crm_lead_id = crmLeadId;
        }
        
        // Sync user_id if missing
        if (!existingProfile.user_id && lead.user_id) {
          updateData.user_id = lead.user_id;
        }

        const { data, error } = await supabase
          .from("customer_profiles")
          .update(updateData)
          .eq("id", existingProfile.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new profile with crm_lead_id
        const { data, error } = await supabase
          .from("customer_profiles")
          .insert({
            crm_lead_id: crmLeadId,
            user_id: lead.user_id || null,
            explicit_preferences: updatedPreferences,
            preferences_source: updatedSource,
            data_completeness_score: newCompletenessScore,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, { crmLeadId }) => {
      queryClient.invalidateQueries({ queryKey: ["klant", crmLeadId] });
      queryClient.invalidateQueries({ queryKey: ["customer-profile"] });
      toast.success("Voorkeuren opgeslagen");
    },
    onError: (error) => {
      console.error("Error updating customer preferences:", error);
      toast.error("Er ging iets mis bij het opslaan");
    },
  });
};
