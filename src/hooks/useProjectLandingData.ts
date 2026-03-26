import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Types for database data
export interface LocationIntelligence {
  coordinates: { lat: number; lng: number };
  nearbyAmenities: Record<string, Array<{ name: string; distance_meters: number }>>;
  note: string;
  fetchedAt?: string;
}

export interface AIPersonaContent {
  title: string;
  description: string;
  highlights: string[];
  estimatedYield?: string;
}

export interface AIRewrittenDescription {
  description: string;
  forWhom: string[];
  notForWhom: string[];
  keyFacts: string[];
  personas?: {
    vakantie: AIPersonaContent;
    investering: AIPersonaContent & { estimatedYield: string };
    wonen: AIPersonaContent;
  };
}

export type PersonaKey = "vakantie" | "investering" | "wonen";

export interface Unit {
  id: string;
  title: string;
  bedrooms: number;
  type: string;
  floorLabel: string;
  propertyType: string;
  sizeM2: number;
  terrace?: number;
  price: number;
  thumbnail: string;
  floorplan?: string;
  description: string;
  images: string[];
  // AI-generated unit type content
  aiIntro?: string;
  aiHighlights?: string[];
  aiLivingAdvantage?: string;
  // Extra specs for modal
  garden?: boolean;
  plotSize?: number;
  solarium?: boolean;
  seaViews?: boolean;
  mountainViews?: boolean;
  orientation?: string;
  communalPool?: boolean;
  elevator?: boolean;
  airconditioning?: boolean;
  parking?: number;
  bathrooms?: number;
}

// Video item for the media gallery
export interface VideoItem {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  videoUrl: string;
  videoType: "bouwupdate" | "showhouse" | "drone" | "omgeving" | "algemeen";
  date: string;
  description: string | null;
}

export interface ProjectLandingData {
  id: string;
  title: string;
  subtitle: string;
  personaSectionTitle: string;
  personaSectionSubtitle: string;
  location: string;
  region: string;
  startingPrice: number;
  heroVideoUrl: string;
  heroImages: string[];
  personaContent: Record<PersonaKey, {
    title: string;
    description: string;
    highlights: string[];
    estimatedYield?: string;
  }>;
  locationStats: {
    airport: { distance: number; unit: "min"; label: string };
    beach: { distance: number; unit: "min"; label: string };
    golf: { distance: number; unit: "min"; label: string };
    hospital: { distance: number; unit: "min"; label: string };
    lifestyleScore: number;
  };
  // New: Full location intelligence data for enhanced LocationSection
  nearbyAmenities: Record<string, Array<{ name: string; distance_meters: number }>>;
  coordinates: { lat: number; lng: number } | null;
  units: Unit[];
  gallery: Array<{
    id: string;
    url: string;
    type: "render" | "photo";
    alt: string;
  }>;
  // Video categories for media section
  buildUpdateVideos: VideoItem[];
  showcaseVideos: VideoItem[];
  // Primary videos for featured showcase section
  primaryShowcaseVideo: VideoItem | null;
  primaryEnvironmentVideo: VideoItem | null;
  // All videos for timeline display
  allVideos: VideoItem[];
  timeline: Array<{
    id: string;
    date: string;
    title: string;
    description: string;
    status: "completed" | "current" | "upcoming";
  }>;
  faq: Array<{
    question: string;
    answer: string;
  }>;
  developer: {
    name: string;
    logo: string;
    experience: string;
  };
  aiDescription: AIRewrittenDescription | null;
  locationIntelligence: LocationIntelligence | null;
  hasDeepAnalysis: boolean;
}

// Structured Deep Analysis (from AI structuring step)
export interface StructuredDeepAnalysis {
  heroContent?: {
    marketingTitle: string;
    subtitle: string;
    personaSectionTitle: string;
    personaSectionSubtitle: string;
  };
  personas: {
    vakantie: { title: string; description: string; highlights: string[] };
    investering: { title: string; description: string; highlights: string[]; estimatedYield: string; yieldNote: string };
    wonen: { title: string; description: string; highlights: string[] };
  };
  unfairAdvantage: { headline: string; details: string[] };
  goldenNuggets: string[];
  warnings: Array<{ text: string; severity: "info" | "warning" }>;
  audienceScores: { investor: string; holidaymaker: string; permanent: string };
}

interface DBProject {
  id: string;
  name: string;
  display_title: string | null;
  city: string | null;
  region: string | null;
  description: string | null;
  price_from: number | null;
  price_to: number | null;
  status: string | null;
  completion_date: string | null;
  images: string[] | null;
  featured_image: string | null;
  environment_video_url: string | null;
  showhouse_video_url: string | null;
  latitude: number | null;
  longitude: number | null;
  location_intelligence: LocationIntelligence | null;
  location_intelligence_updated_at: string | null;
  ai_rewritten_description: AIRewrittenDescription | null;
  ai_rewritten_at: string | null;
  highlights: string[] | null;
  deep_analysis_structured: StructuredDeepAnalysis | null;
  ai_unit_descriptions: Record<string, { intro: string; highlights: string[]; livingAdvantage: string }> | null;
}

