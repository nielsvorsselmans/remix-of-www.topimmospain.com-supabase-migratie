import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from './ui/skeleton';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { formatCurrency, translatePropertyType } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  city?: string | null;
  location?: string | null;
  coordinates?: { lat: number; lng: number };
  totalCount: number;
  price_from?: number | null;
  price_to?: number | null;
  propertyTypes: string[];
  featured_image?: string | null;
}

interface ProjectsMapProps {
  projects: Project[];
  basePath?: string;
}

const formatCompactPrice = (price: number): string => {
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `${Math.round(price / 1_000)}K`;
  return `${price}`;
};

const buildPopupContent = (props: any, formatPrice: (p: number) => string, showButton: boolean, basePath: string) => {
  const imageHtml = props.featured_image
    ? `<img src="${props.featured_image}" alt="${props.name}" style="width:calc(100% + 16px);height:110px;object-fit:cover;border-radius:6px 6px 0 0;margin:-8px -8px 8px -8px;" />`
    : '';

  const typesRaw = typeof props.propertyTypes === 'string' ? props.propertyTypes : '';
  const translatedTypes = typesRaw
    .split(',')
    .map((t: string) => t.trim())
    .filter(Boolean)
    .map((t: string) => translatePropertyType(t))
    .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
    .slice(0, 3)
    .join(', ');

  const totalCount = Number(props.totalCount) || 0;

  const buttonHtml = showButton
    ? `<a href="${basePath}/${props.id}" class="map-popup-navigate" style="display:block;text-align:center;margin-top:8px;padding:8px 12px;background:hsl(200,60%,45%);color:#fff;border-radius:6px;text-decoration:none;font-size:13px;font-weight:500;">Bekijk project →</a>`
    : '';

  return `
    <div style="min-width:200px;max-width:240px;font-family:system-ui,sans-serif;">
      ${imageHtml}
      <div style="padding:0;">
        <div style="font-weight:600;font-size:14px;margin-bottom:2px;">${props.name}</div>
        <div style="font-size:12px;color:#888;margin-bottom:6px;">${props.city}${translatedTypes ? ` · ${translatedTypes}` : ''}</div>
        ${totalCount > 0 ? `
        <div style="display:flex;justify-content:space-between;font-size:12px;">
          <span style="color:#666;">Woningen</span>
          <span style="font-weight:500;">${totalCount}</span>
        </div>` : ''}
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:2px;">
          <span style="color:#666;">Prijs</span>
          <span style="font-weight:500;">
            ${props.minPrice > 0
              ? (totalCount <= 1 || props.minPrice === props.maxPrice
                ? `Vanaf ${formatPrice(props.minPrice)}`
                : `${formatPrice(props.minPrice)} – ${formatPrice(props.maxPrice)}`)
              : 'Op aanvraag'
            }
          </span>
        </div>
        ${buttonHtml}
      </div>
    </div>
  `;
};

