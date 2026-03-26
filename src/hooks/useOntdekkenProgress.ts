import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCustomerProfile } from "@/hooks/useCustomerProfile";
import { useOrientationGuide } from "@/hooks/useOrientationGuide";
import { hasPersonalizationData, ExplicitPreferences } from "@/utils/orientationPersonalization";

export type OntdekkenPhase = 'start' | 'exploring' | 'ready';
export type NextStepType = 'onboarding' | 'calculator' | 'guide' | 'webinar' | 'meeting';
export type UserBehaviorType = 'analist' | 'dromer' | 'onbekend';

export interface NextStep {
  type: NextStepType;
  title: string;
  description: string;
  link: string;
  socialProof?: string;
  icon: 'user' | 'calculator' | 'book' | 'video' | 'calendar';
}

export interface OntdekkenProgress {
  score: number; // 0-100
  phase: OntdekkenPhase;
  nextStep: NextStep;
  behaviorType: UserBehaviorType;
  completedItems: {
    guideProgress: number; // 0-100
    guideCompleted: number;
    guideTotal: number;
    profileComplete: boolean;
    hasBudget: boolean;
    hasRegion: boolean;
  };
  firstName: string | null;
  preferredRegion: string | null;
  isLoading: boolean;
}

// Phase labels - reframed from "progress" to "readiness/match quality"
export const phaseLabels: Record<OntdekkenPhase, string> = {
  start: "Vul je profiel aan voor betere projectmatches",
  exploring: "Je profiel wordt steeds completer",
  ready: "Je profiel is klaar voor een match op maat",
};

// Score calculation weights
const WEIGHTS = {
  profile: 20,        // Profiel compleet (budget + regio) - reduced for games
  styleGame: 15,      // Stijl Matcher game
  blendGame: 15,      // Investment Blend slider
  budgetGame: 15,     // Budget Builder
  guide: 20,          // Gids voortgang
  calculator: 10,     // Calculator gebruik (placeholder)
  webinar: 5,         // Webinar bekeken (placeholder)
};

function calculateProfileScore(preferences: ExplicitPreferences | null | undefined): number {
  if (!preferences) return 0;
  
  let score = 0;
  const maxScore = WEIGHTS.profile;
  
  // Budget known = 15 points
  if (preferences.budget_min || preferences.budget_max) {
    score += maxScore * 0.5;
  }
  
  // Region known = 10 points
  if (preferences.preferred_regions && preferences.preferred_regions.length > 0) {
    score += maxScore * 0.33;
  }
  
  // Investment goal = 5 points
  if (preferences.investment_goal) {
    score += maxScore * 0.17;
  }
  
  return Math.min(score, maxScore);
}

function detectUserBehavior(
  preferences: ExplicitPreferences | null | undefined,
  engagementData: Record<string, unknown> | null | undefined
): UserBehaviorType {
  // Analyst indicators:
  // - Calculator more than 1x used
  // - Budget very specifically filled in (both min and max)
  // - ROI/cost articles read
  
  // Dreamer indicators:
  // - Preferred regions selected
  // - Lifestyle content consumed
  // - No calculator usage
  
  const analystSignals = [
    (engagementData?.calculator_uses as number) > 1,
    !!(preferences?.budget_min && preferences?.budget_max),
    !!(engagementData?.viewed_roi_content),
  ].filter(Boolean).length;
  
  const dreamerSignals = [
    !!(preferences?.preferred_regions && preferences.preferred_regions.length > 0),
    !!(engagementData?.viewed_lifestyle_content),
    preferences?.investment_goal === 'eigen_gebruik' || preferences?.investment_goal === 'combinatie',
  ].filter(Boolean).length;
  
  if (analystSignals >= 2) return 'analist';
  if (dreamerSignals >= 2) return 'dromer';
  return 'onbekend';
}

