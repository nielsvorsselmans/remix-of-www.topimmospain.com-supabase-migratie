import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffectiveCustomer } from "./useEffectiveCustomer";
import { toast } from "sonner";
import { trackEvent } from "@/lib/tracking";

export const useFavorites = () => {
  const { userId } = useEffectiveCustomer();

  return useQuery({
    queryKey: ["favorites", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      // Get favorite project IDs
      const { data: favoriteData, error: favError } = await supabase
        .from("user_favorites")
        .select("project_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (favError) throw favError;
      if (!favoriteData || favoriteData.length === 0) return [];

      const projectIds = favoriteData.map(f => f.project_id);

      // Use project_aggregations view instead of projects + properties join
      const { data: projects, error: projectsError } = await supabase
        .from("project_aggregations")
        .select("id, name, display_title, city, location, region, featured_image, price_from, price_to, property_types, available_count, total_count, min_bedrooms, max_bedrooms, min_bathrooms, max_bathrooms, min_area, max_area")
        .in("id", projectIds);

      if (projectsError) throw projectsError;
      if (!projects || projects.length === 0) return [];

      // Map to expected format
      const projectMap = new Map(
        projects.map(project => [
          project.id,
          {
            ...project,
            availableCount: project.available_count || 0,
            totalCount: project.total_count || 0,
            propertyTypes: project.property_types || [],
            minBedrooms: project.min_bedrooms || 0,
            maxBedrooms: project.max_bedrooms || 0,
            minBathrooms: project.min_bathrooms || 0,
            maxBathrooms: project.max_bathrooms || 0,
            minArea: project.min_area || 0,
            maxArea: project.max_area || 0,
          }
        ])
      );

      // Return projects in favorite order
      return favoriteData
        .map(f => projectMap.get(f.project_id))
        .filter(Boolean);
    },
    enabled: !!userId,
  });
};

export const useToggleFavorite = () => {
  const { user } = useAuth();
  const { isPreviewMode } = useEffectiveCustomer();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      // Block mutations in preview mode - admin should not modify preview customer's favorites
      if (isPreviewMode) {
        throw new Error("Niet mogelijk in preview mode");
      }
      if (!user?.id) throw new Error("User not authenticated");

      // Check if already favorited
      const { data: existing } = await supabase
        .from("user_favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("project_id", projectId)
        .maybeSingle();

      if (existing) {
        // Remove favorite
        const { error } = await supabase
          .from("user_favorites")
          .delete()
          .eq("id", existing.id);

        if (error) throw error;
        return { action: "removed" as const };
      } else {
        // Add favorite
        const { error } = await supabase
          .from("user_favorites")
          .insert({ user_id: user.id, project_id: projectId });

        if (error) throw error;
        return { action: "added" as const };
      }
    },
    onMutate: async (projectId) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ["favorites", user?.id] });
      await queryClient.cancelQueries({ queryKey: ["isFavorite", projectId] });

      // Snapshot previous values
      const previousFavorites = queryClient.getQueryData(["favorites", user?.id]);
      const previousIsFavorite = queryClient.getQueryData(["isFavorite", projectId]);

      // Optimistically update
      queryClient.setQueryData(["isFavorite", projectId], (old: boolean | undefined) => !old);

      return { previousFavorites, previousIsFavorite };
    },
    onSuccess: async (data, projectId) => {
      if (data.action === "added") {
        toast.success("Project toegevoegd aan favorieten");
      } else {
        toast.success("Project verwijderd uit favorieten");
      }

      // Track favorite action via central tracking system
      trackEvent(data.action === "added" ? "project_favorited" : "project_unfavorited", {
        project_id: projectId,
        action: data.action,
      });
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context) {
        queryClient.setQueryData(["favorites", user?.id], context.previousFavorites);
        queryClient.setQueryData(["isFavorite", variables], context.previousIsFavorite);
      }
      toast.error("Er ging iets mis. Probeer het opnieuw.");
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ["favorites", user?.id] });
    },
  });
};

export const useIsFavorite = (projectId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["isFavorite", projectId],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data } = await supabase
        .from("user_favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("project_id", projectId)
        .maybeSingle();

      return !!data;
    },
    enabled: !!user?.id,
  });
};

export const useFavoritesCount = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["favoritesCount", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from("user_favorites")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
  });
};
