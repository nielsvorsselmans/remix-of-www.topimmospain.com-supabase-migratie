import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePartner } from "@/contexts/PartnerContext";
import { calculateEffectivePriceRange } from "@/lib/utils";

export interface PartnerKlantProject {
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

export interface PartnerKlantTrip {
  id: string;
  trip_start_date: string;
  trip_end_date: string;
  status: string | null;
  scheduled_viewings: any;
  flight_info: string | null;
  accommodation_info: string | null;
  admin_notes: string | null;
  customer_notes: string | null;
  airport: string | null;
  arrival_time: string | null;
  departure_time: string | null;
}

export interface PartnerKlantNote {
  id: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface PartnerKlantMilestone {
  id: string;
  phase: string;
  template_key: string;
  title: string;
  description: string | null;
  order_index: number;
  completed_at: string | null;
  customer_visible: boolean | null;
  admin_only: boolean | null;
  priority: string | null;
}

export interface PartnerKlant {
  id: string;
  crm_user_id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  journey_phase: string | null;
  first_visit_at: string | null;
  last_visit_at: string | null;
  created_at: string | null;
  // Drop-off fields
  dropped_off_at: string | null;
  dropped_off_phase: string | null;
  dropped_off_reason: string | null;
  dropped_off_notes: string | null;
  recontact_allowed: boolean | null;
  recontact_after: string | null;
  // From customer_profiles
  lead_temperature: string | null;
  engagement_data: any;
  inferred_preferences: any;
  explicit_preferences: any;
  viewed_projects: string[];
  favorite_projects: string[];
  // Related data
  assigned_projects: PartnerKlantProject[];
  trips: PartnerKlantTrip[];
  notes: PartnerKlantNote[];
  milestones: PartnerKlantMilestone[];
}

export const usePartnerKlant = (crmLeadId: string) => {
  const { user } = useAuth();
  const { impersonatedPartner, isImpersonating } = usePartner();

  return useQuery({
    queryKey: ["partner-klant", crmLeadId, impersonatedPartner?.id],
    queryFn: async () => {
      let partnerId: string;
      
      // Use impersonated partner if available
      if (isImpersonating && impersonatedPartner) {
        partnerId = impersonatedPartner.id;
      } else {
        // First get the partner ID for the current user
        const { data: partner, error: partnerError } = await supabase
          .from("partners")
          .select("id")
          .eq("user_id", user?.id)
          .single();

        if (partnerError || !partner) {
          throw new Error("Partner not found");
        }
        partnerId = partner.id;
      }

      // Fetch CRM lead (partner can only see their referred leads)
      const { data: lead, error: leadError } = await supabase
        .from("crm_leads")
        .select("*")
        .eq("id", crmLeadId)
        .eq("referred_by_partner_id", partnerId)
        .single();

      if (leadError) throw leadError;

      // Fetch customer profile - prioritize crm_lead_id as primary lookup
      let profile = null;

      // First try direct lookup by crm_lead_id (most reliable)
      const { data: profileByLeadId } = await supabase
        .from("customer_profiles")
        .select("*")
        .eq("crm_lead_id", crmLeadId)
        .maybeSingle();

      profile = profileByLeadId;

      // Fallback: try by crm_user_id or user_id if no profile found via crm_lead_id
      if (!profile) {
        const conditions: string[] = [];
        if (lead.crm_user_id) conditions.push(`crm_user_id.eq.${lead.crm_user_id}`);
        if (lead.user_id) conditions.push(`user_id.eq.${lead.user_id}`);

        if (conditions.length > 0) {
          const { data: profileByOtherId } = await supabase
            .from("customer_profiles")
            .select("*")
            .or(conditions.join(","))
            .maybeSingle();
          profile = profileByOtherId;
        }
      }

      // Fetch assigned projects with properties for effective pricing
      const { data: projectSelections } = await supabase
        .from("customer_project_selections")
        .select(`
          *,
          project:projects(id, name, city, featured_image, price_from, latitude, longitude, showhouse_address, showhouse_latitude, showhouse_longitude, showhouse_maps_url, showhouse_notes, properties(price, status))
        `)
        .eq("crm_lead_id", crmLeadId)
        .order("priority", { ascending: true });

      // Fetch trips
      const { data: trips } = await supabase
        .from("customer_viewing_trips")
        .select("*")
        .eq("crm_lead_id", crmLeadId)
        .order("trip_start_date", { ascending: false });

      // Fetch partner notes
      const { data: notes } = await supabase
        .from("partner_lead_notes")
        .select("*")
        .eq("crm_lead_id", crmLeadId)
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false });

      // Fetch journey milestones (customer visible only for partners)
      const { data: milestones } = await supabase
        .from("journey_milestones")
        .select("*")
        .eq("crm_lead_id", crmLeadId)
        .order("order_index", { ascending: true });

      const klant: PartnerKlant = {
        id: lead.id,
        crm_user_id: lead.crm_user_id,
        user_id: lead.user_id,
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        journey_phase: lead.journey_phase,
        first_visit_at: lead.first_visit_at,
        last_visit_at: lead.last_visit_at,
        created_at: lead.created_at,
        // Drop-off fields
        dropped_off_at: lead.dropped_off_at,
        dropped_off_phase: lead.dropped_off_phase,
        dropped_off_reason: lead.dropped_off_reason,
        dropped_off_notes: lead.dropped_off_notes,
        recontact_allowed: lead.recontact_allowed,
        recontact_after: lead.recontact_after,
        // From customer_profiles
        lead_temperature: profile?.lead_temperature || null,
        engagement_data: profile?.engagement_data || {},
        inferred_preferences: profile?.inferred_preferences || {},
        explicit_preferences: profile?.explicit_preferences || {},
        viewed_projects: profile?.viewed_projects || [],
        favorite_projects: profile?.favorite_projects || [],
        assigned_projects: (projectSelections || []).map((sel: any) => {
          const properties = sel.project?.properties || [];
          const { priceFrom } = calculateEffectivePriceRange(
            sel.project?.price_from,
            null,
            properties
          );
          return {
            ...sel,
            project: sel.project ? {
              ...sel.project,
              price_from: priceFrom,
              properties: undefined, // Remove raw properties from output
            } : sel.project,
          };
        }),
        trips: trips || [],
        notes: notes || [],
        milestones: milestones || [],
      };

      return { klant, partnerId };
    },
    enabled: !!crmLeadId && (!!user?.id || isImpersonating),
  });
};

