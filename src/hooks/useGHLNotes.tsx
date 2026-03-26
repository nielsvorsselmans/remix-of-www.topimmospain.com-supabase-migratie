import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GHLNote {
  id: string;
  crm_lead_id: string;
  ghl_note_id: string | null;
  body: string;
  source: 'ghl' | 'admin_portal';
  ghl_date_added: string | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useGHLNotes(ghlContactId: string | null, crmLeadId: string) {
  return useQuery({
    queryKey: ['ghl-notes', crmLeadId],
    queryFn: async (): Promise<GHLNote[]> => {
      if (!ghlContactId) {
        // No GHL contact, return only local notes
        const { data, error } = await supabase
          .from('ghl_contact_notes')
          .select('*')
          .eq('crm_lead_id', crmLeadId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data as GHLNote[];
      }

      // Fetch and sync from GHL
      const { data, error } = await supabase.functions.invoke('get-ghl-contact-notes', {
        body: { ghl_contact_id: ghlContactId, crm_lead_id: crmLeadId },
      });

      if (error) throw error;
      return data.notes as GHLNote[];
    },
    enabled: !!crmLeadId,
  });
}

export function useCreateGHLNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      ghlContactId, 
      crmLeadId, 
      body 
    }: { 
      ghlContactId: string | null; 
      crmLeadId: string; 
      body: string;
    }) => {
      if (!ghlContactId) {
        // No GHL contact, save only locally
        const { data, error } = await supabase
          .from('ghl_contact_notes')
          .insert({
            crm_lead_id: crmLeadId,
            body,
            source: 'admin_portal',
          })
          .select()
          .single();

        if (error) throw error;
        return { note: data, synced_to_ghl: false };
      }

      // Create in GHL and locally
      const { data, error } = await supabase.functions.invoke('create-ghl-note', {
        body: { ghl_contact_id: ghlContactId, crm_lead_id: crmLeadId, body },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ghl-notes', variables.crmLeadId] });
    },
  });
}
