import { useCustomerTrips } from "@/hooks/useCustomerTrips";
import { useEnrichedTrips } from "@/hooks/useEnrichedTrips";
import { useEffectiveCustomer } from "@/hooks/useEffectiveCustomer";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BEZICHTIGING_TEMPLATES } from "@/hooks/journeyChecklistTemplates";
import { parseISO, differenceInDays, startOfDay, isFuture } from "date-fns";

export function useBezichtigingWelcomeData() {
  const { data: trips } = useCustomerTrips();
  const { crmLeadId } = useEffectiveCustomer();

  const { data: milestones } = useQuery({
    queryKey: ["bezichtiging-welcome-milestones", crmLeadId],
    queryFn: async () => {
      if (!crmLeadId) return { completed: 0, total: 0 };
      
      const { data, error } = await supabase
        .from("journey_milestones")
        .select("template_key, completed_at")
        .eq("crm_lead_id", crmLeadId)
        .eq("phase", "bezichtiging");

      if (error) return { completed: 0, total: 0 };

      const visibleTemplates = BEZICHTIGING_TEMPLATES.filter(t => t.customerVisible);
      const completedCount = data.filter(m => !!m.completed_at && visibleTemplates.some(t => t.key === m.template_key)).length;
      
      return { completed: completedCount, total: visibleTemplates.length };
    },
    enabled: !!crmLeadId,
  });

  const todayStart = startOfDay(new Date());
  const upcomingTrip = trips?.find(trip => {
    const tripStart = startOfDay(parseISO(trip.trip_start_date));
    return isFuture(tripStart) || differenceInDays(tripStart, todayStart) >= 0;
  });

  const hasTrip = !!upcomingTrip;
  const daysUntilTrip = upcomingTrip
    ? differenceInDays(startOfDay(parseISO(upcomingTrip.trip_start_date)), todayStart)
    : null;

  return {
    hasTrip,
    daysUntilTrip,
    completedTasks: milestones?.completed || 0,
    totalTasks: milestones?.total || 0,
  };
}
