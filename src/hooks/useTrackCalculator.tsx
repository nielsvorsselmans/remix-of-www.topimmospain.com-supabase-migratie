import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { trackEvent } from "@/lib/tracking";
import { supabase } from "@/integrations/supabase/client";

interface CalculatorInputs {
  purchase_price?: number;
  monthly_rental_income?: number;
  investment_timeframe?: number;
  [key: string]: any;
}

type CalculatorType = "roi" | "costs" | "rental" | "box3" | "lening";

/**
 * Hook for tracking calculator usage
 * Returns a trackCalculator function that handles both analytics and database updates
 */
export function useCalculatorTracking() {
  const queryClient = useQueryClient();

  const trackCalculator = useCallback(async (
    calculator_type: CalculatorType,
    inputs: CalculatorInputs,
    results?: Record<string, any>
  ) => {
    // Track analytics event
    trackEvent("calculator_used", {
      calculator_type,
      inputs,
      results,
    });

    // Update orientation progress in database
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Get current customer profile
        const { data: profile } = await supabase
          .from("customer_profiles")
          .select("id, orientation_progress")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile) {
          const currentProgress = (profile.orientation_progress as Record<string, any>) || {};
          
          // Only update if not already set (avoid unnecessary writes)
          if (!currentProgress.calculator_used) {
            const { error } = await supabase
              .from("customer_profiles")
              .update({
                orientation_progress: {
                  ...currentProgress,
                  calculator_used: true,
                },
              })
              .eq("id", profile.id);

            // Invalidate customer profile query cache if update was successful
            if (!error) {
              queryClient.invalidateQueries({ queryKey: ["customer-profile"] });
            }
          }
        }
      }
    } catch (error) {
      // Silently fail - don't break calculator if tracking fails
      console.error("Failed to update calculator progress:", error);
    }
  }, [queryClient]);

  return { trackCalculator };
}

