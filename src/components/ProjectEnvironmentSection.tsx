import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  MapPin, Waves, Flag, Hospital, ShoppingCart, Utensils,
  Plane, GraduationCap, Train, Store, Anchor, Dumbbell, Landmark,
  ChevronDown, ChevronUp, Star
} from "lucide-react";
import { PropertyMap } from "@/components/PropertyMap";
import { CityInfo } from "@/components/CityInfo";

interface NearbyAmenity {
  name: string;
  distance_meters: number;
}

interface ProjectEnvironmentSectionProps {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  projectName: string;
  nearbyAmenities: Record<string, NearbyAmenity[]> | null;
  cityDescription?: string | null;
}

// Icon mapping
const categoryIcons: Record<string, React.ElementType> = {
  stranden: Waves,
  golfbanen: Flag,
  supermarkten: ShoppingCart,
  restaurants: Utensils,
  ziekenhuizen: Hospital,
  luchthavens: Plane,
  scholen: GraduationCap,
  treinstations: Train,
  winkelcentra: Store,
  "marina's": Anchor,
  marinas: Anchor,
  sportcentra: Dumbbell,
  "cultuur & musea": Landmark,
  markten: Store,
};

const categoryLabels: Record<string, string> = {
  stranden: "Stranden",
  golfbanen: "Golfbanen",
  supermarkten: "Supermarkten",
  restaurants: "Restaurants",
  ziekenhuizen: "Ziekenhuizen",
  luchthavens: "Luchthavens",
  scholen: "Scholen",
  treinstations: "Treinstations",
  winkelcentra: "Winkelcentra",
  "marina's": "Marina's",
  marinas: "Marina's",
  sportcentra: "Sportcentra",
  "cultuur & musea": "Cultuur & Musea",
  markten: "Markten",
};

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function getDistanceColor(meters: number): string {
  if (meters < 1000) return "text-green-600 bg-green-50";
  if (meters < 5000) return "text-blue-600 bg-blue-50";
  return "text-muted-foreground bg-muted";
}

function generateHighlights(amenities: Record<string, NearbyAmenity[]>): string[] {
  const highlights: string[] = [];

  const beaches = amenities["stranden"] || [];
  if (beaches.length > 0) {
    if (beaches[0].distance_meters < 500) {
      highlights.push(`🏖️ Strand op loopafstand (${formatDistance(beaches[0].distance_meters)})`);
    } else if (beaches[0].distance_meters < 2000) {
      highlights.push(`🏖️ ${beaches[0].name} op ${formatDistance(beaches[0].distance_meters)}`);
    }
  }

  const golf = amenities["golfbanen"] || [];
  if (golf.length > 0 && golf[0].distance_meters < 15000) {
    highlights.push(`⛳ ${golf[0].name} op ${formatDistance(golf[0].distance_meters)}`);
  }

  const restaurants = amenities["restaurants"] || [];
  const nearbyRestaurants = restaurants.filter(r => r.distance_meters < 1000).length;
  if (nearbyRestaurants >= 3) {
    highlights.push(`🍽️ ${nearbyRestaurants} restaurants binnen 1km`);
  } else if (restaurants.length > 0) {
    highlights.push(`🍽️ Restaurants vanaf ${formatDistance(restaurants[0].distance_meters)}`);
  }

  const supermarkets = amenities["supermarkten"] || [];
  if (supermarkets.length > 0 && supermarkets[0].distance_meters < 3000) {
    highlights.push(`🛒 Supermarkt op ${formatDistance(supermarkets[0].distance_meters)}`);
  }

  const airports = amenities["luchthavens"] || [];
  if (airports.length > 0) {
    const airportMinutes = Math.round(airports[0].distance_meters / 833);
    highlights.push(`✈️ ${airports[0].name} ±${airportMinutes} min`);
  }

  return highlights.slice(0, 5);
}

function calculateLifestyleScore(amenities: Record<string, NearbyAmenity[]>): number {
  let score = 5;
  const beaches = amenities["stranden"] || [];
  if (beaches.length > 0 && beaches[0].distance_meters < 500) score += 2;
  else if (beaches.length > 0 && beaches[0].distance_meters < 2000) score += 1;

  const airports = amenities["luchthavens"] || [];
  if (airports.length > 0 && airports[0].distance_meters < 60000) score += 1;

  const restaurants = amenities["restaurants"] || [];
  if (restaurants.filter(r => r.distance_meters < 1000).length >= 3) score += 1;

  const hospitals = amenities["ziekenhuizen"] || [];
  if (hospitals.length > 0 && hospitals[0].distance_meters < 15000) score += 1;

  const golfbanen = amenities["golfbanen"] || [];
  if (golfbanen.length > 0 && golfbanen[0].distance_meters < 15000) score += 1;

  const supermarkets = amenities["supermarkten"] || [];
  if (supermarkets.length > 0 && supermarkets[0].distance_meters < 1000) score += 1;

  return Math.min(score, 10);
}

// Lifestyle categories for the special bottom section
const LIFESTYLE_KEYS = ["restaurants", "sportcentra", "cultuur & musea", "markten"];