interface DBProperty {
  id: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  terrace_area_sqm: number | null;
  plot_size_sqm: number | null;
  floor: string | null;
  property_type: string | null;
  price: number | null;
  status: string | null;
  image_url: string | null;
  images: string[] | null;
  description: string | null;
  garden: boolean | null;
  solarium: boolean | null;
  sea_views: boolean | null;
  mountain_views: boolean | null;
  orientation: string | null;
  communal_pool: boolean | null;
  elevator: boolean | null;
  airconditioning: boolean | null;
  parking: number | null;
}

interface DBProjectVideo {
  id: string;
  title: string | null;
  video_type: string | null;
  video_url: string | null;
  video_date: string | null;
  description: string | null;
  thumbnail_url: string | null;
}

// Map floor value to Dutch unit type
function mapFloorToType(floor: string | null): string {
  if (!floor) return "Appartement";
  const lowerFloor = floor.toLowerCase();
  if (lowerFloor.includes("baja") || lowerFloor.includes("ground") || lowerFloor === "0") {
    return "Begane grond";
  }
  if (lowerFloor.includes("penthouse") || lowerFloor.includes("atico") || lowerFloor.includes("ático")) {
    return "Penthouse";
  }
  if (lowerFloor.includes("1") || lowerFloor.includes("first") || lowerFloor.includes("primera")) {
    return "Eerste verdieping";
  }
  if (lowerFloor.includes("2") || lowerFloor.includes("second") || lowerFloor.includes("segunda")) {
    return "Tweede verdieping";
  }
  return "Appartement";
}

// Get display type combining property_type and floor
function getUnitDisplayType(propertyType: string | null, floor: string | null): string {
  if (propertyType) {
    const pt = propertyType.toLowerCase();
    
    // Villa types
    if (pt.includes("villa")) return "Villa";
    if (pt.includes("townhouse") || pt.includes("herenhuis") || pt.includes("adosado")) return "Herenhuis";
    if (pt.includes("semidetached") || pt.includes("halfvrijstaand") || pt.includes("pareado")) return "Halfvrijstaand";
    if (pt.includes("quad")) return "Quad";
    if (pt.includes("bungalow")) return "Bungalow";
    
    // Apartment floor types
    if (pt.includes("ground floor") || pt.includes("gelijkvloers") || pt.includes("planta baja")) return "Begane grond";
    if (pt.includes("penthouse") || pt.includes("atico") || pt.includes("ático")) return "Penthouse";
    if (pt.includes("studio")) return "Studio";
    if (pt.includes("duplex")) return "Duplex";
    
    // Generic apartment
    if (pt.includes("appartement") || pt.includes("apartment") || pt.includes("apartamento") || pt.includes("piso")) {
      return mapFloorToType(floor);
    }
  }
  
  // Fallback to floor-based mapping
  return mapFloorToType(floor);
}

// Get readable floor label
function getFloorLabel(floor: string | null): string {
  if (!floor) return "";
  const lowerFloor = floor.toLowerCase();
  
  // Check for specific floor names
  if (lowerFloor.includes("baja") || lowerFloor.includes("ground") || lowerFloor === "0") {
    return "Begane grond";
  }
  if (lowerFloor.includes("penthouse") || lowerFloor.includes("atico") || lowerFloor.includes("ático")) {
    return "Penthouse";
  }
  
  // Check for numeric floors
  const num = parseInt(floor);
  if (!isNaN(num)) {
    if (num === 0) return "Begane grond";
    if (num === 1) return "1e verdieping";
    if (num === 2) return "2e verdieping";
    if (num === 3) return "3e verdieping";
    return `${num}e verdieping`;
  }
  
  // Check for ordinal patterns
  if (lowerFloor.includes("1") || lowerFloor.includes("first") || lowerFloor.includes("primera")) {
    return "1e verdieping";
  }
  if (lowerFloor.includes("2") || lowerFloor.includes("second") || lowerFloor.includes("segunda")) {
    return "2e verdieping";
  }
  
  return floor;
}

