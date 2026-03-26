// Dummy data for Project Landing Page template
export const dummyProjectData = {
  id: "demo",
  title: "Residencial Mar Serena",
  subtitle: "Moderne appartementen direct aan de Mar Menor",
  personaSectionTitle: "Jouw leven in Mar Serena",
  personaSectionSubtitle: "Ontdek welke levensstijl het beste bij jou past",
  location: "Los Alcázares, Costa Cálida",
  region: "Murcia",
  startingPrice: 189000,
  heroVideoUrl: "https://player.vimeo.com/external/434045526.sd.mp4?s=c27eecc69a27dbc4ff2b87d38afc35f1a9e7c02d&profile_id=164&oauth2_token_id=57447761",
  heroImages: [
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920",
  ],
  
  personaContent: {
    vakantie: {
      title: "Jouw perfecte vakantiebestemming",
      description: "Geniet van 320 dagen zon per jaar in je eigen Spaanse vakantiewoning. Loop binnen enkele minuten naar het strand, ontdek de lokale tapas bars en kom volledig tot rust in een mediterraan klimaat.",
      highlights: [
        "Privézwembad met zonneterras",
        "5 minuten van het strand",
        "Internationale restaurants en golf",
        "Ideaal voor families"
      ]
    },
    investering: {
      title: "Slim investeren in Spaans vastgoed",
      description: "Combineer vakantiegenot met rendement. De Costa Cálida biedt stabiele waardestijging en aantrekkelijke verhuurmogelijkheden dankzij het hele jaar door aangename klimaat.",
      highlights: [
        "Geschat bruto rendement: 6-8%",
        "Sterke waardestijging regio",
        "Professioneel verhuurbeheer mogelijk",
        "Fiscaal voordelig voor Belgen"
      ],
      estimatedYield: "6-8%"
    },
    wonen: {
      title: "Emigreren naar de zon",
      description: "Droom je van een nieuw leven aan de Spaanse kust? Los Alcázares biedt een actieve internationale gemeenschap, uitstekende gezondheidszorg en een ontspannen levensritme.",
      highlights: [
        "Grote internationale gemeenschap",
        "Uitstekende gezondheidszorg",
        "Lage kosten van levensonderhoud",
        "Rijk cultureel leven"
      ]
    }
  },

  locationStats: {
    airport: { distance: 25, unit: "min", label: "Luchthaven Murcia" },
    beach: { distance: 5, unit: "min", label: "Mar Menor strand" },
    golf: { distance: 10, unit: "min", label: "Golfbanen" },
    hospital: { distance: 15, unit: "min", label: "Ziekenhuis" },
    lifestyleScore: 9.2
  },

  // New: Full location data for enhanced LocationSection
  nearbyAmenities: {
    stranden: [
      { name: "Playa de Los Alcázares", distance_meters: 650 },
      { name: "Playa del Espejo", distance_meters: 1200 },
    ],
    golfbanen: [
      { name: "Serena Golf", distance_meters: 4500 },
      { name: "La Torre Golf Resort", distance_meters: 8200 },
    ],
    supermarkten: [
      { name: "Mercadona", distance_meters: 800 },
      { name: "Lidl", distance_meters: 1100 },
    ],
    restaurants: [
      { name: "Restaurante Bahía", distance_meters: 450 },
      { name: "La Terraza", distance_meters: 600 },
      { name: "El Pescador", distance_meters: 750 },
      { name: "Casa Miguel", distance_meters: 900 },
    ],
    ziekenhuizen: [
      { name: "Hospital Los Arcos", distance_meters: 12000 },
    ],
    luchthavens: [
      { name: "Aeropuerto de Murcia", distance_meters: 35000 },
    ],
  } as Record<string, Array<{ name: string; distance_meters: number }>>,
  
  coordinates: { lat: 37.7488, lng: -0.8542 } as { lat: number; lng: number } | null,

  units: [
    {
      id: "A1",
      title: "Gelijkvloers 1",
      bedrooms: 2,
      type: "Gelijkvloers",
      floorLabel: "Gelijkvloers",
      propertyType: "apartment",
      sizeM2: 75,
      terrace: 25,
      price: 189000,
      thumbnail: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
      floorplan: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800",
      description: "Ruim gelijkvloers appartement met privétuin en directe toegang tot het zwembad. Ideaal voor wie comfort en toegankelijkheid zoekt.",
      images: ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800", "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800"]
    },
    {
      id: "A2",
      title: "Gelijkvloers 2",
      bedrooms: 2,
      type: "Gelijkvloers",
      floorLabel: "Gelijkvloers",
      propertyType: "apartment",
      sizeM2: 78,
      terrace: 30,
      price: 195000,
      thumbnail: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
      floorplan: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800",
      description: "Hoekwoning met extra lichtinval en grotere tuin. Perfect voor natuurliefhebbers.",
      images: ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800", "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800"]
    },
    {
      id: "B1",
      title: "Gelijkvloers 3",
      bedrooms: 3,
      type: "Gelijkvloers",
      floorLabel: "Gelijkvloers",
      propertyType: "apartment",
      sizeM2: 95,
      terrace: 35,
      price: 245000,
      thumbnail: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800",
      floorplan: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800",
      description: "Gezinswoning met drie slaapkamers en ruime leefruimte. Ideaal voor families.",
      images: ["https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800"]
    },
    {
      id: "P1",
      title: "Penthouse 1",
      bedrooms: 2,
      type: "Penthouse",
      floorLabel: "Penthouse",
      propertyType: "penthouse",
      sizeM2: 80,
      terrace: 45,
      price: 225000,
      thumbnail: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800",
      floorplan: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800",
      description: "Exclusief penthouse met panoramisch uitzicht en groot dakterras. Geniet van spectaculaire zonsondergangen.",
      images: ["https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800", "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=800"]
    },
    {
      id: "P2",
      title: "Penthouse 2",
      bedrooms: 3,
      type: "Penthouse",
      floorLabel: "Penthouse",
      propertyType: "penthouse",
      sizeM2: 105,
      terrace: 60,
      price: 295000,
      thumbnail: "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=800",
      floorplan: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800",
      description: "Luxe penthouse met drie slaapkamers en wrap-around terras. Het absolute topstuk van het project.",
      images: ["https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=800"]
    },
    {
      id: "A3",
      title: "Gelijkvloers 4",
      bedrooms: 2,
      type: "Gelijkvloers",
      floorLabel: "Gelijkvloers",
      propertyType: "apartment",
      sizeM2: 72,
      terrace: 22,
      price: 185000,
      thumbnail: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800",
      floorplan: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800",
      description: "Compact en efficiënt appartement, perfect als investeringsobject of starterswoning.",
      images: ["https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800"]
    }
  ],

  gallery: [
    { id: "1", type: "render" as const, url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200", alt: "Exterieur render" },
    { id: "2", type: "photo" as const, url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200", alt: "Woonkamer" },
    { id: "3", type: "render" as const, url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200", alt: "Zwembad render" },
    { id: "4", type: "photo" as const, url: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200", alt: "Keuken" },
    { id: "5", type: "render" as const, url: "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=1200", alt: "Terras render" },
    { id: "6", type: "photo" as const, url: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1200", alt: "Slaapkamer" },
    { id: "7", type: "render" as const, url: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200", alt: "Badkamer render" },
    { id: "8", type: "photo" as const, url: "https://images.unsplash.com/photo-1600210492493-0946911123ea?w=1200", alt: "Omgeving" }
  ],

  // Video categories for media section
  buildUpdateVideos: [
    { id: "v1", title: "Bouwupdate December 2024", thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg", videoUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ", videoType: "bouwupdate" as const, date: "2024-12-15", description: "Ruwbouw afgerond" },
    { id: "v2", title: "Bouwupdate Oktober 2024", thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg", videoUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ", videoType: "bouwupdate" as const, date: "2024-10-20", description: "Fundering klaar" },
    { id: "v3", title: "Start Bouw September 2024", thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg", videoUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ", videoType: "bouwupdate" as const, date: "2024-09-01", description: "Eerste werkzaamheden" },
  ] as Array<{ id: string; title: string; thumbnailUrl: string | null; videoUrl: string; videoType: "bouwupdate" | "showhouse" | "drone" | "omgeving" | "algemeen"; date: string; description: string | null }>,
  
  showcaseVideos: [
    { id: "v4", title: "Showhouse Tour", thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg", videoUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ", videoType: "showhouse" as const, date: "2024-11-10", description: "Rondleiding door het modelappartement" },
    { id: "v5", title: "Dronebeelden Locatie", thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg", videoUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ", videoType: "drone" as const, date: "2024-08-15", description: "Luchtopnames van de omgeving en bouwplaats" },
  ] as Array<{ id: string; title: string; thumbnailUrl: string | null; videoUrl: string; videoType: "bouwupdate" | "showhouse" | "drone" | "omgeving" | "algemeen"; date: string; description: string | null }>,

  // Primary videos for featured showcase section
  primaryShowcaseVideo: { id: "v4", title: "Showhouse Tour", thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg", videoUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ", videoType: "showhouse" as const, date: "2024-11-10", description: "Rondleiding door het modelappartement" } as { id: string; title: string; thumbnailUrl: string | null; videoUrl: string; videoType: "bouwupdate" | "showhouse" | "drone" | "omgeving" | "algemeen"; date: string; description: string | null } | null,
  primaryEnvironmentVideo: { id: "v6", title: "Omgeving & Locatie", thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg", videoUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ", videoType: "omgeving" as const, date: "2024-08-01", description: "Dronebeelden van de prachtige omgeving" } as { id: string; title: string; thumbnailUrl: string | null; videoUrl: string; videoType: "bouwupdate" | "showhouse" | "drone" | "omgeving" | "algemeen"; date: string; description: string | null } | null,

  // All videos for timeline display
  allVideos: [
    { id: "v1", title: "Bouwupdate December 2024", thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg", videoUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ", videoType: "bouwupdate" as const, date: "2024-12-15", description: "Ruwbouw afgerond" },
    { id: "v2", title: "Bouwupdate Oktober 2024", thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg", videoUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ", videoType: "bouwupdate" as const, date: "2024-10-20", description: "Fundering klaar" },
    { id: "v3", title: "Start Bouw September 2024", thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg", videoUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ", videoType: "bouwupdate" as const, date: "2024-09-01", description: "Eerste werkzaamheden" },
    { id: "v4", title: "Showhouse Tour", thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg", videoUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ", videoType: "showhouse" as const, date: "2024-11-10", description: "Rondleiding door het modelappartement" },
    { id: "v5", title: "Dronebeelden Locatie", thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg", videoUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ", videoType: "drone" as const, date: "2024-08-15", description: "Luchtopnames van de omgeving en bouwplaats" },
  ] as Array<{ id: string; title: string; thumbnailUrl: string | null; videoUrl: string; videoType: "bouwupdate" | "showhouse" | "drone" | "omgeving" | "algemeen"; date: string; description: string | null }>,

  timeline: [
    { id: "1", title: "Start bouw", date: "Maart 2024", status: "completed" as const, description: "Fundering gelegd" },
    { id: "2", title: "Ruwbouw", date: "September 2024", status: "completed" as const, description: "Structuur voltooid" },
    { id: "3", title: "Afwerking", date: "Maart 2025", status: "current" as const, description: "Binnenafwerking in uitvoering" },
    { id: "4", title: "Oplevering", date: "September 2025", status: "upcoming" as const, description: "Sleuteloverdracht" }
  ],

  faq: [
    {
      question: "Wat zijn de totale aankoopkosten in Spanje?",
      answer: "Bij aankoop van nieuwbouw betaalt u ongeveer 13-14% extra bovenop de koopprijs: 10% BTW (IVA), 1.5% zegelrecht (AJD), en circa 1.5-2% voor notaris, registratie en juridische begeleiding. Wij geven u vooraf een volledige kostenraming."
    },
    {
      question: "Kan ik een hypotheek krijgen als buitenlander?",
      answer: "Ja, Spaanse banken verstrekken hypotheken aan niet-residenten tot 70% van de aankoopprijs. Wij werken samen met hypotheekspecialisten die u helpen de beste voorwaarden te krijgen."
    },
    {
      question: "Hoe verloopt het aankoopproces?",
      answer: "Na keuze van uw woning tekent u een reserveringscontract (€3.000-5.000). Binnen 30 dagen volgt het koopcontract met 30% aanbetaling. Het restant betaalt u bij notariële overdracht. Wij begeleiden u door elke stap."
    },
    {
      question: "Is verhuren van mijn woning mogelijk?",
      answer: "Absoluut. De Costa Cálida is een populaire vakantiebestemming met verhuurpotentieel het hele jaar door. Wij kunnen u in contact brengen met betrouwbare verhuurbeheerders die alles regelen."
    },
    {
      question: "Wat houdt jullie begeleiding precies in?",
      answer: "Van eerste oriëntatie tot sleuteloverdracht staan wij aan uw zijde: projectselectie, bezichtigingsreizen, juridische controle, hypotheekbemiddeling, en after-sales service. U heeft één aanspreekpunt in uw eigen taal."
    }
  ],

  developer: {
    name: "Grupo Inmobiliario Costa",
    logo: "https://via.placeholder.com/150x50?text=Developer+Logo",
    experience: "25+ jaar ervaring"
  },

  // Extended fields for AI-enriched data
  aiDescription: null as {
    description: string;
    forWhom: string[];
    notForWhom: string[];
    keyFacts: string[];
  } | null,
  
  locationIntelligence: null as {
    coordinates: { lat: number; lng: number };
    nearbyAmenities: Record<string, Array<{ name: string; distance_meters: number }>>;
    note: string;
    fetchedAt?: string;
  } | null,
};

export type ProjectData = typeof dummyProjectData;
export type Unit = typeof dummyProjectData.units[0];
export type PersonaKey = "vakantie" | "investering" | "wonen";
