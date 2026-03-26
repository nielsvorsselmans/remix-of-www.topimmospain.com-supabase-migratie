import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ClassificationResult {
  success: boolean;
  message: string;
  processed: number;
  total: number;
  distribution?: Record<string, number>;
  results?: { id: string; archetype: string; success: boolean }[];
  error?: string;
}

export function useClassifyInsights() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<ClassificationResult> => {
      const { data, error } = await supabase.functions.invoke('classify-insights');

      if (error) {
        throw new Error(error.message || 'Classificatie mislukt');
      }

      return data as ClassificationResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insights'] });
    },
  });
}

export function useUnclassifiedCount() {
  return supabase
    .from('insights')
    .select('id', { count: 'exact', head: true })
    .is('suggested_archetype', null);
}
