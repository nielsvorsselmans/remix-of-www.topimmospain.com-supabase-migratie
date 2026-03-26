import { MapPin, Clock, ExternalLink, Home, Construction } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ViewingDocumentsGrid } from "@/components/ViewingDocumentsGrid";
import type { EnrichedViewing } from "@/hooks/useEnrichedTrips";

interface EnrichedViewingItemProps {
  viewing: EnrichedViewing;
  index: number;
}

// Calculate distance between two coordinates in km
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function EnrichedViewingItem({ viewing, index }: EnrichedViewingItemProps) {
  const hasImage = !!viewing.project_featured_image;
  const hasDocuments = viewing.documents.length > 0;

  // Check if showhouse and project locations are different
  const hasShowhouse = viewing.showhouse_latitude && viewing.showhouse_longitude;
  const hasProjectLocation = viewing.project_latitude && viewing.project_longitude;
  const hasSeparateLocations = hasShowhouse && hasProjectLocation;
  
  let distanceKm: number | null = null;
  if (hasSeparateLocations) {
    distanceKm = calculateDistance(
      viewing.showhouse_latitude!,
      viewing.showhouse_longitude!,
      viewing.project_latitude!,
      viewing.project_longitude!
    );
  }

  // Build Google Maps URL for project location
  const projectMapsUrl = hasProjectLocation 
    ? `https://www.google.com/maps?q=${viewing.project_latitude},${viewing.project_longitude}`
    : null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Project Image */}
          <div className="relative sm:w-48 h-32 sm:h-auto shrink-0">
            {hasImage ? (
              <img
                src={viewing.project_featured_image}
                alt={viewing.project_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Home className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            {/* Index Badge */}
            <div className="absolute top-2 left-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-lg">
                {index + 1}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-semibold text-base">{viewing.project_name}</h4>
                <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{viewing.time}</span>
                </div>
              </div>
            </div>

            {/* Locations Section */}
            <div className="space-y-2 bg-muted/30 rounded-lg p-3">
              {/* Showhouse Location (primary - where customer goes) */}
              {viewing.showhouse_address && (
                <div className="flex items-start gap-2">
                  <div className="flex items-center gap-1.5 min-w-fit">
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <MapPin className="h-3 w-3 text-primary-foreground" />
                    </div>
                    <span className="text-xs font-medium text-primary">Bezichtiging</span>
                  </div>
                  <div className="flex-1 flex items-center justify-between gap-2">
                    <span className="text-sm text-foreground truncate">{viewing.showhouse_address}</span>
                    {viewing.showhouse_maps_url && (
                      <a 
                        href={viewing.showhouse_maps_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-0.5 shrink-0"
                      >
                        Navigeer
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Construction Site Location (secondary - if different) */}
              {hasSeparateLocations && distanceKm && distanceKm > 0.1 && (
                <div className="flex items-start gap-2">
                  <div className="flex items-center gap-1.5 min-w-fit">
                    <div className="w-5 h-5 rounded-full bg-muted-foreground flex items-center justify-center">
                      <Construction className="h-3 w-3 text-background" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">Bouwlocatie</span>
                  </div>
                  <div className="flex-1 flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">
                      {distanceKm < 1 
                        ? `${Math.round(distanceKm * 1000)}m van showhouse` 
                        : `${distanceKm.toFixed(1)} km van showhouse`
                      }
                    </span>
                    {projectMapsUrl && (
                      <a 
                        href={projectMapsUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:underline flex items-center gap-0.5 shrink-0"
                      >
                        Bekijk
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            {(viewing.notes || viewing.showhouse_notes) && (
              <p className="text-sm text-muted-foreground italic bg-muted/50 rounded-md px-3 py-2">
                {viewing.notes || viewing.showhouse_notes}
              </p>
            )}

            {/* Documents */}
            {hasDocuments && (
              <ViewingDocumentsGrid 
                documents={viewing.documents} 
                projectName={viewing.project_name} 
              />
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" size="sm" asChild>
                <a 
                  href={`/project/${viewing.project_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Bekijk Project
                  <ExternalLink className="ml-1.5 h-3 w-3" />
                </a>
              </Button>
              {viewing.showhouse_maps_url && (
                <Button variant="ghost" size="sm" asChild>
                  <a 
                    href={viewing.showhouse_maps_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <MapPin className="mr-1.5 h-4 w-4" />
                    <span className="sm:hidden">Navigeer</span>
                    <span className="hidden sm:inline">Navigeer naar Showhouse</span>
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