function determineNextStep(
  profileComplete: boolean,
  hasBudget: boolean,
  hasRegion: boolean,
  guideProgress: number,
  behaviorType: UserBehaviorType,
  preferredRegion: string | null
): NextStep {
  // Priority 1: Complete profile (onboarding)
  if (!hasBudget && !hasRegion) {
    return {
      type: 'onboarding',
      title: 'Start met je voorkeuren invullen',
      description: 'Vertel ons meer over je wensen zodat we je beter kunnen helpen met projectmatches.',
      link: '/onboarding',
      socialProof: 'Duurt slechts 2 minuten',
      icon: 'user',
    };
  }
  
  // Priority 2: Calculator (if budget known) - adapt based on behavior
  if (hasBudget && guideProgress < 30) {
    if (behaviorType === 'dromer' && preferredRegion) {
      return {
        type: 'guide',
        title: `Ontdek meer over ${preferredRegion}`,
        description: `Omdat je interesse toonde in ${preferredRegion}: bekijk de regio-informatie en sfeervolle content.`,
        link: '/dashboard/gidsen',
        socialProof: 'Populair: Regio-gidsen',
        icon: 'book',
      };
    }
    return {
      type: 'calculator',
      title: 'Bereken je potentiële rendement',
      description: 'Je hebt je budget ingevuld – zie wat dit kan opleveren met de ROI calculator.',
      link: '/dashboard/calculators/roi',
      socialProof: '312 investeerders deden dit al',
      icon: 'calculator',
    };
  }
  
  // Priority 3: Guide (if not much progress) - context based
  if (guideProgress < 50) {
    const contextDescription = preferredRegion
      ? `Omdat je interesse toonde in ${preferredRegion}: ontdek stap voor stap alles over het aankoopproces.`
      : 'Ontdek stap voor stap alles over het aankoopproces, kosten en financiering.';
    
    return {
      type: 'guide',
      title: 'Lees hoe investeren in Spanje werkt',
      description: contextDescription,
      link: '/dashboard/gidsen',
      socialProof: 'Populair: Kosten & Hypotheek artikelen',
      icon: 'book',
    };
  }
  
  // Priority 4: Webinar (if guide > 50%)
  if (guideProgress >= 50 && guideProgress < 80) {
    return {
      type: 'webinar',
      title: 'Bekijk het oriëntatiewebinar',
      description: 'In 45 minuten krijg je een compleet beeld van investeren in Spanje.',
      link: '/dashboard/webinar',
      socialProof: 'Vorige sessie: 23 deelnemers',
      icon: 'video',
    };
  }
  
  // Priority 5: Meeting (if everything done)
  return {
    type: 'meeting',
    title: 'Plan een vrijblijvend gesprek',
    description: 'Je bent goed voorbereid. Bespreek je plannen met adviseur Lars.',
    link: '/afspraak',
    socialProof: '23 gesprekken afgelopen maand',
    icon: 'calendar',
  };
}

function determinePhase(score: number): OntdekkenPhase {
  if (score < 25) return 'start';
  if (score < 70) return 'exploring';
  return 'ready';
}

export function useOntdekkenProgress(): OntdekkenProgress {
  const { profile } = useAuth();
  const { data: customerProfile, isLoading: isLoadingProfile } = useCustomerProfile();
  const { overallProgress, isLoading: isLoadingGuide } = useOrientationGuide();
  
  const preferences = customerProfile?.explicit_preferences as ExplicitPreferences | undefined;
  const engagementData = customerProfile?.engagement_data as Record<string, unknown> | undefined;
  
  const progress = useMemo(() => {
    // Calculate individual scores
    const profileScore = calculateProfileScore(preferences);
    const guideScore = (overallProgress.percentage / 100) * WEIGHTS.guide;
    
    // Game scores from games_completed
    const gamesCompleted = (preferences?.games_completed || {}) as {
      style_matcher?: boolean;
      investment_slider?: boolean;
      budget_builder?: boolean;
    };
    const styleGameScore = gamesCompleted.style_matcher ? WEIGHTS.styleGame : 0;
    const blendGameScore = gamesCompleted.investment_slider ? WEIGHTS.blendGame : 0;
    const budgetGameScore = gamesCompleted.budget_builder ? WEIGHTS.budgetGame : 0;
    
    // For now, calculator and webinar are placeholders
    // These could be tracked via customer_profiles.engagement_data in the future
    const calculatorScore = 0;
    const webinarScore = 0;
    
    const totalScore = Math.round(
      profileScore + guideScore + styleGameScore + blendGameScore + budgetGameScore + calculatorScore + webinarScore
    );
    
    // Determine profile completion status
    const hasBudget = !!(preferences?.budget_min || preferences?.budget_max);
    const hasRegion = !!(preferences?.preferred_regions && preferences.preferred_regions.length > 0);
    const profileComplete = hasPersonalizationData(preferences);
    const preferredRegion = preferences?.preferred_regions?.[0] || null;
    
    // Detect user behavior type
    const behaviorType = detectUserBehavior(preferences, engagementData);
    
    // Determine next step (now with behavior-based adaptation)
    const nextStep = determineNextStep(
      profileComplete,
      hasBudget,
      hasRegion,
      overallProgress.percentage,
      behaviorType,
      preferredRegion
    );
    
    // Determine phase
    const phase = determinePhase(totalScore);
    
    return {
      score: totalScore,
      phase,
      nextStep,
      behaviorType,
      completedItems: {
        guideProgress: overallProgress.percentage,
        guideCompleted: overallProgress.completed,
        guideTotal: overallProgress.total,
        profileComplete,
        hasBudget,
        hasRegion,
      },
      firstName: profile?.first_name || null,
      preferredRegion,
      isLoading: isLoadingProfile || isLoadingGuide,
    };
  }, [preferences, engagementData, overallProgress, profile?.first_name, isLoadingProfile, isLoadingGuide]);
  
  return progress;
}
