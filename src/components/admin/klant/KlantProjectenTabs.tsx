import { useState, useMemo, useCallback } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { Link } from "react-router-dom";
import { useExternalListingsForLead } from "@/hooks/useExternalListings";
import { useProjectsList } from "@/hooks/useProjectsList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Building2,
  Plus,
  Trash2,
  ExternalLink,
  Heart,
  Lightbulb,
  MapPin,
  Star,
  Search,
  MessageSquare,
  ChevronDown,
  UserCheck,
  Globe,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Klant, useUpdateKlantProject, useDeleteKlantProject, useAddKlantProject } from "@/hooks/useKlant";
import { useKlantFavorites } from "@/hooks/useKlantFavorites";
import { AddProjectDialog } from "./AddProjectDialog";
import { KlantExternePandenCard } from "./KlantExternePandenCard";
import { KlantProjectFeedbackPanel } from "./KlantProjectFeedbackPanel";
import { toast } from "sonner";
import { scoreAndSortProjects, getScoreStars, CustomerPreferences } from "@/lib/projectScoring";

interface KlantProjectenTabsProps {
  klant: Klant;
}

const STATUS_OPTIONS = [
  { value: "suggested", label: "Voorgesteld" },
  { value: "interested", label: "Geïnteresseerd" },
  { value: "to_visit", label: "Wil bezoeken" },
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
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "to_visit":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "visited":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "rejected":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default:
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
  }
};

interface UnifiedItem {
  key: string;
  projectId: string;
  projectName: string | null;
  projectCity: string | null;
  projectImage: string | null;
  projectPriceFrom: number | null;
  selectionId: string | null; // null = favorite-only
  status: string | null;
  customerNotes: string | null;
  adminNotes: string | null;
  assignedAt: string | null;
  isFavorite: boolean;
  isAssigned: boolean;
  isExternal: boolean;
  externalUrl?: string | null;
  externalSource?: string | null;
}

