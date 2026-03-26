// Checklist template definitions for all sales phases

// Milestone group definitions
// Geblokkeerd checklist template
export const GEBLOKKEERD_CHECKLIST = [
  { key: 'geb_optie_bevestigd', group: null, title: 'Optie bevestigd', order: 1, description: 'Bevestig dat de klant een optie heeft genomen op het object', customerVisible: true },
  { key: 'geb_koopintentie', group: null, title: 'Koopintentie besproken', order: 2, description: 'Bespreek de koopintentie met de klant', customerVisible: false },
  { key: 'geb_reservatiecontract', group: null, title: 'Reservatiecontract klaarzetten', order: 3, description: 'Maak het reservatiecontract klaar voor ondertekening', customerVisible: false },
];

export const MILESTONE_GROUPS: Record<string, { label: string; phase: string }> = {
  reservatiecontract: { label: 'Ondertekend reservatiecontract', phase: 'reservatie' },
  financieel: { label: 'Financieel dossier compleet', phase: 'reservatie' },
  extras: { label: "Extra's & opties vastgelegd", phase: 'reservatie' },
  documenten_compleet: { label: 'Documenten compleet', phase: 'koopcontract' },
  koopcontract_ondertekend: { label: 'Koopcontract ondertekend', phase: 'koopcontract' },
  technische_plannen: { label: 'Technische plannen ontvangen', phase: 'voorbereiding' },
  klant_voorbereid: { label: 'Klant voorbereid', phase: 'voorbereiding' },
  klantverhaal: { label: 'Klantverhaal', phase: 'koopcontract' },
  offertes_afgehandeld: { label: 'Offertes afgehandeld', phase: 'akkoord' },
  klant_akkoord: { label: 'Klant akkoord verkregen', phase: 'akkoord' },
  akkoord_verwerkt: { label: 'Akkoord verwerkt', phase: 'akkoord' },
  oplevering: { label: 'Oplevering', phase: 'overdracht' },
  klantverhaal_oplevering: { label: 'Klantverhaal bijwerken', phase: 'overdracht' },
  nazorg_documenten: { label: 'Documenten na overdracht', phase: 'nazorg' },
  nazorg_klantverhaal: { label: 'Klantverhaal', phase: 'nazorg' },
  nazorg_praktisch: { label: 'Praktische zaken geregeld', phase: 'nazorg' },
  nazorg_opvolging: { label: 'Klantopvolging', phase: 'nazorg' },
  nazorg_intern: { label: 'Interne afhandeling', phase: 'nazorg' },
};

// Reservatie checklist template
export const RESERVATIE_CHECKLIST = [
  { key: 'res_koperdata', group: 'reservatiecontract', title: 'Koperdata verzamelen', order: 1, description: 'Verzamel alle persoonlijke gegevens van de kopers', customerVisible: true },
  { key: 'res_contract_upload', group: 'reservatiecontract', title: 'Reservatiecontract uploaden', order: 2, description: 'Upload het reservatiecontract naar het systeem', customerVisible: true },
  { key: 'res_advocaat', group: 'reservatiecontract', title: 'Contract doorsturen naar advocaat', order: 3, description: 'Stuur contract en koperdata naar de advocaat', customerVisible: true },
  { key: 'res_klant_ondertekend', group: 'reservatiecontract', title: 'Contract ondertekend door klant', order: 4, description: 'Klant heeft het contract ondertekend', customerVisible: true },
  { key: 'res_developer_ondertekend', group: 'reservatiecontract', title: 'Contract ondertekend door projectontwikkelaar', order: 5, description: 'Projectontwikkelaar heeft het contract ondertekend', customerVisible: true },
  { key: 'res_betaalplan', group: 'financieel', title: 'Betaalplan toegevoegd', order: 6, description: 'Voeg het betaalplan met betalingstermijnen toe', customerVisible: true },
  { key: 'res_facturen', group: 'financieel', title: 'Facturen toegevoegd', order: 7, description: 'Voeg de te verwachten facturen toe', customerVisible: false },
  { key: 'res_extras', group: 'extras', title: "Extra's & opties toegevoegd", order: 8, description: "Voeg eventuele beloofde extra's en opties toe", customerVisible: true },
  { key: 'res_aanbetaling', group: 'financieel', title: 'Aanbetaling ontvangen', order: 9, description: 'De aanbetaling is succesvol ontvangen', customerVisible: true },
] as const;

