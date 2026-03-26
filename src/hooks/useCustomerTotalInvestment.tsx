import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { round2 } from "@/lib/utils";
import { useOptionalActiveSale } from "@/contexts/ActiveSaleContext";

export interface PurchaseCostItem {
  id: string;
  label: string;
  cost_type: string;
  estimated_amount: number;
  actual_amount: number | null;
  is_finalized: boolean;
  due_moment: string;
  is_paid: boolean;
  is_optional: boolean;
  tooltip: string | null;
  payment_proof_url: string | null;
}

export interface ExtraItem {
  id: string;
  name: string;
  price: number;
  actualAmount: number | null;
  isFinalized: boolean;
  isPaid: boolean;
  isGifted: boolean;
  isIncluded: boolean;
  viaDeveloper: boolean;
  status: string;
}

export interface PaymentItem {
  id: string;
  title: string;
  amount: number;
  due_date: string | null;
  due_condition: string | null;
  status: string;
  is_paid: boolean;
  paid_at: string | null;
}

export interface ApprovedQuoteItem {
  id: string;
  title: string;
  description: string;
  amount: number;
  quoteUrl: string | null;
  viaDeveloper: boolean;
  isGifted: boolean;
  paymentDueMoment: string;
}

export interface TimelineItem {
  id?: string;
  label: string;
  amount: number;
  estimatedAmount?: number;
  type: 'payment' | 'cost' | 'extra' | 'quote';
  is_paid: boolean;
  is_finalized: boolean;
  is_editable?: boolean;
  paid_at: string | null;
  due_date: string | null;
  basePrice?: number;
  btwAmount?: number;
  ajdAmount?: number;
  viaDeveloper?: boolean;
  isGifted?: boolean;
  quoteUrl?: string;
  paymentProofUrl?: string | null;
}

export interface TimelineGroup {
  moment: string;
  momentLabel: string;
  items: TimelineItem[];
  subtotal: number;
  paidSubtotal: number;
}

export interface TotalInvestmentData {
  saleId: string;
  projectName: string;
  propertyDescription: string;
  
  salePrice: number;
  vatOnSale: number;
  salePriceWithVat: number;
  
  purchaseCosts: {
    items: PurchaseCostItem[];
    totalEstimated: number;
    totalFinalized: number;
    finalizedCount: number;
    totalCount: number;
  };
  
  extras: {
    items: ExtraItem[];
    developerTotal: number;
    developerBtw: number;
    developerAjd: number;
    developerTotalWithTax: number;
    externalTotal: number;
    externalBtw: number;
    externalTotalWithTax: number;
    totalToPay: number;
    totalGifted: number;
    totalIncluded: number;
    totalWithTax: number;
    // Combined extras + quotes
    quotesTotal: number;
    quotesBtw: number;
    quotesAjd: number;
    quotesTotalWithTax: number;
    combinedTotalWithTax: number; // extras + quotes combined
  };
  
  approvedQuotes: {
    items: ApprovedQuoteItem[];
    developerTotal: number;
    developerBtw: number;
    developerAjd: number;
    developerTotalWithTax: number;
    externalTotal: number;
    externalBtw: number;
    externalTotalWithTax: number;
    totalWithTax: number;
  };
  
  payments: {
    items: PaymentItem[];
    totalAmount: number;
    paidAmount: number;
  };
  
  totals: {
    purchasePrice: number;
    vatOnSale: number;
    purchasePriceWithVat: number;
    purchaseCosts: number;
    extrasToPay: number;
    extrasTax: number;
    grandTotal: number;
    totalPaid: number;
    totalRemaining: number;
  };
  
  timeline: TimelineGroup[];
}

const MOMENT_LABELS: Record<string, string> = {
  'vooraf': 'Vooraf',
  'na_akte': 'Na ondertekening koopovereenkomst',
  'bij_oplevering': 'Bij Oplevering',
  'na_oplevering': 'Na Oplevering',
};

const MOMENT_ORDER = ['vooraf', 'na_akte', 'bij_oplevering', 'na_oplevering'];

