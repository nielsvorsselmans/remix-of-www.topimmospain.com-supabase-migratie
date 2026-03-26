import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProjectsList } from "@/hooks/useProjectsList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Building2,
  Plus,
  Trash2,
  ExternalLink,
  Heart,
  Lightbulb,
  MapPin,
  Star,
  UserCheck,
} from "lucide-react";
import { PartnerKlant, useAddPartnerProject, useUpdatePartnerProject, useDeletePartnerProject } from "@/hooks/usePartnerKlant";
import { useKlantFavorites } from "@/hooks/useKlantFavorites";
import { toast } from "sonner";
import { scoreAndSortProjects, getScoreStars, CustomerPreferences } from "@/lib/projectScoring";

interface PartnerKlantProjectenTabsProps {
  klant: PartnerKlant;
  partnerId: string;
}

const STATUS_OPTIONS = [
  { value: "suggested", label: "Voorgesteld" },
  { value: "interested", label: "Geïnteresseerd" },
  { value: "visited", label: "Bezocht" },
  { value: "rejected", label: "Afgewezen" },
];

const STATUS_SORT_ORDER: Record<string, number> = {
  to_visit: 1,
  interested: 2,
  suggested: 3,
  visited: 4,
  favorite_only: 4.5,
  rejected: 5,
};

const getStatusColor = (status: string | null) => {
  switch (status) {
    case "interested":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "visited":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "rejected":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default:
      return "bg-muted text-muted-foreground";
  }
};

interface UnifiedItem {
  key: string;
  projectId: string;
  projectName: string | null;
  projectCity: string | null;
  projectImage: string | null;
  projectPriceFrom: number | null;
  selectionId: string | null;
  status: string | null;
  isFavorite: boolean;
  isAssigned: boolean;
}

