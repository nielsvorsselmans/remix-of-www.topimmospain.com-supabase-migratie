import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { useMapboxToken } from '@/hooks/useMapboxToken';

interface Region {
  name: string;
  coordinates: [number, number];
  description: string;
  highlights: string[];
  color: string;
}

const regions: Region[] = [
  {
    name: "Costa Cálida",
    coordinates: [-0.9854, 37.6256],
    description: "De 'Warme Kust' met meer dan 300 dagen zon per jaar",
    highlights: [
      "300+ dagen zon per jaar",
      "Kristalheldere stranden",
      "Uitstekende vliegverbindingen"
    ],
    color: "#F97316"
  },
  {
    name: "Murcia Stad",
    coordinates: [-1.1307, 37.9922],
    description: "Hoofdstad met rijke geschiedenis en moderne voorzieningen",
    highlights: [
      "Historisch centrum",
      "Universiteitsstad",
      "30 minuten van de kust"
    ],
    color: "#8B5CF6"
  },
  {
    name: "Los Alcázares",
    coordinates: [-0.8431, 37.7461],
    description: "Charmant kustplaatsje aan de Mar Menor",
    highlights: [
      "Rustige boulevard",
      "Warmste water van Europa",
      "Authentiek Spaans karakter"
    ],
    color: "#06B6D4"
  },
  {
    name: "Costa Blanca Zuid",
    coordinates: [-0.7071, 37.9072],
    description: "Populaire badplaatsen met grote internationale gemeenschap",
    highlights: [
      "Grote expat-gemeenschap",
      "Diverse stranden",
      "Vliegveld Alicante dichtbij"
    ],
    color: "#10B981"
  }
];

export const InteractiveRegionMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const { token: mapboxToken } = useMapboxToken();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    const initMap = () => {
      try {
        mapboxgl.accessToken = mapboxToken;

        // Initialize map centered on Murcia region
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/light-v11',
          center: [-0.9854, 37.8],
          zoom: 9,
          pitch: 45,
        });

        // Add navigation controls
        map.current.addControl(
          new mapboxgl.NavigationControl({
            visualizePitch: true,
          }),
          'top-right'
        );

        map.current.on('load', () => {
          setIsLoading(false);

          // Add markers for each region
          regions.forEach((region) => {
            if (!map.current) return;

            // Create custom marker element
            const el = document.createElement('div');
            el.className = 'custom-marker';
            el.style.width = '40px';
            el.style.height = '40px';
            el.style.borderRadius = '50%';
            el.style.backgroundColor = region.color;
            el.style.border = '3px solid white';
            el.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
            el.style.cursor = 'pointer';
            el.style.transition = 'transform 0.2s';
            
            // Add hover effect
            el.addEventListener('mouseenter', () => {
              el.style.transform = 'scale(1.2)';
            });
            el.addEventListener('mouseleave', () => {
              el.style.transform = 'scale(1)';
            });

            // Create popup content
            const popupContent = `
              <div style="padding: 12px; min-width: 250px;">
                <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 8px; color: ${region.color};">
                  ${region.name}
                </h3>
                <p style="color: #666; margin-bottom: 12px; font-size: 14px;">
                  ${region.description}
                </p>
                <ul style="list-style: none; padding: 0; margin: 0;">
                  ${region.highlights.map(h => `
                    <li style="color: #333; margin-bottom: 4px; font-size: 13px; padding-left: 16px; position: relative;">
                      <span style="position: absolute; left: 0; color: ${region.color};">•</span>
                      ${h}
                    </li>
                  `).join('')}
                </ul>
              </div>
            `;

            // Create popup
            const popup = new mapboxgl.Popup({
              offset: 25,
              closeButton: true,
              closeOnClick: false,
              maxWidth: '300px'
            }).setHTML(popupContent);

            // Add marker to map
            const marker = new mapboxgl.Marker(el)
              .setLngLat(region.coordinates)
              .setPopup(popup)
              .addTo(map.current);

            // Show popup on click
            el.addEventListener('click', () => {
              marker.togglePopup();
            });
          });
        });

      } catch (err) {
        console.error('Error initializing map:', err);
        setError(err instanceof Error ? err.message : 'Failed to load map');
        setIsLoading(false);
      }
    };

    initMap();

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken]);

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-destructive">Fout bij het laden van de kaart: {error}</p>
        <p className="text-sm text-muted-foreground mt-2">
          Controleer of de Mapbox token correct is geconfigureerd.
        </p>
      </Card>
    );
  }

  return (
    <div className="relative w-full h-[600px] rounded-2xl overflow-hidden border border-border shadow-lg">
      {isLoading && (
        <Skeleton className="absolute inset-0 w-full h-full z-10" />
      )}
      <div 
        ref={mapContainer} 
        className="absolute inset-0"
        style={{ opacity: isLoading ? 0 : 1, transition: 'opacity 0.3s' }}
      />
      <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur p-4 rounded-lg border border-border shadow-lg max-w-xs">
        <h4 className="font-bold text-foreground mb-2 text-sm">Interactieve Kaart</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Klik op de gekleurde markers om meer informatie over elke regio te bekijken
        </p>
        <div className="grid grid-cols-2 gap-2">
          {regions.map((region, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full border border-white" 
                style={{ backgroundColor: region.color }}
              />
              <span className="text-xs text-foreground">{region.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
