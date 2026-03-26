import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Home, Bed, Bath, Heart } from "lucide-react";
import { translatePropertyType, generatePropertyTitle, formatPrice } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useIsFavorite, useToggleFavorite } from "@/hooks/useFavorites";
import { Button } from "@/components/ui/button";

interface Project {
  id: string;
  name: string;
  display_title?: string;
  city?: string | null;
  location?: string | null;
  featured_image?: string | null;
  price_from?: number | null;
  price_to?: number | null;
  region?: string | null;
  propertyTypes: string[];
  totalCount: number;
  availableCount: number;
  minBedrooms: number;
  maxBedrooms: number;
  minBathrooms: number;
  maxBathrooms: number;
  minArea: number;
  maxArea: number;
  is_resale?: boolean;
}

interface ProjectCardProps {
  project: Project;
  inPortal?: boolean;
}

export const ProjectCard = ({ project, inPortal = false }: ProjectCardProps) => {
  const { user } = useAuth();
  const { data: isFavorite } = useIsFavorite(project.id);
  const toggleFavorite = useToggleFavorite();


  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      window.location.href = "/auth?tab=login";
      return;
    }
    
    toggleFavorite.mutate(project.id);
  };


  const displayLocation = project.location || project.city || "Spanje";
  const minPrice = project.price_from ? Number(project.price_from) : 0;
  const maxPrice = project.price_to ? Number(project.price_to) : minPrice;
  const displayTitle = project.display_title || 
    (project.propertyTypes.length > 0 && project.city 
      ? generatePropertyTitle(project.propertyTypes, project.city) 
      : project.name);
  
  // Normalize property types to lowercase and remove duplicates, then translate
  const uniquePropertyTypes = [...new Set(project.propertyTypes.map(t => t.toLowerCase()))];
  const translatedTypes = uniquePropertyTypes.map(type => translatePropertyType(type));

  const projectUrl = inPortal ? `/dashboard/project/${project.id}` : `/project/${project.id}`;

  return (
    <Link to={projectUrl}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 h-full flex flex-col">
        <CardHeader className="p-0">
          <div className="relative h-64 overflow-hidden">
            <img
              src={project.featured_image || "/placeholder.svg"}
              alt={project.name}
              width={400}
              height={256}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              loading="lazy"
            />
            <div className="absolute top-4 left-4 flex flex-wrap gap-1">
              {project.is_resale && (
                <Badge className="bg-amber-100 text-amber-800">
                  Herverkoop
                </Badge>
              )}
              {translatedTypes.map((type, index) => (
                <Badge key={index} className="bg-background/90 text-foreground">
                  {type}
                </Badge>
              ))}
            </div>
            <Button
              size="icon"
              variant="secondary"
              className="absolute top-4 right-4 rounded-full shadow-lg"
              onClick={handleFavoriteClick}
            >
              <Heart
                className={`h-4 w-4 ${isFavorite ? "fill-primary text-primary" : ""}`}
              />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 flex-grow">
          <h3 className="text-xl font-semibold mb-4">{displayTitle}</h3>
          
          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm">{displayLocation}</span>
          </div>

          <div className="mb-6">
            {project.availableCount === 0 ? (
              <p className="text-3xl font-bold text-destructive">UITVERKOCHT</p>
            ) : (
              <p className="text-3xl font-bold text-primary">
                {minPrice > 0 && maxPrice > 0
                  ? (minPrice === maxPrice
                      ? `Vanaf ${formatPrice(minPrice)}`
                      : `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`)
                  : "Prijs op aanvraag"}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Bed className="h-4 w-4 text-primary" />
              <span>
                {project.minBedrooms === 0 && project.maxBedrooms === 0
                  ? "N.t.b."
                  : project.minBedrooms === project.maxBedrooms 
                  ? `${project.minBedrooms} slaapkamer${project.minBedrooms !== 1 ? 's' : ''}`
                  : `${project.minBedrooms} - ${project.maxBedrooms} slaapkamers`
                }
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Bath className="h-4 w-4 text-primary" />
              <span>
                {project.minBathrooms === 0 && project.maxBathrooms === 0
                  ? "N.t.b."
                  : project.minBathrooms === project.maxBathrooms 
                  ? `${project.minBathrooms} badkamer${project.minBathrooms !== 1 ? 's' : ''}`
                  : `${project.minBathrooms} - ${project.maxBathrooms} badkamers`
                }
              </span>
            </div>

            {(project.minArea > 0 || project.maxArea > 0) && (
              <div className="flex items-center gap-2 text-sm">
                <Home className="h-4 w-4 text-primary" />
                <span>
                  {project.minArea === project.maxArea 
                    ? `${project.minArea}m²`
                    : `${project.minArea} - ${project.maxArea}m²`
                  }
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
