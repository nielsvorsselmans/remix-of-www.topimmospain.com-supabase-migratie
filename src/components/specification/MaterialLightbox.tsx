import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { MaterialOptionImage } from "@/hooks/useMaterialSelections";

interface MaterialLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: MaterialOptionImage[];
  title: string;
  subtitle?: string;
}

export function MaterialLightbox({ 
  open, 
  onOpenChange, 
  images, 
  title,
  subtitle 
}: MaterialLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const currentImage = images[currentIndex];
  const hasMultiple = images.length > 1;
  
  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };
  
  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };
  
  // Reset index when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setCurrentIndex(0);
    }
    onOpenChange(newOpen);
  };
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl w-full p-0 gap-0 bg-black/95 border-0">
        <DialogHeader className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-white">{title}</DialogTitle>
              {subtitle && (
                <DialogDescription className="text-white/60">
                  {subtitle}
                </DialogDescription>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/60 hover:text-white hover:bg-white/10"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="relative aspect-[4/3] md:aspect-video">
          {currentImage && (
            <img
              src={currentImage.image_url}
              alt={currentImage.title || title}
              className="w-full h-full object-contain"
            />
          )}
          
          {/* Navigation buttons */}
          {hasMultiple && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                onClick={goPrev}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                onClick={goNext}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>
        
        {/* Thumbnails */}
        {hasMultiple && (
          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {images.map((img, index) => (
                <button
                  key={img.id}
                  onClick={() => setCurrentIndex(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-all ${
                    index === currentIndex 
                      ? 'border-primary ring-2 ring-primary/30' 
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img.image_url}
                    alt={img.title || `Afbeelding ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-white/60 text-sm mt-2">
              {currentIndex + 1} / {images.length}
            </p>
          </div>
        )}
        
        {/* Image title if available */}
        {currentImage?.title && (
          <div className="p-3 border-t border-white/10">
            <p className="text-white/80 text-center text-sm">{currentImage.title}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
