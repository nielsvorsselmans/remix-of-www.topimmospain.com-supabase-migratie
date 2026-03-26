import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCustomer } from "@/hooks/useEffectiveCustomer";

export interface ScheduledViewing {
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
}

export interface CustomerTrip {
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
  scheduled_viewings: ScheduledViewing[];
  created_at: string | null;
  updated_at: string | null;
}

export function useCustomerTrips() {
  const { crmLeadId, isLoading: isLoadingCustomer } = useEffectiveCustomer();

  const query = useQuery({
    queryKey: ["customer-trips", crmLeadId],
    queryFn: async () => {
      if (!crmLeadId) return [];

      // Fetch trips for this CRM lead directly
      const { data: trips, error: tripsError } = await supabase
        .from("customer_viewing_trips")
        .select("*")
        .eq("crm_lead_id", crmLeadId)
        .order("trip_start_date", { ascending: true });

      if (tripsError) {
        console.error("Error fetching trips:", tripsError);
        return [];
      }

      // Parse scheduled_viewings JSON for each trip
      return (trips || []).map(trip => ({
        ...trip,
        scheduled_viewings: Array.isArray(trip.scheduled_viewings) 
          ? (trip.scheduled_viewings as unknown as ScheduledViewing[])
          : []
      })) as CustomerTrip[];
    },
    enabled: !!crmLeadId && !isLoadingCustomer,
  });

  return {
    ...query,
    isLoading: query.isLoading || isLoadingCustomer,
  };
}
