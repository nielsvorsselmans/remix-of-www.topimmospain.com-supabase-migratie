import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin } from 'lucide-react';
import { useMapboxToken } from '@/hooks/useMapboxToken';

interface Comparable {
  id: string;
  name: string;
  cover_photo_url?: string | null;
  amenities?: string[];
  bedrooms: number;
  bathrooms: number;
  guests: number;
  revenue: {
    monthly_avg: number;
    annual: number;
    currency: string;
  };
  occupancy: {
    rate: number;
  };
  pricing: {
    avg_nightly_rate: number;
  };
  location: {
    city: string;
    distance_km: number;
    latitude: number | null;
    longitude: number | null;
  };
}

// Amenity icon mapping for popups
const amenityIcons: Record<string, string> = {
  wifi: '📶',
  pool: '🏊',
  kitchen: '🍳',
  air_conditioning: '❄️',
  parking: '🅿️',
  gym: '💪',
  tv: '📺',
  heating: '🔥',
  washer: '🧺',
  dryer: '👕',
};

interface ComparablesMapProps {
  comparables: Comparable[];
  centerLat: number;
  centerLng: number;
  currency: string;
}

export function ComparablesMap({ comparables, centerLat, centerLng, currency }: ComparablesMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const { token: mapboxToken } = useMapboxToken();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 2: Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || map.current) return;

    console.log('[ComparablesMap] Initializing map...');
    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [centerLng, centerLat],
      zoom: 11,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    map.current.on('load', () => {
      console.log('[ComparablesMap] Map loaded successfully');
      setMapLoaded(true);
    });

    map.current.on('error', (e) => {
      console.error('[ComparablesMap] Mapbox error:', e);
      setError('Kaart kon niet laden');
    });

    return () => {
      console.log('[ComparablesMap] Cleaning up map');
      map.current?.remove();
      map.current = null;
      setMapLoaded(false);
    };
  }, [mapboxToken, centerLat, centerLng]);

  // Step 3: Add markers when map is loaded
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    console.log('[ComparablesMap] Adding markers...');

    // Filter valid comparables
    const validComparables = comparables.filter(
      (comp) => comp.location.latitude !== null && comp.location.longitude !== null
    );

    console.log('[ComparablesMap] Valid comparables:', {
      total: comparables.length,
      valid: validComparables.length,
    });

    if (validComparables.length === 0) {
      setError('Geen vergelijkbare woningen met locatiegegevens');
      return;
    }

    // Add project marker (orange, larger)
    const centerMarkerEl = document.createElement('div');
    centerMarkerEl.className = 'w-8 h-8 bg-primary rounded-full border-4 border-background shadow-lg flex items-center justify-center animate-pulse';
    centerMarkerEl.innerHTML = '<div class="w-3 h-3 bg-background rounded-full"></div>';

    new mapboxgl.Marker({ element: centerMarkerEl })
      .setLngLat([centerLng, centerLat])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div class="p-2">
            <h3 class="font-semibold text-sm">Uw project</h3>
            <p class="text-xs text-muted-foreground">Locatie van het project</p>
          </div>
        `)
      )
      .addTo(map.current);

    console.log('[ComparablesMap] Project marker added');

    // Add comparable markers (blue, smaller)
    let markersAdded = 0;
    validComparables.forEach((comp) => {
      const { latitude, longitude } = comp.location;
      if (latitude === null || longitude === null) return;

      const el = document.createElement('div');
      el.className = 'w-10 h-10 bg-accent/90 rounded-full border-2 border-primary shadow-lg flex items-center justify-center cursor-pointer transition-transform hover:scale-110';
      el.innerHTML = `<span class="text-xs font-bold text-primary">${comp.occupancy.rate}%</span>`;

      const currencySymbol = currency === 'EUR' ? '€' : currency;
      
      // Build amenities HTML (max 5)
      const amenitiesHtml = (comp.amenities || [])
        .slice(0, 5)
        .map(a => {
          const icon = amenityIcons[a.toLowerCase()] || '✓';
          return `<span class="inline-flex items-center gap-0.5 bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">${icon}</span>`;
        })
        .join('');
      
      // Build photo HTML
      const photoHtml = comp.cover_photo_url 
        ? `<img src="${comp.cover_photo_url}" alt="${comp.name}" class="w-full h-24 object-cover rounded-t" onerror="this.style.display='none'" />`
        : '';
      
      const popupContent = `
        <div class="min-w-[250px] overflow-hidden">
          ${photoHtml}
          <div class="p-3">
            <h3 class="font-semibold text-sm mb-2 text-foreground line-clamp-2">${comp.name}</h3>
            <div class="space-y-2 text-xs">
              <div class="flex justify-between items-center">
                <span class="text-muted-foreground">Locatie:</span>
                <span class="font-medium text-foreground">${comp.location.city}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-muted-foreground">Afstand:</span>
                <span class="font-medium text-foreground">${comp.location.distance_km.toFixed(1)} km</span>
              </div>
              <div class="h-px bg-border my-2"></div>
              <div class="flex justify-between items-center">
                <span class="text-muted-foreground">Bezetting:</span>
                <span class="font-bold text-primary text-sm">${comp.occupancy.rate}%</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-muted-foreground">Per nacht:</span>
                <span class="font-semibold text-foreground">${currencySymbol}${comp.pricing.avg_nightly_rate}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-muted-foreground">Per maand:</span>
                <span class="font-semibold text-foreground">${currencySymbol}${comp.revenue.monthly_avg.toLocaleString()}</span>
              </div>
              <div class="h-px bg-border my-2"></div>
              <div class="flex gap-3 text-xs">
                <div class="flex items-center gap-1">
                  <span>🛏️</span>
                  <span class="font-medium">${comp.bedrooms}</span>
                </div>
                <div class="flex items-center gap-1">
                  <span>🚿</span>
                  <span class="font-medium">${comp.bathrooms}</span>
                </div>
                <div class="flex items-center gap-1">
                  <span>👥</span>
                  <span class="font-medium">${comp.guests}</span>
                </div>
              </div>
              ${amenitiesHtml ? `<div class="flex flex-wrap gap-1 mt-2">${amenitiesHtml}</div>` : ''}
            </div>
          </div>
        </div>
      `;

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([longitude, latitude])
        .setPopup(
          new mapboxgl.Popup({
            offset: 25,
            maxWidth: '300px',
          }).setHTML(popupContent)
        )
        .addTo(map.current!);

      markersAdded++;
    });

    console.log('[ComparablesMap] Markers added:', markersAdded);

    // Fit bounds to show all markers
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([centerLng, centerLat]);
    validComparables.forEach((comp) => {
      if (comp.location.latitude && comp.location.longitude) {
        bounds.extend([comp.location.longitude, comp.location.latitude]);
      }
    });

    map.current.fitBounds(bounds, {
      padding: { top: 50, bottom: 50, left: 50, right: 50 },
      maxZoom: 13,
    });

    console.log('[ComparablesMap] Bounds fitted');
  }, [mapLoaded, comparables, centerLat, centerLng, currency]);

  return (
    <Card className="shadow-elegant overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          Locaties Vergelijkbare Woningen
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Klik op de markers om details te zien. Het grote punt is uw project, de kleinere markers zijn vergelijkbare woningen.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {error && (
          <div className="bg-destructive/10 rounded-lg p-4 text-center mb-4">
            <p className="text-destructive mb-1">{error}</p>
            <p className="text-sm text-muted-foreground">
              De vergelijkbare woningen zijn wel zichtbaar in de tabel hieronder.
            </p>
          </div>
        )}
        <div className="relative w-full h-[500px]">
          {!mapLoaded && (
            <Skeleton className="absolute inset-0 w-full h-full rounded-lg" />
          )}
          <div
            ref={mapContainer}
            className="w-full h-full"
            style={{ opacity: mapLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
