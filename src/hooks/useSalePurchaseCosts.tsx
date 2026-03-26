import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SalePurchaseCost {
  id: string;
  sale_id: string;
  cost_type: string;
  label: string;
  estimated_amount: number;
  actual_amount: number | null;
  is_finalized: boolean;
  due_moment: string;
  due_date: string | null;
  is_paid: boolean;
  paid_at: string | null;
  percentage: number | null;
  is_optional: boolean;
  tooltip: string | null;
  notes: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface StandardCostTemplate {
  cost_type: string;
  label: string;
  percentage?: number;
  fixed_amount?: number;
  due_moment: string;
  is_optional?: boolean;
  tooltip: string;
  order_index: number;
  auto_finalize?: boolean;
}

// Standard purchase costs based on calculator
export const STANDARD_PURCHASE_COSTS: StandardCostTemplate[] = [
  // BTW - altijd 10% op nieuwbouw
  {
    cost_type: 'btw',
    label: 'BTW (10%)',
    percentage: 10,
    due_moment: 'bij_oplevering',
    tooltip: 'Belasting over de Toegevoegde Waarde op nieuwbouw',
    order_index: 0,
    auto_finalize: true,
  },
  // VOORAF: Only 50% advocaatkosten (reservatie komt uit betalingen)
  {
    cost_type: 'advocaat_vooraf',
    label: 'Advocaatkosten (voorschot)',
    percentage: 0.605, // 50% van 1.21%
    due_moment: 'vooraf',
    tooltip: 'Juridische begeleiding: 50% voorschot',
    order_index: 1,
    auto_finalize: true,
  },
  // NA NOTARIËLE AKTE: volmacht, NIE (aanbetalingen komen uit betalingen)
  {
    cost_type: 'volmacht',
    label: 'Notariële volmacht',
    fixed_amount: 700,
    due_moment: 'na_akte',
    is_optional: true,
    tooltip: 'Optioneel - als u niet aanwezig kunt zijn bij notaris',
    order_index: 2,
  },
  {
    cost_type: 'nie',
    label: 'NIE-nummer',
    fixed_amount: 20,
    due_moment: 'na_akte',
    tooltip: 'Fiscaal nummer voor buitenlanders',
    order_index: 3,
  },
  // BIJ OPLEVERING: alle overige kosten (restbedrag komt uit betalingen)
  {
    cost_type: 'bankkosten',
    label: 'Bankkosten',
    fixed_amount: 200,
    due_moment: 'bij_oplevering',
    tooltip: 'Spaanse bankrekening openen',
    order_index: 4,
  },
  {
    cost_type: 'administratie',
    label: 'Administratiekosten',
    fixed_amount: 250,
    due_moment: 'bij_oplevering',
    tooltip: 'Overige administratieve kosten',
    order_index: 5,
  },
  {
    cost_type: 'ajd',
    label: 'Zegelbelasting (AJD)',
    percentage: 1.5,
    due_moment: 'bij_oplevering',
    tooltip: 'Actos Jurídicos Documentados - registratiebelasting',
    order_index: 6,
    auto_finalize: true,
  },
  {
    cost_type: 'notaris',
    label: 'Notariskosten',
    fixed_amount: 2000,
    due_moment: 'bij_oplevering',
    tooltip: 'Kosten voor notariële afhandeling',
    order_index: 7,
  },
  {
    cost_type: 'advocaat_oplevering',
    label: 'Advocaatkosten (saldo)',
    percentage: 0.605, // 50% van 1.21%
    due_moment: 'bij_oplevering',
    tooltip: 'Juridische begeleiding: 50% bij oplevering',
    order_index: 8,
    auto_finalize: true,
  },
  {
    cost_type: 'nutsvoorzieningen',
    label: 'Aansluiting nutsvoorzieningen',
    fixed_amount: 300,
    due_moment: 'bij_oplevering',
    tooltip: 'Water, elektriciteit, gas aansluitkosten',
    order_index: 9,
  },
  {
    cost_type: 'registratie',
    label: 'Registratiekantoor',
    fixed_amount: 800,
    due_moment: 'bij_oplevering',
    tooltip: 'Inschrijving eigendom in kadaster',
    order_index: 10,
  },
];

// Calculate estimated amounts based on sale price
export function calculateEstimatedCosts(salePrice: number): Array<{ cost_type: string; estimated_amount: number }> {
  return STANDARD_PURCHASE_COSTS.map(template => ({
    cost_type: template.cost_type,
    estimated_amount: template.percentage 
      ? Math.round(salePrice * (template.percentage / 100))
      : template.fixed_amount || 0,
  }));
}

// Fetch purchase costs for a sale
export function useSalePurchaseCosts(saleId: string | undefined) {
  return useQuery({
    queryKey: ['sale-purchase-costs', saleId],
    queryFn: async () => {
      if (!saleId) return [];
      
      const { data, error } = await supabase
        .from('sale_purchase_costs')
        .select('*')
        .eq('sale_id', saleId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return (data || []) as SalePurchaseCost[];
    },
    enabled: !!saleId,
  });
}

// Generate standard costs for a sale
export function useGeneratePurchaseCosts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, salePrice }: { saleId: string; salePrice: number }) => {
      // First check if costs already exist
      const { data: existing } = await supabase
        .from('sale_purchase_costs')
        .select('id')
        .eq('sale_id', saleId)
        .limit(1);

      if (existing && existing.length > 0) {
        throw new Error('Costs already exist for this sale');
      }

      const costsToInsert = STANDARD_PURCHASE_COSTS.map(template => ({
        sale_id: saleId,
        cost_type: template.cost_type,
        label: template.label,
        estimated_amount: template.percentage 
          ? Math.round(salePrice * (template.percentage / 100))
          : template.fixed_amount || 0,
        percentage: template.percentage || null,
        due_moment: template.due_moment,
        is_optional: template.is_optional || false,
        tooltip: template.tooltip,
        order_index: template.order_index,
        is_finalized: template.auto_finalize || false,
      }));

      const { error } = await supabase
        .from('sale_purchase_costs')
        .insert(costsToInsert);

      if (error) throw error;
    },
    onSuccess: (_, { saleId }) => {
      queryClient.invalidateQueries({ queryKey: ['sale-purchase-costs', saleId] });
      toast.success('Aankoopkosten gegenereerd');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Kon aankoopkosten niet genereren');
    },
  });
}

