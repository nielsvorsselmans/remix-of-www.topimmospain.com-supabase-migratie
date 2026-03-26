import { isToday, isTomorrow, isThisWeek, isPast } from "date-fns";
import type { ChecklistKey } from "@/hooks/useSaleChecklist";
import type { SaleChecklistItem } from "@/hooks/useSaleChecklist";
import type { SmartLinksData } from "@/hooks/useChecklistSmartLinks";
import type { TaskPriority } from "@/hooks/useUpdateChecklistItem";

// Priority configuration
export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bgColor: string }> = {
  high: { label: 'Hoog', color: 'text-red-700', bgColor: 'bg-red-100 border-red-200' },
  medium: { label: 'Medium', color: 'text-amber-700', bgColor: 'bg-amber-100 border-amber-200' },
  low: { label: 'Laag', color: 'text-slate-600', bgColor: 'bg-slate-100 border-slate-200' },
};

// Mapping checklist keys to document types and labels
export const CHECKLIST_DOCUMENT_MAPPING: Record<string, { documentType: string; label: string; isContract?: boolean }> = {
  // Reservatie phase
  'res_contract_upload': { documentType: 'reservation_contract', label: 'Reservatiecontract', isContract: true },
  // Koopcontract phase
  'koop_grondplan': { documentType: 'floor_plan', label: 'Grondplan woning' },
  'koop_specificaties': { documentType: 'specifications', label: 'Specificatielijst' },
  'koop_bouwvergunning': { documentType: 'building_permit', label: 'Bouwvergunning' },
  'koop_kadastraal': { documentType: 'cadastral_file', label: 'Kadastrale fiche' },
  'koop_eigendomsregister': { documentType: 'ownership_extract', label: 'Uittreksel eigendomsregister' },
  'koop_bankgarantie': { documentType: 'bank_guarantee', label: 'Bankgarantiedocumenten' },
  'koop_contract': { documentType: 'purchase_contract', label: 'Koopovereenkomst', isContract: true },
  // Voorbereiding phase
  'voorb_elektriciteit': { documentType: 'electrical_plan', label: 'Elektriciteitsplan' },
  'voorb_afmetingen': { documentType: 'measurement_plan', label: 'Afmetingenplan' },
  // Overdracht phase
  'overd_notariele_akte': { documentType: 'notarial_deed', label: 'Notariële akte' },
  'overd_epc': { documentType: 'epc_certificate', label: 'EPC' },
  'overd_bewoonbaarheid': { documentType: 'habitability_certificate', label: 'Bewoonbaarheidscertificaat' },
};

// Tasks that can be manually toggled even when auto-complete is active
export const MANUALLY_TOGGLEABLE_TASKS: ChecklistKey[] = ['res_extras'];

// Prerequisite map: task → required predecessor task
export const TASK_PREREQUISITES: Partial<Record<ChecklistKey, ChecklistKey>> = {
  // Reservatie
  'res_contract_upload': 'res_koperdata',
  'res_advocaat': 'res_contract_upload',
  'res_klant_ondertekend': 'res_contract_upload',
  'res_developer_ondertekend': 'res_klant_ondertekend',
  'res_facturen': 'res_betaalplan',

  // Koopcontract
  'koop_contract': 'koop_bankgarantie',
  'koop_klant_ondertekend': 'koop_contract',
  'koop_developer_ondertekend': 'koop_contract',
  'res_aanbetaling': 'koop_bankgarantie',

  // Voorbereiding → Akkoord (cross-fase)
  'akk_elektriciteit': 'voorb_elektriciteit',
  'akk_grondplan': 'voorb_afmetingen',
  'akk_extras': 'voorb_extras_docs',

  // Akkoord
  'akk_offertes_ontvangen': 'akk_offertes_aangevraagd',
  'akk_offertes_beslissing': 'akk_offertes_ontvangen',
  'akk_definitief': 'akk_extras',
  'akk_doorgegeven': 'akk_definitief',

  // Overdracht
  'overd_snagging': 'overd_notaris_datum',

  // Nazorg
  'nazorg_nutsvoorzieningen': 'overd_notariele_akte',
  'nazorg_financieel': 'nazorg_followup',
  'nazorg_archivering': 'nazorg_financieel',
};

// Check if a task is blocked by an incomplete prerequisite (static + dynamic)
export function isTaskBlocked(
  templateKey: ChecklistKey | null,
  allItems: SaleChecklistItem[],
  smartLinks: SmartLinksData,
  taskId?: string
): { blocked: boolean; blockedByLabel: string | null } {
  // 1. Static prerequisites (template_key based)
  if (templateKey) {
    const prerequisiteKey = TASK_PREREQUISITES[templateKey];
    if (prerequisiteKey) {
      const prerequisiteItem = allItems.find(i => i.template_key === prerequisiteKey);
      if (prerequisiteItem) {
        const smartStatus = getSmartStatus(prerequisiteKey, smartLinks);
        const isPrerequisiteComplete = !!prerequisiteItem.completed_at || smartStatus.autoComplete;
        if (!isPrerequisiteComplete) {
          return { blocked: true, blockedByLabel: prerequisiteItem.title };
        }
      }
    }
  }

  // 2. Dynamic prerequisites (prerequisite_for based)
  if (taskId) {
    const dynamicPrereqs = allItems.filter(
      i => i.prerequisite_for === taskId && !i.completed_at
    );
    if (dynamicPrereqs.length > 0) {
      return { blocked: true, blockedByLabel: dynamicPrereqs[0].title };
    }
  }

  return { blocked: false, blockedByLabel: null };
}

