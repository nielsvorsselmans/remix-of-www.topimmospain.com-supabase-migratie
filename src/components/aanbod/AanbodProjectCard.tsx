import { Link } from "react-router-dom";
import { Heart, MapPin, Bed, Bath, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useIsFavorite, useToggleFavorite } from "@/hooks/useFavorites";
import { formatPrice, translatePropertyType } from "@/lib/utils";
import { isProjectSoldOut } from "@/lib/selection-utils";

interface AanbodProject {
  id: string;
  name: string;
  display_title?: string;
  city?: string | null;
  location?: string | null;
  featured_image?: string | null;
  price_from?: number | null;
  price_to?: number | null;
  availableCount?: number;
  available_count?: number;
  property_types?: string[];
  propertyTypes?: string[];
  min_bedrooms?: number | null;
  max_bedrooms?: number | null;
  min_bathrooms?: number | null;
  max_bathrooms?: number | null;
  min_area?: number | null;
  max_area?: number | null;
  has_pool?: boolean;
  is_resale?: boolean;
  status?: string | null;
}

interface AanbodProjectCardProps {
  project: AanbodProject;
}

export function AanbodProjectCard({ project }: AanbodProjectCardProps) {
  const { user } = useAuth();
  const { data: isFavorite } = useIsFavorite(project.id);
  const toggleFavorite = useToggleFavorite();

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    toggleFavorite.mutate(project.id);
  };

  const displayLocation = project.location || project.city || "Spanje";
  const minPrice = project.price_from ? Number(project.price_from) : 0;
  const displayTitle = project.display_title || project.name;
  const availableCount = project.available_count ?? project.availableCount ?? 0;
  const isSoldOut = isProjectSoldOut(project) || availableCount === 0;

  // Property types
  const rawTypes = project.property_types || project.propertyTypes || [];
  const uniqueTypes = [...new Set(rawTypes.map(t => t.toLowerCase()))];
  const translatedTypes = uniqueTypes.map(t => translatePropertyType(t));

  // Specs
  const minBed = project.min_bedrooms ?? 0;
  const maxBed = project.max_bedrooms ?? 0;
  const minBath = project.min_bathrooms ?? 0;
  const maxBath = project.max_bathrooms ?? 0;
  const minArea = project.min_area ?? 0;
  const maxArea = project.max_area ?? 0;

  const bedLabel = minBed === 0 && maxBed === 0
    ? null
    : minBed === maxBed ? `${minBed}` : `${minBed}-${maxBed}`;

  const bathLabel = minBath === 0 && maxBath === 0
    ? null
    : minBath === maxBath ? `${minBath}` : `${minBath}-${maxBath}`;

  const areaLabel = minArea === 0 && maxArea === 0
    ? null
    : minArea === maxArea ? `${minArea}m²` : `${minArea}-${maxArea}m²`;

  return (
    <Link to={`/dashboard/project/${project.id}`} className="block group">
      <div className="rounded-xl overflow-hidden border bg-card shadow-sm hover:shadow-md transition-shadow duration-300 h-full flex flex-col">
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={project.featured_image || "/placeholder.svg"}
            alt={project.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          {/* Type badges top-left */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1">
            {project.is_resale && (
              <Badge className="bg-amber-100 text-amber-800 text-[11px]">Herverkoop</Badge>
            )}
            {translatedTypes.slice(0, 2).map((type, i) => (
              <Badge key={i} className="bg-background/90 text-foreground text-[11px]">
                {type}
              </Badge>
            ))}
          </div>
          {/* Favorite button top-right */}
          <Button
            size="icon"
            variant="secondary"
            className="absolute top-3 right-3 rounded-full shadow-md h-8 w-8"
            onClick={handleFavoriteClick}
          >
            <Heart
              className={`h-4 w-4 ${isFavorite ? "fill-primary text-primary" : ""}`}
            />
          </Button>
        </div>

        <div className="p-4 flex flex-col flex-grow">
          <h3 className="font-semibold text-base line-clamp-1 mb-1">{displayTitle}</h3>
          <div className="flex items-center gap-1.5 text-muted-foreground text-sm mb-2">
            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="line-clamp-1">{displayLocation}</span>
          </div>

          {/* Specs row */}
          {(bedLabel || bathLabel || areaLabel) && (
            <div className="flex items-center gap-3 text-muted-foreground text-xs mb-3">
              {bedLabel && (
                <span className="flex items-center gap-1">
                  <Bed className="h-3.5 w-3.5 text-primary" />
                  {bedLabel}
                </span>
              )}
              {bathLabel && (
                <span className="flex items-center gap-1">
                  <Bath className="h-3.5 w-3.5 text-primary" />
                  {bathLabel}
                </span>
              )}
              {areaLabel && (
                <span className="flex items-center gap-1">
                  <Home className="h-3.5 w-3.5 text-primary" />
                  {areaLabel}
                </span>
              )}
            </div>
          )}

          {/* Price + availability */}
          <div className="mt-auto">
            {isSoldOut ? (
              <p className="text-lg font-bold text-destructive">Uitverkocht</p>
            ) : (
              <div className="flex items-end justify-between gap-2">
                <p className="text-lg font-bold text-primary">
                  {minPrice > 0 ? `Vanaf ${formatPrice(minPrice)}` : "Prijs op aanvraag"}
                </p>
                {availableCount > 0 && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {availableCount} beschikbaar
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
