import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Skeleton } from './ui/skeleton';
import { useMapboxToken } from '@/hooks/useMapboxToken';

interface PropertyMapProps {
  latitude: number;
  longitude: number;
  title: string;
}

export function PropertyMap({ latitude, longitude, title }: PropertyMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const { token: mapboxToken } = useMapboxToken();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current || !latitude || !longitude || !mapboxToken) return;

    const initMap = () => {
      try {
        // Initialize map with cached token
        mapboxgl.accessToken = mapboxToken;
        
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [longitude, latitude],
          zoom: 13,
        });

        // Add navigation controls
        map.current.addControl(
          new mapboxgl.NavigationControl({
            visualizePitch: false,
          }),
          'top-right'
        );

        // Add marker for property location
        new mapboxgl.Marker({ color: '#E94D35' })
          .setLngLat([longitude, latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 })
              .setHTML(`<h3 class="font-semibold">${title}</h3>`)
          )
          .addTo(map.current);

        map.current.on('load', () => {
          setLoading(false);
        });

      } catch (err) {
        console.error('Error initializing map:', err);
        setError('Kaart kon niet worden geladen');
        setLoading(false);
      }
    };

    initMap();

    // Cleanup
    return () => {
      map.current?.remove();
    };
  }, [latitude, longitude, title, mapboxToken]);

  if (error) {
    return (
      <div className="w-full h-[400px] bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {loading && (
        <Skeleton className="absolute inset-0 w-full h-[400px] rounded-lg z-10" />
      )}
      <div 
        ref={mapContainer} 
        className="w-full h-[400px] rounded-lg shadow-elegant"
        style={{ opacity: loading ? 0 : 1, transition: 'opacity 0.3s' }}
      />
    </div>
  );
}
