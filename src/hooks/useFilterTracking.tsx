import { useEffect, useRef } from "react";

const FILTER_STORAGE_KEY = 'viva_current_filters';
const LAST_TRACKED_FILTERS_KEY = 'viva_last_tracked_filters';

interface FilterState {
  search?: string;
  selectedCities?: string[];
  selectedRegions?: string[];
  selectedPropertyTypes?: string[];
  propertyType?: string;
  priceMin?: number;
  priceMax?: number;
  bedrooms?: number | string[];
  bathrooms?: number | string[];
  distances?: string[];
  availability?: string;
  hasPool?: string | null;
  hasSeaViews?: boolean;
  [key: string]: any;
}

/**
 * Hook to store current filter state for tracking on project_view
 * Filters are NOT tracked immediately - tracked when user views a project
 */
export const useFilterTracking = (filters: FilterState) => {
  const filtersRef = useRef<FilterState>(filters);

  useEffect(() => {
    const hasChanged = JSON.stringify(filters) !== JSON.stringify(filtersRef.current);
    
    if (hasChanged) {
      filtersRef.current = filters;
      
      // Check if there are actually active filters
      const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
        if (value === undefined || value === null || value === '') return false;
        if (Array.isArray(value) && value.length === 0) return false;
        return true;
      });

      // Store in sessionStorage (will be tracked on project_view)
      if (hasActiveFilters) {
        sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
      } else {
        sessionStorage.removeItem(FILTER_STORAGE_KEY);
      }
    }
  }, [filters]);
};

// Helper: Get current filters from storage
export const getCurrentFilters = (): FilterState | null => {
  try {
    const stored = sessionStorage.getItem(FILTER_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

// Alias for clarity - get stored filters for restoring on page mount
export const getStoredFilters = getCurrentFilters;

// Helper: Check if filters changed since last tracked
export const haveFiltersChangedSinceLastTrack = (): boolean => {
  try {
    const current = sessionStorage.getItem(FILTER_STORAGE_KEY);
    const lastTracked = sessionStorage.getItem(LAST_TRACKED_FILTERS_KEY);
    // Track if there are current filters AND they're different from last tracked
    return current !== null && current !== lastTracked;
  } catch {
    return false;
  }
};

// Helper: Mark current filters as tracked
export const markFiltersAsTracked = () => {
  try {
    const current = sessionStorage.getItem(FILTER_STORAGE_KEY);
    if (current) {
      sessionStorage.setItem(LAST_TRACKED_FILTERS_KEY, current);
    }
  } catch {
    // Ignore storage errors
  }
};
