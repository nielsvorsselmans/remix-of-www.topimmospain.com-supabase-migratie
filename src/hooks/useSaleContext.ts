import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SaleContext {
  projectName: string | null;
  propertyTitle: string | null;
}

export function useSaleContext(saleId: string | null) {
  return useQuery<SaleContext>({
    queryKey: ["sale-context", saleId],
    enabled: !!saleId,
    staleTime: 1000 * 60 * 30, // cache 30 min
    queryFn: async () => {
      if (!saleId) return { projectName: null, propertyTitle: null };

      const { data, error } = await supabase
        .from("sales")
        .select("id, projects(name), properties(title)")
        .eq("id", saleId)
        .single();

      if (error || !data) return { projectName: null, propertyTitle: null };

      const project = data.projects as any;
      const property = data.properties as any;

      return {
        projectName: project?.name ?? null,
        propertyTitle: property?.title ?? null,
      };
    },
  });
}
