import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { QuickOnboardingWizard } from "@/components/onboarding/QuickOnboardingWizard";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ProjectContext {
  id: string;
  name: string;
  city?: string;
  image?: string;
}

interface OnboardingData {
  investmentGoal: string | null;
  goalClarity: "clear" | "exploring";
  investmentGoalSource: "user_explicit";
  preferredRegions: string[];
}

export default function QuickOnboardingPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [projectContext, setProjectContext] = useState<ProjectContext | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Get project context from session storage
    const storedContext = sessionStorage.getItem("onboarding_project");
    if (storedContext) {
      try {
        setProjectContext(JSON.parse(storedContext));
      } catch (e) {
        console.error("Error parsing project context:", e);
      }
    }
  }, []);

  useEffect(() => {
    // If user is not logged in, redirect to auth
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const getRedirectUrl = () => {
    if (projectContext?.id) {
      return `/dashboard/project/${projectContext.id}`;
    }
    return "/dashboard";
  };

  const handleComplete = async (data: OnboardingData) => {
    if (!user) return;
    
    setIsProcessing(true);
    
    try {
      // Get existing customer profile
      const { data: existingProfile } = await supabase
        .from("customer_profiles")
        .select("id, explicit_preferences")
        .eq("user_id", user.id)
        .maybeSingle();

      const existingPreferences = (existingProfile?.explicit_preferences || {}) as Record<string, unknown>;

      // Regions already come as labels from QuickOnboardingWizard - no mapping needed
      // Update customer profile with onboarding data including new trust-first fields
      const updateData = {
        explicit_preferences: {
          ...existingPreferences,
          investment_goal: data.investmentGoal,
          goal_clarity: data.goalClarity,
          investment_goal_source: data.investmentGoalSource,
          preferred_regions: data.preferredRegions, // Already stored as labels
          schema_version: 1,
        },
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (existingProfile) {
        await supabase
          .from("customer_profiles")
          .update(updateData)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("customer_profiles")
          .insert({
            user_id: user.id,
            ...updateData,
          });
      }

      // Note: Project is already added to favorites in OTPLoginForm after login
      // Clear session storage
      sessionStorage.removeItem("onboarding_project");

      toast.success("Voorkeuren opgeslagen!");
      navigate(getRedirectUrl(), { replace: true });
    } catch (error) {
      console.error("Error saving onboarding data:", error);
      toast.error("Er ging iets mis bij het opslaan");
      // Still navigate even if there's an error
      navigate(getRedirectUrl(), { replace: true });
    } finally {
      setIsProcessing(false);
    }
  };

  const saveSkippedTimestamp = async () => {
    if (!user) return;
    try {
      const { data: existing } = await supabase
        .from("customer_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      const skipData = {
        explicit_preferences: {
          onboarding_skipped_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        // Merge with existing preferences
        const { data: full } = await supabase
          .from("customer_profiles")
          .select("explicit_preferences")
          .eq("user_id", user.id)
          .maybeSingle();
        
        await supabase
          .from("customer_profiles")
          .update({
            explicit_preferences: {
              ...((full?.explicit_preferences as Record<string, unknown>) || {}),
              onboarding_skipped_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("customer_profiles")
          .insert({ user_id: user.id, ...skipData });
      }
    } catch (e) {
      console.error("Error saving skip timestamp:", e);
    }
  };

  const handleSkip = async () => {
    await saveSkippedTimestamp();
    sessionStorage.removeItem("onboarding_project");
    navigate("/dashboard", { replace: true });
  };

  const handleDirectToAnalysis = async () => {
    await saveSkippedTimestamp();
    sessionStorage.removeItem("onboarding_project");
    navigate(getRedirectUrl(), { replace: true });
  };

  if (authLoading || isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <QuickOnboardingWizard
      projectContext={projectContext || undefined}
      userName={profile?.first_name}
      onComplete={handleComplete}
      onSkip={handleSkip}
      onDirectToAnalysis={handleDirectToAnalysis}
    />
  );
}
