import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CachedKeyword {
  keyword: string;
  search_volume: number | null;
  competition_level: string | null;
}

export function useSeoKeywordCache(keywords: string[]) {
  return useQuery({
    queryKey: ["seo-keyword-cache", keywords.sort().join(",")],
    queryFn: async () => {
      if (!keywords.length) return new Map<string, CachedKeyword>();

      const { data } = await (supabase as any)
        .from("seo_keyword_cache")
        .select("keyword, search_volume, competition_level")
        .in("keyword", keywords);

      const map = new Map<string, CachedKeyword>();
      for (const row of data || []) {
        map.set(row.keyword.toLowerCase(), row);
      }
      return map;
    },
    enabled: keywords.length > 0,
    staleTime: 1000 * 60 * 30, // 30 min
  });
}
