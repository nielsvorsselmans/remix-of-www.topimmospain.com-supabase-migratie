import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProjectsList } from "@/hooks/useProjectsList";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Search, Eye, Lock } from "lucide-react";

interface VideoLinkDialogProps {
  video: {
    id: string;
    title: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ProjectLink {
  projectId: string;
  projectName: string;
  isLinked: boolean;
  linkId?: string;
  visiblePublic: boolean;
  visiblePortal: boolean;
}

export function VideoLinkDialog({ video, open, onOpenChange, onSuccess }: VideoLinkDialogProps) {
  const [search, setSearch] = useState("");
  const [projectLinks, setProjectLinks] = useState<ProjectLink[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch all active projects - shared cached hook
  const { data: projects = [] } = useProjectsList();

  // Fetch existing links for this video
  const { data: existingLinks = [] } = useQuery({
    queryKey: ["video-links", video.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_video_links")
        .select("id, project_id, visible_public, visible_portal")
        .eq("video_id", video.id);
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Initialize project links state when data loads
  useEffect(() => {
    if (projects.length > 0) {
      const links = projects.map((project) => {
        const existingLink = existingLinks.find((l) => l.project_id === project.id);
        return {
          projectId: project.id,
          projectName: project.name,
          isLinked: !!existingLink,
          linkId: existingLink?.id,
          visiblePublic: existingLink?.visible_public ?? true,
          visiblePortal: existingLink?.visible_portal ?? true,
        };
      });
      setProjectLinks(links);
    }
  }, [projects, existingLinks]);

  const filteredProjects = projectLinks.filter((p) =>
    p.projectName.toLowerCase().includes(search.toLowerCase())
  );

  const toggleLink = (projectId: string) => {
    setProjectLinks((prev) =>
      prev.map((p) =>
        p.projectId === projectId ? { ...p, isLinked: !p.isLinked } : p
      )
    );
  };

  const toggleVisibility = (projectId: string, field: "visiblePublic" | "visiblePortal") => {
    setProjectLinks((prev) =>
      prev.map((p) =>
        p.projectId === projectId ? { ...p, [field]: !p[field] } : p
      )
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Get current state
      const toAdd = projectLinks.filter((p) => p.isLinked && !p.linkId);
      const toRemove = projectLinks.filter((p) => !p.isLinked && p.linkId);
      const toUpdate = projectLinks.filter((p) => p.isLinked && p.linkId);

      // Add new links
      if (toAdd.length > 0) {
        const { error } = await supabase.from("project_video_links").insert(
          toAdd.map((p) => ({
            video_id: video.id,
            project_id: p.projectId,
            visible_public: p.visiblePublic,
            visible_portal: p.visiblePortal,
          }))
        );
        if (error) throw error;
      }

      // Remove unlinked
      if (toRemove.length > 0) {
        const { error } = await supabase
          .from("project_video_links")
          .delete()
          .in("id", toRemove.map((p) => p.linkId!));
        if (error) throw error;
      }

      // Update existing
      for (const link of toUpdate) {
        const { error } = await supabase
          .from("project_video_links")
          .update({
            visible_public: link.visiblePublic,
            visible_portal: link.visiblePortal,
          })
          .eq("id", link.linkId!);
        if (error) throw error;
      }

      toast.success("Koppelingen opgeslagen");
      onSuccess();
    } catch (error) {
      console.error("Error saving links:", error);
      toast.error("Fout bij opslaan koppelingen");
    } finally {
      setIsSaving(false);
    }
  };

  const linkedCount = projectLinks.filter((p) => p.isLinked).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Video koppelen aan projecten</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">{video.title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {linkedCount} project{linkedCount !== 1 ? "en" : ""} gekoppeld
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Zoek project..."
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {filteredProjects.map((project) => (
                <div
                  key={project.projectId}
                  className={`p-3 rounded-lg border transition-colors ${
                    project.isLinked ? "border-primary/50 bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={project.projectId}
                      checked={project.isLinked}
                      onCheckedChange={() => toggleLink(project.projectId)}
                    />
                    <Label
                      htmlFor={project.projectId}
                      className="flex-1 cursor-pointer font-medium text-sm"
                    >
                      {project.projectName}
                    </Label>
                  </div>

                  {project.isLinked && (
                    <div className="mt-2 ml-7 flex items-center gap-4">
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox
                          checked={project.visiblePublic}
                          onCheckedChange={() => toggleVisibility(project.projectId, "visiblePublic")}
                        />
                        <Eye className="h-3.5 w-3.5" />
                        <span>Publiek</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox
                          checked={project.visiblePortal}
                          onCheckedChange={() => toggleVisibility(project.projectId, "visiblePortal")}
                        />
                        <Lock className="h-3.5 w-3.5" />
                        <span>Portal</span>
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Opslaan..." : "Opslaan"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}