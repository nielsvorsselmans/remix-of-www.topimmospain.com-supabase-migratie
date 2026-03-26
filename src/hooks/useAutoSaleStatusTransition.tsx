import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Phase order for status progression
const PHASE_ORDER = ['reservatie', 'koopcontract', 'voorbereiding', 'akkoord', 'overdracht', 'nazorg'] as const;

// Document types
const KOOPCONTRACT_DOCUMENT_TYPES = [
  'floor_plan', 'specifications', 'building_permit',
  'cadastral_file', 'ownership_extract', 'bank_guarantee', 'purchase_contract'
] as const;

const VOORBEREIDING_DOCUMENT_TYPES = ['electrical_plan', 'measurement_plan'] as const;

// Map phase to sale status
const PHASE_TO_STATUS: Record<string, string> = {
  reservatie: 'reservatie',
  koopcontract: 'koopcontract',
  voorbereiding: 'voorbereiding',
  akkoord: 'akkoord',
  overdracht: 'overdracht',
  nazorg: 'nazorg',
};

const STATUS_LABELS: Record<string, string> = {
  reservatie: 'Reservatie',
  koopcontract: 'Koopcontract',
  voorbereiding: 'Voorbereiding',
  akkoord: 'Akkoord',
  overdracht: 'Overdracht',
  nazorg: 'Nazorg',
  afgerond: 'Afgerond',
};

// Fetch all data needed to determine auto-complete status
async function fetchSmartLinksData(saleId: string) {
  const [customersResult, documentsResult, financialResult] = await Promise.all([
    supabase
      .from('sale_customers')
      .select('id, crm_lead:crm_leads(personal_data_complete)')
      .eq('sale_id', saleId),
    
    supabase
      .from('sale_documents')
      .select('id, document_type, signed_by_customer_at, signed_by_developer_at')
      .eq('sale_id', saleId)
      .in('document_type', ['reservation_contract', ...KOOPCONTRACT_DOCUMENT_TYPES, ...VOORBEREIDING_DOCUMENT_TYPES]),
    
    Promise.all([
      supabase.from('sale_payments').select('id, paid_at').eq('sale_id', saleId).order('due_date', { ascending: true }),
      supabase.from('sale_invoices').select('id').eq('sale_id', saleId).limit(1),
      supabase.from('sale_extra_categories').select('id, is_included, gifted_by_tis, chosen_option_id').eq('sale_id', saleId),
      supabase.from('sale_extra_categories').select('id, name, is_included, options:sale_extra_options(id, attachments:sale_extra_attachments(id))').eq('sale_id', saleId),
      supabase.from('snagging_inspections').select('id').eq('sale_id', saleId).in('status', ['completed', 'sent_to_developer']),
      supabase.from('sale_choices').select('id, title, type, status, via_developer, quote_requested_at, quote_uploaded_at, decided_at, is_included, gifted_by_tis').eq('sale_id', saleId),
    ])
  ]);

  const customers = customersResult.data || [];
  const documents = documentsResult.data || [];
  const [paymentsRes, invoicesRes, extrasRes, extrasCategoriesRes, snaggingRes, choicesRes] = financialResult;

  // Process reservation status
  const completedCustomers = customers.filter(c => (c.crm_lead as any)?.personal_data_complete).length;
  const reservationStatus = {
    complete: customers.length > 0 && completedCustomers === customers.length,
    total: customers.length,
    completed: completedCustomers
  };

  // Process contract status
  const reservationContract = documents.find(d => d.document_type === 'reservation_contract');
  const contractStatus = {
    exists: !!reservationContract,
    signedByCustomer: !!reservationContract?.signed_by_customer_at,
    signedByDeveloper: !!reservationContract?.signed_by_developer_at
  };

  // Process koopcontract docs
  const koopcontractDocsStatus: Record<string, { exists: boolean; signedByCustomer?: boolean; signedByDeveloper?: boolean }> = {};
  KOOPCONTRACT_DOCUMENT_TYPES.forEach(type => {
    const doc = documents.find(d => d.document_type === type);
    koopcontractDocsStatus[type] = {
      exists: !!doc,
      signedByCustomer: type === 'purchase_contract' ? !!doc?.signed_by_customer_at : undefined,
      signedByDeveloper: type === 'purchase_contract' ? !!doc?.signed_by_developer_at : undefined
    };
  });

  // Process voorbereiding docs
  const voorbereidingDocsStatus: Record<string, { exists: boolean }> = {};
  VOORBEREIDING_DOCUMENT_TYPES.forEach(type => {
    const doc = documents.find(d => d.document_type === type);
    voorbereidingDocsStatus[type] = { exists: !!doc };
  });

  // Process payments
  const payments = paymentsRes.data || [];
  const firstPaid = payments.find(p => p.paid_at);
  const paymentStatus = { exists: payments.length > 0, isPaid: !!firstPaid?.paid_at };

  // Process invoices
  const invoicesStatus = { exists: !!(invoicesRes.data?.length) };

  // Process extras
  const extras = extrasRes.data || [];
  const hasDecisions = extras.some(cat => cat.is_included === true || cat.gifted_by_tis === true || cat.chosen_option_id !== null);
  const extrasStatus = { hasDecisions };

  // Process extras docs
  const extrasCategories = extrasCategoriesRes.data || [];
  const categoriesWithDocs = extrasCategories.filter(cat => {
    const options = cat.options as unknown as Array<{ id: string; attachments: Array<{ id: string }> }> | null;
    return Array.isArray(options) && options.some(opt => opt.attachments?.length > 0);
  }).length;
  const totalCategories = extrasCategories.filter(cat => !cat.is_included).length;
  const extrasDocsStatus = { complete: totalCategories > 0 && categoriesWithDocs === totalCategories };

  // Process snagging
  const snaggingStatus = { hasCompletedInspection: !!(snaggingRes.data?.length) };

  // Process sale choices for offerte tracking
  const allChoices = choicesRes.data || [];
  const quotableChoices = allChoices.filter(c => c.via_developer && !c.is_included && !c.gifted_by_tis);
  const choicesStatus = {
    hasQuotableChoices: quotableChoices.length > 0,
    allRequested: quotableChoices.length === 0 || quotableChoices.every(c => !!c.quote_requested_at),
    allReceived: quotableChoices.length === 0 || quotableChoices.every(c => !!c.quote_uploaded_at || !!c.decided_at),
    allDecided: quotableChoices.length === 0 || quotableChoices.every(c => !!c.decided_at),
  };

  return {
    reservationStatus, contractStatus, paymentStatus, invoicesStatus, extrasStatus,
    koopcontractDocsStatus, voorbereidingDocsStatus, extrasDocsStatus, snaggingStatus, choicesStatus
  };
}

