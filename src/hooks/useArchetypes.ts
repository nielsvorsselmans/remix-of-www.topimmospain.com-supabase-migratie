import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ContentArchetype {
  id: string;
  key: string;
  label: string;
  icon: string;
  description: string | null;
  prompt_key: string;
  is_active: boolean;
  sort_order: number;
  classification_rules: Record<string, unknown> | null;
}

export function useArchetypes() {
  return useQuery({
    queryKey: ['content-archetypes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_archetypes')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as ContentArchetype[];
    },
  });
}

export function useAllArchetypes() {
  return useQuery({
    queryKey: ['content-archetypes-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_archetypes')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as ContentArchetype[];
    },
  });
}
