import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Video, Calendar, Eye, EyeOff, Link as LinkIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface ProjectVideo {
  id: string;
  video_url: string;
  title: string;
  description: string | null;
  video_date: string;
  video_type: string;
  thumbnail_url: string | null;
}

interface ProjectVideoLink {
  id: string;
  video_id: string;
  project_id: string;
  order_index: number;
  visible_public: boolean;
  visible_portal: boolean;
  is_featured: boolean;
  project_videos: ProjectVideo;
}

interface ProjectVideoManagerProps {
  projectId: string;
}

// Helper to extract YouTube thumbnail
const getYouTubeThumbnail = (url: string): string | null => {
  if (!url) return null;
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[7].length === 11) {
    return `https://img.youtube.com/vi/${match[7]}/mqdefault.jpg`;
  }
  return null;
};

const VIDEO_TYPES = [
  { value: "bouwupdate", label: "Bouwupdate" },
  { value: "showhouse", label: "Showhouse Tour" },
  { value: "omgeving", label: "Omgeving" },
  { value: "algemeen", label: "Algemeen" },
];

export function ProjectVideoManager({ projectId }: ProjectVideoManagerProps) {
  const [linkedVideos, setLinkedVideos] = useState<ProjectVideoLink[]>([]);
  const [allVideos, setAllVideos] = useState<ProjectVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<"new" | "existing">("new");
  
  // Form state
  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoDate, setVideoDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [videoType, setVideoType] = useState("bouwupdate");
  const [visiblePublic, setVisiblePublic] = useState(true);
  const [visiblePortal, setVisiblePortal] = useState(true);
  const [selectedExistingVideo, setSelectedExistingVideo] = useState<string | null>(null);

  useEffect(() => {
    fetchLinkedVideos();
    fetchAllVideos();
  }, [projectId]);

  const fetchLinkedVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("project_video_links")
        .select(`
          *,
          project_videos (*)
        `)
        .eq("project_id", projectId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      setLinkedVideos((data as any) || []);
    } catch (error) {
      console.error("Error fetching linked videos:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("project_videos")
        .select("*")
        .order("video_date", { ascending: false });

      if (error) throw error;
      setAllVideos(data || []);
    } catch (error) {
      console.error("Error fetching all videos:", error);
    }
  };

  const resetForm = () => {
    setVideoUrl("");
    setTitle("");
    setDescription("");
    setVideoDate(format(new Date(), "yyyy-MM-dd"));
    setVideoType("bouwupdate");
    setVisiblePublic(true);
    setVisiblePortal(true);
    setSelectedExistingVideo(null);
    setMode("new");
  };

  const handleAddVideo = async () => {
    setIsSubmitting(true);
    try {
      let videoId: string;

      if (mode === "new") {
        // Create new video
        const thumbnail = getYouTubeThumbnail(videoUrl);
        const { data: newVideo, error: videoError } = await supabase
          .from("project_videos")
          .insert({
            video_url: videoUrl,
            title,
            description: description || null,
            video_date: videoDate,
            video_type: videoType,
            thumbnail_url: thumbnail,
          })
          .select()
          .single();

        if (videoError) throw videoError;
        videoId = newVideo.id;
      } else {
        // Use existing video
        if (!selectedExistingVideo) {
          toast.error("Selecteer een video");
          return;
        }
        videoId = selectedExistingVideo;
      }

      // Create link
      const { error: linkError } = await supabase
        .from("project_video_links")
        .insert({
          video_id: videoId,
          project_id: projectId,
          order_index: linkedVideos.length,
          visible_public: visiblePublic,
          visible_portal: visiblePortal,
        });

      if (linkError) throw linkError;

      toast.success("Video toegevoegd");
      setDialogOpen(false);
      resetForm();
      fetchLinkedVideos();
      fetchAllVideos();
    } catch (error: any) {
      console.error("Error adding video:", error);
      if (error.code === "23505") {
        toast.error("Deze video is al gekoppeld aan dit project");
      } else {
        toast.error("Fout bij toevoegen video");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleVisibility = async (
    linkId: string,
    field: "visible_public" | "visible_portal",
    value: boolean
  ) => {
    try {
      const { error } = await supabase
        .from("project_video_links")
        .update({ [field]: value })
        .eq("id", linkId);

      if (error) throw error;

      setLinkedVideos((prev) =>
        prev.map((link) =>
          link.id === linkId ? { ...link, [field]: value } : link
        )
      );
    } catch (error) {
      console.error("Error updating visibility:", error);
      toast.error("Fout bij bijwerken");
    }
  };

  const handleRemoveLink = async () => {
    if (!videoToDelete) return;
    
    try {
      const { error } = await supabase
        .from("project_video_links")
        .delete()
        .eq("id", videoToDelete);

      if (error) throw error;

      toast.success("Video ontkoppeld");
      setDeleteDialogOpen(false);
      setVideoToDelete(null);
      fetchLinkedVideos();
    } catch (error) {
      console.error("Error removing link:", error);
      toast.error("Fout bij ontkoppelen");
    }
  };

  // Filter out already linked videos
  const availableVideos = allVideos.filter(
    (video) => !linkedVideos.some((link) => link.video_id === video.id)
  );

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">
          Bouwupdates & Extra Video's
        </h4>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Video Toevoegen
        </Button>
      </div>

      {linkedVideos.length === 0 ? (
        <div className="text-center py-8 border rounded-lg border-dashed">
          <Video className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Nog geen video's gekoppeld aan dit project
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {linkedVideos.map((link) => (
            <Card key={link.id}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Thumbnail */}
                  <div className="w-32 h-20 rounded overflow-hidden bg-muted flex-shrink-0">
                    {link.project_videos.thumbnail_url ? (
                      <img
                        src={link.project_videos.thumbnail_url}
                        alt={link.project_videos.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h5 className="font-medium truncate">{link.project_videos.title}</h5>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {VIDEO_TYPES.find((t) => t.value === link.project_videos.video_type)?.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(link.project_videos.video_date), "d MMM yyyy", { locale: nl })}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setVideoToDelete(link.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Visibility toggles */}
                    <div className="flex items-center gap-4 mt-3">
                      <label className="flex items-center gap-2 text-xs">
                        <Switch
                          checked={link.visible_public}
                          onCheckedChange={(checked) =>
                            handleToggleVisibility(link.id, "visible_public", checked)
                          }
                        />
                        <Eye className="h-3 w-3" />
                        Publiek
                      </label>
                      <label className="flex items-center gap-2 text-xs">
                        <Switch
                          checked={link.visible_portal}
                          onCheckedChange={(checked) =>
                            handleToggleVisibility(link.id, "visible_portal", checked)
                          }
                        />
                        <Eye className="h-3 w-3" />
                        Portal
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Video Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Video Toevoegen</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Mode selector */}
            <div className="flex gap-2">
              <Button
                variant={mode === "new" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("new")}
              >
                <Plus className="h-4 w-4 mr-1" />
                Nieuwe Video
              </Button>
              <Button
                variant={mode === "existing" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("existing")}
                disabled={availableVideos.length === 0}
              >
                <LinkIcon className="h-4 w-4 mr-1" />
                Bestaande Koppelen
              </Button>
            </div>

            {mode === "new" ? (
              <>
                <div className="space-y-2">
                  <Label>YouTube URL *</Label>
                  <Input
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Titel *</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Bouwupdate December 2024"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Datum *</Label>
                    <Input
                      type="date"
                      value={videoDate}
                      onChange={(e) => setVideoDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={videoType} onValueChange={setVideoType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VIDEO_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Beschrijving</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optionele beschrijving..."
                    rows={2}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label>Selecteer Video</Label>
                <Select value={selectedExistingVideo || ""} onValueChange={setSelectedExistingVideo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kies een video..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVideos.map((video) => (
                      <SelectItem key={video.id} value={video.id}>
                        {video.title} ({format(new Date(video.video_date), "d MMM yyyy", { locale: nl })})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Visibility options */}
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium">Zichtbaarheid voor dit project</p>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={visiblePublic} onCheckedChange={setVisiblePublic} />
                  Publieke website
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={visiblePortal} onCheckedChange={setVisiblePortal} />
                  Klantportaal
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuleren
            </Button>
            <Button
              onClick={handleAddVideo}
              disabled={isSubmitting || (mode === "new" ? !videoUrl || !title : !selectedExistingVideo)}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Toevoegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Video ontkoppelen?</AlertDialogTitle>
            <AlertDialogDescription>
              De video wordt ontkoppeld van dit project maar blijft beschikbaar voor andere projecten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveLink} className="bg-destructive text-destructive-foreground">
              Ontkoppelen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
