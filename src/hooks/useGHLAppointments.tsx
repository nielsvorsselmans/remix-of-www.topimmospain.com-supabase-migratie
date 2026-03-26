import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GHLAppointment {
  id: string;
  crm_lead_id: string;
  ghl_appointment_id: string;
  title: string | null;
  start_time: string;
  end_time: string;
  status: string | null;
  calendar_id: string | null;
  local_notes: string | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
  // Summary publication fields (optional - not all appointments have these)
  is_summary_published?: boolean | null;
  summary_headline?: string | null;
  summary_short?: string | null;
  summary_full?: string | null;
  summary_category?: string | null;
  client_pseudonym?: string | null;
  key_topics?: string[] | null;
  granola_meeting_id?: string | null;
  transcript?: string | null;
}

export function useGHLAppointments(ghlContactId: string | null, crmLeadId: string) {
  return useQuery({
    queryKey: ['ghl-appointments', crmLeadId],
    queryFn: async (): Promise<GHLAppointment[]> => {
      if (!ghlContactId) {
        // No GHL contact, return only local appointments
        const { data, error } = await supabase
          .from('ghl_contact_appointments')
          .select('*')
          .eq('crm_lead_id', crmLeadId)
          .order('start_time', { ascending: false });

        if (error) throw error;
        return data as GHLAppointment[];
      }

      // Fetch and sync from GHL
      const { data, error } = await supabase.functions.invoke('get-ghl-contact-appointments', {
        body: { ghl_contact_id: ghlContactId, crm_lead_id: crmLeadId },
      });

      if (error) throw error;
      return data.appointments as GHLAppointment[];
    },
    enabled: !!crmLeadId,
  });
}

export interface UpdateAppointmentData {
  appointmentId: string;
  crmLeadId: string;
  localNotes: string;
  isSummaryPublished?: boolean;
  summaryHeadline?: string;
  summaryShort?: string;
  summaryFull?: string;
  summaryCategory?: string;
  clientPseudonym?: string;
  keyTopics?: string[];
}

export function useUpdateAppointmentNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateAppointmentData) => {
      const updatePayload: Record<string, unknown> = {
        local_notes: data.localNotes,
      };

      // Only include summary fields if publishing is being toggled
      if (data.isSummaryPublished !== undefined) {
        updatePayload.is_summary_published = data.isSummaryPublished;
        updatePayload.summary_headline = data.summaryHeadline || null;
        updatePayload.summary_short = data.summaryShort || null;
        updatePayload.summary_full = data.summaryFull || null;
        updatePayload.summary_category = data.summaryCategory || null;
        updatePayload.client_pseudonym = data.clientPseudonym || null;
        updatePayload.key_topics = data.keyTopics || null;
      }

      const { data: result, error } = await supabase
        .from('ghl_contact_appointments')
        .update(updatePayload)
        .eq('id', data.appointmentId)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ghl-appointments', variables.crmLeadId] });
      queryClient.invalidateQueries({ queryKey: ['published-summaries'] });

      // Fire-and-forget: auto-analyze after DB trigger has synced the conversation row
      if (variables.isSummaryPublished) {
        setTimeout(async () => {
          try {
            await supabase.functions.invoke('analyze-conversation');
            toast.success("Analyse automatisch gestart", {
              description: "Inzichten en vragen worden verwerkt in de Content Engine.",
            });
          } catch (error) {
            console.error('Auto-analyze failed:', error);
          }
        }, 2000);
      }
    },
  });
}
