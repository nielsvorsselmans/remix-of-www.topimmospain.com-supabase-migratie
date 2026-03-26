import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, Bed, Maximize, ArrowRight, Building2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExternalListingAssignment } from "@/hooks/useExternalListings";

const formatPrice = (price: number | null) => {
  if (!price) return null;
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price);
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "interested": return "Interessant";
    case "to_visit": return "Wil bezoeken";
    case "visited": return "Bezocht";
    case "rejected": return "Afgewezen";
    default: return "Te beoordelen";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "interested": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "to_visit": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "visited": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "rejected": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default: return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
  }
};

interface ExternalListingCardProps {
  assignment: ExternalListingAssignment;
}

export function ExternalListingCard({ assignment }: ExternalListingCardProps) {
  const [imgError, setImgError] = useState(false);
  const listing = assignment.external_listing;
  if (!listing) return null;

  const thumbnail = listing.images?.[0];
  const locationText = [listing.city, listing.region].filter(Boolean).join(", ");
  const feat = (listing.features || {}) as Record<string, any>;

  return (
    <Link to={`/dashboard/extern/${listing.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            {/* Thumbnail */}
            <div className="sm:w-48 h-40 sm:h-auto relative flex-shrink-0">
              {thumbnail && !imgError ? (
                <img
                  src={thumbnail}
                  alt={listing.title || ""}
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Building2 className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
              <Badge className="absolute top-2 left-2 bg-white/90 dark:bg-black/70 text-foreground border-0 text-[10px]">
                <Globe className="h-2.5 w-2.5 mr-1" />
                Extern
              </Badge>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 flex flex-col justify-between gap-2">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-sm line-clamp-1">
                    {listing.title || "Extern pand"}
                  </h3>
                  <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 flex-shrink-0 ${getStatusColor(assignment.status)}`}>
                    {getStatusLabel(assignment.status)}
                  </Badge>
                </div>
                {locationText && (
                  <p className="text-xs text-muted-foreground mb-2">{locationText}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  {listing.price && <span className="font-semibold text-foreground">{formatPrice(listing.price)}</span>}
                  {listing.bedrooms && (
                    <span className="flex items-center gap-1">
                      <Bed className="h-3 w-3" /> {listing.bedrooms}
                    </span>
                  )}
                  {listing.area_sqm && (
                    <span className="flex items-center gap-1">
                      <Maximize className="h-3 w-3" /> {listing.area_sqm}m²
                    </span>
                  )}
                  {feat.energy_rating && (
                    <Badge variant="secondary" className={cn(
                      "text-[9px] px-1.5 py-0 h-4",
                      feat.energy_rating === 'A' && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                      feat.energy_rating === 'B' && "bg-green-50 text-green-700 dark:bg-green-900/50 dark:text-green-300",
                      (feat.energy_rating === 'C' || feat.energy_rating === 'D') && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
                    )}>
                      <Zap className="h-2.5 w-2.5 mr-0.5" />{feat.energy_rating}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  Bekijken <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
