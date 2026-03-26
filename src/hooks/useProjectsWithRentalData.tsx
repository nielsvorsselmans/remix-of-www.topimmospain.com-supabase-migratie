import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProjectsList } from "./useProjectsList";

interface RentalData {
  occupancy: number;
  average_daily_rate: number;
  annual_revenue: number;
}

export interface ProjectWithRental {
  id: string;
  name: string;
  city: string | null;
  region: string | null;
  price_from: number | null;
  price_to: number | null;
  featured_image: string | null;
  rentalData: RentalData | null;
  isFavorite: boolean;
  source: "favorite" | "advisor" | "both";
}

export function useProjectsWithRentalData() {
  const { user } = useAuth();
  const { data: cachedProjects } = useProjectsList();

  return useQuery({
    queryKey: ["projects-with-rental-data", user?.id, !!cachedProjects],
    queryFn: async (): Promise<{
      myProjects: ProjectWithRental[];
    }> => {
      if (!user?.id || !cachedProjects) {
        return { myProjects: [] };
      }

      // Projects come from useProjectsList cache — only fetch rental, favorites, crm_lead
      const [rentalResult, favoritesResult, crmLeadResult] = await Promise.all([
        supabase
          .from("rental_comparables_cache")
          .select("project_id, data"),
        supabase
          .from("user_favorites")
          .select("project_id")
          .eq("user_id", user.id),
        supabase
          .from("crm_leads")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (rentalResult.error) throw rentalResult.error;

      const projects = cachedProjects;
      const rentalCache = rentalResult.data;
      const favoriteIds = new Set(
        !favoritesResult.error && favoritesResult.data
          ? favoritesResult.data.map(f => f.project_id)
          : []
      );

      // Fetch assigned projects if we have a crm_lead_id
      const assignedIds = new Set<string>();
      if (crmLeadResult.data?.id) {
        const { data: assigned } = await supabase
          .from("customer_project_selections")
          .select("project_id")
          .eq("crm_lead_id", crmLeadResult.data.id);

        if (assigned) {
          assigned.forEach(a => assignedIds.add(a.project_id));
        }
      }

      // Create rental data map
      const rentalMap = new Map<string, RentalData>();
      rentalCache?.forEach(cache => {
        if (cache.project_id && cache.data) {
          const data = cache.data as any;
          rentalMap.set(cache.project_id, {
            occupancy: data.occupancy || data.average_occupancy || 65,
            average_daily_rate: data.average_daily_rate || data.adr || 100,
            annual_revenue: data.annual_revenue || data.estimated_annual_revenue || 0,
          });
        }
      });

      // Combine data - only include projects that are favorites OR assigned
      const myProjects: ProjectWithRental[] = (projects || [])
        .filter(project => favoriteIds.has(project.id) || assignedIds.has(project.id))
        .map(project => {
          const isFav = favoriteIds.has(project.id);
          const isAssigned = assignedIds.has(project.id);

          let source: "favorite" | "advisor" | "both";
          if (isFav && isAssigned) {
            source = "both";
          } else if (isFav) {
            source = "favorite";
          } else {
            source = "advisor";
          }

          return {
            ...project,
            rentalData: rentalMap.get(project.id) || null,
            isFavorite: isFav,
            source,
          };
        });

      return { myProjects };
    },
    staleTime: 5 * 60 * 1000,
  });
}
