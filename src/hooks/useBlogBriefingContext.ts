import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BlogBriefingContext {
  popular_articles: { title: string; category: string; view_count: number }[];
  missing_topics: string[];
  existing_titles: string[];
}

export function useBlogBriefingContext() {
  return useQuery({
    queryKey: ["blog-briefing-context"],
    queryFn: async (): Promise<BlogBriefingContext> => {
      const [feedbackRes, existingRes] = await Promise.all([
        supabase
          .from("blog_feedback")
          .select("missing_info, suggested_topics")
          .not("missing_info", "is", null)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("blog_posts")
          .select("title")
          .eq("published", true)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      const popular_articles: { title: string; category: string; view_count: number }[] = [];

      const missingSet = new Set<string>();
      for (const fb of feedbackRes.data || []) {
        if (fb.missing_info) missingSet.add(fb.missing_info);
        if (fb.suggested_topics) {
          for (const topic of fb.suggested_topics) {
            missingSet.add(topic);
          }
        }
      }
      const missing_topics = Array.from(missingSet).slice(0, 10);
      const existing_titles = (existingRes.data || []).map((p: any) => p.title);

      return { popular_articles, missing_topics, existing_titles };
    },
    staleTime: 5 * 60 * 1000,
  });
}
