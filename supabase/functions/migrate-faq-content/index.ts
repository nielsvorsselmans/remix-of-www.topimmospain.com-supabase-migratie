import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Investment FAQ Categories - ALLE 4 TABS COMPLEET
    const investmentCategories = [
      {
        category_key: 'financing',
        display_name: 'Financiering & Hypotheek',
        icon_name: 'Banknote',
        context_type: 'investment',
        context_value: null,
        order_index: 0,
        items: [
          {
            question: 'Kan ik als buitenlander een hypotheek krijgen in Spanje?',
            answer: '<p>Ja, als Nederlandse investeerder kun je zeker een hypotheek afsluiten in Spanje. Veel Spaanse banken werken met buitenlandse kopers en bieden hypotheken aan niet-residenten aan.</p><p class="font-medium text-foreground">Wel zijn er enkele vereisten:</p><ul class="list-disc pl-6 space-y-1"><li>Je hebt een NIE-nummer nodig (identificatienummer voor buitenlanders)</li><li>Een Spaanse bankrekening is verplicht</li><li>Je moet aantoonbaar inkomen en een stabiele financiële positie hebben</li><li>De aankoopwaarde en bankgaranties moeten voldoende zijn</li></ul><p>Top Immo Spain werkt samen met ervaren hypotheekadviseurs die het complete proces voor je regelen en zorgen dat je de beste voorwaarden krijgt.</p>',
            cta_link: '/blog/financiering-hypotheek',
            cta_text: 'Lees meer over financieringsmogelijkheden',
            order_index: 0,
          },
          {
            question: 'Hoeveel kan ik maximaal financieren?',
            answer: '<p>Voor niet-residenten (zoals Nederlandse investeerders) bieden Spaanse banken doorgaans een <span class="font-semibold text-foreground">maximale financiering van 60-70% van de aankoopwaarde</span> of taxatiewaarde (welke van de twee het laagst is).</p><div class="bg-muted p-4 rounded-lg space-y-2"><p class="font-medium text-foreground">Voorbeeld:</p><ul class="space-y-1 text-sm"><li>Aankoopprijs woning: €250.000</li><li>Maximale hypotheek (70%): €175.000</li><li>Eigen inbreng nodig: €75.000</li><li>+ aankoopkosten (~12%): €30.000</li><li><span class="font-semibold text-foreground">Totaal eigen geld: €105.000</span></li></ul></div><p>Als je wel resident bent in Spanje, kun je vaak tot 80% financieren. Ook je inkomen en financiële situatie spelen een rol in het maximale leenbedrag.</p>',
            cta_link: null,
            cta_text: null,
            order_index: 1,
          },
          {
            question: 'Wat zijn de voorwaarden en rentetarieven?',
            answer: '<p>De hypotheekvoorwaarden voor niet-residenten in Spanje zijn competitief:</p><div class="space-y-3"><div><p class="font-medium text-foreground">Rentetarieven (indicatief):</p><ul class="list-disc pl-6 space-y-1 mt-1"><li>Variabel: vanaf 3,5% - 4,5%</li><li>Vast (10-20 jaar): vanaf 4,0% - 5,0%</li><li>Mix van vast en variabel mogelijk</li></ul></div><div><p class="font-medium text-foreground">Looptijd:</p><ul class="list-disc pl-6 space-y-1 mt-1"><li>Maximaal 25-30 jaar (afhankelijk van je leeftijd)</li><li>Meestal tot je 70ste of 75ste levensjaar</li></ul></div><div><p class="font-medium text-foreground">Overige voorwaarden:</p><ul class="list-disc pl-6 space-y-1 mt-1"><li>Maandlasten mogen maximaal 30-35% van je netto inkomen zijn</li><li>Overlijdensrisicoverzekering verplicht</li><li>Opstalverzekering verplicht</li></ul></div></div><p class="text-sm italic">Tarieven en voorwaarden kunnen wijzigen. Vraag altijd actuele informatie op bij de bank.</p>',
            cta_link: null,
            cta_text: null,
            order_index: 2,
          },
          {
            question: 'Welke documenten heb ik nodig voor een hypotheekaanvraag?',
            answer: '<p>Voor een hypotheekaanvraag in Spanje heb je de volgende documenten nodig:</p><div class="space-y-3"><div><p class="font-medium text-foreground">Identificatie:</p><ul class="list-disc pl-6 space-y-1 mt-1"><li>Kopie paspoort of ID-bewijs</li><li>NIE-nummer (kunnen wij voor je regelen)</li></ul></div><div><p class="font-medium text-foreground">Inkomen en vermogen:</p><ul class="list-disc pl-6 space-y-1 mt-1"><li>Laatste 3 loonstroken of jaaropgaven</li><li>Laatste 2 jaar belastingaangiften</li><li>Bankafschriften laatste 3-6 maanden</li><li>Arbeidscontract of bedrijfsgegevens (bij ZZP)</li></ul></div><div><p class="font-medium text-foreground">Vastgoed:</p><ul class="list-disc pl-6 space-y-1 mt-1"><li>Verkoopcontract of reserveringsovereenkomst</li><li>Taxatierapport (regelt de bank)</li><li>Kadaster uittreksel (nota simple)</li></ul></div></div><p class="bg-primary/10 p-3 rounded-lg text-sm"><span class="font-semibold text-foreground">Tip:</span> Veel documenten kunnen in het Engels worden aangeleverd. Officiële vertalingen zijn meestal niet nodig. Onze hypotheekadviseur helpt je met het compleet maken van het dossier.</p>',
            cta_link: null,
            cta_text: null,
            order_index: 3,
          },
          {
            question: 'Hoe helpt Top Immo Spain bij de financiering?',
            answer: '<p>Wij begeleiden je door het complete financieringsproces en werken samen met gespecialiseerde hypotheekadviseurs die de Spaanse én Nederlandse markt kennen.</p><div class="space-y-2"><p class="font-medium text-foreground">Onze service omvat:</p><ul class="list-disc pl-6 space-y-1"><li>Oriënterend gesprek over je financieringsmogelijkheden</li><li>Contact leggen met banken en hypotheekadviseurs</li><li>Helpen met het aanvragen van je NIE-nummer</li><li>Bijstand bij het verzamelen van de benodigde documenten</li><li>Vertaling en uitleg van hypotheekoffertes</li><li>Aanwezig zijn bij de ondertekening (indien gewenst)</li><li>Nazorg: vragen over aflossingen, herfinancieren, etc.</li></ul></div><p>Ons doel is om het proces zo soepel mogelijk te laten verlopen, zodat je met vertrouwen je investering kunt doen.</p>',
            cta_link: '/contact',
            cta_text: 'Neem contact op voor een financieringsgesprek',
            order_index: 4,
          },
        ],
      },
      {
        category_key: 'legal',
        display_name: 'Juridisch & Zekerheid',
        icon_name: 'Shield',
        context_type: 'investment',
        context_value: null,
        order_index: 1,
        items: [
          {
            question: 'Hoe werkt het aankoopproces in Spanje?',
            answer: '<p>Het Spaanse aankoopproces verschilt van Nederland, maar is dankzij onze begeleiding overzichtelijk en veilig.</p><div class="space-y-3"><div class="border-l-4 border-primary pl-4"><p class="font-semibold text-foreground">Stap 1: Reservering</p><p class="text-sm">Je stort een reserveringssom (€3.000-€6.000) om de woning voor je te reserveren.</p></div><div class="border-l-4 border-primary pl-4"><p class="font-semibold text-foreground">Stap 2: Arras Contract (Voorcontract)</p><p class="text-sm">Je betaalt 10% van de koopsom en ondertekent een voorcontract bij de notaris.</p></div><div class="border-l-4 border-primary pl-4"><p class="font-semibold text-foreground">Stap 3: Due Diligence</p><p class="text-sm">Onze advocaat controleert alle juridische aspecten: eigendom, hypotheken, bouwvergunningen.</p></div><div class="border-l-4 border-primary pl-4"><p class="font-semibold text-foreground">Stap 4: Escritura (Definitieve akte)</p><p class="text-sm">Je betaalt de resterende 90% en ondertekent de koopakte bij de notaris. Je bent nu eigenaar!</p></div></div><p class="bg-primary/10 p-3 rounded-lg text-sm"><span class="font-semibold text-foreground">Gemiddelde doorlooptijd:</span> 3-6 maanden van reservering tot definitieve eigendomsoverdracht.</p>',
            cta_link: '/blog/aankoopproces',
            cta_text: 'Lees de volledige uitleg van het aankoopproces',
            order_index: 0,
          },
          {
            question: 'Wat is een NIE-nummer en hoe verkrijg ik dit?',
            answer: '<p>Een <span class="font-semibold text-foreground">NIE (Número de Identidad de Extranjero)</span> is een identificatienummer voor buitenlanders in Spanje. Je hebt dit nodig voor:</p><ul class="list-disc pl-6 space-y-1"><li>Het kopen van een woning</li><li>Het afsluiten van een hypotheek</li><li>Het openen van een bankrekening</li><li>Aansluiten van nutsvoorzieningen</li><li>Belastingaangiften doen</li></ul><div class="mt-3"><p class="font-medium text-foreground mb-2">Hoe verkrijg je een NIE?</p><div class="space-y-2"><p><span class="font-semibold">Optie 1:</span> Via het Spaanse consulaat in Nederland (Den Haag of Amsterdam)</p><p><span class="font-semibold">Optie 2:</span> In Spanje bij een politiebureau of vreemdelingenkantoor</p><p><span class="font-semibold">Optie 3:</span> Via een gemachtigde (volmacht) - wij kunnen dit regelen</p></div></div><p class="bg-primary/10 p-3 rounded-lg text-sm"><span class="font-semibold text-foreground">Onze service:</span> Wij helpen je met de aanvraag, verzamelen de benodigde documenten en kunnen via een volmacht het NIE voor je aanvragen. Gemiddelde doorlooptijd: 2-4 weken.</p>',
            cta_link: null,
            cta_text: null,
            order_index: 1,
          },
          {
            question: 'Welke juridische controles worden uitgevoerd?',
            answer: '<p>Voor elke aankoop laten wij een grondig juridisch onderzoek uitvoeren door een gespecialiseerde vastgoedadvocaat. Dit heet ook wel <span class="font-semibold text-foreground">\'due diligence\'</span>.</p><div class="space-y-2"><p class="font-medium text-foreground">De advocaat controleert:</p><ul class="list-disc pl-6 space-y-1"><li><span class="font-semibold">Eigendomssituatie:</span> Is de verkoper daadwerkelijk eigenaar?</li><li><span class="font-semibold">Hypotheken/lasten:</span> Zijn er hypotheken of andere schulden op het pand?</li><li><span class="font-semibold">Bouwvergunningen:</span> Is alles legaal gebouwd? Zijn er legalisatieproblemen?</li><li><span class="font-semibold">Gemeentelijke lasten:</span> Zijn IBI, afvalbelasting, etc. betaald?</li><li><span class="font-semibold">Gemeenschapskosten:</span> Bij appartementen: zijn de kosten betaald?</li><li><span class="font-semibold">Erfdienstbaarheden:</span> Zijn er recht van overpad of andere beperkingen?</li><li><span class="font-semibold">Bestemmingsplan:</span> Wat zijn de plannen voor het gebied?</li></ul></div><p class="bg-green-500/10 p-3 rounded-lg text-sm border border-green-500/20"><span class="font-semibold text-foreground">Garantie:</span> Pas als alle controles groen licht geven, adviseren wij om door te gaan met de aankoop. Je investering is daarmee maximaal beschermd.</p>',
            cta_link: null,
            cta_text: null,
            order_index: 2,
          },
          {
            question: 'Op wiens naam komt de woning te staan?',
            answer: '<p>Je hebt verschillende mogelijkheden voor de eigendomsstructuur van je Spaanse woning:</p><div class="space-y-3"><div><p class="font-semibold text-foreground">1. Op eigen naam (particulier)</p><ul class="list-disc pl-6 space-y-1 text-sm mt-1"><li>Eenvoudig en goedkoop</li><li>Lagere aankoopkosten (7-10% overdrachtsbelasting)</li><li>Minder fiscale aftrekmogelijkheden</li><li>Successierechten bij overlijden</li></ul></div><div><p class="font-semibold text-foreground">2. Via een Nederlandse BV</p><ul class="list-disc pl-6 space-y-1 text-sm mt-1"><li>Meer fiscale aftrekposten mogelijk</li><li>Betere successieplanning</li><li>Hogere aankoopkosten (10% IVA bij nieuwbouw)</li><li>Meer administratieve lasten</li></ul></div><div><p class="font-semibold text-foreground">3. Via een Spaanse SL (sociedad limitada)</p><ul class="list-disc pl-6 space-y-1 text-sm mt-1"><li>Gunstig voor meerdere woningen</li><li>Eenvoudige overdracht van aandelen</li><li>Oprichtingskosten en jaarlijkse accountantskosten</li></ul></div><div><p class="font-semibold text-foreground">4. Op naam van beide partners</p><ul class="list-disc pl-6 space-y-1 text-sm mt-1"><li>Beide partners zijn eigenaar</li><li>Fiscaal soms voordelig</li><li>Keuze tussen gemeenschappelijk eigendom of 50/50</li></ul></div></div><p class="bg-primary/10 p-3 rounded-lg text-sm"><span class="font-semibold text-foreground">Advies:</span> Voor de meeste eerste investeerders is aankoop op eigen naam het meest eenvoudig. Bij meerdere woningen of een hoger vermogen kan een BV interessant zijn. Wij adviseren je graag persoonlijk.</p>',
            cta_link: null,
            cta_text: null,
            order_index: 3,
          },
          {
            question: 'Hoe beschermt Top Immo Spain mijn investering?',
            answer: '<p>Jouw zekerheid staat bij ons voorop. Daarom hebben we een uitgebreid beschermingssysteem voor elke investering:</p><div class="space-y-3"><div class="bg-muted p-4 rounded-lg"><p class="font-semibold text-foreground mb-2">🏛️ Juridische Begeleiding</p><ul class="space-y-1 text-sm"><li>• Onafhankelijke vastgoedadvocaat controleert alles</li><li>• Due diligence rapport voor elke woning</li><li>• Aanwezig bij alle ondertekeningen</li></ul></div><div class="bg-muted p-4 rounded-lg"><p class="font-semibold text-foreground mb-2">🏦 Financiële Zekerheid</p><ul class="space-y-1 text-sm"><li>• Betalingen via gereguleerde notarisrekening</li><li>• Bankgaranties bij nieuwbouwprojecten</li><li>• Volledige transparantie in alle kosten</li></ul></div><div class="bg-muted p-4 rounded-lg"><p class="font-semibold text-foreground mb-2">🛡️ Kwaliteitscontrole</p><ul class="space-y-1 text-sm"><li>• Selectie van betrouwbare developers</li><li>• Bouwinspecties bij nieuwbouw</li><li>• Garantie op constructiefouten (10 jaar)</li></ul></div><div class="bg-muted p-4 rounded-lg"><p class="font-semibold text-foreground mb-2">📞 Persoonlijke Begeleiding</p><ul class="space-y-1 text-sm"><li>• Vaste contactpersoon van begin tot eind</li><li>• Nederlands- en Spaanstalig team</li><li>• Nazorg ook na de aankoop</li></ul></div></div><p class="text-sm italic">Al 15+ jaar begeleiden we Nederlandse investeerders bij hun Spaanse vastgoedaankoop. Onze ervaring is jouw zekerheid.</p>',
            cta_link: null,
            cta_text: null,
            order_index: 4,
          },
        ],
      },
      {
        category_key: 'tax',
        display_name: 'Belastingen & Fiscaal',
        icon_name: 'Receipt',
        context_type: 'investment',
        context_value: null,
        order_index: 2,
        items: [
          {
            question: 'Welke belastingen betaal ik bij aankoop?',
            answer: '<p>Bij de aankoop van een woning in Spanje betaal je eenmalige overdrachtsbelastingen. De hoogte hangt af van of het nieuwbouw of bestaande bouw is:</p><div class="space-y-3"><div class="bg-muted p-4 rounded-lg"><p class="font-semibold text-foreground mb-2">🏗️ Nieuwbouw</p><ul class="space-y-1"><li><span class="font-semibold">IVA (BTW):</span> 10% van de koopprijs</li><li><span class="font-semibold">AJD (stempelbelasting):</span> 1,5% van de koopprijs</li><li><span class="font-semibold">Totaal:</span> 11,5%</li></ul></div><div class="bg-muted p-4 rounded-lg"><p class="font-semibold text-foreground mb-2">🏡 Bestaande bouw</p><ul class="space-y-1"><li><span class="font-semibold">ITP (overdrachtsbelasting):</span> 7-10% (varieert per regio)</li><li>Murcia: 8%</li><li>Valencia: 10%</li><li>Andalucía: 7-10% (afhankelijk van waarde)</li></ul></div></div><div class="bg-primary/10 p-4 rounded-lg"><p class="font-semibold text-foreground mb-2">Rekenvoorbeeld (€250.000 bestaande bouw in Murcia):</p><ul class="space-y-1 text-sm"><li>Koopprijs: €250.000</li><li>ITP (8%): €20.000</li><li>Notaris + register: ~€2.500</li><li>Advocaat: ~€2.000</li><li><span class="font-semibold text-foreground">Totale aankoopkosten: ~€24.500 (9,8%)</span></li></ul></div><p class="text-sm italic">Deze kosten komen boven op de koopprijs en kunnen niet gefinancierd worden. Je hebt deze als eigen geld nodig.</p>',
            cta_link: null,
            cta_text: null,
            order_index: 0,
          },
          {
            question: 'Wat zijn de jaarlijkse belastingen als eigenaar?',
            answer: '<p>Als eigenaar van een Spaanse woning betaal je jaarlijks verschillende belastingen:</p><div class="space-y-3"><div><p class="font-semibold text-foreground">1. IBI (Onroerendgoedbelasting)</p><p class="text-sm">Vergelijkbaar met de Nederlandse OZB. Hoogte hangt af van de kadastrale waarde en gemeente.</p><ul class="list-disc pl-6 space-y-1 text-sm mt-1"><li>Appartement: €200-400/jaar</li><li>Villa: €400-800/jaar</li><li>Luxe villa: €800-1.500/jaar</li></ul></div><div><p class="font-semibold text-foreground">2. Niet-inwonerbelasting (IRNR)</p><p class="text-sm">Als je niet in Spanje woont, betaal je belasting over een fictief inkomen (1,1-2% van kadastrale waarde).</p><ul class="list-disc pl-6 space-y-1 text-sm mt-1"><li>Tarief: 19% (EU-inwoners) of 24% (niet-EU)</li><li>Berekening: 1,1% x kadastrale waarde x 19%</li><li>Voorbeeld €250k woning: ~€500/jaar</li></ul><p class="text-xs italic mt-1">Let op: Als je de woning verhuurt, betaal je belasting over de werkelijke huurinkomsten (zie hieronder).</p></div><div><p class="font-semibold text-foreground">3. Afvalbelasting (Basura)</p><ul class="list-disc pl-6 space-y-1 text-sm"><li>€50-150/jaar (afhankelijk van gemeente en woningtype)</li></ul></div><div><p class="font-semibold text-foreground">4. Gemeenschapskosten (geen belasting)</p><p class="text-sm">Bij appartementen en complexen met gedeelde voorzieningen:</p><ul class="list-disc pl-6 space-y-1 text-sm mt-1"><li>€40-120/maand (zwembad, tuinen, beveiliging, lift)</li></ul></div></div><div class="bg-primary/10 p-4 rounded-lg mt-3"><p class="font-semibold text-foreground mb-2">Totaal jaarlijks voor €250k appartement (niet-verhuurd):</p><ul class="space-y-1 text-sm"><li>IBI: €300</li><li>IRNR: €500</li><li>Basura: €100</li><li>Gemeenschap: €900 (€75/maand)</li><li><span class="font-semibold text-foreground">Totaal: ~€1.800/jaar (€150/maand)</span></li></ul></div>',
            cta_link: null,
            cta_text: null,
            order_index: 1,
          },
          {
            question: 'Hoe werkt belasting op huurinkomsten?',
            answer: '<p>Als je je Spaanse woning verhuurt, betaal je belasting over je netto huurinkomsten (bruto huur minus aftrekbare kosten).</p><div class="space-y-3"><div><p class="font-semibold text-foreground">Belastingtarief:</p><ul class="list-disc pl-6 space-y-1"><li><span class="font-semibold">19%</span> voor EU-inwoners (Nederlandse investeerders)</li><li><span class="font-semibold">24%</span> voor niet-EU inwoners</li></ul></div><div><p class="font-semibold text-foreground">Aftrekbare kosten:</p><ul class="list-disc pl-6 space-y-1 text-sm"><li>IBI (onroerendgoedbelasting)</li><li>Gemeenschapskosten</li><li>Verzekeringen (opstal, aansprakelijkheid)</li><li>Afschrijving van de woning (3% per jaar over 33 jaar)</li><li>Onderhoud en reparaties</li><li>Energiekosten (bij all-inclusive verhuur)</li><li>Beheerkosten (als je een beheerder inschakelt)</li><li>Accountantskosten</li><li>Hypotheekrente (gedeeltelijk)</li></ul></div></div><div class="bg-muted p-4 rounded-lg"><p class="font-semibold text-foreground mb-2">Rekenvoorbeeld:</p><div class="space-y-1 text-sm"><p>Bruto huurinkomsten per jaar: €15.000</p><p class="text-muted-foreground">Aftrekbare kosten:</p><ul class="pl-4 space-y-0.5 text-muted-foreground"><li>- IBI: €300</li><li>- Gemeenschap: €900</li><li>- Afschrijving: €2.500</li><li>- Verzekeringen: €400</li><li>- Onderhoud: €800</li><li>- Beheer (20%): €3.000</li><li>- Accountant: €400</li></ul><p class="text-muted-foreground">Totale kosten: €8.300</p><p class="font-semibold">Netto belastbaar inkomen: €6.700</p><p class="font-semibold text-foreground">Belasting (19%): €1.273</p><p class="font-semibold text-foreground">Netto huurresultaat: €5.427 (3,6% netto rendement op €250k)</p></div></div><div class="bg-primary/10 p-3 rounded-lg mt-3"><p class="text-sm"><span class="font-semibold text-foreground">Aangifte:</span> Je moet jaarlijks aangifte doen via formulier <span class="font-semibold">Modelo 210</span>. Dit kan ook per kwartaal als je regelmatig verhuurt. Wij werken samen met fiscalisten die dit voor je kunnen regelen.</p></div>',
            cta_link: null,
            cta_text: null,
            order_index: 2,
          },
          {
            question: 'Moet ik ook in Nederland belasting betalen?',
            answer: '<p>Ja, als Nederlandse belastingplichtige moet je je Spaanse vastgoed ook opgeven in Nederland. Gelukkig is er een belastingverdrag tussen Nederland en Spanje om dubbele belasting te voorkomen.</p><div class="space-y-3"><div><p class="font-semibold text-foreground">Box 3 (Vermogensrendementsheffing)</p><p class="text-sm">Je Spaanse woning valt in Box 3 als vermogen (tenzij je deze als ondernemer verhuurt via een BV).</p><ul class="list-disc pl-6 space-y-1 text-sm mt-2"><li>Waarde: <span class="font-semibold">WOZ-waarde of aankoopprijs</span> (wat van toepassing is)</li><li>Schulden: hypotheek is aftrekbaar als schuld</li><li>Tarief: <span class="font-semibold">36%</span> over fictief rendement (~6,04% in 2024)</li><li>Vrijstelling: eerste €57.000 (2024) is vrijgesteld per persoon</li></ul></div><div class="bg-muted p-4 rounded-lg"><p class="font-semibold text-foreground mb-2">Rekenvoorbeeld Box 3:</p><div class="space-y-1 text-sm"><p>Waarde woning: €250.000</p><p>Hypotheek: -€175.000</p><p class="font-semibold">Netto vermogen: €75.000</p><p>Vrijstelling: -€57.000</p><p class="font-semibold">Belastbaar vermogen: €18.000</p><p>Fictief rendement (6,04%): €1.087</p><p class="font-semibold text-foreground">Belasting Box 3 (36%): €391/jaar</p></div></div><div><p class="font-semibold text-foreground">Verrekening van Spaanse belasting</p><p class="text-sm">De belasting die je in Spanje betaalt (IRNR of huurinkomstenbelasting) kun je <span class="font-semibold">verrekenen</span> met je Nederlandse belasting via de \'voorkoming dubbele belasting\'. Dit voorkomt dat je twee keer belasting betaalt.</p><ul class="list-disc pl-6 space-y-1 text-sm mt-2"><li>Spaanse IRNR/huurbelasting is aftrekbaar in NL</li><li>Je betaalt het <span class="font-semibold">verschil</span> in NL als NL-tarief hoger is</li><li>Dit regel je via je Nederlandse belastingaangifte</li></ul></div></div><div class="bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/20 mt-3"><p class="text-sm"><span class="font-semibold text-foreground">⚠️ Belangrijk:</span> Fiscale regels kunnen complex zijn en veranderen regelmatig. Raadpleeg altijd een fiscalist die gespecialiseerd is in Nederlands-Spaanse vastgoedtransacties. Wij kunnen je doorverwijzen naar betrouwbare partners.</p></div>',
            cta_link: '/contact',
            cta_text: 'Vraag een fiscaal adviesgesprek aan',
            order_index: 3,
          },
          {
            question: 'Wat is vermogensbelasting en wanneer betaal ik dit?',
            answer: '<p><span class="font-semibold text-foreground">Impuesto sobre el Patrimonio</span> (vermogensbelasting) is een jaarlijkse belasting in Spanje die alleen geldt bij een hoger vermogen.</p><div class="space-y-3"><div><p class="font-semibold text-foreground">Wanneer betaal je vermogensbelasting?</p><p class="text-sm">Alleen als je totale vermogen in Spanje boven een bepaald bedrag komt:</p><ul class="list-disc pl-6 space-y-1 text-sm mt-1"><li><span class="font-semibold">Landelijk minimum:</span> €700.000</li><li><span class="font-semibold">Vrijstelling hoofdverblijf:</span> Tot €300.000 aftrekbaar</li><li><span class="font-semibold">Varieert per regio:</span> Murcia, Andalucía hebben verhoogde drempel of vrijstellingen</li></ul></div><div><p class="font-semibold text-foreground">Tarieven:</p><ul class="list-disc pl-6 space-y-1 text-sm"><li>0,2% - 3,5% (progressief)</li><li>Hoger vermogen = hoger tarief</li></ul></div></div><div class="bg-primary/10 p-3 rounded-lg"><p class="text-sm"><span class="font-semibold text-foreground">Voor de meeste investeerders:</span> Als je één vakantiewoning bezit van €200k-€600k, betaal je <span class="font-semibold">geen vermogensbelasting</span>. Dit is alleen relevant bij meerdere woningen of een zeer hoge waarde (>€700k totaal).</p></div>',
            cta_link: null,
            cta_text: null,
            order_index: 4,
          },
        ],
      },
      {
        category_key: 'rental',
        display_name: 'Verhuur & Rendement',
        icon_name: 'Home',
        context_type: 'investment',
        context_value: null,
        order_index: 3,
        items: [
          {
            question: 'Wat voor rendement kan ik verwachten?',
            answer: '<p>Het rendement van een Spaanse vastgoedinvestering bestaat uit huurinkomsten (cash flow) en waardestijging op langere termijn.</p><div class="space-y-3"><div><p class="font-semibold text-foreground">Bruto huurrendement (Costa Cálida regio):</p><ul class="list-disc pl-6 space-y-1 text-sm"><li>Vakantiehuur: <span class="font-semibold">5-8%</span> per jaar</li><li>Langetermijnverhuur: <span class="font-semibold">4-6%</span> per jaar</li><li>Afhankelijk van: locatie, type woning, seizoen, beheer</li></ul></div><div><p class="font-semibold text-foreground">Waardestijging (historisch):</p><ul class="list-disc pl-6 space-y-1 text-sm"><li>Gemiddeld: <span class="font-semibold">3-5%</span> per jaar</li><li>Populaire gebieden: soms 5-8% per jaar</li><li>Afhankelijk van marktcyclus en locatie</li></ul></div><div class="bg-muted p-4 rounded-lg"><p class="font-semibold text-foreground mb-2">Rekenvoorbeeld €250.000 appartement:</p><div class="space-y-1 text-sm"><p class="font-semibold">Inkomsten:</p><ul class="pl-4 space-y-0.5"><li>Bruto huurinkomsten: €15.000/jaar (6%)</li><li>Bezetting: 25-30 weken (gemiddeld €500-600/week)</li></ul><p class="font-semibold mt-2">Kosten:</p><ul class="pl-4 space-y-0.5"><li>Gemeenschap: €900</li><li>Belastingen (IBI, basura): €400</li><li>Verzekeringen: €400</li><li>Onderhoud: €800</li><li>Beheer (20%): €3.000</li><li>Nutsvoorzieningen: €600</li></ul><p class="font-semibold mt-2 text-foreground">Netto huurinkomsten: ~€8.900 (3,6% netto rendement)</p><p class="text-xs text-muted-foreground mt-1">+ Waardestijging (~4%): €10.000</p><p class="font-semibold text-primary mt-1">Totaal rendement: ~€18.900/jaar (7,6%)</p></div></div><div><p class="font-semibold text-foreground">Factoren die rendement beïnvloeden:</p><ul class="list-disc pl-6 space-y-1 text-sm"><li><span class="font-semibold">Locatie:</span> Strand, golf, stad = hogere vraag</li><li><span class="font-semibold">Type woning:</span> Nieuwbouw vs bestaand, faciliteiten</li><li><span class="font-semibold">Seizoen:</span> Hoogseizoen (juni-sep) verdient het meest</li><li><span class="font-semibold">Eigen gebruik:</span> Meer eigen gebruik = minder huurinkomsten</li><li><span class="font-semibold">Beheer:</span> Professioneel beheer optimaliseert bezetting</li><li><span class="font-semibold">Voorzieningen:</span> Zwembad, airco, wifi, parking = hogere prijzen</li></ul></div></div><div class="bg-primary/10 p-3 rounded-lg"><p class="text-sm"><span class="font-semibold text-foreground">💡 Tip:</span> Rendement is het hoogst als je de woning maximaal verhuurt (30-40 weken) en minimaal zelf gebruikt. Vind je balans tussen genieten en verdienen.</p></div>',
            cta_link: null,
            cta_text: null,
            order_index: 0,
          },
          {
            question: 'Mag ik toeristische verhuur doen?',
            answer: '<p>Ja, in de meeste regio\'s in Spanje mag je je woning toeristische verhuren. Wel heb je daarvoor een <span class="font-semibold text-foreground">toeristenlicentie (VV-licentie)</span> nodig.</p><div class="space-y-3"><div><p class="font-semibold text-foreground">Wat is een VV-licentie?</p><p class="text-sm">VV staat voor <span class="italic">Vivienda Vacacional</span> (vakantiewoning). Dit is een vergunning van de lokale overheid die aantoont dat je woning voldoet aan de eisen voor toeristische verhuur.</p></div><div><p class="font-semibold text-foreground">Eisen voor een VV-licentie:</p><ul class="list-disc pl-6 space-y-1 text-sm"><li>De woning moet aan minimale kwaliteitseisen voldoen</li><li>Badkamer, keuken, slaapkamers volgens voorschriften</li><li>Verantwoordelijk persoon aanwijzen (jij of beheerder)</li><li>Klachtenregeling beschikbaar</li><li>Identificatie van gasten verplicht</li><li>Voldoen aan veiligheidsvoorschriften</li></ul></div><div class="bg-muted p-4 rounded-lg"><p class="font-semibold text-foreground mb-2">Verschillen per regio:</p><div class="space-y-2 text-sm"><div><p class="font-semibold">🟢 Murcia (Costa Cálida):</p><p class="text-xs">Relatief soepel. VV-licentie is goed te verkrijgen, weinig beperkingen.</p></div><div><p class="font-semibold">🟢 Valencia:</p><p class="text-xs">Ook goed mogelijk, wel strikter op regels. Geen licentie voor appartementen in sommige gebieden.</p></div><div><p class="font-semibold">🟡 Andalucía:</p><p class="text-xs">Varieert per gemeente. Sommige gebieden hebben beperkingen.</p></div><div><p class="font-semibold">🔴 Barcelona & Mallorca:</p><p class="text-xs">Zeer streng. Veel beperkingen en hoge boetes bij illegale verhuur.</p></div></div></div><div><p class="font-semibold text-foreground">Kosten VV-licentie:</p><ul class="list-disc pl-6 space-y-1 text-sm"><li>Aanvraagkosten: €150-500 (afhankelijk van gemeente)</li><li>Technisch rapport: €200-400</li><li>Totale doorlooptijd: 2-6 maanden</li><li>Licentie geldt voor onbepaalde tijd (tenzij regels wijzigen)</li></ul></div></div><div class="bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/20"><p class="text-sm"><span class="font-semibold text-foreground">⚠️ Belangrijk:</span> Verhuren zonder licentie kan leiden tot hoge boetes (€3.000-€30.000). Zorg dat je licentie op orde is voordat je start met verhuren via Airbnb, Booking.com, etc.</p></div><div class="bg-primary/10 p-3 rounded-lg mt-3"><p class="text-sm"><span class="font-semibold text-foreground">✅ Onze service:</span> Wij helpen je bij het aanvragen van de VV-licentie, inclusief technisch rapport en alle benodigde documenten. Dit regelen we voor je als onderdeel van onze service.</p></div>',
            cta_link: null,
            cta_text: null,
            order_index: 1,
          },
          {
            question: 'Hoe regel ik beheer als ik in Nederland woon?',
            answer: '<p>Als je in Nederland woont en een woning in Spanje verhuurt, is professioneel beheer bijna onmisbaar. Gelukkig zijn er uitstekende beheerpartners beschikbaar.</p><div class="space-y-3"><div><p class="font-semibold text-foreground">Wat doet een beheerbedrijf?</p><ul class="list-disc pl-6 space-y-1 text-sm"><li><span class="font-semibold">Gastencontact:</span> Beantwoorden vragen, check-in/out regelen</li><li><span class="font-semibold">Schoonmaak:</span> Na elk verblijf professionele schoonmaak</li><li><span class="font-semibold">Sleutelbeheer:</span> Veilige overdracht aan gasten</li><li><span class="font-semibold">Onderhoud:</span> Kleine reparaties en storingen verhelpen</li><li><span class="font-semibold">Inspectie:</span> Controleren van de woning voor/na gasten</li><li><span class="font-semibold">Linnen & handdoeken:</span> Wassen en vervangen</li><li><span class="font-semibold">Voorraad bijvullen:</span> Toiletpapier, zeep, etc.</li><li><span class="font-semibold">Rapportage:</span> Maandelijks overzicht van inkomsten/kosten</li></ul></div><div><p class="font-semibold text-foreground">Kosten van beheer:</p><ul class="list-disc pl-6 space-y-1 text-sm"><li><span class="font-semibold">Basis beheer:</span> 15-25% van bruto huurinkomsten</li><li><span class="font-semibold">All-inclusive:</span> 25-35% (inclusief marketing, foto\'s, prijsoptimalisatie)</li><li><span class="font-semibold">Schoonmaak per verblijf:</span> €50-80 (aparte post aan gast)</li><li><span class="font-semibold">Check-in service:</span> Vaak inclusief of €25-50 per check-in</li></ul></div><div class="bg-muted p-4 rounded-lg"><p class="font-semibold text-foreground mb-2">Rekenvoorbeeld:</p><div class="space-y-1 text-sm"><p>Bruto huurinkomsten per jaar: €15.000</p><p>Beheerkosten (20%): €3.000</p><p>Schoonmaak (25 boekingen x €60): €1.500</p><p class="font-semibold text-foreground">Totale beheerkosten: €4.500 (30% van omzet)</p><p class="text-xs text-muted-foreground mt-1">→ Dit is aftrekbaar van je belastbare huurinkomsten</p></div></div><div><p class="font-semibold text-foreground">Optie: Zelf beheren vanaf Nederland</p><p class="text-sm">Het is technisch mogelijk om zelf te beheren via platforms als Airbnb en Booking.com, maar dit vraagt:</p><ul class="list-disc pl-6 space-y-1 text-sm mt-1"><li>24/7 bereikbaarheid voor gasten (tijdsverschil!)</li><li>Lokale contactpersoon voor sleutels en noodgevallen</li><li>Schoonmaakservice regelen na elk verblijf</li><li>Onderhoud op afstand coördineren (taalbarrière)</li><li>Veel tijd en aandacht (niet echt vakantiegevoel)</li></ul><p class="text-sm mt-2 italic">Meeste eigenaren kiezen uiteindelijk voor professioneel beheer vanwege gemak en hogere bezetting.</p></div></div><div class="bg-primary/10 p-3 rounded-lg"><p class="text-sm"><span class="font-semibold text-foreground">✅ Viva netwerk:</span> Wij werken samen met betrouwbare lokale beheerders in Costa Cálida en Valencia die Nederlands-Spaanse eigenaren specialiseren. We koppelen je aan de juiste partner.</p></div>',
            cta_link: null,
            cta_text: null,
            order_index: 2,
          },
          {
            question: 'Kan ik de woning ook zelf gebruiken?',
            answer: '<p>Absoluut! De meeste investeerders gebruiken hun Spaanse woning zowel voor eigengebruik als verhuur. Dit is een van de grootste voordelen van vastgoedinvesteren in Spanje.</p><div class="space-y-3"><div><p class="font-semibold text-foreground">Balans tussen genieten en verdienen:</p><ul class="list-disc pl-6 space-y-1 text-sm"><li><span class="font-semibold">Gemiddelde:</span> 6-10 weken eigengebruik per jaar</li><li><span class="font-semibold">Rest verhuren:</span> 20-30 weken per jaar</li><li><span class="font-semibold">Lege periodes:</span> 10-20 weken (onderhoud, laagseizoen)</li></ul></div><div><p class="font-semibold text-foreground">Voordelen van eigengebruik + verhuur:</p><ul class="list-disc pl-6 space-y-1 text-sm"><li>Je hebt je eigen vakantiehuis zonder volledige kosten te dragen</li><li>Huurinkomsten dekken een groot deel van de vaste lasten</li><li>Je kunt spontaan naar Spanje (lage-seizoen, tussendoor)</li><li>Familie en vrienden kunnen er ook verblijven</li><li>Je blijft betrokken bij de woning (controle, onderhoud)</li></ul></div><div class="bg-muted p-4 rounded-lg"><p class="font-semibold text-foreground mb-2">Praktische tips:</p><ul class="space-y-1 text-sm"><li><span class="font-semibold">Block je eigen periodes tijdig:</span> Zeker in hoogseizoen</li><li><span class="font-semibold">Kies laagseizoen voor eigen gebruik:</span> April-mei, oktober-november = goedkoper + minder verlies</li><li><span class="font-semibold">Communiceer met beheerder:</span> Geef ruim van tevoren door wanneer jij komt</li><li><span class="font-semibold">Eigen spullen:</span> Bewaar persoonlijke items in afgesloten kast</li></ul></div></div><div class="bg-primary/10 p-3 rounded-lg"><p class="text-sm"><span class="font-semibold text-foreground">💡 Sweet spot:</span> 6-8 weken eigen gebruik + 25-30 weken verhuur = optimale balans tussen genieten en rendement. Zo dek je 60-80% van je vaste lasten met huurinkomsten.</p></div>',
            cta_link: null,
            cta_text: null,
            order_index: 3,
          },
          {
            question: 'Is seizoensafhankelijkheid een probleem?',
            answer: '<p>Toeristische verhuur in Spanje is inderdaad seizoensgebonden, maar met de juiste strategie is dit goed te managen.</p><div class="space-y-3"><div><p class="font-semibold text-foreground">Seizoenspatroon Costa Cálida:</p><ul class="list-disc pl-6 space-y-1 text-sm"><li><span class="font-semibold">Hoogseizoen (juni-september):</span> 80-100% bezetting, hoogste prijzen (€700-900/week)</li><li><span class="font-semibold">Middenseizoen (april-mei, okt-nov):</span> 50-70% bezetting, gemiddelde prijzen (€500-700/week)</li><li><span class="font-semibold">Laagseizoen (dec-maart):</span> 20-40% bezetting, lagere prijzen (€400-600/week)</li></ul></div><div><p class="font-semibold text-foreground">Strategieën om seizoenseffect te verminderen:</p><ul class="list-disc pl-6 space-y-1 text-sm"><li><span class="font-semibold">Langetermijnverhuur winters:</span> Verhuur november-maart aan vaste gasten (snowbirds, digital nomads)</li><li><span class="font-semibold">Last-minute acties:</span> Flexibele prijzen in laagseizoen om bezetting te verhogen</li><li><span class="font-semibold">Golf & wellness gasten:</span> Costa Cálida heeft veel golftoeristen ook in winter</li><li><span class="font-semibold">Eigen gebruik:</span> Gebruik de lage periodes zelf (lagere opportuniteitskosten)</li></ul></div><div class="bg-muted p-4 rounded-lg"><p class="font-semibold text-foreground mb-2">Rekenvoorbeeld spreiding:</p><div class="space-y-1 text-sm"><p class="font-semibold">Strategie 1: Alleen zomer verhuren</p><ul class="pl-4 space-y-0.5"><li>16 weken hoogseizoen x €800 = €12.800</li></ul><p class="font-semibold mt-2">Strategie 2: Year-round met mix</p><ul class="pl-4 space-y-0.5"><li>16 weken hoogseizoen x €800 = €12.800</li><li>8 weken middenseizoen x €600 = €4.800</li><li>12 weken winter langetermijn x €400 = €4.800</li><li><span class="font-semibold text-foreground">Totaal: €22.400 (+75% meer!)</span></li></ul></div></div></div><div class="bg-primary/10 p-3 rounded-lg"><p class="text-sm"><span class="font-semibold text-foreground">✅ Voordeel:</span> Costa Cálida heeft relatief mild winterklimaat (15-20°C) waardoor year-round verhuur beter mogelijk is dan in Noord-Spanje.</p></div>',
            cta_link: null,
            cta_text: null,
            order_index: 4,
          },
        ],
      },
    ];

    // Contact FAQ
    const contactCategories = [
      {
        category_key: 'about',
        display_name: 'Over Top Immo Spain',
        icon_name: 'Info',
        context_type: 'contact',
        context_value: null,
        order_index: 0,
        items: [
          {
            question: 'Voor wie is Top Immo Spain geschikt?',
            answer: 'Voor iedereen die overweegt te investeren in Spaans vastgoed — of je nu net begint met oriënteren, al concreet zoekt, of gewoon een eerste vraag hebt. We begeleiden zowel particuliere investeerders als mensen die vooral willen genieten van een tweede thuis in de zon.',
            cta_link: null,
            cta_text: null,
            order_index: 0,
          },
          {
            question: 'Wat onderscheidt jullie van andere makelaars?',
            answer: 'Wij zijn geen traditionele makelaar, maar een onafhankelijke adviseur. We denken mee vanuit jouw belang, pushen niet, en werken met een bewezen 6-fasenmodel waarbij je stap voor stap wordt begeleid — van oriëntatie tot nazorg.',
            cta_link: null,
            cta_text: null,
            order_index: 1,
          },
        ],
      },
    ];

    // Story FAQ
    const storyCategories = [
      {
        category_key: 'story_genieter',
        display_name: 'Voor Genieter-Investeerders',
        icon_name: 'Home',
        context_type: 'story',
        context_value: 'Genieter-Investeerder',
        order_index: 0,
        items: [
          {
            question: 'Kan ik de woning ook zelf gebruiken als vakantiewoning?',
            answer: 'Absoluut! Veel van onze klanten gebruiken hun woning deels zelf en verhuren deze de rest van het jaar. We helpen je een balans te vinden die past bij jouw wensen en je beleggingsdoelen.',
            cta_link: null,
            cta_text: null,
            order_index: 0,
          },
        ],
      },
    ];

    // General FAQ
    const generalCategories = [
      {
        category_key: 'juridisch',
        display_name: 'Juridisch',
        icon_name: 'Shield',
        context_type: 'general',
        context_value: null,
        order_index: 0,
        items: [
          {
            question: 'Kan ik als Nederlander eigenaar worden van vastgoed in Spanje?',
            answer: 'Ja, als EU-burger heeft u dezelfde rechten als Spanjaarden om vastgoed te kopen. U heeft wel een NIE-nummer (Número de Identificación de Extranjero) nodig voor de transactie.',
            cta_link: null,
            cta_text: null,
            order_index: 0,
          },
        ],
      },
    ];

    const allCategories = [
      ...investmentCategories,
      ...contactCategories,
      ...storyCategories,
      ...generalCategories,
    ];

    let migratedCategories = 0;
    let migratedItems = 0;

    for (const category of allCategories) {
      const { items, ...categoryData } = category;

      // Insert category
      const { data: newCategory, error: catError } = await supabase
        .from('faq_categories')
        .insert([categoryData])
        .select()
        .single();

      if (catError) {
        console.error('Error inserting category:', catError);
        continue;
      }

      migratedCategories++;

      // Insert items
      if (items && items.length > 0) {
        const itemsWithCategory = items.map(item => ({
          ...item,
          category_id: newCategory.id,
        }));

        const { error: itemsError } = await supabase
          .from('faq_items')
          .insert(itemsWithCategory);

        if (itemsError) {
          console.error('Error inserting items:', itemsError);
        } else {
          migratedItems += items.length;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        migratedCategories,
        migratedItems,
        message: `Migratie voltooid: ${migratedCategories} categorieën en ${migratedItems} vragen toegevoegd`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});