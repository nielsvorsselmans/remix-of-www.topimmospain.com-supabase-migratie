import { supabase } from "@/integrations/supabase/client";

export type OnboardingEvent = 
  | "quick_wizard_started"
  | "quick_wizard_goal_selected"
  | "quick_wizard_region_selected"
  | "quick_wizard_completed"
  | "quick_wizard_skipped"
  | "game_style_started"
  | "game_style_completed"
  | "game_blend_started"
  | "game_blend_completed"
  | "game_budget_started"
  | "game_budget_completed"
  | "all_games_completed"
  | "profile_completeness_80";

/**
 * Log onboarding events for analytics and CRM integration
 * Currently logs to console; can be extended to write to database
 */
export async function logOnboardingEvent(
  event: OnboardingEvent,
  metadata?: Record<string, any>
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Log to console for now (later: dedicated events table)
    console.info(`[Onboarding] ${event}`, {
      userId: user?.id,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
    
    // TODO: Insert into analytics table when ready
    // await supabase.from("onboarding_events").insert({
    //   user_id: user?.id,
    //   event_type: event,
    //   metadata,
    //   created_at: new Date().toISOString(),
    // });
  } catch (error) {
    // Silently fail - analytics should not break the user experience
    console.error("Failed to log onboarding event:", error);
  }
}
