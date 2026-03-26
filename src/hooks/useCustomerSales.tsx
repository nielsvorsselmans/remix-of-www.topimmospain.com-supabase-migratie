import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCustomer } from "./useEffectiveCustomer";

export interface CustomerSaleSummary {
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

// Fetch ALL sales for the current customer (supports multiple purchases)
export function useCustomerSales() {
  const { crmLeadId, isLoading: isLoadingCustomer } = useEffectiveCustomer();

  const query = useQuery({
    queryKey: ['customer-sales', crmLeadId],
    queryFn: async (): Promise<CustomerSaleSummary[]> => {
      if (!crmLeadId) return [];

      // Get all sale_ids for this crm_lead
      const { data: saleCustomers, error: scError } = await supabase
        .from('sale_customers')
        .select('sale_id')
        .eq('crm_lead_id', crmLeadId);

      if (scError || !saleCustomers?.length) return [];

      const saleIds = saleCustomers.map(sc => sc.sale_id);

      // Fetch all sales with project info
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
      return (sales || []) as CustomerSaleSummary[];
    },
    // Only run when we have a definitive crmLeadId (not while customer context is loading)
    // This prevents queries with stale/cached crmLeadId during preview switches
    enabled: !!crmLeadId && !isLoadingCustomer,
    // Sales data changes rarely - cache for 5 minutes
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    ...query,
    // Include customer loading state in the overall loading state
    isLoading: query.isLoading || isLoadingCustomer,
  };
}