export const useAddPartnerProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      crmLeadId,
      projectId,
      partnerId,
      status = "suggested",
      priority = 0,
    }: {
      crmLeadId: string;
      projectId: string;
      partnerId?: string;
      status?: string;
      priority?: number;
    }) => {
      const { error } = await supabase
        .from("customer_project_selections")
        .insert({
          crm_lead_id: crmLeadId,
          project_id: projectId,
          status,
          priority,
          assigned_at: new Date().toISOString(),
          assigned_by: partnerId || null, // Track who assigned the project
        });

      if (error) throw error;
    },
    onSuccess: (_, { crmLeadId }) => {
      queryClient.invalidateQueries({ queryKey: ["partner-klant", crmLeadId] });
      queryClient.invalidateQueries({ queryKey: ["klant", crmLeadId] }); // Sync with admin view
    },
  });
};

export const useUpdatePartnerProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      selectionId,
      crmLeadId,
      updates,
    }: {
      selectionId: string;
      crmLeadId: string;
      updates: { status?: string; priority?: number };
    }) => {
      const { error } = await supabase
        .from("customer_project_selections")
        .update(updates)
        .eq("id", selectionId);

      if (error) throw error;
    },
    onSuccess: (_, { crmLeadId }) => {
      queryClient.invalidateQueries({ queryKey: ["partner-klant", crmLeadId] });
    },
  });
};

export const useDeletePartnerProject = () => {
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
      queryClient.invalidateQueries({ queryKey: ["partner-klant", crmLeadId] });
    },
  });
};

export const useAddPartnerNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      crmLeadId,
      partnerId,
      note,
    }: {
      crmLeadId: string;
      partnerId: string;
      note: string;
    }) => {
      const { error } = await supabase
        .from("partner_lead_notes")
        .insert({
          crm_lead_id: crmLeadId,
          partner_id: partnerId,
          note,
        });

      if (error) throw error;
    },
    onSuccess: (_, { crmLeadId }) => {
      queryClient.invalidateQueries({ queryKey: ["partner-klant", crmLeadId] });
    },
  });
};
