// Gamified Onboarding Constants
// These define the "games" used in the Investeringskompas flow

// ============================================
// STYLE MATCHER - "This or That" game
// ============================================

export interface StyleRound {
  id: string;
  question: string;
  optionA: { image: string; label: string; value: string };
  optionB: { image: string; label: string; value: string };
}

export const STYLE_MATCHER_ROUNDS: StyleRound[] = [
  {
    id: "architecture",
    question: "Welke stijl spreekt je aan?",
    optionA: {
      image: "modern-villa",
      label: "Strak & Modern",
      value: "modern",
    },
    optionB: {
      image: "traditional-finca",
      label: "Warm & Spaans",
      value: "traditional",
    },
  },
  {
    id: "view",
    question: "Welk uitzicht past bij jou?",
    optionA: {
      image: "sea-view",
      label: "Zeezicht",
      value: "sea",
    },
    optionB: {
      image: "golf-view",
      label: "Golfbaan",
      value: "golf",
    },
  },
  {
    id: "location_type",
    question: "Waar wil je verblijven?",
    optionA: {
      image: "coastal-town",
      label: "Aan de kust",
      value: "coastal",
    },
    optionB: {
      image: "inland-village",
      label: "Rust in het binnenland",
      value: "inland",
    },
  },
];

export interface StyleMatcherResult {
  architecture?: "modern" | "traditional" | "both" | "none";
  view?: "sea" | "golf" | "both" | "none";
  location_type?: "coastal" | "inland" | "both" | "none";
}

/**
 * Helper function to determine if a preference should be used for filtering
 * "both" and "none" values should not be used as strict filters
 */
export function shouldFilterOnPreference(value: string | undefined): boolean {
  return value !== undefined && value !== "both" && value !== "none";
}

export function getStyleResultLabel(result: StyleMatcherResult): string {
  const parts: string[] = [];
  
  if (result.architecture === "modern") parts.push("Modern");
  else if (result.architecture === "traditional") parts.push("Klassiek");
  else if (result.architecture === "both") parts.push("Flexibele stijl");
  
  if (result.location_type === "coastal") parts.push("Kust");
  else if (result.location_type === "inland") parts.push("Binnenland");
  else if (result.location_type === "both") parts.push("Overal");
  
  if (result.view === "sea") parts.push("Zeezicht");
  else if (result.view === "golf") parts.push("Golfview");
  else if (result.view === "both") parts.push("Elk uitzicht");
  
  return parts.join(" • ") || "Jouw stijl";
}

// ============================================
// INVESTMENT BLEND SLIDER
// ============================================

export interface BlendFeedback {
  min: number;
  max: number;
  label: string;
  description: string;
}

export const INVESTMENT_BLEND_FEEDBACK: BlendFeedback[] = [
  {
    min: 0,
    max: 20,
    label: "100% Genieten",
    description: "Je zoekt een plek om zelf van te genieten. Vakantie en quality time staan centraal.",
  },
  {
    min: 21,
    max: 40,
    label: "Vooral genieten",
    description: "Je wilt vooral zelf genieten, maar af en toe verhuren om de kosten te dekken is welkom.",
  },
  {
    min: 41,
    max: 60,
    label: "De perfecte balans",
    description: "Je wilt het beste van twee werelden: zelf genieten in de vakanties én verhuren in het hoogseizoen.",
  },
  {
    min: 61,
    max: 80,
    label: "Focus op rendement",
    description: "Rendement staat voorop, maar je wilt ook af en toe zelf kunnen genieten van je investering.",
  },
  {
    min: 81,
    max: 100,
    label: "100% Investering",
    description: "Maximaal rendement is het doel. Je ziet dit als een slimme investering, niet als vakantiehuis.",
  },
];

export function getInvestmentGoalFromBlend(blend: number): string {
  if (blend <= 20) return "personal_use";
  if (blend >= 81) return "rental_income";
  return "mixed";
}

// ============================================
// BUDGET BUILDER - Stackable options
// ============================================

export interface BudgetOption {
  id: string;
  category: string;
  label: string;
  basePrice?: number;
  priceImpact: number;
  exclusive?: string[];
}

export const BUDGET_BUILDER_OPTIONS: BudgetOption[] = [
  // Bedrooms
  {
    id: "bed_2",
    category: "bedrooms",
    label: "2 Slaapkamers",
    basePrice: 200000,
    priceImpact: 0,
    exclusive: ["bed_3"],
  },
  {
    id: "bed_3",
    category: "bedrooms",
    label: "3 Slaapkamers",
    priceImpact: 50000,
    exclusive: ["bed_2"],
  },

  // Pool
  {
    id: "pool_shared",
    category: "pool",
    label: "Gezamenlijk zwembad",
    priceImpact: 0,
    exclusive: ["pool_private"],
  },
  {
    id: "pool_private",
    category: "pool",
    label: "Privé zwembad",
    priceImpact: 25000,
    exclusive: ["pool_shared"],
  },

  // Sea distance
  {
    id: "sea_15min",
    category: "sea",
    label: "Op 15 min van zee",
    priceImpact: 0,
    exclusive: ["sea_walk"],
  },
  {
    id: "sea_walk",
    category: "sea",
    label: "Loopafstand van zee",
    priceImpact: 40000,
    exclusive: ["sea_15min"],
  },
];

export interface BudgetBuilderResult {
  budget_min: number;
  budget_max: number;
  bedrooms_min: number;
  pool: "shared" | "private" | "none";
  sea_distance: "walking" | "driving";
}

// ============================================
// GAMES TRACKING
// ============================================

export type GameType = "style_matcher" | "investment_slider" | "budget_builder";

export interface GamesCompleted {
  style_matcher?: boolean;
  investment_slider?: boolean;
  budget_builder?: boolean;
}

export const GAME_METADATA: Record<GameType, { 
  title: string; 
  description: string; 
  duration: string;
  icon: string;
}> = {
  style_matcher: {
    title: "Ontdek jouw stijl",
    description: "Kies de plaatjes die jou het meest aanspreken.",
    duration: "30 seconden",
    icon: "Palette",
  },
  investment_slider: {
    title: "Bepaal je balans",
    description: "Hoeveel wil je genieten vs. rendement maken?",
    duration: "20 seconden",
    icon: "Sliders",
  },
  budget_builder: {
    title: "Bouw je scenario",
    description: "Stapel je wensen en zie direct de prijsimpact.",
    duration: "1 minuut",
    icon: "Building2",
  },
};
