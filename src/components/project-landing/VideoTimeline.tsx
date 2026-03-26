import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Clock, Play, Home, Plane, HardHat, MapPin, ChevronDown } from "lucide-react";
import { extractYouTubeThumbnail } from "@/lib/youtube";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { VideoItem } from "@/hooks/useProjectLandingData";

interface VideoTimelineProps {
  videos: VideoItem[];
  onVideoClick: (video: VideoItem) => void;
}

const INITIAL_VISIBLE_COUNT = 2;

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  try {
    return format(parseISO(dateStr), "d MMMM yyyy", { locale: nl });
  } catch {
    return dateStr;
  }
};

const getVideoTypeConfig = (type: string) => {
  switch (type) {
    case "showhouse":
      return { icon: Home, label: "Showhouse", color: "bg-green-100 text-green-800" };
    case "drone":
      return { icon: Plane, label: "Dronebeelden", color: "bg-emerald-100 text-emerald-800" };
    case "omgeving":
      return { icon: MapPin, label: "Omgeving", color: "bg-amber-100 text-amber-800" };
    case "bouwupdate":
      return { icon: HardHat, label: "Bouwupdate", color: "bg-orange-100 text-orange-800" };
    default:
      return { icon: Play, label: "Video", color: "bg-muted text-muted-foreground" };
  }
};

interface TimelineVideoItemProps {
  video: VideoItem;
  onClick: (video: VideoItem) => void;
}

function TimelineVideoItem({ video, onClick }: TimelineVideoItemProps) {
  const config = getVideoTypeConfig(video.videoType);
  const Icon = config.icon;
  const thumbnailUrl = video.thumbnailUrl || extractYouTubeThumbnail(video.videoUrl) || "/placeholder.svg";

  return (
    <div className="relative pl-12">
      {/* Date marker */}
      <div className="absolute left-0 w-8 h-8 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center z-10">
        <Play className="h-3.5 w-3.5 text-primary" />
      </div>

      {/* Video card */}
      <button
        onClick={() => onClick(video)}
        className="w-full text-left p-4 rounded-xl border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all group"
      >
        <div className="flex gap-4">
          {/* Thumbnail */}
          <div className="w-28 md:w-36 aspect-video rounded-lg overflow-hidden bg-muted shrink-0 relative">
            <img
              src={thumbnailUrl}
              alt={video.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            {/* Play overlay */}
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Play className="h-3.5 w-3.5 text-primary-foreground ml-0.5" fill="currentColor" />
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 py-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge className={config.color + " gap-1 text-xs"}>
                <Icon className="h-3 w-3" />
                {config.label}
              </Badge>
              {video.date && (
                <span className="text-xs text-muted-foreground">
                  {formatDate(video.date)}
                </span>
              )}
            </div>
            <h4 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
              {video.title}
            </h4>
            {video.description && (
              <p className="text-sm text-muted-foreground line-clamp-1 mt-1 hidden md:block">
                {video.description}
              </p>
            )}
          </div>
        </div>
      </button>
    </div>
  );
}

export function VideoTimeline({ videos, onVideoClick }: VideoTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Sort chronologically (newest first)
  const sortedVideos = [...videos].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  if (sortedVideos.length === 0) return null;

  // Split into visible and hidden videos
  const visibleVideos = sortedVideos.slice(0, INITIAL_VISIBLE_COUNT);
  const hiddenVideos = sortedVideos.slice(INITIAL_VISIBLE_COUNT);
  const hasMoreVideos = hiddenVideos.length > 0;

  return (
    <div className="mt-12 space-y-6">
      {/* Section Header */}
      <h3 className="flex items-center gap-2 text-xl font-bold text-foreground">
        <Clock className="h-5 w-5 text-primary" />
        Video Tijdlijn
        <Badge variant="secondary" className="ml-2">{sortedVideos.length} video's</Badge>
      </h3>

      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border" />

          {/* First 2 videos - always visible */}
          <div className="space-y-4">
            {visibleVideos.map((video) => (
              <TimelineVideoItem key={video.id} video={video} onClick={onVideoClick} />
            ))}
          </div>

          {/* Rest of the videos - collapsible */}
          {hasMoreVideos && (
            <CollapsibleContent className="space-y-4 mt-4">
              {hiddenVideos.map((video) => (
                <TimelineVideoItem key={video.id} video={video} onClick={onVideoClick} />
              ))}
            </CollapsibleContent>
          )}
        </div>

        {/* Expand/collapse button */}
        {hasMoreVideos && (
          <CollapsibleTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full mt-4 gap-2"
            >
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform",
                isExpanded && "rotate-180"
              )} />
              {isExpanded 
                ? "Toon minder video's" 
                : `Toon ${hiddenVideos.length} meer video's`
              }
            </Button>
          </CollapsibleTrigger>
        )}
      </Collapsible>
    </div>
  );
}
