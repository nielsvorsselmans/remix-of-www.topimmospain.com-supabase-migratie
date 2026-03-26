// Journey milestone templates for pre-sales phases (orientatie → selectie → bezichtiging)

export interface JourneyMilestoneTemplate {
  key: string;
  title: string;
  description: string;
  order: number;
  customerVisible: boolean;
  adminOnly: boolean;
  priority: 'high' | 'medium' | 'low';
}

// Oriëntatie fase templates - Pre-account + Customer-visible
export const ORIENTATIE_TEMPLATES: JourneyMilestoneTemplate[] = [
  // Pre-account milestones (admin only)
  {
    key: 'ori_lead_binnenkomst',
    title: 'Lead binnengekomen',
    description: 'Nieuwe lead is geregistreerd in het systeem',
    order: 1,
    customerVisible: false,
    adminOnly: true,
    priority: 'high',
  },
  {
    key: 'ori_call_gepland',
    title: 'Oriëntatiegesprek ingepland',
    description: 'Eerste kennismakingsgesprek is gepland',
    order: 2,
    customerVisible: false,
    adminOnly: true,
    priority: 'high',
  },
  {
    key: 'ori_call_gevoerd',
    title: 'Oriëntatiegesprek gevoerd',
    description: 'Je hebt een kennismakingsgesprek gehad met een adviseur',
    order: 3,
    customerVisible: true,
    adminOnly: false,
    priority: 'high',
  },
  {
    key: 'ori_uitnodiging_verstuurd',
    title: 'Portaaluitnodiging verstuurd',
    description: 'Uitnodiging voor het klantportaal is verstuurd',
    order: 4,
    customerVisible: false,
    adminOnly: true,
    priority: 'medium',
  },
  // Customer-visible milestones
  {
    key: 'ori_account',
    title: 'Account aangemaakt',
    description: 'Je account is succesvol aangemaakt',
    order: 5,
    customerVisible: true,
    adminOnly: false,
    priority: 'high',
  },
  {
    key: 'ori_profiel',
    title: 'Vragenlijst ingevuld',
    description: 'Beantwoord vragen over je situatie en voorkeuren',
    order: 6,
    customerVisible: true,
    adminOnly: false,
    priority: 'high',
  },
  {
    key: 'ori_calculator',
    title: 'Calculator gebruikt',
    description: 'Bereken je potentiële rendement of kosten',
    order: 7,
    customerVisible: true,
    adminOnly: false,
    priority: 'medium',
  },
  {
    key: 'ori_gids_gelezen',
    title: 'Oriëntatiegids gelezen',
    description: 'Lees je in over investeren in Spanje',
    order: 8,
    customerVisible: true,
    adminOnly: false,
    priority: 'medium',
  },
  {
    key: 'ori_projecten_bekeken',
    title: '3+ projecten bekeken',
    description: 'Verken minimaal 3 projecten',
    order: 9,
    customerVisible: true,
    adminOnly: false,
    priority: 'medium',
  },
  {
    key: 'ori_favoriet',
    title: 'Favoriet toegevoegd',
    description: 'Sla een interessant project op als favoriet',
    order: 10,
    customerVisible: true,
    adminOnly: false,
    priority: 'medium',
  },
  {
    key: 'ori_kennismaking',
    title: 'Oriëntatiegesprek gepland',
    description: 'Plan een vrijblijvend gesprek met een adviseur',
    order: 11,
    customerVisible: true,
    adminOnly: false,
    priority: 'high',
  },
];

