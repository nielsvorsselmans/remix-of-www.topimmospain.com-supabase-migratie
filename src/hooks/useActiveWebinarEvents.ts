import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ActiveWebinarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  duration_minutes: number;
  max_capacity: number;
  current_registrations: number;
}

export function useActiveWebinarEvents() {
  return useQuery({
    queryKey: ['active-webinar-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webinar_events')
        .select('id, title, date, time, duration_minutes, max_capacity, current_registrations')
        .eq('active', true)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) throw error;
      return (data || []) as ActiveWebinarEvent[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

/** Helper: filter to future events only */
export function useFutureWebinarEvents() {
  const query = useActiveWebinarEvents();
  const today = new Date().toISOString().split('T')[0];
  const futureEvents = query.data?.filter(e => e.date >= today) || [];
  return { ...query, data: futureEvents };
}
