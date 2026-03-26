import { useState, useMemo } from "react";
import { Filter, Zap, CheckCircle2, XCircle, Clock, Trash2, Archive, Target, Loader2, SkipForward, ChevronDown, ShieldCheck, FileText } from "lucide-react";
import { formatDistanceToNow, isAfter, subDays } from "date-fns";
import { nl } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useInsights, Insight, InsightFilters } from "@/hooks/useInsights";
import { useArchiveInsight, useDeleteInsight, useBulkArchiveInsights } from "@/hooks/useInsightActions";
import { useValidateInsight, useSkipValidation, useBulkValidateInsights } from "@/hooks/useIcpValidation";
import { InsightDetailSheet } from "./InsightDetailSheet";
import { ClassifyInsightsDialog } from "./ClassifyInsightsDialog";
import { InsightDeleteDialog } from "./InsightDeleteDialog";
import { IcpPromptDialog } from "./IcpPromptDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const themes = [
  { value: "all", label: "Alle thema's" },
  { value: "JURIDISCH", label: "Juridisch" },
  { value: "FINANCIEEL", label: "Financieel" },
  { value: "LOCATIE", label: "Locatie" },
  { value: "PROCES", label: "Proces" },
  { value: "EMOTIE", label: "Emotie" },
  { value: "BOUWTECHNISCH", label: "Bouwtechnisch" },
  { value: "VERHUUR", label: "Verhuur" },
  { value: "BELASTING", label: "Belasting" },
];

const impacts = [
  { value: "all", label: "Alle impact levels" },
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Low", label: "Low" },
];

const blogStatusOptions = [
  { value: "all", label: "Alle blog status" },
  { value: "none", label: "Geen blog" },
  { value: "draft", label: "Blog concept" },
  { value: "published", label: "Gepubliceerd" },
];

const icpStatusOptions = [
  { value: "all", label: "Alle ICP status" },
  { value: "pending", label: "Te valideren" },
  { value: "validated", label: "Gevalideerd" },
  { value: "rejected", label: "Afgekeurd" },
];

const sortOptions = [
  { value: "newest", label: "Nieuwste eerst" },
  { value: "oldest", label: "Oudste eerst" },
  { value: "frequency", label: "Frequentie" },
  { value: "impact", label: "Impact" },
];

