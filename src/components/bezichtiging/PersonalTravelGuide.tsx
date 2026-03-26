import { useMyTravelGuide, type GroupedCategory, type TravelGuidePOI } from "@/hooks/useMyTravelGuide";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import {
  Compass,
  Waves,
  UtensilsCrossed,
  ShoppingBag,
  Store,
  Heart,
  Anchor,
  Landmark,
  Sparkles,
  Users,
  Wrench,
  MapPin,
  Star,
  ChevronDown,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { useState } from "react";

// Map icon string from DB to lucide component
const iconMap: Record<string, React.ElementType> = {
  Waves,
  UtensilsCrossed,
  ShoppingBag,
  Store,
  Heart,
  Anchor,
  Landmark,
  Sparkles,
  Users,
  Wrench,
  MapPin,
  Compass,
  Star,
};

function getCategoryIcon(iconName: string) {
  return iconMap[iconName] || MapPin;
}

function RatingStars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: full }).map((_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-current" />
      ))}
      {half && <Star className="h-3.5 w-3.5 fill-current opacity-50" />}
      <span className="text-xs text-muted-foreground ml-1">{rating.toFixed(1)}</span>
    </span>
  );
}

function POICard({ poi }: { poi: TravelGuidePOI }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{poi.name}</span>
          {poi.is_recommended && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              <Heart className="h-3 w-3 mr-1 fill-current text-rose-500" />
              Aanrader
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{poi.municipality}</p>
        {poi.rating && <div className="mt-1"><RatingStars rating={poi.rating} /></div>}
        {poi.custom_note && (
          <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
            <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
            <span className="italic">{poi.custom_note}</span>
          </div>
        )}
      </div>
      {poi.google_maps_url && (
        <a
          href={poi.google_maps_url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title="Open in Google Maps"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}

function CategorySection({ category, defaultOpen }: { category: GroupedCategory; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = getCategoryIcon(category.icon);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-accent/50 transition-colors group">
        <div className="flex items-center gap-2.5">
          <div className="rounded-md bg-primary/10 p-1.5">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <span className="font-medium text-sm">{category.name}</span>
          <span className="text-xs text-muted-foreground">({category.pois.length})</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-2 pl-2 pr-1 pb-2">
          {category.pois.map((poi) => (
            <POICard key={poi.id} poi={poi} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function PersonalTravelGuide() {
  const { data: guide, isLoading } = useMyTravelGuide();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // No guide at all — show soft empty state
  if (!guide) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Compass className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Ontdek de omgeving</h3>
              <p className="text-sm text-muted-foreground">
                We stellen een persoonlijke reisgids samen met onze favoriete plekken in de omgeving — 
                van de beste restaurants tot de mooiste stranden. Deze verschijnt hier zodra je reis concreter wordt.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Guide exists but no POIs yet
  if (guide.categories.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Compass className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Je reisgids wordt samengesteld</h3>
              <p className="text-sm text-muted-foreground">
                We selecteren de beste plekken in de omgeving speciaal voor jou. 
                Binnenkort vind je hier onze persoonlijke tips.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Introduction */}
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Compass className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Ontdek de omgeving</h2>
          <p className="text-sm text-muted-foreground">
            {guide.intro_text || 
              "Naast de bezichtigingen hebben we een persoonlijke selectie gemaakt van plekken die je zeker moet ontdekken — van de beste restaurants tot de mooiste stranden."}
          </p>
        </div>
      </div>

      {/* Categories */}
      <Card>
        <CardContent className="p-2 divide-y">
          {guide.categories.map((category, index) => (
            <CategorySection
              key={category.name}
              category={category}
              defaultOpen={index < 3}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
