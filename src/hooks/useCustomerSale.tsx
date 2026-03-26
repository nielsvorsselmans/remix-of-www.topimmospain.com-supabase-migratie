import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sale, SaleMilestone, SaleDocument } from "./useSales";
import { PhaseProgress } from "@/components/AankoopPhaseProgress";
import { useOptionalActiveSale } from "@/contexts/ActiveSaleContext";

export interface CustomerSale extends Sale {
  milestones: SaleMilestone[];
  documents: SaleDocument[];
  milestonesByPhase: Record<string, SaleMilestone[]>;
  phaseProgress: Record<string, PhaseProgress>;
}

// Fetch the active sale for current customer with milestones and documents
export function useCustomerSale(overrideSaleId?: string) {
  const queryClient = useQueryClient();
  const { activeSaleId: contextSaleId, isLoading: contextIsLoading } = useOptionalActiveSale();
  
  const saleId = overrideSaleId || contextSaleId;

  // Subscribe to realtime updates for sale_milestones
  useEffect(() => {
    if (!saleId) return;

    const channel = supabase
      .channel('customer-sale-milestones')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sale_milestones'
        },
        () => {
          // Invalidate query to refetch data
          queryClient.invalidateQueries({ queryKey: ['customer-sale-detail', saleId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [saleId, queryClient]);

  const query = useQuery({
    queryKey: ['customer-sale-detail', saleId],
    queryFn: async (): Promise<CustomerSale | null> => {
      if (!saleId) return null;

      // Fetch the sale with project and property directly by ID
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select(`
          *,
          project:projects(id, name, city, featured_image),
          property:properties(id, property_type, bedrooms, bathrooms)
        `)
        .eq('id', saleId)
        .single();

      if (saleError) throw saleError;

      // Fetch all milestones (customer sees all tasks, filtered by customer_visible)
      const { data: milestones, error: milestonesError } = await supabase
        .from('sale_milestones')
        .select('*')
        .eq('sale_id', saleId)
        .order('order_index', { ascending: true });

      if (milestonesError) throw milestonesError;

      // Fetch customer-visible documents
      const { data: documents, error: documentsError } = await supabase
        .from('sale_documents')
        .select('*')
        .eq('sale_id', saleId)
        .eq('customer_visible', true)
        .order('uploaded_at', { ascending: false });

      if (documentsError) throw documentsError;

      // Filter milestones that are visible to customers and group by phase
      const visibleMilestones = (milestones || []).filter(m => m.customer_visible);
      const milestonesByPhase = visibleMilestones.reduce((acc, m) => {
        const phase = m.phase || 'other';
        if (!acc[phase]) acc[phase] = [];
        acc[phase].push(m);
        return acc;
      }, {} as Record<string, SaleMilestone[]>);

      // Calculate progress per phase
      const phaseProgress = Object.entries(milestonesByPhase).reduce((acc, [phase, items]) => {
        const completedItems = items.filter(m => m.completed_at);
        const lastCompletedAt = completedItems.length > 0
          ? completedItems
              .map(m => m.completed_at)
              .filter(Boolean)
              .sort()
              .pop() || null
          : null;

        acc[phase] = {
          total: items.length,
          completed: completedItems.length,
          isComplete: items.length > 0 && items.every(m => m.completed_at),
          completedAt: lastCompletedAt
        };
        return acc;
      }, {} as Record<string, PhaseProgress>);

      return {
        ...sale,
        milestones: visibleMilestones,
        documents: documents || [],
        milestonesByPhase,
        phaseProgress,
      } as CustomerSale;
    },
    enabled: !!saleId,
  });

  // Optimized: only show loading if we're actually fetching AND have no cached data
  const hasCachedData = query.data !== undefined;
  const isActuallyLoading = query.isFetching && !hasCachedData;
  
  return {
    ...query,
    isLoading: isActuallyLoading || (!overrideSaleId && contextIsLoading && !hasCachedData),
  };
}