// Determine if task is auto-complete based on template_key
function isAutoComplete(templateKey: string | null, smartLinks: Awaited<ReturnType<typeof fetchSmartLinksData>>): boolean {
  if (!templateKey) return false;

  switch (templateKey) {
    case 'res_koperdata': return smartLinks.reservationStatus.complete;
    case 'res_contract_upload': return smartLinks.contractStatus.exists;
    case 'res_klant_ondertekend': return smartLinks.contractStatus.signedByCustomer;
    case 'res_developer_ondertekend': return smartLinks.contractStatus.signedByDeveloper;
    case 'res_betaalplan': return smartLinks.paymentStatus.exists;
    case 'res_facturen': return smartLinks.invoicesStatus.exists;
    case 'res_extras': return smartLinks.extrasStatus.hasDecisions;
    case 'res_aanbetaling': return smartLinks.paymentStatus.isPaid;
    
    case 'koop_grondplan': return smartLinks.koopcontractDocsStatus['floor_plan']?.exists || false;
    case 'koop_specificaties': return smartLinks.koopcontractDocsStatus['specifications']?.exists || false;
    case 'koop_bouwvergunning': return smartLinks.koopcontractDocsStatus['building_permit']?.exists || false;
    case 'koop_kadastraal': return smartLinks.koopcontractDocsStatus['cadastral_file']?.exists || false;
    case 'koop_eigendomsregister': return smartLinks.koopcontractDocsStatus['ownership_extract']?.exists || false;
    case 'koop_bankgarantie': return smartLinks.koopcontractDocsStatus['bank_guarantee']?.exists || false;
    case 'koop_contract': return smartLinks.koopcontractDocsStatus['purchase_contract']?.exists || false;
    case 'koop_klant_ondertekend': return smartLinks.koopcontractDocsStatus['purchase_contract']?.signedByCustomer || false;
    case 'koop_developer_ondertekend': return smartLinks.koopcontractDocsStatus['purchase_contract']?.signedByDeveloper || false;
    
    case 'voorb_elektriciteit': return smartLinks.voorbereidingDocsStatus['electrical_plan']?.exists || false;
    case 'voorb_afmetingen': return smartLinks.voorbereidingDocsStatus['measurement_plan']?.exists || false;
    case 'voorb_extras_docs': return smartLinks.extrasDocsStatus.complete;
    
    // Akkoord phase - offerte tracking
    case 'akk_offertes_aangevraagd': return smartLinks.choicesStatus.allRequested;
    case 'akk_offertes_ontvangen': return smartLinks.choicesStatus.allReceived;
    case 'akk_offertes_beslissing': return smartLinks.choicesStatus.allDecided;

    case 'overd_snagging': return smartLinks.snaggingStatus.hasCompletedInspection;
    
    default: return false;
  }
}

