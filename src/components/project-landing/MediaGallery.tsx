import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, X, Image as ImageIcon, Play, HardHat, Home, Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import { extractYouTubeId, extractYouTubeThumbnail } from "@/lib/youtube";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import type { VideoItem } from "@/hooks/useProjectLandingData";
import { VideoShowcaseSection } from "./VideoShowcaseSection";
import { VideoTimeline } from "./VideoTimeline";

interface GalleryItem {
  id?: string;
  type: "render" | "photo";
  url: string;
  alt: string;
}

interface TimelineItem {
  id: string | number;
  title: string;
  date: string;
  status: "completed" | "current" | "upcoming";
  description: string;
}

interface MediaGalleryProps {
  gallery: GalleryItem[];
  buildUpdateVideos: VideoItem[];
  showcaseVideos: VideoItem[];
  primaryShowcaseVideo?: VideoItem | null;
  primaryEnvironmentVideo?: VideoItem | null;
  allVideos?: VideoItem[];
  timeline: TimelineItem[];
  projectName: string;
}

// Video Card Component
function VideoCard({ 
  video, 
  variant = "default",
  onClick 
}: { 
  video: VideoItem; 
  variant?: "default" | "large";
  onClick: () => void;
}) {
  const thumbnailUrl = video.thumbnailUrl || extractYouTubeThumbnail(video.videoUrl) || "/placeholder.svg";
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      return format(parseISO(dateStr), "d MMMM yyyy", { locale: nl });
    } catch {
      return dateStr;
    }
  };

  const getTypeBadge = () => {
    switch (video.videoType) {
      case "drone":
        return { icon: Plane, label: "Dronebeelden", color: "bg-purple-100 text-purple-800" };
      case "showhouse":
        return { icon: Home, label: "Showhouse", color: "bg-green-100 text-green-800" };
      case "bouwupdate":
        return { icon: HardHat, label: "Bouwupdate", color: "bg-blue-100 text-blue-800" };
      default:
        return { icon: Play, label: "Video", color: "bg-muted text-muted-foreground" };
    }
  };

  const badge = getTypeBadge();
  const BadgeIcon = badge.icon;

  return (
    <Card 
      className="overflow-hidden cursor-pointer group border-border/50 hover:border-border transition-colors"
      onClick={onClick}
    >
      <div className={cn(
        "relative bg-muted",
        variant === "large" ? "aspect-video" : "aspect-[16/10]"
      )}>
        <img 
          src={thumbnailUrl} 
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <Play className="h-6 w-6 text-primary-foreground ml-0.5" fill="currentColor" />
          </div>
        </div>
        
        {/* Type badge */}
        <Badge className={cn("absolute top-3 left-3 gap-1", badge.color)}>
          <BadgeIcon className="h-3 w-3" />
          {badge.label}
        </Badge>
      </div>
      
      <CardContent className="p-4">
        <h4 className="font-semibold text-foreground line-clamp-1 mb-1">{video.title}</h4>
        {video.date && (
          <span className="text-sm text-muted-foreground">
            {formatDate(video.date)}
          </span>
        )}
      </CardContent>
    </Card>
  );
}

// Constants for preview
const PREVIEW_COUNT = 8;

