import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type SaleStatus = 'geblokkeerd' | 'reservatie' | 'koopcontract' | 'voorbereiding' | 'akkoord' | 'overdracht' | 'afgerond' | 'geannuleerd';

interface CustomerDossier {
  customerName: string;
  location: string;
  customerType: string;
  propertyType: string;
  investmentType: string;
  projectName?: string;
  projectCity?: string;
  projectRegion?: string;
  salePrice?: number;
  saleStatus?: SaleStatus;
  conversations: string[];
  viewingFeedback: string[];
  tripDetails: string[];
  timeline: string[];
  crmNotes: string[];
  buildUpdates: string[];
  additionalContext?: string;
}

async function buildCustomerDossier(
  supabaseAdmin: any,
  saleId: string
): Promise<CustomerDossier | null> {
  const { data: sale, error: saleError } = await supabaseAdmin
    .from('sales')
    .select(`
      id, sale_price, property_description, status, created_at,
      projects (id, name, city, region),
      sale_customers (
        crm_lead_id,
        crm_leads (first_name, last_name, journey_phase, email)
      )
    `)
    .eq('id', saleId)
    .single();

  if (saleError || !sale) {
    console.error('Could not fetch sale:', saleError);
    return null;
  }

  const leadIds: string[] = (sale.sale_customers || [])
    .map((sc: any) => sc.crm_lead_id)
    .filter(Boolean);

  if (leadIds.length === 0) {
    console.error('No CRM leads found for sale');
    return null;
  }

  const customerName = sale.sale_customers
    .map((sc: any) => [sc.crm_leads?.first_name, sc.crm_leads?.last_name].filter(Boolean).join(' '))
    .filter(Boolean)
    .join(' en ');

  // Get project ID for build updates query
  const projectId = sale?.projects?.id;

  const [appointmentsRes, tripsRes, milestonesRes, crmNotesRes, conversationNotesRes, projectVideoLinksRes, saleVideoLinksRes] = await Promise.all([
    supabaseAdmin
      .from('ghl_contact_appointments')
      .select('title, start_time, summary_full, summary_short, summary_category, key_topics, local_notes')
      .in('crm_lead_id', leadIds)
      .or('summary_full.not.is.null,local_notes.not.is.null')
      .order('start_time', { ascending: true }),
    supabaseAdmin
      .from('customer_viewing_trips')
      .select('id, trip_start_date, trip_end_date, airport, scheduled_viewings, customer_notes')
      .in('crm_lead_id', leadIds)
      .order('trip_start_date', { ascending: true }),
    supabaseAdmin
      .from('journey_milestones')
      .select('phase, title, completed_at')
      .in('crm_lead_id', leadIds)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: true }),
    supabaseAdmin
      .from('ghl_contact_notes')
      .select('body, source, created_at')
      .in('crm_lead_id', leadIds)
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('conversations')
      .select('raw_notes, source_type, created_at')
      .in('crm_lead_id', leadIds)
      .in('source_type', ['ghl_note', 'ghl_appointment'])
      .order('created_at', { ascending: true }),
    // Build updates: project-level videos (bouwupdate, drone)
    projectId
      ? supabaseAdmin
          .from('project_video_links')
          .select('project_videos (video_date, video_type, title, description, media_type)')
          .eq('project_id', projectId)
          .eq('visible_portal', true)
          .order('order_index', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    // Build updates: sale-specific videos
    supabaseAdmin
      .from('sale_video_links')
      .select('project_videos (video_date, video_type, title, description, media_type)')
      .eq('sale_id', saleId),
  ]);

  // Log errors per query for debugging
  if (appointmentsRes.error) console.error('Error fetching appointments:', appointmentsRes.error);
  if (tripsRes.error) console.error('Error fetching trips:', tripsRes.error);
  if (milestonesRes.error) console.error('Error fetching milestones:', milestonesRes.error);
  if (crmNotesRes.error) console.error('Error fetching ghl_contact_notes:', crmNotesRes.error);
  if (conversationNotesRes.error) console.error('Error fetching conversation notes:', conversationNotesRes.error);
  if (projectVideoLinksRes.error) console.error('Error fetching project video links:', projectVideoLinksRes.error);
  if (saleVideoLinksRes.error) console.error('Error fetching sale video links:', saleVideoLinksRes.error);

  console.log(`Query results: appointments=${appointmentsRes.data?.length || 0}, trips=${tripsRes.data?.length || 0}, milestones=${milestonesRes.data?.length || 0}, crmNotes=${crmNotesRes.data?.length || 0}, conversationNotes=${conversationNotesRes.data?.length || 0}, projectVideos=${projectVideoLinksRes.data?.length || 0}, saleVideos=${saleVideoLinksRes.data?.length || 0}`);

  const tripIds = (tripsRes.data || []).map((t: any) => t.id).filter(Boolean);
  let viewingNotesData: any[] = [];
  if (tripIds.length > 0) {
    const { data: notes, error: notesError } = await supabaseAdmin
      .from('viewing_companion_notes')
      .select('rating, interest_level, budget_fit, follow_up_action, note_text, project_id, projects (name, city)')
      .in('trip_id', tripIds)
      .order('created_at', { ascending: true });
    
    if (notesError) {
      console.error('Error fetching viewing notes:', notesError);
    } else {
      viewingNotesData = notes || [];
    }
  }

  const conversations: string[] = (appointmentsRes.data || []).map((apt: any) => {
    const date = apt.start_time ? new Date(apt.start_time).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : 'onbekend';
    const category = apt.summary_category ? ` (${apt.summary_category})` : '';
    const topics = apt.key_topics?.length ? ` | Topics: ${apt.key_topics.join(', ')}` : '';
    return `${apt.title || 'Gesprek'}${category} - ${date}: ${apt.summary_full || apt.summary_short || apt.local_notes || 'Geen samenvatting'}${topics}`;
  });

  const viewingFeedback: string[] = viewingNotesData.map((note: any) => {
    const projectName = note.projects?.name || 'Onbekend project';
    const city = note.projects?.city ? ` (${note.projects.city})` : '';
    const rating = note.rating ? `⭐${note.rating}/5` : '';
    const interest = note.interest_level ? `, interesse: ${note.interest_level}` : '';
    const budget = note.budget_fit ? `, budget past` : '';
    const action = note.follow_up_action ? `, actie: ${note.follow_up_action}` : '';
    const noteText = note.note_text ? ` — \"${note.note_text}\"` : '';
    return `${projectName}${city}: ${rating}${interest}${budget}${action}${noteText}`;
  });

  const tripDetails: string[] = (tripsRes.data || []).map((trip: any) => {
    const start = trip.trip_start_date ? new Date(trip.trip_start_date).toLocaleDateString('nl-NL') : '';
    const end = trip.trip_end_date ? new Date(trip.trip_end_date).toLocaleDateString('nl-NL') : '';
    const viewingCount = Array.isArray(trip.scheduled_viewings) ? trip.scheduled_viewings.length : 0;
    const airport = trip.airport ? `, via ${trip.airport}` : '';
    const notes = trip.customer_notes ? ` — \"${trip.customer_notes}\"` : '';
    return `Bezichtigingsreis ${start} t/m ${end}${airport}, ${viewingCount} bezichtigingen${notes}`;
  });

  const seenMilestones = new Set<string>();
  const timeline: string[] = (milestonesRes.data || [])
    .filter((m: any) => {
      const key = `${m.phase}-${m.title}`;
      if (seenMilestones.has(key)) return false;
      seenMilestones.add(key);
      return true;
    })
    .map((m: any) => {
      const date = m.completed_at ? new Date(m.completed_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
      return `[${m.phase}] ${m.title} — ${date}`;
    });

  // Merge CRM notes from ghl_contact_notes + conversations table, deduplicate
  const seenNoteTexts = new Set<string>();
  const crmNotes: string[] = [];

  // First: ghl_contact_notes (primary source)
  for (const note of (crmNotesRes.data || [])) {
    const body = (note.body || '').trim();
    if (!body || seenNoteTexts.has(body)) continue;
    seenNoteTexts.add(body);
    const date = note.created_at ? new Date(note.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : 'onbekend';
    const source = note.source === 'ghl' ? '(GHL)' : '(Admin)';
    crmNotes.push(`${date} ${source}: ${body}`);
  }

  // Second: conversations table fallback (ghl_note / ghl_appointment source_types)
  for (const conv of (conversationNotesRes.data || [])) {
    const body = (conv.raw_notes || '').trim();
    if (!body || seenNoteTexts.has(body)) continue;
    seenNoteTexts.add(body);
    const date = conv.created_at ? new Date(conv.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : 'onbekend';
    const sourceLabel = conv.source_type === 'ghl_appointment' ? '(Afspraak)' : '(Notitie)';
    crmNotes.push(`${date} ${sourceLabel}: ${body}`);
  }

  console.log(`Merged CRM notes: ${crmNotes.length} unique notes`);

  // Process build updates from project + sale video links
  const relevantVideoTypes = ['bouwupdate', 'drone', 'showhouse'];
  const allVideoLinks = [
    ...(projectVideoLinksRes.data || []),
    ...(saleVideoLinksRes.data || []),
  ];
  const seenVideoTitles = new Set<string>();
  const buildUpdates: string[] = allVideoLinks
    .filter((link: any) => {
      const video = link.project_videos;
      if (!video) return false;
      // Include relevant types, or all if type is missing
      if (video.video_type && !relevantVideoTypes.includes(video.video_type)) return false;
      // Deduplicate by title+date
      const key = `${video.title}-${video.video_date}`;
      if (seenVideoTitles.has(key)) return false;
      seenVideoTitles.add(key);
      return true;
    })
    .sort((a: any, b: any) => new Date(a.project_videos.video_date).getTime() - new Date(b.project_videos.video_date).getTime())
    .map((link: any) => {
      const video = link.project_videos;
      const date = video.video_date ? new Date(video.video_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : 'onbekend';
      const type = video.video_type || 'update';
      const desc = video.description ? ` — ${video.description}` : '';
      return `[${type}] ${date}: ${video.title || 'Bouwupdate'}${desc}`;
    });

  console.log(`Build updates: ${buildUpdates.length}`);

  return {
    customerName,
    location: sale.projects?.city || '',
    customerType: '',
    propertyType: sale.property_description || '',
    investmentType: '',
    projectName: sale.projects?.name || undefined,
    projectCity: sale.projects?.city || undefined,
    projectRegion: sale.projects?.region || undefined,
    salePrice: sale.sale_price || undefined,
    saleStatus: (sale.status as SaleStatus) || undefined,
    conversations,
    viewingFeedback,
    tripDetails,
    timeline,
    crmNotes,
    buildUpdates,
  };
}

function getSaleStatusInstruction(status?: SaleStatus): string {
  if (!status) return '';
  
  if (status === 'afgerond') {
    return `\n\nVERKOOPSTATUS: ${status}
✅ De woning is OPGELEVERD. De klant heeft de sleutels ontvangen.
Verleden tijd is toegestaan. Je mag schrijven dat de klant in de woning woont, de sleutels heeft ontvangen, etc.`;
  }
  
  if (status === 'geannuleerd') {
    return `\n\nVERKOOPSTATUS: ${status}
⚠️ Deze verkoop is GEANNULEERD. Houd hier rekening mee in het verhaal.`;
  }
  
  const statusLabels: Record<string, string> = {
    reservatie: 'Reservatie geplaatst',
    koopcontract: 'Koopcontract ondertekend',
    voorbereiding: 'In voorbereiding',
    akkoord: 'Akkoord fase',
    overdracht: 'Overdracht fase',
  };
  
  return `\n\nVERKOOPSTATUS: ${statusLabels[status] || status}
⚠️ BELANGRIJK: De woning is nog NIET opgeleverd. De klant zit nog in de aankoopfase.
Schrijf ALTIJD in de tegenwoordige of toekomende tijd over de woning.
Gebruik NOOIT formuleringen die suggereren dat de klant al in de woning woont, deze heeft ingericht, of de sleutels heeft ontvangen.
VERBODEN: "de droom werd werkelijkheid", "nu genieten ze van", "sinds ze er wonen", "de eerste keer binnenstappen in hun nieuwe huis".
WEL TOEGESTAAN: "ze kijken uit naar", "binnenkort ontvangen ze de sleutels", "de bouw vordert gestaag", "ze volgen de voortgang via bouwupdates".`;
}

function buildDossierPrompt(dossier: CustomerDossier, additionalContext?: string, videoTranscript?: string | null): string {
  const parts: string[] = [
    `KLANTDOSSIER:`,
    `- Klant: ${dossier.customerName}`,
    `- Locatie: ${dossier.location}`,
  ];

  if (dossier.customerType) parts.push(`- Type investeerder: ${dossier.customerType}`);
  if (dossier.projectName) parts.push(`- Gekocht project: ${dossier.projectName}`);
  if (dossier.projectCity) parts.push(`- Projectlocatie: ${dossier.projectCity}`);
  if (dossier.projectRegion) parts.push(`- Regio: ${dossier.projectRegion}`);
  if (dossier.salePrice) parts.push(`- Aankoopprijs: €${dossier.salePrice.toLocaleString('nl-NL')}`);
  if (dossier.propertyType) parts.push(`- Woningtype: ${dossier.propertyType}`);
  if (dossier.saleStatus) parts.push(`- Verkoopstatus: ${dossier.saleStatus}`);

  // Add sale status instruction block
  const statusInstruction = getSaleStatusInstruction(dossier.saleStatus);
  if (statusInstruction) parts.push(statusInstruction);

  if (dossier.conversations.length > 0) {
    parts.push('');
    parts.push(`GESPREKSHISTORIE (${dossier.conversations.length} gesprekken):`);
    dossier.conversations.forEach((c, i) => parts.push(`${i + 1}. ${c}`));
  }

  if (dossier.viewingFeedback.length > 0) {
    parts.push('');
    parts.push(`BEZICHTIGINGSFEEDBACK (${dossier.viewingFeedback.length} projecten):`);
    dossier.viewingFeedback.forEach(v => parts.push(`- ${v}`));
  }

  if (dossier.tripDetails.length > 0) {
    parts.push('');
    parts.push('BEZICHTIGINGSREIZEN:');
    dossier.tripDetails.forEach(t => parts.push(`- ${t}`));
  }

  if (dossier.timeline.length > 0) {
    parts.push('');
    parts.push('TIJDSLIJN:');
    dossier.timeline.forEach(t => parts.push(`- ${t}`));
  }

  if (dossier.crmNotes.length > 0) {
    parts.push('');
    parts.push(`CRM NOTITIES (${dossier.crmNotes.length} notities — handmatige observaties van adviseurs/partners):`);
    dossier.crmNotes.forEach((n, i) => parts.push(`${i + 1}. ${n}`));
  }

  if (dossier.buildUpdates.length > 0) {
    parts.push('');
    parts.push(`BOUWUPDATES (${dossier.buildUpdates.length} updates — video's, drone-beelden en foto's die de klant heeft ontvangen tijdens de bouw):`);
    parts.push('Deze updates tonen concreet hoe de klant op de hoogte werd gehouden van de voortgang. Verwijs hier naar in het verhaal als bewijs van de begeleiding.');
    dossier.buildUpdates.forEach((b, i) => parts.push(`${i + 1}. ${b}`));
  }

  if (videoTranscript) {
    parts.push('');
    parts.push('VIDEO TRANSCRIPT (ondertiteling van klant video review):');
    const trimmed = videoTranscript.length > 3000 ? videoTranscript.substring(0, 3000) + '...' : videoTranscript;
    parts.push(trimmed);
  }

  if (additionalContext) {
    parts.push('');
    parts.push(`EXTRA CONTEXT VAN ADMIN:`);
    parts.push(additionalContext);
  }

  return parts.join('\n');
}

// Phase-specific section definitions
const AANKOOP_SECTIONS = ['achtergrond', 'zoektocht', 'uitdaging', 'oplossing', 'beslissing', 'quote_highlight', 'kerngegevens'];
const OPLEVERING_SECTIONS = ['oplevering_ervaring', 'resultaat', 'tip', 'quote_highlight'];

// ============================================
// BRAINSTORM PROMPTS (Step 1 - Free text, deep thinking)
// ============================================

function getBrainstormSystemPrompt(phase: string, saleStatus?: SaleStatus): string {
  const baseContext = `Je bent een ervaren verhalenverteller en strategisch denker die klantverhalen analyseert voor Top Immo Spain, een betrouwbare begeleider bij vastgoedinvesteringen in Spanje.

OVER TOP IMMO SPAIN:
- Geen makelaar, maar een persoonlijke begeleider/adviseur die klanten door het hele aankoopproces leidt
- Gespecialiseerd in Costa Blanca Zuid en Costa Cálida
- Filosofie: eerst vertrouwen opbouwen, dan pas zakendoen. Geen harde verkoop, geen druk
- Biedt een persoonlijk klantenportaal waar klanten zelfstandig onderzoek kunnen doen

JE TAAK: Analyseer het klantdossier en schrijf een uitgebreide, narratieve analyse van het klantverhaal. Dit is een BRAINSTORM — je hoeft geen JSON of gestructureerd format te volgen. Schrijf vrij, diep en narratief.

VERBODEN WOORDEN/CONCEPTEN:
- Gebruik NOOIT de termen "6-fasenmodel", "stappenplan", "proces", "traject" of andere procesmatige taal
- Top Immo Spain werkt met persoonlijke begeleiding, niet met een rigide procesmodel
- Vermijd vage beloftes over rendement of waardestijging tenzij er concrete cijfers in het dossier staan

SCHRIJFSTIJL:
- Schrijf ALTIJD vanuit het perspectief van de klant (1e persoon: "wij" of "ik")
- Gebruik concrete details, namen, locaties en momenten uit het dossier
- Beschrijf emoties: wat voelde de klant op cruciale momenten?
- Zoek naar het keerpunt in het verhaal: wanneer sloeg twijfel om in vertrouwen?
- Maak het persoonlijk en herkenbaar, niet generiek`;

  // Add sale status context
  const statusInstruction = getSaleStatusInstruction(saleStatus);
  const statusContext = statusInstruction ? `\n\nTIJDSVORM-INSTRUCTIE OP BASIS VAN VERKOOPSTATUS:${statusInstruction}` : '';

  if (phase === 'oplevering') {
    return baseContext + statusContext + `

FASE: OPLEVERING — je schrijft een aanvulling op een bestaand aankoopverhaal.

Focus je analyse op:
1. HOE VOELDE DE OPLEVERING? — Het moment van de sleuteloverdracht, de eerste keer binnenstappen, de eindinspectie. Was er spanning? Opluchting? Trots?
2. WAT IS HET CONCRETE RESULTAAT? — Alleen als er data is: verhuurrendement, waardestijging, bezettingsgraad. Geen vage verwachtingen.
3. WAT ZOU DE KLANT ANDEREN ADVISEREN? — Specifiek, praktisch advies vanuit hun complete ervaring.
4. DE KERNQUOTE — Eén krachtige zin die de complete reis (aankoop + oplevering) samenvat.

Schrijf minimaal 500 woorden. Graaf diep in de emoties en concrete ervaringen.`;
  }

  const aankoopPhaseNote = saleStatus && saleStatus !== 'afgerond' && saleStatus !== 'geannuleerd'
    ? `FASE: AANKOOP — het verhaal tot en met de aankoop. De woning is nog NIET opgeleverd. Respecteer dit STRIKT in je woordkeuze en tijdsvorm.`
    : `FASE: AANKOOP — het verhaal tot en met de aankoop.`;

  return baseContext + statusContext + `

${aankoopPhaseNote}

STAP 0 — DE UNIEKE HAAK:
Voordat je begint te schrijven, beantwoord deze cruciale vraag: "Wat maakt DIT verhaal anders dan de andere 20+ verhalen op de website?" Elk klantverhaal heeft iets unieks — een onverwachte wending, een bijzondere motivatie, een moment dat je niet zou verwachten. Identificeer die haak en maak het de rode draad van je analyse.

Voorbeelden van unieke haken:
- Een gezin dat per ongeluk op een project stuitte tijdens een vakantie
- Een investeerder die 3 jaar twijfelde en dan in één week besliste
- Een koppel dat eigenlijk naar Frankrijk wilde maar verliefd werd op de Costa Cálida
- Een alleenstaande die voor het eerst iets groots alleen deed

SCHRIJFINSTRUCTIES:
Je hoeft NIET een vaste structuur te volgen. Gebruik de narratieve elementen hieronder als INSPIRATIE, niet als checklist. Diep de 2-3 sterkste elementen uit in plaats van alle 8 oppervlakkig te behandelen.

Mogelijke narratieve elementen (kies wat het sterkst is voor DIT verhaal):
- DE BEGINSITUATIE — Wie zijn deze mensen? Levensfase, motivatie, waarom Spanje?
- HET EERSTE CONTACT — Hoe kwamen ze bij TIS terecht? Eerste indruk?
- DE TWIJFELS EN ZORGEN — Concrete angsten: juridisch, financieel, taalbarrière, vertrouwen?
- HET KEERPUNT — Wanneer sloeg twijfel om in vertrouwen? Beschrijf dit als een scène.
- DE PERSOONLIJKE BEGELEIDING — Specifieke momenten, niet generieke lof.
- DE BESLISSING — Het moment van tekenen. Waar, wie erbij, wat zeiden ze?
- KERNGEGEVENS — Locatie, woningtype, regio, profiel, aankoopjaar.

${saleStatus && saleStatus !== 'afgerond' ? 'SCHRIJF ABSOLUUT GEEN "resultaat" of "tip" secties. De woning is nog niet opgeleverd.' : ''}

Schrijf zo diep en uitgebreid als de beschikbare data toelaat. Vermijd opvulling of generieke tekst — elk detail moet uit het dossier komen. Bij een dun dossier is een kort maar concreet verhaal beter dan een lang verhaal met opvulling.`;
}

// ============================================
// FORMALIZER PROMPTS (Step 2 - Structure brainstorm into JSON)
// ============================================

function getFormalizerSystemPrompt(phase: string, saleStatus?: SaleStatus): string {
  const base = `Je bent een content formatter en conversie-specialist voor Top Immo Spain, een betrouwbare begeleider bij vastgoedinvesteringen in Spanje.

Je ontvangt een uitgeschreven narratieve analyse (brainstorm) van een klantverhaal en je taak is om deze om te zetten naar een gestructureerd JSON-format dat klaar is voor publicatie op meerdere touchpoints (website, social media, overzichtspagina's).

TONE OF VOICE:
- Warm, persoonlijk en betrouwbaar — als een vriend die advies geeft, niet als een verkoper
- Menselijk en empathisch, geen corporate taal
- Concreet en specifiek, nooit vaag of generiek
- Adviserend, niet pusherig

HARDE REGELS:
- Voeg NIETS toe wat niet in de brainstorm staat
- Behoud het 1e-persoon perspectief ("wij" / "ik") — verander dit NOOIT naar 3e persoon
- Elke sectie MOET minimaal 3-4 zinnen bevatten. Geen enkele sectie mag korter zijn.
- Gebruik HTML tags voor story_content: <h2>, <p>, <strong>, <em>
- De quote moet standalone bruikbaar zijn — niet een herhaling van de intro
- Gebruik NOOIT de woorden "6-fasenmodel", "stappenplan", "proces" of "traject"
- Vul metrics/kerngegevens ALLEEN in met concrete cijfers uit de brainstorm. Geen vage verwachtingen of "verwachte waardestijging"

UNIEKE HAAK:
- Identificeer de UNIEKE HAAK uit de brainstorm — het element dat dit verhaal onderscheidt van alle andere klantverhalen.
- Zorg dat deze haak terugkomt in story_title, story_intro en minstens één verhaalsectie als rode draad.

VERPLICHTE VELDEN:
- story_intro is VERPLICHT en mag NOOIT leeg zijn. Het moet exact 2 zinnen zijn die beginnen met een CONCREET BEELD of MOMENT uit het verhaal. GEEN retorische vragen. GEEN generieke openers als "Wat als je spaargeld...". De lezer moet meteen weten dat dit een echt verhaal is over echte mensen.
- card_subtitle is VERPLICHT: korte EMOTIONELE context + locatie (max 8 woorden). NIET puur informatief. Bijv. "Van twijfel naar droomhuis • Costa Blanca" of "Eerste investering in Spanje • Los Alcázares". NIET "Appartement in Torrevieja • Costa Blanca".
- quote_emotional is VERPLICHT: 2-3 zinnen focus op GEVOEL. Framework: (1) angst/twijfel VOOR TIS, (2) wat TIS anders deed, (3) gevoel NA de beslissing.
- quote_concrete is VERPLICHT: 2-3 zinnen focus op FEITEN/RESULTAAT. Framework: (1) het concrete probleem, (2) hoe TIS het oploste, (3) het tastbare resultaat.
- quote: kies de sterkste van de twee varianten als primaire quote.

SEO-RICHTLIJNEN:
- Verwerk ALTIJD de locatie (stad/regio) en het woningtype in story_title
- Voorbeeld: "Mark & Lisa: Ons droomappartement aan de Costa Blanca" i.p.v. "Mark & Lisa: Onze reis naar Spanje"
- story_intro moet ook locatie of woningtype bevatten waar mogelijk`;

  // Add sale status context to formalizer
  const statusInstruction = getSaleStatusInstruction(saleStatus);
  const statusContext = statusInstruction ? `\n\nTIJDSVORM-INSTRUCTIE:${statusInstruction}\nRespecteer deze tijdsvorm STRIKT in alle output-velden.` : '';

  if (phase === 'oplevering') {
    return base + statusContext + `

Je structureert aanvullende secties voor een BESTAAND aankoopverhaal (oplevering fase).`;
  }

  const tenseNote = saleStatus && saleStatus !== 'afgerond' && saleStatus !== 'geannuleerd'
    ? `Je structureert het volledige aankoopverhaal. Genereer GEEN "resultaat" of "tip" secties. De woning is NOG NIET opgeleverd — respecteer dit in alle formuleringen.`
    : `Je structureert het volledige aankoopverhaal. Genereer GEEN "resultaat" of "tip" secties.`;

  return base + statusContext + `\n\n${tenseNote}`;
}

function getFormalizerUserPrompt(phase: string, brainstormText: string, existingSections?: any[]): string {
  if (phase === 'oplevering') {
    const existingContext = existingSections 
      ? `\n\nBESTAANDE SECTIES (ter referentie):\n${existingSections.map(s => `- ${s.type}: ${s.title}`).join('\n')}`
      : '';

    return `Structureer deze brainstorm naar JSON-secties voor de OPLEVERING fase:

---
${brainstormText}
---
${existingContext}

Lever EXACT dit JSON formaat:
{
  "quote": "Nieuwe quote die de COMPLETE ervaring samenvat (aankoop + oplevering) — minimaal 2 zinnen",
  "story_sections": [
    {
      "type": "oplevering_ervaring",
      "title": "De Oplevering",
      "content": "Minimaal 3-4 zinnen over de sleuteloverdracht"
    },
    {
      "type": "resultaat",
      "title": "Het Resultaat",
      "content": "Minimaal 3-4 zinnen over concrete voordelen",
      "metrics": {
        "tevredenheid": "ALLEEN invullen met concreet cijfer of weglaten",
        "roi": "ALLEEN invullen met concreet percentage of weglaten",
        "verhuurrendement": "ALLEEN invullen met concreet percentage of weglaten"
      }
    },
    {
      "type": "tip",
      "title": "Tip voor Andere Investeerders",
      "content": "Minimaal 3-4 zinnen praktisch advies"
    },
    {
      "type": "quote_highlight",
      "title": "Kernquote",
      "content": "De meest krachtige zin over de complete reis"
    }
  ],
  "story_content_addition": "HTML content voor de aanvullende secties met <h2> en <p> tags"
}`;
  }

  return `Structureer deze brainstorm naar een compleet klantverhaal in JSON-format:

---
${brainstormText}
---

Lever EXACT dit JSON formaat:
{
  "quote": "De sterkste van de twee quote-varianten hieronder — standalone bruikbaar op homepage en projectpagina's",
  "quote_emotional": "VERPLICHT — 2-3 zinnen focus op GEVOEL. Framework: (1) angst/twijfel VOOR TIS, (2) wat TIS anders deed, (3) gevoel NA de beslissing.",
  "quote_concrete": "VERPLICHT — 2-3 zinnen focus op FEITEN. Framework: (1) het concrete probleem, (2) hoe TIS het oploste, (3) het tastbare resultaat.",
  "story_title": "Pakkende titel met locatie/woningtype: bijv. 'Mark & Lisa: Ons droomappartement aan de Costa Blanca'",
  "story_intro": "VERPLICHT — exact 2 zinnen. Begin met een CONCREET BEELD of MOMENT. GEEN retorische vragen.",
  "card_subtitle": "VERPLICHT — max 8 woorden EMOTIONELE context + locatie. Bijv. 'Van twijfel naar droomhuis • Costa Blanca'. NIET puur informatief.",
  "story_sections": [
    {
      "type": "achtergrond",
      "title": "De Beginsituatie",
      "content": "Minimaal 3-4 zinnen over levensfase, motivatie, waarom Spanje"
    },
    {
      "type": "zoektocht",
      "title": "De Zoektocht",
      "content": "Minimaal 3-4 zinnen over hoe ze bij Top Immo Spain kwamen"
    },
    {
      "type": "uitdaging",
      "title": "De Uitdaging",
      "content": "Minimaal 4-5 zinnen over twijfels, zorgen, specifieke obstakels"
    },
    {
      "type": "oplossing",
      "title": "De Aanpak van Top Immo Spain",
      "content": "Minimaal 5-6 zinnen over persoonlijke begeleiding, concrete momenten"
    },
    {
      "type": "beslissing",
      "title": "De Beslissing",
      "content": "Minimaal 4-5 zinnen over het moment van de aankoop: het tekenen, de emotie, wat gaf de doorslag"
    },
    {
      "type": "quote_highlight",
      "title": "Kernquote",
      "content": "De meest krachtige zin uit het hele verhaal"
    },
    {
      "type": "kerngegevens",
      "title": "Kerngegevens",
      "content": "",
      "metadata": {
        "locatie": "stad — ALLEEN invullen als concreet bekend",
        "woningtype": "type woning — ALLEEN invullen als concreet bekend",
        "regio": "Costa Blanca Zuid / Costa Cálida — ALLEEN invullen als concreet bekend",
        "investeerdersprofiel": "korte omschrijving",
        "aankoopjaar": "ALLEEN invullen met concreet jaar"
      }
    }
  ]
}

KRITIEKE REGELS:
1. story_intro is VERPLICHT en mag NOOIT leeg of null zijn. Exact 2 zinnen. Begin met een CONCREET BEELD of MOMENT.
2. card_subtitle is VERPLICHT: EMOTIONELE context + locatie. NIET "Appartement in Torrevieja" maar "Van twijfel naar droomhuis • Costa Blanca".
3. quote_emotional en quote_concrete zijn BEIDE VERPLICHT. quote = de sterkste van de twee.
4. story_title MOET locatie of woningtype bevatten voor SEO
5. story_sections bevat de secties als gestructureerde data — story_content wordt automatisch gegenereerd, je hoeft het NIET mee te geven
6. GEEN "resultaat" of "tip" secties
7. Elke sectie MOET minimaal 3-4 zinnen bevatten — dit is VERPLICHT`;
}

// Keep legacy single-step prompts for backward compatibility
function getSystemPromptForPhase(phase: string): string {
  // Combine brainstorm + formalizer logic for legacy single-step mode
  return getBrainstormSystemPrompt(phase);
}

function getUserPromptForPhase(phase: string, dossierText: string, existingSections?: any[]): string {
  return getFormalizerUserPrompt(phase, dossierText, existingSections);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const _authClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { error: authError } = await _authClient.auth.getClaims(authHeader.replace('Bearer ', ''));
  if (authError) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const { 
      customer_name, 
      location, 
      customer_type, 
      property_type, 
      investment_type,
      year,
      additional_context,
      sale_id,
      context_only,
      phase,
      review_id,
      step, // 'brainstorm' | 'formalize' | 'interview' | undefined (legacy)
      brainstorm_text, // edited brainstorm text for formalize step
      voice_memo_base64, // optional audio for brainstorm step
      voice_memo_mime_type, // mime type of voice memo
    } = await req.json();

    const storyPhase = phase || 'aankoop';

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let dossierText = '';
    let dossier: CustomerDossier | null = null;
    let dossierStats: { conversations: number; viewings: number; trips: number; milestones: number; hasTranscript?: boolean } | null = null;
    let videoTranscript: string | null = null;
    let existingSections: any[] | undefined;

    if (sale_id) {
      console.log('Building enriched customer dossier for sale:', sale_id);
      dossier = await buildCustomerDossier(supabaseAdmin, sale_id);
      
      const { data: reviewData } = await supabaseAdmin
        .from('reviews')
        .select('video_transcript, story_sections')
        .eq('sale_id', sale_id)
        .not('video_transcript', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (reviewData?.video_transcript) {
        videoTranscript = reviewData.video_transcript;
        console.log(`Video transcript found: ${videoTranscript.split(/\s+/).length} words`);
      }

      // For oplevering phase, get existing sections to provide context
      if (storyPhase === 'oplevering' && review_id) {
        const { data: existingReview } = await supabaseAdmin
          .from('reviews')
          .select('story_sections')
          .eq('id', review_id)
          .single();
        if (existingReview?.story_sections?.sections) {
          existingSections = existingReview.story_sections.sections;
        }
      }

      if (dossier) {
        dossierText = buildDossierPrompt(dossier, additional_context, videoTranscript);
        dossierStats = {
          conversations: dossier.conversations.length,
          viewings: dossier.viewingFeedback.length,
          trips: dossier.tripDetails.length,
          milestones: dossier.timeline.length,
          notes: dossier.crmNotes.length,
          buildUpdates: dossier.buildUpdates.length,
          hasTranscript: !!videoTranscript,
        };
        
        console.log(`Dossier built: ${dossierStats.conversations} conversations, ${dossierStats.viewings} viewings, ${dossierStats.trips} trips, ${dossierStats.milestones} milestones, ${(dossierStats as any).notes || 0} notes, ${dossierStats.buildUpdates} buildUpdates, transcript: ${dossierStats.hasTranscript}`);
      }
    }

    // Handle context_only
    if (context_only) {
      const stats = dossierStats || { conversations: 0, viewings: 0, trips: 0, milestones: 0, notes: 0, buildUpdates: 0, hasTranscript: !!videoTranscript };
      const transcriptPreview = videoTranscript 
        ? videoTranscript.substring(0, 2000) + (videoTranscript.length > 2000 ? '...' : '')
        : null;
      return new Response(
        JSON.stringify({ 
          context: {
            ...stats,
            notes: dossier?.crmNotes?.length || 0,
            buildUpdates: dossier?.buildUpdates?.length || 0,
            hasTranscript: !!videoTranscript,
            transcriptWords: videoTranscript ? videoTranscript.split(/\s+/).length : 0,
          },
          dossierDetails: {
            conversations: dossier?.conversations || [],
            viewingFeedback: dossier?.viewingFeedback || [],
            tripDetails: dossier?.tripDetails || [],
            timeline: dossier?.timeline || [],
            crmNotes: dossier?.crmNotes || [],
            videoTranscriptPreview: transcriptPreview,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (!dossierText && !brainstorm_text) {
      console.log('Using basic context for:', customer_name);
      const contextParts = [
        `Klant: ${customer_name}`,
        `Locatie vastgoed: ${location}`,
        `Type investeerder: ${customer_type}`,
        `Type woning: ${property_type}`,
        `Type investering: ${investment_type}`,
      ];
      if (year) contextParts.push(`Jaar: ${year}`);
      if (additional_context) contextParts.push(`Extra context: ${additional_context}`);
      dossierText = contextParts.join('\n');
    }

    // ============================================
    // STEP 0: INTERVIEW (analyze dossier, generate questions)
    // ============================================
    if (step === 'interview') {
      console.log(`[INTERVIEW] Analyzing dossier gaps for sale: ${sale_id}`);

      const interviewStatusInstruction = getSaleStatusInstruction(dossier?.saleStatus);
      const interviewPhaseContext = dossier?.saleStatus && dossier.saleStatus !== 'afgerond' && dossier.saleStatus !== 'geannuleerd'
        ? `\n\nBELANGRIJK: De woning is nog NIET opgeleverd (status: ${dossier.saleStatus}). Stel GEEN vragen over hoe het voelt om in de woning te wonen, de oplevering, of het resultaat. Focus op het aankoopproces en de beslissing.`
        : '';

      const interviewPrompt = `Je bent een ervaren interviewer die klantverhalen voorbereidt voor Top Immo Spain. Je analyseert een klantdossier en identificeert ONTBREKENDE informatie die nodig is om een rijk, emotioneel en concreet klantverhaal te schrijven.

REGELS:
- Stel 4-6 gerichte, specifieke vragen
- Focus op EMOTIES, KEERPUNTEN en PERSOONLIJKE DETAILS die niet in het dossier staan
- Vermijd vragen waarvan het antwoord al in het dossier staat
- Vragen moeten praktisch beantwoordbaar zijn door een makelaar/adviseur
- Elke vraag moet het uiteindelijke verhaal concreter en menselijker maken

CATEGORIEËN voor vragen:
1. Emotionele momenten (hoe voelde de klant zich bij X?)
2. Concrete anekdotes (was er een specifiek moment dat...)
3. Persoonlijke achtergrond (gezinssituatie, beroep, motivatie)
4. Het keerpunt (wanneer werd twijfel vertrouwen?)
5. Specifieke begeleiding (wat deed TIS concreet anders?)
6. De beslissing (het moment van tekenen/aankopen — hoe voelde dat?)

Geef je antwoord als JSON array.${interviewPhaseContext}${interviewStatusInstruction ? `\n\nTIJDSVORM-CONTEXT:${interviewStatusInstruction}` : ''}`;

      const interviewUserPrompt = `Analyseer dit klantdossier en genereer gerichte vragen over wat ONTBREEKT voor een goed klantverhaal:

${dossierText}

Geef EXACT dit JSON-formaat terug:
{
  "questions": [
    {
      "question": "De specifieke vraag",
      "why": "Waarom deze info belangrijk is voor het verhaal",
      "placeholder": "Voorbeeld-antwoord ter inspiratie",
      "category": "emotie | anekdote | achtergrond | keerpunt | begeleiding"
    }
  ]
}`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: interviewPrompt },
            { role: 'user', content: interviewUserPrompt },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limits exceeded. Probeer het later opnieuw.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: 'Geen credits beschikbaar. Voeg credits toe aan je workspace.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const errorText = await response.text();
        console.error('AI gateway error:', response.status, errorText);
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('No interview questions generated');

      const parsed = JSON.parse(content);
      console.log(`[INTERVIEW] Generated ${parsed.questions?.length || 0} questions`);

      return new Response(
        JSON.stringify({ questions: parsed.questions || [], context: dossierStats }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // ============================================
    // STEP 1: BRAINSTORM (free text, Gemini 2.5 Pro)
    // ============================================
    if (step === 'brainstorm') {
      // Load custom prompt/model from ai_prompts if available
      const { data: brainstormConfig } = await supabaseAdmin
        .from('ai_prompts')
        .select('prompt_text, model_id')
        .eq('prompt_key', 'customer_story_brainstormer')
        .maybeSingle();

      // For oplevering phase: fetch existing brainstorm_insights for context
      let previousBrainstorm = '';
      if (storyPhase === 'oplevering' && review_id) {
        const { data: existingReview } = await supabaseAdmin
          .from('reviews')
          .select('brainstorm_insights')
          .eq('id', review_id)
          .single();
        if (existingReview?.brainstorm_insights) {
          previousBrainstorm = existingReview.brainstorm_insights as string;
          console.log(`[BRAINSTORM] Including previous brainstorm_insights (${previousBrainstorm.split(/\s+/).length} words)`);
        }
      }

      // Upload voice memo to storage if present
      let voiceMemoUrl: string | null = null;
      if (voice_memo_base64 && review_id) {
        try {
          const ext = voice_memo_mime_type?.includes('mp4') ? 'mp4' : voice_memo_mime_type?.includes('webm') ? 'webm' : 'wav';
          const filePath = `${sale_id}/${review_id}/voice-memo.${ext}`;
          const buffer = Uint8Array.from(atob(voice_memo_base64), c => c.charCodeAt(0));
          const { error: uploadError } = await supabaseAdmin.storage
            .from('voice-memos')
            .upload(filePath, buffer, { contentType: voice_memo_mime_type || 'audio/webm', upsert: true });
          if (uploadError) {
            console.error('Voice memo upload error:', uploadError);
          } else {
            const { data: urlData } = supabaseAdmin.storage.from('voice-memos').getPublicUrl(filePath);
            voiceMemoUrl = urlData?.publicUrl || null;
            // Save URL to review
            await supabaseAdmin.from('reviews').update({ voice_memo_url: filePath } as any).eq('id', review_id);
            console.log(`[BRAINSTORM] Voice memo saved: ${filePath}`);
          }
        } catch (e) {
          console.error('Voice memo storage error:', e);
        }
      }

      // Always append sale status context, even for custom prompts
      const statusSuffix = getSaleStatusInstruction(dossier?.saleStatus);
      const basePrompt = brainstormConfig?.prompt_text || getBrainstormSystemPrompt(storyPhase, dossier?.saleStatus);
      const systemPrompt = brainstormConfig?.prompt_text ? basePrompt + (statusSuffix ? `\n\nTIJDSVORM-INSTRUCTIE:${statusSuffix}` : '') : basePrompt;
      const brainstormModel = brainstormConfig?.model_id || 'google/gemini-2.5-pro';
      
      let userPromptText = `Analyseer dit klantdossier en schrijf een uitgebreide narratieve analyse voor het klantverhaal:\n\n${dossierText}`;
      if (previousBrainstorm) {
        userPromptText += `\n\nEERDERE BRAINSTORM (aankoopfase) — gebruik dit als referentie en bouw hierop voort:\n${previousBrainstorm.substring(0, 3000)}`;
      }

      // Build user message content — text + optional audio
      const userContent: any[] = [];
      if (voice_memo_base64) {
        const audioFormat = voice_memo_mime_type?.includes('mp4') ? 'mp4' : voice_memo_mime_type?.includes('webm') ? 'webm' : 'wav';
        userContent.push({
          type: 'input_audio',
          input_audio: { data: voice_memo_base64, format: audioFormat },
        });
        userContent.push({
          type: 'text',
          text: `De makelaar heeft een voice memo ingesproken met extra context over deze klant. Luister hier aandachtig naar en verwerk alle relevante informatie in je brainstorm.\n\n${userPromptText}`,
        });
        console.log(`[BRAINSTORM] Including voice memo (${audioFormat}, ~${Math.round(voice_memo_base64.length / 1024)}KB base64)`);
      } else {
        userContent.push({ type: 'text', text: userPromptText });
      }

      console.log(`[BRAINSTORM] Generating brainstorm for phase: ${storyPhase} using ${brainstormModel}`);

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: brainstormModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: voice_memo_base64 ? userContent : userPromptText }
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limits exceeded. Probeer het later opnieuw.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: 'Geen credits beschikbaar. Voeg credits toe aan je workspace.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const errorText = await response.text();
        console.error('AI gateway error:', response.status, errorText);
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const brainstormContent = data.choices?.[0]?.message?.content;

      if (!brainstormContent) {
        throw new Error('No brainstorm content generated');
      }

      console.log(`[BRAINSTORM] Generated ${brainstormContent.split(/\s+/).length} words`);

      return new Response(
        JSON.stringify({ 
          brainstorm: brainstormContent,
          phase: storyPhase,
          context: dossierStats,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // ============================================
    // STEP 2: FORMALIZE (JSON structure, Gemini 2.5 Flash)
    // ============================================
    if (step === 'formalize') {
      if (!brainstorm_text) {
        throw new Error('brainstorm_text is required for formalize step');
      }

      // Load custom prompt/model from ai_prompts if available
      const { data: formalizeConfig } = await supabaseAdmin
        .from('ai_prompts')
        .select('prompt_text, model_id')
        .eq('prompt_key', 'customer_story_formalizer')
        .maybeSingle();

      // Always append sale status context, even for custom prompts
      const fStatusSuffix = getSaleStatusInstruction(dossier?.saleStatus);
      const fBasePrompt = formalizeConfig?.prompt_text || getFormalizerSystemPrompt(storyPhase, dossier?.saleStatus);
      const systemPrompt = formalizeConfig?.prompt_text ? fBasePrompt + (fStatusSuffix ? `\n\nTIJDSVORM-INSTRUCTIE:${fStatusSuffix}\nRespecteer deze tijdsvorm STRIKT in alle output-velden.` : '') : fBasePrompt;
      const formalizeModel = formalizeConfig?.model_id || 'google/gemini-2.5-flash';
      const userPrompt = getFormalizerUserPrompt(storyPhase, brainstorm_text, existingSections);

      console.log(`[FORMALIZE] Structuring brainstorm for phase: ${storyPhase} using ${formalizeModel}`);

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: formalizeModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limits exceeded. Probeer het later opnieuw.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: 'Geen credits beschikbaar. Voeg credits toe aan je workspace.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const errorText = await response.text();
        console.error('AI gateway error:', response.status, errorText);
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No formalized content generated');
      }

      const generatedStory = JSON.parse(content);

      // Wrap story_sections in the expected format if it's an array
      if (Array.isArray(generatedStory.story_sections)) {
        generatedStory.story_sections = { sections: generatedStory.story_sections };
      }

      // Normalize title → heading for UI compatibility
      if (generatedStory.story_sections?.sections) {
        generatedStory.story_sections.sections = generatedStory.story_sections.sections.map((s: any) => ({
          ...s,
          heading: s.heading || s.title,
        }));
      }

      // Auto-generate story_content from story_sections if not present or to ensure consistency
      if (generatedStory.story_sections?.sections) {
        const htmlParts = generatedStory.story_sections.sections
          .filter((s: any) => s.type !== 'kerngegevens')
          .map((s: any) => `<h2>${s.heading || s.title || ''}</h2>\n<p>${(s.content || '').replace(/\n/g, '</p>\n<p>')}</p>`)
          .join('\n\n');
        generatedStory.story_content = htmlParts;
      }

      // For oplevering phase: merge with existing sections
      if (storyPhase === 'oplevering' && existingSections) {
        const newSections = generatedStory.story_sections?.sections || [];
        generatedStory.merged_sections = {
          sections: [...existingSections, ...newSections]
        };
        console.log(`Merged ${existingSections.length} existing + ${newSections.length} new sections`);
      }

      generatedStory.phase = storyPhase;

      console.log(`[FORMALIZE] Successfully structured customer story`);

      return new Response(
        JSON.stringify({ ...generatedStory, context: dossierStats }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // ============================================
    // LEGACY: Single-step generation (backward compatibility)
    // ============================================
    const systemPrompt = getSystemPromptForPhase(storyPhase);
    const userPrompt = getUserPromptForPhase(storyPhase, dossierText, existingSections);

    console.log(`[LEGACY] Generating story in single step for phase: ${storyPhase}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limits exceeded. Probeer het later opnieuw.' }), 
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Geen credits beschikbaar. Voeg credits toe aan je workspace.' }), 
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content generated');
    }

    const generatedStory = JSON.parse(content);
    
    // Wrap story_sections in the expected format if it's an array
    if (Array.isArray(generatedStory.story_sections)) {
      generatedStory.story_sections = { sections: generatedStory.story_sections };
    }

    // Normalize title → heading for UI compatibility
    if (generatedStory.story_sections?.sections) {
      generatedStory.story_sections.sections = generatedStory.story_sections.sections.map((s: any) => ({
        ...s,
        heading: s.heading || s.title,
      }));
    }

    // Auto-generate story_content from story_sections
    if (generatedStory.story_sections?.sections) {
      const htmlParts = generatedStory.story_sections.sections
        .filter((s: any) => s.type !== 'kerngegevens')
        .map((s: any) => `<h2>${s.heading || s.title || ''}</h2>\n<p>${(s.content || '').replace(/\n/g, '</p>\n<p>')}</p>`)
        .join('\n\n');
      generatedStory.story_content = htmlParts;
    }
    
    // For oplevering phase: merge with existing sections
    if (storyPhase === 'oplevering' && existingSections) {
      const newSections = generatedStory.story_sections?.sections || [];
      generatedStory.merged_sections = {
        sections: [...existingSections, ...newSections]
      };
      console.log(`Merged ${existingSections.length} existing + ${newSections.length} new sections`);
    }

    generatedStory.phase = storyPhase;
    
    console.log(`Successfully generated customer story for phase: ${storyPhase}`);
    
    return new Response(
      JSON.stringify({ ...generatedStory, context: dossierStats }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error generating customer story:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Er ging iets mis bij het genereren van het verhaal'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
