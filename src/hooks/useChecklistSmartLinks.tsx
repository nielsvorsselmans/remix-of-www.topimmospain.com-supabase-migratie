import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Document types for koopcontract phase
const KOOPCONTRACT_DOCUMENT_TYPES = [
  'floor_plan',
  'specifications', 
  'building_permit',
  'cadastral_file',
  'ownership_extract',
  'bank_guarantee',
  'purchase_contract'
] as const;

// Document types for voorbereiding phase
const VOORBEREIDING_DOCUMENT_TYPES = [
  'electrical_plan',
  'measurement_plan',
] as const;

// Document types for overdracht phase
const OVERDRACHT_DOCUMENT_TYPES = [
  'notarial_deed',
  'epc_certificate',
  'habitability_certificate',
] as const;

export interface PaymentSummary {
  totalTerms: number;
  nextPayment: { amount: number; date: string } | null;
  paidAmount: number;
  totalAmount: number;
  paidPercentage: number;
  hasOverdue: boolean;
  firstPaidAt: string | null;
  firstPaidAmount: number | null;
}

export interface ExtrasSummary {
  totalCategories: number;
  decidedCount: number;
  openCount: number;
  giftedCount: number;
  totalValue: number;
}

export interface InvoicesSummary {
  total: number;
  sent: number;
  paid: number;
  openAmount: number;
}

export type ChoiceItemStatus = 'waiting_quote' | 'waiting_decision' | 'decided' | 'not_requested';

export interface ChoiceItem {
  id: string;
  title: string;
  status: ChoiceItemStatus;
}

export interface ChoicesSummary {
  total: number;
  allRequested: boolean;
  allReceived: boolean;
  allDecided: boolean;
  waitingForQuote: { count: number; titles: string[] };
  waitingForDecision: { count: number; titles: string[] };
  decided: number;
  items: ChoiceItem[];
}

export interface SmartLinksData {
  reservationStatus: { complete: boolean; total: number; completed: number };
  contractStatus: { exists: boolean; documentId: string | null; signedByCustomer: boolean; signedByDeveloper: boolean };
  paymentStatus: { exists: boolean; isPaid: boolean; paidAt: string | null };
  invoicesStatus: { exists: boolean };
  extrasStatus: { exists: boolean; hasDecisions: boolean };
  koopcontractDocsStatus: Record<string, { exists: boolean; signedByCustomer?: boolean; signedByDeveloper?: boolean }>;
  voorbereidingDocsStatus: Record<string, { exists: boolean }>;
  overdrachtDocsStatus: Record<string, { exists: boolean }>;
  extrasDocsStatus: { hasDocuments: boolean; completedCategories: number; totalCategories: number; complete: boolean };
  snaggingStatus: { hasCompletedInspection: boolean };
  notaryDateSet: boolean;
  notaryDateValue: string | null;
  paymentSummary: PaymentSummary;
  extrasSummary: ExtrasSummary;
  invoicesSummary: InvoicesSummary;
  choicesSummary: ChoicesSummary;
}

/**
 * Combined hook that fetches all smart link statuses in optimized queries
 * Reduces 10+ individual queries to 4 combined queries
 * Now uses crm_leads.personal_data_complete instead of reservation_details
 */
