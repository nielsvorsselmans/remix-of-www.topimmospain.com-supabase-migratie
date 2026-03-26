import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatCurrency } from "@/lib/utils";
import { PropertyMap } from "@/components/PropertyMap";
import {
  Bed,
  Bath,
  Users,
  MapPin,
  Star,
  Calendar,
  ExternalLink,
  Zap,
  Moon,
  Home,
  TrendingUp,
  TrendingDown,
  Minus,
  Wifi,
  Waves,
  UtensilsCrossed,
  Snowflake,
  Car,
  Dumbbell,
  Tv,
  Wind,
  ChefHat,
  WashingMachine,
  Coffee,
  TreePine,
  Eye,
  Check,
  ChevronDown,
} from "lucide-react";

// Extended Comparable interface with all AirROI data
export interface ComparableDetail {
  id: string;
  name: string;
  cover_photo_url: string | null;
  listing_type?: string | null;
  room_type?: string | null;
  photos_count?: number | null;
  airbnb_url?: string | null;

  // Property Details
  bedrooms: number;
  bathrooms: number;
  guests: number;
  beds?: number | null;
  registration?: boolean | null;
  amenities: string[];

  // Revenue / Performance - TTM
  revenue: {
    monthly_avg: number;
    annual: number;
    currency: string;
  };
  occupancy: {
    rate: number;
    available_days?: number | null;
    days_reserved?: number | null;
  };
  pricing: {
    avg_nightly_rate: number;
    cleaning_fee?: number | null;
    extra_guest_fee?: number | null;
  };

  // Performance - L90D
  l90d?: {
    revenue?: number | null;
    avg_rate?: number | null;
    occupancy?: number | null;
  } | null;

  // Ratings
  ratings?: {
    overall?: number | null;
    num_reviews?: number | null;
    accuracy?: number | null;
    checkin?: number | null;
    cleanliness?: number | null;
    communication?: number | null;
    location?: number | null;
    value?: number | null;
  } | null;

  // Booking Settings
  booking?: {
    instant_book?: boolean | null;
    min_nights?: number | null;
    cancellation_policy?: string | null;
  };

  // Host Info
  host?: {
    name?: string;
    superhost?: boolean;
    professional?: boolean;
  } | null;

  // Location
  location: {
    city: string;
    region?: string | null;
    country?: string | null;
    distance_km: number;
    latitude: number | null;
    longitude: number | null;
  };
}

interface ComparableDetailDialogProps {
  comparable: ComparableDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Map amenity strings to icons and labels
const amenityConfig: Record<string, { icon: React.ReactNode; label: string }> = {
  wifi: { icon: <Wifi className="w-4 h-4" />, label: "Wifi" },
  pool: { icon: <Waves className="w-4 h-4" />, label: "Zwembad" },
  kitchen: { icon: <UtensilsCrossed className="w-4 h-4" />, label: "Keuken" },
  air_conditioning: { icon: <Snowflake className="w-4 h-4" />, label: "Airco" },
  parking: { icon: <Car className="w-4 h-4" />, label: "Parking" },
  gym: { icon: <Dumbbell className="w-4 h-4" />, label: "Gym" },
  tv: { icon: <Tv className="w-4 h-4" />, label: "TV" },
  heating: { icon: <Wind className="w-4 h-4" />, label: "Verwarming" },
  washer: { icon: <WashingMachine className="w-4 h-4" />, label: "Wasmachine" },
  dryer: { icon: <Wind className="w-4 h-4" />, label: "Droger" },
  hot_tub: { icon: <Waves className="w-4 h-4" />, label: "Jacuzzi" },
  bbq: { icon: <ChefHat className="w-4 h-4" />, label: "BBQ" },
  coffee_maker: { icon: <Coffee className="w-4 h-4" />, label: "Koffiezetapparaat" },
  garden: { icon: <TreePine className="w-4 h-4" />, label: "Tuin" },
  terrace: { icon: <Eye className="w-4 h-4" />, label: "Terras" },
  balcony: { icon: <Eye className="w-4 h-4" />, label: "Balkon" },
  sea_view: { icon: <Eye className="w-4 h-4" />, label: "Zeezicht" },
};

const MAX_VISIBLE_AMENITIES = 10;

function RatingBar({ label, value }: { label: string; value?: number | null }) {
  if (value === null || value === undefined) return null;
  const percentage = (value / 5) * 100;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value.toFixed(1)}</span>
      </div>
      <Progress value={percentage} className="h-1.5" />
    </div>
  );
}

