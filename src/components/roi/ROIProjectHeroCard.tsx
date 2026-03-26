import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, AlertCircle, MapPin, Star, User } from "lucide-react";
import { ProjectWithRental } from "@/hooks/useProjectsWithRentalData";
import { formatPrice } from "@/lib/utils";

interface ROIProjectHeroCardProps {
  project: ProjectWithRental;
}

export function ROIProjectHeroCard({ project }: ROIProjectHeroCardProps) {
  const formatPriceRange = () => {
    if (project.price_from && project.price_to && project.price_from !== project.price_to) {
      return `Vanaf ${formatPrice(project.price_from)}`;
    }
    return formatPrice(project.price_from || project.price_to || 0);
  };

  const getSourceBadge = () => {
    if (project.source === "advisor") {
      return (
        <Badge variant="secondary" className="text-xs">
          <User className="h-3 w-3 mr-1" />
          Aanbevolen door adviseur
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-xs">
        <Star className="h-3 w-3 mr-1 fill-amber-400 text-amber-400" />
        Jouw favoriet
      </Badge>
    );
  };

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-card to-muted/30">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Project Image */}
          <div className="relative w-full sm:w-48 h-40 sm:h-auto shrink-0">
            {project.featured_image ? (
              <img
                src={project.featured_image}
                alt={project.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <div className="text-muted-foreground text-sm">Geen foto</div>
              </div>
            )}
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent sm:hidden" />
          </div>

          {/* Project Info */}
          <div className="flex-1 p-4 space-y-3">
            <div className="space-y-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-lg leading-tight">{project.name}</h3>
                {getSourceBadge()}
              </div>
              
              {(project.city || project.region) && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>
                    {[project.city, project.region].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-border/50 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Prijs:</span>
                <span className="font-semibold text-primary">{formatPriceRange()}</span>
              </div>

              {project.rentalData ? (
                <div className="flex items-center gap-1.5 text-sm text-green-600">
                  <Check className="h-4 w-4" />
                  <span>
                    Huurdata beschikbaar ({project.rentalData.occupancy}% bezetting, €{project.rentalData.average_daily_rate}/nacht)
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-sm text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>Standaard verhuurwaarden gebruikt</span>
                </div>
              )}
            </div>

            {/* Tagline */}
            <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">
              "Investeer in vastgoed aan de warmste kust van Europa"
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