// Generate descriptive unit title based on bedrooms, type, and floor
function generateDescriptiveTitle(
  type: string,
  bedrooms: number,
  floorLabel: string,
  propertyType: string | null
): string {
  const lowerType = type.toLowerCase();
  const lowerPropertyType = (propertyType || "").toLowerCase();
  const lowerFloor = floorLabel.toLowerCase();
  
  // For penthouses: "{X}-slaapkamer penthouse"
  if (lowerType === "penthouse" || lowerFloor.includes("penthouse")) {
    return `${bedrooms}-slaapkamer penthouse`;
  }
  
  // For ground floor apartments: "{X}-slaapkamer begane grond appartement"
  if (lowerType === "gelijkvloers" || lowerType === "begane grond" || 
      lowerFloor.includes("gelijkvloers") || lowerFloor.includes("begane grond")) {
    return `${bedrooms}-slaapkamer begane grond appartement`;
  }
  
  // For floor apartments: "{X}-slaapkamer appartement"
  if (lowerType.includes("verdieping")) {
    return `${bedrooms}-slaapkamer appartement`;
  }
  
  // For bungalows: distinguish between ground and penthouse level
  if (lowerType === "bungalow" || lowerPropertyType.includes("bungalow")) {
    if (lowerFloor.includes("penthouse") || lowerFloor.includes("atico") || lowerFloor.includes("ático")) {
      return "Penthouse bungalow";
    }
    if (lowerFloor.includes("gelijkvloers") || lowerFloor === "" || lowerFloor.includes("baja")) {
      return "Begane grond bungalow";
    }
    return `${bedrooms}-slaapkamer bungalow`;
  }
  
  // For villas, townhouses, etc: "{X}-slaapkamer {type}"
  if (["villa", "herenhuis", "halfvrijstaand", "quad", "duplex", "studio"].includes(lowerType)) {
    return `${bedrooms}-slaapkamer ${type.toLowerCase()}`;
  }
  
  // Fallback: "{X}-slaapkamer {type}"
  return `${bedrooms}-slaapkamer ${type.toLowerCase()}`;
}

// Extract floorplan from images array (if any contain "floorplan" or "plattegrond")
function extractFloorplanFromImages(images: string[] | null): string | undefined {
  if (!images) return undefined;
  const floorplan = images.find(img => 
    img.toLowerCase().includes("floorplan") || 
    img.toLowerCase().includes("plattegrond") ||
    img.toLowerCase().includes("floor_plan")
  );
  return floorplan || undefined;
}

// Calculate lifestyle score based on location intelligence
function calculateLifestyleScore(locationIntelligence: LocationIntelligence | null): number {
  if (!locationIntelligence?.nearbyAmenities) return 7; // Default score
  
  let score = 5; // Base score
  const amenities = locationIntelligence.nearbyAmenities;
  
  // Beach < 500m: +2 points
  const beaches = amenities["stranden"] || [];
  if (beaches.length > 0 && beaches[0].distance_meters < 500) {
    score += 2;
  } else if (beaches.length > 0 && beaches[0].distance_meters < 2000) {
    score += 1;
  }
  
  // Airport < 45 min (~60km): +1 point
  const airports = amenities["luchthavens"] || [];
  if (airports.length > 0 && airports[0].distance_meters < 60000) {
    score += 1;
  }
  
  // 3+ restaurants within 1km: +1 point
  const restaurants = amenities["restaurants"] || [];
  const nearbyRestaurants = restaurants.filter(r => r.distance_meters < 1000);
  if (nearbyRestaurants.length >= 3) {
    score += 1;
  }
  
  // Hospital < 15km: +1 point
  const hospitals = amenities["ziekenhuizen"] || [];
  if (hospitals.length > 0 && hospitals[0].distance_meters < 15000) {
    score += 1;
  }
  
  // Golf < 15km: +1 point
  const golf = amenities["golfbanen"] || [];
  if (golf.length > 0 && golf[0].distance_meters < 15000) {
    score += 1;
  }
  
  // Supermarket < 1km: +1 point
  const supermarkets = amenities["supermarkten"] || [];
  if (supermarkets.length > 0 && supermarkets[0].distance_meters < 1000) {
    score += 1;
  }
  
  return Math.min(score, 10); // Max 10
}

// Map location intelligence to template format
function mapLocationStats(locationIntelligence: LocationIntelligence | null) {
  if (!locationIntelligence?.nearbyAmenities) {
    return {
      airport: { distance: 30, unit: "min" as const, label: "Luchthaven" },
      beach: { distance: 10, unit: "min" as const, label: "Strand" },
      golf: { distance: 15, unit: "min" as const, label: "Golfbaan" },
      hospital: { distance: 10, unit: "min" as const, label: "Ziekenhuis" },
      lifestyleScore: 7,
    };
  }
  
  const amenities = locationIntelligence.nearbyAmenities;
  
  // Helper to get first amenity distance in minutes (assuming 50km/h average)
  const getDistanceInMinutes = (category: string, defaultMinutes: number): number => {
    const items = amenities[category] || [];
    if (items.length === 0) return defaultMinutes;
    // Convert meters to driving minutes (assuming ~50km/h average, so 833m/min)
    return Math.max(1, Math.round(items[0].distance_meters / 833));
  };
  
  const getAmenityName = (category: string, defaultName: string): string => {
    const items = amenities[category] || [];
    return items.length > 0 ? items[0].name : defaultName;
  };
  
  return {
    airport: {
      distance: getDistanceInMinutes("luchthavens", 30),
      unit: "min" as const,
      label: getAmenityName("luchthavens", "Luchthaven"),
    },
    beach: {
      distance: getDistanceInMinutes("stranden", 10),
      unit: "min" as const,
      label: getAmenityName("stranden", "Strand"),
    },
    golf: {
      distance: getDistanceInMinutes("golfbanen", 15),
      unit: "min" as const,
      label: getAmenityName("golfbanen", "Golfbaan"),
    },
    hospital: {
      distance: getDistanceInMinutes("ziekenhuizen", 10),
      unit: "min" as const,
      label: getAmenityName("ziekenhuizen", "Ziekenhuis"),
    },
    lifestyleScore: calculateLifestyleScore(locationIntelligence),
  };
}

