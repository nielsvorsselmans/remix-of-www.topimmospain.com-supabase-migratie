import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ManualEvent {
  id: string;
  crm_lead_id: string;
  event_type: string;
  title: string;
  description: string | null;
  event_date: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Summary fields
  is_summary_published: boolean | null;
  summary_headline: string | null;
  summary_short: string | null;
  summary_full: string | null;
  summary_category: string | null;
  client_pseudonym: string | null;
  key_topics: string[] | null;
}

export function useManualEvents(crmLeadId: string) {
  return useQuery({
    queryKey: ['manual-events', crmLeadId],
    queryFn: async (): Promise<ManualEvent[]> => {
      const { data, error } = await supabase
        .from('manual_events')
        .select('*')
        .eq('crm_lead_id', crmLeadId)
        .order('event_date', { ascending: false });

      if (error) throw error;
      return data as ManualEvent[];
    },
    enabled: !!crmLeadId,
  });
}

export function useCreateManualEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      crmLeadId,
      title,
      eventType,
      eventDate,
      description,
      notes,
    }: {
      crmLeadId: string;
      title: string;
      eventType: string;
      eventDate: Date;
      description?: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('manual_events')
        .insert({
          crm_lead_id: crmLeadId,
          title,
          event_type: eventType,
          event_date: eventDate.toISOString(),
          description: description || null,
          notes: notes || null,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { crmLeadId }) => {
      queryClient.invalidateQueries({ queryKey: ['manual-events', crmLeadId] });
      queryClient.invalidateQueries({ queryKey: ['klant-events', crmLeadId] });
    },
  });
}

export function useUpdateManualEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      crmLeadId,
      title,
      eventType,
      eventDate,
      description,
      notes,
      isSummaryPublished,
      summaryHeadline,
      summaryShort,
      summaryFull,
      summaryCategory,
      clientPseudonym,
      keyTopics,
    }: {
      id: string;
      crmLeadId: string;
      title?: string;
      eventType?: string;
      eventDate?: Date;
      description?: string | null;
      notes?: string | null;
      isSummaryPublished?: boolean;
      summaryHeadline?: string | null;
      summaryShort?: string | null;
      summaryFull?: string | null;
      summaryCategory?: string | null;
      clientPseudonym?: string | null;
      keyTopics?: string[] | null;
    }) => {
      const updateData: Record<string, unknown> = {};
      if (title !== undefined) updateData.title = title;
      if (eventType !== undefined) updateData.event_type = eventType;
      if (eventDate !== undefined) updateData.event_date = eventDate.toISOString();
      if (description !== undefined) updateData.description = description;
      if (notes !== undefined) updateData.notes = notes;
      if (isSummaryPublished !== undefined) updateData.is_summary_published = isSummaryPublished;
      if (summaryHeadline !== undefined) updateData.summary_headline = summaryHeadline;
      if (summaryShort !== undefined) updateData.summary_short = summaryShort;
      if (summaryFull !== undefined) updateData.summary_full = summaryFull;
      if (summaryCategory !== undefined) updateData.summary_category = summaryCategory;
      if (clientPseudonym !== undefined) updateData.client_pseudonym = clientPseudonym;
      if (keyTopics !== undefined) updateData.key_topics = keyTopics;

      const { data, error } = await supabase
        .from('manual_events')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { crmLeadId, isSummaryPublished }) => {
      queryClient.invalidateQueries({ queryKey: ['manual-events', crmLeadId] });
      queryClient.invalidateQueries({ queryKey: ['klant-events', crmLeadId] });

      // Fire-and-forget: auto-analyze after DB trigger has synced the conversation row
      if (isSummaryPublished) {
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

export function useDeleteManualEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, crmLeadId }: { id: string; crmLeadId: string }) => {
      const { error } = await supabase
        .from('manual_events')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { crmLeadId }) => {
      queryClient.invalidateQueries({ queryKey: ['manual-events', crmLeadId] });
      queryClient.invalidateQueries({ queryKey: ['klant-events', crmLeadId] });
    },
  });
}
