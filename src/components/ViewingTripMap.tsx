import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapboxToken } from "@/hooks/useMapboxToken";
import { Skeleton } from "@/components/ui/skeleton";
import type { EnrichedViewing } from "@/hooks/useEnrichedTrips";

interface ViewingTripMapProps {
  viewings: EnrichedViewing[];
}

export function ViewingTripMap({ viewings }: ViewingTripMapProps) {
  const { token, loading: tokenLoading } = useMapboxToken();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Filter viewings with valid coordinates
  const viewingsWithCoords = viewings.filter(v => {
    const lat = v.showhouse_latitude || v.project_latitude;
    const lng = v.showhouse_longitude || v.project_longitude;
    return lat && lng;
  });

  useEffect(() => {
    if (!mapContainer.current || !token || viewingsWithCoords.length === 0) return;

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [-0.7, 37.8], // Default center (Costa Cálida)
      zoom: 9,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      setMapLoaded(true);

      // Add markers for each viewing
      const bounds = new mapboxgl.LngLatBounds();

      viewingsWithCoords.forEach((viewing, index) => {
        const showhouseLat = viewing.showhouse_latitude;
        const showhouseLng = viewing.showhouse_longitude;
        const projectLat = viewing.project_latitude;
        const projectLng = viewing.project_longitude;

        // Primary marker: Showhouse location (where customer goes)
        const primaryLat = showhouseLat || projectLat;
        const primaryLng = showhouseLng || projectLng;

        if (primaryLat && primaryLng) {
          bounds.extend([primaryLng, primaryLat]);

          // Create primary numbered marker (showhouse) - bright colors for satellite view
          const primaryEl = document.createElement("div");
          primaryEl.className = "viewing-marker-primary";
          primaryEl.innerHTML = `
            <div style="
              width: 40px;
              height: 40px;
              background: #22c55e;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: 700;
              font-size: 16px;
              box-shadow: 0 3px 12px rgba(0,0,0,0.4);
              border: 4px solid white;
            ">
              ${index + 1}
            </div>
          `;

          const primaryPopup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="padding: 8px;">
              <strong>${viewing.project_name}</strong>
              <div style="font-size: 11px; color: hsl(var(--primary)); margin-top: 2px; font-weight: 500;">
                🏠 Showhouse / Bezichtiging
              </div>
              <div style="font-size: 12px; color: #666; margin-top: 4px;">
                ${viewing.time} · ${viewing.date}
              </div>
              ${viewing.showhouse_address ? `
                <div style="font-size: 12px; color: #666; margin-top: 2px;">
                  📍 ${viewing.showhouse_address}
                </div>
              ` : ''}
            </div>
          `);

          new mapboxgl.Marker(primaryEl)
            .setLngLat([primaryLng, primaryLat])
            .setPopup(primaryPopup)
            .addTo(map.current!);
        }

        // Secondary marker: Construction site (if different from showhouse)
        const hasShowhouse = showhouseLat && showhouseLng;
        const hasSeparateProject = projectLat && projectLng && hasShowhouse;
        
        if (hasSeparateProject) {
          // Check if locations are actually different (> 100m apart)
          const distance = Math.sqrt(
            Math.pow((showhouseLat! - projectLat!) * 111000, 2) + 
            Math.pow((showhouseLng! - projectLng!) * 85000, 2)
          );
          
          if (distance > 100) {
            bounds.extend([projectLng!, projectLat!]);

            // Create secondary marker (construction site) - orange for visibility on satellite
            const secondaryEl = document.createElement("div");
            secondaryEl.className = "viewing-marker-secondary";
            secondaryEl.innerHTML = `
              <div style="
                width: 32px;
                height: 32px;
                background: #f97316;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 14px;
                box-shadow: 0 3px 10px rgba(0,0,0,0.3);
                border: 3px solid white;
              ">
                🏗️
              </div>
            `;

            const secondaryPopup = new mapboxgl.Popup({ offset: 20 }).setHTML(`
              <div style="padding: 8px;">
                <strong>${viewing.project_name}</strong>
                <div style="font-size: 11px; color: hsl(var(--muted-foreground)); margin-top: 2px; font-weight: 500;">
                  🏗️ Bouwlocatie
                </div>
                <div style="font-size: 12px; color: #666; margin-top: 4px;">
                  Dit is waar het project gebouwd wordt
                </div>
              </div>
            `);

            new mapboxgl.Marker(secondaryEl)
              .setLngLat([projectLng!, projectLat!])
              .setPopup(secondaryPopup)
              .addTo(map.current!);

            // Add dashed line connecting showhouse to construction site
            map.current?.addSource(`line-${index}`, {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    [showhouseLng!, showhouseLat!],
                    [projectLng!, projectLat!]
                  ]
                }
              }
            });

            map.current?.addLayer({
              id: `line-${index}`,
              type: 'line',
              source: `line-${index}`,
              paint: {
                'line-color': '#ffffff',
                'line-width': 3,
                'line-dasharray': [2, 2]
              }
            });
          }
        }
      });

      // Fit map to show all markers
      if (viewingsWithCoords.length > 1) {
        map.current?.fitBounds(bounds, { padding: 60 });
      } else if (viewingsWithCoords.length === 1) {
        const v = viewingsWithCoords[0];
        const lat = v.showhouse_latitude || v.project_latitude;
        const lng = v.showhouse_longitude || v.project_longitude;
        if (lat && lng) {
          map.current?.setCenter([lng, lat]);
          map.current?.setZoom(12);
        }
      }
    });

    return () => {
      map.current?.remove();
    };
  }, [token, viewingsWithCoords.length]);

  if (tokenLoading) {
    return <Skeleton className="h-64 w-full rounded-lg" />;
  }

  if (viewingsWithCoords.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="relative h-64 w-full rounded-lg overflow-hidden border">
        <div ref={mapContainer} className="absolute inset-0" />
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <Skeleton className="h-full w-full" />
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px] font-bold border-2 border-white shadow-sm">1</div>
          <span>Projectlocatie</span>
        </div>
      </div>
    </div>
  );
}
