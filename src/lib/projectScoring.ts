// Project scoring utility for matching projects to customer preferences

export interface CustomerPreferences {
  budgetMin?: number | null;
  budgetMax?: number | null;
  preferredRegions?: string[];
  preferredCities?: string[];
  viewedProjects?: string[];
  favoriteProjects?: string[];
  assignedProjectIds?: string[];
  // Gamified onboarding preferences - updated with "both" and "none" options
  stylePreferences?: {
    architecture?: "modern" | "traditional" | "both" | "none";
    view?: "sea" | "golf" | "both" | "none";
    location_type?: "coastal" | "inland" | "both" | "none";
  };
  amenityPreferences?: {
    pool?: "shared" | "private" | "none";
    sea_distance?: "walking" | "driving" | "not_important";
  };
  investmentBlend?: number;
  bedroomsMin?: number;
}

export interface ProjectForScoring {
  id: string;
  name: string;
  city: string | null;
  region: string | null;
  price_from: number | null;
  price_to: number | null;
  featured_image?: string | null;
  // Extended fields for gamified matching
  has_sea_views?: boolean;
  has_private_pool?: boolean;
  has_communal_pool?: boolean;
  min_distance_to_beach?: number | null;
  min_bedrooms?: number | null;
  max_bedrooms?: number | null;
  property_types?: string[];
}

export interface ScoredProject extends ProjectForScoring {
  score: number;
  matchReasons: string[];
}

// Golf-related cities for golf view preference matching
const GOLF_CITIES = [
  "la manga", "pilar de la horadada", "algorfa", "orihuela costa",
  "campoamor", "villamartin", "los alcázares", "mar menor golf resort"
];

// Modern property types
const MODERN_PROPERTY_TYPES = ["appartement", "penthouse", "villa", "apartment"];
// Traditional property types  
const TRADITIONAL_PROPERTY_TYPES = ["townhouse", "quad", "semidetached", "finca", "bungalow"];

/**
 * Calculate style preference score based on gamified onboarding selections
 */
function calculateStyleScore(
  project: ProjectForScoring,
  stylePrefs: CustomerPreferences['stylePreferences']
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (!stylePrefs) return { score, reasons };

  // View preference handling with "both" and "none" support
  if (stylePrefs.view === "sea") {
    if (project.has_sea_views) {
      score += 20;
      reasons.push("Zeezicht");
    } else if (project.min_distance_to_beach && project.min_distance_to_beach < 1000) {
      score += 10; // Partial match for close to beach
      reasons.push("Dicht bij zee");
    }
  } else if (stylePrefs.view === "golf") {
    // Golf view: check if in golf-related city
    const cityLower = project.city?.toLowerCase() || "";
    if (GOLF_CITIES.some(gc => cityLower.includes(gc))) {
      score += 15;
      reasons.push("Golf regio");
    }
  } else if (stylePrefs.view === "both") {
    // "Both" gives soft boost for either option
    if (project.has_sea_views) {
      score += 10;
      reasons.push("Zeezicht");
    }
    const cityLower = project.city?.toLowerCase() || "";
    if (GOLF_CITIES.some(gc => cityLower.includes(gc))) {
      score += 10;
      reasons.push("Golf regio");
    }
  }
  // "none" = no filtering, no score boost

  // Location type preference: +15 pts with "both" support
  const distanceToBeach = project.min_distance_to_beach;
  if (stylePrefs.location_type === "coastal") {
    if (distanceToBeach !== null && distanceToBeach !== undefined && distanceToBeach < 5000) {
      score += 15;
      reasons.push("Aan de kust");
    }
  } else if (stylePrefs.location_type === "inland") {
    if (distanceToBeach !== null && distanceToBeach !== undefined && distanceToBeach > 10000) {
      score += 15;
      reasons.push("Rust binnenland");
    }
  } else if (stylePrefs.location_type === "both") {
    // "Both" gives soft boost for any location
    if (distanceToBeach !== null && distanceToBeach !== undefined) {
      score += 8;
      if (distanceToBeach < 5000) {
        reasons.push("Aan de kust");
      } else {
        reasons.push("Binnenland");
      }
    }
  }
  // "none" = no filtering, no score boost

  // Architecture preference: +10 pts with "both" support
  if (stylePrefs.architecture && project.property_types && project.property_types.length > 0) {
    const projectTypesLower = project.property_types.map(t => t.toLowerCase());
    
    if (stylePrefs.architecture === "modern") {
      if (projectTypesLower.some(t => MODERN_PROPERTY_TYPES.includes(t))) {
        score += 10;
        reasons.push("Moderne stijl");
      }
    } else if (stylePrefs.architecture === "traditional") {
      if (projectTypesLower.some(t => TRADITIONAL_PROPERTY_TYPES.includes(t))) {
        score += 10;
        reasons.push("Traditionele stijl");
      }
    } else if (stylePrefs.architecture === "both") {
      // "Both" gives soft boost for either style
      if (projectTypesLower.some(t => MODERN_PROPERTY_TYPES.includes(t))) {
        score += 5;
        reasons.push("Moderne stijl");
      }
      if (projectTypesLower.some(t => TRADITIONAL_PROPERTY_TYPES.includes(t))) {
        score += 5;
        reasons.push("Traditionele stijl");
      }
    }
    // "none" = no filtering, no score boost
  }

  return { score, reasons };
}

