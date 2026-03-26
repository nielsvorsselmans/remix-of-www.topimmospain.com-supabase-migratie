import { useState, useMemo } from "react";
import { Link } from "react-router-dom";

import { LockedPhaseContent } from "@/components/LockedPhaseContent";
import { UnifiedSelectionCard } from "@/components/UnifiedSelectionCard";
import { CompactSelectionCard } from "@/components/CompactSelectionCard";
import { SelectionFilters, SortOption, FilterSource, ViewMode } from "@/components/selection/SelectionFilters";
import { SelectionProgress } from "@/components/selection/SelectionProgress";
import { SelectionStats } from "@/components/selection/SelectionStats";
import { NoMatchFoundCard, TooManyPendingCard } from "@/components/selection/SelectionStuckStates";
import { ExternalListingCard } from "@/components/dashboard/ExternalListingCard";
import { SubmitExternalUrlCard } from "@/components/dashboard/SubmitExternalUrlCard";
import { useUserJourneyPhase } from "@/hooks/useUserJourneyPhase";
import { useAssignedProjects, AssignedProject } from "@/hooks/useAssignedProjects";
import { useCustomerExternalListings } from "@/hooks/useExternalListings";
import { useCustomerPreview } from "@/contexts/CustomerPreviewContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plane, 
  CheckSquare, 
  Star, 
  Heart, 
  X, 
  Sparkles,
  Eye,
  EyeOff,
  Compass,
  AlertCircle,
  Globe,
  MapPin
} from "lucide-react";

