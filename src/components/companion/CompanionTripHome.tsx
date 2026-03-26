import { useMemo, useRef, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Calendar, MapPin, Clock, FileText, Camera, ChevronRight, Map as MapIcon, Maximize2, Minimize2, Navigation, Download, CheckCircle2, WifiOff } from "lucide-react";
import { formatEventDateFull } from "@/lib/dateUtils";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapboxToken } from "@/hooks/useMapboxToken";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanionOffline } from "@/hooks/useCompanionOffline";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import type { EnrichedTrip, EnrichedViewing } from "@/hooks/useEnrichedTrips";
import { hasAmenityCoordinates } from "@/hooks/useEnrichedTrips";
import type { CompanionNote } from "@/hooks/useCompanionNotes";

interface CompanionTripHomeProps {
  customerName: string;
  tripStartDate: string;
  tripEndDate: string;
  tripData?: EnrichedTrip | null;
  viewings: EnrichedViewing[];
  notes: CompanionNote[];
  onSelectViewing: (index: number) => void;
  onOpenSummary: () => void;
}

export function CompanionTripHome({
  customerName,
  tripStartDate,
  tripEndDate,
  tripData,
  viewings,
  notes,
  onSelectViewing,
  onOpenSummary,
}: CompanionTripHomeProps) {
  const queryClient = useQueryClient();
  const enrichedRef = useRef(new Set<string>());
  const { token: mapboxToken } = useMapboxToken();
  const { isReachable } = useOnlineStatus();

  const { isPrefetching, progress, offlineReady, lastCachedAt, startPrefetch } =
    useCompanionOffline({
      tripId: tripData?.id,
      tripData,
      notes,
      mapboxToken: mapboxToken || undefined,
    });

  const notesMap = useMemo(
    () => new Map(notes.map((n) => [n.viewing_id, n])),
    [notes]
  );

  // Auto-enrich projects that have coordinates but no/stale location_intelligence
  useEffect(() => {
    const toEnrich = viewings.filter((v) => {
      if (!v.project_id) return false;
      if (enrichedRef.current.has(v.project_id)) return false;
      const hasCoords =
        (v.project_latitude || v.showhouse_latitude) &&
        (v.project_longitude || v.showhouse_longitude);
      if (!hasCoords) return false;

      // No location_intelligence at all → enrich
      if (!v.location_intelligence) return true;

      // Has location_intelligence but amenities lack coordinates → force refresh
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
            queryClient.invalidateQueries({ queryKey: ["enriched-customer-trips"] });
          } else {
            console.warn("[CompanionTripHome] Enrich failed for", v.project_id, error);
          }
        });
    });
  }, [viewings, queryClient]);

  // Group viewings by date
  const grouped = useMemo(() => {
    const map = new Map<string, { viewing: EnrichedViewing; originalIndex: number }[]>();
    viewings.forEach((v, i) => {
      const date = v.date || "onbekend";
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push({ viewing: v, originalIndex: i });
    });
    return map;
  }, [viewings]);

  const formatDateHeader = (dateStr: string) => {
    if (dateStr === "onbekend") return "Datum onbekend";
    try {
      return format(parseISO(dateStr), "EEEE d MMMM", { locale: nl });
    } catch {
      return dateStr;
    }
  };

  const formatTripRange = () => {
    try {
      const start = format(parseISO(tripStartDate), "d MMM", { locale: nl });
      const end = format(parseISO(tripEndDate), "d MMM yyyy", { locale: nl });
      return `${start} – ${end}`;
    } catch {
      return `${tripStartDate} – ${tripEndDate}`;
    }
  };

  const totalNotes = notes.filter((n) => n.note_text?.trim()).length;
  const totalMedia = notes.reduce((sum, n) => sum + (n.media?.length || 0), 0);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/10 to-transparent px-4 sm:px-6 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-foreground">{customerName}</h1>
        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {formatTripRange()}
          </span>
          <span>{viewings.length} bezichtigingen</span>
        </div>
      </div>

      <div className="px-4 sm:px-6 pb-6 space-y-6 max-w-3xl mx-auto w-full">
        {/* Offline status / download button */}
        <OfflineSection
          isPrefetching={isPrefetching}
          progress={progress}
          offlineReady={offlineReady}
          lastCachedAt={lastCachedAt}
          isReachable={isReachable}
          onStartPrefetch={startPrefetch}
        />

        {/* Overview map */}
        <OverviewMap viewings={viewings} />

        {/* Quick stats if notes exist */}
        {(totalNotes > 0 || totalMedia > 0) && (
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={onOpenSummary}
          >
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Notities-overzicht
            </span>
            <span className="text-xs text-muted-foreground">
              {totalNotes} notities · {totalMedia} media
            </span>
          </Button>
        )}

        {/* Day groups */}
        {Array.from(grouped.entries()).map(([date, items]) => (
          <div key={date} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide capitalize">
              {formatDateHeader(date)}
            </h2>

            {items.map(({ viewing, originalIndex }) => {
              const note = notesMap.get(viewing.id);
              const hasContent = !!(note?.note_text?.trim() || (note?.media?.length && note.media.length > 0));

              const hasCoords = !!(
                (viewing.showhouse_latitude || viewing.project_latitude) &&
                (viewing.showhouse_longitude || viewing.project_longitude)
              );

              return (
                <Card
                  key={viewing.id}
                  className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
                  onClick={() => onSelectViewing(originalIndex)}
                >
                  <div className="flex items-stretch">
                    {/* Number badge + Thumbnail */}
                    <div className="relative shrink-0">
                      {viewing.project_featured_image ? (
                        <img
                          src={viewing.project_featured_image}
                          alt=""
                          className="w-24 sm:w-28 object-cover h-full"
                        />
                      ) : (
                        <div className="w-24 sm:w-28 h-full bg-muted flex items-center justify-center">
                          <MapPin className="h-6 w-6 text-muted-foreground/40" />
                        </div>
                      )}
                      <span className="absolute top-1.5 left-1.5 inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-md border-2 border-background">
                        {originalIndex + 1}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 p-3 sm:p-4 flex flex-col justify-center min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-foreground truncate">
                          {viewing.project_name}
                        </h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {hasContent && (
                            <span className="inline-flex items-center justify-center h-2 w-2 rounded-full bg-primary" title="Heeft notities" />
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                        {viewing.time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {viewing.time}
                          </span>
                        )}
                        {viewing.showhouse_address ? (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3" />
                            {viewing.showhouse_address}
                          </span>
                        ) : !hasCoords ? (
                          <span className="flex items-center gap-1 text-muted-foreground/60 italic">
                            <MapPin className="h-3 w-3" />
                            Locatie onbekend
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Offline Download Section ───────────────────────────────────────
function OfflineSection({
  isPrefetching,
  progress,
  offlineReady,
  lastCachedAt,
  isReachable,
  onStartPrefetch,
}: {
  isPrefetching: boolean;
  progress: { done: number; total: number; label: string } | null;
  offlineReady: boolean;
  lastCachedAt: Date | null;
  isReachable: boolean;
  onStartPrefetch: () => void;
}) {
  if (!isReachable && !offlineReady) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span>Geen internet — data niet gecacht</span>
      </div>
    );
  }

  if (isPrefetching && progress) {
    const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
    return (
      <div className="space-y-2 rounded-lg border bg-muted/30 px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 font-medium text-foreground">
            <Download className="h-4 w-4 animate-pulse" />
            Downloaden voor offline…
          </span>
          <span className="text-xs text-muted-foreground">{progress.done}/{progress.total}</span>
        </div>
        <Progress value={pct} className="h-2" />
        <p className="text-xs text-muted-foreground truncate">{progress.label}</p>
      </div>
    );
  }

  if (offlineReady) {
    const timeStr = lastCachedAt
      ? format(lastCachedAt, "d MMM 'om' HH:mm", { locale: nl })
      : "";
    return (
      <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-medium text-primary">
          <CheckCircle2 className="h-4 w-4" />
          Offline beschikbaar
        </span>
        <div className="flex items-center gap-2">
          {timeStr && <span className="text-xs text-muted-foreground">{timeStr}</span>}
          {isReachable && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onStartPrefetch}>
              Bijwerken
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Not yet cached, online
  return (
    <Button
      variant="outline"
      className="w-full justify-center gap-2"
      onClick={onStartPrefetch}
    >
      <Download className="h-4 w-4" />
      Offline beschikbaar maken
    </Button>
  );
}

// ─── Overview Map showing all viewing locations ─────────────────────
function OverviewMap({ viewings }: { viewings: EnrichedViewing[] }) {
  const { token, loading } = useMapboxToken();
  const { latitude, longitude, permissionState, requestPermission } = useGeolocation({ watch: true });
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const coords = useMemo(() => {
    return viewings
      .map((v, i) => ({
        lat: v.showhouse_latitude || v.project_latitude,
        lng: v.showhouse_longitude || v.project_longitude,
        name: v.project_name,
        index: i,
        image: v.project_featured_image,
        date: v.date,
        time: v.time,
      }))
      .filter((c) => c.lat && c.lng);
  }, [viewings]);

  useEffect(() => {
    if (!mapContainer.current || !token || coords.length === 0) return;

    mapboxgl.accessToken = token;
    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [coords[0].lng!, coords[0].lat!],
      zoom: 10,
    });

    m.on("load", () => {
      setMapLoaded(true);

      const bounds = new mapboxgl.LngLatBounds();
      coords.forEach((c) => {
        const el = document.createElement("div");
        el.innerHTML = `
          <div style="
            width: 30px; height: 30px;
            background: hsl(var(--primary));
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            color: white; font-weight: 700; font-size: 13px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.25);
            border: 3px solid white;
          ">${c.index + 1}</div>
        `;

        const popupHtml = `
          <div style="width:190px;font-family:system-ui,-apple-system,sans-serif;overflow:hidden;">
            ${c.image ? `<img src="${c.image}" style="width:100%;height:85px;object-fit:cover;border-radius:6px 6px 0 0;display:block;" alt="" />` : ''}
            <div style="padding:8px 10px;">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                <span style="
                  width:22px;height:22px;
                  background:hsl(24,95%,53%);
                  border-radius:50%;
                  display:inline-flex;align-items:center;justify-content:center;
                  color:white;font-weight:700;font-size:11px;flex-shrink:0;
                ">${c.index + 1}</span>
                <strong style="font-size:13px;line-height:1.2;">${c.name}</strong>
              </div>
              <div style="font-size:12px;color:#666;margin-top:2px;">
                📅 ${c.date || ''} · ${c.time || ''}
              </div>
            </div>
          </div>
        `;

        new mapboxgl.Marker(el)
          .setLngLat([c.lng!, c.lat!])
          .setPopup(new mapboxgl.Popup({ offset: 20, maxWidth: '220px' }).setHTML(popupHtml))
          .addTo(m);

        bounds.extend([c.lng!, c.lat!]);
      });

      if (coords.length > 1) {
        m.fitBounds(bounds, { padding: 50 });
      }
    });

    mapRef.current = m;
    return () => m.remove();
  }, [token, coords]);

  // Update user location marker
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapLoaded || !latitude || !longitude) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat([longitude, latitude]);
    } else {
      const el = document.createElement("div");
      el.innerHTML = `
        <div style="position:relative;width:20px;height:20px;">
          <div style="
            position:absolute;inset:0;
            background:hsl(217 91% 60%);
            border-radius:50%;
            border:3px solid white;
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
          "></div>
          <div style="
            position:absolute;inset:-6px;
            background:hsl(217 91% 60% / 0.3);
            border-radius:50%;
            animation:pulse 2s infinite;
          "></div>
        </div>
      `;
      const style = document.createElement("style");
      style.textContent = `@keyframes pulse{0%,100%{transform:scale(1);opacity:0.3}50%{transform:scale(1.5);opacity:0}}`;
      el.appendChild(style);

      userMarkerRef.current = new mapboxgl.Marker(el)
        .setLngLat([longitude, latitude])
        .setPopup(new mapboxgl.Popup({ offset: 15 }).setText("Jouw locatie"))
        .addTo(m);
    }
  }, [latitude, longitude, mapLoaded]);

  // Resize map when fullscreen toggles
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => mapRef.current?.resize(), 50);
    }
  }, [isFullscreen]);

  if (loading) return <Skeleton className="h-48 w-full rounded-lg" />;
  if (coords.length === 0) return null;

  const mapWrapper = isFullscreen
    ? "fixed inset-0 z-50 bg-background flex flex-col"
    : "space-y-2";

  const mapHeight = isFullscreen ? "flex-1" : "h-52";

  return (
    <div className={mapWrapper}>
      {/* Header row */}
      <div className={`flex items-center justify-between ${isFullscreen ? "px-4 py-3 border-b" : ""}`}>
        {!isFullscreen && (
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <MapIcon className="h-3.5 w-3.5" />
            Locaties
          </h2>
        )}
        {isFullscreen && (
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <MapIcon className="h-4 w-4" />
            Locaties
          </h2>
        )}
        <div className="flex items-center gap-1.5">
          {permissionState === "prompt" && (
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={requestPermission}>
              <Navigation className="h-3.5 w-3.5" />
              Mijn locatie
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsFullscreen((f) => !f)}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className={`relative ${mapHeight} w-full rounded-lg overflow-hidden border ${isFullscreen ? "rounded-none border-0" : ""}`}>
        <div ref={mapContainer} className="absolute inset-0" />
        {!mapLoaded && <Skeleton className="absolute inset-0" />}
      </div>
    </div>
  );
}
