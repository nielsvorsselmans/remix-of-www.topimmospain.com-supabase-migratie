import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Plane, Waves, Flag, Hospital, Star, MapPin, 
  ShoppingCart, Utensils, GraduationCap, Train, 
  Store, Anchor, ChevronDown, ChevronUp 
} from "lucide-react";
import { LocationMap } from "./LocationMap";

interface NearbyAmenity {
  name: string;
  distance_meters: number;
}

interface LocationSectionProps {
  location: string;
  region: string;
  coordinates: { lat: number; lng: number } | null;
  nearbyAmenities: Record<string, NearbyAmenity[]>;
  lifestyleScore: number;
  projectName: string;
}

// Icon mapping for categories
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
};

// Display names for categories
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
};

// Format distance for display
function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

// Get distance color based on proximity
function getDistanceColor(meters: number): string {
  if (meters < 1000) return "text-green-600 bg-green-50"; // Walking distance
  if (meters < 5000) return "text-blue-600 bg-blue-50"; // Cycling distance
  return "text-muted-foreground bg-muted"; // Driving distance
}

// Generate smart highlights from amenities
function generateHighlights(amenities: Record<string, NearbyAmenity[]>): string[] {
  const highlights: string[] = [];
  
  // Beach highlight
  const beaches = amenities["stranden"] || [];
  if (beaches.length > 0) {
    const closest = beaches[0];
    if (closest.distance_meters < 500) {
      highlights.push(`🏖️ Strand op loopafstand (${formatDistance(closest.distance_meters)})`);
    } else if (closest.distance_meters < 2000) {
      highlights.push(`🏖️ ${closest.name} op ${formatDistance(closest.distance_meters)}`);
    }
  }
  
  // Golf highlight
  const golf = amenities["golfbanen"] || [];
  if (golf.length > 0 && golf[0].distance_meters < 15000) {
    highlights.push(`⛳ ${golf[0].name} op ${formatDistance(golf[0].distance_meters)}`);
  }
  
  // Restaurant highlight
  const restaurants = amenities["restaurants"] || [];
  const nearbyRestaurants = restaurants.filter(r => r.distance_meters < 1000).length;
  if (nearbyRestaurants >= 3) {
    highlights.push(`🍽️ ${nearbyRestaurants} restaurants binnen 1km`);
  } else if (restaurants.length > 0) {
    highlights.push(`🍽️ Restaurants vanaf ${formatDistance(restaurants[0].distance_meters)}`);
  }
  
  // Supermarket highlight
  const supermarkets = amenities["supermarkten"] || [];
  if (supermarkets.length > 0 && supermarkets[0].distance_meters < 3000) {
    highlights.push(`🛒 Supermarkt op ${formatDistance(supermarkets[0].distance_meters)}`);
  }
  
  // Airport highlight
  const airports = amenities["luchthavens"] || [];
  if (airports.length > 0) {
    const airportMinutes = Math.round(airports[0].distance_meters / 833); // ~50km/h
    highlights.push(`✈️ ${airports[0].name} ±${airportMinutes} min`);
  }
  
  return highlights.slice(0, 4);
}

// Count total amenities
function countTotalAmenities(amenities: Record<string, NearbyAmenity[]>): number {
  return Object.values(amenities).reduce((total, items) => total + items.length, 0);
}

