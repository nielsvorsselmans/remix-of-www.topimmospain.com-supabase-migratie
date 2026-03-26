import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfileAndRoles } from "@/hooks/useProfileAndRoles";
import { useEffectiveCustomer } from "@/hooks/useEffectiveCustomer";
import { typedFrom } from "./typed-client";
import type {
  ExternalListing,
  ExternalListingAssignment,
  AllExternalAssignment,
  StatusHistoryEntry,
  SearchedExternalListing,
} from "./types";

// ── Shared helper: cached customer lead ID ──────────────────────────

/**
 * Fetches and caches the crm_lead.id for the current authenticated user.
 * Prevents 3 identical crm_leads lookups when multiple hooks are on the same page.
 */
export function useCustomerLeadId() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["customer-lead-id", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("crm_leads")
        .select("id, can_submit_external_urls")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data) return null;
      return { id: data.id as string, canSubmitExternalUrls: data.can_submit_external_urls === true };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}

// ── Helpers ─────────────────────────────────────────────────────────

function filterBrokerInfo(data: any): any {
  const rawFeatures = (data.features || {}) as Record<string, unknown>;
  const {
    agent_name, agent_phone, agent_email, agent_website,
    broker_name, broker_phone, broker_email, broker_website,
    ...safeFeatures
  } = rawFeatures;
  return { ...data, features: safeFeatures };
}

const ASSIGNMENT_SELECT = `
  id, external_listing_id, crm_lead_id, status,
  admin_notes, customer_notes, assigned_at,
  external_listings:external_listing_id (
    id, source_url, source_platform, title, price, currency,
    city, region, bedrooms, bathrooms, area_sqm, plot_size_sqm,
    description, features, images, created_at, scrape_status, scrape_error
  )
`;

const CUSTOMER_ASSIGNMENT_SELECT = `
  id, external_listing_id, crm_lead_id, status,
  admin_notes, customer_notes, assigned_at,
  external_listings:external_listing_id (
    id, source_url, source_platform, title, price, currency,
    city, region, bedrooms, bathrooms, area_sqm, plot_size_sqm,
    description, features, images, created_at
  )
`;

function mapAssignment(d: any): ExternalListingAssignment {
  return { ...d, external_listing: d.external_listings as ExternalListing };
}

// ── Query hooks ─────────────────────────────────────────────────────

// Admin: get assignments for a specific lead
export function useExternalListingsForLead(crmLeadId: string | null) {
  return useQuery({
    queryKey: ["external-listing-assignments", crmLeadId],
    queryFn: async () => {
      if (!crmLeadId) return [];
      const { data, error } = await typedFrom("external_listing_assignments")
        .select(ASSIGNMENT_SELECT)
        .eq("crm_lead_id", crmLeadId)
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapAssignment) as ExternalListingAssignment[];
    },
    enabled: !!crmLeadId,
  });
}

// Customer: get own external listing assignments (uses effective customer for preview support)
export function useCustomerExternalListings() {
  const { crmLeadId, isLoading: isLoadingCustomer } = useEffectiveCustomer();
  return useQuery({
    queryKey: ["customer-external-listings", crmLeadId],
    queryFn: async () => {
      if (!crmLeadId) return { assignments: [] as ExternalListingAssignment[], newCount: 0 };
      const { data, error } = await typedFrom("external_listing_assignments")
        .select(CUSTOMER_ASSIGNMENT_SELECT)
        .eq("crm_lead_id", crmLeadId)
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      const assignments = (data || []).map(mapAssignment) as ExternalListingAssignment[];
      const newCount = assignments.filter(a => a.status === "suggested").length;
      return { assignments, newCount };
    },
    enabled: !!crmLeadId && !isLoadingCustomer,
  });
}

