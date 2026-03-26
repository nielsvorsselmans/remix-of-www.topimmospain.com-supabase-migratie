import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseGoogleMapsUrl } from "@/lib/parseGoogleMapsUrl";
import { cacheTripData, getCachedTripData } from "@/lib/companionOfflineStorage";
import type { KlantTrip } from "@/hooks/useKlant";
import type { EnrichedTrip, EnrichedViewing, ProjectDocument } from "@/hooks/useEnrichedTrips";

/**
 * Hook to enrich a single trip with project data for admin preview.
 * Falls back to IndexedDB cache when offline.
 */
export function useEnrichedTripForAdmin(
  trip: KlantTrip | null,
  crmLeadId: string | undefined,
  journeyPhase: string = 'selection'
) {
  return useQuery({
    queryKey: ["enriched-trip-admin", trip?.id, journeyPhase],
    queryFn: async (): Promise<EnrichedTrip | null> => {
      if (!trip || !crmLeadId) return null;

      try {
        const result = await fetchAndEnrichTrip(trip, crmLeadId, journeyPhase);
        // Cache in background for offline use
        if (result) {
          cacheTripData(trip.id, result).catch(() => {});
        }
        return result;
      } catch (err) {
        // Network error → try IndexedDB fallback
        console.warn("[useEnrichedTripForAdmin] Network failed, trying offline cache", err);
        const cached = await getCachedTripData(trip.id);
        if (cached) {
          console.info("[useEnrichedTripForAdmin] Using cached data for trip", trip.id);
          return cached as EnrichedTrip;
        }
        throw err;
      }
    },
    enabled: !!trip && !!crmLeadId,
  });
}

async function fetchAndEnrichTrip(
  trip: KlantTrip,
  crmLeadId: string,
  journeyPhase: string
): Promise<EnrichedTrip> {
  // Parse scheduled viewings
  const rawViewings = Array.isArray(trip.scheduled_viewings) 
    ? trip.scheduled_viewings 
    : [];

  // Collect all project IDs
  const projectIds = [...new Set(rawViewings.map((v: any) => v.project_id).filter(Boolean))];

  let projectsMap: Record<string, any> = {};
  let documentsMap: Record<string, ProjectDocument[]> = {};

  if (projectIds.length > 0) {
    // Fetch projects with coordinates and images
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, featured_image, latitude, longitude, showhouse_latitude, showhouse_longitude, ai_rewritten_description, city, region, price_from, price_to, location_intelligence, min_bedrooms, max_bedrooms, min_area, max_area, has_private_pool, has_communal_pool, property_types")
      .in("id", projectIds);

    if (projects) {
      projects.forEach(p => {
        projectsMap[p.id] = p;
      });
    }

    // Phase hierarchy for document filtering
    const PHASE_HIERARCHY: Record<string, number> = {
      'orientation': 0,
      'orientatie': 0,
      'selection': 1,
      'selectie': 1,
      'viewing': 2,
      'bezichtiging': 2,
      'purchase': 3,
      'aankoop': 3,
      'all': 0,
    };

    // Fetch all portal-visible documents
    const { data: documents } = await supabase
      .from("project_documents")
      .select("id, project_id, title, document_type, file_url, file_name, visibility_phase")
      .in("project_id", projectIds)
      .eq("visible_portal", true)
      .order("document_type");

    if (documents) {
      documents.forEach(doc => {
        if (!documentsMap[doc.project_id]) {
          documentsMap[doc.project_id] = [];
        }
        documentsMap[doc.project_id].push({
          id: doc.id,
          title: doc.title,
          document_type: doc.document_type,
          file_url: doc.file_url,
          file_name: doc.file_name,
          visibility_phase: doc.visibility_phase || undefined,
        });
      });
    }
  }

  // Enrich viewings
  const enrichedViewings: EnrichedViewing[] = rawViewings.map((viewing: any) => {
    const project = projectsMap[viewing.project_id] || {};
    const docs = documentsMap[viewing.project_id] || [];

    const parsedShowhouseCoords = viewing.showhouse_maps_url 
      ? parseGoogleMapsUrl(viewing.showhouse_maps_url) 
      : null;

    return {
      ...viewing,
      project_featured_image: project.featured_image,
      project_latitude: project.latitude,
      project_longitude: project.longitude,
      showhouse_latitude: parsedShowhouseCoords?.lat || project.showhouse_latitude,
      showhouse_longitude: parsedShowhouseCoords?.lng || project.showhouse_longitude,
      project_description: project.ai_rewritten_description,
      project_city: project.city,
      project_region: project.region,
      price_from: project.price_from,
      price_to: project.price_to,
      location_intelligence: (project.location_intelligence as any)?.nearbyAmenities || undefined,
      min_bedrooms: project.min_bedrooms,
      max_bedrooms: project.max_bedrooms,
      min_area: project.min_area,
      max_area: project.max_area,
      has_private_pool: project.has_private_pool,
      has_communal_pool: project.has_communal_pool,
      property_types: project.property_types,
      documents: docs
    };
  });

  return {
    id: trip.id,
    crm_lead_id: crmLeadId,
    trip_start_date: trip.trip_start_date,
    trip_end_date: trip.trip_end_date,
    arrival_time: null,
    departure_time: null,
    airport: null,
    flight_info: trip.flight_info,
    accommodation_info: trip.accommodation_info,
    status: trip.status,
    customer_notes: trip.customer_notes,
    admin_notes: trip.admin_notes,
    scheduled_viewings: enrichedViewings,
    created_at: null,
    updated_at: null,
  };
}
