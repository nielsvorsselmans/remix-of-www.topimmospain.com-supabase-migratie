import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { VisitorProfile } from "@/hooks/useAllVisitors";

export interface KlantProject {
  id: string;
  project_id: string;
  status: string | null;
  priority: number | null;
  admin_notes: string | null;
  customer_notes: string | null;
  assigned_at: string | null;
  project?: {
    id: string;
    name: string;
    city: string | null;
    featured_image: string | null;
    price_from: number | null;
    latitude: number | null;
    longitude: number | null;
    showhouse_address: string | null;
    showhouse_latitude: number | null;
    showhouse_longitude: number | null;
    showhouse_maps_url: string | null;
    showhouse_notes: string | null;
  };
}

export interface KlantTrip {
  id: string;
  trip_start_date: string;
  trip_end_date: string;
  status: string | null;
  trip_type: string;
  scheduled_viewings: any;
  flight_info: string | null;
  accommodation_info: string | null;
  admin_notes: string | null;
  customer_notes: string | null;
}

export interface KlantAfspraak {
  id: string;
  scheduled_start: string;
  scheduled_end: string;
  contact_name: string;
  contact_email: string;
  guest_joined_at: string | null;
}

export interface Klant {
  id: string;
  ghl_contact_id: string | null; // Primary GHL identifier (was crm_user_id)
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  journey_phase: string | null;
  journey_phase_updated_at: string | null;
  follow_up_status: string | null;
  admin_notes: string | null;
  first_visit_at: string | null;
  last_visit_at: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  created_at: string | null;
  // Magic link tracking
  last_magic_link_sent_at: string | null;
  magic_link_sent_count: number | null;
  // Dropped off tracking
  dropped_off_at: string | null;
  dropped_off_phase: string | null;
  dropped_off_reason: string | null;
  dropped_off_notes: string | null;
  recontact_allowed: boolean | null;
  recontact_after: string | null;
  reactivated_at: string | null;
  // Partner referral info
  referred_by_partner_id: string | null;
  partner_id: string | null;
  partner_name: string | null;
  partner_company: string | null;
  partner_logo_url: string | null;
  // From customer_profiles
  lead_temperature: string | null;
  engagement_data: any;
  inferred_preferences: any;
  explicit_preferences: any;
  viewed_projects: string[];
  favorite_projects: string[];
  // Related data
  assigned_projects: KlantProject[];
  trips: KlantTrip[];
  afspraken: KlantAfspraak[];
}

export const useKlant = (id: string) => {
  return useQuery({
    queryKey: ["klant", id],
    queryFn: async () => {
      // Use consolidated view for most data (reduces 4 queries to 1)
      const { data, error } = await supabase
        .from("klant_detail_view")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      // Appointments still need separate query (by email, different table)
      let afspraken: KlantAfspraak[] = [];
      if (data.email) {
        const { data: appointments } = await supabase
          .from("appointment_rooms")
          .select("*")
          .eq("contact_email", data.email)
          .order("scheduled_start", { ascending: false });
        afspraken = appointments || [];
      }

      // Parse JSONB arrays from view and build Klant object
      const klant: Klant = {
        id: data.id,
        ghl_contact_id: data.ghl_contact_id,
        user_id: data.user_id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        journey_phase: data.journey_phase,
        journey_phase_updated_at: data.journey_phase_updated_at,
        follow_up_status: data.follow_up_status,
        admin_notes: data.admin_notes,
        first_visit_at: data.first_visit_at,
        last_visit_at: data.last_visit_at,
        utm_source: data.utm_source,
        utm_medium: data.utm_medium,
        utm_campaign: data.utm_campaign,
        created_at: data.created_at,
        last_magic_link_sent_at: data.last_magic_link_sent_at,
        magic_link_sent_count: data.magic_link_sent_count,
        dropped_off_at: data.dropped_off_at,
        dropped_off_phase: data.dropped_off_phase,
        dropped_off_reason: data.dropped_off_reason,
        dropped_off_notes: data.dropped_off_notes,
        recontact_allowed: data.recontact_allowed,
        recontact_after: data.recontact_after,
        reactivated_at: data.reactivated_at,
        // Partner referral info (from view join)
        referred_by_partner_id: data.referred_by_partner_id || null,
        partner_id: data.partner_id || null,
        partner_name: data.partner_name || null,
        partner_company: data.partner_company || null,
        partner_logo_url: data.partner_logo_url || null,
        // From customer_profiles (via view)
        lead_temperature: data.lead_temperature || null,
        engagement_data: data.engagement_data || {},
        inferred_preferences: data.inferred_preferences || {},
        explicit_preferences: data.explicit_preferences || {},
        viewed_projects: data.viewed_projects || [],
        favorite_projects: data.favorite_projects || [],
        // JSONB arrays from view - cast via unknown for type safety
        assigned_projects: (data.assigned_projects as unknown as KlantProject[]) || [],
        trips: (data.trips as unknown as KlantTrip[]) || [],
        afspraken,
      };

      return klant;
    },
    enabled: !!id,
  });
};

export const useUpdateKlantPhase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, phase }: { id: string; phase: string }) => {
      const { error } = await supabase
        .from("crm_leads")
        .update({
          journey_phase: phase,
          journey_phase_updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["klant", id] });
      queryClient.invalidateQueries({ queryKey: ["klanten"] });
    },
  });
};

export const useUpdateKlantNotes = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from("crm_leads")
        .update({ admin_notes: notes })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["klant", id] });
    },
  });
};

