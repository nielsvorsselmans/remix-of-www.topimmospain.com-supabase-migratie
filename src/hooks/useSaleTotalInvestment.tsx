import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSalePayments } from './useSalePayments';
import { useSalePurchaseCosts } from './useSalePurchaseCosts';
import { useSaleExtras } from './useSaleExtras';
import { round2 } from '@/lib/utils';

export interface SaleTotalInvestmentData {
  // Base price
  salePrice: number;
  vatOnSale: number;
  totalWithVat: number;
  
  // Payments
  payments: {
    total: number;
    paid: number;
    pending: number;
    overdue: number;
    remaining: number;
    isComplete: boolean;
  };
  
  // Purchase costs
  purchaseCosts: {
    total: number;
    paid: number;
    remaining: number;
  };
  
  // Extras - split by purchase channel
  extras: {
    // Via developer (10% BTW + 1.5% AJD)
    developerBase: number;
    developerBtw: number;
    developerAjd: number;
    developerTotalWithTax: number;
    // External (21% BTW)
    externalBase: number;
    externalBtw: number;
    externalTotalWithTax: number;
    // Combined
    base: number;
    totalWithTax: number;
    giftedValue: number;
    pendingDecision: number;
  };
  
  // Grand totals
  totals: {
    grandTotal: number;
    totalPaid: number;
    totalRemaining: number;
  };
}

interface CustomizationRequestForCalc {
  customer_decision: string | null;
  quote_amount: number | null;
  gifted_by_tis: boolean;
  via_developer: boolean;
  status: string | null;
}