export type DeadlineUrgency = 'overdue' | 'today' | 'tomorrow' | 'this_week' | 'later' | 'none';

export function getDeadlineUrgency(targetDate: string | null): DeadlineUrgency {
  if (!targetDate) return 'none';
  const date = new Date(targetDate);
  if (isPast(date) && !isToday(date)) return 'overdue';
  if (isToday(date)) return 'today';
  if (isTomorrow(date)) return 'tomorrow';
  if (isThisWeek(date)) return 'this_week';
  return 'later';
}

// Determine if a task should be auto-completed based on smart links
export function getSmartStatus(templateKey: ChecklistKey, smartLinks: SmartLinksData) {
  // Reservatie phase
  switch (templateKey) {
    case 'res_koperdata':
      return {
        autoComplete: smartLinks.reservationStatus.complete,
        progress: smartLinks.reservationStatus.total > 0 
          ? `${smartLinks.reservationStatus.completed}/${smartLinks.reservationStatus.total}` 
          : undefined
      };
    case 'res_contract_upload':
      return { autoComplete: smartLinks.contractStatus.exists };
    case 'res_klant_ondertekend':
      return { autoComplete: smartLinks.contractStatus.signedByCustomer };
    case 'res_developer_ondertekend':
      return { autoComplete: smartLinks.contractStatus.signedByDeveloper };
    case 'res_betaalplan':
      return { autoComplete: smartLinks.paymentStatus.exists };
    case 'res_facturen':
      return { autoComplete: smartLinks.invoicesStatus.exists };
    case 'res_extras':
      return { autoComplete: smartLinks.extrasStatus.hasDecisions };
    case 'res_aanbetaling':
      return { autoComplete: smartLinks.paymentStatus.isPaid };

    // Koopcontract phase - document tasks
    case 'koop_grondplan':
      return { autoComplete: smartLinks.koopcontractDocsStatus['floor_plan']?.exists || false };
    case 'koop_specificaties':
      return { autoComplete: smartLinks.koopcontractDocsStatus['specifications']?.exists || false };
    case 'koop_bouwvergunning':
      return { autoComplete: smartLinks.koopcontractDocsStatus['building_permit']?.exists || false };
    case 'koop_kadastraal':
      return { autoComplete: smartLinks.koopcontractDocsStatus['cadastral_file']?.exists || false };
    case 'koop_eigendomsregister':
      return { autoComplete: smartLinks.koopcontractDocsStatus['ownership_extract']?.exists || false };
    case 'koop_bankgarantie':
      return { autoComplete: smartLinks.koopcontractDocsStatus['bank_guarantee']?.exists || false };
    case 'koop_contract':
      return { autoComplete: smartLinks.koopcontractDocsStatus['purchase_contract']?.exists || false };
    case 'koop_klant_ondertekend':
      return { autoComplete: smartLinks.koopcontractDocsStatus['purchase_contract']?.signedByCustomer || false };
    case 'koop_developer_ondertekend':
      return { autoComplete: smartLinks.koopcontractDocsStatus['purchase_contract']?.signedByDeveloper || false };

    // Voorbereiding phase
    case 'voorb_elektriciteit':
      return { autoComplete: smartLinks.voorbereidingDocsStatus['electrical_plan']?.exists || false };
    case 'voorb_afmetingen':
      return { autoComplete: smartLinks.voorbereidingDocsStatus['measurement_plan']?.exists || false };
    case 'voorb_extras_docs':
      return { autoComplete: smartLinks.extrasDocsStatus.complete };
    
    // Akkoord phase - offerte tasks auto-complete via choices data
    case 'akk_offertes_aangevraagd':
      return { autoComplete: smartLinks.choicesSummary?.allRequested || false };
    case 'akk_offertes_ontvangen':
      return { autoComplete: smartLinks.choicesSummary?.allReceived || false };
    case 'akk_offertes_beslissing':
      return { autoComplete: smartLinks.choicesSummary?.allDecided || false };
    
    // Akkoord phase - manual approval
    case 'akk_grondplan':
    case 'akk_elektriciteit':
    case 'akk_extras':
    case 'akk_definitief':
    case 'akk_doorgegeven':
      return { autoComplete: false };

    // Overdracht phase
    case 'overd_notaris_datum':
      return { autoComplete: smartLinks.notaryDateSet || false };
    case 'overd_snagging':
      return { autoComplete: smartLinks.snaggingStatus?.hasCompletedInspection || false };
    
    // Nazorg phase - document tasks
    case 'overd_notariele_akte':
      return { autoComplete: smartLinks.overdrachtDocsStatus?.['notarial_deed']?.exists || false };
    case 'overd_epc':
      return { autoComplete: smartLinks.overdrachtDocsStatus?.['epc_certificate']?.exists || false };
    case 'overd_bewoonbaarheid':
      return { autoComplete: smartLinks.overdrachtDocsStatus?.['habitability_certificate']?.exists || false };

    default:
      return { autoComplete: false };
  }
}