// Generate persona content based on project and location data
// Priority: 1. Deep Analysis Structured, 2. AI Description, 3. Rule-based fallback
function generatePersonaContent(
  project: DBProject,
  locationIntelligence: LocationIntelligence | null,
  aiDescription: AIRewrittenDescription | null
): Record<PersonaKey, { title: string; description: string; highlights: string[]; estimatedYield?: string }> {
  // Priority 1: Use structured deep analysis if available
  const structuredAnalysis = project.deep_analysis_structured;
  if (structuredAnalysis?.personas) {
    return {
      vakantie: structuredAnalysis.personas.vakantie,
      investering: {
        ...structuredAnalysis.personas.investering,
        estimatedYield: structuredAnalysis.personas.investering.estimatedYield,
      },
      wonen: structuredAnalysis.personas.wonen,
    };
  }

  // Priority 2: Use AI rewritten description with personas if available
  if (aiDescription?.personas) {
    return {
      vakantie: aiDescription.personas.vakantie,
      investering: {
        ...aiDescription.personas.investering,
        estimatedYield: aiDescription.personas.investering.estimatedYield,
      },
      wonen: aiDescription.personas.wonen,
    };
  }

  // Priority 3: Fall back to rule-based generation
  const projectName = project.display_title || project.name;
  const location = [project.city, project.region].filter(Boolean).join(", ");
  const amenities = locationIntelligence?.nearbyAmenities || {};
  
  // Get beach distance for vacation content
  const beaches = amenities["stranden"] || [];
  const beachInfo = beaches.length > 0 
    ? `${beaches[0].name} op ${Math.round(beaches[0].distance_meters / 100) * 100}m` 
    : "Strand in de buurt";
  
  // Get restaurants for lifestyle content
  const restaurants = amenities["restaurants"] || [];
  const restaurantCount = restaurants.filter(r => r.distance_meters < 1000).length;
  
  // Get golf info
  const golf = amenities["golfbanen"] || [];
  const golfInfo = golf.length > 0 
    ? `${golf[0].name} op ${Math.round(golf[0].distance_meters / 1000)}km` 
    : null;
  
  // Get hospital info for living content
  const hospitals = amenities["ziekenhuizen"] || [];
  const hospitalInfo = hospitals.length > 0 
    ? `Ziekenhuis op ${Math.round(hospitals[0].distance_meters / 1000)}km` 
    : "Ziekenhuizen in de regio";
  
  return {
    vakantie: {
      title: `${projectName} als vakantiewoning`,
      description: `Geniet van het Spaanse klimaat vanuit jouw eigen plek in ${location}. ${beachInfo} maakt dit de perfecte uitvalsbasis voor ontspanning.`,
      highlights: [
        beachInfo,
        restaurantCount > 0 ? `${restaurantCount} restaurants binnen 1km` : "Restaurants in de buurt",
        golfInfo || "Mediterraan klimaat",
        "Zwembad in het resort",
        "Onderhoudsvrij bezit",
      ].filter(Boolean) as string[],
    },
    investering: {
      title: `Investeren in ${projectName}`,
      description: `Ontdek het rendementspotentieel van vastgoed in ${location}. Met de toenemende vraag naar vakantieverhuur biedt deze regio interessante mogelijkheden.`,
      highlights: [
        "Populaire vakantieregio",
        "Groeiende huurvraag",
        "Professioneel verhuurbeheer mogelijk",
        "Fiscale voordelen in Spanje",
        "Waardestijging op lange termijn",
      ],
      estimatedYield: "5-7%",
    },
    wonen: {
      title: `Permanent wonen in ${projectName}`,
      description: `Overweeg je om te verhuizen naar Spanje? ${location} biedt een uitstekende levenskwaliteit met alle voorzieningen binnen handbereik.`,
      highlights: [
        hospitalInfo,
        "Internationale scholen in de regio",
        "Uitstekend openbaar vervoer",
        "Expat community aanwezig",
        "340 dagen zon per jaar",
      ],
    },
  };
}

