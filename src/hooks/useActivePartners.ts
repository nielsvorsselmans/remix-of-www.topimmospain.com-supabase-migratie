import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ActivePartner {
  id: string;
  name: string;
  role: string;
  company: string;
  category: string;
  bio: string;
  description: string;
  image_url: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  order_index: number;
  office_locations: any;
}

export function useActivePartners() {
  return useQuery({
    queryKey: ['active-partners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partners')
        .select('id, name, role, company, category, bio, description, image_url, website, email, phone, order_index, office_locations')
        .eq('active', true)
        .eq('show_on_overview', true)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return (data || []) as ActivePartner[];
    },
    staleTime: 30 * 60 * 1000,
  });
}
