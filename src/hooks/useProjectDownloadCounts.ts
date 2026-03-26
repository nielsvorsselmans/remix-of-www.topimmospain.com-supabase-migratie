import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DownloadCounts {
  projectCount: number;
  platformCount: number;
}

export function useProjectDownloadCounts(projectSlug: string) {
  return useQuery({
    queryKey: ["download-counts", projectSlug],
    queryFn: async (): Promise<DownloadCounts> => {
      // Query project-specific count
      const { count: projectCount } = await supabase
        .from("crm_leads")
        .select("*", { count: "exact", head: true })
        .eq("source_campaign", `brochure_${projectSlug}`);
      
      // Query platform-wide brochure downloads
      const { count: platformCount } = await supabase
        .from("crm_leads")
        .select("*", { count: "exact", head: true })
        .like("source_campaign", "brochure_%");
      
      return {
        projectCount: projectCount || 0,
        platformCount: platformCount || 0,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minuten cache
  });
}
