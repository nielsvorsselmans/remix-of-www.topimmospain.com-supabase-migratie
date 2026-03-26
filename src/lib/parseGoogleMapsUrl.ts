/**
 * Parse a Google Maps URL and extract latitude/longitude coordinates
 * Supports various URL formats from Google Maps
 */
export function parseGoogleMapsUrl(url: string): { lat: number; lng: number } | null {
  if (!url) return null;

  try {
    // Pattern 1: /@37.8234,-0.6987, (from URL path)
    const pattern1 = /@(-?\d+\.?\d*),(-?\d+\.?\d*)/;
    const match1 = url.match(pattern1);
    if (match1) {
      return { lat: parseFloat(match1[1]), lng: parseFloat(match1[2]) };
    }

    // Pattern 2: ?q=37.8234,-0.6987 (query parameter)
    const pattern2 = /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
    const match2 = url.match(pattern2);
    if (match2) {
      return { lat: parseFloat(match2[1]), lng: parseFloat(match2[2]) };
    }

    // Pattern 3: ?ll=37.8234,-0.6987 (legacy parameter)
    const pattern3 = /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
    const match3 = url.match(pattern3);
    if (match3) {
      return { lat: parseFloat(match3[1]), lng: parseFloat(match3[2]) };
    }

    // Pattern 4: /place/37.8234,-0.6987 (place coordinates)
    const pattern4 = /\/place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/;
    const match4 = url.match(pattern4);
    if (match4) {
      return { lat: parseFloat(match4[1]), lng: parseFloat(match4[2]) };
    }

    // Pattern 5: !3d37.8234!4d-0.6987 (embedded coordinates)
    const pattern5 = /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/;
    const match5 = url.match(pattern5);
    if (match5) {
      return { lat: parseFloat(match5[1]), lng: parseFloat(match5[2]) };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract Place ID from a Google Maps URL
 * Supports various URL formats including share links and embedded URLs
 */
export function extractPlaceIdFromUrl(url: string): string | null {
  if (!url) return null;

  try {
    // Pattern 1: place_id= query parameter
    const placeIdParam = /[?&]place_id=([^&]+)/;
    const match1 = url.match(placeIdParam);
    if (match1) {
      return decodeURIComponent(match1[1]);
    }

    // Pattern 2: /place/ChIJ... format (Place ID directly in path)
    // Place IDs start with "ChIJ" and are 27+ characters
    const placeInPath = /\/place\/([A-Za-z0-9_-]{20,})/;
    const match2 = url.match(placeInPath);
    if (match2 && match2[1].startsWith('ChIJ')) {
      return match2[1];
    }

    // Pattern 3: !1s{PLACE_ID}! format (embedded in URL data)
    const embeddedPlaceId = /!1s(ChIJ[A-Za-z0-9_-]+)!/;
    const match3 = url.match(embeddedPlaceId);
    if (match3) {
      return match3[1];
    }

    // Pattern 4: data=...!3m1!1s{PLACE_ID} format
    const dataPlaceId = /!1s(ChIJ[A-Za-z0-9_-]+)/;
    const match4 = url.match(dataPlaceId);
    if (match4) {
      return match4[1];
    }

    // Pattern 5: ftid=0x... format (legacy format, needs conversion)
    // Note: This is a Feature ID, not directly usable as Place ID
    // We'll skip this as it requires an API call to convert

    // Pattern 6: ?cid=12345678901234567890 format (CID - Customer ID)
    // Note: CIDs need special handling via the Places API
    // We'll return null and handle via text search instead

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract place name from a Google Maps URL for text search fallback
 */
export function extractPlaceNameFromUrl(url: string): string | null {
  if (!url) return null;

  try {
    // Pattern 1: /place/Name+With+Pluses/ format
    const placeNamePattern = /\/place\/([^/@]+)/;
    const match1 = url.match(placeNamePattern);
    if (match1) {
      // Decode URL encoding and replace + with spaces
      const name = decodeURIComponent(match1[1]).replace(/\+/g, ' ');
      // Skip if it looks like coordinates or a place ID
      if (!name.match(/^-?\d/) && !name.startsWith('ChIJ')) {
        return name;
      }
    }

    // Pattern 2: ?q=search+query format
    const queryPattern = /[?&]q=([^&@]+)/;
    const match2 = url.match(queryPattern);
    if (match2) {
      const query = decodeURIComponent(match2[1]).replace(/\+/g, ' ');
      // Skip if it looks like coordinates
      if (!query.match(/^-?\d+\.?\d*,\s*-?\d+\.?\d*$/)) {
        return query;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Analyze a Google Maps URL and determine the best extraction method
 */
export function analyzeGoogleMapsUrl(url: string): {
  hasPlaceId: boolean;
  placeId: string | null;
  hasCoordinates: boolean;
  coordinates: { lat: number; lng: number } | null;
  placeName: string | null;
  suggestedMethod: 'place_id' | 'coordinates' | 'search' | 'unknown';
} {
  const placeId = extractPlaceIdFromUrl(url);
  const coordinates = parseGoogleMapsUrl(url);
  const placeName = extractPlaceNameFromUrl(url);

  let suggestedMethod: 'place_id' | 'coordinates' | 'search' | 'unknown' = 'unknown';
  
  if (placeId) {
    suggestedMethod = 'place_id';
  } else if (placeName) {
    suggestedMethod = 'search';
  } else if (coordinates) {
    suggestedMethod = 'coordinates';
  }

  return {
    hasPlaceId: !!placeId,
    placeId,
    hasCoordinates: !!coordinates,
    coordinates,
    placeName,
    suggestedMethod,
  };
}

/**
 * Generate a Google Maps URL from coordinates
 */
export function generateGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
