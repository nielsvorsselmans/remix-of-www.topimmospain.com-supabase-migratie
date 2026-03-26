import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration - centralized for easy maintenance
const PDF_VERSION = 'v11-html2pdf';
const LOGO_URL = 'https://topimmo.lovable.app/logo-email.png';
const COMPANY_WEBSITE = 'www.topimmospain.com';
const COMPANY_EMAIL = 'info@topimmospain.com';
const COMPANY_PHONE = '+34 868 08 15 27';

// Categories that should use compact table layout
const COMPACT_CATEGORIES = ['Markten', 'Weekmarkten', 'Markets'];

// Category descriptions for splash pages
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'Restaurants': 'Onze favoriete plekken om te eten',
  'Cafés & Bars': 'Gezellige plekken voor koffie of een drankje',
  'Stranden': 'De mooiste stranden in de regio',
  'Winkels': 'Van lokale markten tot handige winkels',
  'Markten': 'Verse producten en lokale sfeer',
  'Weekmarkten': 'Verse producten en lokale sfeer',
  'Cultuur': 'Musea, monumenten en bezienswaardigheden',
  'Sport & Recreatie': 'Actief genieten van de omgeving',
  'Gezondheidszorg': 'Medische voorzieningen in de buurt',
  'Overig': 'Andere handige plekken',
};

interface TravelGuidePOI {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  municipality: string;
  region: string;
  google_rating: number | null;
  google_user_ratings_total: number | null;
  google_place_id: string | null;
  phone: string | null;
  website: string | null;
  opening_hours: string[] | null;
  latitude: number | null;
  longitude: number | null;
  is_recommended: boolean;
  travel_guide_categories: {
    id: string;
    name: string;
    icon: string;
    color: string;
  } | null;
  custom_note?: string;
  order_index?: number;
}

interface Guide {
  id: string;
  title: string;
  intro_text: string | null;
  municipality: string | null;
  region: string | null;
  crm_lead_id: string;
  crm_leads: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
  customer_travel_guide_pois: {
    poi_id: string;
    custom_note: string | null;
    order_index: number;
    travel_guide_pois: TravelGuidePOI;
  }[];
}

// ============================================
// FASE 1: Data-Condensatie (Openingstijden)
// ============================================

interface ParsedHours {
  day: string;
  dayIndex: number;
  hours: string;
  isClosed: boolean;
}

const DAY_NAMES_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_NAMES_NL = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
const DAY_NAMES_NL_FULL = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];

function parseOpeningHours(hours: string[]): ParsedHours[] {
  return hours.map(line => {
    // Extract day name and hours
    const parts = line.split(':');
    const dayPart = parts[0]?.trim() || '';
    const hoursPart = parts.slice(1).join(':').trim();
    
    // Find day index
    let dayIndex = DAY_NAMES_EN.findIndex(d => 
      dayPart.toLowerCase().includes(d.toLowerCase())
    );
    
    // Also check Dutch day names
    if (dayIndex === -1) {
      dayIndex = DAY_NAMES_NL_FULL.findIndex(d => 
        dayPart.toLowerCase().includes(d.toLowerCase())
      );
    }
    
    const isClosed = hoursPart.toLowerCase().includes('closed') || 
                     hoursPart.toLowerCase().includes('gesloten') ||
                     hoursPart.trim() === '';
    
    return {
      day: dayPart,
      dayIndex: dayIndex >= 0 ? dayIndex : 0,
      hours: hoursPart,
      isClosed
    };
  }).sort((a, b) => a.dayIndex - b.dayIndex);
}

