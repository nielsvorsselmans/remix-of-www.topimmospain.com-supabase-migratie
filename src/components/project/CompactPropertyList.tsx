import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { Home, BedDouble, Bath, Maximize2, Waves, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Property {
  id: string;
  title: string;
  description?: string | null;
  price?: number | null;
  property_type?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area_sqm?: number | null;
  distance_to_beach_m?: number | null;
  status?: string | null;
  image_url?: string | null;
  images?: any;
  features?: any;
}

interface CompactPropertyListProps {
  properties: Property[];
  maxVisible?: number;
}

export function CompactPropertyList({ properties, maxVisible = 5 }: CompactPropertyListProps) {
  const [showAll, setShowAll] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const formatPrice = (price: number | null) => {
    if (!price) return "N/A";
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const availableCount = properties.filter(p => p.status === 'available').length;
  const visibleProperties = showAll ? properties : properties.slice(0, maxVisible);
  const hasMore = properties.length > maxVisible;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Home className="h-5 w-5 text-primary" />
          Beschikbare woningen
        </h2>
        <Badge variant="secondary" className="text-xs">
          {availableCount} beschikbaar
        </Badge>
      </div>

      {/* Compact property rows */}
      <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
        {visibleProperties.map((property) => (
          <button
            key={property.id}
            onClick={() => setSelectedProperty(property)}
            className={cn(
              "w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left",
              property.status === 'sold' && "opacity-60 bg-muted/30"
            )}
          >
            {/* Thumbnail */}
            <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
              {property.image_url ? (
                <img 
                  src={property.image_url} 
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Home className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{property.title}</span>
                {property.status === 'sold' && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Verkocht</Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                {property.bedrooms && (
                  <span className="flex items-center gap-1">
                    <BedDouble className="h-3 w-3" />
                    {property.bedrooms}
                  </span>
                )}
                {property.bathrooms && (
                  <span className="flex items-center gap-1">
                    <Bath className="h-3 w-3" />
                    {property.bathrooms}
                  </span>
                )}
                {property.area_sqm && (
                  <span className="flex items-center gap-1">
                    <Maximize2 className="h-3 w-3" />
                    {property.area_sqm}m²
                  </span>
                )}
              </div>
            </div>

            {/* Price */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {property.status !== 'sold' && (
                <span className="font-semibold text-primary text-sm">
                  {formatPrice(property.price)}
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>

      {/* Show more button */}
      {hasMore && !showAll && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(true)}
          className="w-full mt-2 text-muted-foreground"
        >
          Toon alle {properties.length} woningen
        </Button>
      )}
      {showAll && hasMore && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(false)}
          className="w-full mt-2 text-muted-foreground"
        >
          Toon minder
        </Button>
      )}

      {/* Property Detail Dialog */}
      <Dialog open={!!selectedProperty} onOpenChange={() => setSelectedProperty(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedProperty && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedProperty.title}</DialogTitle>
              </DialogHeader>
              
              {/* Property images */}
              {(selectedProperty.image_url || (selectedProperty.images && Array.isArray(selectedProperty.images) && selectedProperty.images.length > 0)) && (
                <Carousel className="w-full">
                  <CarouselContent>
                    {selectedProperty.image_url && (
                      <CarouselItem>
                        <div className="relative aspect-video rounded-lg overflow-hidden">
                          <img 
                            src={selectedProperty.image_url} 
                            alt={selectedProperty.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </CarouselItem>
                    )}
                    {selectedProperty.images && Array.isArray(selectedProperty.images) && 
                      selectedProperty.images.filter((img): img is string => typeof img === 'string').map((img, idx) => (
                        <CarouselItem key={idx}>
                          <div className="relative aspect-video rounded-lg overflow-hidden">
                            <img 
                              src={img} 
                              alt={`${selectedProperty.title} - ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </CarouselItem>
                      ))
                    }
                  </CarouselContent>
                  <CarouselPrevious className="left-2" />
                  <CarouselNext className="right-2" />
                </Carousel>
              )}

              {/* Property specs */}
              <div className="flex flex-wrap gap-4 py-4 border-y border-border">
                {selectedProperty.bedrooms && (
                  <div className="flex items-center gap-2">
                    <BedDouble className="h-5 w-5 text-primary" />
                    <span>{selectedProperty.bedrooms} slaapkamers</span>
                  </div>
                )}
                {selectedProperty.bathrooms && (
                  <div className="flex items-center gap-2">
                    <Bath className="h-5 w-5 text-primary" />
                    <span>{selectedProperty.bathrooms} badkamers</span>
                  </div>
                )}
                {selectedProperty.area_sqm && (
                  <div className="flex items-center gap-2">
                    <Maximize2 className="h-5 w-5 text-primary" />
                    <span>{selectedProperty.area_sqm} m²</span>
                  </div>
                )}
                {selectedProperty.distance_to_beach_m && (
                  <div className="flex items-center gap-2">
                    <Waves className="h-5 w-5 text-primary" />
                    <span>
                      {selectedProperty.distance_to_beach_m >= 1000 
                        ? `${(selectedProperty.distance_to_beach_m / 1000).toFixed(1)} km van strand` 
                        : `${selectedProperty.distance_to_beach_m}m van strand`}
                    </span>
                  </div>
                )}
              </div>

              {/* Price */}
              {selectedProperty.status === 'available' && selectedProperty.price && (
                <div className="text-2xl font-bold text-primary">
                  {formatPrice(selectedProperty.price)}
                </div>
              )}
              {selectedProperty.status === 'sold' && (
                <Badge variant="destructive" className="w-fit">Verkocht</Badge>
              )}

              {/* Description */}
              {selectedProperty.description && (
                <div>
                  <h3 className="font-semibold mb-2">Beschrijving</h3>
                  <p className="text-muted-foreground text-sm whitespace-pre-line">
                    {selectedProperty.description}
                  </p>
                </div>
              )}

              {/* Features */}
              {selectedProperty.features && Array.isArray(selectedProperty.features) && selectedProperty.features.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Kenmerken</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProperty.features.map((feature: string, idx: number) => (
                      <Badge key={idx} variant="secondary">{feature}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