// Selectie fase templates
export const SELECTIE_TEMPLATES: JourneyMilestoneTemplate[] = [
  {
    key: 'sel_projecten_toegewezen',
    title: 'Projecten toegewezen',
    description: 'Adviseur heeft projecten voor je geselecteerd',
    order: 1,
    customerVisible: false,
    adminOnly: true,
    priority: 'high',
  },
  {
    key: 'sel_shortlist',
    title: 'Shortlist samengesteld',
    description: 'Kies je favoriete projecten voor bezichtiging',
    order: 2,
    customerVisible: true,
    adminOnly: false,
    priority: 'high',
  },
  {
    key: 'sel_vragen_beantwoord',
    title: 'Vragen beantwoord',
    description: 'Alle vragen over de projecten beantwoord',
    order: 3,
    customerVisible: true,
    adminOnly: false,
    priority: 'medium',
  },
  {
    key: 'sel_beslissing',
    title: 'Klaar voor bezichtiging',
    description: 'Definitieve selectie gemaakt voor bezichtiging',
    order: 4,
    customerVisible: true,
    adminOnly: false,
    priority: 'high',
  },
];

// Bezichtiging fase templates
export const BEZICHTIGING_TEMPLATES: JourneyMilestoneTemplate[] = [
  {
    key: 'bez_reis_gepland',
    title: 'Bezichtiging ingepland',
    description: 'Bezichtigingsreis is gepland',
    order: 1,
    customerVisible: true,
    adminOnly: false,
    priority: 'high',
  },
  {
    key: 'bez_vlucht',
    title: 'Vluchten geregeld',
    description: 'Vluchten zijn geboekt en bevestigd',
    order: 2,
    customerVisible: false,
    adminOnly: true,
    priority: 'medium',
  },
  {
    key: 'bez_accommodatie',
    title: 'Accommodatie bevestigd',
    description: 'Verblijf is geregeld',
    order: 3,
    customerVisible: false,
    adminOnly: true,
    priority: 'medium',
  },
  {
    key: 'bez_planning_af',
    title: 'Bezichtigingsplanning compleet',
    description: 'Complete planning met alle bezichtigingen',
    order: 4,
    customerVisible: true,
    adminOnly: false,
    priority: 'high',
  },
  {
    key: 'bez_uitgevoerd',
    title: 'Bezichtigingen uitgevoerd',
    description: 'Alle geplande bezichtigingen zijn gedaan',
    order: 5,
    customerVisible: true,
    adminOnly: false,
    priority: 'high',
  },
  {
    key: 'bez_feedback',
    title: 'Feedback ontvangen',
    description: 'Klant heeft feedback gegeven na bezichtigingen',
    order: 6,
    customerVisible: false,
    adminOnly: true,
    priority: 'medium',
  },
];

// Aankoop fase templates
export const AANKOOP_TEMPLATES: JourneyMilestoneTemplate[] = [
  {
    key: 'aank_keuze_gemaakt',
    title: 'Woningkeuze gemaakt',
    description: 'Klant heeft definitieve keuze gemaakt voor een woning',
    order: 1,
    customerVisible: true,
    adminOnly: false,
    priority: 'high',
  },
  {
    key: 'aank_reservatie',
    title: 'Reservatie geplaatst',
    description: 'Reserveringscontract is opgesteld',
    order: 2,
    customerVisible: true,
    adminOnly: false,
    priority: 'high',
  },
  {
    key: 'aank_aanbetaling',
    title: 'Aanbetaling voldaan',
    description: 'Eerste aanbetaling is ontvangen',
    order: 3,
    customerVisible: true,
    adminOnly: false,
    priority: 'high',
  },
  {
    key: 'aank_koopcontract',
    title: 'Koopcontract ondertekend',
    description: 'Koopcontract is door beide partijen ondertekend',
    order: 4,
    customerVisible: true,
    adminOnly: false,
    priority: 'high',
  },
  {
    key: 'aank_notaris',
    title: 'Notaris afspraak gepland',
    description: 'Afspraak met notaris is ingepland',
    order: 5,
    customerVisible: true,
    adminOnly: false,
    priority: 'medium',
  },
  {
    key: 'aank_financiering',
    title: 'Financiering afgerond',
    description: 'Hypotheek of financiering is rond',
    order: 6,
    customerVisible: true,
    adminOnly: false,
    priority: 'medium',
  },
];

