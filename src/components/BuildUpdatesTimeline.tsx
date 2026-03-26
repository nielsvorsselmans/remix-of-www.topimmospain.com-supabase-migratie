import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Video, Calendar, Play, Lock, Image, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { extractYouTubeId, getYouTubeEmbedUrl } from "@/lib/youtube";

interface ProjectVideo {
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

interface VideoLink {
  id: string;
  visible_public: boolean;
  visible_portal: boolean;
  is_featured: boolean;
  project_videos: ProjectVideo;
}

interface BuildUpdatesTimelineProps {
  projectId: string;
  isPortal?: boolean;
}

// Use shared YouTube utility that supports all URL formats including Shorts

const VIDEO_TYPE_LABELS: Record<string, string> = {
  bouwupdate: "Bouwupdate",
  showhouse: "Showhouse",
  omgeving: "Omgeving",
  algemeen: "Algemeen",
};

export function BuildUpdatesTimeline({ projectId, isPortal = false }: BuildUpdatesTimelineProps) {
  const [videos, setVideos] = useState<VideoLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<ProjectVideo | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    fetchVideos();
  }, [projectId, isPortal]);

  const fetchVideos = async () => {
    try {
      let query = supabase
        .from("project_video_links")
        .select(`
          id,
          visible_public,
          visible_portal,
          is_featured,
          project_videos (*)
        `)
        .eq("project_id", projectId)
        .order("order_index", { ascending: true });

      // Filter based on context
      if (isPortal) {
        query = query.eq("visible_portal", true);
      } else {
        query = query.eq("visible_public", true);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Sort by video_date descending (newest first)
      const sortedVideos = ((data as any) || []).sort((a: VideoLink, b: VideoLink) => {
        return new Date(b.project_videos.video_date).getTime() - new Date(a.project_videos.video_date).getTime();
      });
      
      setVideos(sortedVideos);
    } catch (error) {
      console.error("Error fetching build updates:", error);
    } finally {
      setLoading(false);
    }
  };

  // Reset image index when selecting new video
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [selectedVideo]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return null;
  }

  const handlePrevImage = () => {
    if (selectedVideo?.image_urls) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? selectedVideo.image_urls.length - 1 : prev - 1
      );
    }
  };

  const handleNextImage = () => {
    if (selectedVideo?.image_urls) {
      setCurrentImageIndex((prev) => 
        prev === selectedVideo.image_urls.length - 1 ? 0 : prev + 1
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Video className="h-5 w-5 text-primary" />
          Bouwupdates
        </h2>
        <Badge variant="secondary">{videos.length} updates</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((link) => {
          const video = link.project_videos;
          const isPortalExclusive = link.visible_portal && !link.visible_public;
          const isPhoto = video.media_type === "photo";
          const imageUrls = video.image_urls || [];
          
          return (
            <Card 
              key={link.id} 
              className="overflow-hidden cursor-pointer hover:border-primary/50 transition-colors group"
              onClick={() => setSelectedVideo(video)}
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-muted">
                {isPhoto && imageUrls.length > 0 ? (
                  <img
                    src={imageUrls[0]}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                ) : video.thumbnail_url ? (
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {isPhoto ? (
                      <Image className="h-12 w-12 text-muted-foreground" />
                    ) : (
                      <Video className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>
                )}
                
                {/* Play/View overlay */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center">
                    {isPhoto ? (
                      <Image className="h-6 w-6 text-primary-foreground" />
                    ) : (
                      <Play className="h-6 w-6 text-primary-foreground ml-1" />
                    )}
                  </div>
                </div>

                {/* Media type badge */}
                <Badge 
                  className="absolute top-2 left-2"
                  variant={isPhoto ? "secondary" : "default"}
                >
                  {isPhoto ? (
                    <>📷 {imageUrls.length}</>
                  ) : (
                    <>🎬</>
                  )}
                </Badge>

                {/* Portal exclusive badge */}
                {isPortal && isPortalExclusive && (
                  <Badge className="absolute top-2 right-2 bg-primary/90">
                    <Lock className="h-3 w-3 mr-1" />
                    Exclusief
                  </Badge>
                )}
              </div>

              <CardContent className="p-4">
                <h3 className="font-medium line-clamp-1">{video.title}</h3>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    {VIDEO_TYPE_LABELS[video.video_type] || video.video_type}
                  </Badge>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(video.video_date), "d MMM yyyy", { locale: nl })}
                  </span>
                </div>
                {video.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {video.description}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Video/Photo Dialog */}
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl">
          {selectedVideo && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedVideo.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                  {selectedVideo.media_type === "photo" && selectedVideo.image_urls?.length > 0 ? (
                    <>
                      <img
                        src={selectedVideo.image_urls[currentImageIndex]}
                        alt={`${selectedVideo.title} - ${currentImageIndex + 1}`}
                        className="w-full h-full object-contain bg-black"
                      />
                      {selectedVideo.image_urls.length > 1 && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrevImage();
                            }}
                          >
                            <ChevronLeft className="h-6 w-6" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNextImage();
                            }}
                          >
                            <ChevronRight className="h-6 w-6" />
                          </Button>
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full text-white text-sm">
                            {currentImageIndex + 1} / {selectedVideo.image_urls.length}
                          </div>
                        </>
                      )}
                    </>
                  ) : getYouTubeEmbedUrl(selectedVideo.video_url) ? (
                    <iframe
                      src={`${getYouTubeEmbedUrl(selectedVideo.video_url)}?autoplay=1`}
                      title={selectedVideo.title}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : selectedVideo.video_url ? (
                    <video
                      src={selectedVideo.video_url}
                      controls
                      autoPlay
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <p className="text-muted-foreground">Geen media beschikbaar</p>
                    </div>
                  )}
                </div>

                {/* Thumbnail strip for photos */}
                {selectedVideo.media_type === "photo" && selectedVideo.image_urls?.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {selectedVideo.image_urls.map((url, index) => (
                      <button
                        key={url}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${
                          index === currentImageIndex ? "border-primary" : "border-transparent"
                        }`}
                      >
                        <img src={url} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Badge variant="outline">
                    {VIDEO_TYPE_LABELS[selectedVideo.video_type] || selectedVideo.video_type}
                  </Badge>
                  <Badge variant={selectedVideo.media_type === "photo" ? "secondary" : "default"}>
                    {selectedVideo.media_type === "photo" 
                      ? `📷 ${selectedVideo.image_urls?.length || 0} foto's` 
                      : "🎬 Video"}
                  </Badge>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(selectedVideo.video_date), "d MMMM yyyy", { locale: nl })}
                  </span>
                </div>
                {selectedVideo.description && (
                  <p className="text-muted-foreground">{selectedVideo.description}</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
