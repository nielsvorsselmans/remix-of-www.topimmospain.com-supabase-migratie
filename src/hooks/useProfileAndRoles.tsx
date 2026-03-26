import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

interface ProfileAndRolesResult {
  profile: Profile | null;
  roles: string[];
}

/**
 * Hook to fetch and cache user profile and roles.
 * Uses React Query for caching - roles rarely change so we cache for 10 minutes.
 */
export function useProfileAndRoles(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["profile-and-roles", userId],
    queryFn: async (): Promise<ProfileAndRolesResult> => {
      if (!userId) {
        return { profile: null, roles: [] };
      }

      // Fetch profile and roles in parallel
      const [profileResult, rolesResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single(),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId),
      ]);

      const profile = profileResult.data as Profile | null;
      const roles = rolesResult.data?.map((r) => r.role) || [];

      return { profile, roles };
    },
    enabled: !!userId,
    // Roles and profile rarely change - cache for 10 minutes
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