const themeStyles: Record<string, string> = {
  JURIDISCH: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  FINANCIEEL: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  LOCATIE: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  PROCES: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  EMOTIE: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
  BOUWTECHNISCH: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  VERHUUR: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  BELASTING: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const impactStyles: Record<string, string> = {
  High: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  Medium: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  Low: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

const impactOrder = { High: 0, Medium: 1, Low: 2 };

// ICP validation status config
const icpStatusConfig = {
  validated: { label: "Gevalideerd", icon: CheckCircle2, color: "text-green-600" },
  pending: { label: "Te valideren", icon: Clock, color: "text-amber-600" },
  rejected: { label: "Afgekeurd", icon: XCircle, color: "text-red-600" },
};

function useInsightBlogStatus() {
  return useQuery({
    queryKey: ["insight-blog-status"],
    queryFn: async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("source_insight_id, published")
        .not("source_insight_id", "is", null);
      
      const statusMap: Record<string, { hasDraft: boolean; hasPublished: boolean }> = {};
      data?.forEach(item => {
        if (item.source_insight_id) {
          if (!statusMap[item.source_insight_id]) {
            statusMap[item.source_insight_id] = { hasDraft: false, hasPublished: false };
          }
          if (item.published) {
            statusMap[item.source_insight_id].hasPublished = true;
          } else {
            statusMap[item.source_insight_id].hasDraft = true;
          }
        }
      });
      return statusMap;
    },
  });
}

export function InsightsTable() {
  const [filters, setFilters] = useState<InsightFilters>({ theme: "all", impact: "all" });
  const [blogStatus, setBlogStatus] = useState("all");
  const [icpStatus, setIcpStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [classifyDialogOpen, setClassifyDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [insightToDelete, setInsightToDelete] = useState<Insight | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [validatingIds, setValidatingIds] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  
  const { data: insights, isLoading } = useInsights(filters);
  const { data: blogStatusMap } = useInsightBlogStatus();
  const archiveInsight = useArchiveInsight();
  const deleteInsight = useDeleteInsight();
  const bulkArchive = useBulkArchiveInsights();
  
  // ICP Validation hooks
  const validateMutation = useValidateInsight();
  const skipMutation = useSkipValidation();
  const bulkValidateMutation = useBulkValidateInsights();

  // Filter and sort insights
  const processedInsights = useMemo(() => {
    if (!insights) return [];
    
    let filtered = insights.filter(i => !(i as any).archived);
    
    // Filter by blog status
    if (blogStatus !== "all" && blogStatusMap) {
      filtered = filtered.filter(insight => {
        const status = blogStatusMap[insight.id];
        if (blogStatus === "none") return !status;
        if (blogStatus === "draft") return status?.hasDraft;
        if (blogStatus === "published") return status?.hasPublished;
        return true;
      });
    }
    
    // Filter by ICP status
    if (icpStatus !== "all") {
      filtered = filtered.filter(insight => {
        if (icpStatus === "pending") return !insight.icp_validated;
        if (icpStatus === "validated") return insight.icp_validated && (insight.icp_score ?? 0) >= 3;
        if (icpStatus === "rejected") return insight.icp_validated && (insight.icp_score ?? 0) < 3;
        return true;
      });
    }
    
    // Sort
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case "oldest":
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case "frequency":
          return (b.frequency || 1) - (a.frequency || 1);
        case "impact":
          return (impactOrder[a.impact_score as keyof typeof impactOrder] ?? 3) - 
                 (impactOrder[b.impact_score as keyof typeof impactOrder] ?? 3);
        default:
          return 0;
      }
    });
  }, [insights, blogStatus, icpStatus, blogStatusMap, sortBy]);

  const activeFilterCount = [
    filters.theme !== "all" ? 1 : 0,
    filters.impact !== "all" ? 1 : 0,
    blogStatus !== "all" ? 1 : 0,
    icpStatus !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // ICP validation handlers
  const handleValidate = async (e: React.MouseEvent, insight: Insight) => {
    e.stopPropagation();
    setValidatingIds(prev => new Set(prev).add(insight.id));
    try {
      await validateMutation.mutateAsync(insight.id);
    } finally {
      setValidatingIds(prev => {
        const next = new Set(prev);
        next.delete(insight.id);
        return next;
      });
    }
  };

  const handleSkip = async (e: React.MouseEvent, insightId: string) => {
    e.stopPropagation();
    await skipMutation.mutateAsync({ insightId, reason: "Handmatig overgeslagen" });
  };

  const handleBulkValidate = async () => {
    const pendingIds = Array.from(selectedIds).filter(id => {
      const insight = insights?.find(i => i.id === id);
      return insight && !insight.icp_validated;
    });
    if (pendingIds.length === 0) return;
    await bulkValidateMutation.mutateAsync(pendingIds.slice(0, 10)); // Max 10
    setSelectedIds(new Set());
  };

  // Count pending validation in selection
  const pendingValidationCount = useMemo(() => {
    return Array.from(selectedIds).filter(id => {
      const insight = insights?.find(i => i.id === id);
      return insight && !insight.icp_validated;
    }).length;
  }, [selectedIds, insights]);

  const handleRowClick = (insight: Insight) => {
    setSelectedInsight(insight);
    setSheetOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, insight: Insight) => {
    e.stopPropagation();
    setInsightToDelete(insight);
    setDeleteDialogOpen(true);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(processedInsights.map(i => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const isNew = (createdAt: string | null) => {
    if (!createdAt) return false;
    return isAfter(new Date(createdAt), subDays(new Date(), 7));
  };

  const getBlogStatusBadge = (insightId: string) => {
    if (!blogStatusMap) return null;
    const status = blogStatusMap[insightId];
    if (!status) return null;
    
    if (status.hasPublished) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <FileText className="h-4 w-4 text-green-600" />
            </TooltipTrigger>
            <TooltipContent>Blog gepubliceerd</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    if (status.hasDraft) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <FileText className="h-4 w-4 text-amber-600" />
            </TooltipTrigger>
            <TooltipContent>Blog concept beschikbaar</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thema</TableHead>
                <TableHead>Inzicht</TableHead>
                <TableHead>Impact</TableHead>
                <TableHead>Actie</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">{selectedIds.size} geselecteerd</span>
            {pendingValidationCount > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={handleBulkValidate}
                disabled={bulkValidateMutation.isPending}
                className="gap-2"
              >
                {bulkValidateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Target className="h-4 w-4" />
                )}
                Valideer ({Math.min(pendingValidationCount, 10)})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkDeleteDialogOpen(true)}
              className="gap-2"
            >
              <Archive className="h-4 w-4" />
              Archiveren
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Deselecteren
            </Button>
          </div>
        )}

        {/* Filters - Collapsible */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">{activeFilterCount}</Badge>
              )}
              <ChevronDown className={`h-3 w-3 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
            </Button>

            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sorteren" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant={selectMode ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSelectMode(!selectMode);
                  if (selectMode) setSelectedIds(new Set());
                }}
              >
                {selectMode ? "Klaar" : "Selecteer"}
              </Button>
              <IcpPromptDialog />
              <Button variant="outline" size="sm" onClick={() => setClassifyDialogOpen(true)}>
                <Zap className="h-4 w-4 mr-2" />
                Herclassificeer
              </Button>
            </div>
          </div>

          {filtersOpen && (
            <div className="flex items-center gap-3 flex-wrap p-3 bg-muted/50 rounded-lg">
              <Select value={filters.theme} onValueChange={(value) => setFilters(prev => ({ ...prev, theme: value }))}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Thema" />
                </SelectTrigger>
                <SelectContent>
                  {themes.map((theme) => (
                    <SelectItem key={theme.value} value={theme.value}>{theme.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.impact} onValueChange={(value) => setFilters(prev => ({ ...prev, impact: value }))}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Impact" />
                </SelectTrigger>
                <SelectContent>
                  {impacts.map((impact) => (
                    <SelectItem key={impact.value} value={impact.value}>{impact.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={icpStatus} onValueChange={setIcpStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="ICP status" />
                </SelectTrigger>
                <SelectContent>
                  {icpStatusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={blogStatus} onValueChange={setBlogStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Blog status" />
                </SelectTrigger>
                <SelectContent>
                  {blogStatusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={() => {
                  setFilters({ theme: "all", impact: "all" });
                  setBlogStatus("all");
                  setIcpStatus("all");
                }}>
                  Reset
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          {processedInsights.length} inzichten gevonden
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {selectMode && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedIds.size === processedInsights.length && processedInsights.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                )}
                <TableHead className="w-32">Thema</TableHead>
                <TableHead>Inzicht</TableHead>
                <TableHead className="w-24">Impact</TableHead>
                <TableHead className="w-16 text-center">Blog</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedInsights.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={selectMode ? 6 : 5} className="text-center py-8 text-muted-foreground">
                    Geen inzichten gevonden
                  </TableCell>
                </TableRow>
              ) : (
                processedInsights.map((insight) => {
                  // Determine ICP status for display (use different var name to avoid conflict)
                  const insightIcpStatus = insight.icp_validated 
                    ? (insight.icp_score && insight.icp_score >= 3 ? "validated" : "rejected")
                    : "pending";
                  const StatusIcon = icpStatusConfig[insightIcpStatus].icon;
                  const isNewInsight = isNew(insight.created_at);
                  const isValidating = validatingIds.has(insight.id);
                  const needsValidation = !insight.icp_validated;
                  
                  return (
                    <TableRow
                      key={insight.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(insight)}
                    >
                      {selectMode && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(insight.id)}
                            onCheckedChange={(checked) => handleSelectOne(insight.id, !!checked)}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {insight.theme && (
                            <Badge className={themeStyles[insight.theme] || "bg-gray-100 text-gray-800"}>
                              {insight.theme}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {insight.extraction_confidence != null && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${
                                      insight.extraction_confidence >= 0.8 ? 'bg-green-500' :
                                      insight.extraction_confidence >= 0.5 ? 'bg-amber-500' : 'bg-gray-400'
                                    }`} />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {insight.extraction_confidence >= 0.8 ? 'Directe quote' :
                                     insight.extraction_confidence >= 0.5 ? 'Afgeleide observatie' : 'AI-interpretatie'}
                                    {' '}({Math.round(insight.extraction_confidence * 100)}%)
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            <p className="font-medium">{insight.label}</p>
                            {isNewInsight && (
                              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                Nieuw
                              </Badge>
                            )}
                            {(insight.frequency || 1) > 1 && (
                              <Badge variant="secondary" className="text-xs">
                                {insight.frequency}×
                              </Badge>
                            )}
                            {insight.suggested_archetype && (
                              <Badge variant="outline" className="text-xs">
                                {insight.suggested_archetype}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {insight.normalized_insight}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={impactStyles[insight.impact_score] || "bg-gray-100 text-gray-800"}>
                          {insight.impact_score}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {getBlogStatusBadge(insight.id)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {needsValidation && (
                              <>
                                <DropdownMenuItem onClick={(e) => handleValidate(e as any, insight)}>
                                  <Target className="h-4 w-4 mr-2" />
                                  Valideer met AI
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => handleSkip(e as any, insight.id)}>
                                  <SkipForward className="h-4 w-4 mr-2" />
                                  Overslaan
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem 
                              onClick={(e) => handleDeleteClick(e as any, insight)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Verwijderen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <InsightDetailSheet
        insight={selectedInsight}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
      
      <ClassifyInsightsDialog 
        open={classifyDialogOpen} 
        onOpenChange={setClassifyDialogOpen} 
      />

      {/* Single Delete Dialog */}
      <InsightDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        insightLabel={insightToDelete?.label || ""}
        onArchive={() => {
          if (insightToDelete) {
            archiveInsight.mutate(insightToDelete.id);
          }
        }}
        onDelete={() => {
          if (insightToDelete) {
            deleteInsight.mutate(insightToDelete.id);
          }
        }}
        isLoading={archiveInsight.isPending || deleteInsight.isPending}
      />

      {/* Bulk Delete Dialog */}
      <InsightDeleteDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        insightLabel=""
        mode="bulk"
        count={selectedIds.size}
        onArchive={() => {
          bulkArchive.mutate(Array.from(selectedIds));
          setSelectedIds(new Set());
        }}
        onDelete={() => {
          // For bulk, we only support archive to prevent accidents
          bulkArchive.mutate(Array.from(selectedIds));
          setSelectedIds(new Set());
        }}
        isLoading={bulkArchive.isPending}
      />
    </>
  );
}