function CategoryCard({ categoryKey, items }: { categoryKey: string; items: NearbyAmenity[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = categoryIcons[categoryKey] || MapPin;
  const label = categoryLabels[categoryKey] || categoryKey;

  if (items.length === 0) return null;

  const closest = items[0];
  const hasMore = items.length > 1;

  return (
    <Card className="border border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground">{label}</h4>
            <p className="text-xs text-muted-foreground">{items.length} locatie{items.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        <div className="flex justify-between items-center py-2 border-t border-border/30">
          <span className="text-sm text-foreground truncate flex-1 pr-2">{closest.name}</span>
          <Badge variant="secondary" className={`text-xs flex-shrink-0 ${getDistanceColor(closest.distance_meters)}`}>
            {formatDistance(closest.distance_meters)}
          </Badge>
        </div>

        {hasMore && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors pt-2 border-t border-border/30 mt-2">
                {isOpen ? <>Minder tonen <ChevronUp className="h-3 w-3" /></> : <>+{items.length - 1} meer <ChevronDown className="h-3 w-3" /></>}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-2 pt-2">
                {items.slice(1).map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground truncate flex-1 pr-2">{item.name}</span>
                    <Badge variant="outline" className={`text-xs flex-shrink-0 ${getDistanceColor(item.distance_meters)}`}>
                      {formatDistance(item.distance_meters)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

const INITIAL_VISIBLE = 4;

export function ProjectEnvironmentSection({
  latitude,
  longitude,
  city,
  country,
  projectName,
  nearbyAmenities,
}: ProjectEnvironmentSectionProps) {
  const [showAll, setShowAll] = useState(false);

  const amenities = nearbyAmenities || {};
  const hasAmenities = Object.keys(amenities).length > 0;
  const highlights = hasAmenities ? generateHighlights(amenities) : [];
  const lifestyleScore = hasAmenities ? calculateLifestyleScore(amenities) : 0;
  const totalAmenities = Object.values(amenities).reduce((t, arr) => t + arr.length, 0);

  // Split into core amenities and lifestyle
  const coreCategories = Object.entries(amenities)
    .filter(([key, items]) => items.length > 0 && !LIFESTYLE_KEYS.includes(key))
    .sort((a, b) => a[1][0].distance_meters - b[1][0].distance_meters);

  const lifestyleCategories = Object.entries(amenities)
    .filter(([key, items]) => items.length > 0 && LIFESTYLE_KEYS.includes(key))
    .sort((a, b) => a[1][0].distance_meters - b[1][0].distance_meters);

  const visibleCore = coreCategories.slice(0, INITIAL_VISIBLE);
  const hiddenCore = coreCategories.slice(INITIAL_VISIBLE);

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-3">
          <MapPin className="w-6 h-6 text-primary" />
          Locatie & Omgeving
        </h2>
        <p className="text-muted-foreground">
          Ontdek de omgeving van {projectName} in {city}
        </p>
      </div>

      {/* Map + Amenities Grid */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Map */}
        <div>
          <PropertyMap latitude={latitude} longitude={longitude} title={city} />
        </div>

        {/* Right: Highlights + Core Amenities */}
        <div className="space-y-6">
          {/* Lifestyle Score */}
          {hasAmenities && lifestyleScore > 0 && (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Lifestyle Score</p>
                    <p className="text-3xl font-bold text-primary">{lifestyleScore}/10</p>
                  </div>
                  <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                    <Star className="h-7 w-7 text-primary fill-primary" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Gebaseerd op {totalAmenities} nabije voorzieningen
                </p>
              </CardContent>
            </Card>
          )}

          {/* Smart Highlights */}
          {highlights.length > 0 && (
            <Card className="border border-border/50">
              <CardContent className="p-5">
                <h3 className="font-semibold text-foreground mb-3">Highlights</h3>
                <div className="space-y-2">
                  {highlights.map((h, i) => (
                    <p key={i} className="text-sm text-muted-foreground">{h}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Core Amenities Grid */}
          {visibleCore.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {visibleCore.map(([key, items]) => (
                <CategoryCard key={key} categoryKey={key} items={items} />
              ))}
            </div>
          )}

          {/* Show more core categories */}
          {hiddenCore.length > 0 && (
            <>
              {showAll && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {hiddenCore.map(([key, items]) => (
                    <CategoryCard key={key} categoryKey={key} items={items} />
                  ))}
                </div>
              )}
              <Button variant="outline" className="w-full" onClick={() => setShowAll(!showAll)}>
                {showAll ? (
                  <><ChevronUp className="h-4 w-4 mr-2" />Minder weergeven</>
                ) : (
                  <><ChevronDown className="h-4 w-4 mr-2" />+{hiddenCore.length} categorieën weergeven</>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* CityInfo - AI generated description */}
      <CityInfo city={city} country={country} />

      {/* Lifestyle & Vrije Tijd Section */}
      {lifestyleCategories.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
            🎯 Lifestyle & Vrije Tijd
          </h3>
          <p className="text-muted-foreground text-sm">
            Restaurants, sport, cultuur en markten in de buurt van {city}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lifestyleCategories.map(([key, items]) => (
              <CategoryCard key={key} categoryKey={key} items={items} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
