import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2 } from "lucide-react";
import { useMapboxToken } from "@/hooks/useMapboxToken";

interface LocationMapProps {
  coordinates: { lat: number; lng: number } | null;
  projectName: string;
  location: string;
}

export function LocationMap({ coordinates, projectName, location }: LocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const { token: mapboxToken, loading: tokenLoading, error: tokenError } = useMapboxToken();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for token to load
    if (!mapContainer.current || !coordinates || !mapboxToken) return;

    // Reset error state when retrying
    setError(null);
    
    mapboxgl.accessToken = mapboxToken;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/satellite-streets-v12",
        center: [coordinates.lng, coordinates.lat],
        zoom: 14,
        attributionControl: false,
      });

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        "top-right"
      );

      // Add marker for project location
      const markerEl = document.createElement("div");
      markerEl.className = "project-marker";
      markerEl.innerHTML = `
        <div class="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg border-2 border-white">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>
      `;

      new mapboxgl.Marker(markerEl)
        .setLngLat([coordinates.lng, coordinates.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div class="p-2">
              <strong class="block text-sm">${projectName}</strong>
              <span class="text-xs text-gray-600">${location}</span>
            </div>
          `)
        )
        .addTo(map.current);

      map.current.on("load", () => {
        setIsLoading(false);
      });

      map.current.on("error", () => {
        setError("Kaart kon niet worden geladen");
        setIsLoading(false);
      });
    } catch (err) {
      console.error("Map initialization error:", err);
      setError("Kaart niet beschikbaar");
      setIsLoading(false);
    }

    return () => {
      map.current?.remove();
    };
  }, [coordinates, projectName, location, mapboxToken]);

  // Handle token error
  useEffect(() => {
    if (tokenError) {
      setError("Kaart niet beschikbaar");
      setIsLoading(false);
    }
  }, [tokenError]);

  // Fallback when no coordinates
  if (!coordinates) {
    return (
      <Card className="border-0 shadow-lg overflow-hidden h-full">
        <div className="w-full h-full bg-muted relative flex items-center justify-center">
          <div className="text-center p-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <MapPin className="h-10 w-10 text-primary" />
            </div>
            <p className="text-muted-foreground font-medium mb-2">
              Locatie in {location}
            </p>
            <p className="text-sm text-muted-foreground">
              Exacte coördinaten worden geladen
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg overflow-hidden h-full relative">
      {(isLoading || tokenLoading) && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center z-10">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Kaart laden...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center z-10">
          <div className="text-center p-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <MapPin className="h-10 w-10 text-primary" />
            </div>
            <p className="text-muted-foreground font-medium mb-2">{error}</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                const url = `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`;
                window.open(url, "_blank");
              }}
            >
              Bekijk in Google Maps
            </Button>
          </div>
        </div>
      )}
      
      <div ref={mapContainer} className="w-full h-full min-h-[400px]" />
    </Card>
  );
}