// Koopcontract checklist template
export const KOOPCONTRACT_CHECKLIST = [
  { key: 'koop_grondplan', group: 'documenten_compleet', title: 'Grondplan woning', order: 1, description: 'Upload het grondplan van de gekochte woning', documentType: 'floor_plan' },
  { key: 'koop_specificaties', group: 'documenten_compleet', title: 'Specificatielijst', order: 2, description: 'Upload de technische specificaties van de woning', documentType: 'specifications' },
  { key: 'koop_bouwvergunning', group: 'documenten_compleet', title: 'Bouwvergunning', order: 3, description: 'Upload de bouwvergunning van het project', documentType: 'building_permit' },
  { key: 'koop_kadastraal', group: 'documenten_compleet', title: 'Kadastrale fiche', order: 4, description: 'Upload de kadastrale gegevens', documentType: 'cadastral_file' },
  { key: 'koop_eigendomsregister', group: 'documenten_compleet', title: 'Uittreksel eigendomsregister', order: 5, description: 'Upload het uittreksel uit het eigendomsregister', documentType: 'ownership_extract' },
  { key: 'koop_bankgarantie', group: 'documenten_compleet', title: 'Bankgarantiedocumenten', order: 6, description: 'Upload de bankgarantie documentatie', documentType: 'bank_guarantee' },
  { key: 'koop_contract', group: 'koopcontract_ondertekend', title: 'Koopovereenkomst', order: 7, description: 'Upload de definitieve koopovereenkomst', documentType: 'purchase_contract' },
  { key: 'koop_klant_ondertekend', group: 'koopcontract_ondertekend', title: 'Koopcontract ondertekend door klant', order: 8, description: 'De klant heeft het koopcontract ondertekend' },
  { key: 'koop_developer_ondertekend', group: 'koopcontract_ondertekend', title: 'Koopcontract ondertekend door ontwikkelaar', order: 9, description: 'De ontwikkelaar heeft het koopcontract ondertekend' },
  { key: 'koop_review_genereren', group: 'klantverhaal', title: 'Aankoopverhaal genereren', order: 10, description: 'Werk het eerste klantverhaal uit via de 2-staps pipeline (brainstorm → formaliseer)', customerVisible: false },
] as const;

// Voorbereiding checklist template
export const VOORBEREIDING_CHECKLIST = [
  { key: 'voorb_elektriciteit', group: 'technische_plannen', title: 'Elektriciteitsplan ontvangen', order: 1, description: 'Upload het elektriciteitsplan van de ontwikkelaar', documentType: 'electrical_plan' },
  { key: 'voorb_afmetingen', group: 'technische_plannen', title: 'Afmetingenplan ontvangen', order: 2, description: 'Upload het plan met exacte afmetingen en maten', documentType: 'measurement_plan' },
  { key: 'voorb_extras_docs', group: 'klant_voorbereid', title: "Documenten extra's verzameld", order: 3, description: "Upload documentatie voor alle extra's (airco, meubels, etc.)" },
  { key: 'voorb_gesprek', group: 'klant_voorbereid', title: 'Klantgesprek ingepland', order: 4, description: 'Plan een gesprek met de klant om de plannen te bespreken' },
  { key: 'voorb_aanpassingen', group: 'klant_voorbereid', title: 'Aanpassingen doorgegeven', order: 5, description: 'Gewenste aanpassingen zijn doorgegeven aan de ontwikkelaar' },
] as const;

// Akkoord checklist template
export const AKKOORD_CHECKLIST = [
  { key: 'akk_offertes_aangevraagd', group: 'offertes_afgehandeld', title: 'Alle offertes aangevraagd', order: 1, description: 'Alle benodigde offertes zijn aangevraagd bij de ontwikkelaar' },
  { key: 'akk_offertes_ontvangen', group: 'offertes_afgehandeld', title: 'Alle offertes ontvangen', order: 2, description: 'Alle aangevraagde offertes zijn ontvangen van de ontwikkelaar' },
  { key: 'akk_offertes_beslissing', group: 'offertes_afgehandeld', title: 'Klant beslissing op alle offertes', order: 3, description: 'De klant heeft op alle offertes een beslissing genomen' },
  { key: 'akk_grondplan', group: 'klant_akkoord', title: 'Grondplan akkoord door klant', order: 4, description: 'Klant heeft akkoord gegeven op het grondplan en afmetingen' },
  { key: 'akk_elektriciteit', group: 'klant_akkoord', title: 'Elektriciteitsplan akkoord door klant', order: 5, description: 'Klant heeft akkoord gegeven op het elektriciteitsplan' },
  { key: 'akk_extras', group: 'klant_akkoord', title: "Extra's & Opties akkoord door klant", order: 6, description: "Klant heeft akkoord gegeven op de extra's en opties" },
  { key: 'akk_definitief', group: 'klant_akkoord', title: 'Definitief akkoord ontvangen', order: 7, description: 'Klant heeft definitief akkoord gegeven op alle specificaties' },
  { key: 'akk_doorgegeven', group: 'akkoord_verwerkt', title: 'Akkoord doorgegeven aan ontwikkelaar', order: 8, description: 'De goedgekeurde specificaties zijn doorgegeven aan de ontwikkelaar' },
] as const;