function formatOpeningHoursCondensed(hours: string[] | null): string {
  if (!hours || hours.length === 0) return '';
  
  const parsed = parseOpeningHours(hours);
  if (parsed.length === 0) return '';
  
  // Extract just the time portion (normalize format)
  const normalizeTime = (h: string): string => {
    return h.replace(/^[A-Za-z]+:\s*/, '')
            .replace(/\s*–\s*/g, ' - ')
            .replace(/\s*-\s*/g, ' - ')
            .trim();
  };
  
  // Count unique time patterns
  const timePatterns = new Map<string, number[]>();
  const closedDays: number[] = [];
  
  parsed.forEach(p => {
    if (p.isClosed) {
      closedDays.push(p.dayIndex);
    } else {
      const normalizedHours = normalizeTime(p.hours);
      if (!timePatterns.has(normalizedHours)) {
        timePatterns.set(normalizedHours, []);
      }
      timePatterns.get(normalizedHours)!.push(p.dayIndex);
    }
  });
  
  // Helper to build result with length check
  const buildResult = (): string => {
    // If all 7 days have the same hours
    if (timePatterns.size === 1 && closedDays.length === 0) {
      const [time] = timePatterns.keys();
      return `Dagelijks ${time}`;
    }
    
    // If 5+ days have same hours (common pattern)
    const mainPattern = Array.from(timePatterns.entries())
      .sort((a, b) => b[1].length - a[1].length)[0];
    
    if (mainPattern && mainPattern[1].length >= 5) {
      const time = mainPattern[0];
      const closedDayNames = closedDays.map(i => DAY_NAMES_NL[i]).join(', ');
      
      if (closedDays.length === 1) {
        return `Dagelijks ${time} (${closedDayNames} gesl.)`;
      } else if (closedDays.length === 2) {
        return `Dagelijks ${time} (${closedDayNames} gesl.)`;
      }
      return `Dagelijks ${time}`;
    }
    
    // Check for weekday/weekend pattern
    const weekdayPattern = parsed.filter(p => p.dayIndex >= 0 && p.dayIndex <= 4 && !p.isClosed);
    const weekendPattern = parsed.filter(p => p.dayIndex >= 5 && p.dayIndex <= 6 && !p.isClosed);
    
    if (weekdayPattern.length >= 4 && weekendPattern.length >= 1) {
      const weekdayTimes = new Set(weekdayPattern.map(p => normalizeTime(p.hours)));
      const weekendTimes = new Set(weekendPattern.map(p => normalizeTime(p.hours)));
      
      if (weekdayTimes.size === 1 && weekendTimes.size === 1) {
        const wdTime = Array.from(weekdayTimes)[0];
        const weTime = Array.from(weekendTimes)[0];
        
        if (wdTime === weTime) {
          const closedDayNames = closedDays.map(i => DAY_NAMES_NL[i]).join(', ');
          return closedDays.length > 0 
            ? `Ma-Zo ${wdTime} (${closedDayNames} gesl.)`
            : `Dagelijks ${wdTime}`;
        }
        return `Ma-Vr ${wdTime} | Za-Zo ${weTime}`;
      }
    }
    
    // Fallback: find consecutive day ranges with same hours
    const resultParts: string[] = [];
    
    interface DayRange { start: number; end: number; hours: string; }
    let currentRange: DayRange | null = null;
    
    const pushRange = (r: DayRange) => {
      if (r.start === r.end) {
        resultParts.push(`${DAY_NAMES_NL[r.start]} ${r.hours}`);
      } else {
        resultParts.push(`${DAY_NAMES_NL[r.start]}-${DAY_NAMES_NL[r.end]} ${r.hours}`);
      }
    };
    
    parsed.forEach(p => {
      if (p.isClosed) return;
      
      const normalizedHours = normalizeTime(p.hours);
      
      if (!currentRange) {
        currentRange = { start: p.dayIndex, end: p.dayIndex, hours: normalizedHours };
      } else if (currentRange.hours === normalizedHours && p.dayIndex === currentRange.end + 1) {
        currentRange.end = p.dayIndex;
      } else {
        pushRange(currentRange);
        currentRange = { start: p.dayIndex, end: p.dayIndex, hours: normalizedHours };
      }
    });
    
    if (currentRange) {
      pushRange(currentRange);
    }
    
    // Add closed days if any
    if (closedDays.length > 0 && closedDays.length <= 2) {
      const closedStr = closedDays.map(i => DAY_NAMES_NL[i]).join(', ');
      return `${resultParts.join(' | ')} (${closedStr} gesl.)`;
    }
    
    return resultParts.join(' | ');
  };
  
  let result = buildResult();
  
  // FASE 4: Maximum length check - if too long, simplify
  if (result.length > 45) {
    const allOpen = parsed.filter(p => !p.isClosed);
    if (allOpen.length >= 5) {
      return `${allOpen.length} dagen/week open`;
    } else if (allOpen.length > 0) {
      return 'Zie website';
    }
  }
  
  return result;
}