/**
 * Calculate amenity preference score based on budget builder selections
 */
function calculateAmenityScore(
  project: ProjectForScoring,
  amenityPrefs: CustomerPreferences['amenityPreferences'],
  bedroomsMin?: number
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (!amenityPrefs && !bedroomsMin) return { score, reasons };

  // Pool preference: +20 pts for private, +10 pts for shared
  if (amenityPrefs?.pool === "private" && project.has_private_pool) {
    score += 20;
    reasons.push("Privé zwembad");
  } else if (amenityPrefs?.pool === "shared" && project.has_communal_pool) {
    score += 10;
    reasons.push("Gezamenlijk zwembad");
  }

  // Sea distance preference
  const distanceToBeach = project.min_distance_to_beach;
  if (amenityPrefs?.sea_distance === "walking") {
    if (distanceToBeach !== null && distanceToBeach !== undefined && distanceToBeach < 500) {
      score += 25;
      reasons.push("Loopafstand zee");
    } else if (distanceToBeach !== null && distanceToBeach !== undefined && distanceToBeach < 1500) {
      score += 15; // Partial match
      reasons.push("Korte wandeling naar zee");
    }
  } else if (amenityPrefs?.sea_distance === "driving") {
    if (distanceToBeach !== null && distanceToBeach !== undefined && distanceToBeach < 15000) {
      score += 10;
      reasons.push("Korte rit naar zee");
    }
  }

  // Bedroom preference: +15 pts
  if (bedroomsMin && project.max_bedrooms) {
    if (project.max_bedrooms >= bedroomsMin) {
      score += 15;
      reasons.push(`${bedroomsMin}+ slaapkamers`);
    }
  }

  return { score, reasons };
}

/**
 * Calculate investment blend score based on slider position
 */
function calculateInvestmentBlendScore(
  project: ProjectForScoring,
  investmentBlend: number
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  const projectTypesLower = project.property_types?.map(t => t.toLowerCase()) || [];
  const distanceToBeach = project.min_distance_to_beach;

  // Focus on rental income (blend >= 60)
  if (investmentBlend >= 60) {
    // Prefer apartments/penthouses (easier to rent)
    const rentableTypes = ["appartement", "penthouse", "apartment"];
    if (projectTypesLower.some(t => rentableTypes.includes(t))) {
      score += 10;
      reasons.push("Verhuurvriendelijk");
    }
    
    // Prefer close to beach (popular with tourists)
    if (distanceToBeach !== null && distanceToBeach !== undefined && distanceToBeach < 3000) {
      score += 5;
      reasons.push("Toeristische locatie");
    }
  }
  
  // Focus on personal enjoyment (blend <= 40)
  else if (investmentBlend <= 40) {
    // Prefer villas/townhouses (more privacy)
    const privateTypes = ["villa", "townhouse", "quad", "finca"];
    if (projectTypesLower.some(t => privateTypes.includes(t))) {
      score += 10;
      reasons.push("Privé woning");
    }
  }
  
  // Balanced (40-60) - both types are good
  else {
    score += 5;
    reasons.push("Veelzijdig");
  }

  return { score, reasons };
}

