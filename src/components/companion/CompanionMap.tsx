import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapboxToken } from "@/hooks/useMapboxToken";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useDeviceHeading } from "@/hooks/useDeviceHeading";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Navigation, Compass, MapPin, ExternalLink, Eye, EyeOff, Maximize2, X, WifiOff } from "lucide-react";
import type { EnrichedViewing } from "@/hooks/useEnrichedTrips";
import { hasAmenityCoordinates } from "@/hooks/useEnrichedTrips";
import { buildStaticMapUrl, getCachedAsset } from "@/lib/companionOfflineStorage";

const AMENITY_COLORS: Record<string, string> = {
  stranden: "#0ea5e9",
  golfbanen: "#22c55e",
  supermarkten: "#f59e0b",
  restaurants: "#ef4444",
  ziekenhuizen: "#ec4899",
  luchthavens: "#8b5cf6",
  scholen: "#6366f1",
  treinstations: "#14b8a6",
  winkelcentra: "#f97316",
  "marina's": "#06b6d4",
};

const AMENITY_EMOJIS: Record<string, string> = {
  stranden: "🏖️",
  golfbanen: "⛳",
  supermarkten: "🛒",
  restaurants: "🍽️",
  ziekenhuizen: "🏥",
  luchthavens: "✈️",
  scholen: "🎓",
  treinstations: "🚆",
  winkelcentra: "🏬",
  "marina's": "⚓",
};

