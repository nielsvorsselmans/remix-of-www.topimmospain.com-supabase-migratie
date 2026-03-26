import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { 
  Receipt, Clock, CheckCircle2, AlertTriangle, Copy, ExternalLink,
  FileText, Briefcase, Settings, Key, ClipboardCheck, Send, Zap,
  Bot, ArrowRight, Shield, Brain, MessageSquare, Bell, Link2, Lock
} from "lucide-react";
import { toast } from "sonner";
import {
  GEBLOKKEERD_CHECKLIST, RESERVATIE_CHECKLIST, KOOPCONTRACT_CHECKLIST, VOORBEREIDING_CHECKLIST,
  AKKOORD_CHECKLIST, OVERDRACHT_CHECKLIST, NAZORG_CHECKLIST, MILESTONE_GROUPS,
} from "@/hooks/checklistTemplates";
import { TASK_PREREQUISITES, CHECKLIST_DOCUMENT_MAPPING } from "@/components/admin/checklist/utils";

// ── Helpers ──────────────────────────────────────────────────────────────────

const copyToClipboard = (text: string, label: string) => {
  navigator.clipboard.writeText(text);
  toast.success(`${label} gekopieerd naar klembord`);
};

// ── Phase configuration ─────────────────────────────────────────────────────

const PHASE_CONFIG = [
  { key: 'geblokkeerd', label: 'Geblokkeerd', icon: Lock, color: 'bg-slate-500', duration: '1-5 dagen', checklist: GEBLOKKEERD_CHECKLIST },
  { key: 'reservatie', label: 'Reservatie', icon: FileText, color: 'bg-blue-500', duration: '1-2 weken', checklist: RESERVATIE_CHECKLIST },
  { key: 'koopcontract', label: 'Koopcontract', icon: Briefcase, color: 'bg-purple-500', duration: '2-4 weken', checklist: KOOPCONTRACT_CHECKLIST },
  { key: 'voorbereiding', label: 'Voorbereiding', icon: Settings, color: 'bg-amber-500', duration: '2-6 maanden', checklist: VOORBEREIDING_CHECKLIST },
  { key: 'akkoord', label: 'Akkoord', icon: CheckCircle2, color: 'bg-green-500', duration: '1-2 weken', checklist: AKKOORD_CHECKLIST },
  { key: 'overdracht', label: 'Overdracht', icon: Key, color: 'bg-red-500', duration: '1 dag', checklist: OVERDRACHT_CHECKLIST },
  { key: 'nazorg', label: 'Nazorg', icon: Shield, color: 'bg-emerald-500', duration: '2-4 weken', checklist: NAZORG_CHECKLIST },
] as const;

const totalTasks = PHASE_CONFIG.reduce((sum, p) => sum + p.checklist.length, 0);

// ── Task documentation map (linked to template_key) ─────────────────────────

interface TaskDocData {
  estimatedTime: string;
  autoTrigger?: string;
  steps: { step: number; title: string; description: string }[];
  templates?: { label: string; content: string }[];
  tips?: string[];
  systemLinks?: { label: string; path: string }[];
}