// Overdracht checklist template
export const OVERDRACHT_CHECKLIST = [
  { key: 'overd_notaris_datum', group: 'oplevering', title: 'Sleuteloverdracht bij notaris ingepland', order: 1, description: 'Plan de datum voor de sleuteloverdracht bij de notaris', customerVisible: true },
  { key: 'overd_snagging', group: 'oplevering', title: 'Snagging inspectie uitgevoerd', order: 2, description: 'Voer de oplevering inspectie uit en registreer eventuele defecten' },
  { key: 'overd_review_aanvullen', group: 'klantverhaal_oplevering', title: 'Klantverhaal aanvullen na oplevering', order: 3, description: 'Vul het bestaande klantverhaal aan met de opleveringservaring van de klant', customerVisible: false },
] as const;

// Nazorg checklist template
export const NAZORG_CHECKLIST = [
  { key: 'overd_notariele_akte', group: 'nazorg_documenten', title: 'Notariële akte uploaden', order: 1, description: 'Upload de notariële akte na overdracht bij de notaris', documentType: 'notarial_deed', customerVisible: true },
  { key: 'overd_epc', group: 'nazorg_documenten', title: 'EPC uploaden', order: 2, description: 'Upload het energieprestatiecertificaat (EPC)', documentType: 'epc_certificate', customerVisible: true },
  { key: 'overd_bewoonbaarheid', group: 'nazorg_documenten', title: 'Bewoonbaarheidscertificaat uploaden', order: 3, description: 'Upload het bewoonbaarheidscertificaat', documentType: 'habitability_certificate', customerVisible: true },
  { key: 'overd_review', group: 'nazorg_klantverhaal', title: 'Klantreview ophalen', order: 4, description: 'Vraag de klant om een review en genereer een case study via de review workflow' },
  { key: 'nazorg_nutsvoorzieningen', group: 'nazorg_praktisch', title: 'Nutsvoorzieningen overgedragen', order: 5, description: 'Elektriciteit, water, gas en internet op naam van de klant gezet', customerVisible: true },
  { key: 'nazorg_verzekering', group: 'nazorg_praktisch', title: 'Opstalverzekering afgesloten', order: 6, description: 'Controleer of de klant een opstalverzekering heeft afgesloten', customerVisible: true },
  { key: 'nazorg_belastingen', group: 'nazorg_praktisch', title: 'Gemeentelijke belastingen geregeld (IBI, basura)', order: 7, description: 'Controleer of de klant is geregistreerd voor lokale belastingen', customerVisible: true },
  { key: 'nazorg_vve', group: 'nazorg_praktisch', title: 'Aanmelding VvE / Comunidad de Propietarios', order: 8, description: 'Klant is aangemeld als nieuw lid van de VvE', customerVisible: true },
  { key: 'nazorg_followup', group: 'nazorg_opvolging', title: 'Follow-up call/e-mail na 2 weken', order: 9, description: 'Neem contact op met de klant om te vragen of alles naar wens is', customerVisible: false },
  { key: 'nazorg_financieel', group: 'nazorg_intern', title: 'Financiële afhandeling intern gecontroleerd', order: 10, description: 'Controleer of alle financiële aspecten van de verkoop zijn afgehandeld', customerVisible: false },
  { key: 'nazorg_archivering', group: 'nazorg_intern', title: 'Dossier gearchiveerd', order: 11, description: 'Alle documenten en communicatie correct gearchiveerd', customerVisible: false },
] as const;

// Union type of all checklist keys
export type ChecklistKey = 
  | typeof GEBLOKKEERD_CHECKLIST[number]['key']
  | typeof RESERVATIE_CHECKLIST[number]['key']
  | typeof KOOPCONTRACT_CHECKLIST[number]['key']
  | typeof VOORBEREIDING_CHECKLIST[number]['key']
  | typeof AKKOORD_CHECKLIST[number]['key']
  | typeof OVERDRACHT_CHECKLIST[number]['key']
  | typeof NAZORG_CHECKLIST[number]['key'];