export default function MijnSelectie() {
  const { isPhaseUnlocked, isLoading: phaseLoading } = useUserJourneyPhase();
  const { isPreviewMode } = useCustomerPreview();
  const { data: externalData } = useCustomerExternalListings();
  const externalListings = externalData?.assignments;
  const newExternalCount = externalData?.newCount || 0;
  const [showRejected, setShowRejected] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('priority');
  const [filterSource, setFilterSource] = useState<FilterSource>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('detailed');
  
  const { 
    projects,
    isLoading: projectsLoading, 
    updateStatus, 
    updateNotes,
    promoteFavorite,
    isUpdating,
    suggestedCount,
    interestedCount,
    rejectedCount,
  } = useAssignedProjects();

  const isUnlocked = isPhaseUnlocked('selectie');
  const isLoading = phaseLoading || projectsLoading;

  // Derived counts
  const adminCount = useMemo(() => 
    projects.filter(p => p.source === 'admin').length, 
    [projects]
  );
  const favoriteCount = useMemo(() => 
    projects.filter(p => p.source === 'favorite').length, 
    [projects]
  );
  const externalCount = externalListings?.length ?? 0;
  const externalInterestedCount = useMemo(() =>
    (externalListings ?? []).filter(a => a.status === 'interested').length,
    [externalListings]
  );

  // Filter and sort projects
  const filteredAndSortedProjects = useMemo(() => {
    let filtered = projects;
    
    // Apply source filter
    if (filterSource !== 'all') {
      filtered = filtered.filter(p => p.source === filterSource);
    }
    
    // Apply sorting
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          // Admin projects first, then by priority, then by date
          if (a.source === 'admin' && b.source !== 'admin') return -1;
          if (b.source === 'admin' && a.source !== 'admin') return 1;
          if (a.priority !== b.priority) return b.priority - a.priority;
          return new Date(b.assigned_at || 0).getTime() - new Date(a.assigned_at || 0).getTime();
        case 'newest':
          return new Date(b.assigned_at || 0).getTime() - new Date(a.assigned_at || 0).getTime();
        case 'price_asc':
          return (a.project.price_from || 0) - (b.project.price_from || 0);
        case 'price_desc':
          return (b.project.price_from || 0) - (a.project.price_from || 0);
        default:
          return 0;
      }
    });
  }, [projects, filterSource, sortBy]);

  // Separate projects by status
  const toVisitProjects = filteredAndSortedProjects.filter(p => p.status === 'to_visit');
  const pendingProjects = filteredAndSortedProjects.filter(p => p.status === 'suggested');
  const interestedProjects = filteredAndSortedProjects.filter(p => p.status === 'interested');
  const rejectedProjects = filteredAndSortedProjects.filter(p => p.status === 'rejected');
  
  const totalProjects = projects.length;
  const readyForViewing = interestedCount >= 2;
  const hasAnyProjects = projects.length > 0;
  
  // Stuck states
  const allRejected = interestedCount === 0 && rejectedCount > 0 && suggestedCount === 0;
  const tooManyPending = suggestedCount >= 10;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Laden...</p>
        </div>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <LockedPhaseContent
        phaseName="Selectie"
        phaseNumber={2}
        title="Mijn Selectie"
        description="Deze sectie wordt beschikbaar wanneer je samen met ons projecten hebt geselecteerd voor verdere oriëntatie."
        comingSoonFeatures={[
          "Overzicht van jouw geselecteerde projecten",
          "Projecten markeren als interessant of niet",
          "Gedetailleerde notities per project",
          "Voortgang naar bezichtigingsreis"
        ]}
        ctaText="Plan een oriëntatiegesprek"
        ctaLink="/afspraak"
      />
    );
  }

  const renderProjectCard = (selection: AssignedProject) => {
    if (viewMode === 'compact') {
      return (
        <CompactSelectionCard
          key={selection.id}
          selection={selection}
          onStatusChange={updateStatus}
          onPromoteFavorite={promoteFavorite}
          isUpdating={isUpdating}
        />
      );
    }
    return (
      <UnifiedSelectionCard
        key={selection.id}
        selection={selection}
        onStatusChange={updateStatus}
        onNotesChange={updateNotes}
        onPromoteFavorite={promoteFavorite}
        isUpdating={isUpdating}
        isPreviewMode={isPreviewMode}
      />
    );
  };

  return (
    <>
      <div className="space-y-4 md:space-y-6">
        {/* Preview mode indicator */}
        {isPreviewMode && (
          <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">
              Je bekijkt dit als klant. Wijzigingen zijn niet mogelijk.
            </AlertDescription>
          </Alert>
        )}

        {/* Progress - sticky on mobile, so placed first */}
        {hasAnyProjects && (
          <SelectionProgress
            totalProjects={totalProjects}
            interestedCount={interestedCount}
            rejectedCount={rejectedCount}
            pendingCount={suggestedCount}
            externalCount={externalCount}
            externalInterestedCount={externalInterestedCount}
          />
        )}

        {/* Header - more compact on mobile */}
        <div>
          <h1 className="text-xl md:text-2xl font-bold mb-1 md:mb-2">Mijn Selectie</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Beoordeel projecten om je bezichtigingsreis samen te stellen.
          </p>
        </div>

        {/* Stats Overview */}
        <SelectionStats 
          totalProjects={totalProjects}
          adminCount={adminCount}
          interestedCount={interestedCount}
          pendingCount={suggestedCount}
          externalCount={externalCount}
        />

        {/* Stuck states */}
        {allRejected && <NoMatchFoundCard rejectedCount={rejectedCount} />}
        {tooManyPending && !allRejected && (
          <TooManyPendingCard pendingCount={suggestedCount} hasAdminProjects={adminCount > 0} />
        )}

        {/* CTA for viewing trip */}
        {readyForViewing && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                    <Sparkles className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-800 dark:text-green-200">
                      Klaar voor de volgende stap!
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Je hebt {interestedCount} interessante projecten geselecteerd. 
                      Plan een bezichtigingsreis om deze projecten in het echt te bekijken.
                    </p>
                  </div>
                </div>
                <Button asChild className="bg-green-600 hover:bg-green-700">
                  <Link to="/dashboard/bezichtiging">
                    <Plane className="mr-2 h-4 w-4" />
                    Plan bezichtigingsreis
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!hasAnyProjects && (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nog geen projecten</h3>
              <p className="text-muted-foreground mb-6">
                Je adviseur selecteert binnenkort projecten voor je. Je kunt ook zelf 
                projecten ontdekken en als favoriet markeren.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild>
                  <Link to="/dashboard/ontdekken">
                    <Compass className="mr-2 h-4 w-4" />
                    Projecten ontdekken
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/afspraak">
                    Plan een gesprek
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters and sorting */}
        {hasAnyProjects && (
          <SelectionFilters
            sortBy={sortBy}
            onSortChange={setSortBy}
            filterSource={filterSource}
            onFilterChange={setFilterSource}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            adminCount={adminCount}
            favoriteCount={favoriteCount}
          />
        )}

        {/* Wil bezoeken */}
        {toVisitProjects.length > 0 && (
          <div className="space-y-3 md:space-y-4">
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 md:p-4">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <h2 className="font-semibold text-purple-800 dark:text-purple-200">
                  Wil bezoeken ({toVisitProjects.length})
                </h2>
              </div>
              <p className="text-sm text-purple-700 dark:text-purple-300 hidden md:block">
                Deze projecten staan op je lijst voor de bezichtigingsreis.
              </p>
              <p className="text-xs text-purple-700 dark:text-purple-300 md:hidden">
                Geselecteerd voor bezichtiging
              </p>
            </div>
            <div className={viewMode === 'compact' ? 'space-y-2' : 'space-y-3 md:space-y-4'}>
              {toVisitProjects.map(renderProjectCard)}
            </div>
          </div>
        )}

        {/* Te beoordelen */}
        {pendingProjects.length > 0 && (
          <div className="space-y-3 md:space-y-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 md:p-4">
              <div className="flex items-center gap-2 mb-1">
                <Star className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h2 className="font-semibold text-amber-800 dark:text-amber-200">
                  Te beoordelen ({pendingProjects.length})
                </h2>
              </div>
              <p className="text-sm text-amber-700 dark:text-amber-300 hidden md:block">
                Bekijk deze projecten en geef aan of ze interessant zijn voor jouw bezichtigingsreis.
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 md:hidden">
                Tap Ja of Nee om te beoordelen
              </p>
            </div>
            <div className={viewMode === 'compact' ? 'space-y-2' : 'space-y-3 md:space-y-4'}>
              {pendingProjects.map(renderProjectCard)}
            </div>
          </div>
        )}

        {/* Interessant */}
        {interestedProjects.length > 0 && (
          <div className="space-y-3 md:space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 md:p-4">
              <div className="flex items-center gap-2 mb-1">
                <Heart className="h-4 w-4 text-green-600 dark:text-green-400 fill-current" />
                <h2 className="font-semibold text-green-800 dark:text-green-200">
                  Interessant ({interestedProjects.length})
                </h2>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300 hidden md:block">
                Deze projecten wil je graag bezichtigen tijdens je reis naar Spanje.
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 md:hidden">
                {interestedProjects.length >= 2 ? "✓ Klaar voor bezichtiging!" : "Nog 1 project nodig"}
              </p>
            </div>
            <div className={viewMode === 'compact' ? 'space-y-2' : 'space-y-3 md:space-y-4'}>
              {interestedProjects.map(renderProjectCard)}
            </div>
          </div>
        )}

        {/* Afgewezen - with toggle */}
        {rejectedProjects.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-dashed">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-muted text-muted-foreground border-border px-3 py-1">
                  <X className="h-3 w-3 mr-1.5" />
                  Afgewezen
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {rejectedProjects.length} project{rejectedProjects.length !== 1 ? 'en' : ''}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-rejected"
                  checked={showRejected}
                  onCheckedChange={setShowRejected}
                />
                <Label htmlFor="show-rejected" className="text-sm text-muted-foreground cursor-pointer">
                  {showRejected ? (
                    <span className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      Tonen
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <EyeOff className="h-4 w-4" />
                      Verborgen
                    </span>
                  )}
                </Label>
              </div>
            </div>
            
            {showRejected && (
              <div className={viewMode === 'compact' ? 'space-y-2' : 'space-y-4'}>
                {rejectedProjects.map(renderProjectCard)}
              </div>
            )}
          </div>
        )}

        {/* Self-service URL indienen */}
        <div className="pt-6 border-t">
          <SubmitExternalUrlCard />
        </div>

        {/* Externe suggesties */}
        {externalListings && externalListings.length > 0 && (
          <div className="space-y-3 md:space-y-4 pt-6 border-t">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 md:p-4">
              <div className="flex items-center gap-2 mb-1">
                <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h2 className="font-semibold text-blue-800 dark:text-blue-200">
                  Externe suggesties ({externalListings.length})
                </h2>
                {newExternalCount > 0 && (
                  <Badge className="bg-blue-600 text-white text-[10px] px-1.5 py-0">
                    {newExternalCount} nieuw
                  </Badge>
                )}
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300 hidden md:block">
                Panden buiten ons portfolio, speciaal voor jou geselecteerd door je adviseur.
              </p>
            </div>
            <div className="space-y-3">
              {externalListings.map((assignment) => (
                <ExternalListingCard key={assignment.id} assignment={assignment} />
              ))}
            </div>
          </div>
        )}

        {/* Help text */}
        {hasAnyProjects && !readyForViewing && !allRejected && (
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                💡 <strong>Tip:</strong> Markeer minstens 2 projecten als "interessant" om een bezichtigingsreis te kunnen plannen. 
                Tijdens de bezichtiging kun je de projecten in het echt bekijken en een weloverwogen keuze maken.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
