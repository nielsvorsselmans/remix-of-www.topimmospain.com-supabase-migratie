import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useCustomerPreview } from "@/contexts/CustomerPreviewContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

// V3 Landing Page Components
import { ProjectHero } from "@/components/project-landing/ProjectHero";
import { PersonaSwitcher } from "@/components/project-landing/PersonaSwitcher";
import { LocationSection } from "@/components/project-landing/LocationSection";
import { UnitConfigurator } from "@/components/project-landing/UnitConfigurator";
import { InvestmentDashboard } from "@/components/project-landing/InvestmentDashboard";
import { MediaGallery } from "@/components/project-landing/MediaGallery";
import { ProjectFAQ } from "@/components/project-landing/ProjectFAQ";

// Portal-specific components
import { QuickActionBar } from "@/components/project/QuickActionBar";
import { ProjectPdfDownload } from "@/components/project/ProjectPdfDownload";
import { useAssignedProjects, AssignedProject } from "@/hooks/useAssignedProjects";
import { useProjectLandingData } from "@/hooks/useProjectLandingData";
import { useToggleFavorite } from "@/hooks/useFavorites";
import { useCustomerTrips } from "@/hooks/useCustomerTrips";
import { ProjectBudgetCTA } from "@/components/project/ProjectBudgetCTA";
import { ArrowLeft, Sparkles, X, Star, Plane, MapPin, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { isProjectSoldOut } from "@/lib/selection-utils";
import { parseISO, isFuture } from "date-fns";

export default function PortalProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isPreviewMode } = useCustomerPreview();
  
  const [notes, setNotes] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<AssignedProject['status'] | null>(null);
  
  // V3 data hook for rich project data
  const { data: project, isLoading, generateUnitDescriptions } = useProjectLandingData(id || "");
  
  const { 
    projects: assignedProjects, 
    updateStatus, 
    updateNotes,
    promoteFavorite,
    isUpdating 
  } = useAssignedProjects();

  const toggleFavorite = useToggleFavorite();
  const { data: trips } = useCustomerTrips();

  // Find selection for this project
  const selection = assignedProjects.find(p => p.project_id === id);
  const hasUpcomingTrip = trips?.some(trip => isFuture(parseISO(trip.trip_start_date))) ?? false;
  const isFavorite = selection?.source === 'favorite';

  // Track if there are unsaved changes
  const hasUnsavedChanges = selection && (
    (selectedStatus !== null && selectedStatus !== selection.status) ||
    (notes !== (selection.customer_notes || ""))
  );

  // Warn on browser close/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (selection) {
      setNotes(selection.customer_notes || "");
      setSelectedStatus(selection.status);
    }
  }, [selection]);

  const handleSave = async () => {
    if (!selectedStatus || !selection) return;
    
    if (isPreviewMode) {
      toast({ title: "Je bekijkt dit als klant", description: "Wijzigingen zijn niet mogelijk in preview mode." });
      return;
    }
    
    try {
      if (isFavorite) {
        await promoteFavorite({ 
          projectId: selection.project_id, 
          status: selectedStatus, 
          notes: notes || undefined 
        });
      } else {
        if (selectedStatus !== selection.status) {
          await updateStatus({ selectionId: selection.id, status: selectedStatus });
        }
        if (notes !== selection.customer_notes) {
          await updateNotes({ selectionId: selection.id, notes });
        }
      }
      
      toast({ title: "Opgeslagen", description: "Je beoordeling is opgeslagen." });
      navigate('/dashboard/projecten');
    } catch (error) {
      toast({ title: "Fout bij opslaan", variant: "destructive" });
    }
  };

  const availableCount = project?.units?.filter(u => (u as any).status === 'available' || (!('status' in u) && u.price > 0)).length || 0;
  const isSoldOut = project ? isProjectSoldOut({ status: (project as any).status }) : false;

  // Shared CTA logic — used by both hero and post-dashboard CTA
  const isAdvisorAssigned = selection?.source === 'admin';
  const upcomingTrip = trips?.find(trip => isFuture(parseISO(trip.trip_start_date)));

  const handleBinaryChoice = (status: 'interested' | 'rejected') => {
    if (isPreviewMode) {
      toast({ title: "Preview mode", description: "Wijzigingen zijn niet mogelijk in preview mode." });
      return;
    }
    if (selection) {
      if (isFavorite) {
        promoteFavorite({ projectId: selection.project_id, status });
      } else {
        updateStatus({ selectionId: selection.id, status });
      }
    } else if (id) {
      promoteFavorite({ projectId: id, status });
    }
  };

  const renderCtaBlock = (binaryHeadline: string, binarySubtext: string, interestedSubtext: string) => {
    // to_visit / visited → nothing
    if (selection?.status === 'to_visit' || selection?.status === 'visited') return null;

    // Sold out → informational block, no positive actions
    if (isSoldOut) {
      return (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 md:p-8 text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">Dit project is uitverkocht</h3>
          <p className="text-muted-foreground text-sm leading-relaxed mb-5 max-w-md mx-auto">
            Alle woningen in dit project zijn verkocht. Bekijk je andere projecten voor beschikbare opties.
          </p>
          <div className="flex items-center justify-center gap-3">
            {selection?.status !== 'rejected' && (
              <Button
                size="lg"
                variant="outline"
                onClick={() => handleBinaryChoice('rejected')}
                disabled={isUpdating || isPreviewMode}
              >
                <X className="h-4 w-4 mr-2" />
                Sla over
              </Button>
            )}
            <Button size="lg" asChild>
              <Link to="/dashboard/projecten">Bekijk andere projecten</Link>
            </Button>
          </div>
        </div>
      );
    }

    // Rejected
    if (selection?.status === 'rejected') {
      return (
        <div className="rounded-2xl border border-border bg-muted/30 p-5 text-center">
          <p className="text-sm text-muted-foreground mb-2">Je hebt dit project afgewezen</p>
          <button
            onClick={() => handleBinaryChoice('interested')}
            disabled={isUpdating || isPreviewMode}
            className="text-sm text-primary hover:underline font-medium"
          >
            Toch interessant? Herstel keuze
          </button>
        </div>
      );
    }

    // Interested + no trip
    if (selection?.status === 'interested' && !upcomingTrip) {
      return (
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-accent/10 to-primary/5 p-6 md:p-8 text-center">
          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Je vindt dit project interessant</h3>
          <p className="text-muted-foreground text-sm leading-relaxed mb-5 max-w-md mx-auto">
            {interestedSubtext}
          </p>
          <Button size="lg" asChild>
            <Link to="/dashboard/bezichtiging">
              <Plane className="h-4 w-4 mr-2" />
              Plan je bezichtigingsreis
            </Link>
          </Button>
        </div>
      );
    }

    // Interested + trip planned
    if (selection?.status === 'interested' && upcomingTrip) {
      const tripDate = parseISO(upcomingTrip.trip_start_date);
      const formattedDate = tripDate.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' });
      return (
        <div className="rounded-2xl border border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 via-purple-50/50 to-transparent dark:from-purple-950/30 dark:via-purple-950/20 p-6 md:p-8 text-center">
          <MapPin className="h-6 w-6 text-purple-600 dark:text-purple-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Voeg dit project toe aan je bezichtiging</h3>
          <p className="text-muted-foreground text-sm leading-relaxed mb-5 max-w-md mx-auto">
            Je reis is gepland op {formattedDate}. Wil je dit project bezoeken?
          </p>
          <Button 
            size="lg"
            onClick={() => {
              if (isPreviewMode) return;
              setSelectedStatus('to_visit');
              if (isFavorite) {
                promoteFavorite({ projectId: selection.project_id, status: 'to_visit' });
              } else {
                updateStatus({ selectionId: selection.id, status: 'to_visit' });
              }
            }}
            disabled={isUpdating || isPreviewMode}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Wil bezoeken
          </Button>
        </div>
      );
    }

    // Binary choice (not rated yet / suggested / favorite)
    return (
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-accent/10 to-primary/5 p-6 md:p-8 text-center">
        {isAdvisorAssigned && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700 px-3 py-1 text-xs font-semibold mb-4">
            <Star className="h-3.5 w-3.5" />
            Geselecteerd door je adviseur
          </div>
        )}
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {isAdvisorAssigned 
            ? "Jouw adviseur heeft dit project voor je uitgekozen" 
            : binaryHeadline}
        </h3>
        <p className="text-muted-foreground text-sm leading-relaxed mb-5 max-w-md mx-auto">
          {isAdvisorAssigned
            ? "Op basis van jouw wensen is dit project geselecteerd. Wat vind je ervan?"
            : binarySubtext}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button
            size="lg"
            onClick={() => handleBinaryChoice('interested')}
            disabled={isUpdating || isPreviewMode}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Spreekt me aan
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => handleBinaryChoice('rejected')}
            disabled={isUpdating || isPreviewMode}
          >
            <X className="h-4 w-4 mr-2" />
            Sla over
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">Vrijblijvend — je kunt dit altijd wijzigen</p>
      </div>
    );
  };


  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Project niet gevonden</p>
        <Button asChild className="mt-4">
          <Link to="/dashboard/projecten">Terug naar selectie</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 max-w-5xl [&_section]:py-8 [&_section]:md:py-16">
        {/* Back button - hidden on mobile (bottom nav has Selectie tab) */}
        <Button variant="ghost" asChild className="gap-2 -mb-2 hidden md:inline-flex">
          <Link to="/dashboard/projecten">
            <ArrowLeft className="h-4 w-4" />
            Terug naar selectie
          </Link>
        </Button>

        {/* V3 Hero - rounded within portal, constrained height + PDF overlay */}
        <div className="relative rounded-xl overflow-hidden">
          <ProjectHero
            title={project.title}
            location={project.subtitle}
            startingPrice={project.startingPrice}
            videoUrl={project.heroVideoUrl}
            heroImages={project.heroImages}
            className="h-[50vh] min-h-[350px]"
          />
          <div className="absolute top-4 right-4 z-20">
            <ProjectPdfDownload 
              projectId={id || ''} 
              projectName={project.title}
              variant="icon"
              className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
            />
          </div>
        </div>

        {/* Portal: Quick Action Bar */}
        {selection && (
          <QuickActionBar
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            availableCount={availableCount}
            priceFrom={project.startingPrice}
            isFavorite={isFavorite}
            isPreviewMode={isPreviewMode}
            isUpdating={isUpdating}
            isSoldOut={isSoldOut}
          />
        )}

        {/* V3: Persona Switcher */}
        <PersonaSwitcher 
          projectName={project.title}
          content={project.personaContent}
          sectionTitle={project.personaSectionTitle}
          sectionSubtitle={project.personaSectionSubtitle}
        />

        {/* V3: Location Section */}
        <LocationSection 
          location={project.location}
          region={project.region}
          coordinates={project.coordinates}
          nearbyAmenities={project.nearbyAmenities}
          lifestyleScore={project.locationStats.lifestyleScore}
          projectName={project.title}
        />

        {/* Dynamic Binary CTA - after discovery sections */}
        {renderCtaBlock("Wat vind je van dit project?", "Geef je mening — zo kunnen we beter projecten voor je vinden die écht bij je passen.", "Klaar om het in het echt te zien? Plan een bezichtigingsreis — wij regelen alles voor je.")}

        {/* V3: Unit Configurator */}
        <UnitConfigurator 
          units={project.units}
          projectName={project.title}
          onGenerateDescriptions={() => generateUnitDescriptions.mutate()}
          isGeneratingDescriptions={generateUnitDescriptions.isPending}
        />

        {/* V3: Media Gallery */}
        <MediaGallery 
          gallery={project.gallery}
          buildUpdateVideos={project.buildUpdateVideos || []}
          showcaseVideos={project.showcaseVideos || []}
          primaryShowcaseVideo={project.primaryShowcaseVideo}
          primaryEnvironmentVideo={project.primaryEnvironmentVideo}
          allVideos={project.allVideos || []}
          timeline={project.timeline}
          projectName={project.title}
        />

        {/* Budget CTA — contextual link to hypotheek simulator */}
        <ProjectBudgetCTA 
          aankoopsom={project.startingPrice} 
          provincie={project.region?.toLowerCase().includes("alicante") ? "alicante" : project.region?.toLowerCase().includes("murcia") ? "murcia" : "valencia"}
        />

        {/* V3: Investment Dashboard */}
        <InvestmentDashboard
          startingPrice={project.startingPrice}
          projectName={project.title}
          projectId={id || ""}
          latitude={project.coordinates?.lat || 0}
          longitude={project.coordinates?.lng || 0}
          bedrooms={project.units[0]?.bedrooms || 2}
          properties={project.units?.map(u => ({
            id: u.id || u.type,
            title: u.type,
            price: u.price,
            property_type: u.type,
            bedrooms: u.bedrooms,
            bathrooms: u.bathrooms,
          })) || []}
        />

        {/* Dynamic CTA after Investment Dashboard */}
        {renderCtaBlock("Nu je de cijfers hebt gezien — wat vind je?", "Geef je mening zodat we beter kunnen afstemmen op jouw wensen.", "Klaar om het in het echt te zien?")}

        {/* V3: FAQ */}
        <ProjectFAQ 
          faq={project.faq}
          developerName={project.developer.name}
        />

        {/* Portal: Final Review - Sticky on mobile */}
        {selection && (
          <>
            <div className="h-0 md:hidden" />
            
            {/* Desktop: regular card */}
            <Card className="hidden md:block border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader className="py-4">
                <CardTitle className="text-lg">Jouw beoordeling opslaan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pb-5">
                <div className="flex flex-wrap gap-2">
                  {!isSoldOut && (
                    <Button
                      variant={selectedStatus === 'interested' ? 'default' : 'outline'}
                      onClick={() => setSelectedStatus('interested')}
                      disabled={isPreviewMode}
                      className={cn(
                        selectedStatus === 'interested' && "bg-teal-600 hover:bg-teal-700"
                      )}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Spreekt me aan
                    </Button>
                  )}
                  {!isSoldOut && (
                    <Button
                      variant={selectedStatus === 'to_visit' ? 'default' : 'outline'}
                      onClick={() => setSelectedStatus('to_visit')}
                      disabled={isPreviewMode}
                      className={cn(
                        selectedStatus === 'to_visit' && "bg-purple-600 hover:bg-purple-700"
                      )}
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Wil bezoeken
                    </Button>
                  )}
                  {!isSoldOut && (
                    <Button
                      variant={selectedStatus === 'suggested' ? 'default' : 'outline'}
                      onClick={() => setSelectedStatus('suggested')}
                      disabled={isFavorite || isPreviewMode}
                    >
                      <Star className="h-4 w-4 mr-2" />
                      Twijfel
                    </Button>
                  )}
                  <Button
                    variant={selectedStatus === 'rejected' ? 'default' : 'outline'}
                    onClick={() => setSelectedStatus('rejected')}
                    disabled={isPreviewMode}
                    className={cn(
                      selectedStatus === 'rejected' && "bg-muted text-muted-foreground"
                    )}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Sla over
                  </Button>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Jouw notitie (optioneel)
                  </label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Wat vind je interessant? Waar twijfel je over?"
                    rows={2}
                    disabled={isPreviewMode}
                  />
                </div>

                <Button 
                  onClick={handleSave}
                  disabled={isUpdating || !selectedStatus || isPreviewMode}
                  className="w-full"
                  size="lg"
                >
                  {isPreviewMode ? "Preview mode - wijzigen niet mogelijk" : isUpdating ? "Opslaan..." : "Opslaan en terug naar selectie"}
                </Button>
              </CardContent>
            </Card>

            {/* Mobile: Sticky footer - offset for bottom nav */}
            <div className="md:hidden fixed bottom-16 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border p-3 z-50 shadow-lg">
              <div className="flex gap-2 mb-2">
                  {!isSoldOut && (
                    <Button
                      variant={selectedStatus === 'interested' ? 'default' : 'outline'}
                      onClick={() => setSelectedStatus('interested')}
                      disabled={isPreviewMode}
                      size="sm"
                      className={cn(
                        "flex-1 flex-col gap-0.5 h-auto py-1.5",
                        selectedStatus === 'interested' && "bg-teal-600 hover:bg-teal-700"
                      )}
                    >
                      <Sparkles className="h-4 w-4" />
                      <span className="text-[10px]">Interesse</span>
                    </Button>
                  )}
                  {!isSoldOut && (
                    <Button
                      variant={selectedStatus === 'to_visit' ? 'default' : 'outline'}
                      onClick={() => setSelectedStatus('to_visit')}
                      disabled={isPreviewMode}
                      size="sm"
                      className={cn(
                        "flex-1 flex-col gap-0.5 h-auto py-1.5",
                        selectedStatus === 'to_visit' && "bg-purple-600 hover:bg-purple-700"
                      )}
                    >
                      <MapPin className="h-4 w-4" />
                      <span className="text-[10px]">Bezoeken</span>
                    </Button>
                  )}
                  {!isSoldOut && (
                    <Button
                      variant={selectedStatus === 'suggested' ? 'default' : 'outline'}
                      onClick={() => setSelectedStatus('suggested')}
                      disabled={isFavorite || isPreviewMode}
                      size="sm"
                      className="flex-1 flex-col gap-0.5 h-auto py-1.5"
                    >
                      <Star className="h-4 w-4" />
                      <span className="text-[10px]">Twijfel</span>
                    </Button>
                  )}
                <Button
                  variant={selectedStatus === 'rejected' ? 'default' : 'outline'}
                  onClick={() => setSelectedStatus('rejected')}
                  disabled={isPreviewMode}
                  size="sm"
                  className={cn(
                    "flex-1 flex-col gap-0.5 h-auto py-1.5",
                    selectedStatus === 'rejected' && "bg-muted text-muted-foreground"
                  )}
                >
                  <X className="h-4 w-4" />
                  <span className="text-[10px]">Sla over</span>
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={isUpdating || !selectedStatus || isPreviewMode}
                  size="sm"
                  className="flex-[2] flex-col gap-0.5 h-auto py-1.5"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-[10px]">{isUpdating ? "..." : "Opslaan"}</span>
                </Button>
              </div>
            </div>
            <div className="h-16 md:hidden" />
          </>
        )}

      </div>
    </>
  );
}
