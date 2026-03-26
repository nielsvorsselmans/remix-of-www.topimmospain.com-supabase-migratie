import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ActivePage {
  page_slug: string;
  display_name: string;
  category: string | null;
}

export const useActivePages = () => {
  return useQuery({
    queryKey: ["active-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pages")
        .select("page_slug, display_name, category")
        .eq("active", true)
        .order("order_index");

      if (error) throw error;
      return data as ActivePage[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useIsPageActive = (pageSlug: string) => {
  const { data: activePages } = useActivePages();
  return activePages?.some(page => page.page_slug === pageSlug) ?? true; // default to true as fallback
};

export const useActiveSections = (pageSlug: string) => {
  return useQuery({
    queryKey: ["active-sections", pageSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_sections")
        .select("section_key, title, active")
        .eq("page_slug", pageSlug)
        .eq("active", true)
        .order("order_index");

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useIsSectionActive = (pageSlug: string, sectionKey: string) => {
  const { data: sections } = useActiveSections(pageSlug);
  return sections?.some(section => section.section_key === sectionKey) ?? true; // default to true as fallback
};