// Smart Google Maps URL - uses Place ID when available for full business page
function generateGoogleMapsUrl(
  lat: number, 
  lng: number, 
  placeId?: string | null
): string {
  if (placeId) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${placeId}`;
  }
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function formatRating(rating: number | null): string {
  if (!rating) return '';
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
  
  return '★'.repeat(fullStars) + (hasHalf ? '½' : '') + '☆'.repeat(emptyStars);
}

function getCategoryIcon(iconName: string): string {
  const iconMap: Record<string, string> = {
    'utensils': '🍽️',
    'coffee': '☕',
    'wine': '🍷',
    'beer': '🍺',
    'ice-cream': '🍦',
    'shopping-bag': '🛍️',
    'store': '🏪',
    'building': '🏢',
    'landmark': '🏛️',
    'church': '⛪',
    'hospital': '🏥',
    'stethoscope': '🩺',
    'dumbbell': '🏋️',
    'waves': '🏖️',
    'umbrella-beach': '⛱️',
    'mountain': '⛰️',
    'tree': '🌳',
    'palmtree': '🌴',
    'golf': '⛳',
    'tennis': '🎾',
    'music': '🎵',
    'film': '🎬',
    'theater-masks': '🎭',
    'plane': '✈️',
    'car': '🚗',
    'bus': '🚌',
    'train': '🚂',
    'anchor': '⚓',
    'ship': '🚢',
    'default': '📍',
  };
  return iconMap[iconName] || iconMap['default'];
}

function isCategoryCompact(categoryName: string): boolean {
  return COMPACT_CATEGORIES.some(c => 
    categoryName.toLowerCase().includes(c.toLowerCase())
  );
}

// FASE 6+7: Day patterns voor marktdag extractie en naam cleanup (incl. Spaans)
const DAY_PATTERNS = [
  // Nederlands
  { pattern: /zaterdag/i, day: 'Zaterdag' },
  { pattern: /zondag/i, day: 'Zondag' },
  { pattern: /maandag/i, day: 'Maandag' },
  { pattern: /dinsdag/i, day: 'Dinsdag' },
  { pattern: /woensdag/i, day: 'Woensdag' },
  { pattern: /donderdag/i, day: 'Donderdag' },
  { pattern: /vrijdag/i, day: 'Vrijdag' },
  // Engels
  { pattern: /saturday/i, day: 'Zaterdag' },
  { pattern: /sunday/i, day: 'Zondag' },
  { pattern: /monday/i, day: 'Maandag' },
  { pattern: /tuesday/i, day: 'Dinsdag' },
  { pattern: /wednesday/i, day: 'Woensdag' },
  { pattern: /thursday/i, day: 'Donderdag' },
  { pattern: /friday/i, day: 'Vrijdag' },
  // Spaans
  { pattern: /sábado/i, day: 'Zaterdag' },
  { pattern: /domingo/i, day: 'Zondag' },
  { pattern: /lunes/i, day: 'Maandag' },
  { pattern: /martes/i, day: 'Dinsdag' },
  { pattern: /miércoles/i, day: 'Woensdag' },
  { pattern: /jueves/i, day: 'Donderdag' },
  { pattern: /viernes/i, day: 'Vrijdag' },
];

// v7: Normaliseer hoofdletters voor consistente namen
function normalizeCapitalization(name: string): string {
  const lowercaseWords = ['del', 'de', 'la', 'el', 'los', 'las', 'y', 'e'];
  return name.split(' ')
    .map((word, index) => {
      if (!word) return '';
      const lower = word.toLowerCase();
      // Artikels en voorzetsels altijd lowercase (behalve aan begin)
      if (index > 0 && lowercaseWords.includes(lower)) {
        return lower;
      }
      // Normale woorden: eerste letter kapitaal, rest lowercase
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .filter(Boolean)
    .join(' ');
}

// v7: Clean market name - verwijder dag-woorden uit de naam (NL, EN, ES)
function cleanMarketName(name: string): string {
  let cleaned = name;
  // Verwijder dag-woorden (EN) met optionele komma/punt ervoor
  cleaned = cleaned.replace(/[,.\s]*(saturday|sunday|monday|tuesday|wednesday|thursday|friday)/gi, '');
  // Verwijder dag-woorden (NL)
  cleaned = cleaned.replace(/[,.\s]*(zaterdag|zondag|maandag|dinsdag|woensdag|donderdag|vrijdag)/gi, '');
  // Verwijder dag-woorden (ES)
  cleaned = cleaned.replace(/[,.\s]*(sábado|domingo|lunes|martes|miércoles|jueves|viernes)/gi, '');
  // Verwijder tijdsaanduidingen (ES, EN)
  cleaned = cleaned.replace(/[,.\s]*(mañana|tarde|morning|afternoon|evening)/gi, '');
  // Verwijder dubbele spaties en trim
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  // Verwijder trailing komma's of punten
  cleaned = cleaned.replace(/[,.\s]+$/, '');
  // Normaliseer hoofdletters voor consistente weergave
  return normalizeCapitalization(cleaned);
}

// FASE 6: Helper om marktdag uit POI te extraheren
function extractMarketDay(poi: TravelGuidePOI): string {
  // Probeer de dag uit de naam te halen
  for (const { pattern, day } of DAY_PATTERNS) {
    if (pattern.test(poi.name) || pattern.test(poi.description || '')) {
      return day;
    }
  }
  
  // Fallback: probeer uit opening_hours
  if (poi.opening_hours?.length) {
    for (const hour of poi.opening_hours) {
      for (const { pattern, day } of DAY_PATTERNS) {
        if (pattern.test(hour)) return day;
      }
    }
  }
  
  return 'Wekelijks';
}

// ============================================
// HTML Generation
// ============================================

function generateHTML(guide: Guide): string {
  const customerName = [guide.crm_leads?.first_name, guide.crm_leads?.last_name]
    .filter(Boolean)
    .join(' ') || 'Geachte klant';
  
  const firstName = guide.crm_leads?.first_name || 'klant';
  // Dynamic location: derive from unique POI regions when guide fields are generic
  const uniqueRegions = [...new Set(
    guide.customer_travel_guide_pois
      .map(item => item.travel_guide_pois?.region)
      .filter(Boolean)
  )];
  const location = guide.municipality 
    || (uniqueRegions.length === 1 ? uniqueRegions[0] : null)
    || (uniqueRegions.length > 1 ? uniqueRegions.join(' & ') : null)
    || guide.region 
    || 'Spanje';
  const today = new Date().toLocaleDateString('nl-NL', { 
    year: 'numeric', 
    month: 'long' 
  });

  // Group POIs by category
  const poisByCategory = new Map<string, { 
    pois: (TravelGuidePOI & { custom_note?: string })[];
    icon: string;
    categoryData: TravelGuidePOI['travel_guide_categories'];
  }>();
  
  guide.customer_travel_guide_pois
    .sort((a, b) => a.order_index - b.order_index)
    .forEach(item => {
      const poi = { ...item.travel_guide_pois, custom_note: item.custom_note || undefined };
      const categoryName = poi.travel_guide_categories?.name || 'Overig';
      const categoryIcon = poi.travel_guide_categories?.icon 
        ? getCategoryIcon(poi.travel_guide_categories.icon)
        : '📍';
      
      if (!poisByCategory.has(categoryName)) {
        poisByCategory.set(categoryName, {
          pois: [],
          icon: categoryIcon,
          categoryData: poi.travel_guide_categories
        });
      }
      poisByCategory.get(categoryName)!.pois.push(poi);
    });

  // Generate category sections
  let categorySections = '';
  let isFirstCategory = true;
  
  poisByCategory.forEach((categoryData, categoryName) => {
    const { pois, icon } = categoryData;
    const description = CATEGORY_DESCRIPTIONS[categoryName] || '';
    const isCompact = isCategoryCompact(categoryName);
    const isSmallCategory = pois.length <= 2;
    
    // v9: Small categories use inline header instead of full splash page
    if (isSmallCategory) {
      categorySections += `<div class="category-wrapper category-wrapper-compact">`;
      categorySections += `
        <div class="category-inline-header">
          <span class="inline-icon">${icon}</span>
          <h2 class="inline-title">${categoryName.toUpperCase().replace(/IJ/g, 'Ĳ')}</h2>
          ${description ? `<span class="inline-description">— ${description}</span>` : ''}
        </div>
      `;
    } else {
      // v8: Category wrapper houdt splash + content samen
      categorySections += `<div class="category-wrapper">`;
      
      // Category splash header - v9: IJ ligature fix
      categorySections += `
        <div class="category-splash">
          <div class="splash-icon">${icon}</div>
          <h2 class="splash-title">${categoryName.toUpperCase().replace(/IJ/g, 'Ĳ')}</h2>
          ${description ? `<p class="splash-description">${description}</p>` : ''}
          <div class="splash-divider">═══════════════════════════════════════</div>
        </div>
      `;
    }
    
    if (isCompact) {
      // FASE 7: Market list layout met schone data (geen verkeerde uren)
      categorySections += `
        <div class="category-section">
          <div class="market-list">
            ${pois.map(poi => {
              const dayOfWeek = extractMarketDay(poi);
              const cleanedName = cleanMarketName(poi.name);
              // v7: Markten hebben geen betrouwbare uren - toon "Zie lokale info"
              const displayHours = 'Zie lokale info';
              return `
                <div class="market-item">
                  <span class="market-day">🗓️ ${dayOfWeek}</span>
                  <span class="market-name">${cleanedName}</span>
                  <span class="market-hours">${displayHours}</span>
                  ${poi.latitude && poi.longitude ? `
                    <a href="${generateGoogleMapsUrl(poi.latitude, poi.longitude, poi.google_place_id)}" target="_blank" class="maps-button-small">📍</a>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    } else {
      // Regular card layout
      const featuredPoi = pois.find(p => p.is_recommended);
      const otherPois = pois.filter(p => p !== featuredPoi);
      
      categorySections += `
        <div class="category-section">
          <div class="pois-grid">
            ${featuredPoi ? generatePoiCard(featuredPoi, true) : ''}
            ${otherPois.map(poi => generatePoiCard(poi, false)).join('')}
          </div>
        </div>
      `;
    }
    
    // v8: Sluit category wrapper
    categorySections += `</div>`;
    
    isFirstCategory = false;
  });

  // Generate dynamic title for PDF filename
  const pdfTitle = `Reisgids ${location} - ${customerName}`;

  return `
    <!DOCTYPE html>
    <html lang="nl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${pdfTitle}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        
        :root {
          /* FASE 1: Blauw kleurenschema */
          --primary-color: #2a7fba;
          --primary-dark: #1e5f8a;
          --accent-color: #2a7fba;  /* Was: #c9a962 (goud) */
          --accent-light: rgba(42, 127, 186, 0.15);  /* Was: #e8d9b0 */
          --text-dark: #1e3a5f;
          --text-medium: #4a5568;
          --text-light: #718096;
          --border-light: #e2e8f0;
          --white: #ffffff;
          --featured-bg: rgba(42, 127, 186, 0.06);  /* Was: gold-based */
          
          /* Typography */
          --font-serif: 'Playfair Display', Georgia, serif;
          --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        @page {
          size: A4;
          margin: 0;
        }
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: var(--font-sans);
          line-height: 1.6;
          color: var(--text-dark);
          background: var(--white);
          font-size: 10pt;
        }
        
        /* PDF generation status banner */
        .pdf-status {
          background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
          color: white;
          padding: 16px 24px;
          text-align: center;
          font-size: 14px;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        @media print {
          .pdf-status { display: none; }
        }
        
        /* ========== COVER PAGE (Fase 4) ========== */
        .cover {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          padding: 40px;
          background: var(--white);
          page-break-after: always;
        }
        
        /* FASE 2: Afgeronde hoeken */
        .cover-frame {
          border: 3px solid var(--accent-color);
          border-radius: 16px;  /* Was: 4px */
          padding: 50px 40px;
          width: 100%;
          max-width: 160mm;
        }
        
        .cover-logo {
          width: 160px;
          margin-bottom: 30px;
        }
        
        .cover-decoration {
          font-size: 14pt;
          color: var(--accent-color);
          margin-bottom: 40px;
          letter-spacing: 8px;
        }
        
        .cover h1 {
          font-family: var(--font-serif);
          font-size: 36pt;
          font-weight: 600;
          color: var(--primary-color);
          margin-bottom: 10px;
          line-height: 1.1;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
        
        .cover .subtitle {
          font-family: var(--font-serif);
          font-size: 18pt;
          font-style: italic;
          color: var(--text-medium);
          margin-bottom: 50px;
        }
        
        .cover .customer-box {
          background: var(--white);
          border: 2px solid var(--accent-color);
          border-radius: 12px;  /* FASE 2: Was geen border-radius */
          padding: 20px 40px;
          margin: 0 auto 40px;
          display: inline-block;
        }
        
        .cover .customer-label {
          font-size: 9pt;
          color: var(--text-light);
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 6px;
        }
        
        .cover .customer-name {
          font-family: var(--font-serif);
          font-size: 18pt;
          font-weight: 600;
          color: var(--text-dark);
        }
        
        .cover .date {
          font-size: 11pt;
          color: var(--text-medium);
          margin-bottom: 30px;
        }
        
        .cover-footer {
          font-size: 10pt;
          color: var(--text-light);
        }
        
        .cover-footer a {
          color: var(--primary-color);
          text-decoration: none;
        }
        
        /* ========== INTRO PAGE (Fase 5 + v7 fix) ========== */
        .welcome-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 30px 50px 30px;
          page-break-after: always;
          background: var(--white);
          break-inside: avoid;
          box-sizing: border-box;
        }
        
        /* FASE 3: Teamfoto styling */
        .team-photo-container {
          text-align: center;
          margin-bottom: 20px;
        }
        
        .team-photo {
          width: 140px;
          height: 140px;
          border-radius: 50%;
          object-fit: cover;
          border: 4px solid var(--accent-color);
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }
        
        .signature-block {
          text-align: center;
          margin-bottom: 24px;
          padding: 20px;
        }
        
        .signature-name {
          font-family: var(--font-serif);
          font-size: 16pt;
          font-weight: 600;
          color: var(--primary-color);
          margin-bottom: 4px;
        }
        
        .signature-title {
          font-size: 10pt;
          color: var(--text-light);
          font-style: italic;
        }
        
        .welcome-header {
          text-align: center;
          margin-bottom: 24px;
        }
        
        .welcome-header h2 {
          font-family: var(--font-serif);
          font-size: 20pt;
          color: var(--primary-color);
          margin-bottom: 8px;
        }
        
        .welcome-underline {
          width: 80px;
          height: 3px;
          background: var(--accent-color);
          margin: 0 auto;
        }
        
        .welcome-content {
          max-width: 500px;
          margin: 0 auto;
        }
        
        .welcome-greeting {
          font-family: var(--font-serif);
          font-size: 12pt;
          color: var(--text-dark);
          margin-bottom: 10px;
        }
        
        .welcome-text {
          font-size: 10pt;
          line-height: 1.5;
          color: var(--text-medium);
          margin-bottom: 10px;
        }
        
        .welcome-signature {
          font-size: 11pt;
          color: var(--text-medium);
          margin-bottom: 20px;
        }
        
        /* v6: Gestileerde handtekening */
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@500;600&display=swap');
        
        .signature-styled {
          font-family: 'Dancing Script', cursive;
          font-size: 18pt;
          font-weight: 600;
          color: var(--primary-color);
          margin-bottom: 20px;
          letter-spacing: 1px;
        }
        
        /* ========== CATEGORY WRAPPER (v9) ========== */
        .category-wrapper {
          break-before: page;
          break-inside: auto;
        }
        
        /* v9: Compact wrapper for small categories (≤2 items) */
        .category-wrapper-compact {
          break-before: auto;
        }
        
        .category-splash {
          text-align: center;
          padding: 50px 30px 30px;
          break-after: avoid;
        }
        
        .category-section {
          break-before: avoid;
        }
        
        .pois-grid .poi-card:nth-child(-n+2) {
          break-before: avoid;
        }
        
        .splash-icon {
          font-size: 40pt;
          margin-bottom: 16px;
        }
        
        .splash-title {
          font-family: var(--font-serif);
          font-size: 22pt;
          font-weight: 600;
          color: var(--text-dark);
          margin-bottom: 10px;
        }
        
        .splash-description {
          font-size: 11pt;
          font-style: italic;
          color: var(--text-medium);
          margin-bottom: 16px;
        }
        
        .splash-divider {
          font-size: 8pt;
          color: var(--accent-color);
          letter-spacing: 2px;
          overflow: hidden;
        }
        
        /* v9: Inline header for small categories */
        .category-inline-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 24px 40px 16px;
          border-bottom: 2px solid var(--accent-color);
          margin-bottom: 20px;
        }
        
        .inline-icon {
          font-size: 24pt;
        }
        
        .inline-title {
          font-family: var(--font-serif);
          font-size: 16pt;
          font-weight: 600;
          color: var(--text-dark);
        }
        
        .inline-description {
          font-size: 10pt;
          font-style: italic;
          color: var(--text-medium);
        }
        
        /* ========== CONTENT ========== */
        .content {
          padding: 10mm 40px 30px;
        }
        
        .category-section {
          margin-bottom: 30px;
        }
        
        .category-section:last-child {
          page-break-after: avoid;
        }
        
        .pois-grid {
          display: grid;
          gap: 20px;
        }
        
        /* ========== POI CARDS (Fase 2) ========== */
        .poi-card {
          padding: 24px;
          background: var(--white);
          border: 1px solid var(--border-light);
          border-radius: 16px;  /* FASE 2: Was 12px */
          page-break-inside: avoid;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        
        .poi-card.featured {
          border: 2px solid var(--accent-color);
          background: var(--featured-bg);
          position: relative;
        }
        
        /* FASE 1: Blauwe featured badge (was goud) */
        .featured-badge {
          position: absolute;
          top: -1px;
          right: 20px;
          background: linear-gradient(135deg, var(--primary-color), #3a9fd8);
          color: white;
          font-size: 8pt;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 0 0 8px 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .poi-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        
        .poi-header h3 {
          font-family: var(--font-serif);
          font-size: 14pt;
          font-weight: 600;
          color: var(--text-dark);
          flex: 1;
        }
        
        .poi-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }
        
        .tag {
          font-size: 8pt;
          padding: 4px 10px;
          border-radius: 12px;
          background: rgba(42, 127, 186, 0.1);
          color: var(--primary-color);
          font-weight: 500;
        }
        
        .rating {
          font-size: 10pt;
          color: #f59e0b;
        }
        
        .rating-count {
          font-size: 9pt;
          color: var(--text-light);
          margin-left: 4px;
        }
        
        /* FASE 1: Blauwe custom note styling (was goud) */
        .custom-note {
          background: linear-gradient(90deg, rgba(42, 127, 186, 0.10), rgba(42, 127, 186, 0.03));
          border-left: 3px solid var(--primary-color);
          padding: 14px 18px;
          border-radius: 0 12px 12px 0;  /* FASE 2 */
          margin-bottom: 16px;
        }
        
        .note-header {
          font-size: 9pt;
          font-weight: 600;
          color: var(--primary-color);
          margin-bottom: 4px;
        }
        
        .note-content {
          font-size: 10pt;
          font-style: italic;
          color: var(--text-medium);
          line-height: 1.5;
        }
        
        .poi-details {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 16px;
        }
        
        .detail-row {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 9pt;
          color: var(--text-medium);
        }
        
        .detail-icon {
          flex-shrink: 0;
          width: 16px;
          text-align: center;
        }
        
        .description {
          font-size: 10pt;
          color: var(--text-light);
          margin-bottom: 14px;
          line-height: 1.6;
        }
        
        /* ========== CARD FOOTER (Fase 7) ========== */
        .poi-footer {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          padding-top: 14px;
          border-top: 1px solid var(--border-light);
          font-size: 9pt;
          color: var(--text-light);
        }
        
        .poi-footer a {
          color: var(--primary-color);
          text-decoration: none;
        }
        
        .maps-button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: var(--primary-color);
          color: white !important;
          border-radius: 20px;
          font-size: 8pt;
          font-weight: 600;
          text-decoration: none !important;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-left: auto;
        }
        
        /* ========== COMPACT TABLE (Fase 6) ========== */
        .compact-section {
          padding: 20px 40px;
        }
        
        .compact-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10pt;
        }
        
        .compact-table th {
          text-align: left;
          padding: 12px 16px;
          background: rgba(42, 127, 186, 0.08);
          color: var(--text-dark);
          font-weight: 600;
          border-bottom: 2px solid var(--primary-color);
        }
        
        .compact-table td {
          padding: 14px 16px;
          border-bottom: 1px solid var(--border-light);
          vertical-align: top;
        }
        
        .compact-table tr:last-child td {
          border-bottom: none;
        }
        
        .table-address {
          font-size: 9pt;
          color: var(--text-light);
        }
        
        /* FASE 6: Market List Layout (vervangt kapotte tabel) */
        .market-list {
          padding: 20px 40px;
        }
        
        .market-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          background: var(--white);
          border: 1px solid var(--border-light);
          border-radius: 12px;
          margin-bottom: 12px;
          page-break-inside: avoid;
        }
        
        .market-item:last-child {
          margin-bottom: 0;
        }
        
        .market-day {
          flex-shrink: 0;
          font-size: 10pt;
          font-weight: 600;
          color: var(--primary-color);
          min-width: 100px;
        }
        
        .market-name {
          flex: 1;
          font-size: 10pt;
          font-weight: 500;
          color: var(--text-dark);
        }
        
        .market-hours {
          flex-shrink: 0;
          font-size: 9pt;
          color: var(--text-medium);
          min-width: 100px;
          text-align: right;
        }
        
        .maps-button-small {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: var(--primary-color);
          color: white !important;
          border-radius: 50%;
          font-size: 12pt;
          text-decoration: none !important;
          flex-shrink: 0;
        }
        
        /* ========== FOOTER SECTION (Back Page) ========== */
        .footer-section {
          break-before: page;
          min-height: calc(100vh - 20mm);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 60px 40px;
          background: var(--white);
          box-sizing: border-box;
        }
        
        /* FASE 2: Afgeronde hoeken footer frame */
        .footer-frame {
          border: 3px solid var(--accent-color);
          border-radius: 16px;  /* Was: 4px */
          padding: 50px 40px;
          text-align: center;
          max-width: 500px;
          width: 100%;
        }
        
        .footer-logo {
          width: 140px;
          margin-bottom: 30px;
        }
        
        .footer-section h2 {
          font-family: var(--font-serif);
          font-size: 18pt;
          color: var(--primary-color);
          margin-bottom: 12px;
        }
        
        .footer-section .footer-intro {
          font-size: 10pt;
          color: var(--text-medium);
          margin-bottom: 24px;
          max-width: 400px;
          margin-left: auto;
          margin-right: auto;
          line-height: 1.6;
        }
        
        .footer-contact-box {
          background: rgba(42, 127, 186, 0.05);
          padding: 20px 30px;
          border-radius: 12px;  /* FASE 2: Was 8px */
          display: inline-block;
        }
        
        .footer-contact-box div {
          font-size: 10pt;
          color: var(--text-medium);
          margin-bottom: 6px;
        }
        
        .footer-contact-box div:last-child {
          margin-bottom: 0;
        }
        
        .footer-contact-box a {
          color: var(--primary-color);
          text-decoration: none;
        }
        
        /* ========== PRINT STYLES ========== */
        @media print {
          .print-instruction {
            display: none !important;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          @page {
            margin: 0;
          }
          
          .cover {
            height: 100vh;
            margin: 0;
            padding: 40px;
          }
          
          /* v9: category-section mag splitten, individuele cards niet */
          .category-section {
            break-inside: auto;
          }
          
          .poi-card {
            break-inside: avoid;
          }
          
          /* v10: Only splash pages force new page, not the wrapper */
          .category-wrapper {
            break-before: auto;
            break-inside: auto;
          }
          
          /* v10: Compact categories flow naturally */
          .category-wrapper-compact {
            break-before: auto;
          }
          
          /* v10: Only the splash itself forces a page break */
          .category-splash {
            break-before: page;
            break-after: avoid;
          }
          
          .category-section {
            break-before: avoid;
          }
          
          .pois-grid .poi-card:nth-child(-n+2) {
            break-before: avoid;
          }
        }
        
        @media screen {
          body {
            padding-top: 60px;
          }
        }
      </style>
    </head>
    <body>
      <!-- Print instruction - screen only -->
      <div class="print-instruction">
        <strong>💡 Tip: Gebruik Ctrl+P (of Cmd+P op Mac) om dit document als PDF op te slaan</strong>
        Kies "Opslaan als PDF" · Stel marges in op "Geen" · Schakel "Kop- en voetteksten" UIT
      </div>
      
      <!-- Cover Page (Fase 4) -->
      <div class="cover">
        <div class="cover-frame">
          <img src="${LOGO_URL}" alt="Top Immo Spain" class="cover-logo" onerror="this.style.display='none'">
          
          <div class="cover-decoration">═══════◆═══════</div>
          
          <h1>Persoonlijke<br>Reisgids</h1>
          <p class="subtitle">${location}</p>
          
          <div class="customer-box">
            <div class="customer-label">Speciaal voor</div>
            <div class="customer-name">${customerName}</div>
          </div>
          
          <p class="date">${today}</p>
          
          <div class="cover-footer">
            <a href="https://${COMPANY_WEBSITE}">${COMPANY_WEBSITE}</a>
          </div>
        </div>
      </div>
      
      <!-- Welcome Page (Fase 5) - FASE 3: Met Teamfoto -->
      <div class="welcome-page">
        <!-- FASE 3: Teamfoto met fallback naar signature block -->
        <div class="team-photo-container">
          <img 
            src="https://topimmo.lovable.app/lovable-uploads/8ff5b591-1b66-439a-8f4f-879be0808f3a.jpg" 
            alt="Het Top Immo Spain Team"
            class="team-photo"
            onerror="this.parentElement.innerHTML='<div class=\\'signature-block\\'><div class=\\'signature-name\\'>Lars & Niels</div><div class=\\'signature-title\\'>Oprichters Top Immo Spain</div></div>'"
          >
        </div>
        
        <div class="welcome-header">
          <h2>Welkom in uw toekomstige 'thuis', ${firstName}</h2>
          <div class="welcome-underline"></div>
        </div>
        
        <div class="welcome-content">
          <p class="welcome-greeting">Beste ${firstName},</p>
          
          <p class="welcome-text">
            Welkom aan de ${location}! Fijn dat u er bent.
          </p>
          
          <p class="welcome-text">
            De komende dagen gaat u prachtige woningen bekijken, maar bij Top Immo weten 
            we dat u uiteindelijk meer koopt dan alleen stenen. U kiest voor een nieuwe 
            levensstijl. Voor ochtenden met de zon op uw gezicht, verse koffie op een 
            terras en avonden met een goed glas wijn.
          </p>
          
          <p class="welcome-text">
            Daarom hebben we deze gids niet gevuld met standaard toeristische tips, 
            maar met onze persoonlijke favorieten. Dit zijn de restaurants waar wij 
            zelf op vrijdagavond zitten, de markten waar wij ons fruit halen en de 
            verborgen plekjes waar we tot rust komen.
          </p>
          
          <p class="welcome-text">
            Gebruik deze dagen niet alleen om huizen te beoordelen, maar vooral om 
            te proeven van het leven hier. Wij staan klaar om u te begeleiden bij 
            elke stap, zodat u zich hier direct thuis voelt.
          </p>
          
          <p class="welcome-text" style="font-style: italic;">Geniet van het ontdekken!</p>
          
          <p class="welcome-signature">Met warme groet,</p>
          
          <p class="signature-styled">Lars, Niels & het Top Immo Team</p>
          
        </div>
      </div>
      
      ${guide.intro_text ? `
        <!-- Custom Introduction Page -->
        <div class="welcome-page">
          <div class="welcome-header">
            <h2>Persoonlijke Introductie</h2>
            <div class="welcome-underline"></div>
          </div>
          <div class="welcome-content">
            <p class="welcome-text" style="white-space: pre-wrap;">${guide.intro_text}</p>
          </div>
        </div>
      ` : ''}
      
      <!-- Content -->
      <div class="content">
        ${categorySections}
      </div>
      
      <!-- Back Page -->
      <div class="footer-section">
        <div class="footer-frame">
          <img src="${LOGO_URL}" alt="Top Immo Spain" class="footer-logo" onerror="this.style.display='none'">
          <h2>Vragen of hulp nodig?</h2>
          <p class="footer-intro">
            We helpen u graag bij het ontdekken van uw nieuwe omgeving. 
            Neem gerust contact met ons op voor meer informatie of persoonlijk advies.
          </p>
          <div class="footer-contact-box">
            <div>📧 <a href="mailto:${COMPANY_EMAIL}">${COMPANY_EMAIL}</a></div>
            <div>📞 ${COMPANY_PHONE}</div>
            <div>🌐 <a href="https://${COMPANY_WEBSITE}">${COMPANY_WEBSITE}</a></div>
          </div>
        </div>
      </div>
      
      <!-- Status Banner -->
      <div class="pdf-status" id="pdfStatus">
        ⏳ PDF wordt gegenereerd... Even geduld.
      </div>
      
      <!-- html2pdf.js auto-download -->
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js"></script>
      <script>
        window.addEventListener('load', function() {
          // Wait for fonts to load
          document.fonts.ready.then(function() {
            var statusEl = document.getElementById('pdfStatus');
            statusEl.style.display = 'block';
            
            // Hide status banner from PDF
            var opt = {
              margin: 0,
              filename: '${pdfTitle.replace(/'/g, "\\'")}.pdf',
              image: { type: 'jpeg', quality: 0.95 },
              html2canvas: { 
                scale: 2, 
                useCORS: true, 
                letterRendering: true,
                logging: false
              },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
              pagebreak: { mode: ['css', 'legacy'], avoid: ['.poi-card', '.custom-note'] }
            };
            
            // Hide status from PDF content
            statusEl.style.display = 'none';
            
            html2pdf().set(opt).from(document.body).save().then(function() {
              // Show success message
              statusEl.innerHTML = '✅ PDF is gedownload! U kunt dit venster sluiten.';
              statusEl.style.display = 'block';
              statusEl.style.background = '#16a34a';
            }).catch(function(err) {
              console.error('PDF generation error:', err);
              statusEl.innerHTML = '❌ Er ging iets mis. Gebruik Ctrl+P om handmatig op te slaan als PDF.';
              statusEl.style.display = 'block';
              statusEl.style.background = '#dc2626';
            });
          });
        });
      </script>
    </body>
    </html>
  `;
}