export function MediaGallery({ 
  gallery, 
  buildUpdateVideos, 
  showcaseVideos, 
  primaryShowcaseVideo,
  primaryEnvironmentVideo,
  allVideos = [],
  timeline,
  projectName 
}: MediaGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);

  // Preview logic
  const previewGallery = gallery.slice(0, PREVIEW_COUNT);
  const hasMorePhotos = gallery.length > PREVIEW_COUNT;
  const remainingCount = gallery.length - PREVIEW_COUNT;

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const navigate = (direction: "prev" | "next") => {
    if (direction === "prev") {
      setCurrentIndex((prev) => (prev === 0 ? gallery.length - 1 : prev - 1));
    } else {
      setCurrentIndex((prev) => (prev === gallery.length - 1 ? 0 : prev + 1));
    }
  };

  const openVideoLightbox = (video: VideoItem) => {
    setSelectedVideo(video);
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const id = extractYouTubeId(url);
    return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1` : null;
  };

  return (
    <section id="gallery-section" className="py-20 md:py-28">
      <div className="container mx-auto px-4 md:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
            Beelden & Media
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Bekijk foto's, renders en video's van het project
          </p>
        </div>

        {/* 1. FOTO GALERIJ - Preview with "View All" option */}
        <div className="mb-16">
          <h3 className="flex items-center gap-2 text-xl font-bold text-foreground mb-6">
            <ImageIcon className="h-5 w-5 text-primary" />
            Foto's & Renders
            <Badge variant="secondary" className="ml-2">{gallery.length}</Badge>
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {previewGallery.map((item, index) => (
              <button
                key={item.id || index}
                onClick={() => openLightbox(index)}
                className={cn(
                  "relative group overflow-hidden rounded-xl aspect-square",
                  // Make first item span 2 columns on larger screens
                  index === 0 && "md:col-span-2 md:row-span-2"
                )}
              >
                <img
                  src={item.url}
                  alt={item.alt}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                <Badge 
                  variant="secondary" 
                  className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm text-xs"
                >
                  {item.type === "render" ? "Render" : "Foto"}
                </Badge>
              </button>
            ))}
            
            {/* "View more" overlay tile */}
            {hasMorePhotos && (
              <button
                onClick={() => setGalleryModalOpen(true)}
                className="relative group overflow-hidden rounded-xl aspect-square bg-muted"
              >
                <img
                  src={gallery[PREVIEW_COUNT]?.url}
                  alt="Meer foto's bekijken"
                  className="w-full h-full object-cover opacity-40 group-hover:opacity-30 transition-opacity"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 group-hover:bg-black/50 transition-colors">
                  <ImageIcon className="h-8 w-8 text-white mb-2" />
                  <span className="text-white font-bold text-xl">+{remainingCount}</span>
                  <span className="text-white/80 text-sm">foto's</span>
                </div>
              </button>
            )}
          </div>

          {/* "View all photos" button */}
          {hasMorePhotos && (
            <div className="flex justify-center mt-6">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setGalleryModalOpen(true)}
                className="gap-2"
              >
                <ImageIcon className="h-4 w-4" />
                Bekijk alle {gallery.length} foto's
              </Button>
            </div>
          )}
        </div>

        {/* 2. VIDEO SHOWCASE - Featured showhouse and environment videos */}
        <VideoShowcaseSection
          showcaseVideo={primaryShowcaseVideo}
          environmentVideo={primaryEnvironmentVideo}
          projectName={projectName}
        />

        {/* 2b. VIDEO TIMELINE - All videos chronologically */}
        {allVideos.length > 0 && (
          <VideoTimeline 
            videos={allVideos} 
            onVideoClick={openVideoLightbox}
          />
        )}

        {/* 3. BOUWUPDATES - Build update videos */}
        {buildUpdateVideos.length > 0 && (
          <div className="mb-16">
            <h3 className="flex items-center gap-2 text-xl font-bold text-foreground mb-6">
              <HardHat className="h-5 w-5 text-primary" />
              Bouwupdates
              <Badge variant="secondary" className="ml-2">{buildUpdateVideos.length} updates</Badge>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {buildUpdateVideos.map((video) => (
                <VideoCard 
                  key={video.id} 
                  video={video} 
                  onClick={() => openVideoLightbox(video)} 
                />
              ))}
            </div>
          </div>
        )}


        {/* Photo Lightbox */}
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

            <div className="relative w-full aspect-video">
              <img
                src={gallery[currentIndex]?.url}
                alt={gallery[currentIndex]?.alt}
                className="w-full h-full object-contain"
              />

              {gallery.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                    onClick={() => navigate("prev")}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                    onClick={() => navigate("next")}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>

                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full text-white text-sm">
                    {currentIndex + 1} / {gallery.length}
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

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

        {/* Gallery Modal - All Photos */}
        <Dialog open={galleryModalOpen} onOpenChange={setGalleryModalOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden">
            <div className="p-4 md:p-6 border-b bg-background">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-lg">Alle foto's</h3>
                  <Badge variant="secondary">{gallery.length}</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setGalleryModalOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <ScrollArea className="max-h-[calc(90vh-80px)]">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4 md:p-6">
                {gallery.map((item, index) => (
                  <button
                    key={item.id || index}
                    onClick={() => {
                      setGalleryModalOpen(false);
                      openLightbox(index);
                    }}
                    className="relative group overflow-hidden rounded-lg aspect-square"
                  >
                    <img
                      src={item.url}
                      alt={item.alt}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                    <Badge 
                      variant="secondary" 
                      className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm text-xs"
                    >
                      {item.type === "render" ? "Render" : "Foto"}
                    </Badge>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
