import { useState } from "react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, ChevronLeft, ChevronRight, X } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface ProjectHeroSectionProps {
  images: string[];
  projectName: string;
  city?: string | null;
  region?: string | null;
  priceFrom?: number | null;
  priceTo?: number | null;
}

export function ProjectHeroSection({
  images,
  projectName,
  city,
  region,
  priceFrom,
  priceTo,
}: ProjectHeroSectionProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);


  const handlePrevImage = () => {
    setCurrentIndex((prev) => prev === 0 ? images.length - 1 : prev - 1);
  };

  const handleNextImage = () => {
    setCurrentIndex((prev) => prev === images.length - 1 ? 0 : prev + 1);
  };

  if (images.length === 0) {
    return (
      <div className="relative w-full h-[400px] md:h-[500px] rounded-xl overflow-hidden bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">Geen afbeeldingen beschikbaar</p>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <Carousel className="w-full">
        <CarouselContent>
          {images.map((image, index) => (
            <CarouselItem key={index}>
              <div 
                className="relative w-full h-[400px] md:h-[500px] rounded-xl overflow-hidden cursor-pointer"
                onClick={() => {
                  setCurrentIndex(index);
                  setLightboxOpen(true);
                }}
              >
                <img 
                  src={image} 
                  alt={`${projectName} - Foto ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {/* Gradient overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {images.length > 1 && (
          <>
            <CarouselPrevious className="left-4 bg-background/80 backdrop-blur-sm" />
            <CarouselNext className="right-4 bg-background/80 backdrop-blur-sm" />
          </>
        )}
      </Carousel>

      {/* Overlay info */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
        <div className="max-w-4xl">
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
            {projectName}
          </h1>
          {(city || region) && (
            <div className="flex items-center gap-2 text-white/90 mb-3">
              <MapPin className="h-4 w-4" />
              <span className="text-sm md:text-base">
                {[city, region].filter(Boolean).join(", ")}
              </span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-white/90 text-foreground text-sm md:text-base px-3 py-1">
              {formatPrice(priceFrom)} - {formatPrice(priceTo)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Image counter */}
      {images.length > 1 && (
        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
          {images.length} foto's
        </div>
      )}

      {/* Image Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-5xl p-0 border-0 bg-black">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 z-50 text-white hover:bg-white/20"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
          
          <div className="relative w-full aspect-[4/3] md:aspect-video">
            <img
              src={images[currentIndex]}
              alt={`${projectName} - Foto ${currentIndex + 1}`}
              className="w-full h-full object-contain"
            />
            
            {/* Navigation arrows */}
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                  onClick={handlePrevImage}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                  onClick={handleNextImage}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
                
                {/* Image counter */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full text-white text-sm">
                  {currentIndex + 1} / {images.length}
                </div>
              </>
            )}
          </div>
          
          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto p-4 bg-black/80">
              {images.map((url, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`flex-shrink-0 w-16 h-12 rounded-md overflow-hidden border-2 transition-colors ${
                    index === currentIndex ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={url} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