// Generate timeline from project videos
function generateTimeline(videos: DBProjectVideo[], completionDate: string | null) {
  const timeline = [];
  
  // Find build update videos
  const buildUpdates = videos.filter(v => v.video_type === "bouwupdate");
  
  // Add start construction milestone (estimate 2 years before completion)
  if (completionDate) {
    const completion = new Date(completionDate);
    const start = new Date(completion);
    start.setFullYear(start.getFullYear() - 2);
    
    timeline.push({
      id: "start",
      date: start.toISOString().split("T")[0],
      title: "Start bouw",
      description: "Bouwwerkzaamheden gestart",
      status: "completed" as const,
    });
  }
  
  // Add build update milestones
  buildUpdates.slice(0, 3).forEach((video, index) => {
    timeline.push({
      id: video.id,
      date: video.video_date || new Date().toISOString().split("T")[0],
      title: video.title || `Bouwupdate ${index + 1}`,
      description: "Voortgang op de bouwplaats",
      status: "completed" as const,
    });
  });
  
  // Add completion milestone
  if (completionDate) {
    const isCompleted = new Date(completionDate) <= new Date();
    timeline.push({
      id: "completion",
      date: completionDate,
      title: isCompleted ? "Opgeleverd" : "Geplande oplevering",
      description: isCompleted ? "Project is afgerond" : "Verwachte opleverdatum",
      status: isCompleted ? "completed" as const : "upcoming" as const,
    });
  }
  
  return timeline.length > 0 ? timeline : [
    { id: "1", date: "2024-03", title: "Start bouw", description: "Bouwwerkzaamheden gestart", status: "completed" as const },
    { id: "2", date: "2024-12", title: "Huidige status", description: "In aanbouw", status: "current" as const },
    { id: "3", date: "2025-06", title: "Oplevering", description: "Geplande oplevering", status: "upcoming" as const },
  ];
}

// Default FAQ items
const defaultFAQ = [
  { question: "Wat zijn de bijkomende kosten bij aankoop?", answer: "Bij nieuwbouw betaal je 10% BTW (IVA) plus notaris- en registratiekosten (ca. 2-3%). Voor bestaande bouw is er overdrachtsbelasting (ITP) van 7-10% afhankelijk van de regio. Wij geven je altijd een volledig kostenplaatje vooraf." },
  { question: "Kan ik een hypotheek krijgen als buitenlander?", answer: "Ja, Spaanse banken verstrekken hypotheken aan niet-residenten tot 60-70% van de aankoopwaarde. We werken samen met hypotheekadviseurs die gespecialiseerd zijn in buitenlandse kopers." },
  { question: "Hoe werkt het aankoopproces?", answer: "Na het tekenen van een reserveringscontract en het betalen van een aanbetaling (meestal €3.000-6.000) wordt het koopcontract opgesteld. De definitieve overdracht vindt plaats bij de notaris, waarna je direct eigenaar bent." },
  { question: "Wat kost het onderhoud per jaar?", answer: "Reken op gemeenschapskosten (VvE) van €50-150/maand afhankelijk van de voorzieningen, plus gemeentelijke belastingen (IBI) van €300-800/jaar en eventuele verzekeringen." },
  { question: "Begeleiding in het Nederlands?", answer: "Ja, ons hele team spreekt Nederlands. We begeleiden je door het volledige proces: van oriëntatie tot sleuteloverdracht en eventueel verhuurbeheer." },
];

