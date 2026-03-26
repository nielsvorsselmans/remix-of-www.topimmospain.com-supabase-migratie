import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { MaterialLightbox } from "./MaterialLightbox";
import type { MaterialSelection, MaterialOption } from "@/hooks/useMaterialSelections";

interface MaterialCardProps {
  selection: MaterialSelection;
  option: MaterialOption;
}

export function MaterialCard({ selection, option }: MaterialCardProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  
  const primaryImage = option.images?.find(img => img.is_primary) || option.images?.[0];
  const allImages = option.images || [];
  
  return (
    <>
      <Card 
        className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
        onClick={() => allImages.length > 0 && setLightboxOpen(true)}
      >
        {/* Image or Color Swatch */}
        <div className="aspect-[4/3] relative bg-muted overflow-hidden">
          {primaryImage ? (
            <img
              src={primaryImage.image_url}
              alt={option.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : option.color_code ? (
            <div 
              className="w-full h-full flex items-center justify-center"
              style={{ backgroundColor: option.color_code }}
            >
              <span className="text-white/80 text-sm font-mono drop-shadow-md">
                {option.color_code}
              </span>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}
          
          {/* Image count badge */}
          {allImages.length > 1 && (
            <Badge 
              variant="secondary" 
              className="absolute bottom-2 right-2 bg-black/60 text-white border-0"
            >
              {allImages.length} foto's
            </Badge>
          )}
        </div>
        
        {/* Content */}
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {/* Color swatch next to name */}
              <div className="flex items-center gap-2">
                {option.color_code && (
                  <div 
                    className="w-4 h-4 rounded-full border border-border flex-shrink-0"
                    style={{ backgroundColor: option.color_code }}
                  />
                )}
                <h4 className="font-medium truncate">{option.name}</h4>
                {option.price != null && option.price > 0 && (
                  <Badge className="text-xs bg-amber-500 hover:bg-amber-600 text-white flex-shrink-0">
                    +€{option.price.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </Badge>
                )}
              </div>
              
              {/* Brand and product code */}
              {(option.brand || option.product_code) && (
                <p className="text-xs text-muted-foreground mt-1">
                  {option.brand && <span>{option.brand}</span>}
                  {option.brand && option.product_code && <span> • </span>}
                  {option.product_code && <span>REF: {option.product_code}</span>}
                </p>
              )}
              
              {/* Room/location */}
              {selection.room && (
                <Badge variant="outline" className="text-xs mt-2">
                  {selection.room}
                </Badge>
              )}
            </div>
            
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
          </div>
          
          {/* Decision info */}
          {selection.decided_at && (
            <p className="text-xs text-muted-foreground pt-2 border-t">
              Gekozen {selection.decided_by_name && `door ${selection.decided_by_name} `}
              op {format(new Date(selection.decided_at), 'd MMM yyyy', { locale: nl })}
            </p>
          )}
        </CardContent>
      </Card>
      
      {/* Lightbox */}
      {allImages.length > 0 && (
        <MaterialLightbox
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
          images={allImages}
          title={option.name}
          subtitle={`${selection.title}${selection.room ? ` - ${selection.room}` : ''}`}
        />
      )}
    </>
  );
}
