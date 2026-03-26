import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ActiveInfoEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  doors_open_time: string | null;
  presentation_start_time: string | null;
  presentation_end_time: string | null;
  location_name: string;
  location_address: string;
  max_capacity: number;
  current_registrations: number;
  ghl_dropdown_value: string | null;
  active: boolean;
}

export function useActiveInfoEvents() {
  return useQuery({
    queryKey: ['active-info-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('info_evening_events')
        .select('id, title, date, time, doors_open_time, presentation_start_time, presentation_end_time, location_name, location_address, max_capacity, current_registrations, ghl_dropdown_value, active')
        .eq('active', true)
        .order('date', { ascending: true });

      if (error) throw error;
      return (data || []) as ActiveInfoEvent[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

/** Helper: filter to future events only */
export function useFutureInfoEvents() {
  const query = useActiveInfoEvents();
  const today = new Date().toISOString().split('T')[0];
  const futureEvents = query.data?.filter(e => e.date >= today) || [];
  return { ...query, data: futureEvents };
}