function TrendIndicator({ current, l90d }: { current: number; l90d?: number | null }) {
  if (l90d === null || l90d === undefined) return null;
  
  const diff = current - l90d;
  const percentChange = l90d !== 0 ? ((diff / l90d) * 100).toFixed(0) : 0;
  
  if (Math.abs(diff) < 1) {
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  }
  
  if (diff > 0) {
    return (
      <span className="flex items-center gap-1 text-green-600 text-xs">
        <TrendingUp className="h-3 w-3" />
        +{percentChange}%
      </span>
    );
  }
  
  return (
    <span className="flex items-center gap-1 text-red-500 text-xs">
      <TrendingDown className="h-3 w-3" />
      {percentChange}%
    </span>
  );
}

export function ComparableDetailDialog({
  comparable,
  open,
  onOpenChange,
}: ComparableDetailDialogProps) {
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  
  if (!comparable) return null;

  // Use airbnb_url from API if available, fallback to constructed URL
  const airbnbUrl = comparable.airbnb_url || (
    comparable.id && !comparable.id.startsWith('comp-') 
      ? `https://www.airbnb.com/rooms/${comparable.id}`
      : null
  );

  const hasValidDistance = comparable.location.distance_km > 0;
  const hasValidCoordinates = comparable.location.latitude && comparable.location.longitude;
  
  // Determine grid columns based on whether distance should be shown
  const specGridCols = hasValidDistance ? "grid-cols-4" : "grid-cols-3";

  const visibleAmenities = showAllAmenities 
    ? comparable.amenities 
    : comparable.amenities.slice(0, MAX_VISIBLE_AMENITIES);
  const hiddenAmenitiesCount = comparable.amenities.length - MAX_VISIBLE_AMENITIES;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-start gap-4">
            {/* Photo */}
            <div className="flex-shrink-0">
              {comparable.cover_photo_url ? (
                <img
                  src={comparable.cover_photo_url}
                  alt={comparable.name}
                  className="w-24 h-24 rounded-lg object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
              ) : (
                <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center">
                  <Home className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Title and badges */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg leading-tight line-clamp-2">
                {comparable.name}
              </h3>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {comparable.host?.superhost && (
                  <Badge variant="secondary" className="text-xs">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Superhost
                  </Badge>
                )}
                {comparable.host?.professional && (
                  <Badge variant="outline" className="text-xs">
                    Professional
                  </Badge>
                )}
                {comparable.listing_type && (
                  <Badge variant="outline" className="text-xs">
                    {comparable.listing_type}
                  </Badge>
                )}
                {comparable.location.city && (
                  <Badge variant="outline" className="text-xs">
                    <MapPin className="h-3 w-3 mr-1" />
                    {comparable.location.city}
                  </Badge>
                )}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Two-column layout for desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Column - Property Specs */}
            <div className="space-y-4">
              {/* Property Specs */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Woning Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`grid ${specGridCols} gap-2`}>
                    <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
                      <Bed className="h-4 w-4 text-muted-foreground mb-1" />
                      <span className="text-base font-semibold">{comparable.bedrooms}</span>
                      <span className="text-[10px] text-muted-foreground">Slaapkamers</span>
                    </div>
                    <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
                      <Bath className="h-4 w-4 text-muted-foreground mb-1" />
                      <span className="text-base font-semibold">{comparable.bathrooms}</span>
                      <span className="text-[10px] text-muted-foreground">Badkamers</span>
                    </div>
                    <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
                      <Users className="h-4 w-4 text-muted-foreground mb-1" />
                      <span className="text-base font-semibold">{comparable.guests}</span>
                      <span className="text-[10px] text-muted-foreground">Gasten</span>
                    </div>
                    {hasValidDistance && (
                      <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
                        <MapPin className="h-4 w-4 text-muted-foreground mb-1" />
                        <span className="text-base font-semibold">{comparable.location.distance_km.toFixed(1)}</span>
                        <span className="text-[10px] text-muted-foreground">km afstand</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Location Map */}
              {hasValidCoordinates && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      Locatie
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-hidden rounded-b-lg">
                    <div className="h-48">
                      <PropertyMap 
                        latitude={comparable.location.latitude!}
                        longitude={comparable.location.longitude!}
                        title={comparable.name}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Performance */}
            <div className="space-y-4">
              {/* Performance Metrics */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Performance (TTM)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Jaaropbrengst</p>
                      <p className="text-lg font-bold text-primary">
                        {formatCurrency(comparable.revenue.annual, 0)}
                      </p>
                      {comparable.l90d?.revenue && (
                        <TrendIndicator 
                          current={comparable.revenue.annual / 4}
                          l90d={comparable.l90d.revenue} 
                        />
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Nachtprijs</p>
                      <p className="text-lg font-bold">
                        €{Math.round(comparable.pricing.avg_nightly_rate)}
                      </p>
                      {comparable.l90d?.avg_rate && (
                        <TrendIndicator 
                          current={comparable.pricing.avg_nightly_rate} 
                          l90d={comparable.l90d.avg_rate} 
                        />
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Bezetting</p>
                      <p className="text-lg font-bold">{comparable.occupancy.rate}%</p>
                      {comparable.l90d?.occupancy && (
                        <TrendIndicator 
                          current={comparable.occupancy.rate} 
                          l90d={comparable.l90d.occupancy} 
                        />
                      )}
                    </div>
                  </div>

                  {/* Occupancy details */}
                  {(comparable.occupancy.available_days || comparable.occupancy.days_reserved) && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex gap-4 text-xs">
                        {comparable.occupancy.days_reserved && (
                          <span className="text-muted-foreground">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {comparable.occupancy.days_reserved} dagen geboekt
                          </span>
                        )}
                        {comparable.occupancy.available_days && (
                          <span className="text-muted-foreground">
                            {comparable.occupancy.available_days} dagen beschikbaar
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Extra pricing */}
                  {(comparable.pricing.cleaning_fee || comparable.pricing.extra_guest_fee) && (
                    <div className="mt-2 pt-2 border-t flex gap-3 text-xs text-muted-foreground">
                      {comparable.pricing.cleaning_fee && (
                        <span>Schoonmaak: €{comparable.pricing.cleaning_fee}</span>
                      )}
                      {comparable.pricing.extra_guest_fee && (
                        <span>Extra gast: €{comparable.pricing.extra_guest_fee}</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Ratings */}
              {comparable.ratings && comparable.ratings.overall && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span>{comparable.ratings.overall.toFixed(2)}</span>
                      {comparable.ratings.num_reviews && (
                        <span className="text-muted-foreground font-normal text-xs">
                          ({comparable.ratings.num_reviews} reviews)
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <RatingBar label="Netheid" value={comparable.ratings.cleanliness} />
                      <RatingBar label="Locatie" value={comparable.ratings.location} />
                      <RatingBar label="Waarde" value={comparable.ratings.value} />
                      <RatingBar label="Check-in" value={comparable.ratings.checkin} />
                      <RatingBar label="Communicatie" value={comparable.ratings.communication} />
                      <RatingBar label="Accuraatheid" value={comparable.ratings.accuracy} />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Full-width sections */}
          
          {/* Amenities */}
          {comparable.amenities.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Voorzieningen ({comparable.amenities.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {visibleAmenities.map((amenity, idx) => {
                    const config = amenityConfig[amenity.toLowerCase()];
                    return (
                      <Badge 
                        key={idx} 
                        variant="secondary" 
                        className="gap-1 py-0.5 text-xs"
                      >
                        {config ? config.icon : <Check className="h-3 w-3" />}
                        {config ? config.label : amenity}
                      </Badge>
                    );
                  })}
                  {!showAllAmenities && hiddenAmenitiesCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => setShowAllAmenities(true)}
                    >
                      +{hiddenAmenitiesCount} meer
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Booking Settings & Host */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {comparable.booking?.instant_book && (
              <Badge variant="outline" className="gap-1">
                <Zap className="h-3 w-3 text-amber-500" />
                Instant Book
              </Badge>
            )}
            {comparable.booking?.min_nights && (
              <Badge variant="outline" className="gap-1">
                <Moon className="h-3 w-3" />
                Min {comparable.booking.min_nights} nachten
              </Badge>
            )}
            {comparable.booking?.cancellation_policy && (
              <Badge variant="outline" className="gap-1 capitalize">
                {comparable.booking.cancellation_policy}
              </Badge>
            )}
            {comparable.host?.name && (
              <span className="text-muted-foreground text-xs">
                Beheerd door: <span className="font-medium text-foreground">{comparable.host.name}</span>
              </span>
            )}
          </div>

          <Separator />

          {/* External Link */}
          {airbnbUrl && (
            <Button type="button" variant="outline" className="w-full" asChild>
              <a
                href={airbnbUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Bekijk op Airbnb
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