export function useSaleTotalInvestment(saleId: string | undefined, salePrice: number) {
  const { data: payments = [], isLoading: paymentsLoading } = useSalePayments(saleId);
  const { data: purchaseCosts = [], isLoading: costsLoading } = useSalePurchaseCosts(saleId);
  const { data: extras = [], isLoading: extrasLoading } = useSaleExtras(saleId);
  
  // Fetch customization requests directly to avoid hook import issues
  const { data: customizationRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ['sale-customization-requests-for-calc', saleId],
    queryFn: async (): Promise<CustomizationRequestForCalc[]> => {
      if (!saleId) return [];
      const { data, error } = await supabase
        .from('sale_customization_requests')
        .select('customer_decision, quote_amount, gifted_by_tis, via_developer, status')
        .eq('sale_id', saleId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!saleId,
  });

  const data = useMemo((): SaleTotalInvestmentData => {
    // VAT calculations
    const vatRate = 0.10;
    const vatOnSale = round2(salePrice * vatRate);
    const totalWithVat = round2(salePrice + vatOnSale);

    // Payment calculations
    const paymentsTotal = round2(payments.reduce((sum, p) => sum + p.amount, 0));
    const paymentsPaid = round2(payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + (p.paid_amount || p.amount), 0));
    const paymentsPending = round2(payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0));
    const paymentsOverdue = round2(payments
      .filter(p => p.status === 'overdue')
      .reduce((sum, p) => sum + p.amount, 0));
    const paymentsRemaining = round2(totalWithVat - paymentsTotal);
    const isPaymentPlanComplete = Math.abs(paymentsRemaining) < 100;

    // Purchase costs calculations - EXCLUDE BTW and extra_work (those are in extras)
    const purchaseCostsWithoutExtras = purchaseCosts.filter(
      c => c.cost_type !== 'btw' && 
           c.cost_type !== 'extra_work_developer' && 
           c.cost_type !== 'extra_work_external'
    );
    const purchaseCostsTotal = round2(purchaseCostsWithoutExtras.reduce(
      (sum, c) => sum + (c.is_finalized ? (c.actual_amount || c.estimated_amount) : c.estimated_amount), 
      0
    ));
    const purchaseCostsPaid = round2(purchaseCostsWithoutExtras
      .filter(c => c.is_paid)
      .reduce((sum, c) => sum + (c.is_finalized ? (c.actual_amount || c.estimated_amount) : c.estimated_amount), 0));
    const purchaseCostsRemaining = round2(purchaseCostsTotal - purchaseCostsPaid);

    // Extras calculations - split by purchase channel
    const extrasToPayCategories = extras.filter(cat => !cat.is_included && !cat.gifted_by_tis && cat.chosen_option_id);
    
    // Via developer: 10% BTW + 1.5% AJD
    const developerExtras = extrasToPayCategories.filter(cat => cat.via_developer !== false);
    const developerBase = round2(developerExtras.reduce((sum, cat) => {
      const chosenOption = cat.options?.find(o => o.id === cat.chosen_option_id);
      return sum + (chosenOption?.price || 0);
    }, 0));

    // External: 21% BTW only
    const externalExtras = extrasToPayCategories.filter(cat => cat.via_developer === false);
    const externalBase = round2(externalExtras.reduce((sum, cat) => {
      const chosenOption = cat.options?.find(o => o.id === cat.chosen_option_id);
      return sum + (chosenOption?.price || 0);
    }, 0));

    // Accepted quotes (customization requests) - split by acquisition type
    const acceptedQuotes = customizationRequests.filter(
      r => (r.customer_decision === 'accepted' || r.status === 'approved') && r.quote_amount && !r.gifted_by_tis
    );
    
    // Quote via developer: 10% BTW + 1.5% AJD
    const quoteDeveloperBase = round2(acceptedQuotes
      .filter(q => q.via_developer)
      .reduce((sum, q) => sum + (q.quote_amount || 0), 0));
    
    // Quote external: 21% BTW only
    const quoteExternalBase = round2(acceptedQuotes
      .filter(q => !q.via_developer)
      .reduce((sum, q) => sum + (q.quote_amount || 0), 0));

    // Combined developer totals (extras + quotes)
    const totalDeveloperBase = round2(developerBase + quoteDeveloperBase);
    const totalDeveloperBtw = round2(totalDeveloperBase * 0.10);
    const totalDeveloperAjd = round2(totalDeveloperBase * 0.015);
    const totalDeveloperWithTax = round2(totalDeveloperBase + totalDeveloperBtw + totalDeveloperAjd);

    // Combined external totals (extras + quotes)
    const totalExternalBase = round2(externalBase + quoteExternalBase);
    const totalExternalBtw = round2(totalExternalBase * 0.21);
    const totalExternalWithTax = round2(totalExternalBase + totalExternalBtw);

    const extrasBase = round2(totalDeveloperBase + totalExternalBase);
    const extrasTotalWithTax = round2(totalDeveloperWithTax + totalExternalWithTax);

    // Gifted extras + gifted quotes
    const extrasGifted = round2(extras
      .filter(cat => cat.gifted_by_tis && cat.chosen_option_id)
      .reduce((sum, cat) => {
        const chosenOption = cat.options?.find(o => o.id === cat.chosen_option_id);
        return sum + (chosenOption?.price || 0);
      }, 0));
    
    const giftedQuotes = round2(customizationRequests
      .filter(r => (r.customer_decision === 'accepted' || r.status === 'approved') && r.gifted_by_tis && r.quote_amount)
      .reduce((sum, r) => sum + (r.quote_amount || 0), 0));
    
    const totalGiftedValue = round2(extrasGifted + giftedQuotes);

    const extrasPendingDecision = extras
      .filter(cat => !cat.is_included && !cat.gifted_by_tis && !cat.chosen_option_id && cat.options && cat.options.length > 0)
      .length;

    // Grand totals
    const grandTotal = round2(totalWithVat + purchaseCostsTotal + extrasTotalWithTax);
    const totalPaid = round2(paymentsPaid + purchaseCostsPaid);
    const totalRemaining = round2((paymentsPending + paymentsOverdue) + purchaseCostsRemaining + extrasTotalWithTax);

    return {
      salePrice,
      vatOnSale,
      totalWithVat,
      payments: {
        total: paymentsTotal,
        paid: paymentsPaid,
        pending: paymentsPending,
        overdue: paymentsOverdue,
        remaining: paymentsRemaining,
        isComplete: isPaymentPlanComplete,
      },
      purchaseCosts: {
        total: purchaseCostsTotal,
        paid: purchaseCostsPaid,
        remaining: purchaseCostsRemaining,
      },
      extras: {
        developerBase: totalDeveloperBase,
        developerBtw: totalDeveloperBtw,
        developerAjd: totalDeveloperAjd,
        developerTotalWithTax: totalDeveloperWithTax,
        externalBase: totalExternalBase,
        externalBtw: totalExternalBtw,
        externalTotalWithTax: totalExternalWithTax,
        base: extrasBase,
        totalWithTax: extrasTotalWithTax,
        giftedValue: totalGiftedValue,
        pendingDecision: extrasPendingDecision,
      },
      totals: {
        grandTotal,
        totalPaid,
        totalRemaining,
      },
    };
  }, [salePrice, payments, purchaseCosts, extras, customizationRequests]);

  return {
    data,
    isLoading: paymentsLoading || costsLoading || extrasLoading || requestsLoading,
  };
}
