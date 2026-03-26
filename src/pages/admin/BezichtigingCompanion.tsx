import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEnrichedTripForAdmin } from "@/hooks/useEnrichedTripForAdmin";
import { useCompanionNotes } from "@/hooks/useCompanionNotes";
import { CompanionViewingCard } from "@/components/companion/CompanionViewingCard";
import { CompanionSummary } from "@/components/companion/CompanionSummary";
import { CompanionTripHome } from "@/components/companion/CompanionTripHome";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { X, ChevronLeft, ChevronRight, Home } from "lucide-react";
import { useSwipeTabs } from "@/hooks/useSwipeTabs";
import type { EnrichedViewing } from "@/hooks/useEnrichedTrips";
import { hasAmenityCoordinates } from "@/hooks/useEnrichedTrips";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function BezichtigingCompanion() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  // handleClose is defined after tripData is loaded
  const { data: tripData, isLoading: tripLoading } = useDirectTrip(tripId);

  const handleClose = () => {
    if (tripData?.crmLeadId) {
      navigate(`/admin/klanten/${tripData.crmLeadId}`);
    } else {
      navigate("/admin/bezichtigingsreizen");
    }
  };
  // null = home page, number = viewing index
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const { notes, isLoading: notesLoading, upsertNote, updateRating, updateAssessment, saveCostIndication, uploadMedia, deleteMedia, getNoteForViewing } =
    useCompanionNotes(tripId);


  const enrichedTrip = useEnrichedTripForAdmin(
    tripData?.trip || null,
    tripData?.crmLeadId,
    "bezichtiging"
  );

  const viewings: EnrichedViewing[] = useMemo(() => {
    if (!enrichedTrip.data?.scheduled_viewings) return [];
    return [...enrichedTrip.data.scheduled_viewings].sort((a, b) => {
      const dateCompare = (a.date || "").localeCompare(b.date || "");
      if (dateCompare !== 0) return dateCompare;
      return (a.time || "").localeCompare(b.time || "");
    });
  }, [enrichedTrip.data]);

  // Auto-enrich viewings that lack location_intelligence coordinates
  const queryClient = useQueryClient();
  const enrichedRef = useRef(new Set<string>());

  useEffect(() => {
    const toEnrich = viewings.filter((v) => {
      if (!v.project_id) return false;
      if (enrichedRef.current.has(v.project_id)) return false;
      const hasCoords =
        (v.project_latitude || v.showhouse_latitude) &&
        (v.project_longitude || v.showhouse_longitude);
      if (!hasCoords) return false;
      if (!v.location_intelligence) return true;
      if (!hasAmenityCoordinates(v.location_intelligence)) return true;
      return false;
    });

    if (toEnrich.length === 0) return;

    toEnrich.forEach((v) => {
      const isStale = !!v.location_intelligence && !hasAmenityCoordinates(v.location_intelligence);
      enrichedRef.current.add(v.project_id!);
      supabase.functions
        .invoke("enrich-project-landing", {
          body: { projectId: v.project_id, forceRefresh: isStale },
        })
        .then(({ error }) => {
          if (!error) {
            queryClient.invalidateQueries({ queryKey: ["enriched-trip-admin"] });
          } else {
            console.warn("[BezichtigingCompanion] Enrich failed for", v.project_id, error);
          }
        });
    });
  }, [viewings, queryClient]);

  // Swipe support (only when viewing a specific viewing)
  const viewingIds = useMemo(() => viewings.map((_, i) => String(i)), [viewings]);
  const swipe = useSwipeTabs({
    tabs: viewingIds,
    currentTab: String(activeIndex ?? 0),
    onTabChange: (tab) => setActiveIndex(Number(tab)),
    threshold: 60,
  });

  const activeViewing = activeIndex !== null ? viewings[activeIndex] : null;
  const isLoading = tripLoading || enrichedTrip.isLoading || notesLoading;
  const customerName = tripData?.customerName || "Klant";

  const handleSaveNote = (viewingId: string, projectId: string, text: string) => {
    upsertNote.mutate({ viewingId, projectId, noteText: text });
  };

  const handleRate = (viewingId: string, projectId: string, rating: number) => {
    updateRating.mutate({ viewingId, projectId, rating: rating || null });
  };

  const handleAssessment = (viewingId: string, projectId: string, data: { interestLevel?: string | null; budgetFit?: boolean | null; followUpAction?: string | null }) => {
    updateAssessment.mutate({ viewingId, projectId, ...data });
  };

  const goHome = () => {
    setActiveIndex(null);
    setShowSummary(false);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[60] bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-lg px-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!tripData || viewings.length === 0) {
    return (
      <div className="fixed inset-0 z-[60] bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Geen bezichtigingen gevonden voor deze reis.</p>
          <Button variant="outline" onClick={handleClose}>Terug</Button>
        </div>
      </div>
    );
  }

  // ─── Home page ───────────────────────────────────
  if (activeIndex === null && !showSummary) {
    return (
      <div className="fixed inset-0 z-[60] bg-background flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-5 w-5" />
            </Button>
            <span className="text-sm font-medium">Bezichtigingsreis</span>
          </div>
        </div>

        <CompanionTripHome
          customerName={customerName}
          tripStartDate={tripData.trip.trip_start_date}
          tripEndDate={tripData.trip.trip_end_date}
          tripData={enrichedTrip.data}
          viewings={viewings}
          notes={notes}
          onSelectViewing={(i) => setActiveIndex(i)}
          onOpenSummary={() => setShowSummary(true)}
        />
      </div>
    );
  }

  // ─── Summary page ────────────────────────────────
  if (showSummary) {
    return (
      <div className="fixed inset-0 z-[60] bg-background flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={goHome}>
              <Home className="h-5 w-5" />
            </Button>
            <span className="text-sm font-medium">Notities-overzicht</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-3xl mx-auto w-full">
          <CompanionSummary viewings={viewings} notes={notes} />
        </div>
      </div>
    );
  }

  // ─── Individual viewing ──────────────────────────
  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={goHome}>
            <Home className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <span className="text-sm font-medium truncate block">
              {activeViewing?.project_name || "Bezichtiging"}
            </span>
            <span className="text-xs text-muted-foreground">
              {(activeIndex ?? 0) + 1} van {viewings.length}
            </span>
          </div>
        </div>
      </div>

      {/* Dot stepper */}
      <div className="flex items-center justify-center gap-1.5 px-4 py-2.5 border-b shrink-0">
        {viewings.map((v, i) => (
          <button
            key={v.id}
            onClick={() => setActiveIndex(i)}
            className={`transition-all rounded-full ${
              i === activeIndex
                ? "w-8 h-3 bg-primary"
                : "w-3 h-3 bg-muted-foreground/30 hover:bg-muted-foreground/50"
            }`}
            title={v.project_name}
            aria-label={`Bezichtiging ${i + 1}: ${v.project_name}`}
          />
        ))}
      </div>

      {/* Viewing content with swipe */}
      <div
        className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-3xl mx-auto w-full"
        onTouchStart={swipe.onTouchStart}
        onTouchEnd={swipe.onTouchEnd}
      >
        {activeViewing && (
          <CompanionViewingCard
            key={activeViewing.id}
            viewing={activeViewing}
            note={getNoteForViewing(activeViewing.id)}
            onSaveNote={handleSaveNote}
            onRate={handleRate}
            onAssessment={handleAssessment}
            onUploadMedia={uploadMedia}
            onDeleteMedia={deleteMedia}
            onSaveCostIndication={(viewingId, projectId, data) =>
              saveCostIndication.mutate({ viewingId, projectId, costIndication: data })
            }
          />
        )}
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-between px-4 py-3 border-t bg-background shrink-0">
        <Button
          variant="outline"
          size="sm"
          disabled={activeIndex === 0}
          onClick={() => setActiveIndex((i) => (i ?? 1) - 1)}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Vorige
        </Button>
        <span className="text-sm font-medium text-muted-foreground">
          {(activeIndex ?? 0) + 1} / {viewings.length}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={activeIndex === viewings.length - 1}
          onClick={() => setActiveIndex((i) => (i ?? -1) + 1)}
          className="gap-1"
        >
          Volgende
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Helper hook: fetch trip + customer name directly by ID
function useDirectTrip(tripId: string | undefined) {
  return useQuery({
    queryKey: ["direct-trip", tripId],
    queryFn: async () => {
      if (!tripId) return null;
      const { data, error } = await supabase
        .from("customer_viewing_trips")
        .select("*, crm_leads!customer_viewing_trips_crm_lead_id_fkey(first_name, last_name)")
        .eq("id", tripId)
        .maybeSingle();

      if (error || !data) return null;

      const lead = data.crm_leads as any;
      const customerName = lead
        ? [lead.first_name, lead.last_name].filter(Boolean).join(" ")
        : "Klant";

      return {
        crmLeadId: data.crm_lead_id,
        customerName,
        trip: {
          id: data.id,
          trip_start_date: data.trip_start_date,
          trip_end_date: data.trip_end_date,
          status: data.status,
          flight_info: data.flight_info as string | null,
          accommodation_info: data.accommodation_info as string | null,
          customer_notes: data.customer_notes,
          admin_notes: data.admin_notes,
          scheduled_viewings: data.scheduled_viewings as any,
          trip_type: data.trip_type,
        },
      };
    },
    enabled: !!tripId,
  });
}
