import { 
  FileSignature, 
  Map, 
  Building2, 
  Landmark, 
  ScrollText, 
  FileText,
  DollarSign,
  Video,
  BookOpen,
  LucideIcon
} from "lucide-react";

export interface DocumentType {
  value: string;
  label: string;
}

export interface DocumentCategory {
  key: string;
  label: string;
  icon: LucideIcon;
  types: DocumentType[];
}

// Document types organized by category
export const documentCategories: DocumentCategory[] = [
  {
    key: 'contracts',
    label: 'Contracten',
    icon: FileSignature,
    types: [
      { value: 'reservation_contract', label: 'Reservatiecontract' },
      { value: 'purchase_contract', label: 'Koopcontract' },
    ],
  },
  {
    key: 'plans',
    label: 'Plannen',
    icon: Map,
    types: [
      { value: 'floor_plan', label: 'Grondplan woning' },
      { value: 'electrical_plan', label: 'Elektriciteitsplan' },
      { value: 'measurement_plan', label: 'Afmetingenplan' },
      { value: 'master_plan', label: 'Masterplan project' },
      { value: 'basement_plan', label: 'Kelderplan' },
      { value: 'home_plan', label: 'Woningplan' },
      { value: 'other_plan', label: 'Overig plan' },
    ],
  },
  {
    key: 'technical',
    label: 'Technisch',
    icon: Building2,
    types: [
      { value: 'specifications', label: 'Specificatielijst' },
    ],
  },
  {
    key: 'financial',
    label: 'Financieel',
    icon: Landmark,
    types: [
      { value: 'bank_guarantee', label: 'Bankgarantie' },
      { value: 'prijslijst', label: 'Prijslijst' },
      { value: 'payment_schedule', label: 'Betalingsschema' },
    ],
  },
  {
    key: 'legal',
    label: 'Juridisch',
    icon: ScrollText,
    types: [
      { value: 'ownership_extract', label: 'Uittreksel eigendomsregister' },
      { value: 'cadastral_file', label: 'Kadastrale fiche' },
      { value: 'building_permit', label: 'Bouwvergunning' },
    ],
  },
  {
    key: 'marketing',
    label: 'Marketing',
    icon: BookOpen,
    types: [
      { value: 'brochure', label: 'Brochure' },
    ],
  },
  {
    key: 'media',
    label: 'Media',
    icon: Video,
    types: [
      { value: 'video_link', label: 'Video' },
    ],
  },
  {
    key: 'handover',
    label: 'Overdracht',
    icon: Landmark,
    types: [
      { value: 'notarial_deed', label: 'Notariële akte' },
      { value: 'epc_certificate', label: 'EPC' },
      { value: 'habitability_certificate', label: 'Bewoonbaarheidscertificaat' },
    ],
  },
  {
    key: 'other',
    label: 'Overig',
    icon: FileText,
    types: [
      { value: 'other', label: 'Overig' },
    ],
  },
];

// Flatten for select dropdown
export const allDocumentTypes = documentCategories.flatMap(cat => cat.types);

// Contract types that require signatures
export const contractTypes = ['reservation_contract', 'purchase_contract'];

export function getDocumentTypeLabel(value: string): string {
  const found = allDocumentTypes.find(t => t.value === value);
  return found?.label || value;
}

export function getCategoryForType(type: string): DocumentCategory | undefined {
  return documentCategories.find(cat => cat.types.some(t => t.value === type));
}

// Map between internal classification types and document_type values
export const classificationToDocumentType: Record<string, string> = {
  'prijslijst': 'prijslijst',
  'specifications': 'specifications',
  'floor_plan': 'floor_plan',
  'electrical_plan': 'electrical_plan',
  'payment_schedule': 'payment_schedule',
  'reservation_contract': 'reservation_contract',
  'purchase_contract': 'purchase_contract',
  'master_plan': 'master_plan',
  'bank_guarantee': 'bank_guarantee',
  'building_permit': 'building_permit',
  'ownership_extract': 'ownership_extract',
  'cadastral_file': 'cadastral_file',
  'basement_plan': 'basement_plan',
  'measurement_plan': 'measurement_plan',
  'home_plan': 'home_plan',
  'other_plan': 'other_plan',
  'brochure': 'brochure',
  'video_link': 'video_link',
  'notarial_deed': 'notarial_deed',
  'epc_certificate': 'epc_certificate',
  'habitability_certificate': 'habitability_certificate',
  'other': 'other',
};