// Category card component with visual styling
function CategoryCard({ 
  categoryKey, 
  items 
}: { 
  categoryKey: string; 
  items: NearbyAmenity[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = categoryIcons[categoryKey] || MapPin;
  const label = categoryLabels[categoryKey] || categoryKey;
  
  if (items.length === 0) return null;
  
  const closest = items[0];
  const hasMore = items.length > 1;
  
  return (
    <Card className="border border-border/50">
      <CardContent className="p-4">
        {/* Header met icon en categorie */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground">{label}</h4>
            <p className="text-xs text-muted-foreground">{items.length} locatie{items.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        
        {/* Dichtstbijzijnde locatie */}
        <div className="flex justify-between items-center py-2 border-t border-border/30">
          <span className="text-sm text-foreground truncate flex-1 pr-2">{closest.name}</span>
          <Badge 
            variant="secondary" 
            className={`text-xs flex-shrink-0 ${getDistanceColor(closest.distance_meters)}`}
          >
            {formatDistance(closest.distance_meters)}
          </Badge>
        </div>
        
        {/* Meer locaties (collapsible) */}
        {hasMore && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors pt-2 border-t border-border/30 mt-2">
                {isOpen ? (
                  <>Minder tonen <ChevronUp className="h-3 w-3" /></>
                ) : (
                  <>+{items.length - 1} meer <ChevronDown className="h-3 w-3" /></>
                )}
              </button>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="space-y-2 pt-2">
                {items.slice(1).map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground truncate flex-1 pr-2">{item.name}</span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs flex-shrink-0 ${getDistanceColor(item.distance_meters)}`}
                    >
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

const INITIAL_VISIBLE_CATEGORIES = 4;

export function LocationSection({ 
  location, 
  region,
  coordinates, 
  nearbyAmenities, 
  lifestyleScore,
  projectName 
}: LocationSectionProps) {
  const [showAllCategories, setShowAllCategories] = useState(false);
  
  const highlights = generateHighlights(nearbyAmenities);
  const totalAmenities = countTotalAmenities(nearbyAmenities);
  const hasData = totalAmenities > 0;
  
  // Get active categories (those with data), sorted by closest distance
  const activeCategories = Object.entries(nearbyAmenities)
    .filter(([_, items]) => items.length > 0)
    .sort((a, b) => a[1][0].distance_meters - b[1][0].distance_meters);
  
  // Split categories into visible and hidden
  const visibleCategories = activeCategories.slice(0, INITIAL_VISIBLE_CATEGORIES);
  const hiddenCategories = activeCategories.slice(INITIAL_VISIBLE_CATEGORIES);
  const hasMoreCategories = hiddenCategories.length > 0;

  return (
    <section id="location-section" className="py-20 md:py-28">
      <div className="container mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
            Locatie & Lifestyle
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {location} – waar comfort en convenience samenkomen
          </p>
        </div>

        <div className="flex flex-col-reverse lg:grid lg:grid-cols-2 gap-8 items-stretch lg:items-start">
          {/* Left: Stats & Categories */}
          <div className="space-y-6">
            {/* Lifestyle Score */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Lifestyle Score</p>
                    <p className="text-4xl font-bold text-primary">{lifestyleScore}/10</p>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <Star className="h-8 w-8 text-primary fill-primary" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  {hasData 
                    ? `Gebaseerd op ${totalAmenities} nabije voorzieningen`
                    : "Gebaseerd op voorzieningen, bereikbaarheid en levenskwaliteit"
                  }
                </p>
              </CardContent>
            </Card>

            {/* Smart Highlights */}
            {highlights.length > 0 && (
              <Card className="border border-border/50">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground mb-4">Highlights</h3>
                  <div className="space-y-3">
                    {highlights.map((highlight, index) => (
                      <p key={index} className="text-sm text-muted-foreground">
                        {highlight}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Categories Grid */}
            {hasData && (
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">
                  Alle voorzieningen
                </h3>
                
                {/* Altijd zichtbare categorieën */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {visibleCategories.map(([key, items]) => (
                    <CategoryCard key={key} categoryKey={key} items={items} />
                  ))}
                </div>
                
                {/* Verborgen categorieën (collapsible) */}
                {hasMoreCategories && (
                  <>
                    {showAllCategories && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {hiddenCategories.map(([key, items]) => (
                          <CategoryCard key={key} categoryKey={key} items={items} />
                        ))}
                      </div>
                    )}
                    
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowAllCategories(!showAllCategories)}
                    >
                      {showAllCategories ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-2" />
                          Minder weergeven
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-2" />
                          +{hiddenCategories.length} categorieën weergeven
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Location Tags */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-sm">
                <MapPin className="h-3 w-3 mr-1" />
                {region}
              </Badge>
              <Badge variant="secondary" className="text-sm">
                Costa Cálida
              </Badge>
              <Badge variant="secondary" className="text-sm">
                Mar Menor
              </Badge>
              <Badge variant="secondary" className="text-sm">
                320 dagen zon/jaar
              </Badge>
            </div>
          </div>

          {/* Right: Interactive Map */}
          <div className="w-full h-[400px] lg:h-[600px]">
            <LocationMap 
              coordinates={coordinates}
              projectName={projectName}
              location={location}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
