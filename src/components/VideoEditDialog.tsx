import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProjectsList } from "@/hooks/useProjectsList";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Eye, Lock, Building2, Home, MapPin, Sparkles, Play, Image, Link2, Check } from "lucide-react";
import { MediaUploader } from "@/components/MediaUploader";
import { extractYouTubeId, extractYouTubeThumbnail, isYouTubeShorts } from "@/lib/youtube";
import { VideoLightbox } from "@/components/VideoLightbox";
import { VIDEO_TYPES } from "@/lib/constants";

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

interface VideoEditDialogProps {
  video: ProjectVideo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ProjectLink {
  projectId: string;
  projectName: string;
  city: string | null;
  isLinked: boolean;
  linkId?: string;
  visiblePublic: boolean;
  visiblePortal: boolean;
  isSuggested: boolean;
}

interface SaleLink {
  saleId: string;
  customerName: string;
  projectName: string;
  propertyRef: string | null;
  isLinked: boolean;
  linkId?: string;
}

interface CityLink {
  city: string;
  isLinked: boolean;
  linkId?: string;
  visiblePublic: boolean;
  visiblePortal: boolean;
  isSuggested: boolean;
}



export function VideoEditDialog({ video, open, onOpenChange, onSuccess }: VideoEditDialogProps) {
  const queryClient = useQueryClient();
  
  // Video metadata state
  const [editData, setEditData] = useState<ProjectVideo | null>(video);
  
  // Separate search states per tab
  const [projectSearch, setProjectSearch] = useState("");
  const [saleSearch, setSaleSearch] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [projectLinks, setProjectLinks] = useState<ProjectLink[]>([]);
  const [saleLinks, setSaleLinks] = useState<SaleLink[]>([]);
  const [cityLinks, setCityLinks] = useState<CityLink[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Reset when video changes
  useEffect(() => {
    if (video) {
      setEditData(video);
      setActiveTab("general");
      setProjectSearch("");
      setSaleSearch("");
      setCitySearch("");
    }
  }, [video]);

  // Use shared cached project list
  const { data: projectsList = [] } = useProjectsList();
  // Only expose when dialog is open; map to expected shape
  const projects = open ? projectsList.map(p => ({ id: p.id, name: p.name, city: p.city })) : [];

  // Fetch all active sales with customer info
  const { data: sales = [] } = useQuery({
    queryKey: ["all-sales-for-linking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          id,
          property_description,
          project:projects(name),
          sale_customers(
            crm_lead:crm_leads(first_name, last_name)
          )
        `)
        .neq("status", "geannuleerd")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data || []).filter(Boolean);
      return rows
        .map((sale: any) => {
          if (!sale?.id) return null;
          return {
            id: sale.id,
            propertyRef: sale.property_description,
            projectName: sale.project?.name || "Onbekend project",
            customerName: sale.sale_customers?.[0]?.crm_lead
              ? `${sale.sale_customers[0].crm_lead.first_name || ""} ${sale.sale_customers[0].crm_lead.last_name || ""}`.trim() || "Onbekend"
              : "Onbekend",
          };
        })
        .filter(Boolean);
    },
    enabled: open,
  });

  // Derive unique cities from the cached project list
  const cities = useMemo(() => {
    if (!open) return [];
    const uniqueCities = [...new Set(projectsList.map(p => p.city).filter(Boolean))] as string[];
    return uniqueCities.sort();
  }, [projectsList, open]);

  const videoId = video?.id ?? null;

  // Fetch existing project links
  const { data: existingProjectLinks = [] } = useQuery({
    queryKey: ["video-project-links", videoId],
    queryFn: async () => {
      if (!videoId) return [];
      const { data, error } = await supabase
        .from("project_video_links")
        .select("id, project_id, visible_public, visible_portal")
        .eq("video_id", videoId);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!videoId,
  });

  // Fetch existing sale links
  const { data: existingSaleLinks = [] } = useQuery({
    queryKey: ["video-sale-links", videoId],
    queryFn: async () => {
      if (!videoId) return [];
      const { data, error } = await supabase
        .from("sale_video_links")
        .select("id, sale_id")
        .eq("video_id", videoId);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!videoId,
  });

  // Fetch existing city links
  const { data: existingCityLinks = [] } = useQuery({
    queryKey: ["video-city-links", videoId],
    queryFn: async () => {
      if (!videoId) return [];
      const { data, error } = await supabase
        .from("city_video_links")
        .select("id, city, visible_public, visible_portal")
        .eq("video_id", videoId);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!videoId,
  });

  // Smart suggestions based on video title - return stable arrays instead of Sets
  const suggestions = useMemo(() => {
    const titleLower = (editData?.title || '').toLowerCase();
    
    const suggestedProjectIds: string[] = [];
    const suggestedCities: string[] = [];
    
    projects.forEach((project) => {
      const projectWords = project.name.toLowerCase().split(/\s+/);
      const hasMatch = projectWords.some((word) => 
        word.length > 3 && titleLower.includes(word)
      );
      
      if (hasMatch && !suggestedProjectIds.includes(project.id)) {
        suggestedProjectIds.push(project.id);
      }
      
      if (project.city && titleLower.includes(project.city.toLowerCase())) {
        if (!suggestedProjectIds.includes(project.id)) {
          suggestedProjectIds.push(project.id);
        }
        if (!suggestedCities.includes(project.city)) {
          suggestedCities.push(project.city);
        }
      }
    });
    
    cities.forEach((city) => {
      if (titleLower.includes(city.toLowerCase()) && !suggestedCities.includes(city)) {
        suggestedCities.push(city);
      }
    });
    
    return { 
      suggestedProjectIds: suggestedProjectIds.sort(), 
      suggestedCities: suggestedCities.sort() 
    };
  }, [projects, cities, editData?.title]);

  // Stable JSON strings for dependency arrays to prevent infinite loops
  const suggestedProjectIdsKey = JSON.stringify(suggestions.suggestedProjectIds);
  const suggestedCitiesKey = JSON.stringify(suggestions.suggestedCities);
  const existingProjectLinksKey = JSON.stringify(existingProjectLinks.map(l => l.project_id).sort());
  const existingSaleLinksKey = JSON.stringify(existingSaleLinks.map(l => l.sale_id).sort());
  const existingCityLinksKey = JSON.stringify(existingCityLinks.map(l => l.city).sort());

  // Initialize project links
  useEffect(() => {
    if (projects.length > 0) {
      const suggestedSet = new Set(suggestions.suggestedProjectIds);
      const links = projects.map((project) => {
        const existingLink = existingProjectLinks.find((l) => l.project_id === project.id);
        const isSuggested = suggestedSet.has(project.id);
        return {
          projectId: project.id,
          projectName: project.name,
          city: project.city,
          isLinked: !!existingLink,
          linkId: existingLink?.id,
          visiblePublic: existingLink?.visible_public ?? true,
          visiblePortal: existingLink?.visible_portal ?? true,
          isSuggested,
        };
      });
      links.sort((a, b) => {
        if (a.isLinked && !b.isLinked) return -1;
        if (!a.isLinked && b.isLinked) return 1;
        if (a.isSuggested && !b.isSuggested) return -1;
        if (!a.isSuggested && b.isSuggested) return 1;
        return a.projectName.localeCompare(b.projectName);
      });
      setProjectLinks(links);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, existingProjectLinksKey, suggestedProjectIdsKey]);

  // Initialize sale links
  useEffect(() => {
    if (sales.length > 0) {
      const links = sales.map((sale) => {
        const existingLink = existingSaleLinks.find((l) => l.sale_id === sale.id);
        return {
          saleId: sale.id,
          customerName: sale.customerName,
          projectName: sale.projectName,
          propertyRef: sale.propertyRef,
          isLinked: !!existingLink,
          linkId: existingLink?.id,
        };
      });
      setSaleLinks(links);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, existingSaleLinksKey]);

  // Initialize city links
  useEffect(() => {
    if (cities.length > 0) {
      const suggestedSet = new Set(suggestions.suggestedCities);
      const links = cities.map((city) => {
        const existingLink = existingCityLinks.find((l) => l.city === city);
        const isSuggested = suggestedSet.has(city);
        return {
          city,
          isLinked: !!existingLink,
          linkId: existingLink?.id,
          visiblePublic: existingLink?.visible_public ?? true,
          visiblePortal: existingLink?.visible_portal ?? true,
          isSuggested,
        };
      });
      links.sort((a, b) => {
        if (a.isLinked && !b.isLinked) return -1;
        if (!a.isLinked && b.isLinked) return 1;
        if (a.isSuggested && !b.isSuggested) return -1;
        if (!a.isSuggested && b.isSuggested) return 1;
        return a.city.localeCompare(b.city);
      });
      setCityLinks(links);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cities, existingCityLinksKey, suggestedCitiesKey]);

  const toggleProjectLink = (projectId: string) => {
    setProjectLinks((prev) =>
      prev.map((p) => (p.projectId === projectId ? { ...p, isLinked: !p.isLinked } : p))
    );
  };

  const toggleProjectVisibility = (projectId: string, field: "visiblePublic" | "visiblePortal") => {
    setProjectLinks((prev) =>
      prev.map((p) => (p.projectId === projectId ? { ...p, [field]: !p[field] } : p))
    );
  };

  const toggleSaleLink = (saleId: string) => {
    setSaleLinks((prev) =>
      prev.map((s) => (s.saleId === saleId ? { ...s, isLinked: !s.isLinked } : s))
    );
  };

  const toggleCityLink = (city: string) => {
    setCityLinks((prev) =>
      prev.map((c) => (c.city === city ? { ...c, isLinked: !c.isLinked } : c))
    );
  };

  const toggleCityVisibility = (city: string, field: "visiblePublic" | "visiblePortal") => {
    setCityLinks((prev) =>
      prev.map((c) => (c.city === city ? { ...c, [field]: !c[field] } : c))
    );
  };

  const handleSave = async () => {
    if (!video || !editData) return;
    
    setIsSaving(true);
    try {
      // 1. Update video metadata
      const thumbnail = editData.media_type === "video" 
        ? extractYouTubeThumbnail(editData.video_url) 
        : (editData.image_urls?.[0] || null);
      
      const { error: updateError } = await supabase
        .from("project_videos")
        .update({
          video_url: editData.video_url,
          title: editData.title,
          description: editData.description,
          video_date: editData.video_date,
          video_type: editData.video_type,
          thumbnail_url: thumbnail,
          media_type: editData.media_type,
          image_urls: editData.image_urls || [],
        })
        .eq("id", video.id);
      if (updateError) throw updateError;

      // 2. Save project links
      const projectsToAdd = projectLinks.filter((p) => p.isLinked && !p.linkId);
      const projectsToRemove = projectLinks.filter((p) => !p.isLinked && p.linkId);
      const projectsToUpdate = projectLinks.filter((p) => p.isLinked && p.linkId);

      if (projectsToAdd.length > 0) {
        const { error } = await supabase.from("project_video_links").insert(
          projectsToAdd.map((p) => ({
            video_id: video.id,
            project_id: p.projectId,
            visible_public: p.visiblePublic,
            visible_portal: p.visiblePortal,
          }))
        );
        if (error) throw error;
      }

      if (projectsToRemove.length > 0) {
        const { error } = await supabase
          .from("project_video_links")
          .delete()
          .in("id", projectsToRemove.map((p) => p.linkId!));
        if (error) throw error;
      }

      // Batch update visibility for existing project links
      if (projectsToUpdate.length > 0) {
        await Promise.all(
          projectsToUpdate.map((link) =>
            supabase
              .from("project_video_links")
              .update({ visible_public: link.visiblePublic, visible_portal: link.visiblePortal })
              .eq("id", link.linkId!)
          )
        );
      }

      // 3. Save sale links
      const salesToAdd = saleLinks.filter((s) => s.isLinked && !s.linkId);
      const salesToRemove = saleLinks.filter((s) => !s.isLinked && s.linkId);

      if (salesToAdd.length > 0) {
        const { error } = await supabase.from("sale_video_links").insert(
          salesToAdd.map((s) => ({
            video_id: video.id,
            sale_id: s.saleId,
          }))
        );
        if (error) throw error;
      }

      if (salesToRemove.length > 0) {
        const { error } = await supabase
          .from("sale_video_links")
          .delete()
          .in("id", salesToRemove.map((s) => s.linkId!));
        if (error) throw error;
      }

      // 4. Save city links
      const citiesToAdd = cityLinks.filter((c) => c.isLinked && !c.linkId);
      const citiesToRemove = cityLinks.filter((c) => !c.isLinked && c.linkId);
      const citiesToUpdate = cityLinks.filter((c) => c.isLinked && c.linkId);

      if (citiesToAdd.length > 0) {
        const { error } = await supabase.from("city_video_links").insert(
          citiesToAdd.map((c) => ({
            video_id: video.id,
            city: c.city,
            visible_public: c.visiblePublic,
            visible_portal: c.visiblePortal,
          }))
        );
        if (error) throw error;
      }

      if (citiesToRemove.length > 0) {
        const { error } = await supabase
          .from("city_video_links")
          .delete()
          .in("id", citiesToRemove.map((c) => c.linkId!));
        if (error) throw error;
      }

      // Batch update visibility for existing city links
      if (citiesToUpdate.length > 0) {
        await Promise.all(
          citiesToUpdate.map((link) =>
            supabase
              .from("city_video_links")
              .update({ visible_public: link.visiblePublic, visible_portal: link.visiblePortal })
              .eq("id", link.linkId!)
          )
        );
      }

      queryClient.invalidateQueries({ queryKey: ["admin-videos"] });
      toast.success("Media en koppelingen opgeslagen");
      onSuccess();
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Fout bij opslaan");
    } finally {
      setIsSaving(false);
    }
  };

  // Memoized counts and filtered lists
  const linkedProjectCount = useMemo(() => projectLinks.filter((p) => p.isLinked).length, [projectLinks]);
  const linkedSaleCount = useMemo(() => saleLinks.filter((s) => s.isLinked).length, [saleLinks]);
  const linkedCityCount = useMemo(() => cityLinks.filter((c) => c.isLinked).length, [cityLinks]);

  const filteredProjects = useMemo(() => 
    projectLinks.filter((p) =>
      p.projectName.toLowerCase().includes(projectSearch.toLowerCase()) ||
      (p.city && p.city.toLowerCase().includes(projectSearch.toLowerCase()))
    ),
    [projectLinks, projectSearch]
  );

  const filteredSales = useMemo(() =>
    saleLinks.filter((s) =>
      s.customerName.toLowerCase().includes(saleSearch.toLowerCase()) ||
      s.projectName.toLowerCase().includes(saleSearch.toLowerCase()) ||
      (s.propertyRef && s.propertyRef.toLowerCase().includes(saleSearch.toLowerCase()))
    ),
    [saleLinks, saleSearch]
  );

  const filteredCities = useMemo(() =>
    cityLinks.filter((c) => c.city.toLowerCase().includes(citySearch.toLowerCase())),
    [cityLinks, citySearch]
  );

  // Memoized linked/unlinked split for rendering
  const { linkedProjects, unlinkedProjects } = useMemo(() => ({
    linkedProjects: projectLinks.filter((p) => p.isLinked),
    unlinkedProjects: filteredProjects.filter((p) => !p.isLinked),
  }), [projectLinks, filteredProjects]);

  const { linkedSales, unlinkedSales } = useMemo(() => ({
    linkedSales: saleLinks.filter((s) => s.isLinked),
    unlinkedSales: filteredSales.filter((s) => !s.isLinked),
  }), [saleLinks, filteredSales]);

  const { linkedCitiesData, unlinkedCities } = useMemo(() => ({
    linkedCitiesData: cityLinks.filter((c) => c.isLinked),
    unlinkedCities: filteredCities.filter((c) => !c.isLinked),
  }), [cityLinks, filteredCities]);

  const youtubeId = editData?.media_type === "video" ? extractYouTubeId(editData.video_url) : null;

  // Don't render if video or editData is not available
  if (!video || !editData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh] max-h-[90vh] min-h-0 overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Media Bewerken</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pr-4">
          <div className="flex flex-col">
            {/* Video/Photo Preview - now scrollable */}
            {editData.media_type === "video" && youtubeId ? (
              <>
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className={`relative w-full rounded-lg overflow-hidden bg-black mb-4 cursor-pointer group ${
                    isYouTubeShorts(editData.video_url)
                      ? "aspect-[9/16] max-h-80 max-w-[180px] mx-auto"
                      : "aspect-video max-h-64"
                  }`}
                >
                  <img
                    src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
                    alt={editData.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                    <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="h-8 w-8 text-white fill-white ml-1" />
                    </div>
                  </div>
                </button>
                <VideoLightbox
                  open={lightboxOpen}
                  onOpenChange={setLightboxOpen}
                  youtubeId={youtubeId}
                  title={editData.title}
                  isShorts={isYouTubeShorts(editData.video_url)}
                />
              </>
            ) : editData.media_type === "photo" && editData.image_urls?.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                {editData.image_urls.slice(0, 5).map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`${editData.title} ${idx + 1}`}
                    className="h-32 rounded-lg object-cover flex-shrink-0"
                  />
                ))}
                {editData.image_urls.length > 5 && (
                  <div className="h-32 w-24 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-sm text-muted-foreground">+{editData.image_urls.length - 5}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-video w-full max-h-48 rounded-lg bg-muted mb-4 flex items-center justify-center">
                {editData.media_type === "video" ? (
                  <Play className="h-12 w-12 text-muted-foreground" />
                ) : (
                  <Image className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general">Algemeen</TabsTrigger>
                <TabsTrigger value="projects" className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  Projecten
                  {linkedProjectCount > 0 && (
                    <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5 ml-1">
                      {linkedProjectCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="sales" className="flex items-center gap-1">
                  <Home className="h-3 w-3" />
                  Verkopen
                  {linkedSaleCount > 0 && (
                    <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5 ml-1">
                      {linkedSaleCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="cities" className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Gemeentes
                  {linkedCityCount > 0 && (
                    <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5 ml-1">
                      {linkedCityCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* General Tab */}
              <TabsContent value="general" className="mt-4">
                <div className="space-y-4">
                  {editData.media_type === "video" ? (
                    <div>
                      <Label>YouTube URL</Label>
                      <Input value={editData.video_url} onChange={(e) => setEditData({ ...editData, video_url: e.target.value })} />
                      {editData.video_url && !youtubeId && (
                        <p className="text-xs text-amber-600 mt-1">
                          We herkennen geen YouTube video-id in deze link (ook Shorts worden ondersteund).
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <Label>Foto's</Label>
                      <MediaUploader
                        uploadedUrls={editData.image_urls || []}
                        onUrlsChange={(urls) => setEditData({ ...editData, image_urls: urls })}
                        maxFiles={20}
                      />
                    </div>
                  )}
                  <div>
                    <Label>Titel</Label>
                    <Input value={editData.title} onChange={(e) => setEditData({ ...editData, title: e.target.value })} />
                  </div>
                  <div>
                    <Label>Beschrijving</Label>
                    <Textarea value={editData.description || ""} onChange={(e) => setEditData({ ...editData, description: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Datum</Label>
                      <Input
                        type="date"
                        value={editData.video_date}
                        onChange={(e) => setEditData({ ...editData, video_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select value={editData.video_type} onValueChange={(value) => setEditData({ ...editData, video_type: value })}>
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
                </div>
              </TabsContent>

              {/* Projects Tab */}
              <TabsContent value="projects" className="mt-4 flex flex-col">
                {linkedProjects.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2 text-green-700">
                      <Link2 className="h-4 w-4" />
                      <span className="font-medium text-sm">Gekoppeld ({linkedProjects.length})</span>
                    </div>
                    <div className="space-y-2">
                      {linkedProjects.map((project) => (
                        <div
                          key={project.projectId}
                          className="flex items-center justify-between p-3 rounded-lg border-l-4 border-l-green-500 border border-green-200 bg-green-50"
                        >
                          <div className="flex items-center gap-3">
                            <Check className="h-4 w-4 text-green-600" />
                            <div>
                              <span className="font-medium">{project.projectName}</span>
                              {project.city && <span className="text-sm text-muted-foreground ml-2">• {project.city}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => toggleProjectVisibility(project.projectId, "visiblePublic")}
                              className={`p-1.5 rounded ${
                                project.visiblePublic ? "bg-green-100 text-green-700" : "bg-white text-muted-foreground"
                              }`}
                              title={project.visiblePublic ? "Zichtbaar op website" : "Verborgen op website"}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleProjectVisibility(project.projectId, "visiblePortal")}
                              className={`p-1.5 rounded ${
                                project.visiblePortal ? "bg-blue-100 text-blue-700" : "bg-white text-muted-foreground"
                              }`}
                              title={project.visiblePortal ? "Zichtbaar in portaal" : "Verborgen in portaal"}
                            >
                              <Lock className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleProjectLink(project.projectId)}
                              className="p-1.5 rounded bg-red-100 text-red-600 hover:bg-red-200 ml-1"
                              title="Ontkoppelen"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Beschikbaar sectie */}
                <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                  <span className="font-medium text-sm">Beschikbaar</span>
                </div>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    placeholder="Zoek project..."
                    className="pl-10"
                  />
                </div>
                <div className="space-y-2">
                  {unlinkedProjects.map((project) => (
                    <div
                      key={project.projectId}
                      className={`flex items-center justify-between p-3 rounded-lg border bg-card ${
                        project.isSuggested ? "ring-1 ring-amber-300" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox checked={project.isLinked} onCheckedChange={() => toggleProjectLink(project.projectId)} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{project.projectName}</span>
                            {project.isSuggested && (
                              <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-700">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Suggestie
                              </Badge>
                            )}
                          </div>
                          {project.city && <span className="text-sm text-muted-foreground">{project.city}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Sales Tab */}
              <TabsContent value="sales" className="mt-4 flex flex-col">
                {linkedSales.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2 text-green-700">
                      <Link2 className="h-4 w-4" />
                      <span className="font-medium text-sm">Gekoppeld ({linkedSales.length})</span>
                    </div>
                    <div className="space-y-2">
                      {linkedSales.map((sale) => (
                        <div
                          key={sale.saleId}
                          className="flex items-center justify-between p-3 rounded-lg border-l-4 border-l-green-500 border border-green-200 bg-green-50"
                        >
                          <div className="flex items-center gap-3">
                            <Check className="h-4 w-4 text-green-600" />
                            <div>
                              <span className="font-medium">{sale.customerName}</span>
                              <div className="text-sm text-muted-foreground">
                                {sale.projectName}
                                {sale.propertyRef && ` • ${sale.propertyRef}`}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleSaleLink(sale.saleId)}
                            className="p-1.5 rounded bg-red-100 text-red-600 hover:bg-red-200"
                            title="Ontkoppelen"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Beschikbaar sectie */}
                <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                  <span className="font-medium text-sm">Beschikbaar</span>
                </div>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={saleSearch}
                    onChange={(e) => setSaleSearch(e.target.value)}
                    placeholder="Zoek verkoop..."
                    className="pl-10"
                  />
                </div>
                <div className="space-y-2">
                  {unlinkedSales.map((sale) => (
                    <div
                      key={sale.saleId}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox checked={sale.isLinked} onCheckedChange={() => toggleSaleLink(sale.saleId)} />
                        <div>
                          <span className="font-medium">{sale.customerName}</span>
                          <div className="text-sm text-muted-foreground">
                            {sale.projectName}
                            {sale.propertyRef && ` • ${sale.propertyRef}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Cities Tab */}
              <TabsContent value="cities" className="mt-4 flex flex-col">
                {linkedCitiesData.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2 text-green-700">
                      <Link2 className="h-4 w-4" />
                      <span className="font-medium text-sm">Gekoppeld ({linkedCitiesData.length})</span>
                    </div>
                    <div className="space-y-2">
                      {linkedCitiesData.map((cityItem) => (
                        <div
                          key={cityItem.city}
                          className="flex items-center justify-between p-3 rounded-lg border-l-4 border-l-green-500 border border-green-200 bg-green-50"
                        >
                          <div className="flex items-center gap-3">
                            <Check className="h-4 w-4 text-green-600" />
                            <span className="font-medium">{cityItem.city}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => toggleCityVisibility(cityItem.city, "visiblePublic")}
                              className={`p-1.5 rounded ${
                                cityItem.visiblePublic ? "bg-green-100 text-green-700" : "bg-white text-muted-foreground"
                              }`}
                              title={cityItem.visiblePublic ? "Zichtbaar op website" : "Verborgen op website"}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleCityVisibility(cityItem.city, "visiblePortal")}
                              className={`p-1.5 rounded ${
                                cityItem.visiblePortal ? "bg-blue-100 text-blue-700" : "bg-white text-muted-foreground"
                              }`}
                              title={cityItem.visiblePortal ? "Zichtbaar in portaal" : "Verborgen in portaal"}
                            >
                              <Lock className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleCityLink(cityItem.city)}
                              className="p-1.5 rounded bg-red-100 text-red-600 hover:bg-red-200 ml-1"
                              title="Ontkoppelen"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Beschikbaar sectie */}
                <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                  <span className="font-medium text-sm">Beschikbaar</span>
                </div>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                    placeholder="Zoek gemeente..."
                    className="pl-10"
                  />
                </div>
                <div className="space-y-2">
                  {unlinkedCities.map((cityItem) => (
                    <div
                      key={cityItem.city}
                      className={`flex items-center justify-between p-3 rounded-lg border bg-card ${
                        cityItem.isSuggested ? "ring-1 ring-amber-300" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox checked={cityItem.isLinked} onCheckedChange={() => toggleCityLink(cityItem.city)} />
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{cityItem.city}</span>
                          {cityItem.isSuggested && (
                            <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-700">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Suggestie
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>


        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Opslaan..." : "Opslaan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
