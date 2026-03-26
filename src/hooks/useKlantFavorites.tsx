import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProjectsList } from "@/hooks/useProjectsList";

interface KlantFavorite {
  project_id: string;
  created_at: string;
  project: {
    id: string;
    name: string;
    city: string | null;
    featured_image: string | null;
    price_from: number | null;
  } | null;
}

export function useKlantFavorites(userId: string | null) {
  const { data: allProjects } = useProjectsList();

  const { data: favoriteIds, ...rest } = useQuery({
    queryKey: ["klant-favorite-ids", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("user_favorites")
        .select("project_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  // Enrich favorite IDs with project data from cache
  const data: KlantFavorite[] | undefined = useMemo(() => {
    if (!favoriteIds) return undefined;
    if (!allProjects) return favoriteIds.map(fav => ({
      project_id: fav.project_id,
      created_at: fav.created_at,
      project: null,
    }));

    const projectMap = new Map(allProjects.map(p => [p.id, p]));
    return favoriteIds.map(fav => {
      const project = projectMap.get(fav.project_id);
      return {
        project_id: fav.project_id,
        created_at: fav.created_at,
        project: project ? {
          id: project.id,
          name: project.name,
          city: project.city,
          featured_image: project.featured_image,
          price_from: project.price_from,
        } : null,
      };
    });
  }, [favoriteIds, allProjects]);

  return { data, ...rest };
}