// Transform database data to template format
function transformToProjectData(
  project: DBProject,
  properties: DBProperty[],
  videos: DBProjectVideo[]
): ProjectLandingData {
  const projectName = project.display_title || project.name;
  const location = [project.city, project.region].filter(Boolean).join(", ") || "Costa Cálida, Spanje";
  const region = project.region || "Spanje";
  const locationIntelligence = project.location_intelligence;
  const aiDescription = project.ai_rewritten_description;
  const aiUnitDescriptions = project.ai_unit_descriptions;
  
  // Map properties to units with descriptive titles
  const mappedUnits = properties.map((prop) => {
    const type = getUnitDisplayType(prop.property_type, prop.floor);
    const floorLabel = getFloorLabel(prop.floor);
    const bedrooms = Number(prop.bedrooms) || 2;
    
    // Generate descriptive title based on bedrooms, type, and floor
    const baseTitle = generateDescriptiveTitle(type, bedrooms, floorLabel, prop.property_type);
    
    // Verzamel alle images voor deze specifieke unit
    const unitImages: string[] = [];
    if (prop.image_url) unitImages.push(prop.image_url);
    if (prop.images && prop.images.length > 0) {
      prop.images.forEach(img => {
        if (img && !unitImages.includes(img)) unitImages.push(img);
      });
    }
    
    // Build AI description key for this property
    const aiKey = `${(prop.property_type || "apartment").toLowerCase()}_${bedrooms}bed`;
    const aiData = aiUnitDescriptions?.[aiKey];

    return {
      id: prop.id,
      baseTitle,
      bedrooms,
      type,
      floorLabel,
      propertyType: prop.property_type || "",
      sizeM2: prop.area_sqm || 80,
      terrace: prop.terrace_area_sqm || undefined,
      price: prop.price || 200000,
      thumbnail: prop.image_url || (prop.images && prop.images[0]) || "/placeholder.svg",
      floorplan: extractFloorplanFromImages(prop.images),
      description: prop.description || `${type} met ${bedrooms} slaapkamers`,
      images: unitImages,
      // AI-generated content
      aiIntro: aiData?.intro,
      aiHighlights: aiData?.highlights,
      aiLivingAdvantage: aiData?.livingAdvantage,
      // Extra specs
      garden: prop.garden || undefined,
      plotSize: prop.plot_size_sqm || undefined,
      solarium: prop.solarium || undefined,
      seaViews: prop.sea_views || undefined,
      mountainViews: prop.mountain_views || undefined,
      orientation: prop.orientation || undefined,
      communalPool: prop.communal_pool || undefined,
      elevator: prop.elevator || undefined,
      airconditioning: prop.airconditioning || undefined,
      parking: prop.parking || undefined,
      bathrooms: prop.bathrooms || undefined,
    };
  });
  
  // Handle duplicate titles by adding sequence numbers
  const titleCounts = new Map<string, number>();
  mappedUnits.forEach(unit => {
    titleCounts.set(unit.baseTitle, (titleCounts.get(unit.baseTitle) || 0) + 1);
  });
  
  const titleSequences = new Map<string, number>();
  const units: Unit[] = mappedUnits.map(unit => {
    const totalWithTitle = titleCounts.get(unit.baseTitle) || 1;
    let finalTitle = unit.baseTitle;
    
    if (totalWithTitle > 1) {
      const seq = (titleSequences.get(unit.baseTitle) || 0) + 1;
      titleSequences.set(unit.baseTitle, seq);
      finalTitle = `${unit.baseTitle} ${seq}`;
    }
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { baseTitle, ...rest } = unit;
    return { ...rest, title: finalTitle };
  });
  
  // Create gallery from project images
  // Deduplicatie op bestandsnaam: zelfde foto in verschillende mappen wordt maar 1x getoond
  const extractFilename = (url: string): string => {
    const parts = url.split('/');
    return parts[parts.length - 1] || url;
  };
  
  const seenFilenames = new Set<string>();
  const allGalleryImages: string[] = [];
  
  const addUniqueImage = (url: string) => {
    const filename = extractFilename(url);
    if (!seenFilenames.has(filename)) {
      seenFilenames.add(filename);
      allGalleryImages.push(url);
    }
  };

  // Eerst: project.images (hoogste prioriteit)
  if (project.images && project.images.length > 0) {
    project.images.forEach(img => addUniqueImage(img));
  }

  // Dan: property images (alleen unieke bestandsnamen toevoegen)
  if (properties.length > 0) {
    properties
      .flatMap(p => p.images || [p.image_url].filter(Boolean))
      .filter((img): img is string => !!img)
      .forEach(img => addUniqueImage(img));
  }

  // Maak gallery van gecombineerde lijst (geen limiet meer)
  const gallery = allGalleryImages.map((img, index) => ({
    id: `gallery-${index}`,
    url: img,
    type: (index < 4 ? "render" : "photo") as "render" | "photo",
    alt: `${projectName} - Afbeelding ${index + 1}`,
  }));
  
  // Extract hero images with extended fallback logic
  const heroImages: string[] = [];
  
  // Priority 1: featured_image from project
  if (project.featured_image) {
    heroImages.push(project.featured_image);
  }
  
  // Priority 2: project.images array
  if (project.images && project.images.length > 0) {
    const remaining = project.images.filter(img => img !== project.featured_image);
    heroImages.push(...remaining.slice(0, 4));
  }
  
  // Priority 3: Images from properties as fallback
  if (heroImages.length < 3 && properties.length > 0) {
    const propertyImages = properties
      .flatMap(p => p.images || [p.image_url].filter(Boolean))
      .filter((img): img is string => !!img && !heroImages.includes(img))
      .slice(0, 5 - heroImages.length);
    heroImages.push(...propertyImages);
  }
  
  // Get structured analysis for hero content
  const structuredAnalysis = project.deep_analysis_structured;
  
  // Priority 1: Structured deep analysis marketing title, 2: display_title, 3: name
  const title = structuredAnalysis?.heroContent?.marketingTitle || projectName;
  const subtitle = structuredAnalysis?.heroContent?.subtitle || location;
  const personaSectionTitle = structuredAnalysis?.heroContent?.personaSectionTitle || `Ontdek jouw leven in ${title}`;
  const personaSectionSubtitle = structuredAnalysis?.heroContent?.personaSectionSubtitle || "Elk project biedt verschillende mogelijkheden. Ontdek wat het beste bij jou past.";
  
  return {
    id: project.id,
    title,
    subtitle,
    personaSectionTitle,
    personaSectionSubtitle,
    location,
    region,
    startingPrice: project.price_from || 199000,
    heroVideoUrl: "",  // Altijd foto's - video uitgeschakeld per gebruikersvoorkeur
    heroImages,
    personaContent: generatePersonaContent(project, locationIntelligence, aiDescription),
    locationStats: mapLocationStats(locationIntelligence),
    // New: Full location intelligence data for enhanced LocationSection
    nearbyAmenities: locationIntelligence?.nearbyAmenities || {},
    coordinates: locationIntelligence?.coordinates || 
      (project.latitude && project.longitude 
        ? { lat: project.latitude, lng: project.longitude } 
        : null),
    units: units.length > 0 ? units : [
      { id: "demo-1", title: "2-slaapkamer begane grond", bedrooms: 2, type: "Gelijkvloers", floorLabel: "Gelijkvloers", propertyType: "", sizeM2: 75, terrace: 20, price: 199000, thumbnail: "/placeholder.svg", description: "Ruim gelijkvloers appartement met tuin", images: [] },
      { id: "demo-2", title: "3-slaapkamer penthouse", bedrooms: 3, type: "Penthouse", floorLabel: "Penthouse", propertyType: "", sizeM2: 110, terrace: 45, price: 299000, thumbnail: "/placeholder.svg", description: "Luxe penthouse met groot dakterras", images: [] },
    ],
    gallery: gallery.length > 0 ? gallery : [
      { id: "1", url: "/placeholder.svg", type: "render" as const, alt: "Project render" },
      { id: "2", url: "/placeholder.svg", type: "photo" as const, alt: "Locatie foto" },
    ],
    // Categorize videos for media gallery
    buildUpdateVideos: videos
      .filter(v => v.video_type === "bouwupdate")
      .map(v => ({
        id: v.id,
        title: v.title || "Bouwupdate",
        thumbnailUrl: v.thumbnail_url,
        videoUrl: v.video_url || "",
        videoType: "bouwupdate" as const,
        date: v.video_date || "",
        description: v.description,
      })),
    showcaseVideos: videos
      .filter(v => ["showhouse", "drone"].includes(v.video_type || ""))
      .map(v => ({
        id: v.id,
        title: v.title || (v.video_type === "drone" ? "Dronebeelden" : "Showhouse Tour"),
        thumbnailUrl: v.thumbnail_url,
        videoUrl: v.video_url || "",
        videoType: v.video_type as "showhouse" | "drone",
        date: v.video_date || "",
        description: v.description,
      })),
    // Primary videos for featured showcase section (first of each type)
    // Primary videos: First check video library, then fallback to project-level URLs
    primaryShowcaseVideo: (() => {
      // Priority 1: Video library
      const v = videos.find(v => v.video_type === "showhouse");
      if (v) {
        return {
          id: v.id,
          title: v.title || "Showhouse Tour",
          thumbnailUrl: v.thumbnail_url,
          videoUrl: v.video_url || "",
          videoType: "showhouse" as const,
          date: v.video_date || "",
          description: v.description,
        };
      }
      // Priority 2: Project-level URL fallback
      if (project.showhouse_video_url) {
        return {
          id: "project-showhouse",
          title: "Showhouse Tour",
          thumbnailUrl: null,
          videoUrl: project.showhouse_video_url,
          videoType: "showhouse" as const,
          date: "",
          description: null,
        };
      }
      return null;
    })(),
    primaryEnvironmentVideo: (() => {
      // Priority 1: Project-level URL (specifiek geselecteerd voor dit project)
      if (project.environment_video_url) {
        return {
          id: "project-environment",
          title: "Omgeving & Locatie",
          thumbnailUrl: null,
          videoUrl: project.environment_video_url,
          videoType: "omgeving" as const,
          date: "",
          description: null,
        };
      }
      // Priority 2: Video library fallback (omgeving type alleen, niet drone)
      const v = videos.find(v => v.video_type === "omgeving");
      if (v) {
        return {
          id: v.id,
          title: v.title || "Omgeving & Locatie",
          thumbnailUrl: v.thumbnail_url,
          videoUrl: v.video_url || "",
          videoType: "omgeving" as const,
          date: v.video_date || "",
          description: v.description,
        };
      }
      return null;
    })(),
    // All videos for timeline (chronologically sorted)
    allVideos: videos.map(v => ({
      id: v.id,
      title: v.title || "Video",
      thumbnailUrl: v.thumbnail_url,
      videoUrl: v.video_url || "",
      videoType: v.video_type as VideoItem["videoType"],
      date: v.video_date || "",
      description: v.description,
    })),
    timeline: generateTimeline(videos, project.completion_date),
    faq: defaultFAQ,
    developer: {
      name: "Viva Vastgoed",  // Tijdelijke fallback - later uitbreiden met developers tabel
      logo: "/placeholder.svg",
      experience: "Ervaren partner in Spaans vastgoed",
    },
    aiDescription,
    locationIntelligence,
    hasDeepAnalysis: !!project.deep_analysis_structured?.personas,
  };
}

