import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCustomerProfile } from "./useCustomerProfile";
import { calculateProfileCompleteness } from "@/utils/profileCompleteness";
import { useMyJourneyMilestones, JourneyMilestone } from "./useJourneyMilestones";
import { useOrientationGuide } from "./useOrientationGuide";

export interface OrientationProgress {
  guides_viewed: number;
  calculator_used: boolean;
  projects_viewed_count: number;
  favorites_count: number;
  meeting_scheduled: boolean;
  profile_completed: boolean;
}

export interface OrientationStep {
  id: string;
  label: string;
  description: string;
  motivation?: string;
  completed: boolean;
  link: string;
  priority: number;
  milestoneId?: string; // Link to database milestone if exists
}

export function useOrientationProgress() {
  const queryClient = useQueryClient();
  const { data: customerProfile, isLoading: profileLoading } = useCustomerProfile();
  const { data: journeyMilestones, isLoading: milestonesLoading } = useMyJourneyMilestones();
  
  // Get orientation guide progress for sync
  const { overallProgress: guideProgress, isLoading: guideLoading } = useOrientationGuide();

  // Filter to only orientatie phase milestones
  const orientatieMilestones = journeyMilestones?.filter(m => m.phase === 'orientatie') || [];

  // Calculate progress from customer profile data
  // Sync guides_viewed with orientation guide system - use higher of two values
  const blogPostsViewed = customerProfile?.viewed_blog_posts?.length || 0;
  const guideArticlesCompleted = guideProgress?.completed || 0;
  
  const progress: OrientationProgress = {
    guides_viewed: Math.max(blogPostsViewed, guideArticlesCompleted),
    calculator_used: (customerProfile?.orientation_progress as any)?.calculator_used || false,
    projects_viewed_count: customerProfile?.viewed_projects?.length || 0,
    favorites_count: customerProfile?.favorite_projects?.length || 0,
    meeting_scheduled: (customerProfile?.orientation_progress as any)?.meeting_scheduled || false,
    profile_completed: calculateProfileCompleteness(customerProfile?.explicit_preferences) >= 80,
  };

  // Map milestone template keys to step ids
  const milestoneToStepMap: Record<string, string> = {
    'ori_account': 'account',
    'ori_profiel': 'profile',
    'ori_gids_gelezen': 'guides',
    'ori_projecten_bekeken': 'projects',
    'ori_favoriet': 'favorites',
    'ori_kennismaking': 'meeting',
  };

  // Create a map of completed milestones
  const completedMilestones = new Map<string, JourneyMilestone>();
  orientatieMilestones.forEach(m => {
    const stepId = milestoneToStepMap[m.template_key];
    if (stepId) {
      completedMilestones.set(stepId, m);
    }
  });

  // Build steps - use milestone completion if available, otherwise fallback to calculated progress
  const steps: OrientationStep[] = [
    {
      id: "profile",
      label: "Profiel invullen",
      description: "Beantwoord 5 korte vragen over je situatie",
      motivation: "Zodat we je kunnen matchen",
      completed: completedMilestones.get('profile')?.completed_at != null || progress.profile_completed,
      link: "/dashboard/profiel",
      priority: 1,
      milestoneId: completedMilestones.get('profile')?.id,
    },
    {
      id: "guides",
      label: "Oriëntatiegids lezen",
      description: "Lees je in over investeren in Spanje",
      motivation: "Begrijp hoe investeren werkt",
      completed: completedMilestones.get('guides')?.completed_at != null || progress.guides_viewed >= 1,
      link: "/dashboard/gidsen",
      priority: 2,
      milestoneId: completedMilestones.get('guides')?.id,
    },
    {
      id: "calculator",
      label: "Calculators gebruiken",
      description: "Bereken kosten of rendement",
      motivation: "Krijg een realistisch beeld",
      completed: progress.calculator_used,
      link: "/dashboard/calculators",
      priority: 3,
    },
    {
      id: "events",
      label: "Events bijwonen",
      description: "Schrijf je in voor een webinar of infoavond",
      motivation: "Maak persoonlijk kennis",
      completed: (customerProfile?.orientation_progress as any)?.event_registered || false,
      link: "/dashboard/webinars",
      priority: 4,
    },
    {
      id: "projects",
      label: "Projecten ontdekken",
      description: "Bekijk projecten en sla favorieten op",
      motivation: "Bekijk wat er mogelijk is",
      completed: completedMilestones.get('projects')?.completed_at != null || 
                 completedMilestones.get('favorites')?.completed_at != null || 
                 progress.projects_viewed_count >= 3 || progress.favorites_count >= 1,
      link: "/projecten",
      priority: 5,
      milestoneId: completedMilestones.get('projects')?.id || completedMilestones.get('favorites')?.id,
    },
    {
      id: "meeting",
      label: "Oriëntatiegesprek plannen",
      description: "Bespreek je situatie met Lars",
      motivation: "Bespreek je volgende stap",
      completed: completedMilestones.get('meeting')?.completed_at != null || progress.meeting_scheduled,
      link: "/afspraak",
      priority: 6,
      milestoneId: completedMilestones.get('meeting')?.id,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const totalSteps = steps.length;
  const progressPercentage = Math.round((completedCount / totalSteps) * 100);

  const nextStep = steps.find((s) => !s.completed);

  // Get incomplete steps sorted by priority for recommendations
  const incompleteSteps = steps.filter((s) => !s.completed).sort((a, b) => a.priority - b.priority);

  // Update progress in database (for non-milestone tracked items like calculator)
  const updateProgress = useMutation({
    mutationFn: async (updates: Partial<OrientationProgress>) => {
      if (!customerProfile?.id) return;

      const currentProgress = (customerProfile?.orientation_progress as any) || {};
      const newProgress = { ...currentProgress, ...updates };

      const { error } = await supabase
        .from("customer_profiles")
        .update({ orientation_progress: newProgress })
        .eq("id", customerProfile.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-profile"] });
    },
  });

  return {
    progress,
    steps,
    completedCount,
    totalSteps,
    progressPercentage,
    nextStep,
    incompleteSteps,
    updateProgress,
    isLoading: profileLoading || milestonesLoading || guideLoading,
    // Expose milestone data for components that need it
    orientatieMilestones,
    hasMilestones: orientatieMilestones.length > 0,
  };
}