export function useCustomerTotalInvestment(overrideSaleId?: string) {
  const { activeSaleId: contextSaleId, isLoading: contextLoading } = useOptionalActiveSale();
  const saleId = overrideSaleId || contextSaleId;

  const query = useQuery({
    queryKey: ['customer-total-investment', saleId],
    staleTime: 10 * 60 * 1000, // 10 minuten - data verandert zelden
    gcTime: 30 * 60 * 1000, // 30 minuten in cache houden
    queryFn: async (): Promise<TotalInvestmentData | null> => {
      if (!saleId) return null;

      // Parallel fetch all data at once for maximum performance
      const [saleResult, purchaseCostsResult, extraCategoriesResult, paymentsResult, approvedQuotesResult] = await Promise.all([
        // Fetch sale details with project info
        supabase
          .from('sales')
          .select(`
            id,
            sale_price,
            property_description,
            projects:project_id (name)
          `)
          .eq('id', saleId)
          .maybeSingle(),
        
        // Fetch purchase costs
        supabase
          .from('sale_purchase_costs')
          .select('*')
          .eq('sale_id', saleId)
          .order('order_index'),
        
        // Fetch extras with chosen options
        supabase
          .from('sale_extra_categories')
          .select(`
            id,
            name,
            is_included,
            gifted_by_tis,
            via_developer,
            status,
            chosen_option_id,
            actual_amount,
            is_finalized,
            is_paid,
            options:sale_extra_options!sale_extra_options_category_id_fkey(id, name, price)
          `)
          .eq('sale_id', saleId),
        
        // Fetch payments
        supabase
          .from('sale_payments')
          .select('id, title, amount, due_date, due_condition, status, paid_at')
          .eq('sale_id', saleId)
          .eq('customer_visible', true)
          .order('order_index'),
        
        // Fetch approved customization requests (quotes)
        supabase
          .from('sale_customization_requests')
          .select('*')
          .eq('sale_id', saleId)
          .eq('status', 'approved')
          .eq('customer_decision', 'accepted')
          .gt('quote_amount', 0),
      ]);

      const sale = saleResult.data;
      if (!sale) return null;

      const purchaseCosts = purchaseCostsResult.data;
      const extraCategories = extraCategoriesResult.data;
      const payments = paymentsResult.data;
      const approvedQuotesData = approvedQuotesResult.data;

      // Process purchase costs
      const costItems: PurchaseCostItem[] = (purchaseCosts || []).map(c => ({
        id: c.id,
        label: c.label,
        cost_type: c.cost_type,
        estimated_amount: c.estimated_amount,
        actual_amount: c.actual_amount,
        is_finalized: c.is_finalized,
        due_moment: c.due_moment,
        is_paid: c.is_paid,
        is_optional: c.is_optional,
        tooltip: c.tooltip,
        payment_proof_url: c.payment_proof_url ?? null,
      }));

      // Filter out BTW from purchase costs - it's already included in salePriceWithVat
      const costItemsWithoutBtw = costItems.filter(c => c.cost_type !== 'btw');

      const totalEstimated = costItemsWithoutBtw.reduce((sum, c) => sum + c.estimated_amount, 0);
      const totalFinalized = costItemsWithoutBtw
        .filter(c => c.is_finalized)
        .reduce((sum, c) => sum + (c.actual_amount || c.estimated_amount), 0);
      const finalizedCount = costItemsWithoutBtw.filter(c => c.is_finalized).length;

      // Process extras
      const extraItems: ExtraItem[] = (extraCategories || []).map(cat => {
        const chosenOption = cat.options?.find((opt: any) => opt.id === cat.chosen_option_id);
        const estimatedPrice = chosenOption?.price || 0;
        return {
          id: cat.id,
          name: cat.name,
          price: estimatedPrice,
          actualAmount: (cat as any).actual_amount as number | null,
          isFinalized: (cat as any).is_finalized || false,
          isPaid: (cat as any).is_paid || false,
          isGifted: cat.gifted_by_tis || false,
          isIncluded: cat.is_included || false,
          viaDeveloper: cat.via_developer ?? true, // Default to via developer
          status: cat.status || 'pending',
        };
      }).filter(e => e.price > 0 || e.isIncluded);

      // Calculate extras split by purchase channel
      const extrasToPayItems = extraItems.filter(e => !e.isGifted && !e.isIncluded && e.price > 0);
      
      // Via developer: 10% BTW + 1.5% AJD
      const developerExtras = extrasToPayItems.filter(e => e.viaDeveloper);
      const developerTotal = round2(developerExtras.reduce((sum, e) => 
        sum + (e.isFinalized && e.actualAmount !== null ? e.actualAmount : e.price), 0));
      const developerBtw = round2(developerTotal * 0.10);
      const developerAjd = round2(developerTotal * 0.015);
      const developerTotalWithTax = round2(developerTotal + developerBtw + developerAjd);

      // External: 21% BTW only
      const externalExtras = extrasToPayItems.filter(e => !e.viaDeveloper);
      const externalTotal = round2(externalExtras.reduce((sum, e) => 
        sum + (e.isFinalized && e.actualAmount !== null ? e.actualAmount : e.price), 0));
      const externalBtw = round2(externalTotal * 0.21);
      const externalTotalWithTax = round2(externalTotal + externalBtw);

      const totalExtrasToPay = round2(developerTotal + externalTotal);
      const extrasTotalWithTax = round2(developerTotalWithTax + externalTotalWithTax);
      const extrasTax = round2(developerBtw + developerAjd + externalBtw);

      const totalExtrasGifted = round2(extraItems
        .filter(e => e.isGifted)
        .reduce((sum, e) => sum + (e.isFinalized && e.actualAmount !== null ? e.actualAmount : e.price), 0));

      // Process approved quotes (customization requests)
      const quoteItems: ApprovedQuoteItem[] = (approvedQuotesData || []).map(q => ({
        id: q.id,
        title: q.request_title,
        description: q.request_description || '',
        amount: q.quote_amount || 0,
        quoteUrl: q.quote_url,
        viaDeveloper: q.via_developer ?? true,
        isGifted: q.gifted_by_tis || false,
        paymentDueMoment: q.payment_due_moment || ((q.via_developer ?? true) ? 'bij_oplevering' : 'na_oplevering'),
      }));

      // Calculate quotes split by purchase channel
      const quoteDeveloperItems = quoteItems.filter(q => q.viaDeveloper);
      const quoteDeveloperTotal = round2(quoteDeveloperItems.reduce((sum, q) => sum + q.amount, 0));
      const quoteDeveloperBtw = round2(quoteDeveloperTotal * 0.10);
      const quoteDeveloperAjd = round2(quoteDeveloperTotal * 0.015);
      const quoteDeveloperTotalWithTax = round2(quoteDeveloperTotal + quoteDeveloperBtw + quoteDeveloperAjd);

      const quoteExternalItems = quoteItems.filter(q => !q.viaDeveloper);
      const quoteExternalTotal = round2(quoteExternalItems.reduce((sum, q) => sum + q.amount, 0));
      const quoteExternalBtw = round2(quoteExternalTotal * 0.21);
      const quoteExternalTotalWithTax = round2(quoteExternalTotal + quoteExternalBtw);

      const quotesTotalWithTax = round2(quoteDeveloperTotalWithTax + quoteExternalTotalWithTax);

      // Process payments
      const paymentItems: PaymentItem[] = (payments || []).map(p => ({
        id: p.id,
        title: p.title,
        amount: p.amount,
        due_date: p.due_date,
        due_condition: p.due_condition,
        status: p.status,
        is_paid: p.status === 'paid',
        paid_at: p.paid_at,
      }));

      const totalPayments = round2(paymentItems.reduce((sum, p) => sum + p.amount, 0));
      const paidPayments = round2(paymentItems
        .filter(p => p.is_paid)
        .reduce((sum, p) => sum + p.amount, 0));

      // Calculate VAT on sale price (always 10%)
      const salePrice = sale.sale_price || 0;
      const vatOnSale = round2(salePrice * 0.10);
      const salePriceWithVat = round2(salePrice + vatOnSale);

      // Calculate totals (using costItemsWithoutBtw to avoid double-counting BTW)
      const purchaseCostTotal = round2(costItemsWithoutBtw.reduce((sum, c) => 
        sum + (c.is_finalized ? (c.actual_amount || c.estimated_amount) : c.estimated_amount), 0));
      
      // Grand total now includes VAT on sale price + purchase costs + extras with tax + quotes with tax
      const grandTotal = round2(salePriceWithVat + purchaseCostTotal + extrasTotalWithTax + quotesTotalWithTax);

      // Paid costs (excluding BTW)
      const paidCosts = round2(costItemsWithoutBtw
        .filter(c => c.is_paid)
        .reduce((sum, c) => sum + (c.actual_amount || c.estimated_amount), 0));

      const totalPaid = round2(paidPayments + paidCosts);
      const totalRemaining = round2(grandTotal - totalPaid);

      // Build timeline
      const timelineMap = new Map<string, TimelineItem[]>();

      // Add payment items to timeline (map to moments)
      // First payment = vooraf (reservatie)
      // Last payment = bij_oplevering (restbedrag)
      // Middle payments = na_akte (aanbetalingen)
      paymentItems.forEach((p, idx) => {
        let moment: string;
        if (idx === 0) {
          moment = 'vooraf'; // Reservatie
        } else if (idx === paymentItems.length - 1) {
          moment = 'bij_oplevering'; // Restbedrag
        } else {
          moment = 'na_akte'; // Aanbetalingen
        }

        const items = timelineMap.get(moment) || [];
        items.push({
          label: p.title,
          amount: p.amount,
          type: 'payment',
          is_paid: p.is_paid,
          is_finalized: true,
          paid_at: p.paid_at,
          due_date: p.due_date,
        });
        timelineMap.set(moment, items);
      });

      // Add costs to timeline (excluding BTW which is shown separately with sale price)
      // Only show finalized costs in the customer timeline
      costItemsWithoutBtw
        .filter(c => c.is_finalized)
        .forEach(c => {
          const items = timelineMap.get(c.due_moment) || [];
          items.push({
            id: c.id,
            label: c.label,
            amount: c.actual_amount || c.estimated_amount,
            estimatedAmount: c.estimated_amount,
            type: 'cost',
            is_paid: c.is_paid,
            is_finalized: c.is_finalized,
            is_editable: true, // Always editable, even when finalized
            paid_at: null,
            due_date: null,
            paymentProofUrl: c.payment_proof_url,
          });
          timelineMap.set(c.due_moment, items);
        });

      // Add extras to timeline
      // Via developer = bij_oplevering (paid to developer with final payment)
      // External = na_oplevering (purchased independently after delivery)
      extraItems.filter(e => !e.isIncluded && e.price > 0).forEach(e => {
        // Determine moment based on via_developer and gifted status
        // Gifts go to bij_oplevering (they're "delivered" with the property)
        // Via developer = bij_oplevering, External = na_oplevering
        const moment = e.isGifted || e.viaDeveloper ? 'bij_oplevering' : 'na_oplevering';
        const items = timelineMap.get(moment) || [];
        
        // Calculate tax amounts
        let btwAmount = 0;
        let ajdAmount = 0;
        let totalWithTax = 0;
        
        if (!e.isGifted) {
          if (e.viaDeveloper) {
            // 10% BTW + 1.5% AJD
            btwAmount = round2(e.price * 0.10);
            ajdAmount = round2(e.price * 0.015);
            totalWithTax = round2(e.price + btwAmount + ajdAmount);
          } else {
            // 21% BTW only
            btwAmount = round2(e.price * 0.21);
            totalWithTax = round2(e.price + btwAmount);
          }
        }
        
        items.push({
          id: e.id,
          label: `Extra: ${e.name}`,
          amount: e.isGifted ? 0 : totalWithTax, // Gifts show €0
          basePrice: e.price,
          btwAmount,
          ajdAmount,
          viaDeveloper: e.viaDeveloper,
          isGifted: e.isGifted,
          type: 'extra',
          is_paid: e.isGifted || e.isPaid, // Gifts are always "paid"
          is_finalized: true,
          is_editable: false,
          paid_at: null,
          due_date: null,
        });
        timelineMap.set(moment, items);
      });

      // Add approved quotes to timeline
      quoteItems.filter(q => q.amount > 0 && !q.isGifted).forEach(q => {
        const moment = q.paymentDueMoment;
        const items = timelineMap.get(moment) || [];
        
        // Calculate tax amounts
        let btwAmount = 0;
        let ajdAmount = 0;
        let totalWithTax = 0;
        
        if (q.viaDeveloper) {
          // 10% BTW + 1.5% AJD
          btwAmount = round2(q.amount * 0.10);
          ajdAmount = round2(q.amount * 0.015);
          totalWithTax = round2(q.amount + btwAmount + ajdAmount);
        } else {
          // 21% BTW only
          btwAmount = round2(q.amount * 0.21);
          totalWithTax = round2(q.amount + btwAmount);
        }
        
        items.push({
          id: q.id,
          label: `Offerte: ${q.title}`,
          amount: totalWithTax,
          basePrice: q.amount,
          btwAmount,
          ajdAmount,
          viaDeveloper: q.viaDeveloper,
          isGifted: false,
          quoteUrl: q.quoteUrl || undefined,
          type: 'quote',
          is_paid: false,
          is_finalized: true,
          is_editable: false,
          paid_at: null,
          due_date: null,
        });
        timelineMap.set(moment, items);
      });

      // Sort items within each timeline group
      // Order: 1. Payments, 2. Fixed costs (finalized), 3. Editable costs, 4. Extras, 5. Quotes
      const sortTimelineItems = (items: TimelineItem[]): TimelineItem[] => {
        return [...items].sort((a, b) => {
          const getOrder = (item: TimelineItem) => {
            if (item.type === 'payment') return 0;
            if (item.type === 'cost' && item.is_finalized) return 1;
            if (item.type === 'cost' && !item.is_finalized) return 2;
            if (item.type === 'extra') return 3;
            if (item.type === 'quote') return 4;
            return 5;
          };
          return getOrder(a) - getOrder(b);
        });
      };

      // Sort timeline by moment order
      const timeline: TimelineGroup[] = MOMENT_ORDER
        .filter(m => timelineMap.has(m))
        .map(m => {
          const items = sortTimelineItems(timelineMap.get(m) || []);
          return {
            moment: m,
            momentLabel: MOMENT_LABELS[m] || m,
            items,
            subtotal: items.reduce((sum, i) => sum + i.amount, 0),
            paidSubtotal: items.filter(i => i.is_paid).reduce((sum, i) => sum + i.amount, 0),
          };
        });

      return {
        saleId,
        projectName: (sale.projects as any)?.name || 'Onbekend project',
        propertyDescription: sale.property_description || '',
        salePrice,
        vatOnSale,
        salePriceWithVat,
        purchaseCosts: {
          items: costItemsWithoutBtw, // Exclude BTW from items list
          totalEstimated,
          totalFinalized,
          finalizedCount,
          totalCount: costItemsWithoutBtw.length,
        },
        extras: {
          items: extraItems,
          developerTotal,
          developerBtw,
          developerAjd,
          developerTotalWithTax,
          externalTotal,
          externalBtw,
          externalTotalWithTax,
          totalToPay: totalExtrasToPay,
          totalGifted: totalExtrasGifted,
          totalIncluded: 0,
          totalWithTax: extrasTotalWithTax,
          // Combined extras + quotes
          quotesTotal: round2(quoteDeveloperTotal + quoteExternalTotal),
          quotesBtw: round2(quoteDeveloperBtw + quoteExternalBtw),
          quotesAjd: quoteDeveloperAjd,
          quotesTotalWithTax: quotesTotalWithTax,
          combinedTotalWithTax: round2(extrasTotalWithTax + quotesTotalWithTax),
        },
        approvedQuotes: {
          items: quoteItems,
          developerTotal: quoteDeveloperTotal,
          developerBtw: quoteDeveloperBtw,
          developerAjd: quoteDeveloperAjd,
          developerTotalWithTax: quoteDeveloperTotalWithTax,
          externalTotal: quoteExternalTotal,
          externalBtw: quoteExternalBtw,
          externalTotalWithTax: quoteExternalTotalWithTax,
          totalWithTax: quotesTotalWithTax,
        },
        payments: {
          items: paymentItems,
          totalAmount: totalPayments,
          paidAmount: paidPayments,
        },
        totals: {
          purchasePrice: salePrice,
          vatOnSale,
          purchasePriceWithVat: salePriceWithVat,
          purchaseCosts: purchaseCostTotal,
          extrasToPay: totalExtrasToPay,
          extrasTax,
          grandTotal,
          totalPaid,
          totalRemaining,
        },
        timeline,
      };
    },
    enabled: !!saleId && !contextLoading,
  });

  // isLoading moet true zijn wanneer:
  // 1. De query aan het laden is
  // 2. De context nog aan het laden is  
  // 3. De query disabled is omdat we nog geen saleId hebben
  const isQueryDisabled = !saleId && !contextLoading;
  
  return {
    ...query,
    isLoading: query.isLoading || contextLoading || isQueryDisabled,
  };
}
