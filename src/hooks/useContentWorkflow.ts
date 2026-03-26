import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Simplified workflow counts for the 3-tab Content Engine
export function useWorkflowCounts() {
  return useQuery({
    queryKey: ["workflow-counts"],
    queryFn: async () => {
      const [
        totalConversationsResult,
        unprocessedConversationsResult,
        questionsResult,
        insightsResult,
        blogDraftsResult,
        blogPublishedResult,
      ] = await Promise.all([
        supabase
          .from("conversations")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("conversations")
          .select("id", { count: "exact", head: true })
          .or("processed.is.null,processed.eq.false"),
        supabase
          .from("content_questions")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("insights")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("blog_posts")
          .select("id", { count: "exact", head: true })
          .eq("published", false),
        supabase
          .from("blog_posts")
          .select("id", { count: "exact", head: true })
          .eq("published", true),
      ]);

      return {
        totalConversations: totalConversationsResult.count || 0,
        unprocessedConversations: unprocessedConversationsResult.count || 0,
        questions: questionsResult.count || 0,
        insights: insightsResult.count || 0,
        blogDrafts: blogDraftsResult.count || 0,
        blogPublished: blogPublishedResult.count || 0,
      };
    },
  });
}
