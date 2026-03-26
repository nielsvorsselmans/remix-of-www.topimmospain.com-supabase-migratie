import { Receipt, Calculator, Landmark, TrendingUp, Home, LucideIcon } from "lucide-react";

export interface CalculatorConfig {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  icon: LucideIcon;
  path: string;
  color: string;
  iconBg: string;
  features: string[];
  time: string;
  level: 'Beginner' | 'Gemiddeld' | 'Gevorderd';
  recommended: boolean;
}

/**
 * Central calculator configuration.
 * Used across Ontdekken, Calculators page, and tracking.
 */
export const CALCULATOR_CONFIG: CalculatorConfig[] = [
  {
    id: "aankoopkosten",
    title: "Aankoopkosten Calculator",
    shortTitle: "Aankoopkosten",
    description: "Bereken alle kosten bij aankoop",
    icon: Receipt,
    path: "/dashboard/calculators/aankoopkosten",
    color: "bg-blue-500/10 text-blue-600",
    iconBg: "bg-blue-500/20",
    features: [
      "Overdrachtsbelasting (ITP/BTW)",
      "Notariskosten",
      "Registratiekosten",
      "Juridische kosten",
    ],
    time: "2 min",
    level: "Beginner",
    recommended: true,
  },
  {
    id: "roi",
    title: "ROI Calculator",
    shortTitle: "ROI Calculator",
    description: "Bereken je verwacht rendement",
    icon: TrendingUp,
    path: "/dashboard/calculators/roi",
    color: "bg-emerald-500/10 text-emerald-600",
    iconBg: "bg-emerald-500/20",
    features: [
      "Bruto en netto rendement",
      "Cashflow analyse",
      "Waardestijging prognose",
      "Scenario vergelijking",
    ],
    time: "5 min",
    level: "Gevorderd",
    recommended: false,
  },
  {
    id: "lening",
    title: "Lening Calculator",
    shortTitle: "Lening Berekenen",
    description: "Simuleer je hypotheek",
    icon: Landmark,
    path: "/dashboard/calculators/lening",
    color: "bg-purple-500/10 text-purple-600",
    iconBg: "bg-purple-500/20",
    features: [
      "Maximaal hypotheekbedrag",
      "Maandelijkse lasten",
      "Vergelijking BE/NL vs ES",
      "Renteberekeningen",
    ],
    time: "3 min",
    level: "Gemiddeld",
    recommended: false,
  },
  {
    id: "box3",
    title: "Box 3 Calculator",
    shortTitle: "Box 3 Impact",
    description: "Nederlandse belastingimpact",
    icon: Calculator,
    path: "/dashboard/calculators/box3",
    color: "bg-orange-500/10 text-orange-600",
    iconBg: "bg-orange-500/20",
    features: [
      "Vermogensbelasting NL",
      "Vrijstellingen",
      "Effect van vastgoed",
      "Jaarlijkse belastingdruk",
    ],
    time: "3 min",
    level: "Gemiddeld",
    recommended: false,
  },
  {
    id: "hypotheek",
    title: "Hypotheek Simulator",
    shortTitle: "Hypotheek Simulator",
    description: "Simuleer je Spaanse hypotheek",
    icon: Home,
    path: "/dashboard/calculators/hypotheek",
    color: "bg-teal-500/10 text-teal-600",
    iconBg: "bg-teal-500/20",
    features: [
      "Maximale leencapaciteit",
      "Maandlasten berekening",
      "Haalbaarheidsanalyse",
      "AI-advies rapport",
    ],
    time: "5 min",
    level: "Gevorderd",
    recommended: true,
  },
];

// Helper to get calculator by id
export function getCalculatorConfig(id: string): CalculatorConfig | undefined {
  return CALCULATOR_CONFIG.find((c) => c.id === id);
}

// Get calculator paths for tracking/navigation
export function getCalculatorPaths(): string[] {
  return CALCULATOR_CONFIG.map((c) => c.path);
}
