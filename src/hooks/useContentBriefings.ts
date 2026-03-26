import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ContentBriefing {
  id: string;
  status: string;
  source_question_id: string | null;
  source_insight_id: string | null;
  source_type: string;
  source_text: string;
  category: string;
  briefing_data: any;
  raw_brainstorm: string | null;
  created_at: string;
  updated_at: string;
}

export function useContentBriefings() {
  return useQuery({
    queryKey: ["content-briefings"],
    queryFn: async (): Promise<ContentBriefing[]> => {
      const { data, error } = await supabase
        .from("content_briefings" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ContentBriefing[];
    },
  });
}

export function useContentBriefing(id: string | null) {
  return useQuery({
    queryKey: ["content-briefing", id],
    enabled: !!id,
    queryFn: async (): Promise<ContentBriefing | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("content_briefings" as any)
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as ContentBriefing;
    },
  });
}
