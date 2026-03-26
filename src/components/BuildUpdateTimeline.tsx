import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { VideoLightbox } from "@/components/VideoLightbox";
import { extractYouTubeId } from "@/lib/youtube";
import { getTypeBadgeColor } from "@/lib/constants";
import { Play, Camera, HardHat } from "lucide-react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { useState } from "react";

interface BuildUpdate {
  id: string;
  video_url: string;
  title: string;
  description: string | null;
  video_date: string;
  video_type: string;
  thumbnail_url: string | null;
  media_type: string;
  image_urls: string[];
}

interface BuildUpdateTimelineProps {
  updates: BuildUpdate[];
  projectName?: string;
}

export function BuildUpdateTimeline({ updates, projectName }: BuildUpdateTimelineProps) {
  const [activeVideo, setActiveVideo] = useState<{ youtubeId: string; title: string } | null>(null);

  if (!updates || updates.length === 0) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "drone": return <Camera className="w-3.5 h-3.5" />;
      default: return <HardHat className="w-3.5 h-3.5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "bouwupdate": return "Bouwupdate";
      case "drone": return "Drone";
      default: return type;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "d MMM yyyy", { locale: nl });
    } catch {
      return dateStr;
    }
  };

  const handleCardClick = (update: BuildUpdate) => {
    if (update.media_type === "video" && update.video_url) {
      const ytId = extractYouTubeId(update.video_url);
      if (ytId) {
        setActiveVideo({ youtubeId: ytId, title: update.title });
      }
    }
  };

  const getThumbnail = (update: BuildUpdate) => {
    if (update.thumbnail_url) return update.thumbnail_url;
    if (update.media_type === "video" && update.video_url) {
      const ytId = extractYouTubeId(update.video_url);
      if (ytId) return `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
    }
    if (update.image_urls?.length > 0) return update.image_urls[0];
    return null;
  };

  const UpdateCard = ({ update }: { update: BuildUpdate }) => {
    const thumbnail = getThumbnail(update);
    const isVideo = update.media_type === "video";

    return (
      <Card
        className={`overflow-hidden border-border shadow-soft h-full ${isVideo ? "cursor-pointer group" : ""}`}
        onClick={() => isVideo && handleCardClick(update)}
      >
        {/* Thumbnail */}
        <div className="relative aspect-video bg-muted overflow-hidden">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={update.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <HardHat className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          {isVideo && (
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-primary/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Badge className={`${getTypeBadgeColor(update.video_type)} text-xs gap-1`}>
              {getTypeIcon(update.video_type)}
              {getTypeLabel(update.video_type)}
            </Badge>
            <span className="text-xs text-muted-foreground">{formatDate(update.video_date)}</span>
          </div>
          <h4 className="font-semibold text-sm text-foreground line-clamp-2">{update.title}</h4>
          {update.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{update.description}</p>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="animate-fade-in">
      <h3 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
        <HardHat className="w-5 h-5 text-primary" />
        Bouwupdates tijdens het traject
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {updates.length} update{updates.length !== 1 ? "s" : ""} gedeeld
        {projectName ? ` voor ${projectName}` : ""} — van start tot oplevering
      </p>

      {updates.length <= 3 ? (
        <div className={`grid gap-4 ${updates.length === 1 ? "grid-cols-1 max-w-md" : updates.length === 2 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-3"}`}>
          {updates.map((update) => (
            <UpdateCard key={update.id} update={update} />
          ))}
        </div>
      ) : (
        <div className="relative px-12">
          <Carousel opts={{ align: "start", loop: true }} className="w-full">
            <CarouselContent className="-ml-4">
              {updates.map((update) => (
                <CarouselItem key={update.id} className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                  <UpdateCard update={update} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      )}

      {/* Timeline dots */}
      <div className="mt-6 flex items-center gap-1 overflow-x-auto pb-2">
        {updates.map((update, i) => (
          <div key={update.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-primary/80 border-2 border-primary/30" />
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatDate(update.video_date)}</span>
            </div>
            {i < updates.length - 1 && (
              <div className="h-px w-8 bg-border mx-1 mt-[-12px]" />
            )}
          </div>
        ))}
      </div>

      {activeVideo && (
        <VideoLightbox
          open={!!activeVideo}
          onOpenChange={(open) => !open && setActiveVideo(null)}
          youtubeId={activeVideo.youtubeId}
          title={activeVideo.title}
        />
      )}
    </div>
  );
}