// Main hook
export function useProjectLandingData(projectId: string) {
  const queryClient = useQueryClient();
  const enrichmentTriggered = useRef(false);
  
  // Main query for project data
  const query = useQuery<ProjectLandingData | null>({
    queryKey: ["project-landing", projectId],
    queryFn: async (): Promise<ProjectLandingData | null> => {
      // Skip fetch for demo ID
      if (projectId === "demo") {
        return null;
      }
      
      // Fetch project with all needed fields
      const projectResult = await supabase
        .from("projects")
        .select("id, name, display_title, city, region, description, price_from, price_to, status, completion_date, images, featured_image, environment_video_url, showhouse_video_url, latitude, longitude, location_intelligence, location_intelligence_updated_at, ai_rewritten_description, ai_rewritten_at, highlights, deep_analysis_structured, ai_unit_descriptions")
        .eq("id", projectId)
        .maybeSingle();
      
      if (projectResult.error) throw projectResult.error;
      if (!projectResult.data) return null;
      
      const project = projectResult.data as unknown as DBProject;
      
      // Fetch properties for this project
      const propertiesResult = await supabase
        .from("properties")
        .select("id, bedrooms, bathrooms, area_sqm, terrace_area_sqm, plot_size_sqm, floor, property_type, price, status, image_url, images, description, garden, solarium, sea_views, mountain_views, orientation, communal_pool, elevator, airconditioning, parking")
        .eq("project_id", projectId)
        .in("status", ["beschikbaar", "available", "Beschikbaar", "Available"])
        .limit(50);
      
      if (propertiesResult.error) {
        console.error("Error fetching properties:", propertiesResult.error);
      }
      
      const properties = (propertiesResult.data || []) as unknown as DBProperty[];
      
      // Fetch project videos via project_video_links join table
      const videosResult = await (supabase as any)
        .from("project_video_links")
        .select(`
          video_id,
          order_index,
          visible_public,
          is_featured,
          project_videos!inner (
            id,
            title,
            video_type,
            video_url,
            video_date,
            description,
            thumbnail_url
          )
        `)
        .eq("project_id", projectId)
        .eq("visible_public", true)
        .order("order_index", { ascending: true });
      
      if (videosResult.error) {
        console.error("Error fetching videos:", videosResult.error);
      }
      
      // Transform nested join data to flat video objects
      const videos = (videosResult.data || []).map((link: any) => ({
        id: link.project_videos.id,
        title: link.project_videos.title,
        video_type: link.project_videos.video_type,
        video_url: link.project_videos.video_url,
        video_date: link.project_videos.video_date,
        description: link.project_videos.description,
        thumbnail_url: link.project_videos.thumbnail_url,
      })) as DBProjectVideo[];
      
      return transformToProjectData(project, properties, videos);
    },
    enabled: projectId !== "demo",
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Mutation for triggering location intelligence enrichment
  const enrichLocation = useMutation({
    mutationFn: async () => {
      const response = await supabase.functions.invoke("enrich-project-landing", {
        body: { projectId },
      });
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-landing", projectId] });
    },
  });
  
  // Mutation for triggering AI description rewrite
  const rewriteDescription = useMutation({
    mutationFn: async () => {
      const response = await supabase.functions.invoke("rewrite-project-description", {
        body: { projectId },
      });
      // Graceful: als er geen beschrijving was, skip en laat rule-based fallback werken
      if (response.data?.skipped) return response.data;
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-landing", projectId] });
    },
  });
  
  // Mutation for triggering AI unit type descriptions
  const generateUnitDescriptions = useMutation({
    mutationFn: async () => {
      const response = await supabase.functions.invoke("generate-unit-descriptions", {
        body: { projectId },
      });
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-landing", projectId] });
    },
  });
  
  // Automatic enrichment chain: triggers on first page load if data is missing
  // Only runs once per component mount (ref prevents re-triggers from StrictMode/re-renders)
  useEffect(() => {
    if (!query.data || enrichmentTriggered.current || query.isLoading) return;
    
    // Skip if deep analysis exists (premium content available)
    if (query.data.hasDeepAnalysis) return;
    
    const hasCoordinates = query.data.coordinates !== null;
    const hasLocationData = query.data.locationIntelligence !== null;
    const hasAiPersonas = !!query.data.aiDescription?.personas;
    const hasUnitDescriptions = query.data.units.some(u => !!u.aiIntro);
    
    if (!hasLocationData && hasCoordinates) {
      // Step 1: Fetch location intelligence first, then AI rewrite will follow
      enrichmentTriggered.current = true;
      console.log("[AutoEnrich] Triggering location enrichment...");
      enrichLocation.mutate(undefined, {
        onSuccess: () => {
          if (!hasAiPersonas) {
            console.log("[AutoEnrich] Location done, triggering AI rewrite...");
            rewriteDescription.mutate();
          }
        },
        onError: (err) => {
          console.error("[AutoEnrich] Location enrichment failed:", err);
        },
      });
    } else if (!hasAiPersonas) {
      // Location data exists but no AI personas yet
      enrichmentTriggered.current = true;
      console.log("[AutoEnrich] Triggering AI rewrite (location already cached)...");
      rewriteDescription.mutate(undefined, {
        onError: (err) => {
          console.error("[AutoEnrich] AI rewrite failed:", err);
        },
      });
    }
  }, [query.data, query.isLoading]);
  
  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    generateUnitDescriptions,
  };
}
