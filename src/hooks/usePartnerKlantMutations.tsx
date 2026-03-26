import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { usePartner } from "@/contexts/PartnerContext";
import { calculateProfileCompleteness } from "@/utils/profileCompleteness";

// ============================================
// CONTACT UPDATE
// ============================================

interface UpdateContactParams {
  crmLeadId: string;
  email?: string;
  phone?: string;
}

export const useUpdatePartnerKlantContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ crmLeadId, email, phone }: UpdateContactParams) => {
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;

      const { data, error } = await supabase
        .from("crm_leads")
        .update(updateData)
        .eq("id", crmLeadId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { crmLeadId }) => {
      queryClient.invalidateQueries({ queryKey: ["partner-klant", crmLeadId] });
      queryClient.invalidateQueries({ queryKey: ["klant", crmLeadId] }); // Sync with admin view
      toast.success("Contactgegevens bijgewerkt");
    },
    onError: (error) => {
      console.error("Error updating contact:", error);
      toast.error("Kon contactgegevens niet bijwerken");
    },
  });
};

// ============================================
// PREFERENCES UPDATE
// ============================================

interface ExplicitPreferences {
  budget_min?: number;
  budget_max?: number;
  preferred_regions?: string[];
  property_types?: string[];
  investment_goal?: string;
  timeline?: string;
  persona_type?: string;
}

interface PreferencesSource {
  [key: string]: 'admin' | 'customer' | 'partner';
}

interface UpdatePreferencesParams {
  crmLeadId: string;
  preferences: Partial<ExplicitPreferences>;
}

export const useUpdatePartnerKlantPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ crmLeadId, preferences }: UpdatePreferencesParams) => {
      // Search for existing profile via crm_lead_id
      const { data: existingProfile } = await supabase
        .from("customer_profiles")
        .select("id, explicit_preferences, preferences_source")
        .eq("crm_lead_id", crmLeadId)
        .maybeSingle();

      const existingPreferences = (existingProfile?.explicit_preferences || {}) as ExplicitPreferences;
      const existingSource = (existingProfile?.preferences_source || {}) as PreferencesSource;

      // Merge preferences
      const updatedPreferences = {
        ...existingPreferences,
        ...preferences,
      };

      // Update source tracking - mark all updated fields as 'partner'
      const updatedSource = { ...existingSource };
      Object.keys(preferences).forEach(key => {
        updatedSource[key] = 'partner';
      });

      // Calculate new completeness score
      const newCompletenessScore = calculateProfileCompleteness(updatedPreferences);

      if (existingProfile) {
        // Update existing profile
        const { data, error } = await supabase
          .from("customer_profiles")
          .update({
            explicit_preferences: updatedPreferences,
            preferences_source: updatedSource,
            data_completeness_score: newCompletenessScore,
            updated_at: new Date().toISOString(),
          })
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
      queryClient.invalidateQueries({ queryKey: ["partner-klant", crmLeadId] });
      queryClient.invalidateQueries({ queryKey: ["klant", crmLeadId] }); // Sync with admin view
      toast.success("Voorkeuren bijgewerkt");
    },
    onError: (error) => {
      console.error("Error updating preferences:", error);
      toast.error("Kon voorkeuren niet bijwerken");
    },
  });
};

// ============================================
// TRIP CREATION
// ============================================

interface TripData {
  trip_start_date: string;
  trip_end_date: string;
  airport?: string | null;
  arrival_time?: string | null;
  departure_time?: string | null;
  flight_info?: string | null;
  accommodation_info?: string | null;
  customer_notes?: string | null;
  status?: string;
}

interface CreateTripParams {
  crmLeadId: string;
  tripData: TripData;
}

export const useCreatePartnerTrip = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { impersonatedPartner, isImpersonating } = usePartner();

  return useMutation({
    mutationFn: async ({ crmLeadId, tripData }: CreateTripParams) => {
      // Get partner ID for created_by field
      let partnerId: string | null = null;
      
      if (isImpersonating && impersonatedPartner) {
        partnerId = impersonatedPartner.id;
      } else if (user?.id) {
        const { data: partner } = await supabase
          .from("partners")
          .select("id")
          .eq("user_id", user.id)
          .single();
        partnerId = partner?.id || null;
      }

      const { data, error } = await supabase
        .from("customer_viewing_trips")
        .insert({
          crm_lead_id: crmLeadId,
          ...tripData,
          created_by: partnerId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { crmLeadId }) => {
      queryClient.invalidateQueries({ queryKey: ["partner-klant", crmLeadId] });
      queryClient.invalidateQueries({ queryKey: ["klant", crmLeadId] }); // Sync with admin view
      toast.success("Bezichtigingsreis aangemaakt");
    },
    onError: (error) => {
      console.error("Error creating trip:", error);
      toast.error("Kon bezichtigingsreis niet aanmaken");
    },
  });
};

// ============================================
// AFSPRAAK (EVENT) CREATION
// ============================================

interface EventData {
  event_type: string;
  title: string;
  event_date: string;
  description?: string | null;
  notes?: string | null;
}

interface CreateAfspraakParams {
  crmLeadId: string;
  eventData: EventData;
}

export const useCreatePartnerAfspraak = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { impersonatedPartner, isImpersonating } = usePartner();

  return useMutation({
    mutationFn: async ({ crmLeadId, eventData }: CreateAfspraakParams) => {
      // Get partner user_id for created_by field
      let createdBy: string | null = null;
      
      if (isImpersonating && impersonatedPartner) {
        // When impersonating, use the impersonated partner's user_id
        const { data: partner } = await supabase
          .from("partners")
          .select("user_id")
          .eq("id", impersonatedPartner.id)
          .single();
        createdBy = partner?.user_id || null;
      } else {
        createdBy = user?.id || null;
      }

      const { data, error } = await supabase
        .from("manual_events")
        .insert({
          crm_lead_id: crmLeadId,
          event_type: eventData.event_type,
          title: eventData.title,
          event_date: eventData.event_date,
          description: eventData.description,
          notes: eventData.notes,
          created_by: createdBy,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { crmLeadId }) => {
      queryClient.invalidateQueries({ queryKey: ["partner-klant", crmLeadId] });
      queryClient.invalidateQueries({ queryKey: ["klant", crmLeadId] }); // Sync with admin view
      queryClient.invalidateQueries({ queryKey: ["ghl-appointments"] });
      toast.success("Afspraak aangemaakt");
    },
    onError: (error) => {
      console.error("Error creating afspraak:", error);
      toast.error("Kon afspraak niet aanmaken");
    },
  });
};