export const useUpdateKlantContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      email, 
      phone,
      first_name,
      last_name,
      ghl_contact_id,
    }: { 
      id: string; 
      email?: string; 
      phone?: string;
      first_name?: string;
      last_name?: string;
      ghl_contact_id?: string | null;
    }) => {
      const updates: Record<string, string | null> = {};
      if (email !== undefined) updates.email = email || null;
      if (phone !== undefined) updates.phone = phone || null;
      if (first_name !== undefined) updates.first_name = first_name || null;
      if (last_name !== undefined) updates.last_name = last_name || null;

      // Update local database
      const { error } = await supabase
        .from("crm_leads")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      // Sync to GHL - will search/create if no ghl_contact_id
      if (ghl_contact_id || email) {
        try {
          const { data, error: ghlError } = await supabase.functions.invoke('update-ghl-contact', {
            body: { 
              ghl_contact_id, 
              crm_lead_id: id,
              email, 
              phone,
              first_name,
              last_name,
            },
          });
          
          if (ghlError) {
            console.warn('GHL sync failed:', ghlError);
          } else if (data?.was_created) {
            console.log('New GHL contact created and linked:', data.ghl_contact_id);
          } else if (data?.was_linked) {
            console.log('Existing GHL contact found and linked:', data.ghl_contact_id);
          }
        } catch (ghlErr) {
          console.warn('GHL sync error:', ghlErr);
          toast.error("Lokaal opgeslagen, maar synchronisatie met CRM is mislukt.");
        }
      }
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["klant", id] });
      queryClient.invalidateQueries({ queryKey: ["klanten"] });
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      toast.success("Klantgegevens opgeslagen");
    },
    onError: (error: any) => {
      console.error("Failed to update contact:", error);
      if (error?.message?.includes('crm_leads_email_unique_lower') || error?.code === '23505') {
        toast.error("Dit e-mailadres is al in gebruik bij een andere klant.");
      } else {
        toast.error("Opslaan mislukt. Probeer het opnieuw.");
      }
    },
  });
};

export const useAddKlantProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      crmLeadId,
      projectId,
      status = "suggested",
      priority = 0,
      assignedBy,
    }: {
      crmLeadId: string;
      projectId: string;
      status?: string;
      priority?: number;
      assignedBy?: string;
    }) => {
      const { error } = await supabase
        .from("customer_project_selections")
        .insert({
          crm_lead_id: crmLeadId,
          project_id: projectId,
          status,
          priority,
          assigned_at: new Date().toISOString(),
          assigned_by: assignedBy || null,
        });

      if (error) throw error;
    },
    onSuccess: (_, { crmLeadId }) => {
      queryClient.invalidateQueries({ queryKey: ["klant", crmLeadId] });
      // Also invalidate journey phase cache since trigger may have updated it
      queryClient.invalidateQueries({ queryKey: ["user-journey-phase", crmLeadId] });
    },
  });
};

export const useUpdateKlantProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      selectionId,
      crmLeadId,
      updates,
    }: {
      selectionId: string;
      crmLeadId: string;
      updates: { status?: string; priority?: number; admin_notes?: string };
    }) => {
      const { error } = await supabase
        .from("customer_project_selections")
        .update(updates)
        .eq("id", selectionId);

      if (error) throw error;
    },
    onSuccess: (_, { crmLeadId }) => {
      queryClient.invalidateQueries({ queryKey: ["klant", crmLeadId] });
    },
  });
};

export const useDeleteKlantProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      selectionId,
      crmLeadId,
    }: {
      selectionId: string;
      crmLeadId: string;
    }) => {
      const { error } = await supabase
        .from("customer_project_selections")
        .delete()
        .eq("id", selectionId);

      if (error) throw error;
    },
    onSuccess: (_, { crmLeadId }) => {
      queryClient.invalidateQueries({ queryKey: ["klant", crmLeadId] });
    },
  });
};

export const useUpdateKlantPartner = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      partnerId,
    }: {
      id: string;
      partnerId: string | null;
    }) => {
      const { error } = await supabase
        .from("crm_leads")
        .update({ referred_by_partner_id: partnerId })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["klant", id] });
      queryClient.invalidateQueries({ queryKey: ["klanten"] });
      queryClient.invalidateQueries({ queryKey: ["partner-klanten"] });
    },
  });
};

// Helper function to convert Klant to VisitorProfile for VisitorDetailSheet
export function klantToVisitorProfile(klant: Klant): VisitorProfile {
  return {
    id: klant.id,
    user_id: klant.user_id,
    visitor_id: null,
    crm_user_id: klant.ghl_contact_id || '', // Map ghl_contact_id to crm_user_id for compatibility
    engagement_data: klant.engagement_data || {},
    inferred_preferences: klant.inferred_preferences || {},
    explicit_preferences: klant.explicit_preferences || {},
    favorite_projects: klant.favorite_projects || [],
    viewed_projects: klant.viewed_projects || [],
    viewed_blog_posts: [],
    created_at: klant.created_at || '',
    updated_at: klant.last_visit_at || '',
    last_aggregated_at: '',
    profiles: klant.user_id ? {
      first_name: klant.first_name || '',
      last_name: klant.last_name || '',
      email: klant.email || '',
    } : null,
    crm_leads: {
      crm_user_id: klant.ghl_contact_id || '', // Map for compatibility
      first_name: klant.first_name,
      last_name: klant.last_name,
      email: klant.email,
      phone: klant.phone,
      follow_up_status: klant.follow_up_status,
      last_ghl_refresh_at: null,
      journey_phase: klant.journey_phase,
      journey_phase_updated_at: klant.journey_phase_updated_at,
      admin_notes: klant.admin_notes,
    },
  };
}
