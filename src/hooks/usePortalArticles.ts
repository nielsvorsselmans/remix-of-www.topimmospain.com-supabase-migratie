import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PortalArticle {
  id: string;
  title: string;
  slug: string;
  intro: string;
  category: string;
  featured_image: string | null;
  portal_phases: string[] | null;
}

export function usePortalArticles(phase: string) {
  return useQuery({
    queryKey: ["portal-articles", phase],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, intro, category, featured_image, portal_phases")
        .eq("published", true)
        .contains("portal_phases", [phase])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as PortalArticle[];
    },
  });
}
