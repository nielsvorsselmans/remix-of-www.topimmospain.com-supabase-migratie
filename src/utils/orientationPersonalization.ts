import { Pillar } from "@/hooks/useOrientationGuide";

export interface ExplicitPreferences {
  investment_goal?: string;
  preferred_regions?: string[];
  budget_min?: number;
  budget_max?: number;
  timeline?: string;
  spain_visit_planned?: string;
  // Gamified onboarding fields
  investment_blend?: number;
  style_preferences?: {
    architecture?: "modern" | "traditional";
    view?: "sea" | "golf";
    location_type?: "coastal" | "inland";
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

// Map investment goal to recommended starting pillar
export function getRecommendedPillar(investmentGoal?: string): Pillar | null {
  if (!investmentGoal) return null;
  
  const mapping: Record<string, Pillar> = {
    'rendement': 'financiering',
    'eigen-gebruik': 'regio',
    'combinatie': 'fiscaliteit',
    'vermogensgroei': 'juridisch',
  };
  
  return mapping[investmentGoal] || null;
}

// Get personalized recommendation text based on investment goal
export function getRecommendationText(investmentGoal?: string): string | null {
  if (!investmentGoal) return null;
  
  const texts: Record<string, string> = {
    'rendement': 'Omdat je focus op rendement ligt, raden we aan te beginnen met informatie over financieringsmogelijkheden.',
    'eigen-gebruik': 'Omdat je geïnteresseerd bent in eigen gebruik, is het slim om te beginnen met de verschillende regio\'s te verkennen.',
    'combinatie': 'Omdat je zowel rendement als eigen gebruik wilt combineren, is het goed om te starten met de fiscale aspecten.',
    'vermogensgroei': 'Omdat je focus op vermogensgroei ligt, raden we aan te beginnen met de juridische structuren.',
  };
  
  return texts[investmentGoal] || null;
}

// Get personalized progress message
export function getProgressMessage(firstName?: string, completedCount: number = 0, investmentGoal?: string): string {
  const name = firstName ? `, ${firstName}` : '';
  
  if (completedCount === 0) {
    return firstName ? `Welkom${name}! Je avontuur begint hier` : 'Je avontuur begint hier';
  }
  
  const messages = [
    `Goed bezig${name}! Je hebt ${completedCount} ${completedCount === 1 ? 'artikel' : 'artikelen'} gelezen`,
    `Prima${name}! Al ${completedCount} ${completedCount === 1 ? 'artikel' : 'artikelen'} gelezen`,
    `Lekker bezig${name}! ${completedCount} ${completedCount === 1 ? 'artikel' : 'artikelen'} voltooid`,
  ];
  
  // Use completed count to pick a consistent message
  return messages[completedCount % messages.length];
}

// Format budget range for display
export function formatBudgetRange(min?: number, max?: number): string | null {
  if (!min && !max) return null;
  
  const formatNumber = (n: number) => {
    if (n >= 1000000) return `€${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `€${Math.round(n / 1000)}k`;
    return `€${n}`;
  };
  
  if (min && max) {
    return `${formatNumber(min)} - ${formatNumber(max)}`;
  }
  if (min) return `Vanaf ${formatNumber(min)}`;
  if (max) return `Tot ${formatNumber(max)}`;
  return null;
}

// Get timeline display text
export function getTimelineDisplay(timeline?: string): string | null {
  if (!timeline) return null;
  
  const displays: Record<string, string> = {
    'binnen-3-maanden': 'Binnen 3 maanden',
    '3-6-maanden': '3 tot 6 maanden',
    '6-12-maanden': '6 tot 12 maanden',
    'meer-dan-jaar': 'Meer dan een jaar',
    'geen-concrete-plannen': 'Nog geen concrete plannen',
  };
  
  return displays[timeline] || timeline;
}

// Get investment goal display text
export function getInvestmentGoalDisplay(goal?: string): string | null {
  if (!goal) return null;
  
  const displays: Record<string, string> = {
    'rendement': 'Rendement',
    'eigen-gebruik': 'Eigen gebruik',
    'combinatie': 'Combinatie rendement & gebruik',
    'vermogensgroei': 'Vermogensgroei',
  };
  
  return displays[goal] || goal;
}

// Check if user has enough preferences for personalization
export function hasPersonalizationData(preferences?: ExplicitPreferences | null): boolean {
  if (!preferences) return false;
  
  return !!(
    preferences.investment_goal ||
    (preferences.preferred_regions && preferences.preferred_regions.length > 0) ||
    preferences.budget_min ||
    preferences.budget_max
  );
}