function formatDistanceCompact(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

interface CompanionMapProps {
  viewing: EnrichedViewing;
  className?: string;
}

export function CompanionMap({ viewing, className }: CompanionMapProps) {
  const { token, loading: tokenLoading } = useMapboxToken();
  const { isReachable } = useOnlineStatus();
  const inlineHost = useRef<HTMLDivElement>(null);
  const fullscreenHost = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showAmenities, setShowAmenities] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [staticMapUrl, setStaticMapUrl] = useState<string | null>(null);
  const [useStaticFallback, setUseStaticFallback] = useState(false);
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
  const categoriesInitialized = useRef(false);
  const amenityMarkers = useRef<mapboxgl.Marker[]>([]);

  const { latitude, longitude, accuracy, permissionState: geoPermission, requestPermission: requestGeoPermission } = useGeolocation({ watch: true });
  const { heading, permissionState: headingPermission, requestPermission: requestHeadingPermission } = useDeviceHeading();

  const showhouseLat = viewing.showhouse_latitude;
  const showhouseLng = viewing.showhouse_longitude;
  const projectLat = viewing.project_latitude;
  const projectLng = viewing.project_longitude;

  const primaryLat = showhouseLat || projectLat;
  const primaryLng = showhouseLng || projectLng;
  const hasCoordinates = primaryLat && primaryLng;

  // Create a persistent map container element (not managed by React renders)
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  if (!mapDivRef.current) {
    mapDivRef.current = document.createElement("div");
    mapDivRef.current.style.cssText = "position:absolute;inset:0;";
  }

  // Reparent the map container between inline and fullscreen hosts
  useEffect(() => {
    const container = mapDivRef.current;
    if (!container) return;
    const target = isFullscreen ? fullscreenHost.current : inlineHost.current;
    if (target && container.parentElement !== target) {
      target.appendChild(container);
    }
    setTimeout(() => map.current?.resize(), 50);
  }, [isFullscreen]);

  // Initialize map
  useEffect(() => {
    if (!mapDivRef.current || !token || !hasCoordinates) return;
    // Ensure container is in the DOM
    if (!mapDivRef.current.parentElement && inlineHost.current) {
      inlineHost.current.appendChild(mapDivRef.current);
    }

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapDivRef.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [primaryLng!, primaryLat!],
      zoom: 14,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      setMapLoaded(true);

      const projectEl = document.createElement("div");
      projectEl.innerHTML = `
        <div style="
          width: 44px; height: 44px; background: #22c55e; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 18px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.35); border: 4px solid white;
        ">🏠</div>
      `;

      new mapboxgl.Marker(projectEl)
        .setLngLat([primaryLng!, primaryLat!])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="padding: 8px;">
              <strong>${viewing.project_name}</strong>
              ${viewing.showhouse_address ? `<div style="font-size: 12px; color: #666; margin-top: 4px;">📍 ${viewing.showhouse_address}</div>` : ''}
            </div>
          `)
        )
        .addTo(map.current!);

      if (projectLat && projectLng && showhouseLat && showhouseLng) {
        const distance = Math.sqrt(
          Math.pow((showhouseLat - projectLat) * 111000, 2) +
          Math.pow((showhouseLng - projectLng) * 85000, 2)
        );

        if (distance > 100) {
          const constructionEl = document.createElement("div");
          constructionEl.innerHTML = `
            <div style="
              width: 36px; height: 36px; background: #f97316; border-radius: 50%;
              display: flex; align-items: center; justify-content: center;
              color: white; font-size: 16px;
              box-shadow: 0 3px 10px rgba(0,0,0,0.3); border: 3px solid white;
            ">🏗️</div>
          `;

          new mapboxgl.Marker(constructionEl)
            .setLngLat([projectLng, projectLat])
            .setPopup(
              new mapboxgl.Popup({ offset: 20 }).setHTML(`
                <div style="padding: 8px;">
                  <strong>${viewing.project_name}</strong>
                  <div style="font-size: 12px; color: #666;">🏗️ Bouwlocatie</div>
                </div>
              `)
            )
            .addTo(map.current!);

          const bounds = new mapboxgl.LngLatBounds();
          bounds.extend([primaryLng!, primaryLat!]);
          bounds.extend([projectLng, projectLat]);
          map.current?.fitBounds(bounds, { padding: 60 });
        }
      }
    });

    return () => {
      amenityMarkers.current.forEach(m => m.remove());
      amenityMarkers.current = [];
      map.current?.remove();
    };
  }, [token, hasCoordinates, primaryLat, primaryLng, projectLat, projectLng, showhouseLat, showhouseLng, viewing.project_name, viewing.showhouse_address]);

  // Toggle amenity markers — filtered by activeCategories
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    amenityMarkers.current.forEach(m => m.remove());
    amenityMarkers.current = [];

    if (!showAmenities || !viewing.location_intelligence || activeCategories.size === 0) return;

    const amenities = viewing.location_intelligence;
    const bounds = new mapboxgl.LngLatBounds();
    let hasAnyMarker = false;

    if (primaryLat && primaryLng) {
      bounds.extend([primaryLng, primaryLat]);
    }

    Object.entries(amenities).forEach(([category, items]) => {
      if (!items || items.length === 0) return;
      if (!activeCategories.has(category)) return;

      const color = AMENITY_COLORS[category] || "#888";
      const emoji = AMENITY_EMOJIS[category] || "📍";

      items.slice(0, 3).forEach((item) => {
        if (!item.distance_meters) return;
        const itemAny = item as any;
        if (itemAny.latitude == null || itemAny.longitude == null) return;

        hasAnyMarker = true;
        bounds.extend([itemAny.longitude, itemAny.latitude]);

        const el = document.createElement("div");
        el.innerHTML = `
          <div style="
            width: 28px; height: 28px; background: ${color}; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            border: 2px solid white; cursor: pointer;
          ">${emoji}</div>
        `;
        const marker = new mapboxgl.Marker(el)
          .setLngLat([itemAny.longitude, itemAny.latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 15 }).setHTML(`
              <div style="padding:6px;font-family:system-ui;">
                <strong style="font-size:13px;">${emoji} ${item.name}</strong>
                <div style="font-size:11px;color:#666;">${formatDistanceCompact(item.distance_meters)}</div>
              </div>
            `)
          )
          .addTo(map.current!);
        amenityMarkers.current.push(marker);
      });
    });

    if (hasAnyMarker) {
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
    }
  }, [showAmenities, activeCategories, mapLoaded, viewing.location_intelligence, primaryLat, primaryLng]);

  // Update user marker
  useEffect(() => {
    if (!map.current || !mapLoaded || !latitude || !longitude) return;

    if (!userMarker.current) {
      const userEl = document.createElement("div");
      userEl.className = "user-location-marker";
      userEl.innerHTML = `
        <div style="position: relative; width: 24px; height: 24px;">
          <div style="position: absolute; inset: 0; background: rgba(59, 130, 246, 0.2); border-radius: 50%; animation: pulse 2s ease-out infinite;"></div>
          <div style="position: absolute; inset: 4px; background: #3b82f6; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>
          <div id="compass-arrow" style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 12px solid #3b82f6; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3)); transition: transform 0.1s ease-out;"></div>
        </div>
      `;

      userMarker.current = new mapboxgl.Marker(userEl)
        .setLngLat([longitude, latitude])
        .addTo(map.current);
    } else {
      userMarker.current.setLngLat([longitude, latitude]);
    }
  }, [latitude, longitude, mapLoaded]);

  // Update compass arrow
  useEffect(() => {
    if (!userMarker.current || heading === null) return;
    const arrow = userMarker.current.getElement().querySelector('#compass-arrow') as HTMLElement;
    if (arrow) {
      arrow.style.transform = `translateX(-50%) rotate(${heading}deg)`;
    }
  }, [heading]);

  const handleRequestPermissions = async () => {
    await requestGeoPermission();
    if (headingPermission === 'prompt') {
      await requestHeadingPermission();
    }
  };

  const openInGoogleMaps = () => {
    if (!primaryLat || !primaryLng) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${primaryLat},${primaryLng}`, '_blank');
  };

  const hasAmenities = viewing.location_intelligence && Object.keys(viewing.location_intelligence).length > 0;
  const amenitiesHaveCoords = hasAmenityCoordinates(viewing.location_intelligence);
  const isRefreshingAmenities = showAmenities && hasAmenities && !amenitiesHaveCoords;

  // Available categories (those with items)
  const availableCategories = viewing.location_intelligence
    ? Object.keys(viewing.location_intelligence).filter(k => (viewing.location_intelligence as any)[k]?.length > 0)
    : [];

  // Auto-initialize activeCategories when location_intelligence becomes available
  useEffect(() => {
    if (!categoriesInitialized.current && availableCategories.length > 0 && showAmenities) {
      setActiveCategories(new Set(availableCategories));
      categoriesInitialized.current = true;
    }
  }, [availableCategories, showAmenities]);

  const toggleAmenities = () => {
    if (showAmenities) {
      setShowAmenities(false);
      setActiveCategories(new Set());
    } else {
      setShowAmenities(true);
      setActiveCategories(new Set(availableCategories));
    }
  };

  const toggleCategory = (cat: string) => {
    setActiveCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const toggleAllCategories = () => {
    if (activeCategories.size === availableCategories.length) {
      setActiveCategories(new Set());
    } else {
      setActiveCategories(new Set(availableCategories));
    }
  };

  // Interactive legend chips component
  const legendChips = showAmenities && availableCategories.length > 0 ? (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      <button
        onClick={toggleAllCategories}
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
          activeCategories.size === availableCategories.length
            ? "bg-foreground text-background border-foreground"
            : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
        }`}
      >
        {activeCategories.size === availableCategories.length ? "Alles uit" : "Alles aan"}
      </button>
      {availableCategories.map(cat => {
        const isActive = activeCategories.has(cat);
        const color = AMENITY_COLORS[cat] || "#888";
        const emoji = AMENITY_EMOJIS[cat] || "📍";
        return (
          <button
            key={cat}
            onClick={() => toggleCategory(cat)}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-all ${
              isActive
                ? "border-transparent text-white shadow-sm"
                : "bg-muted/30 text-muted-foreground border-border opacity-60 hover:opacity-80"
            }`}
            style={isActive ? { background: color } : undefined}
          >
            <span>{emoji}</span>
            <span className="capitalize">{cat}</span>
          </button>
        );
      })}
    </div>
  ) : null;

  // Action buttons (shared between inline and fullscreen)
  const actionButtons = (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={openInGoogleMaps} className="flex-1 gap-2">
          <Navigation className="h-4 w-4" />
          Navigeer
          <ExternalLink className="h-3 w-3 opacity-50" />
        </Button>
        {hasAmenities && (
          <Button variant={showAmenities ? "default" : "outline"} size="sm" onClick={toggleAmenities} className="gap-1.5">
            {showAmenities ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            Omgeving
          </Button>
        )}
        {latitude && longitude && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span>±{Math.round(accuracy || 0)}m</span>
          </div>
        )}
      </div>
      {isRefreshingAmenities && (
        <p className="text-xs text-muted-foreground animate-pulse">
          Omgevingspunten worden bijgewerkt…
        </p>
      )}
      {legendChips}
    </div>
  );
  const needsGeoPermission = geoPermission === 'prompt';
  const needsCompassPermission = geoPermission === 'granted' && headingPermission === 'prompt';

  // Detect offline and try static map fallback
  useEffect(() => {
    if (!isReachable && hasCoordinates && token) {
      const url = buildStaticMapUrl(primaryLat!, primaryLng!, viewing.project_name, token);
      getCachedAsset(url).then((cached) => {
        if (cached) {
          cached.blob().then((blob) => {
            setStaticMapUrl(URL.createObjectURL(blob));
            setUseStaticFallback(true);
          });
        } else {
          setUseStaticFallback(true);
          setStaticMapUrl(null);
        }
      });
    } else {
      setUseStaticFallback(false);
    }
  }, [isReachable, hasCoordinates, primaryLat, primaryLng, token, viewing.project_name]);

  if (tokenLoading) {
    return <Skeleton className={`h-48 w-full rounded-lg ${className}`} />;
  }

  if (!hasCoordinates) {
    return null;
  }

  // Static map fallback when offline
  if (useStaticFallback) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="relative h-48 w-full rounded-lg overflow-hidden border bg-muted">
          {staticMapUrl ? (
            <img src={staticMapUrl} alt="Kaart" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-2">
                <MapPin className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                <p className="text-xs text-muted-foreground">Kaart niet beschikbaar offline</p>
              </div>
            </div>
          )}
          <div className="absolute bottom-2 left-2 right-2">
            <div className="flex items-center gap-1.5 bg-background/80 backdrop-blur-sm rounded-md px-2.5 py-1.5 text-xs text-muted-foreground">
              <WifiOff className="h-3 w-3" />
              Offline kaart — beperkte interactie
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={openInGoogleMaps} className="w-full gap-2">
          <Navigation className="h-4 w-4" />
          Navigeer
          <ExternalLink className="h-3 w-3 opacity-50" />
        </Button>
      </div>
    );
  }

  if (isFullscreen) {
    return (
      <>
        {/* Hidden inline placeholder to keep DOM structure */}
        <div className={`${className} invisible h-0 overflow-hidden`}>
          <div ref={inlineHost} className="absolute inset-0" />
        </div>

        <div className="fixed inset-0 z-[70] bg-background flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-background shrink-0">
            <span className="text-sm font-medium truncate">{viewing.project_name} — Kaart</span>
            <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Map area */}
          <div className="flex-1 relative">
            <div ref={fullscreenHost} className="absolute inset-0" />
            {!mapLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <Skeleton className="h-full w-full" />
              </div>
            )}

            {mapLoaded && needsGeoPermission && (
              <div className="absolute bottom-20 left-4 right-4">
                <Button onClick={handleRequestPermissions} size="sm" className="w-full gap-2 bg-primary/90 backdrop-blur-sm">
                  <Compass className="h-4 w-4" />
                  Toon mijn locatie
                </Button>
              </div>
            )}
            {mapLoaded && !needsGeoPermission && needsCompassPermission && (
              <button
                onClick={requestHeadingPermission}
                className="absolute bottom-20 right-4 bg-background/80 backdrop-blur-sm rounded-full p-2.5 shadow border hover:bg-background transition-colors"
                title="Kompas activeren"
              >
                <Compass className="h-5 w-5 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Bottom bar */}
          <div className="px-4 py-3 border-t bg-background shrink-0">
            {actionButtons}
          </div>
        </div>

        <style>{`
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(2.5); opacity: 0; }
          }
        `}</style>
      </>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="relative h-48 w-full rounded-lg overflow-hidden border">
        <div ref={inlineHost} className="absolute inset-0" />
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <Skeleton className="h-full w-full" />
          </div>
        )}

        {mapLoaded && needsGeoPermission && (
          <div className="absolute bottom-2 left-2 right-2">
            <Button onClick={handleRequestPermissions} size="sm" className="w-full gap-2 bg-primary/90 backdrop-blur-sm">
              <Compass className="h-4 w-4" />
              Toon mijn locatie
            </Button>
          </div>
        )}
        {mapLoaded && !needsGeoPermission && needsCompassPermission && (
          <button
            onClick={requestHeadingPermission}
            className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-2 shadow border hover:bg-background transition-colors"
            title="Kompas activeren"
          >
            <Compass className="h-4 w-4 text-muted-foreground" />
          </button>
        )}

        {/* Fullscreen button */}
        {mapLoaded && (
          <button
            onClick={() => setIsFullscreen(true)}
            className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm rounded-md p-1.5 shadow border hover:bg-background transition-colors"
            title="Volledig scherm"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {actionButtons}

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
