import { Sparkles, X, Check, Star, MapPin } from "lucide-react";

/**
 * Shared configuration for selection status badges
 * Used by UnifiedSelectionCard and CompactSelectionCard
 */
export const statusConfig = {
  suggested: { 
    label: "Te beoordelen", 
    color: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700", 
    icon: Star 
  },
  interested: { 
    label: "Spreekt me aan", 
    color: "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700", 
    icon: Sparkles 
  },
  to_visit: { 
    label: "Wil bezoeken", 
    color: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700", 
    icon: MapPin 
  },
  visited: { 
    label: "Bezocht", 
    color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700", 
    icon: Check 
  },
  rejected: { 
    label: "Niet voor mij", 
    color: "bg-muted text-muted-foreground border-border", 
    icon: X 
  },
} as const;

/**
 * Status sort order for displaying projects
 * Lower number = higher priority (shown first)
 */
export const statusSortOrder: Record<string, number> = {
  to_visit: 1,
  interested: 2,
  suggested: 3,
  visited: 4,
  rejected: 5,
};

export type SelectionStatus = keyof typeof statusConfig;

/**
 * Check if a project is sold out — handles both 'sold_out' and 'sold' statuses
 */
export function isProjectSoldOut(project: { status?: string | null }): boolean {
  return project.status === 'sold_out' || project.status === 'sold';
}

// Re-export formatPrice from central utils
export { formatPrice } from './utils';
