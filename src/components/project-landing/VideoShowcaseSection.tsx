import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Home, MapPin, Play, CheckCircle, Video, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { extractYouTubeId, extractYouTubeThumbnail } from "@/lib/youtube";
import type { VideoItem } from "@/hooks/useProjectLandingData";

interface VideoShowcaseSectionProps {
  showcaseVideo?: VideoItem | null;
  environmentVideo?: VideoItem | null;
  projectName: string;
}

export function VideoShowcaseSection({ 
  showcaseVideo, 
  environmentVideo, 
  projectName 
}: VideoShowcaseSectionProps) {
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);

  // Build items array from available videos
  const items = [
    showcaseVideo && {
      type: "showhouse" as const,
      video: showcaseVideo,
      icon: Home,
      title: "Showhouse Tour",
      badge: "Interieurrondleiding",
      description: `Ontdek hoe het showhouse eruitziet. Deze video geeft je een compleet beeld van de afwerking, indeling en sfeer die je kan verwachten bij ${projectName}.`,
      cta: "Bekijk de kwaliteit en afwerking tot in detail",
    },
    environmentVideo && {
      type: "omgeving" as const,
      video: environmentVideo,
      icon: MapPin,
      title: "Omgeving & Locatie",
      badge: "Dronebeelden",
      description: `De dronebeelden geven een prachtig beeld van de omgeving en de ligging van ${projectName}. Ontdek de directe omgeving, nabijgelegen voorzieningen en krijg een gevoel voor de unieke locatie.`,
      cta: "Krijg een compleet overzicht van de locatie",
    },
  ].filter(Boolean) as Array<{
    type: "showhouse" | "omgeving";
    video: VideoItem;
    icon: typeof Home | typeof MapPin;
    title: string;
    badge: string;
    description: string;
    cta: string;
  }>;

  // Don't render if no videos available
  if (items.length === 0) {
    return null;
  }

  const getYouTubeEmbedUrl = (url: string) => {
    const id = extractYouTubeId(url);
    return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1` : null;
  };

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="text-center">
        <h3 className="flex items-center justify-center gap-2 text-xl font-bold text-foreground">
          <Video className="h-5 w-5 text-primary" />
          Ontdek het project in beeld
        </h3>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
          Bij projecten is het niet eenvoudig om je in te beelden hoe het straks wordt. 
          Bekijk daarom onze video's om het project beter te leren kennen.
        </p>
      </div>

      {/* Alternating Layout */}
      <div className="space-y-6">
        {items.map((item, index) => {
          const Icon = item.icon;
          const thumbnailUrl = item.video.thumbnailUrl || 
            extractYouTubeThumbnail(item.video.videoUrl) || 
            "/placeholder.svg";
          const isReversed = index % 2 === 1;

          return (
            <div 
              key={item.type}
              className={cn(
                "grid md:grid-cols-2 gap-6 md:gap-8 items-center p-4 md:p-6 rounded-2xl",
                isReversed && "bg-muted/30"
              )}
            >
              {/* Video Thumbnail Side */}
              <button 
                onClick={() => setSelectedVideo(item.video)}
                className={cn(
                  "relative aspect-video rounded-xl overflow-hidden group shadow-md",
                  isReversed && "md:order-2"
                )}
              >
                <img 
                  src={thumbnailUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                {/* Play Button Overlay */}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                    <Play className="h-7 w-7 text-primary-foreground ml-1" fill="currentColor" />
                  </div>
                </div>
              </button>

              {/* Text Content Side */}
              <div className={cn("space-y-4", isReversed && "md:order-1")}>
                {/* Icon + Title */}
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 shrink-0">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-foreground">{item.title}</h4>
                    <Badge variant="secondary" className="mt-1">
                      {item.badge}
                    </Badge>
                  </div>
                </div>
                
                {/* Description */}
                <p className="text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
                
                {/* CTA Link */}
                <button 
                  onClick={() => setSelectedVideo(item.video)}
                  className="flex items-center gap-2 text-primary hover:underline font-medium group/cta"
                >
                  <CheckCircle className="h-4 w-4 group-hover/cta:scale-110 transition-transform" />
                  {item.cta}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Video Lightbox */}
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl p-0 border-0 bg-black">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 z-50 text-white hover:bg-white/20"
            onClick={() => setSelectedVideo(null)}
          >
            <X className="h-5 w-5" />
          </Button>

          <div className="w-full aspect-video">
            {selectedVideo && getYouTubeEmbedUrl(selectedVideo.videoUrl) && (
              <iframe
                title={selectedVideo.title}
                src={getYouTubeEmbedUrl(selectedVideo.videoUrl)!}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
