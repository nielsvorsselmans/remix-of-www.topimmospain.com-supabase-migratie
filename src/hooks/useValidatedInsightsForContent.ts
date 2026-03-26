import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ValidatedInsight {
  id: string;
  label: string;
  raw_quote: string | null;
  normalized_insight: string | null;
  refined_insight: string | null;
  theme: string | null;
  impact_score: string | null;
  frequency: number | null;
  suggested_archetype: string | null;
  icp_validated: boolean;
  icp_score: number | null;
  icp_persona_match: string[] | null;
  icp_validation_notes: string | null;
  validated_at: string | null;
  created_at: string | null;
}

/**
 * Fetch insights that are:
 * 1. ICP validated with score >= 3
 * 2. Don't have any blog posts generated yet
 */
export function useValidatedInsightsForContent() {
  return useQuery({
    queryKey: ["validated-insights-for-content"],
    queryFn: async () => {
      const { data: validatedInsights, error: insightsError } = await supabase
        .from("insights")
        .select("*")
        .eq("icp_validated", true)
        .gte("icp_score", 3)
        .order("icp_score", { ascending: false });

      if (insightsError) throw insightsError;

      // Get all insight IDs that already have a blog post
      const { data: blogPosts, error: blogError } = await supabase
        .from("blog_posts")
        .select("source_insight_id")
        .not("source_insight_id", "is", null);

      if (blogError) throw blogError;

      const insightIdsWithBlog = new Set(blogPosts?.map(b => b.source_insight_id) || []);
      const insightsWithoutBlog = validatedInsights?.filter(
        (insight) => !insightIdsWithBlog.has(insight.id)
      ) || [];

      return insightsWithoutBlog as ValidatedInsight[];
    },
  });
}

/**
 * Get count of validated insights ready for content generation
 */
export function useValidatedInsightsForContentCount() {
  return useQuery({
    queryKey: ["validated-insights-for-content-count"],
    queryFn: async () => {
      const { data: validatedInsights, error: insightsError } = await supabase
        .from("insights")
        .select("id")
        .eq("icp_validated", true)
        .gte("icp_score", 3);

      if (insightsError) throw insightsError;

      const { data: blogPosts, error: blogError } = await supabase
        .from("blog_posts")
        .select("source_insight_id")
        .not("source_insight_id", "is", null);

      if (blogError) throw blogError;

      const insightIdsWithBlog = new Set(blogPosts?.map(b => b.source_insight_id) || []);
      const count = validatedInsights?.filter(
        (insight) => !insightIdsWithBlog.has(insight.id)
      ).length || 0;

      return count;
    },
  });
}
