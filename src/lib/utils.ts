import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, decimals: number = 2): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

// Short date: "25 jan 2026"
export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

// Long date: "25 januari 2026"
export function formatDateLong(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

// Date with time: "25 jan 2026, 14:30"
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatPrice(price: number | null, fallback: string = "N/A"): string {
  if (price === null || price === undefined) return fallback;
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function translatePropertyType(type: string): string {
  const translations: Record<string, string> = {
    'apartment': 'Appartement',
    'townhouse': 'Rijwoning',
    'town house': 'Rijwoning',
    'villa': 'Villa',
    'penthouse': 'Penthouse',
    'bungalow': 'Bungalow',
    'duplex': 'Duplex',
    'studio': 'Studio',
    'house': 'Huis',
    'detached': 'Vrijstaand',
    'semi-detached': 'Halfvrijstaand',
    'semi detached': 'Halfvrijstaand',
    'semidetached': 'Halfvrijstaand',
    'ground floor apartment': 'Begane grond appartement',
    'ground floor bungalow': 'Begane grond bungalow',
    'top floor bungalow': 'Bovenverdieping bungalow',
    'quad': 'Hoekwoning',
    'semi penthouse': 'Semi-penthouse',
    'duplex penthouse': 'Duplex penthouse',
    'terraced': 'Tussenwoning',
    'finca': 'Finca',
    'country house': 'Landhuis',
  };
  
  const normalized = type.toLowerCase().trim();
  return translations[normalized] || type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
}

function pluralizePropertyType(type: string): string {
  const pluralMap: Record<string, string> = {
    'Appartement': 'Appartementen',
    'Rijwoning': 'Rijwoningen',
    'Villa': "Villa's",
    'Penthouse': 'Penthouses',
    'Bungalow': 'Bungalows',
    'Duplex': 'Duplexen',
    'Studio': "Studio's",
    'Huis': 'Huizen',
    'Vrijstaand': 'Vrijstaande woningen',
    'Halfvrijstaand': 'Halfvrijstaande woningen',
    'Begane grond appartement': 'Begane grond appartementen',
    'Begane grond bungalow': 'Begane grond bungalows',
    'Bovenverdieping bungalow': 'Bovenverdieping bungalows',
    'Hoekwoning': 'Hoekwoningen',
    'Semi-penthouse': 'Semi-penthouses',
    'Duplex penthouse': 'Duplex penthouses',
    'Tussenwoning': 'Tussenwoningen',
    'Finca': "Finca's",
    'Landhuis': 'Landhuizen',
  };
  
  return pluralMap[type] || `${type}s`;
}

export function generatePropertyTitle(propertyTypes: string[], city: string): string {
  const uniqueTypes = [...new Set(propertyTypes.map(t => translatePropertyType(t)))];
  
  if (uniqueTypes.length === 0 || !city) {
    return '';
  }
  
  if (uniqueTypes.length === 1) {
    return `${pluralizePropertyType(uniqueTypes[0])} in ${city}`;
  } else if (uniqueTypes.length === 2) {
    return `${pluralizePropertyType(uniqueTypes[0])} en ${pluralizePropertyType(uniqueTypes[1])} in ${city}`;
  } else {
    return `Diverse woningen in ${city}`;
  }
}

export function getOptimizedImageUrl(
  imageUrl: string | null | undefined,
  width: number,
  quality: number = 80
): string {
  if (!imageUrl) return '/placeholder.svg';
  
  // Check if it's a Supabase storage URL
  const isSupabaseUrl = imageUrl.includes('supabase.co/storage');
  
  if (!isSupabaseUrl) {
    // Return external URLs as-is
    return imageUrl;
  }
  
  // Add transformation parameters to Supabase URLs
  const separator = imageUrl.includes('?') ? '&' : '?';
  return `${imageUrl}${separator}width=${width}&quality=${quality}`;
}

interface PropertyWithPrice {
  price?: number | null;
  status?: string | null;
}

/**
 * Calculate effective price range from project and properties.
 * Falls back to property prices if project prices are null.
 */
export function calculateEffectivePriceRange(
  projectPriceFrom: number | null | undefined,
  projectPriceTo: number | null | undefined,
  properties: PropertyWithPrice[] = []
): { priceFrom: number | null; priceTo: number | null } {
  // Filter available properties with valid prices
  const availableWithPrice = properties.filter(
    p => p.status === 'available' && p.price != null
  );
  
  // Prioritize calculated prices from actual properties, fall back to static project values
  const effectivePriceFrom = availableWithPrice.length > 0 
    ? Math.min(...availableWithPrice.map(p => p.price!)) 
    : (projectPriceFrom ?? null);
  
  const effectivePriceTo = availableWithPrice.length > 0 
    ? Math.max(...availableWithPrice.map(p => p.price!)) 
    : (projectPriceTo ?? null);
  
  return { priceFrom: effectivePriceFrom, priceTo: effectivePriceTo };
}