function generatePoiCard(poi: TravelGuidePOI & { custom_note?: string }, isFeatured: boolean): string {
  const condensedHours = formatOpeningHoursCondensed(poi.opening_hours);
  
  // Extract website domain for display
  let websiteDomain = '';
  if (poi.website) {
    try {
      websiteDomain = new URL(poi.website).hostname.replace('www.', '');
    } catch {
      websiteDomain = poi.website;
    }
  }
  
  return `
    <div class="poi-card ${isFeatured ? 'featured' : ''}">
      ${isFeatured ? '<div class="featured-badge">⭐ Top Immo Favoriet</div>' : ''}
      
      <div class="poi-header">
        <h3>${poi.name}</h3>
      </div>
      
      <div class="poi-meta">
        ${poi.google_rating ? `
          <span class="rating">
            ${formatRating(poi.google_rating)} ${poi.google_rating.toFixed(1)}
            ${poi.google_user_ratings_total ? `<span class="rating-count">(${poi.google_user_ratings_total.toLocaleString('nl-NL')} reviews)</span>` : ''}
          </span>
        ` : ''}
      </div>
      
      ${poi.custom_note ? `
        <div class="custom-note">
          <div class="note-header">💡 Persoonlijke tip</div>
          <div class="note-content">"${poi.custom_note}"</div>
        </div>
      ` : ''}
      
      ${poi.description ? `<p class="description">${poi.description}</p>` : ''}
      
      <div class="poi-details">
        ${poi.address ? `
          <div class="detail-row">
            <span class="detail-icon">📍</span>
            <span>${poi.address}</span>
          </div>
        ` : ''}
        ${condensedHours ? `
          <div class="detail-row">
            <span class="detail-icon">🕒</span>
            <span>${condensedHours}</span>
          </div>
        ` : ''}
      </div>
      
      <div class="poi-footer">
        ${poi.phone ? `<span>📞 ${poi.phone}</span>` : ''}
        ${poi.website ? `<span>🌐 <a href="${poi.website}" target="_blank">${websiteDomain}</a></span>` : ''}
        ${poi.latitude && poi.longitude ? `
          <a href="${generateGoogleMapsUrl(poi.latitude, poi.longitude, poi.google_place_id)}" target="_blank" class="maps-button">
            📍 NAVIGEER
          </a>
        ` : ''}
      </div>
    </div>
  `;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { guideId } = await req.json();

    if (!guideId) {
      return new Response(
        JSON.stringify({ error: 'guideId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${PDF_VERSION}] Generating travel guide PDF for:`, guideId);

    // Fetch guide with all related data including google_place_id
    const { data: guide, error: guideError } = await supabase
      .from('customer_travel_guides')
      .select(`
        *,
        crm_leads(first_name, last_name, email),
        customer_travel_guide_pois(
          poi_id,
          custom_note,
          order_index,
          travel_guide_pois(
            *,
            travel_guide_categories(*)
          )
        )
      `)
      .eq('id', guideId)
      .single();

    if (guideError || !guide) {
      console.error('Error fetching guide:', guideError);
      return new Response(
        JSON.stringify({ error: 'Guide not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found guide with ${guide.customer_travel_guide_pois?.length || 0} POIs`);

    // Generate HTML
    const html = generateHTML(guide as Guide);

    return new Response(
      JSON.stringify({ html }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating travel guide PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
