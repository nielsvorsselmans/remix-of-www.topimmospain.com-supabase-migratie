import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PartnerListItem {
  id: string;
  name: string;
  company: string;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
  slug: string;
  referral_code: string;
  role: string;
  landing_page_title: string | null;
  landing_page_intro: string | null;
}

export function useAdminPartnersList() {
  return useQuery({
    queryKey: ['admin-partners-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partners')
        .select('id, name, company, email, phone, logo_url, slug, referral_code, role, landing_page_title, landing_page_intro')
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      return data as PartnerListItem[];
    },
  });
}