export const ProjectsMap = ({ projects, basePath = "/project" }: ProjectsMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const hoverPopup = useRef<mapboxgl.Popup | null>(null);
  const { token: mapboxToken } = useMapboxToken();
  const [mapLoaded, setMapLoaded] = useState(false);
  const navigate = useNavigate();
  const isInitialBoundsSet = useRef(false);
  const isTouchDevice = useRef(false);
  const delegationHandler = useRef<((e: MouseEvent) => void) | null>(null);

  // Detect touch device
  useEffect(() => {
    isTouchDevice.current = window.matchMedia('(pointer: coarse)').matches;
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || map.current) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-0.9, 37.8],
      zoom: 9,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      setMapLoaded(false);
    };
  }, [mapboxToken]);

  // Add clustering for projects
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const projectsWithCoords = projects.filter(
      p => p.coordinates?.lat && p.coordinates?.lng
    );

    if (projectsWithCoords.length === 0) return;

    const formatPrice = (price: number) => formatCurrency(price, 0);

    // Create GeoJSON data for projects
    const geojsonData: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: projectsWithCoords.map((project) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [project.coordinates!.lng, project.coordinates!.lat]
        },
        properties: {
          id: project.id,
          name: project.name,
          city: project.city || project.location || 'Spanje',
          totalCount: project.totalCount,
          minPrice: project.price_from ? Number(project.price_from) : 0,
          maxPrice: project.price_to ? Number(project.price_to) : 0,
          propertyTypes: project.propertyTypes.join(', '),
          featured_image: project.featured_image || '',
          priceLabel: project.price_from ? formatCompactPrice(Number(project.price_from)) : ''
        }
      }))
    };

    // Update existing source data if it exists, otherwise create new source
    if (map.current.getSource('projects')) {
      const source = map.current.getSource('projects') as mapboxgl.GeoJSONSource;
      source.setData(geojsonData);
    } else {
      // Add source with clustering
      map.current.addSource('projects', {
        type: 'geojson',
        data: geojsonData,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50
      });

      // Add cluster circle layer
      map.current.addLayer({
        id: 'project-clusters',
        type: 'circle',
        source: 'projects',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            'hsl(200, 60%, 45%)',
            5,
            'hsl(200, 70%, 40%)',
            10,
            'hsl(200, 80%, 35%)'
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20,
            5,
            25,
            10,
            30
          ],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#fff'
        }
      });

      // Add cluster count layer
      map.current.addLayer({
        id: 'project-cluster-count',
        type: 'symbol',
        source: 'projects',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 14
        },
        paint: {
          'text-color': '#ffffff'
        }
      });

      // Add unclustered point layer — larger radius for price label
      map.current.addLayer({
        id: 'project-unclustered-point',
        type: 'circle',
        source: 'projects',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': 'hsl(200, 60%, 45%)',
          'circle-radius': 22,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#fff'
        }
      });

      // Add price label layer inside unclustered markers
      map.current.addLayer({
        id: 'project-price-label',
        type: 'symbol',
        source: 'projects',
        filter: ['!', ['has', 'point_count']],
        layout: {
          'text-field': ['get', 'priceLabel'],
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 10,
          'text-allow-overlap': true,
          'text-ignore-placement': true
        },
        paint: {
          'text-color': '#ffffff'
        }
      });

      // Click handler for clusters
      map.current.on('click', 'project-clusters', (e) => {
        const features = map.current!.queryRenderedFeatures(e.point, {
          layers: ['project-clusters']
        });
        
        const clusterId = features[0].properties?.cluster_id;
        const source = map.current!.getSource('projects') as mapboxgl.GeoJSONSource;
        
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return;
          
          const coordinates = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
          map.current!.easeTo({
            center: coordinates,
            zoom: zoom
          });
        });
      });

      // Click handler for unclustered points — touch vs desktop
      map.current.on('click', 'project-unclustered-point', (e) => {
        const props = e.features![0].properties!;
        const coordinates = (e.features![0].geometry as GeoJSON.Point).coordinates.slice() as [number, number];

        if (isTouchDevice.current) {
          // Touch: show popup with "Bekijk project" button
          hoverPopup.current?.remove();

          const popupContent = buildPopupContent(props, formatPrice, true, basePath);

          hoverPopup.current = new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: true,
            offset: 15,
            className: 'map-hover-popup'
          })
            .setLngLat(coordinates)
            .setHTML(popupContent)
            .addTo(map.current!);
        } else {
          // Desktop: direct navigation
          hoverPopup.current?.remove();
          navigate(`${basePath}/${props.id}`);
        }
      });

      // Event delegation for popup "Bekijk project" button
      const mapEl = map.current.getContainer();
      delegationHandler.current = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const link = target.closest('.map-popup-navigate') as HTMLAnchorElement | null;
        if (link) {
          e.preventDefault();
          const href = link.getAttribute('href');
          if (href) {
            hoverPopup.current?.remove();
            navigate(href);
          }
        }
      };
      mapEl.addEventListener('click', delegationHandler.current);

      // Hover popup for desktop (unclustered points)
      map.current.on('mouseenter', 'project-unclustered-point', (e) => {
        if (isTouchDevice.current) return; // Skip hover on touch
        map.current!.getCanvas().style.cursor = 'pointer';
        
        const coordinates = (e.features![0].geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        const props = e.features![0].properties!;

        const popupContent = buildPopupContent(props, formatPrice, false, basePath);

        hoverPopup.current = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 15,
          className: 'map-hover-popup'
        })
          .setLngLat(coordinates)
          .setHTML(popupContent)
          .addTo(map.current!);
      });

      map.current.on('mouseleave', 'project-unclustered-point', () => {
        if (isTouchDevice.current) return;
        map.current!.getCanvas().style.cursor = '';
        hoverPopup.current?.remove();
        hoverPopup.current = null;
      });

      // Cursor on hover for clusters
      map.current.on('mouseenter', 'project-clusters', () => {
        map.current!.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseleave', 'project-clusters', () => {
        map.current!.getCanvas().style.cursor = '';
      });
    }

    // Fit bounds to all projects (only on first load)
    if (!isInitialBoundsSet.current && projectsWithCoords.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      projectsWithCoords.forEach(project => {
        bounds.extend([project.coordinates!.lng, project.coordinates!.lat]);
      });
      
      map.current.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 12
      });
      
      isInitialBoundsSet.current = true;
    }

  }, [projects, mapLoaded, navigate, basePath]);

  // Cleanup delegation handler
  useEffect(() => {
    return () => {
      if (delegationHandler.current && map.current) {
        map.current.getContainer().removeEventListener('click', delegationHandler.current);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-[500px] rounded-lg overflow-hidden shadow-elegant">
      {!mapLoaded && (
        <Skeleton className="absolute inset-0 w-full h-full z-10" />
      )}
      <div 
        ref={mapContainer} 
        className="w-full h-full"
        style={{ opacity: mapLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
      />
    </div>
  );
};
