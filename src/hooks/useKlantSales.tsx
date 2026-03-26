import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface KlantSale {
  id: string;
  property_description: string | null;
  sale_price: number | null;
  status: 'geblokkeerd' | 'reservatie' | 'koopcontract' | 'voorbereiding' | 'akkoord' | 'overdracht' | 'nazorg' | 'afgerond' | 'geannuleerd';
  reservation_date: string | null;
  project: {
    id: string;
    name: string;
    city: string;
    featured_image: string | null;
  } | null;
}

export function useKlantSales(crmLeadId: string | undefined) {
  return useQuery({
    queryKey: ['klant-sales', crmLeadId],
    queryFn: async () => {
      if (!crmLeadId) return [];

      // Get sale_ids for this crm_lead
      const { data: saleCustomers, error: scError } = await supabase
        .from('sale_customers')
        .select('sale_id')
        .eq('crm_lead_id', crmLeadId);

      if (scError || !saleCustomers?.length) return [];

      const saleIds = saleCustomers.map(sc => sc.sale_id);

      // Fetch sales with project info
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select(`
          id,
          property_description,
          sale_price,
          status,
          reservation_date,
          project:projects(id, name, city, featured_image)
        `)
        .in('id', saleIds)
        .order('reservation_date', { ascending: false });

      if (salesError) throw salesError;
      return sales as KlantSale[];
    },
    enabled: !!crmLeadId,
  });
}
