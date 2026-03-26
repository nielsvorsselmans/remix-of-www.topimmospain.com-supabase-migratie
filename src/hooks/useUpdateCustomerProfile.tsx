import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

// Current schema version - increment when making breaking changes to the preferences structure
const CURRENT_SCHEMA_VERSION = 1;

interface ExplicitPreferences {
  schema_version?: number;
  budget_min?: number;
  budget_max?: number;
  preferred_regions?: string[];
  preferred_cities?: string[];
  bedrooms_min?: number;
  bedrooms_max?: number;
  property_types?: string[];
  investment_goal?: string | null;
  // NEW: Track goal clarity and source for trust-first data integrity
  goal_clarity?: "clear" | "exploring";
  investment_goal_source?: "user_explicit" | "slider_inferred";
  timeline?: string;
  persona_type?: string;
  spain_visit_planned?: string;
  spain_visit_arrival_date?: string;
  spain_visit_departure_date?: string;
  phone?: string;
  // Gamified onboarding fields
  investment_blend?: number;
  style_preferences?: {
    architecture?: "modern" | "traditional" | "both" | "none";
    view?: "sea" | "golf" | "both" | "none";
    location_type?: "coastal" | "inland" | "both" | "none";
  };
  amenity_preferences?: {
    pool?: "shared" | "private" | "none";
    sea_distance?: "walking" | "driving" | "not_important";
    outdoor_space?: "terrace" | "garden" | "both";
  };
  games_completed?: {
    style_matcher?: boolean;
    investment_slider?: boolean;
    budget_builder?: boolean;
  };
}

export const useUpdateCustomerProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferences: Partial<ExplicitPreferences>) => {
      if (!user?.id) {
        throw new Error("User must be logged in to update profile");
      }

      // First, get existing preferences
      const { data: existingProfile } = await supabase
        .from("customer_profiles")
        .select("explicit_preferences")
        .eq("user_id", user.id)
        .maybeSingle();

      const existingPreferences = (existingProfile?.explicit_preferences || {}) as ExplicitPreferences;

      // Merge new preferences with existing ones
      // Schema version is always set at the end to prevent accidental override
      const updatedPreferences = {
        ...existingPreferences,
        ...preferences,
        schema_version: CURRENT_SCHEMA_VERSION,
      };

      // Update customer profile
      const { data, error } = await supabase
        .from("customer_profiles")
        .update({
          explicit_preferences: updatedPreferences,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-profile"] });
      toast.success("Opgeslagen ✓", { duration: 2000 });
    },
    onError: (error) => {
      console.error("Error updating customer profile:", error);
      toast.error("Er ging iets mis bij het opslaan");
    },
  });
};
