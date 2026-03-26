import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCustomer } from "@/hooks/useEffectiveCustomer";

export interface TravelGuidePOI {
  id: string;
  name: string;
  municipality: string;
  region: string;
  rating: number | null;
  is_recommended: boolean;
  google_maps_url: string | null;
  description: string | null;
  tips: string | null;
  category: {
    name: string;
    icon: string;
    sort_order: number;
  };
  custom_note: string | null;
  order_index: number;
}

export interface GroupedCategory {
  name: string;
  icon: string;
  sort_order: number;
  pois: TravelGuidePOI[];
}

export interface MyTravelGuide {
  id: string;
  title: string;
  intro_text: string | null;
  municipality: string | null;
  region: string | null;
  categories: GroupedCategory[];
}

export function useMyTravelGuide() {
  const { crmLeadId, isLoading: isLoadingCustomer } = useEffectiveCustomer();

  const query = useQuery({
    queryKey: ["my-travel-guide", crmLeadId],
    queryFn: async (): Promise<MyTravelGuide | null> => {
      if (!crmLeadId) return null;

      const { data, error } = await supabase
        .from("customer_travel_guides")
        .select(`
          id, title, intro_text, municipality, region,
          customer_travel_guide_pois(
            id, custom_note, order_index, poi_id,
            travel_guide_pois(
              id, name, municipality, region, rating, is_recommended,
              google_maps_url, description, tips,
              travel_guide_categories(name, icon, sort_order)
            )
          )
        `)
        .eq("crm_lead_id", crmLeadId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching travel guide:", error);
        throw error;
      }

      if (!data || !data.customer_travel_guide_pois?.length) return data ? {
        id: data.id,
        title: data.title,
        intro_text: data.intro_text,
        municipality: data.municipality,
        region: data.region,
        categories: [],
      } : null;

      // Map and group POIs by category
      const poisFlat: TravelGuidePOI[] = data.customer_travel_guide_pois
        .filter((cp: any) => cp.travel_guide_pois)
        .map((cp: any) => {
          const poi = cp.travel_guide_pois;
          const cat = poi.travel_guide_categories;
          return {
            id: poi.id,
            name: poi.name,
            municipality: poi.municipality,
            region: poi.region,
            rating: poi.rating,
            is_recommended: poi.is_recommended,
            google_maps_url: poi.google_maps_url,
            description: poi.description,
            tips: poi.tips,
            category: {
              name: cat?.name ?? "Overig",
              icon: cat?.icon ?? "MapPin",
              sort_order: cat?.sort_order ?? 99,
            },
            custom_note: cp.custom_note,
            order_index: cp.order_index,
          };
        });

      // Group by category
      const categoryMap = new Map<string, GroupedCategory>();
      for (const poi of poisFlat) {
        const key = poi.category.name;
        if (!categoryMap.has(key)) {
          categoryMap.set(key, {
            name: poi.category.name,
            icon: poi.category.icon,
            sort_order: poi.category.sort_order,
            pois: [],
          });
        }
        categoryMap.get(key)!.pois.push(poi);
      }

      // Sort categories by sort_order, POIs by order_index
      const categories = Array.from(categoryMap.values())
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((cat) => ({
          ...cat,
          pois: cat.pois.sort((a, b) => a.order_index - b.order_index),
        }));

      return {
        id: data.id,
        title: data.title,
        intro_text: data.intro_text,
        municipality: data.municipality,
        region: data.region,
        categories,
      };
    },
    enabled: !!crmLeadId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    isLoading: isLoadingCustomer || query.isLoading,
  };
}
