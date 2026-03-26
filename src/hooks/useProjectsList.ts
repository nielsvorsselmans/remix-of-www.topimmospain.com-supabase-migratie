import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectListItem {
  id: string;
  name: string;
  city: string | null;
  featured_image: string | null;
  price_from: number | null;
  price_to: number | null;
  region: string | null;
  display_title: string | null;
  property_types: string[] | null;
  status: string | null;
  images: any;
  created_at: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  completion_date: string | null;
}

export function useProjectsList(activeOnly = true) {
  return useQuery({
    queryKey: ["projects-list", activeOnly],
    queryFn: async (): Promise<ProjectListItem[]> => {
      let query = supabase
        .from("projects")
        .select("id, name, city, featured_image, price_from, price_to, region, display_title, property_types, status, images, created_at, location, latitude, longitude, completion_date")
        .order("name");

      if (activeOnly) {
        query = query.eq("active", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
