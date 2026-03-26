import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CustomerTravelGuide {
  id: string;
  crm_lead_id: string;
  viewing_trip_id: string | null;
  sale_id: string | null;
  title: string;
  intro_text: string | null;
  municipality: string | null;
  region: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  crm_leads?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
  customer_travel_guide_pois?: CustomerTravelGuidePOI[];
}

export interface TravelGuidePOIData {
  id: string;
  name: string;
  municipality: string;
  region: string;
  rating: number | null;
  is_recommended: boolean;
  travel_guide_categories?: {
    name: string;
    icon: string;
  } | null;
}

export interface CustomerTravelGuidePOI {
  id: string;
  guide_id: string;
  poi_id: string;
  custom_note: string | null;
  order_index: number;
  travel_guide_pois?: TravelGuidePOIData | null;
}

export function useCustomerTravelGuides() {
  return useQuery({
    queryKey: ['customer-travel-guides'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_travel_guides')
        .select(`
          *,
          crm_leads(first_name, last_name, email),
          customer_travel_guide_pois(count)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as (CustomerTravelGuide & { customer_travel_guide_pois: { count: number }[] })[];
    },
  });
}

export function useCustomerTravelGuide(guideId: string | undefined) {
  return useQuery({
    queryKey: ['customer-travel-guide', guideId],
    queryFn: async () => {
      if (!guideId) return null;
      
      const { data, error } = await supabase
        .from('customer_travel_guides')
        .select(`
          *,
          crm_leads(first_name, last_name, email),
          customer_travel_guide_pois(
            *,
            travel_guide_pois(
              id,
              name,
              municipality,
              region,
              rating,
              is_recommended,
              travel_guide_categories(name, icon)
            )
          )
        `)
        .eq('id', guideId)
        .single();
      
      if (error) throw error;
      return data as CustomerTravelGuide;
    },
    enabled: !!guideId,
  });
}

export function useCreateTravelGuide() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (guide: {
      crm_lead_id: string;
      title: string;
      intro_text?: string;
      municipality?: string;
      region?: string;
      viewing_trip_id?: string;
      sale_id?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('customer_travel_guides')
        .insert({
          ...guide,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-travel-guides'] });
      toast.success('Reisgids aangemaakt');
    },
    onError: (error) => {
      console.error('Error creating travel guide:', error);
      toast.error('Kon reisgids niet aanmaken');
    },
  });
}

export function useUpdateTravelGuide() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CustomerTravelGuide> & { id: string }) => {
      const { error } = await supabase
        .from('customer_travel_guides')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer-travel-guides'] });
      queryClient.invalidateQueries({ queryKey: ['customer-travel-guide', variables.id] });
      toast.success('Reisgids bijgewerkt');
    },
    onError: (error) => {
      console.error('Error updating travel guide:', error);
      toast.error('Kon reisgids niet bijwerken');
    },
  });
}

export function useDeleteTravelGuide() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (guideId: string) => {
      const { error } = await supabase
        .from('customer_travel_guides')
        .delete()
        .eq('id', guideId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-travel-guides'] });
      toast.success('Reisgids verwijderd');
    },
    onError: (error) => {
      console.error('Error deleting travel guide:', error);
      toast.error('Kon reisgids niet verwijderen');
    },
  });
}

export function useAddPOIToGuide() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ guideId, poiId, customNote, orderIndex }: {
      guideId: string;
      poiId: string;
      customNote?: string;
      orderIndex?: number;
    }) => {
      const { error } = await supabase
        .from('customer_travel_guide_pois')
        .insert({
          guide_id: guideId,
          poi_id: poiId,
          custom_note: customNote,
          order_index: orderIndex ?? 0,
        });
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer-travel-guide', variables.guideId] });
      toast.success('Locatie toegevoegd');
    },
    onError: (error: Error) => {
      if (error.message?.includes('duplicate')) {
        toast.error('Deze locatie is al toegevoegd');
      } else {
        console.error('Error adding POI to guide:', error);
        toast.error('Kon locatie niet toevoegen');
      }
    },
  });
}

export function useRemovePOIFromGuide() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ guideId, poiId }: { guideId: string; poiId: string }) => {
      const { error } = await supabase
        .from('customer_travel_guide_pois')
        .delete()
        .eq('guide_id', guideId)
        .eq('poi_id', poiId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer-travel-guide', variables.guideId] });
      toast.success('Locatie verwijderd');
    },
    onError: (error) => {
      console.error('Error removing POI from guide:', error);
      toast.error('Kon locatie niet verwijderen');
    },
  });
}

export function useUpdateGuidePOI() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, guideId, customNote, orderIndex }: {
      id: string;
      guideId: string;
      customNote?: string | null;
      orderIndex?: number;
    }) => {
      const updates: Record<string, unknown> = {};
      if (customNote !== undefined) updates.custom_note = customNote;
      if (orderIndex !== undefined) updates.order_index = orderIndex;
      
      const { error } = await supabase
        .from('customer_travel_guide_pois')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer-travel-guide', variables.guideId] });
    },
    onError: (error) => {
      console.error('Error updating guide POI:', error);
      toast.error('Kon locatie niet bijwerken');
    },
  });
}

export function useReorderGuidePOIs() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ guideId, poisOrder }: {
      guideId: string;
      poisOrder: { id: string; order_index: number }[];
    }) => {
      // Update all POIs in a batch
      const updates = poisOrder.map(({ id, order_index }) =>
        supabase
          .from('customer_travel_guide_pois')
          .update({ order_index })
          .eq('id', id)
      );
      
      await Promise.all(updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer-travel-guide', variables.guideId] });
    },
    onError: (error) => {
      console.error('Error reordering guide POIs:', error);
      toast.error('Kon volgorde niet bijwerken');
    },
  });
}