const TASK_DOCUMENTATION: Partial<Record<string, TaskDocData>> = {
  // ── Reservatie ──
  res_koperdata: {
    estimatedTime: '15-20 min',
    autoTrigger: 'Taak wordt automatisch afgevinkt wanneer alle kopers hun data hebben ingevuld',
    steps: [
      { step: 1, title: 'Ga naar de verkoop in het systeem', description: 'Navigeer naar Admin → Verkopen → [Verkoop selecteren]' },
      { step: 2, title: 'Open de Klanten tab', description: "Klik op de 'Klanten' tab in de verkoop details" },
      { step: 3, title: 'Kopieer de koper-link', description: "Klik op 'Link Kopiëren' naast de betreffende koper" },
      { step: 4, title: 'Stuur de link naar de klant', description: 'Via WhatsApp of e-mail met onderstaande template' },
      { step: 5, title: 'Wacht op invulling', description: 'Klant vult formulier in met adres, identificatie en paspoort' },
      { step: 6, title: 'Controleer volledigheid', description: 'Check of alle velden zijn ingevuld en paspoort duidelijk is' },
    ],
    templates: [{
      label: 'WhatsApp template',
      content: `Beste [Naam],

Gefeliciteerd met je reservatie bij [Project]! 🎉

Om verder te kunnen met het reservatiecontract hebben we enkele gegevens nodig. Je kunt deze invullen via onderstaande link:

[LINK]

Wat we nodig hebben:
✅ Adresgegevens
✅ Identificatie (BSN/NIE, geboortedatum)
✅ Kopie paspoort

De link is 30 dagen geldig. Heb je vragen? Laat het gerust weten!

Met vriendelijke groet,
Top Immo Spain`
    }],
    tips: [
      'Belgische klanten hebben geen BSN - gebruik rijksregisternummer',
      'Controleer of de pasfoto op het paspoort duidelijk leesbaar is',
      'Bij meerdere kopers: elke koper ontvangt een eigen link',
      'Link sluit automatisch zodra het reservatiecontract is geüpload',
    ],
    systemLinks: [{ label: 'Verkopen overzicht', path: '/admin/verkopen' }],
  },
  res_contract_upload: {
    estimatedTime: '5 min',
    autoTrigger: "Taak afgerond bij upload van document type 'Reservatiecontract'",
    steps: [
      { step: 1, title: 'Ontvang contract van developer', description: 'Developer stuurt reservatiecontract per e-mail' },
      { step: 2, title: 'Open Documenten tab', description: 'Ga naar de verkoop → Documenten tab' },
      { step: 3, title: 'Upload het contract', description: "Klik 'Document uploaden', selecteer type 'Reservatiecontract'" },
      { step: 4, title: 'Zet zichtbaarheid', description: "Vink 'Zichtbaar voor klant' aan" },
    ],
    tips: ['Contract moet PDF formaat zijn', 'Controleer of alle pagina\'s aanwezig zijn', 'Koper-link sluit automatisch na upload'],
  },
  res_advocaat: {
    estimatedTime: '10 min',
    steps: [
      { step: 1, title: 'Download het contract', description: 'Download het geüploade reservatiecontract' },
      { step: 2, title: 'Stuur naar advocaat', description: 'E-mail het contract naar de advocaat met onderstaande template' },
      { step: 3, title: 'Markeer taak als voltooid', description: 'Vink de taak af in de checklist' },
    ],
    templates: [{
      label: 'E-mail naar advocaat',
      content: `Beste [Advocaat],

Hierbij stuur ik u het reservatiecontract voor review:

Koper(s): [Namen]
Project: [Project naam]
Unit: [Unit nummer]
Prijs: €[Bedrag]

Graag ontvang ik uw feedback binnen 5 werkdagen.

Met vriendelijke groet,
Top Immo Spain`
    }],
    tips: ['Advocaat contactgegevens staan bij project contacten', 'Standaard review tijd is 5 werkdagen', 'Bij urgentie: bel de advocaat'],
  },
  res_klant_ondertekend: {
    estimatedTime: '5 min',
    autoTrigger: 'Automatisch afgevinkt wanneer handtekening status wordt bijgewerkt',
    steps: [
      { step: 1, title: 'Ontvang getekend contract', description: 'Klant stuurt getekend contract retour' },
      { step: 2, title: 'Upload getekend exemplaar', description: 'Vervang of voeg toe als nieuw document' },
      { step: 3, title: 'Markeer handtekening status', description: "Zet 'Klant ondertekend' op Ja bij het document" },
    ],
    tips: ['Digitale handtekening is toegestaan', 'Alle kopers moeten tekenen'],
  },
  res_developer_ondertekend: {
    estimatedTime: '5 min',
    autoTrigger: 'Automatisch afgevinkt wanneer developer handtekening status wordt bijgewerkt',
    steps: [
      { step: 1, title: 'Stuur naar developer', description: 'Stuur het door klant getekende contract naar developer' },
      { step: 2, title: 'Ontvang getekend exemplaar', description: 'Developer retourneert volledig getekend contract' },
      { step: 3, title: 'Upload definitieve versie', description: 'Upload het volledig getekende contract' },
      { step: 4, title: 'Markeer handtekening status', description: "Zet 'Developer ondertekend' op Ja" },
    ],
  },
  res_betaalplan: {
    estimatedTime: '10 min',
    autoTrigger: 'Afgerond wanneer minimaal 1 betaling is toegevoegd',
    steps: [
      { step: 1, title: 'Open Betalingen tab', description: 'Ga naar verkoop → Betalingen tab' },
      { step: 2, title: 'Voeg betalingen toe', description: "Klik 'Betaling toevoegen' voor elke termijn" },
      { step: 3, title: 'Vul details in', description: "Bedrag, vervaldatum, beschrijving (bijv. 'Aanbetaling 10%')" },
    ],
    tips: [
      "Standaard termijnen: Aanbetaling (10%), Contract (20%), Bouw fases, Oplevering (rest)",
      'Vervaldata haal je uit het contract',
      'Klant ziet dit overzicht in het portaal',
    ],
  },
  res_facturen: {
    estimatedTime: '10 min',
    steps: [
      { step: 1, title: 'Maak factuur aan', description: 'Genereer factuur voor TIS commissie' },
      { step: 2, title: 'Upload naar Facturen tab', description: 'Voeg factuur toe aan de verkoop' },
      { step: 3, title: 'Markeer status', description: "Zet op 'Verstuurd' of 'Betaald' afhankelijk van situatie" },
    ],
  },
  res_extras: {
    estimatedTime: '15 min',
    steps: [
      { step: 1, title: "Open Extra's tab", description: "Ga naar verkoop → Extra's tab" },
      { step: 2, title: 'Standaard categorieën zijn aangemaakt', description: "5 standaard categorieën: Lichtspots, Airco, Witgoed, Meubels, Extra's" },
      { step: 3, title: 'Configureer per categorie', description: "Markeer als 'Inbegrepen', 'Cadeau van TIS', of voeg opties toe" },
      { step: 4, title: 'Voeg documentatie toe', description: 'Upload prijslijsten of catalogi bij elke optie' },
    ],
    tips: [
      "'Cadeau van TIS' wordt van commissie afgetrokken",
      'Klant ziet alleen zichtbare categorieën in portaal',
      'Elke optie kan een PDF bijlage hebben',
    ],
  },
  res_aanbetaling: {
    estimatedTime: '5 min',
    autoTrigger: "Afgerond wanneer eerste betaling als 'Betaald' is gemarkeerd",
    steps: [
      { step: 1, title: 'Ontvang betalingsbewijs', description: 'Klant stuurt bewijs van overboeking' },
      { step: 2, title: 'Upload betalingsbewijs', description: 'Ga naar Betalingen → Upload bewijs bij de aanbetaling' },
      { step: 3, title: 'Markeer als betaald', description: "Zet betaling op 'Betaald' met ontvangstdatum" },
    ],
    tips: [
      'Meerdere bewijzen kunnen worden geüpload per betaling',
      'Check of bedrag overeenkomt met termijn',
      'Dit triggert automatisch facturatie naar developer',
    ],
  },

  // ── Koopcontract ──
  koop_grondplan: {
    estimatedTime: '5 min',
    autoTrigger: "Afgerond bij upload van document type 'Grondplan'",
    steps: [
      { step: 1, title: 'Ontvang grondplan van developer', description: 'Developer stuurt unit-specifiek grondplan' },
      { step: 2, title: 'Upload naar Documenten', description: 'Type: Grondplan/Plannen, zichtbaar voor klant' },
    ],
    tips: ['Moet de specifieke unit zijn, niet het algemene project plan', 'Controleer of afmetingen leesbaar zijn'],
  },
  koop_specificaties: {
    estimatedTime: '5 min',
    autoTrigger: "Afgerond bij upload van document type 'Specificaties'",
    steps: [
      { step: 1, title: 'Ontvang specificaties', description: 'Lijst met materialen, afwerkingen, keuzes' },
      { step: 2, title: 'Upload naar Documenten', description: 'Type: Specificaties/Technisch' },
    ],
  },
  koop_bouwvergunning: {
    estimatedTime: '5 min',
    autoTrigger: 'Afgerond bij upload',
    steps: [
      { step: 1, title: 'Vraag bouwvergunning op', description: 'Developer moet licencia de obra verstrekken' },
      { step: 2, title: 'Upload naar Documenten', description: 'Type: Juridisch' },
    ],
    tips: ['Essentieel document voor juridische zekerheid', 'Zonder dit geen hypotheek mogelijk'],
  },
  koop_kadastraal: {
    estimatedTime: '5 min',
    autoTrigger: 'Afgerond bij upload',
    steps: [
      { step: 1, title: 'Ontvang kadastrale fiche', description: 'Nota simple van het kadaster' },
      { step: 2, title: 'Upload naar Documenten', description: 'Type: Juridisch' },
    ],
  },
  koop_eigendomsregister: {
    estimatedTime: '5 min',
    autoTrigger: 'Afgerond bij upload',
    steps: [
      { step: 1, title: 'Ontvang eigendomsbewijs', description: 'Registro de la propiedad uittreksel' },
      { step: 2, title: 'Upload naar Documenten', description: 'Type: Juridisch' },
    ],
  },
  koop_bankgarantie: {
    estimatedTime: '5 min',
    autoTrigger: 'Afgerond bij upload',
    steps: [
      { step: 1, title: 'Ontvang bankgarantie', description: 'Aval bancario van de developer' },
      { step: 2, title: 'Upload naar Documenten', description: 'Type: Financieel' },
    ],
    tips: ['Verplicht bij nieuwbouw in Spanje', 'Beschermt klant bij faillissement developer'],
  },
  koop_contract: {
    estimatedTime: '5 min',
    autoTrigger: "Afgerond bij upload van document type 'Koopcontract'",
    steps: [
      { step: 1, title: 'Ontvang definitief contract', description: 'Contrato de compraventa van notaris/developer' },
      { step: 2, title: 'Upload naar Documenten', description: 'Type: Contracten, markeer als vereist handtekening' },
    ],
  },
  koop_klant_ondertekend: {
    estimatedTime: '10 min',
    autoTrigger: 'Afgerond wanneer handtekening status wordt bijgewerkt',
    steps: [
      { step: 1, title: 'Informeer klant', description: 'Stuur contract ter ondertekening met uitleg' },
      { step: 2, title: 'Ontvang getekend exemplaar', description: 'Klant retourneert ondertekend contract' },
      { step: 3, title: 'Upload en markeer', description: "Upload getekend exemplaar, markeer 'Klant ondertekend'" },
    ],
    templates: [{
      label: 'E-mail koopcontract',
      content: `Beste [Naam],

Het koopcontract voor [Project] - [Unit] is gereed voor ondertekening.

Belangrijke punten:
• Koopprijs: €[Bedrag]
• Oplevering: [Verwachte datum]
• Betalingsschema: zie bijlage

Graag ontvangen we het ondertekende contract binnen 7 dagen retour.

Met vriendelijke groet,
Top Immo Spain`
    }],
  },
  koop_developer_ondertekend: {
    estimatedTime: '5 min',
    autoTrigger: 'Afgerond wanneer developer handtekening status wordt bijgewerkt',
    steps: [
      { step: 1, title: 'Stuur naar developer', description: 'Forward getekend contract naar developer' },
      { step: 2, title: 'Ontvang volledig getekend', description: 'Developer retourneert met eigen handtekening' },
      { step: 3, title: 'Upload definitieve versie', description: 'Upload en markeer beide handtekeningen' },
    ],
  },
  koop_review_genereren: {
    estimatedTime: '10 min',
    steps: [
      { step: 1, title: 'Open Klantverhaal tab', description: 'Ga naar verkoop → Klantverhaal' },
      { step: 2, title: 'Genereer brainstorm', description: 'AI genereert een concept op basis van klantdata' },
      { step: 3, title: 'Formaliseer verhaal', description: 'Pas het concept aan en publiceer' },
    ],
  },

  // ── Voorbereiding ──
  voorb_elektriciteit: {
    estimatedTime: '5 min',
    autoTrigger: "Afgerond bij upload van document type 'Elektriciteitsplan'",
    steps: [
      { step: 1, title: 'Vraag plan op bij developer', description: 'Plano eléctrico met stopcontacten, schakelaars, etc.' },
      { step: 2, title: 'Upload naar Documenten', description: 'Type: Technisch/Plannen' },
    ],
    tips: ['Klant moet dit kunnen reviewen en goedkeuren', 'Wijzigingen moeten vóór een bepaalde deadline worden doorgegeven'],
  },
  voorb_afmetingen: {
    estimatedTime: '5 min',
    autoTrigger: "Afgerond bij upload van document type 'Afmetingenplan'",
    steps: [
      { step: 1, title: 'Ontvang opmeting', description: 'Gedetailleerde afmetingen van alle ruimtes' },
      { step: 2, title: 'Upload naar Documenten', description: 'Type: Technisch/Plannen' },
    ],
  },
  voorb_extras_docs: {
    estimatedTime: '20 min',
    steps: [
      { step: 1, title: "Controleer Extra's tab", description: 'Ga na of alle categorieën zijn geconfigureerd' },
      { step: 2, title: 'Upload catalogi/prijslijsten', description: 'Voeg documentatie toe bij elke optie' },
      { step: 3, title: 'Zet opties klaar voor klant', description: 'Markeer welke opties beschikbaar zijn' },
    ],
    tips: ["Deadline voor extra's keuze communiceren naar klant", 'Cadeaus van TIS duidelijk markeren'],
  },
  voorb_gesprek: {
    estimatedTime: '15 min',
    steps: [
      { step: 1, title: 'Plan gesprek', description: 'Bel of videocall om plannen door te nemen' },
      { step: 2, title: 'Bespreek documenten', description: "Loop grondplan, elektra en extra's door met klant" },
      { step: 3, title: 'Noteer feedback', description: 'Documenteer eventuele wijzigingsverzoeken' },
    ],
    templates: [{
      label: 'Uitnodiging klantgesprek',
      content: `Beste [Naam],

Graag plan ik een moment om de plannen van je woning door te nemen:

Te bespreken:
📐 Grondplan en afmetingen
⚡ Elektriciteitsplan (stopcontacten, schakelaars)
🛋️ Extra opties en upgrades

Beschikbare momenten deze week:
• [Dag] om [Tijd]
• [Dag] om [Tijd]

Welk moment past jou het beste?

Met vriendelijke groet,
Top Immo Spain`
    }],
  },
  voorb_aanpassingen: {
    estimatedTime: '15 min',
    steps: [
      { step: 1, title: 'Verzamel wijzigingen', description: 'Bundel alle klantfeedback en keuzes' },
      { step: 2, title: 'Stuur naar developer', description: 'E-mail met duidelijke opsomming van wijzigingen' },
      { step: 3, title: 'Bevestig ontvangst', description: 'Vraag om bevestiging van verwerking' },
    ],
    templates: [{
      label: 'E-mail wijzigingen developer',
      content: `Beste [Developer contact],

Hierbij de gewenste aanpassingen voor:
Project: [Project]
Unit: [Unit nummer]
Koper: [Naam]

ELEKTRICITEIT:
• [Wijziging 1]
• [Wijziging 2]

EXTRA'S:
• [Gekozen optie 1]
• [Gekozen optie 2]

Graag ontvang ik een bevestiging van deze wijzigingen.

Met vriendelijke groet,
Top Immo Spain`
    }],
  },

  // ── Akkoord ──
  akk_offertes_aangevraagd: {
    estimatedTime: '15 min',
    steps: [
      { step: 1, title: 'Controleer alle documenten', description: 'Grondplan, elektra, afmetingen moeten aanwezig zijn' },
      { step: 2, title: "Check extra's configuratie", description: 'Alle keuzes moeten zijn gemaakt' },
      { step: 3, title: 'Maak overzicht', description: 'Genereer samenvatting voor klant review' },
    ],
  },
  akk_offertes_ontvangen: {
    estimatedTime: '10 min',
    steps: [
      { step: 1, title: 'Stuur uitnodiging', description: 'Informeer klant dat specificaties klaar staan voor review' },
      { step: 2, title: 'Verwijs naar portaal', description: 'Klant kan alles bekijken en goedkeuren in dashboard' },
    ],
    templates: [{
      label: 'Uitnodiging specificatie akkoord',
      content: `Beste [Naam],

De specificaties van je woning zijn compleet en klaar voor jouw review en goedkeuring.

In je persoonlijke portaal kun je bekijken:
✅ Definitief grondplan
✅ Elektriciteitsplan
✅ Gekozen extra's en opties

Log in op je dashboard om alles te bekijken en goed te keuren:
[Portal link]

Deadline voor akkoord: [Datum]

Vragen? Neem gerust contact op!

Met vriendelijke groet,
Top Immo Spain`
    }],
  },
  akk_grondplan: {
    estimatedTime: '5 min',
    autoTrigger: 'Automatisch afgevinkt wanneer klant akkoord geeft via portaal',
    steps: [
      { step: 1, title: 'Klant reviewt in portaal', description: 'Klant bekijkt grondplan in dashboard/specificaties' },
      { step: 2, title: 'Klant geeft akkoord', description: "Klant klikt op 'Akkoord' knop" },
      { step: 3, title: 'Systeem registreert', description: 'Timestamp, naam en IP worden vastgelegd' },
    ],
  },
  akk_elektriciteit: {
    estimatedTime: '5 min',
    autoTrigger: 'Automatisch afgevinkt wanneer klant akkoord geeft via portaal',
    steps: [
      { step: 1, title: 'Klant reviewt elektraplan', description: 'Controleert locaties stopcontacten, schakelaars' },
      { step: 2, title: 'Klant geeft akkoord', description: 'Bevestigt dat plan correct is' },
    ],
    tips: ['Na akkoord zijn wijzigingen niet meer mogelijk zonder meerkosten', 'Wijs klant hier expliciet op'],
  },
  akk_extras: {
    estimatedTime: '5 min',
    autoTrigger: 'Automatisch afgevinkt wanneer klant akkoord geeft via portaal',
    steps: [
      { step: 1, title: "Klant reviewt gekozen extra's", description: 'Overzicht van alle opties en prijzen' },
      { step: 2, title: 'Klant bevestigt keuzes', description: 'Akkoord op geselecteerde opties' },
    ],
  },
  akk_definitief: {
    estimatedTime: '5 min',
    autoTrigger: 'Automatisch afgevinkt wanneer klant definitief akkoord geeft',
    steps: [
      { step: 1, title: 'Alle onderdelen goedgekeurd', description: "Grondplan, elektra én extra's moeten akkoord zijn" },
      { step: 2, title: 'Klant geeft definitief akkoord', description: 'Finale bevestiging van complete specificatie' },
    ],
    tips: ['Dit is het point of no return', 'Na definitief akkoord start de bouw volgens deze specs'],
  },
  akk_doorgegeven: {
    estimatedTime: '10 min',
    steps: [
      { step: 1, title: 'Genereer akkoord overzicht', description: 'Maak samenvatting van alle goedkeuringen' },
      { step: 2, title: 'Stuur naar developer', description: 'Officiële bevestiging met klanthandtekeningen' },
      { step: 3, title: 'Vraag bevestiging', description: 'Developer bevestigt ontvangst en start productie' },
    ],
    templates: [{
      label: 'E-mail akkoord developer',
      content: `Beste [Developer contact],

Hierbij de officiële specificatie-akkoord voor:

Project: [Project]
Unit: [Unit nummer]
Koper(s): [Namen]

De klant heeft akkoord gegeven op:
✅ Grondplan - [Datum akkoord]
✅ Elektriciteitsplan - [Datum akkoord]
✅ Extra's en opties - [Datum akkoord]
✅ Definitief akkoord - [Datum akkoord]

Bijgevoegd vindt u de getekende specificaties.

Graag ontvang ik een bevestiging van ontvangst.

Met vriendelijke groet,
Top Immo Spain`
    }],
  },

  // ── Overdracht ──
  overd_notaris_datum: {
    estimatedTime: '15 min',
    steps: [
      { step: 1, title: 'Ontvang datum van developer/notaris', description: 'Coördineer de notarisdatum met alle partijen' },
      { step: 2, title: 'Informeer klant', description: 'Bevestig datum, locatie en benodigde documenten' },
      { step: 3, title: 'Voer datum in in systeem', description: 'Vul de notarisdatum in bij de verkoop' },
    ],
    tips: ['Klant moet NIE en bankrekening klaar hebben', 'Reis- en verblijfsplanning tijdig bespreken'],
  },
  overd_snagging: {
    estimatedTime: '2-4 uur',
    autoTrigger: 'Afgerond wanneer inspectie is voltooid en alle items zijn afgehandeld',
    steps: [
      { step: 1, title: 'Plan inspectie', description: 'Maak afspraak met klant en developer op locatie' },
      { step: 2, title: 'Doorloop checklist', description: 'Inspecteer elk onderdeel met de snagging checklist' },
      { step: 3, title: 'Documenteer bevindingen', description: "Foto's maken van eventuele gebreken" },
      { step: 4, title: 'Maak puntenlijst', description: 'Lijst van items die hersteld moeten worden' },
      { step: 5, title: 'Laat developer tekenen', description: 'Developer bevestigt de puntenlijst' },
      { step: 6, title: 'Plan herstel', description: 'Afspraak maken voor herstel van gebreken' },
      { step: 7, title: 'Finale inspectie', description: 'Na herstel: controleer of alles is opgelost' },
      { step: 8, title: 'Sleuteloverdracht', description: 'Bij goedkeuring: officiële sleuteloverdracht' },
    ],
    tips: [
      'Neem altijd een zaklamp mee voor inspectie',
      'Test alle kranen, stopcontacten en schakelaars',
      'Controleer afwerking van tegels, voegen en schilderwerk',
      'Maak foto\'s van meterstand bij overdracht',
      'Klant moet uiteindelijk zelf tekenen voor akkoord',
    ],
    systemLinks: [{ label: 'Snagging checklist template', path: '/admin/verkopen' }],
  },
  overd_review_aanvullen: {
    estimatedTime: '15 min',
    steps: [
      { step: 1, title: 'Open Klantverhaal tab', description: 'Ga naar het bestaande klantverhaal' },
      { step: 2, title: 'Vul aan met opleverervaring', description: 'Voeg de opleveringservaring toe aan het verhaal' },
      { step: 3, title: 'Publiceer update', description: 'Werk het klantverhaal bij op de website' },
    ],
  },
};

