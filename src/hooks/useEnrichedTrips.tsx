import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCustomer } from "@/hooks/useEffectiveCustomer";
import { parseGoogleMapsUrl } from "@/lib/parseGoogleMapsUrl";
import { calculateEffectivePriceRange } from "@/lib/utils";

export interface ProjectDocument {
  id: string;
  title: string;
  document_type: string;
  file_url: string;
  file_name: string;
  visibility_phase?: string;
}

// Phase hierarchy: selection < viewing < purchase
const PHASE_HIERARCHY: Record<string, number> = {
  'orientation': 0,
  'selection': 1,
  'viewing': 2,
  'purchase': 3,
  'all': 0, // 'all' is always visible
};

function isDocumentVisibleForPhase(docPhase: string | undefined, userPhase: string): boolean {
  if (!docPhase || docPhase === 'all') return true;
  const docLevel = PHASE_HIERARCHY[docPhase] ?? 1;
  const userLevel = PHASE_HIERARCHY[userPhase] ?? 1;
  return userLevel >= docLevel;
}

export interface NearbyAmenity {
  name: string;
  distance_meters: number;
  latitude?: number | null;
  longitude?: number | null;
  google_place_id?: string;
}

/** Check if location_intelligence has amenities with valid coordinates */
export function hasAmenityCoordinates(
  locationIntelligence: Record<string, NearbyAmenity[]> | undefined
): boolean {
  if (!locationIntelligence) return false;
  return Object.values(locationIntelligence).some((items) =>
    items.some(
      (item) =>
        item.latitude !== null &&
        item.latitude !== undefined &&
        item.longitude !== null &&
        item.longitude !== undefined
    )
  );
}

export interface EnrichedViewing {
  id: string;
  project_id: string;
  project_name: string;
  date: string;
  time: string;
  showhouse_address?: string;
  showhouse_maps_url?: string;
  showhouse_notes?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  notes?: string;
  // Enriched data
  project_featured_image?: string;
  project_latitude?: number;
  project_longitude?: number;
  showhouse_latitude?: number;
  showhouse_longitude?: number;
  project_description?: string;
  project_city?: string;
  project_region?: string;
  price_from?: number;
  price_to?: number;
  location_intelligence?: Record<string, NearbyAmenity[]>;
  min_bedrooms?: number;
  max_bedrooms?: number;
  min_area?: number;
  max_area?: number;
  has_private_pool?: boolean;
  has_communal_pool?: boolean;
  property_types?: string[];
  documents: ProjectDocument[];
}

export interface EnrichedTrip {
  id: string;
  crm_lead_id: string;
  trip_start_date: string;
  trip_end_date: string;
  arrival_time: string | null;
  departure_time: string | null;
  airport: string | null;
  flight_info: string | null;
  accommodation_info: string | null;
  status: string | null;
  customer_notes: string | null;
  admin_notes: string | null;
  scheduled_viewings: EnrichedViewing[];
  created_at: string | null;
  updated_at: string | null;
}

export function useEnrichedTrips() {
  const { crmLeadId, isLoading: isLoadingCustomer } = useEffectiveCustomer();

  const query = useQuery({
    queryKey: ["enriched-customer-trips", crmLeadId],
    queryFn: async () => {
      if (!crmLeadId) return [];

      // Get journey phase for this CRM lead
      const { data: crmLead, error: crmError } = await supabase
        .from("crm_leads")
        .select("journey_phase")
        .eq("id", crmLeadId)
        .maybeSingle();

      const journeyPhase = crmLead?.journey_phase || 'selection';

      if (crmError) {
        console.log("Error fetching CRM lead:", crmError);
        return [];
      }

      // Fetch trips for this CRM lead
      const { data: trips, error: tripsError } = await supabase
        .from("customer_viewing_trips")
        .select("*")
        .eq("crm_lead_id", crmLeadId)
        .order("trip_start_date", { ascending: true });

      if (tripsError) {
        console.error("Error fetching trips:", tripsError);
        return [];
      }

      // Collect all project IDs from viewings
      const allProjectIds = new Set<string>();
      trips?.forEach(trip => {
        const viewings = Array.isArray(trip.scheduled_viewings) 
          ? trip.scheduled_viewings 
          : [];
        viewings.forEach((v: any) => {
          if (v.project_id) allProjectIds.add(v.project_id);
        });
      });

      // Fetch project data for all projects
      const projectIds = Array.from(allProjectIds);
      let projectsMap: Record<string, any> = {};
      let documentsMap: Record<string, ProjectDocument[]> = {};

      if (projectIds.length > 0) {
        // Fetch projects with coordinates and images
        const { data: projects } = await supabase
          .from("projects")
          .select("id, name, featured_image, latitude, longitude, showhouse_latitude, showhouse_longitude, ai_rewritten_description, city, region, price_from, price_to, location_intelligence, properties(price, status)")
          .in("id", projectIds);

        if (projects) {
          projects.forEach(p => {
            projectsMap[p.id] = p;
          });
        }

        // Fetch documents for all projects with visibility_phase
        const { data: documents } = await supabase
          .from("project_documents")
          .select("id, project_id, title, document_type, file_url, file_name, visibility_phase")
          .in("project_id", projectIds)
          .eq("visible_portal", true)
          .order("document_type");

        if (documents) {
          documents.forEach(doc => {
            // Filter documents based on user's journey phase
            if (!isDocumentVisibleForPhase(doc.visibility_phase, journeyPhase)) {
              return;
            }
            
            if (!documentsMap[doc.project_id]) {
              documentsMap[doc.project_id] = [];
            }
            documentsMap[doc.project_id].push({
              id: doc.id,
              title: doc.title,
              document_type: doc.document_type,
              file_url: doc.file_url,
              file_name: doc.file_name,
              visibility_phase: doc.visibility_phase
            });
          });
        }
      }

      // Enrich trips with project data
      return (trips || []).map(trip => {
        const rawViewings = Array.isArray(trip.scheduled_viewings) 
          ? trip.scheduled_viewings 
          : [];

        const enrichedViewings: EnrichedViewing[] = rawViewings.map((viewing: any) => {
          const project = projectsMap[viewing.project_id] || {};
          const docs = documentsMap[viewing.project_id] || [];

          // Parse showhouse coordinates from Google Maps URL (priority over project-level)
          const parsedShowhouseCoords = viewing.showhouse_maps_url 
            ? parseGoogleMapsUrl(viewing.showhouse_maps_url) 
            : null;

          const { priceFrom, priceTo } = calculateEffectivePriceRange(
            project.price_from,
            project.price_to,
            project.properties || []
          );

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
            price_from: priceFrom,
            price_to: priceTo,
            location_intelligence: (project.location_intelligence as any)?.nearbyAmenities || undefined,
            documents: docs
          };
        });

        return {
          ...trip,
          scheduled_viewings: enrichedViewings
        };
      }) as EnrichedTrip[];
    },
    enabled: !!crmLeadId && !isLoadingCustomer,
  });

  return {
    ...query,
    isLoading: query.isLoading || isLoadingCustomer,
  };
}
