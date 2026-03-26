import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Building2, MapPin, Sparkles } from "lucide-react";
import { useProjectsList } from "@/hooks/useProjectsList";
import { supabase } from "@/integrations/supabase/client";

interface BulkVideoLinkDialogProps {
  videoIds: string[];
  videoTitles: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ProjectLink {
  projectId: string;
  projectName: string;
  city: string | null;
  isLinked: boolean;
  isSuggested: boolean;
}

interface CityLink {
  city: string;
  isLinked: boolean;
  isSuggested: boolean;
}

export function BulkVideoLinkDialog({ videoIds, videoTitles, open, onOpenChange, onSuccess }: BulkVideoLinkDialogProps) {
  const [search, setSearch] = useState("");
  const [projectLinks, setProjectLinks] = useState<ProjectLink[]>([]);
  const [cityLinks, setCityLinks] = useState<CityLink[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("projects");

  // Use cached projects list instead of separate queries
  const { data: projectsList = [] } = useProjectsList();
  const projects = projectsList;

  // Derive unique cities from cached projects
  const cities = useMemo(() => {
    return [...new Set(projectsList.map(p => p.city).filter(Boolean))].sort() as string[];
  }, [projectsList]);

  // Smart suggestions based on video titles
  const suggestions = useMemo(() => {
    const combinedTitles = videoTitles.join(" ").toLowerCase();
    
    const suggestedProjectIds = new Set<string>();
    const suggestedCities = new Set<string>();
    
    projects.forEach((project) => {
      // Check if project name appears in any video title
      const projectWords = project.name.toLowerCase().split(/\s+/);
      const hasMatch = projectWords.some((word) => 
        word.length > 3 && combinedTitles.includes(word)
      );
      
      if (hasMatch) {
        suggestedProjectIds.add(project.id);
      }
      
      // Check if city appears in any video title
      if (project.city && combinedTitles.includes(project.city.toLowerCase())) {
        suggestedProjectIds.add(project.id);
        suggestedCities.add(project.city);
      }
    });
    
    cities.forEach((city) => {
      if (combinedTitles.includes(city.toLowerCase())) {
        suggestedCities.add(city);
      }
    });
    
    return { suggestedProjectIds, suggestedCities };
  }, [projects, cities, videoTitles]);

  // Initialize project links with suggestions
  useEffect(() => {
    if (!open || projects.length === 0) return;
    const links = projects.map((project) => ({
      projectId: project.id,
      projectName: project.name,
      city: project.city,
      isLinked: false,
      isSuggested: suggestions.suggestedProjectIds.has(project.id),
    }));
    links.sort((a, b) => {
      if (a.isSuggested && !b.isSuggested) return -1;
      if (!a.isSuggested && b.isSuggested) return 1;
      return a.projectName.localeCompare(b.projectName);
    });
    setProjectLinks(links);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projects]);

  // Initialize city links with suggestions
  useEffect(() => {
    if (!open || cities.length === 0) return;
    const links = cities.map((city) => ({
      city,
      isLinked: false,
      isSuggested: suggestions.suggestedCities.has(city),
    }));
    links.sort((a, b) => {
      if (a.isSuggested && !b.isSuggested) return -1;
      if (!a.isSuggested && b.isSuggested) return 1;
      return a.city.localeCompare(b.city);
    });
    setCityLinks(links);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cities]);

  const toggleProjectLink = (projectId: string) => {
    setProjectLinks((prev) =>
      prev.map((p) => (p.projectId === projectId ? { ...p, isLinked: !p.isLinked } : p))
    );
  };

  const toggleCityLink = (city: string) => {
    setCityLinks((prev) =>
      prev.map((c) => (c.city === city ? { ...c, isLinked: !c.isLinked } : c))
    );
  };

  const selectAllSuggested = () => {
    setProjectLinks((prev) =>
      prev.map((p) => (p.isSuggested ? { ...p, isLinked: true } : p))
    );
    setCityLinks((prev) =>
      prev.map((c) => (c.isSuggested ? { ...c, isLinked: true } : c))
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const selectedProjects = projectLinks.filter((p) => p.isLinked);
      const selectedCities = cityLinks.filter((c) => c.isLinked);

      if (selectedProjects.length === 0 && selectedCities.length === 0) {
        toast.error("Selecteer minstens 1 project of gemeente");
        setIsSaving(false);
        return;
      }

      // Create project links for all selected videos
      if (selectedProjects.length > 0) {
        const projectLinksToInsert = videoIds.flatMap((videoId) =>
          selectedProjects.map((p) => ({
            video_id: videoId,
            project_id: p.projectId,
            visible_public: true,
            visible_portal: true,
          }))
        );

        // Use upsert to avoid duplicates
        const { error } = await supabase
          .from("project_video_links")
          .upsert(projectLinksToInsert, { onConflict: "video_id,project_id", ignoreDuplicates: true });
        if (error) throw error;
      }

      // Create city links for all selected videos
      if (selectedCities.length > 0) {
        const cityLinksToInsert = videoIds.flatMap((videoId) =>
          selectedCities.map((c) => ({
            video_id: videoId,
            city: c.city,
            visible_public: true,
            visible_portal: true,
          }))
        );

        // Use upsert to avoid duplicates
        const { error } = await supabase
          .from("city_video_links")
          .upsert(cityLinksToInsert, { onConflict: "video_id,city", ignoreDuplicates: true });
        if (error) throw error;
      }

      const totalLinks = selectedProjects.length + selectedCities.length;
      toast.success(`${videoIds.length} video's gekoppeld aan ${totalLinks} item(s)`);
      onSuccess();
    } catch (error) {
      console.error("Error saving bulk links:", error);
      toast.error("Fout bij opslaan koppelingen");
    } finally {
      setIsSaving(false);
    }
  };

  const linkedProjectCount = projectLinks.filter((p) => p.isLinked).length;
  const linkedCityCount = cityLinks.filter((c) => c.isLinked).length;
  const suggestedCount = suggestions.suggestedProjectIds.size + suggestions.suggestedCities.size;

  const filteredProjects = projectLinks.filter((p) =>
    p.projectName.toLowerCase().includes(search.toLowerCase()) ||
    (p.city && p.city.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredCities = cityLinks.filter((c) =>
    c.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk koppelen ({videoIds.length} video's)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">Geselecteerde video's: {videoIds.length}</p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {videoTitles.slice(0, 3).join(", ")}{videoTitles.length > 3 && ` en ${videoTitles.length - 3} meer...`}
            </p>
          </div>

          {suggestedCount > 0 && (
            <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-amber-800 dark:text-amber-200">
                  {suggestedCount} suggestie(s) gevonden op basis van titels
                </span>
              </div>
              <Button size="sm" variant="outline" onClick={selectAllSuggested}>
                Selecteer suggesties
              </Button>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="projects" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Projecten
                {linkedProjectCount > 0 && (
                  <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5">
                    {linkedProjectCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="cities" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Gemeentes
                {linkedCityCount > 0 && (
                  <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5">
                    {linkedCityCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={activeTab === "projects" ? "Zoek project..." : "Zoek gemeente..."}
                className="pl-10"
              />
            </div>

            <TabsContent value="projects" className="mt-4">
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {filteredProjects.map((project) => (
                    <div
                      key={project.projectId}
                      className={`p-3 rounded-lg border transition-colors ${
                        project.isLinked 
                          ? "border-primary/50 bg-primary/5" 
                          : project.isSuggested 
                            ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20" 
                            : "border-border"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`bulk-project-${project.projectId}`}
                          checked={project.isLinked}
                          onCheckedChange={() => toggleProjectLink(project.projectId)}
                        />
                        <Label
                          htmlFor={`bulk-project-${project.projectId}`}
                          className="flex-1 cursor-pointer flex items-center gap-2"
                        >
                          <span className="font-medium text-sm">{project.projectName}</span>
                          {project.city && (
                            <span className="text-xs text-muted-foreground">({project.city})</span>
                          )}
                          {project.isSuggested && (
                            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Suggestie
                            </Badge>
                          )}
                        </Label>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="cities" className="mt-4">
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {filteredCities.map((cityLink) => (
                    <div
                      key={cityLink.city}
                      className={`p-3 rounded-lg border transition-colors ${
                        cityLink.isLinked 
                          ? "border-primary/50 bg-primary/5" 
                          : cityLink.isSuggested 
                            ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20" 
                            : "border-border"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`bulk-city-${cityLink.city}`}
                          checked={cityLink.isLinked}
                          onCheckedChange={() => toggleCityLink(cityLink.city)}
                        />
                        <Label
                          htmlFor={`bulk-city-${cityLink.city}`}
                          className="flex-1 cursor-pointer flex items-center gap-2"
                        >
                          <span className="font-medium text-sm">{cityLink.city}</span>
                          {cityLink.isSuggested && (
                            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Suggestie
                            </Badge>
                          )}
                        </Label>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Annuleren
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving || (linkedProjectCount === 0 && linkedCityCount === 0)}
              className="flex-1"
            >
              {isSaving ? "Opslaan..." : `Koppel ${videoIds.length} video's`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