export function KlantProjectenTabs({ klant }: KlantProjectenTabsProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null);
  const [updatingNotesId, setUpdatingNotesId] = useState<string | null>(null);
  const [overviewPage, setOverviewPage] = useState(1);
  const [suggestionsSearch, setSuggestionsSearch] = useState("");

  const updateProject = useUpdateKlantProject();
  const deleteProject = useDeleteKlantProject();
  const addProject = useAddKlantProject();

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

  const { data: allProjectsCache } = useProjectsList();

  const fallbackFavoriteProjects = useMemo(() => {
    if (!shouldUseFallbackFavorites || !allProjectsCache) return undefined;
    return fallbackFavoriteIds
      .map(id => allProjectsCache.find(p => p.id === id))
      .filter(Boolean) as typeof allProjectsCache;
  }, [shouldUseFallbackFavorites, allProjectsCache, fallbackFavoriteIds]);

  const fallbackFavoritesLoading = false;

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

  const { data: allProjects, isLoading: suggestionsLoading } = useProjectsList();

  const effectiveFavorites =
    favorites && favorites.length > 0
      ? favorites
      : (fallbackFavoriteProjects || []).map((p) => ({
          project_id: p.id,
          created_at: "",
          project: p,
        }));

  const effectiveFavoritesLoading =
    favoritesLoading || (shouldUseFallbackFavorites && fallbackFavoritesLoading);

  const { data: externalAssignments } = useExternalListingsForLead(klant.id);

  // === UNIFIED LIST ===
  const unifiedItems = useMemo<UnifiedItem[]>(() => {
    const items: UnifiedItem[] = [];
    const seenProjectIds = new Set<string>();
    const favoriteProjectIds = new Set(effectiveFavorites.map((f) => f.project_id));

    // 1. Add all assigned projects
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
        customerNotes: sel.customer_notes,
        adminNotes: sel.admin_notes,
        assignedAt: sel.assigned_at,
        isFavorite: favoriteProjectIds.has(sel.project_id),
        isAssigned: true,
        isExternal: false,
      });
    }

    // 2. Add favorite-only projects (not already assigned)
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
        customerNotes: null,
        adminNotes: null,
        assignedAt: null,
        isFavorite: true,
        isAssigned: false,
        isExternal: false,
      });
    }

    // 3. Add external listings
    for (const ext of externalAssignments || []) {
      const listing = ext.external_listing;
      items.push({
        key: `ext-${ext.id}`,
        projectId: ext.id,
        projectName: listing?.title || listing?.source_url || "Extern pand",
        projectCity: listing?.city || null,
        projectImage: listing?.images?.[0] || null,
        projectPriceFrom: listing?.price || null,
        selectionId: ext.id,
        status: ext.status,
        customerNotes: ext.customer_notes,
        adminNotes: ext.admin_notes || null,
        assignedAt: ext.assigned_at,
        isFavorite: false,
        isAssigned: true,
        isExternal: true,
        externalUrl: listing?.source_url || null,
        externalSource: listing?.source_platform || null,
      });
    }

    // 4. Sort
    items.sort((a, b) => {
      const statusA = a.isAssigned ? (a.status || "suggested") : "favorite_only";
      const statusB = b.isAssigned ? (b.status || "suggested") : "favorite_only";
      return (STATUS_SORT_ORDER[statusA] || 3) - (STATUS_SORT_ORDER[statusB] || 3);
    });

    return items;
  }, [projects, effectiveFavorites, externalAssignments]);

  // All project IDs in unified list (for filtering suggestions)
  const unifiedProjectIds = useMemo(
    () => new Set(unifiedItems.filter((i) => !i.isExternal).map((i) => i.projectId)),
    [unifiedItems]
  );


  // Score and sort projects for suggestions — filter out unified items
  const suggestedProjects = useMemo(() => {
    if (!allProjects || !hasPreferencesData) return [];
    return scoreAndSortProjects(allProjects, customerPreferences, 20)
      .filter((p) => !unifiedProjectIds.has(p.id));
  }, [allProjects, customerPreferences, hasPreferencesData, unifiedProjectIds]);

  const debouncedSuggestionsSearch = useDebounce(suggestionsSearch, 200);

  const filteredSuggestedProjects = useMemo(() => {
    if (!debouncedSuggestionsSearch) return suggestedProjects.slice(0, 10);
    const q = debouncedSuggestionsSearch.toLowerCase();
    return suggestedProjects
      .filter((p) => p.name.toLowerCase().includes(q) || (p.city && p.city.toLowerCase().includes(q)))
      .slice(0, 10);
  }, [suggestedProjects, debouncedSuggestionsSearch]);

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
        status: "suggested",
        priority: assignedProjectIds.length,
      });
      toast.success("Project toegewezen");
    } catch { toast.error("Fout bij toewijzen project"); }
    finally { setAddingId(null); }
  };

  const handleSaveAdminNotes = async (selectionId: string, notes: string) => {
    setUpdatingNotesId(selectionId);
    try {
      await updateProject.mutateAsync({ selectionId, crmLeadId: klant.id, updates: { admin_notes: notes } });
      toast.success("Notitie opgeslagen");
    } catch { toast.error("Fout bij opslaan notitie"); }
    finally { setUpdatingNotesId(null); }
  };

  const truncateFeedback = (text: string | null, maxLength: number = 50) => {
    if (!text) return null;
    return text.length <= maxLength ? text : text.substring(0, maxLength) + "...";
  };

  const overviewCount = unifiedItems.length;
  const suggestedCount = filteredSuggestedProjects.length;

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
            <TabsList className="flex w-full justify-start mb-4">
              <TabsTrigger value="overview" className="shrink-0 text-xs sm:text-sm">
                Overzicht ({overviewCount})
              </TabsTrigger>
              <TabsTrigger value="suggested" className="shrink-0 text-xs sm:text-sm">
                Suggesties ({suggestedCount})
              </TabsTrigger>
            </TabsList>

            {/* === UNIFIED OVERVIEW TAB === */}
            <TabsContent value="overview" className="mt-0">
              <div className="flex items-center justify-end mb-3">
                <Button size="sm" variant="outline" onClick={() => setAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Toevoegen
                </Button>
              </div>

              {effectiveFavoritesLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : unifiedItems.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">
                    Nog geen projecten toegewezen of gefavoriet
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Eerste project toevoegen
                  </Button>
                </div>
              ) : (
                <>
                <div className="space-y-3">
                  {(() => {
                    const ITEMS_PER_PAGE = 5;
                    const totalPages = Math.ceil(unifiedItems.length / ITEMS_PER_PAGE);
                    const paginatedItems = unifiedItems.slice(
                      (overviewPage - 1) * ITEMS_PER_PAGE,
                      overviewPage * ITEMS_PER_PAGE
                    );
                    return paginatedItems;
                  })().map((item) => {
                    const hasFeedback = !!item.customerNotes;
                    const hasAdminNotes = !!item.adminNotes;
                    const isExpanded = expandedFeedback === item.key;
                    const isAssigning = addingId === item.projectId;

                    // External items render differently
                    if (item.isExternal) {
                      return (
                        <div key={item.key} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                          {item.projectImage ? (
                            <img src={item.projectImage} alt="" className="h-12 w-12 rounded object-cover flex-shrink-0" />
                          ) : (
                            <div className="h-12 w-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                              <Globe className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{item.projectName}</p>
                              {item.externalUrl && (
                                <a href={item.externalUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                                <Globe className="h-2.5 w-2.5" />
                                {item.externalSource || "Extern"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Regular project items (assigned and/or favorited)
                    return (
                      <Collapsible
                        key={item.key}
                        open={isExpanded}
                        onOpenChange={(open) => setExpandedFeedback(open ? item.key : null)}
                      >
                        <div className="rounded-lg border bg-card">
                          <div className="flex items-center gap-3 p-3">
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
                                  to={`/project/${item.projectId}`}
                                  target="_blank"
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                                {hasFeedback && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                                    <MessageSquare className="h-2.5 w-2.5 mr-0.5" />
                                    Feedback
                                  </Badge>
                                )}
                                {hasAdminNotes && !hasFeedback && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200">
                                    Notitie
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {item.projectCity}
                                {item.projectPriceFrom && (
                                  <span className="ml-2">vanaf €{item.projectPriceFrom.toLocaleString()}</span>
                                )}
                              </p>
                              {/* Source badges */}
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
                              {/* Feedback preview when collapsed */}
                              {hasFeedback && !isExpanded && item.selectionId && (
                                <CollapsibleTrigger asChild>
                                  <button className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 cursor-pointer">
                                    <MessageSquare className="h-3 w-3" />
                                    <span className="truncate max-w-[200px]">{truncateFeedback(item.customerNotes)}</span>
                                    <ChevronDown className="h-3 w-3 flex-shrink-0" />
                                  </button>
                                </CollapsibleTrigger>
                              )}
                            </div>

                            {/* Actions: status dropdown OR assign button */}
                            {item.isAssigned && item.selectionId ? (
                              <>
                                <Select
                                  value={item.status || "suggested"}
                                  onValueChange={(value) => handleStatusChange(item.selectionId!, value)}
                                >
                                  <SelectTrigger className="w-[140px] h-8">
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

                          {/* Expandable feedback section */}
                          {item.selectionId && (
                            <CollapsibleContent>
                              <div className="px-3 pb-3">
                                <KlantProjectFeedbackPanel
                                  customerNotes={item.customerNotes}
                                  adminNotes={item.adminNotes}
                                  updatedAt={item.assignedAt}
                                  onSaveAdminNotes={(notes) => handleSaveAdminNotes(item.selectionId!, notes)}
                                  isUpdating={updatingNotesId === item.selectionId}
                                />
                              </div>
                            </CollapsibleContent>
                          )}
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
                {/* Pagination controls */}
                {(() => {
                  const ITEMS_PER_PAGE = 5;
                  const totalPages = Math.ceil(unifiedItems.length / ITEMS_PER_PAGE);
                  if (totalPages <= 1) return null;
                  return (
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={overviewPage <= 1}
                        onClick={() => setOverviewPage(p => p - 1)}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Vorige
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        {overviewPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={overviewPage >= totalPages}
                        onClick={() => setOverviewPage(p => p + 1)}
                      >
                        Volgende
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  );
                })()}
                </>
              )}

              {/* External listings section within overview */}
              <div className="mt-6">
                <KlantExternePandenCard crmLeadId={klant.id} />
              </div>
            </TabsContent>

            {/* === SUGGESTIONS TAB === */}
            <TabsContent value="suggested" className="mt-0">
              {!hasPreferencesData ? (
                <div className="text-center py-8">
                  <Lightbulb className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Nog geen voorkeursdata beschikbaar
                  </p>
                </div>
              ) : suggestionsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : (
                <>
                  {/* Inline search */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Zoek op naam of stad..."
                      value={suggestionsSearch}
                      onChange={(e) => setSuggestionsSearch(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {filteredSuggestedProjects.length} van {suggestedProjects.length} suggesties
                  </p>
                  {filteredSuggestedProjects.length === 0 ? (
                    <div className="text-center py-8">
                      <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        {suggestedProjects.length === 0
                          ? "Geen passende projecten gevonden"
                          : "Geen resultaten voor deze zoekopdracht"}
                      </p>
                      {suggestionsSearch && (
                        <Button variant="link" size="sm" onClick={() => setSuggestionsSearch("")}>
                          Zoekopdracht wissen
                        </Button>
                      )}
                    </div>
                  ) : (
                    <ScrollArea className="max-h-[500px]">
                      <div className="space-y-3 pr-1">
                        {filteredSuggestedProjects.map((project) => {
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
                    </ScrollArea>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AddProjectDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        crmLeadId={klant.id}
        assignedProjectIds={assignedProjectIds}
        customerPreferences={customerPreferences}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Project verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dit verwijdert het project uit de lijst van toegewezen projecten voor deze klant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
