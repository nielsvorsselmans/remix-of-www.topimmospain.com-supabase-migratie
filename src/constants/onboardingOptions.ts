// Unified onboarding options - single source of truth for both flows
// Values are stored as IDs but regions are always stored as labels for human readability

// Investment goals - unified values used by both QuickOnboardingWizard and OnboardingQuestionnaire
export const INVESTMENT_GOALS = [
  {
    id: "rental_income",
    label: "Huurrendement",
    shortLabel: "Investering",
    description: "Focus op verhuurinkomsten en rendement",
    icon: "TrendingUp" as const,
  },
  {
    id: "capital_growth",
    label: "Vermogensgroei",
    shortLabel: "Vermogen",
    description: "Focus op waardestijging",
    icon: "TrendingUp" as const,
  },
  {
    id: "personal_use",
    label: "Eigen gebruik",
    shortLabel: "Eigen gebruik",
    description: "Zelf genieten van de Spaanse zon",
    icon: "Sun" as const,
  },
  {
    id: "mixed",
    label: "Combinatie",
    shortLabel: "Combinatie",
    description: "Zowel verhuur als eigen gebruik",
    icon: "RefreshCw" as const,
  },
  {
    id: "exploring",
    label: "Ik weet het nog niet",
    shortLabel: "Nog onzeker",
    description: "Ik wil eerst meer leren voordat ik kies",
    icon: "HelpCircle" as const,
  },
] as const;

// Regions - always stored as labels in the database
// QuickOnboardingWizard uses a subset, OnboardingQuestionnaire uses all
export const REGIONS = [
  { id: "costa_calida", label: "Costa Cálida" },
  { id: "costa_blanca_zuid", label: "Costa Blanca Zuid" },
  { id: "costa_blanca_noord", label: "Costa Blanca Noord" },
  { id: "mar_menor", label: "Mar Menor" },
  { id: "murcia", label: "Murcia" },
  { id: "costa_del_sol", label: "Costa del Sol" },
] as const;

// Subset of regions for QuickOnboardingWizard (focused options)
export const QUICK_ONBOARDING_REGIONS = [
  { id: "costa_blanca_zuid", label: "Costa Blanca Zuid" },
  { id: "costa_blanca_noord", label: "Costa Blanca Noord" },
  { id: "costa_calida", label: "Costa Cálida" },
  { id: "costa_del_sol", label: "Costa del Sol" },
] as const;

// Special option for "no preference"
export const NO_PREFERENCE_REGION = { id: "no_preference", label: "Nog geen voorkeur" } as const;

// Timeline options for investment planning
export const TIMELINES = [
  { value: "0-3_months", label: "0-3 maanden", description: "Ik wil snel handelen" },
  { value: "3-6_months", label: "3-6 maanden", description: "Actief aan het zoeken" },
  { value: "6-12_months", label: "6-12 maanden", description: "Ik oriënteer me nog" },
  { value: "12+_months", label: "12+ maanden", description: "Ik denk er nog over na" },
] as const;

// Persona types for customer profiling
export const PERSONA_TYPES = [
  { value: "investor", label: "Belegger", description: "Rendement staat voorop" },
  { value: "lifestyle", label: "Genieter", description: "Levenskwaliteit is belangrijk" },
  { value: "explorer", label: "Ontdekker", description: "Ik wil eerst meer leren" },
] as const;

// Helper function to get investment goal label (with legacy value support)
export function getInvestmentGoalLabel(value: string | null | undefined): string {
  if (!value) return "";
  
  // Handle legacy values from old QuickOnboardingWizard
  const legacyMap: Record<string, string> = {
    investment: "Huurrendement",
    combination: "Combinatie",
  };
  
  if (legacyMap[value]) return legacyMap[value];
  
  const goal = INVESTMENT_GOALS.find(g => g.id === value);
  return goal?.label || value;
}

// Helper function to get region label from id
export function getRegionLabel(id: string): string {
  const region = REGIONS.find(r => r.id === id);
  return region?.label || id;
}

// Helper function to get region id from label (for backwards compatibility)
export function getRegionId(label: string): string {
  const region = REGIONS.find(r => r.label === label);
  return region?.id || label;
}

// Type exports
export type InvestmentGoalId = typeof INVESTMENT_GOALS[number]["id"];
export type RegionId = typeof REGIONS[number]["id"];
export type TimelineValue = typeof TIMELINES[number]["value"];
export type PersonaType = typeof PERSONA_TYPES[number]["value"];
