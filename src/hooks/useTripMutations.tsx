import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScheduledViewing } from "@/components/admin/klant/TripDetailSheet";
import type { Json } from "@/integrations/supabase/types";

// Flexible type that works for both admin and partner forms
export interface CreateTripData {
  trip_start_date: string;
  trip_end_date: string;
  status: string;
  trip_type?: string;
  arrival_time?: string;
  departure_time?: string;
  airport?: string;
  flight_info?: string;
  accommodation_info?: string;
  admin_notes?: string;
}

export const useCreateTrip = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      crmLeadId,
      data,
    }: {
      crmLeadId: string;
      data: CreateTripData;
    }) => {
      const { error } = await supabase
        .from("customer_viewing_trips")
        .insert({
          crm_lead_id: crmLeadId,
          trip_start_date: data.trip_start_date,
          trip_end_date: data.trip_end_date,
          arrival_time: data.arrival_time || null,
          departure_time: data.departure_time || null,
          airport: data.airport || null,
          flight_info: data.flight_info || null,
          accommodation_info: data.accommodation_info || null,
          status: data.status,
          trip_type: data.trip_type || "bezichtiging",
          admin_notes: data.admin_notes || null,
          scheduled_viewings: [],
        });

      if (error) throw error;
    },
    onSuccess: (_, { crmLeadId }) => {
      queryClient.invalidateQueries({ queryKey: ["klant", crmLeadId] });
      queryClient.invalidateQueries({ queryKey: ["partner-klant", crmLeadId] });
    },
  });
};

export const useUpdateTrip = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tripId,
      crmLeadId,
      updates,
    }: {
      tripId: string;
      crmLeadId: string;
      updates: Partial<CreateTripData>;
    }) => {
      const updateData: Record<string, any> = {};
      
      if (updates.trip_start_date !== undefined) updateData.trip_start_date = updates.trip_start_date;
      if (updates.trip_end_date !== undefined) updateData.trip_end_date = updates.trip_end_date;
      if (updates.arrival_time !== undefined) updateData.arrival_time = updates.arrival_time || null;
      if (updates.departure_time !== undefined) updateData.departure_time = updates.departure_time || null;
      if (updates.airport !== undefined) updateData.airport = updates.airport || null;
      if (updates.flight_info !== undefined) updateData.flight_info = updates.flight_info || null;
      if (updates.accommodation_info !== undefined) updateData.accommodation_info = updates.accommodation_info || null;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.trip_type !== undefined) updateData.trip_type = updates.trip_type;
      if (updates.admin_notes !== undefined) updateData.admin_notes = updates.admin_notes || null;

      const { error } = await supabase
        .from("customer_viewing_trips")
        .update(updateData)
        .eq("id", tripId);

      if (error) throw error;
    },
    onSuccess: (_, { crmLeadId }) => {
      queryClient.invalidateQueries({ queryKey: ["klant", crmLeadId] });
      queryClient.invalidateQueries({ queryKey: ["partner-klant", crmLeadId] });
    },
  });
};

export const useUpdateTripViewings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tripId,
      crmLeadId,
      viewings,
    }: {
      tripId: string;
      crmLeadId: string;
      viewings: ScheduledViewing[];
    }) => {
      const { error } = await supabase
        .from("customer_viewing_trips")
        .update({ scheduled_viewings: JSON.parse(JSON.stringify(viewings)) as Json })
        .eq("id", tripId);

      if (error) throw error;
    },
    onSuccess: (_, { crmLeadId }) => {
      queryClient.invalidateQueries({ queryKey: ["klant", crmLeadId] });
      queryClient.invalidateQueries({ queryKey: ["partner-klant", crmLeadId] });
    },
  });
};

export const useDeleteTrip = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tripId,
      crmLeadId,
    }: {
      tripId: string;
      crmLeadId: string;
    }) => {
      const { error } = await supabase
        .from("customer_viewing_trips")
        .delete()
        .eq("id", tripId);

      if (error) throw error;
    },
    onSuccess: (_, { crmLeadId }) => {
      queryClient.invalidateQueries({ queryKey: ["klant", crmLeadId] });
      queryClient.invalidateQueries({ queryKey: ["partner-klant", crmLeadId] });
    },
  });
};