// ── Copilot documentation per phase ──────────────────────────────────────────

const COPILOT_PHASE_DOCS: Record<string, { actions: string[]; notes: string[] }> = {
  reservatie: {
    actions: [
      '📋 **Taak voltooien** — Copilot kan voorstellen om een taak als voltooid te markeren wanneer de onderliggende data aanwezig is',
      '⏰ **Herinnering instellen** — Stel een reminder in voor opvolging (bijv. "Herinner mij in 3 dagen aan het reservatiecontract")',
      '⏸️ **Taak uitstellen** — Stel een deadline uit als de klant meer tijd nodig heeft',
      '📌 **Wachtstatus** — Markeer een taak als "Wacht op reactie" wanneer je wacht op de klant of developer',
      '➕ **Opvolgtaak toevoegen** — Voeg een extra taak toe aan de checklist die niet in het standaard template zit',
    ],
    notes: [
      'De copilot monitort of koperdata compleet is en waarschuwt wanneer het formulier langer dan 5 dagen open staat',
      'Bij de aanbetaling bewaakt de copilot de betaaltermijn en kan een herinneringsmail voorstellen',
    ],
  },
  koopcontract: {
    actions: [
      '📄 **Document-status checken** — Copilot kan analyseren welke documenten ontbreken op basis van uploads',
      '✍️ **Handtekening opvolgen** — Herinneringen voor ontbrekende handtekeningen van klant of developer',
      '📖 **Klantverhaal genereren** — Start de 2-staps review pipeline (brainstorm → formaliseer)',
    ],
    notes: [
      'Smart links detecteren automatisch of documenten zijn geüpload — de copilot houdt hier rekening mee in zijn advies',
      'Bankgarantie is een harde prerequisite voor het koopcontract. De copilot zal dit actief bewaken.',
    ],
  },
  voorbereiding: {
    actions: [
      '📧 **Developer-opvolging** — Genereer berichten in het Spaans naar de ontwikkelaar over ontbrekende plannen',
      '🔄 **Escalatie-logica** — Automatische toonverschuiving: Vriendelijk (<7d) → Dringend (7-14d) → Formeel (>14d)',
    ],
    notes: [
      'De copilot volgt openstaande offertes bij de developer en escaleert automatisch de toon bij langere wachttijden',
      'Extra\'s documentatie en het klantgesprek zijn vaak de langstdurende taken — de copilot adviseert over timing',
    ],
  },
  akkoord: {
    actions: [
      '✅ **Akkoord bewaken** — Copilot monitort of alle sub-akkoorden (grondplan, elektra, extra\'s) zijn ontvangen',
      '📨 **Klant herinneren** — Genereer een herinnering als het akkoord langer dan verwacht uitblijft',
      '📤 **Developer notificatie** — Stuur definitief akkoord door naar developer na finale goedkeuring',
    ],
    notes: [
      'Alle 3 sub-akkoorden moeten bevestigd zijn voordat het definitief akkoord kan worden gegeven',
      'Cross-fase prerequisites: akk_elektriciteit vereist voorb_elektriciteit, akk_grondplan vereist voorb_afmetingen',
    ],
  },
  overdracht: {
    actions: [
      '📅 **Notarisdatum bewaken** — Copilot houdt de deadline bij en waarschuwt bij naderende datum',
      '🔍 **Snagging opvolging** — Monitort of alle inspectie-items zijn afgehandeld na de snagging',
    ],
    notes: [
      'Na het verstrijken van de notarisdatum worden nazorgtaken automatisch zichtbaar',
      'De copilot kan de klant een samenvatting sturen van wat er bij de overdracht komt kijken',
    ],
  },
  nazorg: {
    actions: [
      '📞 **Follow-up plannen** — Stel een follow-up call in 2 weken na overdracht voor',
      '📊 **Financiële controle** — Check of alle betalingen en commissies correct zijn afgehandeld',
      '📁 **Archivering** — Markeer het dossier als compleet na alle nazorgtaken',
    ],
    notes: [
      'Nazorgtaken worden pas zichtbaar nadat de notarisdatum is verstreken',
      'De copilot genereert een review-aanvraag e-mail op basis van de klantdata en het project',
      'Praktische taken (nutsvoorzieningen, verzekeringen, VvE) worden klant-zichtbaar getoond in het portaal',
    ],
  },
};