// Update a purchase cost
export function useUpdatePurchaseCost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: Partial<SalePurchaseCost> 
    }) => {
      const { error } = await supabase
        .from('sale_purchase_costs')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-purchase-costs'] });
    },
    onError: () => {
      toast.error('Kon kost niet bijwerken');
    },
  });
}

// Recalculate all costs based on new sale price
export function useRecalculatePurchaseCosts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, salePrice }: { saleId: string; salePrice: number }) => {
      const newEstimates = calculateEstimatedCosts(salePrice);

      // Update each cost that has a percentage
      for (const estimate of newEstimates) {
        const template = STANDARD_PURCHASE_COSTS.find(t => t.cost_type === estimate.cost_type);
        if (template?.percentage) {
          await supabase
            .from('sale_purchase_costs')
            .update({ 
              estimated_amount: estimate.estimated_amount,
              is_finalized: false // Reset finalized when recalculating
            })
            .eq('sale_id', saleId)
            .eq('cost_type', estimate.cost_type);
        }
      }
    },
    onSuccess: (_, { saleId }) => {
      queryClient.invalidateQueries({ queryKey: ['sale-purchase-costs', saleId] });
      toast.success('Kosten herberekend');
    },
    onError: () => {
      toast.error('Kon kosten niet herberekenen');
    },
  });
}

// Delete a purchase cost
export function useDeletePurchaseCost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sale_purchase_costs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-purchase-costs'] });
      toast.success('Kost verwijderd');
    },
    onError: () => {
      toast.error('Kon kost niet verwijderen');
    },
  });
}

// Add a custom purchase cost
export function useAddPurchaseCost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cost: Partial<SalePurchaseCost> & { sale_id: string; cost_type: string; label: string }) => {
      const { error } = await supabase
        .from('sale_purchase_costs')
        .insert([{
          sale_id: cost.sale_id,
          cost_type: cost.cost_type,
          label: cost.label,
          estimated_amount: cost.estimated_amount || 0,
          actual_amount: cost.actual_amount,
          is_finalized: cost.is_finalized || false,
          due_moment: cost.due_moment || 'bij_akte',
          is_optional: cost.is_optional || false,
          tooltip: cost.tooltip,
          order_index: cost.order_index || 99,
        }]);

      if (error) throw error;
    },
    onSuccess: (_, cost) => {
      queryClient.invalidateQueries({ queryKey: ['sale-purchase-costs', cost.sale_id] });
      toast.success('Kost toegevoegd');
    },
    onError: () => {
      toast.error('Kon kost niet toevoegen');
    },
  });
}