export interface CheckAndUpdateStatusOptions {
  silent?: boolean;
}

export async function checkAndUpdateSaleStatus(
  saleId: string, 
  options: CheckAndUpdateStatusOptions = {}
): Promise<boolean> {
  const { silent = false } = options;
  
  try {
    // Fetch checklist items and smartLinks data in parallel
    const [itemsResult, sale, smartLinks] = await Promise.all([
      supabase
        .from("sale_milestones")
        .select("id, phase, completed_at, template_key")
        .eq("sale_id", saleId)
        .in("phase", PHASE_ORDER),
      supabase
        .from("sales")
        .select("status")
        .eq("id", saleId)
        .single()
        .then(r => r.data),
      fetchSmartLinksData(saleId)
    ]);

    const items = itemsResult.data;
    if (itemsResult.error) throw itemsResult.error;
    if (!items || items.length === 0 || !sale) return false;

    // Sync: write completed_at for auto-complete tasks that aren't yet marked in DB
    const itemsToSync = items.filter(
      item => !item.completed_at && item.template_key && isAutoComplete(item.template_key, smartLinks)
    );
    if (itemsToSync.length > 0) {
      const now = new Date().toISOString();
      await Promise.all(
        itemsToSync.map(item =>
          supabase
            .from("sale_milestones")
            .update({ completed_at: now })
            .eq("id", (item as any).id)
        )
      );
    }

    // Group items by phase and check completion (including autoComplete)
    const phaseCompletion: Record<string, { total: number; completed: number }> = {};
    
    for (const item of items) {
      const phase = item.phase as string;
      if (!phaseCompletion[phase]) {
        phaseCompletion[phase] = { total: 0, completed: 0 };
      }
      phaseCompletion[phase].total++;
      
      // Task is complete if manually completed OR auto-completed via smartLinks
      const isComplete = !!item.completed_at || isAutoComplete(item.template_key, smartLinks);
      if (isComplete) {
        phaseCompletion[phase].completed++;
      }
    }

    // Determine target status based on phase completion
    let targetStatus = 'afgerond';
    
    for (const phase of PHASE_ORDER) {
      const completion = phaseCompletion[phase];
      if (completion && completion.total > 0 && completion.completed < completion.total) {
        targetStatus = PHASE_TO_STATUS[phase];
        break;
      }
      if (!completion || completion.total === 0) {
        targetStatus = PHASE_TO_STATUS[phase];
        break;
      }
    }

    // Only auto-advance, never go backward
    const currentStatusIndex = PHASE_ORDER.indexOf(sale.status as typeof PHASE_ORDER[number]);
    const targetStatusIndex = targetStatus === 'afgerond' ? PHASE_ORDER.length : PHASE_ORDER.indexOf(targetStatus as typeof PHASE_ORDER[number]);

    if (targetStatusIndex > currentStatusIndex) {
      const { error: updateError } = await supabase
        .from("sales")
        .update({ status: targetStatus as "afgerond" | "akkoord" | "geannuleerd" | "koopcontract" | "nazorg" | "overdracht" | "reservatie" | "voorbereiding" })
        .eq("id", saleId);

      if (updateError) throw updateError;

      if (!silent) {
        toast.success(`Status bijgewerkt naar ${STATUS_LABELS[targetStatus] || targetStatus}`);
      }
      return true;
    }
    
    if (!silent) {
      toast.info("Status is al up-to-date");
    }
    return false;
  } catch (error) {
    console.error("Error checking/updating sale status:", error);
    if (!silent) {
      toast.error("Fout bij controleren status");
    }
    return false;
  }
}
