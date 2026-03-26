import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useOrientationStats() {
  // Get count of users who completed the guide (all items completed)
  const { data: completedUsersCount = 0, isLoading } = useQuery({
    queryKey: ['orientation-completed-users'],
    queryFn: async () => {
      // Get total number of guide items
      const { count: totalItems } = await supabase
        .from('orientation_guide_items')
        .select('*', { count: 'exact', head: true })
        .eq('active', true);

      if (!totalItems) return 0;

      // Get users who have completed all items
      const { data: progressData } = await supabase
        .from('user_guide_progress')
        .select('user_id, completed_at')
        .not('completed_at', 'is', null);

      if (!progressData) return 0;

      // Count completions per user
      const userCompletions: Record<string, number> = {};
      progressData.forEach(row => {
        if (row.user_id) {
          userCompletions[row.user_id] = (userCompletions[row.user_id] || 0) + 1;
        }
      });

      // Count users who completed all items
      return Object.values(userCompletions).filter(count => count >= totalItems).length;
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  return {
    completedUsersCount,
    isLoading,
  };
}
