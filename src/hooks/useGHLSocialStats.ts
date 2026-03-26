import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useRefreshPostEngagement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Niet ingelogd');

      const { data, error } = await supabase.functions.invoke('get-ghl-social-stats', {
        body: { action: 'refresh-posts' },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Onbekende fout');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['social-posts-all'] });
      toast.success(`${data.updated} van ${data.total} posts bijgewerkt`);
      if (data.errors?.length > 0) {
        console.warn('Some posts failed to update:', data.errors);
      }
    },
    onError: (error: Error) => {
      toast.error(`Fout bij ophalen statistieken: ${error.message}`);
    },
  });
}

export function useFetchOverviewStats() {
  return useMutation({
    mutationFn: async (accountIds: string[]) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Niet ingelogd');

      const { data, error } = await supabase.functions.invoke('get-ghl-social-stats', {
        body: { action: 'overview', accountIds },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Onbekende fout');
      return data.data;
    },
    onError: (error: Error) => {
      toast.error(`Fout bij ophalen overzicht: ${error.message}`);
    },
  });
}
