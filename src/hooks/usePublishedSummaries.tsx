import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PublishedSummary {
  id: string;
  summary_headline: string | null;
  summary_short: string | null;
  summary_full: string | null;
  summary_category: string | null;
  client_pseudonym: string | null;
  key_topics: string[] | null;
  start_time: string;
}

export function usePublishedSummaries(limit: number = 3) {
  return useQuery({
    queryKey: ["published-summaries", limit],
    queryFn: async (): Promise<PublishedSummary[]> => {
      const { data, error } = await supabase
        .from("published_conversation_summaries")
        .select("id, summary_headline, summary_short, summary_full, summary_category, client_pseudonym, key_topics, start_time")
        .order("start_time", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as PublishedSummary[];
    },
  });
}
