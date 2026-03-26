// Helper functions for calculating profile completeness

interface ExplicitPreferences {
  budget_min?: number | null;
  budget_max?: number | null;
  preferred_regions?: string[] | null;
  preferred_cities?: string[] | null;
  bedrooms_min?: number | null;
  bedrooms_max?: number | null;
  property_types?: string[] | null;
  investment_goal?: string | null;
  timeline?: string | null;
  persona_type?: string | null;
  spain_visit_planned?: string | null;
  spain_visit_arrival_date?: string | null;
  spain_visit_departure_date?: string | null;
  phone?: string | null;
}

// Fields that count toward completeness (core fields)
// Note: budget is handled specially - either budget_min OR budget_max counts as complete
const COMPLETENESS_FIELDS_EXCLUDING_BUDGET: (keyof ExplicitPreferences)[] = [
  'preferred_regions',
  'investment_goal',
  'timeline',
  'persona_type',
];

// All editable preference fields
export const ALL_PREFERENCE_FIELDS: (keyof ExplicitPreferences)[] = [
  'budget_min',
  'budget_max',
  'preferred_regions',
  'preferred_cities',
  'property_types',
  'bedrooms_min',
  'bedrooms_max',
  'investment_goal',
  'timeline',
  'persona_type',
  'spain_visit_planned',
  'spain_visit_arrival_date',
  'spain_visit_departure_date',
  'phone',
];

export function isFieldComplete(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'number') return true;
  if (Array.isArray(value)) return value.length > 0;
  return false;
}

export function calculateProfileCompleteness(preferences: ExplicitPreferences | null | undefined): number {
  if (!preferences) return 0;
  
  // Total fields = budget (1) + other fields
  const totalFields = COMPLETENESS_FIELDS_EXCLUDING_BUDGET.length + 1;
  
  // Budget is complete if either min OR max is filled
  const budgetComplete = isFieldComplete(preferences.budget_min) || isFieldComplete(preferences.budget_max);
  
  const completedOtherFields = COMPLETENESS_FIELDS_EXCLUDING_BUDGET.filter(field => 
    isFieldComplete(preferences[field])
  );
  
  const totalCompleted = (budgetComplete ? 1 : 0) + completedOtherFields.length;
  
  return Math.round((totalCompleted / totalFields) * 100);
}

export function getMissingFields(preferences: ExplicitPreferences | null | undefined): (keyof ExplicitPreferences)[] {
  if (!preferences) return ['budget_min', ...COMPLETENESS_FIELDS_EXCLUDING_BUDGET];
  
  const missing: (keyof ExplicitPreferences)[] = [];
  
  // Budget is missing only if BOTH min and max are empty
  if (!isFieldComplete(preferences.budget_min) && !isFieldComplete(preferences.budget_max)) {
    missing.push('budget_min'); // Use budget_min as representative
  }
  
  COMPLETENESS_FIELDS_EXCLUDING_BUDGET.forEach(field => {
    if (!isFieldComplete(preferences[field])) {
      missing.push(field);
    }
  });
  
  return missing;
}

export function isOnboardingComplete(preferences: ExplicitPreferences | null | undefined): boolean {
  return calculateProfileCompleteness(preferences) >= 80;
}

// Human-readable labels for preference fields (Dutch)
export const PREFERENCE_LABELS: Record<keyof ExplicitPreferences, string> = {
  budget_min: 'Minimum budget',
  budget_max: 'Maximum budget',
  preferred_regions: "Voorkeursregio's",
  preferred_cities: 'Voorkeurssteden',
  bedrooms_min: 'Minimum slaapkamers',
  bedrooms_max: 'Maximum slaapkamers',
  property_types: 'Woningtypes',
  investment_goal: 'Investeringsdoel',
  timeline: 'Tijdlijn',
  persona_type: 'Investeerdersprofiel',
  spain_visit_planned: 'Spanje bezoek gepland',
  spain_visit_arrival_date: 'Aankomstdatum Spanje',
  spain_visit_departure_date: 'Vertrekdatum Spanje',
  phone: 'Telefoonnummer',
};
