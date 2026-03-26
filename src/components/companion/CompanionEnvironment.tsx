import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Waves, Flag, ShoppingCart, Utensils, Hospital, Plane, GraduationCap, Train, Store, Anchor, MapPin } from "lucide-react";
import type { NearbyAmenity } from "@/hooks/useEnrichedTrips";

interface CompanionEnvironmentProps {
  amenities: Record<string, NearbyAmenity[]>;
}

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

const categoryEmojis: Record<string, string> = {
  stranden: "🏖️",
  golfbanen: "⛳",
  supermarkten: "🛒",
  restaurants: "🍽️",
  ziekenhuizen: "🏥",
  luchthavens: "✈️",
  scholen: "🎓",
  treinstations: "🚆",
  winkelcentra: "🏬",
  "marina's": "⚓",
};

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function getTopHighlights(amenities: Record<string, NearbyAmenity[]>): { emoji: string; label: string }[] {
  const highlights: { emoji: string; label: string; priority: number }[] = [];

  const beaches = amenities["stranden"] || [];
  if (beaches.length > 0) {
    highlights.push({ emoji: "🏖️", label: `Strand ${formatDistance(beaches[0].distance_meters)}`, priority: beaches[0].distance_meters < 2000 ? 0 : 3 });
  }

  const supermarkets = amenities["supermarkten"] || [];
  if (supermarkets.length > 0 && supermarkets[0].distance_meters < 5000) {
    highlights.push({ emoji: "🛒", label: `Supermarkt ${formatDistance(supermarkets[0].distance_meters)}`, priority: 2 });
  }

  const golf = amenities["golfbanen"] || [];
  if (golf.length > 0 && golf[0].distance_meters < 15000) {
    highlights.push({ emoji: "⛳", label: `Golf ${formatDistance(golf[0].distance_meters)}`, priority: 4 });
  }

  const airports = amenities["luchthavens"] || [];
  if (airports.length > 0) {
    const mins = Math.round(airports[0].distance_meters / 833);
    highlights.push({ emoji: "✈️", label: `Luchthaven ±${mins} min`, priority: 1 });
  }

  const restaurants = amenities["restaurants"] || [];
  if (restaurants.length > 0) {
    const nearby = restaurants.filter(r => r.distance_meters < 1000).length;
    if (nearby >= 3) {
      highlights.push({ emoji: "🍽️", label: `${nearby} restaurants <1km`, priority: 5 });
    }
  }

  return highlights.sort((a, b) => a.priority - b.priority).slice(0, 3);
}

export function CompanionEnvironment({ amenities }: CompanionEnvironmentProps) {
  const [open, setOpen] = useState(false);

  const categories = Object.entries(amenities).filter(([, items]) => items.length > 0);
  if (categories.length === 0) return null;

  const highlights = getTopHighlights(amenities);

  return (
    <div className="space-y-2">
      {/* Top highlights as badges */}
      <div className="flex flex-wrap gap-2">
        {highlights.map((h, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm font-medium"
          >
            {h.emoji} {h.label}
          </span>
        ))}
      </div>

      {/* Expandable full list */}
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1">
          <MapPin className="h-3.5 w-3.5" />
          <span>Alle voorzieningen ({categories.reduce((t, [, items]) => t + items.length, 0)})</span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>

        <CollapsibleContent className="pt-2 space-y-3">
          {categories.map(([key, items]) => {
            const Icon = categoryIcons[key] || MapPin;
            const label = categoryLabels[key] || key;
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {label}
                </div>
                <div className="pl-6 space-y-0.5">
                  {items.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex justify-between text-sm text-muted-foreground">
                      <span className="truncate mr-2">{item.name}</span>
                      <span className="shrink-0 font-medium">{formatDistance(item.distance_meters)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// Export for use in CompanionMap
export { categoryEmojis, formatDistance };
export type { NearbyAmenity };