// Overdracht fase templates
export const OVERDRACHT_TEMPLATES: JourneyMilestoneTemplate[] = [
  {
    key: 'over_opleverdatum',
    title: 'Opleverdatum bevestigd',
    description: 'Verwachte opleverdatum is gecommuniceerd',
    order: 1,
    customerVisible: true,
    adminOnly: false,
    priority: 'high',
  },
  {
    key: 'over_eindinspectie',
    title: 'Eindinspectie gepland',
    description: 'Afspraak voor eindinspectie is gemaakt',
    order: 2,
    customerVisible: true,
    adminOnly: false,
    priority: 'high',
  },
  {
    key: 'over_snagging',
    title: 'Snagging lijst afgewerkt',
    description: 'Alle opleverpunten zijn gecontroleerd en afgehandeld',
    order: 3,
    customerVisible: true,
    adminOnly: false,
    priority: 'medium',
  },
  {
    key: 'over_sleuteloverdracht',
    title: 'Sleuteloverdracht',
    description: 'Sleutels zijn overgedragen aan de klant',
    order: 4,
    customerVisible: true,
    adminOnly: false,
    priority: 'high',
  },
  {
    key: 'over_notaris_akte',
    title: 'Notariële akte gepasseerd',
    description: 'Eigendomsoverdracht is officieel geregistreerd',
    order: 5,
    customerVisible: true,
    adminOnly: false,
    priority: 'high',
  },
];

// Beheer fase templates
export const BEHEER_TEMPLATES: JourneyMilestoneTemplate[] = [
  {
    key: 'beh_verhuur_setup',
    title: 'Verhuur ingericht',
    description: 'Verhuurstrategie en inrichting is bepaald',
    order: 1,
    customerVisible: true,
    adminOnly: false,
    priority: 'medium',
  },
  {
    key: 'beh_beheerder',
    title: 'Beheerder gekoppeld',
    description: 'Property manager is aangesteld',
    order: 2,
    customerVisible: true,
    adminOnly: false,
    priority: 'medium',
  },
  {
    key: 'beh_eerste_boeking',
    title: 'Eerste boeking ontvangen',
    description: 'Eerste huuropbrengst is binnen',
    order: 3,
    customerVisible: true,
    adminOnly: false,
    priority: 'medium',
  },
  {
    key: 'beh_review_gevraagd',
    title: 'Review gevraagd',
    description: 'Klant is gevraagd om ervaring te delen',
    order: 4,
    customerVisible: false,
    adminOnly: true,
    priority: 'low',
  },
];

// Phase to templates mapping
export const JOURNEY_PHASE_TEMPLATES = {
  orientatie: {
    templates: ORIENTATIE_TEMPLATES,
    label: 'Oriëntatie',
  },
  selectie: {
    templates: SELECTIE_TEMPLATES,
    label: 'Selectie',
  },
  bezichtiging: {
    templates: BEZICHTIGING_TEMPLATES,
    label: 'Bezichtiging',
  },
  aankoop: {
    templates: AANKOOP_TEMPLATES,
    label: 'Aankoop',
  },
  overdracht: {
    templates: OVERDRACHT_TEMPLATES,
    label: 'Overdracht',
  },
  beheer: {
    templates: BEHEER_TEMPLATES,
    label: 'Beheer',
  },
} as const;

export type JourneyPhase = keyof typeof JOURNEY_PHASE_TEMPLATES;

// All templates flat
export const ALL_JOURNEY_TEMPLATES = [
  ...ORIENTATIE_TEMPLATES,
  ...SELECTIE_TEMPLATES,
  ...BEZICHTIGING_TEMPLATES,
  ...AANKOOP_TEMPLATES,
  ...OVERDRACHT_TEMPLATES,
  ...BEHEER_TEMPLATES,
];

// Get template by key
export function getJourneyTemplateByKey(key: string): JourneyMilestoneTemplate | undefined {
  return ALL_JOURNEY_TEMPLATES.find(t => t.key === key);
}