export function PartnerKlantProjectenTabs({ klant, partnerId }: PartnerKlantProjectenTabsProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [showRejected, setShowRejected] = useState(false);

  const addProject = useAddPartnerProject();
  const updateProject = useUpdatePartnerProject();
  const deleteProject = useDeletePartnerProject();

  const {
    data: favorites,
    isLoading: favoritesLoading,
    error: favoritesError,
  } = useKlantFavorites(klant.user_id || null);

  const fallbackFavoriteIds = klant.favorite_projects || [];
  const shouldUseFallbackFavorites =
    !favoritesLoading &&
    (!!favoritesError || (favorites?.length ?? 0) === 0) &&
    fallbackFavoriteIds.length > 0;

  // Use cached projects list for fallback favorites lookup
  const { data: allProjectsList = [], isLoading: projectsListLoading } = useProjectsList();
  const fallbackFavoriteProjects = useMemo(() => {
    if (!shouldUseFallbackFavorites || allProjectsList.length === 0) return [];
    const projectMap = new Map(allProjectsList.map(p => [p.id, p] as const));
    return fallbackFavoriteIds.map(id => projectMap.get(id)).filter(Boolean);
  }, [shouldUseFallbackFavorites, allProjectsList, fallbackFavoriteIds]);
  const fallbackFavoritesLoading = shouldUseFallbackFavorites && projectsListLoading;

  const projects = klant.assigned_projects;
  const assignedProjectIds = projects.map((p) => p.project_id);

  const customerPreferences: CustomerPreferences = useMemo(
    () => ({
      budgetMin: klant.inferred_preferences?.budget_min || klant.explicit_preferences?.budget_min,
      budgetMax: klant.inferred_preferences?.budget_max || klant.explicit_preferences?.budget_max,
      preferredRegions: [
        ...(klant.explicit_preferences?.preferred_regions || []),
        ...(klant.inferred_preferences?.common_regions || []),
      ],
      preferredCities: [
        ...(klant.explicit_preferences?.preferred_cities || []),
        ...(klant.inferred_preferences?.common_cities || []),
      ],
      viewedProjects: klant.viewed_projects || [],
      favoriteProjects: klant.favorite_projects || [],
      assignedProjectIds,
    }),
    [klant, assignedProjectIds]
  );

  const hasPreferencesData =
    customerPreferences.budgetMin ||
    customerPreferences.budgetMax ||
    (customerPreferences.preferredRegions?.length ?? 0) > 0 ||
    (customerPreferences.preferredCities?.length ?? 0) > 0 ||
    (customerPreferences.viewedProjects?.length ?? 0) > 0 ||
    (customerPreferences.favoriteProjects?.length ?? 0) > 0;

  // Use cached projects list instead of separate query
  const allProjects = allProjectsList;

  const availableProjects = allProjects?.filter((p) => !assignedProjectIds.includes(p.id)) || [];

  const effectiveFavorites =
    favorites && favorites.length > 0
      ? favorites
      : (fallbackFavoriteProjects || []).map((p) => ({
          project_id: p.id,
          created_at: "",
          project: p,
        }));

  const effectiveFavoritesLoading =
    favoritesLoading || fallbackFavoritesLoading;

  // === UNIFIED LIST ===
  const unifiedItems = useMemo<UnifiedItem[]>(() => {
    const items: UnifiedItem[] = [];
    const seenProjectIds = new Set<string>();
    const favoriteProjectIds = new Set(effectiveFavorites.map((f) => f.project_id));

    for (const sel of projects) {
      seenProjectIds.add(sel.project_id);
      items.push({
        key: `assigned-${sel.id}`,
        projectId: sel.project_id,
        projectName: sel.project?.name || null,
        projectCity: sel.project?.city || null,
        projectImage: sel.project?.featured_image || null,
        projectPriceFrom: sel.project?.price_from || null,
        selectionId: sel.id,
        status: sel.status,
        isFavorite: favoriteProjectIds.has(sel.project_id),
        isAssigned: true,
      });
    }

    for (const fav of effectiveFavorites) {
      if (seenProjectIds.has(fav.project_id)) continue;
      seenProjectIds.add(fav.project_id);
      items.push({
        key: `fav-${fav.project_id}`,
        projectId: fav.project_id,
        projectName: fav.project?.name || null,
        projectCity: fav.project?.city || null,
        projectImage: fav.project?.featured_image || null,
        projectPriceFrom: fav.project?.price_from || null,
        selectionId: null,
        status: null,
        isFavorite: true,
        isAssigned: false,
      });
    }

    items.sort((a, b) => {
      const statusA = a.isAssigned ? (a.status || "suggested") : "favorite_only";
      const statusB = b.isAssigned ? (b.status || "suggested") : "favorite_only";
      return (STATUS_SORT_ORDER[statusA] || 3) - (STATUS_SORT_ORDER[statusB] || 3);
    });

    return items;
  }, [projects, effectiveFavorites]);

  const unifiedProjectIds = useMemo(
    () => new Set(unifiedItems.map((i) => i.projectId)),
    [unifiedItems]
  );

  const filteredUnifiedItems = useMemo(() => {
    if (showRejected) return unifiedItems;
    return unifiedItems.filter((item) => item.status !== "rejected");
  }, [unifiedItems, showRejected]);

  const rejectedCount = unifiedItems.filter((i) => i.status === "rejected").length;

  const suggestedProjects = useMemo(() => {
    if (!allProjects || !hasPreferencesData) return [];
    return scoreAndSortProjects(allProjects, customerPreferences, 20)
      .filter((p) => !unifiedProjectIds.has(p.id))
      .slice(0, 6);
  }, [allProjects, customerPreferences, hasPreferencesData, unifiedProjectIds]);

  const handleStatusChange = async (selectionId: string, status: string) => {
    try {
      await updateProject.mutateAsync({ selectionId, crmLeadId: klant.id, updates: { status } });
      toast.success("Status bijgewerkt");
    } catch { toast.error("Fout bij bijwerken status"); }
  };

  const handleDelete = async (selectionId: string) => {
    try {
      await deleteProject.mutateAsync({ selectionId, crmLeadId: klant.id });
      toast.success("Project verwijderd");
      setDeleteConfirm(null);
    } catch { toast.error("Fout bij verwijderen project"); }
  };

  const handleQuickAssign = async (projectId: string) => {
    setAddingId(projectId);
    try {
      await addProject.mutateAsync({
        crmLeadId: klant.id,
        projectId,
        partnerId,
        status: "suggested",
        priority: assignedProjectIds.length,
      });
      toast.success("Project toegewezen");
    } catch { toast.error("Fout bij toewijzen project"); }
    finally { setAddingId(null); }
  };

  const handleAddProject = async () => {
    if (!selectedProjectId) return;
    try {
      await addProject.mutateAsync({
        crmLeadId: klant.id,
        projectId: selectedProjectId,
        partnerId,
        status: "suggested",
        priority: assignedProjectIds.length,
      });
      toast.success("Project toegevoegd");
      setSelectedProjectId("");
      setAddDialogOpen(false);
    } catch { toast.error("Fout bij toevoegen project"); }
  };

  const overviewCount = filteredUnifiedItems.length;
  const suggestedCount = suggestedProjects.length;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Projecten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">
                Overzicht ({overviewCount})
              </TabsTrigger>
              <TabsTrigger value="suggested" className="text-xs sm:text-sm">
                Suggesties ({suggestedCount})
              </TabsTrigger>
            </TabsList>

            {/* === UNIFIED OVERVIEW TAB === */}
            <TabsContent value="overview" className="mt-0">
              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                {rejectedCount > 0 && (
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showRejected}
                      onChange={(e) => setShowRejected(e.target.checked)}
                      className="rounded border-muted-foreground/50"
                    />
                    Toon afgewezen ({rejectedCount})
                  </label>
                )}
                <div className="ml-auto">
                  <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-1" />
                        Toevoegen
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Project toewijzen</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecteer een project" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableProjects.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name} - {project.city}
                                {project.price_from && ` (vanaf €${project.price_from.toLocaleString()})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Annuleren</Button>
                          <Button onClick={handleAddProject} disabled={!selectedProjectId || addProject.isPending}>
                            Toevoegen
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {effectiveFavoritesLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : filteredUnifiedItems.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">
                    {unifiedItems.length === 0
                      ? "Nog geen projecten toegewezen of gefavoriet"
                      : "Alle projecten zijn afgewezen en verborgen."}
                  </p>
                  {unifiedItems.length === 0 && (
                    <Button size="sm" variant="outline" onClick={() => setAddDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Eerste project toevoegen
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredUnifiedItems.map((item) => {
                    const isAssigning = addingId === item.projectId;

                    return (
                      <div key={item.key} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                        {item.projectImage ? (
                          <img src={item.projectImage} alt="" className="h-12 w-12 rounded object-cover flex-shrink-0" />
                        ) : (
                          <div className="h-12 w-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{item.projectName}</p>
                            <Link
                              to={`/partner/projecten/${item.projectId}`}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {item.projectCity}
                            {item.projectPriceFrom && (
                              <span className="ml-2">vanaf €{item.projectPriceFrom.toLocaleString()}</span>
                            )}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            {item.isFavorite && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 border-red-200 text-red-600 dark:border-red-800 dark:text-red-400">
                                <Heart className="h-2.5 w-2.5 fill-current" />
                                Favoriet
                              </Badge>
                            )}
                            {item.isAssigned && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                                <UserCheck className="h-2.5 w-2.5" />
                                Toegewezen
                              </Badge>
                            )}
                          </div>
                        </div>

                        {item.isAssigned && item.selectionId ? (
                          <>
                            <Select
                              value={item.status || "suggested"}
                              onValueChange={(value) => handleStatusChange(item.selectionId!, value)}
                            >
                              <SelectTrigger className="w-[130px] h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(option.value)}`}>
                                      {option.label}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteConfirm(item.selectionId!)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-shrink-0 h-8"
                            disabled={isAssigning}
                            onClick={() => handleQuickAssign(item.projectId)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {isAssigning ? "..." : "Toewijzen"}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* === SUGGESTIONS TAB === */}
            <TabsContent value="suggested" className="mt-0">
              {!hasPreferencesData ? (
                <div className="text-center py-8">
                  <Lightbulb className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Nog geen voorkeursdata beschikbaar om suggesties te genereren
                  </p>
                </div>
              ) : projectsListLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : suggestedProjects.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Geen passende projecten gevonden
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {suggestedProjects.map((project) => {
                    const stars = getScoreStars(project.score);
                    const isAdding = addingId === project.id;

                    return (
                      <div key={project.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                        {project.featured_image ? (
                          <img src={project.featured_image} alt="" className="h-14 w-14 rounded object-cover flex-shrink-0" />
                        ) : (
                          <div className="h-14 w-14 rounded bg-muted flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-medium truncate">{project.name}</p>
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              {Array.from({ length: stars }).map((_, i) => (
                                <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                              ))}
                              {Array.from({ length: 5 - stars }).map((_, i) => (
                                <Star key={`empty-${i}`} className="h-3 w-3 text-muted-foreground/30" />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {project.city}
                            {project.price_from && (
                              <span className="ml-1">
                                · €{project.price_from.toLocaleString()} - €{(project.price_to || project.price_from).toLocaleString()}
                              </span>
                            )}
                          </p>
                          {project.matchReasons.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {project.matchReasons.slice(0, 3).map((reason, i) => (
                                <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {reason}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-shrink-0 h-8"
                          disabled={isAdding}
                          onClick={() => handleQuickAssign(project.id)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {isAdding ? "..." : "Toewijzen"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Project verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je dit project wilt verwijderen van deze klant?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