// Customer: get a single external listing detail (uses cached lead ID)
export function useExternalListingDetail(listingId: string) {
  const { data: leadData } = useCustomerLeadId();
  const leadId = leadData?.id ?? null;
  return useQuery({
    queryKey: ["external-listing-detail", listingId, leadId],
    queryFn: async () => {
      if (!leadId || !listingId) return null;
      const { data, error } = await typedFrom("external_listing_assignments")
        .select(CUSTOMER_ASSIGNMENT_SELECT)
        .eq("crm_lead_id", leadId)
        .eq("external_listing_id", listingId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return mapAssignment(data) as ExternalListingAssignment;
    },
    enabled: !!leadId && !!listingId,
  });
}

// Authenticated: get a single external listing for admin or assigned customer (uses cached lead ID)
export function useAdminOrCustomerExternalListing(listingId: string | undefined) {
  const { user } = useAuth();
  const { data: profileData } = useProfileAndRoles(user?.id);
  const isAdmin = profileData?.roles?.includes("admin") ?? false;
  const { data: leadData } = useCustomerLeadId();
  const leadId = leadData?.id ?? null;

  return useQuery({
    queryKey: ["admin-or-customer-external-listing", listingId, user?.id, isAdmin, leadId],
    queryFn: async () => {
      if (!listingId || !user?.id) return null;

      if (isAdmin) {
        const { data, error } = await typedFrom("external_listings")
          .select("id, title, price, currency, city, region, bedrooms, bathrooms, area_sqm, plot_size_sqm, description, features, images, created_at")
          .eq("id", listingId)
          .maybeSingle();
        if (error) throw error;
        if (!data) return null;
        return filterBrokerInfo(data) as ExternalListing;
      }

      if (!leadId) return null;
      const { data, error } = await typedFrom("external_listing_assignments")
        .select(`
          id, status, customer_notes,
          external_listings:external_listing_id (
            id, title, price, currency, city, region, bedrooms, bathrooms,
            area_sqm, plot_size_sqm, description, features, images, created_at
          )
        `)
        .eq("crm_lead_id", leadId)
        .eq("external_listing_id", listingId)
        .maybeSingle();
      if (error) throw error;
      if (!data?.external_listings) return null;
      const filteredListing = filterBrokerInfo(data.external_listings) as ExternalListing;
      return {
        ...filteredListing,
        _assignment: {
          id: data.id as string,
          status: data.status as string,
          customer_notes: data.customer_notes as string | null,
        },
      };
    },
    enabled: !!listingId && !!user?.id && profileData !== undefined,
  });
}

// Admin: get all external assignments across all leads
export function useAllExternalAssignments() {
  return useQuery({
    queryKey: ["all-external-assignments"],
    queryFn: async () => {
      const { data, error } = await typedFrom("external_listing_assignments")
        .select(`
          id, external_listing_id, crm_lead_id, status,
          admin_notes, customer_notes, assigned_at,
          external_listings:external_listing_id (id, title, city, price, source_platform, images),
          crm_leads:crm_lead_id (id, first_name, last_name, email)
        `)
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => {
        const listing = d.external_listings || {};
        const lead = d.crm_leads || {};
        const leadName = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || null;
        return {
          id: d.id,
          external_listing_id: d.external_listing_id,
          crm_lead_id: d.crm_lead_id,
          status: d.status,
          admin_notes: d.admin_notes,
          customer_notes: d.customer_notes,
          assigned_at: d.assigned_at,
          listing_title: listing.title || null,
          listing_city: listing.city || null,
          listing_price: listing.price || null,
          listing_platform: listing.source_platform || "onbekend",
          listing_image: Array.isArray(listing.images) && listing.images.length > 0 ? listing.images[0] : null,
          lead_name: leadName,
          lead_email: lead.email || null,
        } as AllExternalAssignment;
      });
    },
  });
}

// Admin: get status history for an assignment
export function useExternalAssignmentHistory(assignmentId: string | null) {
  return useQuery({
    queryKey: ["external-assignment-history", assignmentId],
    queryFn: async () => {
      if (!assignmentId) return [];
      const { data, error } = await typedFrom("external_assignment_status_history")
        .select("id, old_status, new_status, changed_by, changed_at, notes")
        .eq("assignment_id", assignmentId)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return (data || []) as StatusHistoryEntry[];
    },
    enabled: !!assignmentId,
  });
}

// Admin: search existing external listings
export function useSearchExternalListings(query: string) {
  return useQuery({
    queryKey: ["search-external-listings", query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      const searchTerm = `%${query}%`;
      const { data, error } = await typedFrom("external_listings")
        .select("id, title, city, price, source_platform, source_url, images")
        .or(`title.ilike.${searchTerm},city.ilike.${searchTerm},source_url.ilike.${searchTerm}`)
        .limit(20);
      if (error) throw error;

      const listingIds = (data || []).map((d: any) => d.id);
      if (listingIds.length === 0) return [];

      const { data: assignments } = await typedFrom("external_listing_assignments")
        .select("external_listing_id")
        .in("external_listing_id", listingIds);

      const countMap: Record<string, number> = {};
      (assignments || []).forEach((a: any) => {
        countMap[a.external_listing_id] = (countMap[a.external_listing_id] || 0) + 1;
      });

      return (data || []).map((d: any) => ({
        ...d,
        assignment_count: countMap[d.id] || 0,
      })) as SearchedExternalListing[];
    },
    enabled: query.length >= 2,
  });
}

// Admin: search CRM leads for assignment
export function useSearchCrmLeads(query: string) {
  return useQuery({
    queryKey: ["search-crm-leads", query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      const searchTerm = `%${query}%`;
      const { data, error } = await supabase
        .from("crm_leads")
        .select("id, first_name, last_name, email")
        .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
        .limit(15);
      if (error) throw error;
      return (data || []).map((d) => ({
        id: d.id,
        name: [d.first_name, d.last_name].filter(Boolean).join(" ") || null,
        email: d.email,
      }));
    },
    enabled: query.length >= 2,
  });
}
