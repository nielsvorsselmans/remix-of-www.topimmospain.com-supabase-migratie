import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";

interface ProjectHeroProps {
  title: string;
  location: string;
  startingPrice: number;
  videoUrl?: string;
  heroImages?: string[];
  fallbackImage?: string;
  className?: string;
}

export function ProjectHero({ 
  title, 
  location, 
  startingPrice, 
  videoUrl,
  heroImages = [],
  fallbackImage = "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920",
  className
}: ProjectHeroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Auto-advance slideshow every 5 seconds (only if we have multiple images and no video)
  useEffect(() => {
    if (heroImages.length > 1 && (!videoUrl || videoError)) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [heroImages.length, videoUrl, videoError]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay blocked, that's okay
      });
    }
  }, []);

  const scrollToContent = () => {
    const element = document.getElementById("persona-section");
    element?.scrollIntoView({ behavior: "smooth" });
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + heroImages.length) % heroImages.length);
  };

  // Determine which background to show
  const hasVideo = videoUrl && !videoError;
  const hasImages = heroImages.length > 0;
  const currentImage = hasImages ? heroImages[currentImageIndex] : fallbackImage;

  return (
    <section className={cn("relative h-screen w-full overflow-hidden", className)}>
      {/* Video/Image Background */}
      {hasVideo ? (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          src={videoUrl}
          autoPlay
          loop
          muted={isMuted}
          playsInline
          onError={() => setVideoError(true)}
        />
      ) : (
        <>
          {/* Image slideshow with crossfade */}
          {heroImages.map((img, index) => (
            <img
              key={img}
              src={img}
              alt={`${title} - ${index + 1}`}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
                index === currentImageIndex ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
          {/* Fallback if no hero images */}
          {!hasImages && (
            <img
              src={fallbackImage}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
        </>
      )}

      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-end pb-24 md:pb-32">
        <div className="container mx-auto px-4 md:px-8">
          <Badge 
            variant="secondary" 
            className="mb-4 bg-primary/90 text-primary-foreground text-sm md:text-base px-4 py-1.5"
          >
            Vanaf {formatCurrency(startingPrice, 0)}
          </Badge>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 max-w-4xl leading-tight">
            {title}
          </h1>
          
          <p className="text-xl md:text-2xl text-white/90 mb-8">
            {location}
          </p>

          {/* Video Controls */}
          {hasVideo && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleMute}
              className="absolute bottom-8 right-8 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          )}

          {/* Image Navigation (only show if multiple images and no video) */}
          {!hasVideo && heroImages.length > 1 && (
            <div className="absolute bottom-8 right-8 flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={prevImage}
                className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-white/80 text-sm min-w-[3rem] text-center">
                {currentImageIndex + 1} / {heroImages.length}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={nextImage}
                className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Scroll Indicator */}
      <button
        onClick={scrollToContent}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/80 hover:text-white transition-colors hidden md:flex flex-col items-center gap-2 animate-bounce"
      >
        <span className="text-sm font-medium">Scroll naar beneden</span>
        <ChevronDown className="h-6 w-6" />
      </button>
    </section>
  );
}
