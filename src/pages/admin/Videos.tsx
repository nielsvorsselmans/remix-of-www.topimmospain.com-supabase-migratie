import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProjectsList } from "@/hooks/useProjectsList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Search, Calendar, Link2, Pencil, Trash2, Eye, EyeOff, Play, ExternalLink, Image, Video, ArrowRight, ArrowLeft, Check, Youtube, CheckSquare, Square, Users } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { VideoEditDialog } from "@/components/VideoEditDialog";
import { BulkVideoLinkDialog } from "@/components/BulkVideoLinkDialog";
import { MediaUploader } from "@/components/MediaUploader";
import { YouTubeUploadDialog } from "@/components/YouTubeUploadDialog";
import { extractYouTubeThumbnail } from "@/lib/youtube";
import { VIDEO_TYPES, getTypeBadgeColor } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

interface ProjectVideo {
  id: string;
  video_url: string;
  title: string;
  description: string | null;
  video_date: string;
  video_type: string;
  thumbnail_url: string | null;
  created_at: string;
  media_type: string;
  image_urls: string[];
  links?: {
    id: string;
    project_id: string;
    visible_public: boolean;
    visible_portal: boolean;
    project: { id: string; name: string } | null;
  }[];
  saleLinks?: {
    id: string;
    sale_id: string;
    sale: {
      id: string;
      property_description: string | null;
      project: { name: string } | null;
      sale_customers: { 
        crm_lead: { first_name: string | null; last_name: string | null } | null 
      }[];
    } | null;
  }[];
  cityLinks?: {
    id: string;
    city: string;
  }[];
}

interface Project {
  id: string;
  name: string;
  featured_image: string | null;
  city: string | null;
  price_from: number | null;
  price_to: number | null;
}

interface ProjectSelection {
  id: string;
  name: string;
  featured_image: string | null;
  city: string | null;
  price_from: number | null;
  price_to: number | null;
  selected: boolean;
  visible_public: boolean;
  visible_portal: boolean;
}



