import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { typedFrom } from "./typed-client";
import type { ExternalListing } from "./types";

// Check for duplicate source_url
export function useCheckDuplicateUrl() {
  return useMutation({
    mutationFn: async ({ sourceUrl, crmLeadId }: { sourceUrl: string; crmLeadId: string }) => {
      if (!sourceUrl.trim()) return { exists: false, assignedToLead: false };

      const { data: existing } = await typedFrom("external_listings")
        .select("id")
        .eq("source_url", sourceUrl.trim())
        .maybeSingle();

      if (!existing) return { exists: false, assignedToLead: false, listingId: null };

      const { data: assignment } = await typedFrom("external_listing_assignments")
        .select("id")
        .eq("external_listing_id", existing.id)
        .eq("crm_lead_id", crmLeadId)
        .maybeSingle();

      return {
        exists: true,
        assignedToLead: !!assignment,
        listingId: existing.id,
      };
    },
  });
}

export function useCreateExternalListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      crmLeadId: string;
      existingListingId: string;
      listing?: undefined;
    } | {
      listing: Omit<ExternalListing, "id" | "created_at">;
      crmLeadId: string;
      existingListingId?: string;
    }) => {
      const { crmLeadId, existingListingId, listing } = params;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Niet ingelogd");

      let listingId = existingListingId;

      if (!listingId) {
        const insertData: Record<string, unknown> = {
          created_by: user.id,
          source_url: listing.source_url,
          source_platform: listing.source_platform,
          title: listing.title,
          price: listing.price,
          currency: listing.currency || 'EUR',
          city: listing.city,
          region: listing.region,
          bedrooms: listing.bedrooms,
          bathrooms: listing.bathrooms,
          area_sqm: listing.area_sqm,
          plot_size_sqm: listing.plot_size_sqm,
          description: listing.description,
          features: listing.features || {},
          images: listing.images || [],
          raw_scraped_data: listing.raw_scraped_data || null,
          scraped_at: new Date().toISOString(),
          scrape_status: listing.scrape_status || 'success',
          scrape_error: listing.scrape_error || null,
          last_scrape_attempt: listing.last_scrape_attempt || null,
        };

        const { data: newListing, error: listingError } = await typedFrom("external_listings")
          .insert(insertData)
          .select("id")
          .single();

        if (listingError) throw listingError;
        listingId = newListing.id;
      }

      const { error: assignError } = await typedFrom("external_listing_assignments")
        .insert({
          external_listing_id: listingId,
          crm_lead_id: crmLeadId,
          assigned_by: user.id,
          status: 'suggested',
        });

      if (assignError) throw assignError;
      return { id: listingId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["external-listing-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["customer-external-listings"] });
      queryClient.invalidateQueries({ queryKey: ["all-external-assignments"] });
      toast.success("Extern pand toegevoegd");
    },
    onError: (error) => {
      console.error("Error creating external listing:", error);
      toast.error("Kon extern pand niet toevoegen");
    },
  });
}

export function useUpdateExternalAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assignmentId,
      updates,
    }: {
      assignmentId: string;
      updates: { status?: string; admin_notes?: string; customer_notes?: string };
    }) => {
      const { error } = await typedFrom("external_listing_assignments")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["external-listing-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["customer-external-listings"] });
      queryClient.invalidateQueries({ queryKey: ["external-listing-detail"] });
      queryClient.invalidateQueries({ queryKey: ["all-external-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["external-assignment-history"] });
      toast.success("Bijgewerkt");
    },
    onError: () => toast.error("Kon niet bijwerken"),
  });
}

export function useUpdateExternalListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      listingId,
      updates,
    }: {
      listingId: string;
      updates: Partial<Omit<ExternalListing, "id" | "created_at">>;
    }) => {
      const { error } = await typedFrom("external_listings")
        .update(updates)
        .eq("id", listingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["external-listing-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["customer-external-listings"] });
      queryClient.invalidateQueries({ queryKey: ["external-listing-detail"] });
      toast.success("Pand bijgewerkt");
    },
    onError: () => toast.error("Kon pand niet bijwerken"),
  });
}

export function useDeleteExternalAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await typedFrom("external_listing_assignments")
        .delete()
        .eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["external-listing-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["customer-external-listings"] });
      queryClient.invalidateQueries({ queryKey: ["all-external-assignments"] });
      toast.success("Extern pand verwijderd");
    },
    onError: () => toast.error("Kon niet verwijderen"),
  });
}

// Admin: assign existing listing to a lead
export function useAssignExistingListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listingId, crmLeadId }: { listingId: string; crmLeadId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Niet ingelogd");

      const { data: existing } = await typedFrom("external_listing_assignments")
        .select("id")
        .eq("external_listing_id", listingId)
        .eq("crm_lead_id", crmLeadId)
        .maybeSingle();

      if (existing) throw new Error("Dit pand is al toegewezen aan deze klant");

      const { error } = await typedFrom("external_listing_assignments")
        .insert({
          external_listing_id: listingId,
          crm_lead_id: crmLeadId,
          assigned_by: user.id,
          status: 'suggested',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["external-listing-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["all-external-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["customer-external-listings"] });
      toast.success("Pand toegewezen aan klant");
    },
    onError: (error) => {
      toast.error(error.message || "Kon pand niet toewijzen");
    },
  });
}