export function useChecklistSmartLinks(saleId: string): SmartLinksData {
  // Query 1: Customer data completion from crm_leads
  const { data: customerData } = useQuery({
    queryKey: ['checklist-customer-data', saleId],
    queryFn: async () => {
      const { data: customers } = await supabase
        .from('sale_customers')
        .select(`
          id,
          crm_lead:crm_leads(personal_data_complete)
        `)
        .eq('sale_id', saleId);

      if (!customers?.length) {
        return { 
          reservationStatus: { complete: false, total: 0, completed: 0 }
        };
      }

      const completed = customers.filter(c => (c.crm_lead as any)?.personal_data_complete).length;
      return {
        reservationStatus: {
          complete: customers.length > 0 && completed === customers.length,
          total: customers.length,
          completed
        }
      };
    },
  });

  // Query 2: All documents in one query (reservation, koopcontract, voorbereiding)
  const { data: documentData } = useQuery({
    queryKey: ['checklist-all-documents', saleId],
    queryFn: async () => {
      const allDocTypes = [
        'reservation_contract',
        ...KOOPCONTRACT_DOCUMENT_TYPES,
        ...VOORBEREIDING_DOCUMENT_TYPES,
        ...OVERDRACHT_DOCUMENT_TYPES
      ];

      const { data: documents } = await supabase
        .from('sale_documents')
        .select('id, document_type, signed_by_customer_at, signed_by_developer_at')
        .eq('sale_id', saleId)
        .in('document_type', allDocTypes);

      // Process reservation contract
      const reservationContract = documents?.find(d => d.document_type === 'reservation_contract');
      const contractStatus = {
        exists: !!reservationContract,
        documentId: reservationContract?.id || null,
        signedByCustomer: !!reservationContract?.signed_by_customer_at,
        signedByDeveloper: !!reservationContract?.signed_by_developer_at
      };

      // Process koopcontract documents
      const koopcontractDocsStatus: Record<string, { exists: boolean; signedByCustomer?: boolean; signedByDeveloper?: boolean }> = {};
      KOOPCONTRACT_DOCUMENT_TYPES.forEach(type => {
        const doc = documents?.find(d => d.document_type === type);
        koopcontractDocsStatus[type] = {
          exists: !!doc,
          signedByCustomer: type === 'purchase_contract' ? !!doc?.signed_by_customer_at : undefined,
          signedByDeveloper: type === 'purchase_contract' ? !!doc?.signed_by_developer_at : undefined
        };
      });

      // Process voorbereiding documents
      const voorbereidingDocsStatus: Record<string, { exists: boolean }> = {};
      VOORBEREIDING_DOCUMENT_TYPES.forEach(type => {
        const doc = documents?.find(d => d.document_type === type);
        voorbereidingDocsStatus[type] = { exists: !!doc };
      });

      // Process overdracht documents
      const overdrachtDocsStatus: Record<string, { exists: boolean }> = {};
      OVERDRACHT_DOCUMENT_TYPES.forEach(type => {
        const doc = documents?.find(d => d.document_type === type);
        overdrachtDocsStatus[type] = { exists: !!doc };
      });

      return { contractStatus, koopcontractDocsStatus, voorbereidingDocsStatus, overdrachtDocsStatus };
    },
  });

  // Query 3: Financial & Extras data combined
  const { data: financialData } = useQuery({
    queryKey: ['checklist-financial-extras', saleId],
    queryFn: async () => {
      const [paymentsResult, invoicesResult, extrasResult, extrasCategoriesResult, snaggingResult] = await Promise.all([
        supabase
          .from('sale_payments')
          .select('id, paid_at, amount, due_date')
          .eq('sale_id', saleId)
          .order('due_date', { ascending: true }),
        supabase
          .from('sale_invoices')
          .select('id, status, total_amount')
          .eq('sale_id', saleId),
        supabase
          .from('sale_extra_categories')
          .select('id, is_included, gifted_by_tis, chosen_option_id')
          .eq('sale_id', saleId),
        supabase
          .from('sale_extra_categories')
          .select(`
            id, name, is_included,
            options:sale_extra_options(
              id,
              attachments:sale_extra_attachments(id)
            )
          `)
          .eq('sale_id', saleId),
        supabase
          .from('snagging_inspections')
          .select('id, status')
          .eq('sale_id', saleId)
          .in('status', ['completed', 'sent_to_developer'])
      ]);

      const payments = paymentsResult.data;
      const hasPayments = !!payments?.length;
      const firstPaid = payments?.find(p => p.paid_at);
      const paymentStatus = {
        exists: hasPayments,
        isPaid: !!firstPaid?.paid_at,
        paidAt: firstPaid?.paid_at || null
      };

      const paidPayments = payments?.filter(p => p.paid_at) || [];
      const paidAmount = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalPaymentAmount = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const now = new Date();
      const unpaidFuture = payments?.filter(p => !p.paid_at && p.due_date) || [];
      const overdue = unpaidFuture.filter(p => new Date(p.due_date!) < now);
      const nextUnpaid = unpaidFuture.filter(p => new Date(p.due_date!) >= now).sort((a, b) => 
        new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()
      )[0];
      const paymentSummary: PaymentSummary = {
        totalTerms: payments?.length || 0,
        nextPayment: nextUnpaid ? { amount: nextUnpaid.amount || 0, date: nextUnpaid.due_date! } : null,
        paidAmount,
        totalAmount: totalPaymentAmount,
        paidPercentage: totalPaymentAmount > 0 ? Math.round((paidAmount / totalPaymentAmount) * 100) : 0,
        hasOverdue: overdue.length > 0,
        firstPaidAt: firstPaid?.paid_at || null,
        firstPaidAmount: firstPaid ? (firstPaid as any).amount || null : null,
      };

      const allInvoices = invoicesResult.data || [];
      const invoicesStatus = { exists: allInvoices.length > 0 };
      const invoicesSummary: InvoicesSummary = {
        total: allInvoices.length,
        sent: allInvoices.filter(i => (i as any).status === 'sent' || (i as any).status === 'paid').length,
        paid: allInvoices.filter(i => (i as any).status === 'paid').length,
        openAmount: allInvoices.filter(i => (i as any).status !== 'paid').reduce((sum, i) => sum + ((i as any).total_amount || 0), 0),
      };

      const extras = extrasResult.data;
      const extrasExists = !!extras?.length;
      const hasDecisions = extras?.some(cat => 
        cat.is_included === true || 
        cat.gifted_by_tis === true || 
        cat.chosen_option_id !== null
      ) || false;
      const extrasStatus = { exists: extrasExists, hasDecisions };
      
      const giftedCount = extras?.filter(cat => cat.gifted_by_tis === true).length || 0;
      const decidedCount = extras?.filter(cat => 
        cat.is_included === true || cat.gifted_by_tis === true || cat.chosen_option_id !== null
      ).length || 0;
      const extrasSummary: ExtrasSummary = {
        totalCategories: extras?.length || 0,
        decidedCount,
        openCount: (extras?.length || 0) - decidedCount,
        giftedCount,
        totalValue: 0,
      };

      const extrasCategories = extrasCategoriesResult.data;
      const categoriesWithDocs = extrasCategories?.filter(cat => {
        const options = cat.options as unknown as Array<{ id: string; attachments: Array<{ id: string }> }> | null;
        return Array.isArray(options) && options.some(opt => opt.attachments?.length > 0);
      }).length || 0;
      const totalCategories = extrasCategories?.filter(cat => !cat.is_included).length || 0;
      const extrasDocsStatus = {
        hasDocuments: categoriesWithDocs > 0,
        completedCategories: categoriesWithDocs,
        totalCategories,
        complete: totalCategories > 0 && categoriesWithDocs === totalCategories
      };

      const snaggingStatus = { hasCompletedInspection: !!snaggingResult.data?.length };

      return { paymentStatus, invoicesStatus, invoicesSummary, extrasStatus, extrasSummary, extrasDocsStatus, snaggingStatus, paymentSummary };
    },
  });

  // Query 4: Sale choices for offerte tracking (akkoord phase)
  // Query 5: Notary date status
  const { data: notaryData } = useQuery({
    queryKey: ['checklist-notary-date', saleId],
    queryFn: async () => {
      const { data: sale } = await supabase
        .from('sales')
        .select('notary_date')
        .eq('id', saleId)
        .single();
      return { notaryDateSet: !!sale?.notary_date, notaryDateValue: sale?.notary_date || null };
    },
  });
  const { data: choicesData } = useQuery({
    queryKey: ['checklist-choices', saleId],
    queryFn: async () => {
      const { data: choices } = await supabase
        .from('sale_choices')
        .select('id, title, type, status, via_developer, quote_requested_at, quote_uploaded_at, decided_at, is_included, gifted_by_tis')
        .eq('sale_id', saleId);

      const allChoices = choices || [];
      
      // Only track choices that need quotes (via developer, not included/gifted)
      const quotableChoices = allChoices.filter(c => 
        c.via_developer && !c.is_included && !c.gifted_by_tis
      );

      if (quotableChoices.length === 0) {
        return {
          choicesSummary: {
            total: 0,
            allRequested: true,
            allReceived: true,
            allDecided: true,
            waitingForQuote: { count: 0, titles: [] },
            waitingForDecision: { count: 0, titles: [] },
            decided: 0,
            items: [],
          } as ChoicesSummary
        };
      }

      const waitingForQuote = quotableChoices.filter(c => 
        c.quote_requested_at && !c.quote_uploaded_at && !c.decided_at
      );
      const waitingForDecision = quotableChoices.filter(c => 
        c.quote_uploaded_at && !c.decided_at
      );
      const decidedChoices = quotableChoices.filter(c => !!c.decided_at);
      
      const allRequested = quotableChoices.every(c => !!c.quote_requested_at);
      const allReceived = quotableChoices.every(c => !!c.quote_uploaded_at || !!c.decided_at);
      const allDecided = quotableChoices.every(c => !!c.decided_at);

      // Build items array with per-choice status
      const items: ChoiceItem[] = quotableChoices.map(c => {
        let status: ChoiceItemStatus = 'not_requested';
        if (c.decided_at) {
          status = 'decided';
        } else if (c.quote_uploaded_at) {
          status = 'waiting_decision';
        } else if (c.quote_requested_at) {
          status = 'waiting_quote';
        }
        return { id: c.id, title: c.title, status };
      });

      return {
        choicesSummary: {
          total: quotableChoices.length,
          allRequested,
          allReceived,
          allDecided,
          waitingForQuote: { count: waitingForQuote.length, titles: waitingForQuote.map(c => c.title) },
          waitingForDecision: { count: waitingForDecision.length, titles: waitingForDecision.map(c => c.title) },
          decided: decidedChoices.length,
          items,
        } as ChoicesSummary
      };
    },
  });

  const defaultChoicesSummary: ChoicesSummary = {
    total: 0, allRequested: true, allReceived: true, allDecided: true,
    waitingForQuote: { count: 0, titles: [] },
    waitingForDecision: { count: 0, titles: [] },
    decided: 0,
    items: [],
  };

  return {
    reservationStatus: customerData?.reservationStatus || { complete: false, total: 0, completed: 0 },
    contractStatus: documentData?.contractStatus || { exists: false, documentId: null, signedByCustomer: false, signedByDeveloper: false },
    paymentStatus: financialData?.paymentStatus || { exists: false, isPaid: false, paidAt: null },
    invoicesStatus: financialData?.invoicesStatus || { exists: false },
    extrasStatus: financialData?.extrasStatus || { exists: false, hasDecisions: false },
    koopcontractDocsStatus: documentData?.koopcontractDocsStatus || {},
    voorbereidingDocsStatus: documentData?.voorbereidingDocsStatus || {},
    overdrachtDocsStatus: documentData?.overdrachtDocsStatus || {},
    extrasDocsStatus: financialData?.extrasDocsStatus || { hasDocuments: false, completedCategories: 0, totalCategories: 0, complete: false },
    snaggingStatus: financialData?.snaggingStatus || { hasCompletedInspection: false },
    notaryDateSet: notaryData?.notaryDateSet || false,
    notaryDateValue: notaryData?.notaryDateValue || null,
    paymentSummary: financialData?.paymentSummary || { totalTerms: 0, nextPayment: null, paidAmount: 0, totalAmount: 0, paidPercentage: 0, hasOverdue: false, firstPaidAt: null, firstPaidAmount: null },
    extrasSummary: financialData?.extrasSummary || { totalCategories: 0, decidedCount: 0, openCount: 0, giftedCount: 0, totalValue: 0 },
    invoicesSummary: financialData?.invoicesSummary || { total: 0, sent: 0, paid: 0, openAmount: 0 },
    choicesSummary: choicesData?.choicesSummary || defaultChoicesSummary,
  };
}
