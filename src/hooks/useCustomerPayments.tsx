import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalActiveSale } from "@/contexts/ActiveSaleContext";

export interface CustomerPayment {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  percentage: number | null;
  due_date: string | null;
  due_condition: string | null;
  status: 'pending' | 'paid' | 'overdue';
  paid_at: string | null;
  paid_amount: number | null;
  proof_file_url: string | null;
  proof_uploaded_at: string | null;
  order_index: number;
}

export interface CustomerPaymentsSummary {
  payments: CustomerPayment[];
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paidCount: number;
  pendingCount: number;
  saleId: string | null;
  salePrice: number | null;
  vatAmount: number | null;
}

// Fetch customer-visible payments for the active sale
export function useCustomerPayments(overrideSaleId?: string) {
  const { activeSaleId: contextSaleId, isLoading: contextLoading } = useOptionalActiveSale();
  const saleId = overrideSaleId || contextSaleId;

  const query = useQuery({
    queryKey: ['customer-payments', saleId],
    queryFn: async (): Promise<CustomerPaymentsSummary> => {
      if (!saleId) {
        return {
          payments: [],
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          paidCount: 0,
          pendingCount: 0,
          saleId: null,
          salePrice: null,
          vatAmount: null,
        };
      }

      // Fetch sale and payments in parallel
      const [saleResult, paymentsResult] = await Promise.all([
        supabase
          .from('sales')
          .select('sale_price')
          .eq('id', saleId)
          .single(),
        supabase
          .from('sale_payments')
          .select('id, title, description, amount, percentage, due_date, due_condition, status, paid_at, paid_amount, proof_file_url, proof_uploaded_at, order_index')
          .eq('sale_id', saleId)
          .eq('customer_visible', true)
          .order('order_index', { ascending: true })
      ]);

      if (paymentsResult.error) throw paymentsResult.error;

      const salePrice = (!saleResult.error && saleResult.data?.sale_price) ? saleResult.data.sale_price : null;
      const vatAmount = salePrice ? salePrice * 0.10 : null;
      const paymentsList = (paymentsResult.data || []) as CustomerPayment[];

      // Calculate summary
      const totalAmount = paymentsList.reduce((sum, p) => sum + (p.amount || 0), 0);
      const paidAmount = paymentsList
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + (p.paid_amount || p.amount || 0), 0);
      const pendingAmount = totalAmount - paidAmount;
      const paidCount = paymentsList.filter(p => p.status === 'paid').length;
      const pendingCount = paymentsList.filter(p => p.status !== 'paid').length;

      return {
        payments: paymentsList,
        totalAmount,
        paidAmount,
        pendingAmount,
        paidCount,
        pendingCount,
        saleId,
        salePrice,
        vatAmount,
      };
    },
    enabled: !!saleId && !contextLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes - payment data doesn't change frequently
    gcTime: 15 * 60 * 1000, // 15 minutes cache
  });

  return {
    ...query,
    isLoading: query.isLoading || contextLoading,
  };
}