// ── Sub-components ──────────────────────────────────────────────────────────

function TaskDocItem({ taskKey, title, description, order, doc }: {
  taskKey: string; title: string; description: string; order: number; doc?: TaskDocData;
}) {
  const prerequisiteKey = TASK_PREREQUISITES[taskKey as keyof typeof TASK_PREREQUISITES];
  const docMapping = CHECKLIST_DOCUMENT_MAPPING[taskKey];
  const hasAutoComplete = !!doc?.autoTrigger || !!docMapping;

  return (
    <AccordionItem value={taskKey}>
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-3 text-left">
          <span className="font-medium">{order}. {title}</span>
          {doc?.estimatedTime && (
            <Badge variant="outline" className="ml-2">
              <Clock className="h-3 w-3 mr-1" />{doc.estimatedTime}
            </Badge>
          )}
          {hasAutoComplete && (
            <Badge variant="secondary" className="ml-1">
              <Zap className="h-3 w-3 mr-1" />Auto
            </Badge>
          )}
          {prerequisiteKey && (
            <Badge variant="outline" className="ml-1 text-amber-600 border-amber-300">
              <Link2 className="h-3 w-3 mr-1" />Prerequisite
            </Badge>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4 pt-2">
          {/* Description from template */}
          <p className="text-sm text-muted-foreground">{description}</p>

          {/* Prerequisite hint */}
          {prerequisiteKey && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <Link2 className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <span className="font-medium">📌 Vereist eerst:</span>{' '}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">{prerequisiteKey}</code>
              </div>
            </div>
          )}

          {/* Auto trigger */}
          {(doc?.autoTrigger || docMapping) && (
            <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <Zap className="h-4 w-4 text-primary mt-0.5" />
              <div className="text-sm">
                <span className="font-medium">Automatische afronding:</span>{' '}
                {doc?.autoTrigger || `Afgerond bij upload van document type '${docMapping?.label}'`}
              </div>
            </div>
          )}

          {/* Steps */}
          {doc?.steps && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />Stappen
              </h4>
              <div className="space-y-3">
                {doc.steps.map((s) => (
                  <div key={s.step} className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                      {s.step}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{s.title}</p>
                      <p className="text-sm text-muted-foreground">{s.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Templates */}
          {doc?.templates && doc.templates.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Send className="h-4 w-4" />Templates
              </h4>
              <div className="space-y-2">
                {doc.templates.map((t, i) => (
                  <div key={i} className="relative">
                    <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap font-mono">{t.content}</div>
                    <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => copyToClipboard(t.content, t.label)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          {doc?.tips && doc.tips.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />Let op!
              </h4>
              <ul className="space-y-2">
                {doc.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm"><span className="text-amber-500">⚠️</span>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          {/* System Links */}
          {doc?.systemLinks && doc.systemLinks.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />Snellinks
              </h4>
              <div className="flex flex-wrap gap-2">
                {doc.systemLinks.map((link, i) => (
                  <Button key={i} variant="outline" size="sm" asChild>
                    <a href={link.path} target="_blank" rel="noopener noreferrer">
                      {link.label}<ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* No documentation yet */}
          {!doc && (
            <p className="text-sm text-muted-foreground italic">Gedetailleerde stappen worden later toegevoegd.</p>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function CopilotPhaseCard({ phaseKey }: { phaseKey: string }) {
  const copilotDoc = COPILOT_PHASE_DOCS[phaseKey];
  if (!copilotDoc) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          AI Copilot Ondersteuning
        </CardTitle>
        <CardDescription>Wat de Aftersales Copilot kan doen in deze fase</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Brain className="h-4 w-4" />Beschikbare acties
          </h4>
          <ul className="space-y-2">
            {copilotDoc.actions.map((action, i) => (
              <li key={i} className="text-sm" dangerouslySetInnerHTML={{ __html: action.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />Intelligentie & context
          </h4>
          <ul className="space-y-1.5">
            {copilotDoc.notes.map((note, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary">•</span>{note}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function PrerequisitesCard({ phaseKey, checklist }: { phaseKey: string; checklist: readonly { key: string; title: string }[] }) {
  const phasePrereqs = checklist
    .filter(task => TASK_PREREQUISITES[task.key as keyof typeof TASK_PREREQUISITES])
    .map(task => {
      const prereqKey = TASK_PREREQUISITES[task.key as keyof typeof TASK_PREREQUISITES]!;
      // Find the prerequisite title from all checklists
      const allTasks = [...RESERVATIE_CHECKLIST, ...KOOPCONTRACT_CHECKLIST, ...VOORBEREIDING_CHECKLIST, ...AKKOORD_CHECKLIST, ...OVERDRACHT_CHECKLIST, ...NAZORG_CHECKLIST];
      const prereqTask = allTasks.find(t => t.key === prereqKey);
      return { task: task.title, prereq: prereqTask?.title || prereqKey };
    });

  if (phasePrereqs.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="h-5 w-5" />Afhankelijkheden in deze fase
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {phasePrereqs.map((p, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="font-normal">{p.prereq}</Badge>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">{p.task}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          📌 Dit zijn zachte hints — taken zijn altijd klikbaar, maar de "Eerst: X" badge verschijnt bij onvoltooide prerequisites.
          Dynamische prerequisites (manueel toegevoegd per verkoop) worden hier niet getoond.
        </p>
      </CardContent>
    </Card>
  );
}

function PhaseTab({ phase }: { phase: typeof PHASE_CONFIG[number] }) {
  const groups = new Map<string, typeof phase.checklist[number][]>();
  phase.checklist.forEach(task => {
    const g = (task as any).group || 'overig';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(task);
  });

  return (
    <TabsContent value={phase.key} className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${phase.color} text-white flex items-center justify-center`}>
              <phase.icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Fase: {phase.label}</CardTitle>
              <CardDescription>{phase.checklist.length} taken · Doorlooptijd: {phase.duration}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Grouped tasks */}
          {Array.from(groups.entries()).map(([groupKey, tasks]) => {
            const groupInfo = MILESTONE_GROUPS[groupKey];
            return (
              <div key={groupKey} className="mb-6 last:mb-0">
                {groupInfo && (
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                    <div className={`w-2 h-2 rounded-full ${phase.color}`} />
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {groupInfo.label}
                    </h3>
                  </div>
                )}
                <Accordion type="single" collapsible className="w-full">
                  {tasks.map((task) => (
                    <TaskDocItem
                      key={task.key}
                      taskKey={task.key}
                      title={task.title}
                      description={task.description}
                      order={task.order}
                      doc={TASK_DOCUMENTATION[task.key]}
                    />
                  ))}
                </Accordion>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <PrerequisitesCard phaseKey={phase.key} checklist={phase.checklist} />
      <CopilotPhaseCard phaseKey={phase.key} />
    </TabsContent>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function VerkoopProcesDocumentation() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Receipt className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Verkoop Proces SOP</h1>
            <p className="text-muted-foreground">
              Standard Operating Procedure — dynamisch opgebouwd uit de actieve checklist templates
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <Badge>Actief</Badge>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />Gemiddelde doorlooptijd: 6-12 maanden
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />{totalTasks} taken in {PHASE_CONFIG.length} fasen
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Bot className="h-4 w-4" />AI Copilot geïntegreerd
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overzicht" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overzicht">Overzicht</TabsTrigger>
          {PHASE_CONFIG.map(p => (
            <TabsTrigger key={p.key} value={p.key}>{p.label}</TabsTrigger>
          ))}
        </TabsList>

        {/* OVERZICHT TAB */}
        <TabsContent value="overzicht" className="space-y-6">
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Proces Overzicht</CardTitle>
              <CardDescription>Het complete verkoopproces van reservatie tot nazorg — {totalTasks} taken</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                {PHASE_CONFIG.map((phase, i) => (
                  <div key={phase.key} className="relative">
                    <div className={`p-4 rounded-lg border ${i === 0 ? 'ring-2 ring-primary' : ''}`}>
                      <div className={`w-10 h-10 rounded-full ${phase.color} text-white flex items-center justify-center mb-3`}>
                        <phase.icon className="h-5 w-5" />
                      </div>
                      <h3 className="font-semibold">{phase.label}</h3>
                      <p className="text-sm text-muted-foreground">{phase.checklist.length} taken</p>
                      <p className="text-xs text-muted-foreground mt-1">{phase.duration}</p>
                    </div>
                    {i < PHASE_CONFIG.length - 1 && (
                      <div className="hidden lg:block absolute top-1/2 -right-2 w-4 h-0.5 bg-border" />
                    )}
                  </div>
                ))}
              </div>

              {/* Quick Reference */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Verantwoordelijkheden</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div className="flex justify-between"><span className="text-muted-foreground">Klantcommunicatie:</span><span className="font-medium">Top Immo Spain</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Document verzameling:</span><span className="font-medium">Top Immo Spain</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Juridische check:</span><span className="font-medium">Advocaat Spanje</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Bouw updates:</span><span className="font-medium">Developer</span></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Belangrijke Contacten</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div className="flex justify-between"><span className="text-muted-foreground">Advocaat:</span><span className="font-medium">Via project contacten</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Notaris:</span><span className="font-medium">Via developer</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Bank contact:</span><span className="font-medium">Hypotheek partner</span></div>
                  </CardContent>
                </Card>
              </div>

              {/* Status Legend */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-3">Status Legenda</h4>
                <div className="flex flex-wrap gap-4 text-sm">
                  {PHASE_CONFIG.map(p => (
                    <div key={p.key} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${p.color}`} />
                      <span>{p.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Copilot Overview */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-6 w-6 text-primary" />
                AI Aftersales Copilot
              </CardTitle>
              <CardDescription>Geïntegreerde AI-assistent voor het complete verkoopproces</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">🧠 Hoe werkt het?</h4>
                  <ul className="text-sm space-y-1.5 text-muted-foreground">
                    <li>• De copilot is <strong>fase-bewust</strong> en focust op de eerste onvoltooide fase</li>
                    <li>• Acties worden <strong>voorgesteld</strong> maar pas uitgevoerd na bevestiging</li>
                    <li>• Gesprekken worden opgeslagen per verkoop als <strong>conversatiegeheugen</strong></li>
                    <li>• <strong>Dagbriefing</strong> scant alle verkopen en rapporteert urgente taken</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">🔧 Kernfuncties</h4>
                  <ul className="text-sm space-y-1.5 text-muted-foreground">
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-primary" />Taken voltooien, uitstellen, prioriteit wijzigen</li>
                    <li className="flex items-center gap-2"><Bell className="h-3 w-3 text-primary" />Herinneringen instellen en bewaken</li>
                    <li className="flex items-center gap-2"><MessageSquare className="h-3 w-3 text-primary" />Developer-berichten in het Spaans met escalatielogica</li>
                    <li className="flex items-center gap-2"><Link2 className="h-3 w-3 text-primary" />Prerequisite-bewaking (statisch + dynamisch)</li>
                  </ul>
                </div>
              </div>

              <div className="p-3 bg-background rounded-lg border text-sm">
                <h4 className="font-medium mb-2">📌 Prerequisite-systeem</h4>
                <p className="text-muted-foreground mb-2">
                  Het systeem kent twee lagen afhankelijkheden:
                </p>
                <ul className="text-muted-foreground space-y-1">
                  <li><strong>Statisch:</strong> {Object.keys(TASK_PREREQUISITES).length} vaste afhankelijkheden gedefinieerd in de template (bijv. Bankgarantie → Koopcontract)</li>
                  <li><strong>Dynamisch:</strong> Per verkoop kunnen manueel toegevoegde taken als prerequisite worden gekoppeld via <code className="text-xs bg-muted px-1 py-0.5 rounded">prerequisite_for</code></li>
                </ul>
              </div>

              <div className="p-3 bg-background rounded-lg border text-sm">
                <h4 className="font-medium mb-2">🇪🇸 Developer-opvolging</h4>
                <p className="text-muted-foreground">
                  Bij openstaande offertes of extra's genereert de copilot berichten in het Spaans met automatische escalatie:
                </p>
                <div className="flex gap-3 mt-2">
                  <Badge variant="outline" className="text-green-600 border-green-300">Vriendelijk &lt;7d</Badge>
                  <Badge variant="outline" className="text-amber-600 border-amber-300">Dringend 7-14d</Badge>
                  <Badge variant="outline" className="text-red-600 border-red-300">Formeel &gt;14d</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* All Prerequisites Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />Alle Afhankelijkheden
              </CardTitle>
              <CardDescription>
                {Object.keys(TASK_PREREQUISITES).length} statische task-afhankelijkheden over alle fasen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(TASK_PREREQUISITES).map(([taskKey, prereqKey]) => {
                  const allTasks = [...RESERVATIE_CHECKLIST, ...KOOPCONTRACT_CHECKLIST, ...VOORBEREIDING_CHECKLIST, ...AKKOORD_CHECKLIST, ...OVERDRACHT_CHECKLIST, ...NAZORG_CHECKLIST];
                  const task = allTasks.find(t => t.key === taskKey);
                  const prereq = allTasks.find(t => t.key === prereqKey);
                  if (!task || !prereq) return null;
                  return (
                    <div key={taskKey} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="font-normal text-xs">{prereq.title}</Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium text-xs">{task.title}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Phase Tabs — dynamically generated */}
        {PHASE_CONFIG.map(phase => (
          <PhaseTab key={phase.key} phase={phase} />
        ))}
      </Tabs>
    </div>
  );
}
