import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PostGeneration {
  id: string;
  social_post_id: string | null;
  blog_post_id: string;
  step: string;
  briefing_snapshot: Record<string, any> | null;
  prompts_snapshot: Record<string, any> | null;
  model_used: string | null;
  raw_ai_response: string | null;
  polish_result: string | null;
  enrichment_data: Record<string, any> | null;
  duration_ms: number | null;
  created_at: string;
}

/**
 * Fetch write-step generations that are linked to published social_posts,
 * joined with engagement data from social_posts.
 */
export interface PostGenerationWithEngagement extends PostGeneration {
  likes: number;
  comments: number;
  impressions: number;
  reach: number;
  post_content: string;
  post_created_at: string;
}

export function usePostGenerationsWithEngagement() {
  return useQuery({
    queryKey: ["post-generations-engagement"],
    queryFn: async () => {
      // Get all write-step generations that have a linked social_post
      const { data: generations, error: genError } = await supabase
        .from("social_post_generations")
        .select("*")
        .eq("step", "write")
        .not("social_post_id", "is", null)
        .order("created_at", { ascending: false });

      if (genError) throw genError;
      if (!generations || generations.length === 0) return [];

      // Get the linked social posts with engagement
      const postIds = [...new Set(generations.map((g: any) => g.social_post_id).filter(Boolean))];
      const { data: posts, error: postError } = await supabase
        .from("social_posts")
        .select("id, content, likes, comments, impressions, reach, created_at, status")
        .in("id", postIds);

      if (postError) throw postError;

      const postMap = new Map((posts || []).map((p: any) => [p.id, p]));

      return generations
        .map((gen: any) => {
          const post = postMap.get(gen.social_post_id);
          if (!post) return null;
          return {
            ...gen,
            likes: post.likes || 0,
            comments: post.comments || 0,
            impressions: post.impressions || 0,
            reach: post.reach || 0,
            post_content: post.content,
            post_created_at: post.created_at,
            post_status: post.status,
          } as PostGenerationWithEngagement;
        })
        .filter(Boolean) as PostGenerationWithEngagement[];
    },
  });
}

/** Fetch generation data for a single social_post_id */
export function usePostGenerationForPost(socialPostId: string | null) {
  return useQuery({
    queryKey: ["post-generation", socialPostId],
    enabled: !!socialPostId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_post_generations")
        .select("*")
        .eq("social_post_id", socialPostId!)
        .eq("step", "write")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as PostGeneration | null;
    },
  });
}