export function calculateProjectScore(
  project: ProjectForScoring,
  preferences: CustomerPreferences
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  const {
    budgetMin,
    budgetMax,
    preferredRegions = [],
    preferredCities = [],
    viewedProjects = [],
    favoriteProjects = [],
    assignedProjectIds = [],
  } = preferences;

  // Skip already assigned projects
  if (assignedProjectIds.includes(project.id)) {
    return { score: -1, reasons: [] };
  }

  // Budget overlap: +40 points with nuanced reasons
  if (budgetMin || budgetMax) {
    const projectMin = project.price_from || 0;
    const projectMax = project.price_to || project.price_from || 0;
    const prefMin = budgetMin || 0;
    const prefMax = budgetMax || Infinity;

    const hasOverlap = projectMin <= prefMax && projectMax >= prefMin;
    
    if (hasOverlap) {
      score += 40;
      
      // Nuanced budget reason for trust-first transparency
      if (projectMin >= prefMin && projectMax <= prefMax) {
        reasons.push("Volledig binnen budget");
      } else if (projectMin <= prefMax && projectMin >= prefMin) {
        reasons.push("Startprijs binnen budget");
      } else {
        reasons.push("Deels binnen budget");
      }
    }
  }

  // Preferred region match: +30 points
  if (preferredRegions.length > 0 && project.region) {
    const normalizedRegion = project.region.toLowerCase();
    const matchesRegion = preferredRegions.some(r => 
      normalizedRegion.includes(r.toLowerCase()) || 
      r.toLowerCase().includes(normalizedRegion)
    );
    if (matchesRegion) {
      score += 30;
      reasons.push("Voorkeur regio");
    }
  }

  // Preferred city match: +25 points
  if (preferredCities.length > 0 && project.city) {
    const normalizedCity = project.city.toLowerCase();
    const matchesCity = preferredCities.some(c => 
      normalizedCity.includes(c.toLowerCase()) || 
      c.toLowerCase().includes(normalizedCity)
    );
    if (matchesCity) {
      score += 25;
      reasons.push("Voorkeur stad");
    }
  }

  // Favorite similarity: +25 points (if project matches characteristics of favorites)
  if (favoriteProjects.length > 0) {
    // If this project is in favorites, give bonus
    if (favoriteProjects.includes(project.id)) {
      score += 25;
      reasons.push("Gefavoriseerd");
    }
  }

  // Recently viewed bonus: +15 points
  if (viewedProjects.length > 0 && viewedProjects.includes(project.id)) {
    score += 15;
    reasons.push("Recent bekeken");
  }

  // ============================================
  // GAMIFIED ONBOARDING SCORING
  // ============================================

  // Style preferences scoring (from Style Matcher game)
  const styleResult = calculateStyleScore(project, preferences.stylePreferences);
  score += styleResult.score;
  reasons.push(...styleResult.reasons);

  // Amenity preferences scoring (from Budget Builder game)
  const amenityResult = calculateAmenityScore(
    project,
    preferences.amenityPreferences,
    preferences.bedroomsMin
  );
  score += amenityResult.score;
  reasons.push(...amenityResult.reasons);

  // Investment blend scoring (from Investment Slider game)
  if (preferences.investmentBlend !== undefined && preferences.investmentBlend !== null) {
    const blendResult = calculateInvestmentBlendScore(project, preferences.investmentBlend);
    score += blendResult.score;
    reasons.push(...blendResult.reasons);
  }

  // Base score for having any data: +5 points
  if (score === 0 && (budgetMin || budgetMax || preferredRegions.length || preferredCities.length)) {
    // No match found, but we have preferences data
    score = 5; // Minimal score
  }

  return { score, reasons };
}

export function scoreAndSortProjects(
  projects: ProjectForScoring[],
  preferences: CustomerPreferences,
  minScore: number = 20
): ScoredProject[] {
  return projects
    .map(project => {
      const { score, reasons } = calculateProjectScore(project, preferences);
      return {
        ...project,
        score,
        matchReasons: reasons,
      };
    })
    .filter(p => p.score >= minScore)
    .sort((a, b) => b.score - a.score);
}

export function getScoreStars(score: number): number {
  if (score >= 80) return 5;
  if (score >= 60) return 4;
  if (score >= 40) return 3;
  if (score >= 20) return 2;
  return 1;
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return "Zeer aanbevolen";
  if (score >= 60) return "Aanbevolen";
  if (score >= 40) return "Mogelijk interessant";
  return "Neutraal";
}

/**
 * Build CustomerPreferences from explicit_preferences JSON
 * This helper converts the stored format to the scoring format
 */
export function buildCustomerPreferencesFromExplicit(
  explicitPrefs: Record<string, any> | null | undefined
): Partial<CustomerPreferences> {
  if (!explicitPrefs) return {};

  return {
    budgetMin: explicitPrefs.budget_min,
    budgetMax: explicitPrefs.budget_max,
    preferredRegions: explicitPrefs.preferred_regions || [],
    preferredCities: explicitPrefs.preferred_cities || [],
    stylePreferences: explicitPrefs.style_preferences,
    amenityPreferences: explicitPrefs.amenity_preferences,
    investmentBlend: explicitPrefs.investment_blend,
    bedroomsMin: explicitPrefs.bedrooms_min,
  };
}
