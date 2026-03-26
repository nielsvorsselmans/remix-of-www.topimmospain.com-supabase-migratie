import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdvocaat } from "@/contexts/AdvocaatContext";

export function useAdvocaatRecord() {
  const { user } = useAuth();
  const { impersonatedAdvocaat, isImpersonating } = useAdvocaat();

  return useQuery({
    queryKey: ['advocaat-record', isImpersonating ? impersonatedAdvocaat?.id : user?.id],
    queryFn: async () => {
      if (isImpersonating && impersonatedAdvocaat) {
        const { data, error } = await supabase
          .from('advocaten')
          .select('id, name, company')
          .eq('id', impersonatedAdvocaat.id)
          .maybeSingle();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from('advocaten')
        .select('id, name, company')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isImpersonating ? !!impersonatedAdvocaat?.id : !!user?.id,
  });
}

// Template keys relevant for the advocaat per phase
// All milestone keys relevant for the advocaat (including overd_snagging as trigger)
const ADVOCAAT_MILESTONE_KEYS = [
  'res_advocaat', 'res_klant_ondertekend', 'res_developer_ondertekend',
  'res_aanbetaling',
  'koop_grondplan', 'koop_specificaties', 'koop_bouwvergunning', 'koop_kadastraal',
  'koop_eigendomsregister', 'koop_bankgarantie',
  'koop_klant_ondertekend', 'koop_developer_ondertekend',
  'overd_snagging',
  'overd_notariele_akte', 'overd_epc', 'overd_bewoonbaarheid',
];

// Keys per phase for filtering
export const ADVOCAAT_PHASE_KEYS: Record<string, string[]> = {
  reservatie: ['res_advocaat', 'res_klant_ondertekend', 'res_developer_ondertekend', 'res_aanbetaling'],
  koopcontract: [
    'koop_grondplan', 'koop_specificaties', 'koop_bouwvergunning', 'koop_kadastraal',
    'koop_eigendomsregister', 'koop_bankgarantie',
    'koop_klant_ondertekend', 'koop_developer_ondertekend',
  ],
  overdracht: ['overd_notariele_akte', 'overd_epc', 'overd_bewoonbaarheid'],
  nazorg: ['overd_notariele_akte', 'overd_epc', 'overd_bewoonbaarheid'],
};

export interface AdvocaatMilestone {
  id: string;
  sale_id: string;
  title: string;
  completed_at: string | null;
  template_key: string | null;
  phase: string | null;
  order_index: number;
  milestone_group: string | null;
}

export function useAdvocaatSales(advocaatId: string | undefined) {
  return useQuery({
    queryKey: ['advocaat-sales-full', advocaatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale_advocaten')
        .select(`
          id,
          sale_id,
          notes,
          created_at,
          sales:sale_id (
            id,
            status,
            sale_price,
            reservation_date,
            contract_date,
            notary_date,
            expected_delivery_date,
            completion_date,
            property_description,
            project:project_id (
              name,
              city
            ),
            customers:sale_customers (
              crm_lead:crm_lead_id (
                first_name,
                last_name,
                email,
                phone
              )
            )
          )
        `)
        .eq('advocaat_id', advocaatId!);
      if (error) throw error;

      // Fetch milestones for all sales in one query
      const saleIds = (data || []).map(d => d.sale_id).filter(Boolean) as string[];
      let milestonesBySale: Record<string, AdvocaatMilestone[]> = {};
      if (saleIds.length > 0) {
        const { data: milestones } = await supabase
          .from('sale_milestones')
          .select('id, sale_id, title, completed_at, template_key, phase, order_index, milestone_group')
          .in('sale_id', saleIds)
          .in('template_key', ADVOCAAT_MILESTONE_KEYS)
          .order('order_index', { ascending: true });
        if (milestones) {
          for (const m of milestones) {
            if (!milestonesBySale[m.sale_id]) milestonesBySale[m.sale_id] = [];
            milestonesBySale[m.sale_id].push(m as AdvocaatMilestone);
          }
        }
      }

      return (data || []).map(d => ({
        ...d,
        milestones: milestonesBySale[d.sale_id] || [],
      }));
    },
    enabled: !!advocaatId,
  });
}

export function useAdvocaatDossierDetail(saleId: string | undefined) {
  return useQuery({
    queryKey: ['advocaat-dossier-detail', saleId],
    queryFn: async (): Promise<any> => {
      const saleRes = await supabase
        .from('sales')
        .select('id, status, sale_price, reservation_date, contract_date, notary_date, expected_delivery_date, completion_date, property_description, project_id, project:project_id (name, city, featured_image)')
        .eq('id', saleId!)
        .single();

      const customersRes = await (supabase
        .from('sale_customers')
        .select('crm_lead:crm_lead_id (first_name, last_name, email, phone, nationality, date_of_birth, street_address, residence_city, postal_code, country)')
        .eq('sale_id', saleId!) as any);

      const docsRes: any = await supabase
        .from('sale_documents')
        .select('id, title, document_type, file_url, file_name, file_size, uploaded_at, description, partner_visible' as any)
        .eq('sale_id', saleId!)
        .eq('partner_visible', true)
        .order('uploaded_at', { ascending: false });

      const paymentsRes = await supabase
        .from('sale_payments')
        .select('id, title, description, amount, percentage, due_date, due_condition, status, paid_at, paid_amount, order_index')
        .eq('sale_id', saleId!)
        .order('order_index', { ascending: true });

      const costsRes = await supabase
        .from('sale_purchase_costs')
        .select('id, label, cost_type, estimated_amount, actual_amount, is_paid, paid_at, due_date, due_moment, percentage, order_index, notes, tooltip')
        .eq('sale_id', saleId!)
        .order('order_index', { ascending: true });

      if (saleRes.error) throw saleRes.error;

      return {
        sale: { ...saleRes.data, customers: customersRes.data || [] },
        documents: docsRes.data || [],
        payments: paymentsRes.data || [],
        purchaseCosts: costsRes.data || [],
      };
    },
    enabled: !!saleId,
  });
}

export function useAdvocaatNotes(saleId: string | undefined, advocaatId: string | undefined) {
  const queryClient = useQueryClient();

  const notesQuery = useQuery({
    queryKey: ['advocaat-notes', saleId, advocaatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale_advocaten')
        .select('id, notes')
        .eq('sale_id', saleId!)
        .eq('advocaat_id', advocaatId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!saleId && !!advocaatId,
  });

  const updateNotes = useMutation({
    mutationFn: async (notes: string) => {
      const { error } = await supabase
        .from('sale_advocaten')
        .update({ notes })
        .eq('sale_id', saleId!)
        .eq('advocaat_id', advocaatId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advocaat-notes', saleId, advocaatId] });
    },
  });

  return { notesQuery, updateNotes };
}
