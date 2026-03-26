import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Insight {
  id: string;
  label: string;
  type: string;
  raw_quote: string;
  normalized_insight: string;
  impact_score: string | null;
  theme: string | null;
  subtheme: string | null;
  frequency: number | null;
  created_at: string | null;
  updated_at: string | null;
  suggested_archetype: string | null;
  extraction_confidence: number | null;
  structured_questions: { question: string; search_intent: string }[] | null;
  // ICP validation fields
  icp_validated: boolean | null;
  icp_score: number | null;
  icp_persona_match: string[] | null;
  refined_insight: string | null;
  underlying_questions: string[] | null;
}

export interface InsightFilters {
  theme: string;
  impact: string;
}

export function useInsights(filters: InsightFilters) {
  return useQuery({
    queryKey: ['insights', filters.theme, filters.impact],
    queryFn: async () => {
      let query = supabase
        .from('insights')
        .select('*')
        .or('archived.is.null,archived.eq.false')
        .order('created_at', { ascending: false });

      if (filters.theme !== 'all') {
        query = query.eq('theme', filters.theme);
      }
      if (filters.impact !== 'all') {
        query = query.eq('impact_score', filters.impact);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        structured_questions: d.structured_questions as { question: string; search_intent: string }[] | null,
      })) as Insight[];
    },
  });
}

export interface LinkedConversation {
  conversation_id: string;
  conversations: {
    id: string;
    created_at: string | null;
    source_type: string;
  } | null;
}

export function useInsightConversations(insightId: string | null) {
  return useQuery({
    queryKey: ['insight-conversations', insightId],
    queryFn: async () => {
      if (!insightId) return [];
      
      const { data, error } = await supabase
        .from('conversation_insights')
        .select(`
          conversation_id,
          conversations (
            id,
            created_at,
            source_type
          )
        `)
        .eq('insight_id', insightId);

      if (error) throw error;
      return data as LinkedConversation[];
    },
    enabled: !!insightId,
  });
}