export default function Videos() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [linkFilter, setLinkFilter] = useState<string>("all");
  const [editVideo, setEditVideo] = useState<ProjectVideo | null>(null);
  
  // Bulk selection state
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [isBulkLinkDialogOpen, setIsBulkLinkDialogOpen] = useState(false);
  
  // Two-step add dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isYouTubeDialogOpen, setIsYouTubeDialogOpen] = useState(false);
  const [addStep, setAddStep] = useState<1 | 2>(1);
  const [mediaType, setMediaType] = useState<"video" | "photo">("video");
  const [newMedia, setNewMedia] = useState({
    video_url: "",
    title: "",
    description: "",
    video_date: new Date().toISOString().split("T")[0],
    video_type: "bouwupdate",
    image_urls: [] as string[],
  });
  const [projectSelections, setProjectSelections] = useState<ProjectSelection[]>([]);
  const [projectSearch, setProjectSearch] = useState("");

  // Fetch all videos with their project and sale links in a SINGLE query
  const { data: videos = [], isLoading } = useQuery({
    queryKey: ["admin-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_videos")
        .select(`
          *,
          project_video_links (
            id,
            project_id,
            visible_public,
            visible_portal,
            project:projects (id, name)
          ),
          sale_video_links (
            id,
            sale_id,
            sale:sales (
              id,
              property_description,
              project:projects (name),
              sale_customers (
                crm_lead:crm_leads (first_name, last_name)
              )
            )
          ),
          city_video_links (
            id,
            city
          )
        `)
        .order("video_date", { ascending: false });

      if (error) throw error;

      // Transform to expected format
      return (data || []).map((video) => ({
        ...video,
        image_urls: video.image_urls || [],
        links: video.project_video_links?.map((link: any) => ({
          id: link.id,
          project_id: link.project_id,
          visible_public: link.visible_public,
          visible_portal: link.visible_portal,
          project: link.project,
        })) || [],
        saleLinks: video.sale_video_links?.map((link: any) => ({
          id: link.id,
          sale_id: link.sale_id,
          sale: link.sale,
        })) || [],
        cityLinks: video.city_video_links?.map((link: any) => ({
          id: link.id,
          city: link.city,
        })) || [],
      })) as ProjectVideo[];
    },
  });

  // Fetch all projects for linking - shared cached hook
  const { data: projectsList = [] } = useProjectsList();
  const allProjects = projectsList as Project[];

  // Reset dialog state
  const resetAddDialog = () => {
    setAddStep(1);
    setMediaType("video");
    setNewMedia({
      video_url: "",
      title: "",
      description: "",
      video_date: new Date().toISOString().split("T")[0],
      video_type: "bouwupdate",
      image_urls: [],
    });
    setProjectSelections([]);
    setProjectSearch("");
  };

  // Initialize project selections when opening step 2
  const initializeProjectSelections = () => {
    setProjectSelections(
      allProjects.map((p) => ({
        id: p.id,
        name: p.name,
        featured_image: p.featured_image,
        city: p.city,
        price_from: p.price_from,
        price_to: p.price_to,
        selected: false,
        visible_public: true,
        visible_portal: true,
      }))
    );
  };
  

  // Add media with project links mutation
  const addMediaMutation = useMutation({
    mutationFn: async () => {
      const thumbnail = mediaType === "video" ? extractYouTubeThumbnail(newMedia.video_url) : newMedia.image_urls[0] || null;
      
      const { data: mediaRecord, error: mediaError } = await supabase
        .from("project_videos")
        .insert({
          video_url: mediaType === "video" ? newMedia.video_url : "",
          title: newMedia.title,
          description: newMedia.description || null,
          video_date: newMedia.video_date,
          video_type: newMedia.video_type,
          thumbnail_url: thumbnail,
          media_type: mediaType,
          image_urls: mediaType === "photo" ? newMedia.image_urls : [],
        })
        .select()
        .single();

      if (mediaError) throw mediaError;

      // Create project links
      const selectedProjects = projectSelections.filter((p) => p.selected);
      if (selectedProjects.length > 0) {
        const links = selectedProjects.map((p) => ({
          video_id: mediaRecord.id,
          project_id: p.id,
          visible_public: p.visible_public,
          visible_portal: p.visible_portal,
        }));

        const { error: linkError } = await supabase.from("project_video_links").insert(links);
        if (linkError) throw linkError;
      }

      return mediaRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-videos"] });
      setIsAddDialogOpen(false);
      resetAddDialog();
      toast.success(mediaType === "video" ? "Video toegevoegd" : "Foto's toegevoegd");
    },
    onError: () => toast.error("Fout bij toevoegen"),
  });


  // Delete video mutation
  const deleteVideoMutation = useMutation({
    mutationFn: async (videoId: string) => {
      await supabase.from("project_video_links").delete().eq("video_id", videoId);
      const { error } = await supabase.from("project_videos").delete().eq("id", videoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-videos"] });
      toast.success("Media verwijderd");
    },
    onError: () => toast.error("Fout bij verwijderen"),
  });

  // Helper to check if video is linked to anything (project, sale, or city)
  const isVideoLinked = (video: ProjectVideo) => {
    return (video.links?.length || 0) > 0 || 
           (video.saleLinks?.length || 0) > 0 || 
           (video.cityLinks?.length || 0) > 0;
  };

  // Filter videos
  const filteredVideos = videos.filter((video) => {
    const matchesSearch = video.title.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || video.video_type === typeFilter;
    const hasLinks = isVideoLinked(video);
    const matchesLink = linkFilter === "all" || 
      (linkFilter === "linked" && hasLinks) || 
      (linkFilter === "unlinked" && !hasLinks);
    return matchesSearch && matchesType && matchesLink;
  });

  // Bulk selection helpers
  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideos((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedVideos.size === filteredVideos.length) {
      setSelectedVideos(new Set());
    } else {
      setSelectedVideos(new Set(filteredVideos.map((v) => v.id)));
    }
  };

  const clearSelection = () => setSelectedVideos(new Set());

  const filteredProjectSelections = projectSelections.filter((p) =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  

  const canProceedToStep2 = mediaType === "video" 
    ? newMedia.video_url && newMedia.title 
    : newMedia.image_urls.length > 0 && newMedia.title;

  const selectedProjectCount = projectSelections.filter((p) => p.selected).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Media Beheer</h1>
          <p className="text-muted-foreground">Beheer alle project video's, foto's en koppelingen</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsYouTubeDialogOpen(true)}>
            <Youtube className="h-4 w-4 mr-2" />
            Upload naar YouTube
          </Button>
          <Dialog 
            open={isAddDialogOpen} 
            onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) resetAddDialog();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nieuwe Media
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {addStep === 1 ? "Stap 1: Media Toevoegen" : "Stap 2: Projecten Koppelen"}
              </DialogTitle>
            </DialogHeader>

            {addStep === 1 ? (
              <div className="space-y-4">
                {/* Media type toggle */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={mediaType === "video" ? "default" : "outline"}
                    onClick={() => setMediaType("video")}
                    className="flex-1"
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Video
                  </Button>
                  <Button
                    type="button"
                    variant={mediaType === "photo" ? "default" : "outline"}
                    onClick={() => setMediaType("photo")}
                    className="flex-1"
                  >
                    <Image className="h-4 w-4 mr-2" />
                    Foto's
                  </Button>
                </div>

                {mediaType === "video" ? (
                  <div>
                    <Label>YouTube URL</Label>
                    <Input
                      value={newMedia.video_url}
                      onChange={(e) => setNewMedia({ ...newMedia, video_url: e.target.value })}
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </div>
                ) : (
                  <MediaUploader
                    uploadedUrls={newMedia.image_urls}
                    onUrlsChange={(urls) => setNewMedia({ ...newMedia, image_urls: urls })}
                    maxFiles={20}
                  />
                )}

                <div>
                  <Label>Titel</Label>
                  <Input
                    value={newMedia.title}
                    onChange={(e) => setNewMedia({ ...newMedia, title: e.target.value })}
                    placeholder={mediaType === "video" ? "Bouwupdate Maart 2024" : "Bouwfoto's December 2024"}
                  />
                </div>

                <div>
                  <Label>Beschrijving (optioneel)</Label>
                  <Textarea
                    value={newMedia.description}
                    onChange={(e) => setNewMedia({ ...newMedia, description: e.target.value })}
                    placeholder="Beschrijving..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Datum</Label>
                    <Input
                      type="date"
                      value={newMedia.video_date}
                      onChange={(e) => setNewMedia({ ...newMedia, video_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select
                      value={newMedia.video_type}
                      onValueChange={(value) => setNewMedia({ ...newMedia, video_type: value })}
                    >
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

                <Button
                  onClick={() => {
                    initializeProjectSelections();
                    setAddStep(2);
                  }}
                  disabled={!canProceedToStep2}
                  className="w-full"
                >
                  Volgende: Projecten Koppelen
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline">
                    {mediaType === "video" ? <Video className="h-3 w-3 mr-1" /> : <Image className="h-3 w-3 mr-1" />}
                    {newMedia.title}
                  </Badge>
                </div>

                <div>
                  <Label>Zoek projecten</Label>
                  <Input
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    placeholder="Zoek op naam..."
                    className="mt-1"
                  />
                </div>

                <ScrollArea className="h-[300px] border rounded-md p-2">
                  <div className="space-y-2">
                    {filteredProjectSelections.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Geen projecten gevonden
                      </p>
                    ) : (
                      filteredProjectSelections.map((project) => (
                        <div
                          key={project.id}
                          className={`flex items-center justify-between p-3 rounded-md border transition-colors ${
                            project.selected ? "border-primary bg-primary/5" : "border-border"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={project.selected}
                              onCheckedChange={(checked) => {
                                setProjectSelections((prev) =>
                                  prev.map((p) =>
                                    p.id === project.id ? { ...p, selected: !!checked } : p
                                  )
                                );
                              }}
                            />
                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden">
                              {project.featured_image ? (
                                <img
                                  src={project.featured_image}
                                  alt={project.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <Image className={`w-4 h-4 text-muted-foreground ${project.featured_image ? 'hidden' : ''}`} />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{project.name}</span>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {project.city && <span>{project.city}</span>}
                                {project.price_from && (
                                  <>
                                    <span>•</span>
                                    <span>
                                      {formatCurrency(project.price_from, 0)}
                                      {project.price_to && project.price_to !== project.price_from && ` - ${formatCurrency(project.price_to, 0)}`}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        {project.selected && (
                          <div className="flex items-center gap-4 text-sm">
                            <label className="flex items-center gap-2">
                              <Switch
                                checked={project.visible_public}
                                onCheckedChange={(checked) => {
                                  setProjectSelections((prev) =>
                                    prev.map((p) =>
                                      p.id === project.id ? { ...p, visible_public: checked } : p
                                    )
                                  );
                                }}
                              />
                              <span className="text-muted-foreground">Publiek</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <Switch
                                checked={project.visible_portal}
                                onCheckedChange={(checked) => {
                                  setProjectSelections((prev) =>
                                    prev.map((p) =>
                                      p.id === project.id ? { ...p, visible_portal: checked } : p
                                    )
                                  );
                                }}
                              />
                              <span className="text-muted-foreground">Portal</span>
                            </label>
                          </div>
                        )}
                      </div>
                      ))
                    )}
                  </div>
                </ScrollArea>

                {selectedProjectCount > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {selectedProjectCount} project{selectedProjectCount !== 1 ? "en" : ""} geselecteerd
                  </p>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setAddStep(1)} className="flex-1">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Terug
                  </Button>
                  <Button
                    onClick={() => addMediaMutation.mutate()}
                    disabled={addMediaMutation.isPending}
                    className="flex-1"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    {selectedProjectCount > 0 ? "Opslaan & Koppelen" : "Opslaan"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        </div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{videos.length}</div>
            <div className="text-sm text-muted-foreground">Totaal</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {videos.filter((v) => v.media_type === "video").length}
            </div>
            <div className="text-sm text-muted-foreground">Video's</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {videos.filter((v) => v.media_type === "photo").length}
            </div>
            <div className="text-sm text-muted-foreground">Foto's</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {videos.filter(isVideoLinked).length}
            </div>
            <div className="text-sm text-muted-foreground">Gekoppeld</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {videos.filter((v) => !isVideoLinked(v)).length}
            </div>
            <div className="text-sm text-muted-foreground">Niet gekoppeld</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek media..."
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle types</SelectItem>
            {VIDEO_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={linkFilter} onValueChange={setLinkFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Koppeling" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle media</SelectItem>
            <SelectItem value="unlinked">Ongekoppeld</SelectItem>
            <SelectItem value="linked">Gekoppeld</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk actions bar */}
      {selectedVideos.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
          <span className="text-sm font-medium">
            {selectedVideos.size} video{selectedVideos.size !== 1 ? "'s" : ""} geselecteerd
          </span>
          <Button
            size="sm"
            onClick={() => setIsBulkLinkDialogOpen(true)}
          >
            <Link2 className="h-4 w-4 mr-2" />
            Bulk koppelen
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={clearSelection}
          >
            Deselecteren
          </Button>
        </div>
      )}

      {/* Video List */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Laden...</div>
      ) : filteredVideos.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {search || typeFilter !== "all" ? "Geen media gevonden" : "Nog geen media toegevoegd"}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Select all header */}
          <div className="flex items-center gap-3 px-2">
            <Checkbox
              checked={selectedVideos.size === filteredVideos.length && filteredVideos.length > 0}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              Selecteer alle ({filteredVideos.length})
            </span>
          </div>
          {filteredVideos.map((video) => (
            <Card key={video.id} className={selectedVideos.has(video.id) ? "border-primary ring-1 ring-primary/20" : ""}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Selection checkbox */}
                  <div className="flex items-center">
                    <Checkbox
                      checked={selectedVideos.has(video.id)}
                      onCheckedChange={() => toggleVideoSelection(video.id)}
                    />
                  </div>
                  {/* Thumbnail */}
                  <div className="relative w-40 h-24 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    {(() => {
                      const thumbnailSrc = video.thumbnail_url 
                        || (video.image_urls?.length > 0 ? video.image_urls[0] : null)
                        || (video.media_type === "video" ? extractYouTubeThumbnail(video.video_url) : null);
                      
                      return thumbnailSrc ? (
                        <img
                          src={thumbnailSrc}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {video.media_type === "video" ? (
                            <Play className="h-8 w-8 text-muted-foreground" />
                          ) : (
                            <Image className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                      );
                    })()}
                    {video.media_type === "video" && video.video_url && (
                      <a
                        href={video.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity"
                      >
                        <ExternalLink className="h-6 w-6 text-white" />
                      </a>
                    )}
                    {/* Media type badge */}
                    <Badge 
                      className="absolute top-1 left-1 text-xs"
                      variant={video.media_type === "video" ? "default" : "secondary"}
                    >
                      {video.media_type === "video" ? "🎬" : `📷 ${video.image_urls?.length || 0}`}
                    </Badge>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold truncate">{video.title}</h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{format(new Date(video.video_date), "d MMM yyyy", { locale: nl })}</span>
                          <Badge variant="secondary" className={getTypeBadgeColor(video.video_type)}>
                            {VIDEO_TYPES.find((t) => t.value === video.video_type)?.label || video.video_type}
                          </Badge>
                        </div>
                        {video.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {video.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditVideo(video)}
                          title="Bewerken"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Verwijderen"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Media verwijderen?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Weet je zeker dat je "{video.title}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuleren</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteVideoMutation.mutate(video.id)}>
                                Verwijderen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    {/* Project Links */}
                    {video.links && video.links.length > 0 && (
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">Projecten:</span>
                        {video.links.map((link) => (
                          <Badge key={link.id} variant="outline" className="text-xs">
                            {link.project?.name || "Onbekend project"}
                            <span className="ml-1 flex items-center gap-0.5">
                              {link.visible_public ? (
                                <Eye className="h-3 w-3 text-green-600" />
                              ) : (
                                <EyeOff className="h-3 w-3 text-muted-foreground" />
                              )}
                            </span>
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Sale Links */}
                    {video.saleLinks && video.saleLinks.length > 0 && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">Verkopen:</span>
                        {video.saleLinks.map((link) => {
                          const customer = link.sale?.sale_customers?.[0]?.crm_lead;
                          const customerName = customer 
                            ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() 
                            : 'Onbekende klant';
                          return (
                            <Badge key={link.id} variant="outline" className="text-xs bg-green-50 border-green-200">
                              <Users className="h-3 w-3 mr-1 text-green-600" />
                              {customerName || 'Onbekende klant'}
                              {link.sale?.property_description && (
                                <span className="ml-1 text-muted-foreground">
                                  • {link.sale.property_description}
                                </span>
                              )}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog with Linking Tabs */}
      <VideoEditDialog
        video={editVideo}
        open={!!editVideo}
        onOpenChange={(open) => !open && setEditVideo(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["admin-videos"] });
          setEditVideo(null);
        }}
      />


      {/* YouTube Upload Dialog */}
      <YouTubeUploadDialog
        open={isYouTubeDialogOpen}
        onOpenChange={setIsYouTubeDialogOpen}
        onUploadComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["admin-videos"] });
        }}
      />

      {/* Bulk Link Dialog */}
      <BulkVideoLinkDialog
        videoIds={Array.from(selectedVideos)}
        videoTitles={videos.filter((v) => selectedVideos.has(v.id)).map((v) => v.title)}
        open={isBulkLinkDialogOpen}
        onOpenChange={setIsBulkLinkDialogOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["admin-videos"] });
          setIsBulkLinkDialogOpen(false);
          clearSelection();
        }}
      />
    </div>
  );
}
