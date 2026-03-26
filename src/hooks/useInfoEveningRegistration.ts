import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface InfoEveningEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  doors_open_time: string | null;
  presentation_start_time: string | null;
  presentation_end_time: string | null;
  location_name: string;
  location_address: string;
  current_registrations: number | null;
  max_capacity: number | null;
}

interface InfoEveningRegistration {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  number_of_persons: number | null;
  confirmed: boolean | null;
  created_at: string;
  event: InfoEveningEvent;
}

export function useInfoEveningRegistration() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["info-evening-registration", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get registration for current user with active future event
      const { data, error } = await supabase
        .from("info_evening_registrations")
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          number_of_persons,
          confirmed,
          created_at,
          event:info_evening_events!inner (
            id,
            title,
            date,
            time,
            doors_open_time,
            presentation_start_time,
            presentation_end_time,
            location_name,
            location_address,
            current_registrations,
            max_capacity
          )
        `)
        .eq("user_id", user.id)
        .gte("info_evening_events.date", new Date().toISOString().split("T")[0])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching info evening registration:", error);
        throw error;
      }

      if (!data) return null;

      // Transform the response to match our interface
      const eventData = data.event as unknown as InfoEveningEvent;
      
      return {
        id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        number_of_persons: data.number_of_persons,
        confirmed: data.confirmed,
        created_at: data.created_at,
        event: eventData,
      } as InfoEveningRegistration;
    },
    enabled: !!user?.id,
  });
}
