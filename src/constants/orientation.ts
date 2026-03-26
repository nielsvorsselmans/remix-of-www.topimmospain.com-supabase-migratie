import { MapPin, Landmark, Scale, Receipt, Medal, Award, Star, Trophy, LucideIcon } from "lucide-react";

export type Pillar = 'regio' | 'financiering' | 'juridisch' | 'fiscaliteit';

export interface PillarColors {
  text: string;
  bg: string;
  border: string;
  gradient: string;
  progress: string;
  hover: string;
  iconBg: string;
  simple: string;
}

export interface PillarBadge {
  title: string;
  icon: LucideIcon;
}

export interface PillarConfig {
  key: Pillar;
  title: string;
  description: string;
  icon: LucideIcon;
  colors: PillarColors;
  badge: PillarBadge;
}

/**
 * Central pillar configuration for the orientation guide system.
 * Used across portal, admin, and public components.
 */
export const PILLAR_CONFIG: Record<Pillar, PillarConfig> = {
  regio: {
    key: 'regio',
    title: "Regio's ontdekken",
    description: "Leer de verschillen tussen Costa Blanca Zuid en Costa Cálida",
    icon: MapPin,
    colors: {
      text: "text-sky-600 dark:text-sky-400",
      bg: "bg-sky-50 dark:bg-sky-950/30",
      border: "border-sky-200 dark:border-sky-800",
      gradient: "from-sky-500/10 to-sky-500/5",
      progress: "bg-sky-500",
      hover: "hover:bg-sky-100/80 dark:hover:bg-sky-900/40",
      iconBg: "bg-sky-100 dark:bg-sky-900/50",
      simple: "text-blue-500",
    },
    badge: { title: "Regio Expert", icon: Medal },
  },
  financiering: {
    key: 'financiering',
    title: "Financiering",
    description: "Hypotheekmogelijkheden en financiering in Spanje",
    icon: Landmark,
    colors: {
      text: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      border: "border-emerald-200 dark:border-emerald-800",
      gradient: "from-emerald-500/10 to-emerald-500/5",
      progress: "bg-emerald-500",
      hover: "hover:bg-emerald-100/80 dark:hover:bg-emerald-900/40",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
      simple: "text-green-500",
    },
    badge: { title: "Financieringskenner", icon: Award },
  },
  juridisch: {
    key: 'juridisch',
    title: "Juridisch",
    description: "NIE-nummer, eigendom en juridische controles",
    icon: Scale,
    colors: {
      text: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-950/30",
      border: "border-violet-200 dark:border-violet-800",
      gradient: "from-violet-500/10 to-violet-500/5",
      progress: "bg-violet-500",
      hover: "hover:bg-violet-100/80 dark:hover:bg-violet-900/40",
      iconBg: "bg-violet-100 dark:bg-violet-900/50",
      simple: "text-purple-500",
    },
    badge: { title: "Juridisch Onderlegd", icon: Star },
  },
  fiscaliteit: {
    key: 'fiscaliteit',
    title: "Fiscaliteit",
    description: "Belastingen bij aankoop en bezit",
    icon: Receipt,
    colors: {
      text: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-800",
      gradient: "from-amber-500/10 to-amber-500/5",
      progress: "bg-amber-500",
      hover: "hover:bg-amber-100/80 dark:hover:bg-amber-900/40",
      iconBg: "bg-amber-100 dark:bg-amber-900/50",
      simple: "text-orange-500",
    },
    badge: { title: "Fiscaal Expert", icon: Trophy },
  },
};

// Array of pillars in display order
export const PILLARS: PillarConfig[] = [
  PILLAR_CONFIG.regio,
  PILLAR_CONFIG.financiering,
  PILLAR_CONFIG.juridisch,
  PILLAR_CONFIG.fiscaliteit,
];

// List of pillar keys
export const PILLAR_KEYS: Pillar[] = ['regio', 'financiering', 'juridisch', 'fiscaliteit'];

// Helper function to get pillar info by key
export function getPillarConfig(key: Pillar): PillarConfig {
  return PILLAR_CONFIG[key];
}
