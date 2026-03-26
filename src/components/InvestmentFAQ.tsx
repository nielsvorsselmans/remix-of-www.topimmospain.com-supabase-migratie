import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Banknote, Shield, Receipt, Home, HelpCircle, ArrowRight, BookOpen, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface InvestmentFAQProps {
  defaultTab?: "financing" | "legal" | "tax" | "rental";
  showTabs?: ("financing" | "legal" | "tax" | "rental")[];
  variant?: "card" | "minimal";
  className?: string;
}

export const InvestmentFAQ = ({ 
  defaultTab = "financing",
  showTabs = ["financing", "legal", "tax", "rental"],
  variant = "card",
  className 
}: InvestmentFAQProps) => {
  const tabsConfig = [
    {
      id: "financing" as const,
      label: "Financiering",
      icon: Banknote,
    },
    {
      id: "legal" as const,
      label: "Juridisch",
      icon: Shield,
    },
    {
      id: "tax" as const,
      label: "Belastingen",
      icon: Receipt,
    },
    {
      id: "rental" as const,
      label: "Verhuur",
      icon: Home,
    },
  ].filter(tab => showTabs.includes(tab.id));

  const content = variant === "card" ? (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          Veelgestelde Vragen
        </CardTitle>
        <CardDescription>
          Alles wat je moet weten over investeren in Spanje
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TabsContent_Inner tabs={tabsConfig} defaultTab={defaultTab} />
      </CardContent>
    </Card>
  ) : (
    <div className={cn("w-full", className)}>
      <TabsContent_Inner tabs={tabsConfig} defaultTab={defaultTab} />
    </div>
  );

  return content;
};

const TabsContent_Inner = ({ tabs, defaultTab }: { tabs: any[], defaultTab: string }) => {
  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      <TabsContent value="financing">
        <FinancingContent />
      </TabsContent>

      <TabsContent value="legal">
        <LegalContent />
      </TabsContent>

      <TabsContent value="tax">
        <TaxContent />
      </TabsContent>

      <TabsContent value="rental">
        <RentalContent />
      </TabsContent>
    </Tabs>
  );
};

const FinancingContent = () => (
  <>
    <Accordion type="single" collapsible className="w-full">
    <AccordionItem value="item-1">
      <AccordionTrigger>Kan ik als buitenlander een hypotheek krijgen in Spanje?</AccordionTrigger>
      <AccordionContent className="text-muted-foreground space-y-3">
        <p>
          Ja, als Nederlandse investeerder kun je zeker een hypotheek afsluiten in Spanje. Veel Spaanse 
          banken werken met buitenlandse kopers en bieden hypotheken aan niet-residenten aan.
        </p>
        <p className="font-medium text-foreground">Wel zijn er enkele vereisten:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Je hebt een NIE-nummer nodig (identificatienummer voor buitenlanders)</li>
          <li>Een Spaanse bankrekening is verplicht</li>
          <li>Je moet aantoonbaar inkomen en een stabiele financiële positie hebben</li>
          <li>De aankoopwaarde en bankgaranties moeten voldoende zijn</li>
        </ul>
        <p>
          Viva Vastgoed werkt samen met ervaren hypotheekadviseurs die het complete proces voor je 
          regelen en zorgen dat je de beste voorwaarden krijgt.
        </p>
        <Link to="/blog/financiering-hypotheek" className="text-primary hover:underline inline-block mt-2">
          Lees meer over financieringsmogelijkheden →
        </Link>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="item-2">
      <AccordionTrigger>Hoeveel kan ik maximaal financieren?</AccordionTrigger>
      <AccordionContent className="text-muted-foreground space-y-3">
        <p>
          Voor niet-residenten (zoals Nederlandse investeerders) bieden Spaanse banken doorgaans een 
          <span className="font-semibold text-foreground"> maximale financiering van 60-70% van de aankoopwaarde</span> of 
          taxatiewaarde (welke van de twee het laagst is).
        </p>
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <p className="font-medium text-foreground">Voorbeeld:</p>
          <ul className="space-y-1 text-sm">
            <li>Aankoopprijs woning: €250.000</li>
            <li>Maximale hypotheek (70%): €175.000</li>
            <li>Eigen inbreng nodig: €75.000</li>
            <li>+ aankoopkosten (~12%): €30.000</li>
            <li><span className="font-semibold text-foreground">Totaal eigen geld: €105.000</span></li>
          </ul>
        </div>
        <p>
          Als je wel resident bent in Spanje, kun je vaak tot 80% financieren. Ook je inkomen en 
          financiële situatie spelen een rol in het maximale leenbedrag.
        </p>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="item-3">
      <AccordionTrigger>Wat zijn de voorwaarden en rentetarieven?</AccordionTrigger>
      <AccordionContent className="text-muted-foreground space-y-3">
        <p>De hypotheekvoorwaarden voor niet-residenten in Spanje zijn competitief:</p>
        <div className="space-y-3">
          <div>
            <p className="font-medium text-foreground">Rentetarieven (indicatief):</p>
            <ul className="list-disc pl-6 space-y-1 mt-1">
              <li>Variabel: vanaf 3,5% - 4,5%</li>
              <li>Vast (10-20 jaar): vanaf 4,0% - 5,0%</li>
              <li>Mix van vast en variabel mogelijk</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground">Looptijd:</p>
            <ul className="list-disc pl-6 space-y-1 mt-1">
              <li>Maximaal 25-30 jaar (afhankelijk van je leeftijd)</li>
              <li>Meestal tot je 70ste of 75ste levensjaar</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground">Overige voorwaarden:</p>
            <ul className="list-disc pl-6 space-y-1 mt-1">
              <li>Maandlasten mogen maximaal 30-35% van je netto inkomen zijn</li>
              <li>Overlijdensrisicoverzekering verplicht</li>
              <li>Opstalverzekering verplicht</li>
            </ul>
          </div>
        </div>
        <p className="text-sm italic">
          Tarieven en voorwaarden kunnen wijzigen. Vraag altijd actuele informatie op bij de bank.
        </p>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="item-4">
      <AccordionTrigger>Welke documenten heb ik nodig voor een hypotheekaanvraag?</AccordionTrigger>
      <AccordionContent className="text-muted-foreground space-y-3">
        <p>Voor een hypotheekaanvraag in Spanje heb je de volgende documenten nodig:</p>
        <div className="space-y-3">
          <div>
            <p className="font-medium text-foreground">Identificatie:</p>
            <ul className="list-disc pl-6 space-y-1 mt-1">
              <li>Kopie paspoort of ID-bewijs</li>
              <li>NIE-nummer (kunnen wij voor je regelen)</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground">Inkomen en vermogen:</p>
            <ul className="list-disc pl-6 space-y-1 mt-1">
              <li>Laatste 3 loonstroken of jaaropgaven</li>
              <li>Laatste 2 jaar belastingaangiften</li>
              <li>Bankafschriften laatste 3-6 maanden</li>
              <li>Arbeidscontract of bedrijfsgegevens (bij ZZP)</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground">Vastgoed:</p>
            <ul className="list-disc pl-6 space-y-1 mt-1">
              <li>Verkoopcontract of reserveringsovereenkomst</li>
              <li>Taxatierapport (regelt de bank)</li>
              <li>Kadaster uittreksel (nota simple)</li>
            </ul>
          </div>
        </div>
        <p className="bg-primary/10 p-3 rounded-lg text-sm">
          <span className="font-semibold text-foreground">Tip:</span> Veel documenten kunnen in het Engels 
          worden aangeleverd. Officiële vertalingen zijn meestal niet nodig. Onze hypotheekadviseur helpt 
          je met het compleet maken van het dossier.
        </p>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="item-5">
      <AccordionTrigger>Hoe helpt Viva Vastgoed bij de financiering?</AccordionTrigger>
      <AccordionContent className="text-muted-foreground space-y-3">
        <p>
          Wij begeleiden je door het complete financieringsproces en werken samen met gespecialiseerde 
          hypotheekadviseurs die de Spaanse én Nederlandse markt kennen.
        </p>
        <div className="space-y-2">
          <p className="font-medium text-foreground">Onze service omvat:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Oriënterend gesprek over je financieringsmogelijkheden</li>
            <li>Contact leggen met banken en hypotheekadviseurs</li>
            <li>Helpen met het aanvragen van je NIE-nummer</li>
            <li>Bijstand bij het verzamelen van de benodigde documenten</li>
            <li>Vertaling en uitleg van hypotheekoffertes</li>
            <li>Aanwezig zijn bij de ondertekening (indien gewenst)</li>
            <li>Nazorg: vragen over aflossingen, herfinancieren, etc.</li>
          </ul>
        </div>
        <p>
          Ons doel is om het proces zo soepel mogelijk te laten verlopen, zodat je met vertrouwen 
          je investering kunt doen.
        </p>
        <Link to="/contact" className="text-primary hover:underline inline-block mt-2">
          Neem contact op voor een financieringsgesprek →
        </Link>
      </AccordionContent>
    </AccordionItem>
    </Accordion>

    {/* Tab-Specific CTA */}
    <div className="mt-8 p-6 bg-muted/30 rounded-lg border border-border/50">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2 text-lg font-semibold text-foreground mb-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          <span>Staat jouw vraag er niet tussen?</span>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Bekijk onze uitgebreide kennisbank of stel je vraag rechtstreeks aan een van onze adviseurs.
        </p>
        <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
          <Button asChild variant="default" className="gap-2">
            <Link to="/blog">
              <BookOpen className="w-4 h-4" />
              Kennisbank
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/afspraak">
              <MessageCircle className="w-4 h-4" />
              Stel je vraag
            </Link>
          </Button>
        </div>
      </div>
    </div>
  </>
);

const LegalContent = () => (
  <>
    <Accordion type="single" collapsible className="w-full">
    <AccordionItem value="item-1">
      <AccordionTrigger>Hoe werkt het aankoopproces in Spanje?</AccordionTrigger>
      <AccordionContent className="text-muted-foreground space-y-3">
        <p>
          Het Spaanse aankoopproces verschilt van Nederland, maar is dankzij onze begeleiding 
          overzichtelijk en veilig.
        </p>
        <div className="space-y-3">
          <div className="border-l-4 border-primary pl-4">
            <p className="font-semibold text-foreground">Stap 1: Reservering</p>
            <p className="text-sm">Je stort een reserveringssom (€3.000-€6.000) om de woning voor je te reserveren.</p>
          </div>
          <div className="border-l-4 border-primary pl-4">
            <p className="font-semibold text-foreground">Stap 2: Arras Contract (Voorcontract)</p>
            <p className="text-sm">Je betaalt 10% van de koopsom en ondertekent een voorcontract bij de notaris.</p>
          </div>
          <div className="border-l-4 border-primary pl-4">
            <p className="font-semibold text-foreground">Stap 3: Due Diligence</p>
            <p className="text-sm">Onze advocaat controleert alle juridische aspecten: eigendom, hypotheken, bouwvergunningen.</p>
          </div>
          <div className="border-l-4 border-primary pl-4">
            <p className="font-semibold text-foreground">Stap 4: Escritura (Definitieve akte)</p>
            <p className="text-sm">Je betaalt de resterende 90% en ondertekent de koopakte bij de notaris. Je bent nu eigenaar!</p>
          </div>
        </div>
        <p className="bg-primary/10 p-3 rounded-lg text-sm">
          <span className="font-semibold text-foreground">Gemiddelde doorlooptijd:</span> 3-6 maanden 
          van reservering tot definitieve eigendomsoverdracht.
        </p>
        <Link to="/blog/aankoopproces" className="text-primary hover:underline inline-block mt-2">
          Lees de volledige uitleg van het aankoopproces →
        </Link>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="item-2">
      <AccordionTrigger>Wat is een NIE-nummer en hoe verkrijg ik dit?</AccordionTrigger>
      <AccordionContent className="text-muted-foreground space-y-3">
        <p>
          Een <span className="font-semibold text-foreground">NIE (Número de Identidad de Extranjero)</span> is 
          een identificatienummer voor buitenlanders in Spanje. Je hebt dit nodig voor:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Het kopen van een woning</li>
          <li>Het afsluiten van een hypotheek</li>
          <li>Het openen van een bankrekening</li>
          <li>Aansluiten van nutsvoorzieningen</li>
          <li>Belastingaangiften doen</li>
        </ul>
        <div className="mt-3">
          <p className="font-medium text-foreground mb-2">Hoe verkrijg je een NIE?</p>
          <div className="space-y-2">
            <p><span className="font-semibold">Optie 1:</span> Via het Spaanse consulaat in Nederland (Den Haag of Amsterdam)</p>
            <p><span className="font-semibold">Optie 2:</span> In Spanje bij een politiebureau of vreemdelingenkantoor</p>
            <p><span className="font-semibold">Optie 3:</span> Via een gemachtigde (volmacht) - wij kunnen dit regelen</p>
          </div>
        </div>
        <p className="bg-primary/10 p-3 rounded-lg text-sm">
          <span className="font-semibold text-foreground">Onze service:</span> Wij helpen je met de aanvraag, 
          verzamelen de benodigde documenten en kunnen via een volmacht het NIE voor je aanvragen. 
          Gemiddelde doorlooptijd: 2-4 weken.
        </p>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="item-3">
      <AccordionTrigger>Welke juridische controles worden uitgevoerd?</AccordionTrigger>
      <AccordionContent className="text-muted-foreground space-y-3">
        <p>
          Voor elke aankoop laten wij een grondig juridisch onderzoek uitvoeren door een 
          gespecialiseerde vastgoedadvocaat. Dit heet ook wel <span className="font-semibold text-foreground">'due diligence'</span>.
        </p>
        <div className="space-y-2">
          <p className="font-medium text-foreground">De advocaat controleert:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><span className="font-semibold">Eigendomssituatie:</span> Is de verkoper daadwerkelijk eigenaar?</li>
            <li><span className="font-semibold">Hypotheken/lasten:</span> Zijn er hypotheken of andere schulden op het pand?</li>
            <li><span className="font-semibold">Bouwvergunningen:</span> Is alles legaal gebouwd? Zijn er legalisatieproblemen?</li>
            <li><span className="font-semibold">Gemeentelijke lasten:</span> Zijn IBI, afvalbelasting, etc. betaald?</li>
            <li><span className="font-semibold">Gemeenschapskosten:</span> Bij appartementen: zijn de kosten betaald?</li>
            <li><span className="font-semibold">Erfdienstbaarheden:</span> Zijn er recht van overpad of andere beperkingen?</li>
            <li><span className="font-semibold">Bestemmingsplan:</span> Wat zijn de plannen voor het gebied?</li>
          </ul>
        </div>
        <p className="bg-green-500/10 p-3 rounded-lg text-sm border border-green-500/20">
          <span className="font-semibold text-foreground">Garantie:</span> Pas als alle controles groen licht 
          geven, adviseren wij om door te gaan met de aankoop. Je investering is daarmee maximaal beschermd.
        </p>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="item-4">
      <AccordionTrigger>Op wiens naam komt de woning te staan?</AccordionTrigger>
      <AccordionContent className="text-muted-foreground space-y-3">
        <p>Je hebt verschillende mogelijkheden voor de eigendomsstructuur van je Spaanse woning:</p>
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-foreground">1. Op eigen naam (particulier)</p>
            <ul className="list-disc pl-6 space-y-1 text-sm mt-1">
              <li><span className="text-green-600">+</span> Eenvoudig en goedkoop</li>
              <li><span className="text-green-600">+</span> Lagere aankoopkosten (7-10% overdrachtsbelasting)</li>
              <li><span className="text-red-600">-</span> Minder fiscale aftrekmogelijkheden</li>
              <li><span className="text-red-600">-</span> Successierechten bij overlijden</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground">2. Via een Nederlandse BV</p>
            <ul className="list-disc pl-6 space-y-1 text-sm mt-1">
              <li><span className="text-green-600">+</span> Meer fiscale aftrekposten mogelijk</li>
              <li><span className="text-green-600">+</span> Betere successieplanning</li>
              <li><span className="text-red-600">-</span> Hogere aankoopkosten (10% IVA bij nieuwbouw)</li>
              <li><span className="text-red-600">-</span> Meer administratieve lasten</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground">3. Via een Spaanse SL (sociedad limitada)</p>
            <ul className="list-disc pl-6 space-y-1 text-sm mt-1">
              <li><span className="text-green-600">+</span> Gunstig voor meerdere woningen</li>
              <li><span className="text-green-600">+</span> Eenvoudige overdracht van aandelen</li>
              <li><span className="text-red-600">-</span> Oprichtingskosten en jaarlijkse accountantskosten</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground">4. Op naam van beide partners</p>
            <ul className="list-disc pl-6 space-y-1 text-sm mt-1">
              <li><span className="text-green-600">+</span> Beide partners zijn eigenaar</li>
              <li><span className="text-green-600">+</span> Fiscaal soms voordelig</li>
              <li>Keuze tussen gemeenschappelijk eigendom of 50/50</li>
            </ul>
          </div>
        </div>
        <p className="bg-primary/10 p-3 rounded-lg text-sm">
          <span className="font-semibold text-foreground">Advies:</span> Voor de meeste eerste investeerders 
          is aankoop op eigen naam het meest eenvoudig. Bij meerdere woningen of een hoger vermogen kan 
          een BV interessant zijn. Wij adviseren je graag persoonlijk.
        </p>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="item-5">
      <AccordionTrigger>Hoe beschermt Viva Vastgoed mijn investering?</AccordionTrigger>
      <AccordionContent className="text-muted-foreground space-y-3">
        <p>
          Jouw zekerheid staat bij ons voorop. Daarom hebben we een uitgebreid beschermingssysteem 
          voor elke investering:
        </p>
        <div className="space-y-3">
          <div className="bg-muted p-4 rounded-lg">
            <p className="font-semibold text-foreground mb-2">🏛️ Juridische Begeleiding</p>
            <ul className="space-y-1 text-sm">
              <li>• Onafhankelijke vastgoedadvocaat controleert alles</li>
              <li>• Due diligence rapport voor elke woning</li>
              <li>• Aanwezig bij alle ondertekeningen</li>
            </ul>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="font-semibold text-foreground mb-2">🏦 Financiële Zekerheid</p>
            <ul className="space-y-1 text-sm">
              <li>• Betalingen via gereguleerde notarisrekening</li>
              <li>• Bankgaranties bij nieuwbouwprojecten</li>
              <li>• Volledige transparantie in alle kosten</li>
            </ul>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="font-semibold text-foreground mb-2">🛡️ Kwaliteitscontrole</p>
            <ul className="space-y-1 text-sm">
              <li>• Selectie van betrouwbare developers</li>
              <li>• Bouwinspecties bij nieuwbouw</li>
              <li>• Garantie op constructiefouten (10 jaar)</li>
            </ul>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="font-semibold text-foreground mb-2">📞 Persoonlijke Begeleiding</p>
            <ul className="space-y-1 text-sm">
              <li>• Vaste contactpersoon van begin tot eind</li>
              <li>• Nederlands- en Spaanstalig team</li>
              <li>• Nazorg ook na de aankoop</li>
            </ul>
          </div>
        </div>
        <p className="text-sm italic">
          Al 15+ jaar begeleiden we Nederlandse investeerders bij hun Spaanse vastgoedaankoop. 
          Onze ervaring is jouw zekerheid.
        </p>
      </AccordionContent>
    </AccordionItem>
    </Accordion>

    {/* Tab-Specific CTA */}
    <div className="mt-8 p-6 bg-muted/30 rounded-lg border border-border/50">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2 text-lg font-semibold text-foreground mb-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          <span>Staat jouw vraag er niet tussen?</span>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Bekijk onze uitgebreide kennisbank of stel je vraag rechtstreeks aan een van onze adviseurs.
        </p>
        <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
          <Button asChild variant="default" className="gap-2">
            <Link to="/blog">
              <BookOpen className="w-4 h-4" />
              Kennisbank
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/afspraak">
              <MessageCircle className="w-4 h-4" />
              Stel je vraag
            </Link>
          </Button>
        </div>
      </div>
    </div>
  </>
);

const TaxContent = () => (
  <>
    <Accordion type="single" collapsible className="w-full">
    <AccordionItem value="item-1">
      <AccordionTrigger>Welke belastingen betaal ik bij aankoop?</AccordionTrigger>
      <AccordionContent className="text-muted-foreground space-y-3">
        <p>Bij de aankoop van een woning in Spanje betaal je eenmalige overdrachtsbelastingen. 
        De hoogte hangt af van of het nieuwbouw of bestaande bouw is:</p>
        <div className="space-y-3">
          <div className="bg-muted p-4 rounded-lg">
            <p className="font-semibold text-foreground mb-2">🏗️ Nieuwbouw</p>
            <ul className="space-y-1">
              <li><span className="font-semibold">IVA (BTW):</span> 10% van de koopprijs</li>
              <li><span className="font-semibold">AJD (stempelbelasting):</span> 1,5% van de koopprijs</li>
              <li><span className="font-semibold">Totaal:</span> 11,5%</li>
            </ul>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="font-semibold text-foreground mb-2">🏡 Bestaande bouw</p>
            <ul className="space-y-1">
              <li><span className="font-semibold">ITP (overdrachtsbelasting):</span> 7-10% (varieert per regio)</li>
              <li>Murcia: 8%</li>
              <li>Valencia: 10%</li>
              <li>Andalucía: 7-10% (afhankelijk van waarde)</li>
            </ul>
          </div>
        </div>
        <div className="bg-primary/10 p-4 rounded-lg">
          <p className="font-semibold text-foreground mb-2">Rekenvoorbeeld (€250.000 bestaande bouw in Murcia):</p>
          <ul className="space-y-1 text-sm">
            <li>Koopprijs: €250.000</li>
            <li>ITP (8%): €20.000</li>
            <li>Notaris + register: ~€2.500</li>
            <li>Advocaat: ~€2.000</li>
            <li><span className="font-semibold text-foreground">Totale aankoopkosten: ~€24.500 (9,8%)</span></li>
          </ul>
        </div>
        <p className="text-sm italic">
          Deze kosten komen boven op de koopprijs en kunnen niet gefinancierd worden. 
          Je hebt deze als eigen geld nodig.
        </p>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="item-2">
      <AccordionTrigger>Wat zijn de jaarlijkse belastingen als eigenaar?</AccordionTrigger>
      <AccordionContent className="text-muted-foreground space-y-3">
        <p>Als eigenaar van een Spaanse woning betaal je jaarlijks verschillende belastingen:</p>
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-foreground">1. IBI (Onroerendgoedbelasting)</p>
            <p className="text-sm">Vergelijkbaar met de Nederlandse OZB. Hoogte hangt af van de kadastrale waarde 
            en gemeente.</p>
            <ul className="list-disc pl-6 space-y-1 text-sm mt-1">
              <li>Appartement: €200-400/jaar</li>
              <li>Villa: €400-800/jaar</li>
              <li>Luxe villa: €800-1.500/jaar</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground">2. Niet-inwonerbelasting (IRNR)</p>
            <p className="text-sm">Als je niet in Spanje woont, betaal je belasting over een fictief inkomen 
            (1,1-2% van kadastrale waarde).</p>
            <ul className="list-disc pl-6 space-y-1 text-sm mt-1">
              <li>Tarief: 19% (EU-inwoners) of 24% (niet-EU)</li>
              <li>Berekening: 1,1% x kadastrale waarde x 19%</li>
              <li>Voorbeeld €250k woning: ~€500/jaar</li>
            </ul>
            <p className="text-xs italic mt-1">Let op: Als je de woning verhuurt, betaal je belasting over de 
            werkelijke huurinkomsten (zie hieronder).</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">3. Afvalbelasting (Basura)</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>€50-150/jaar (afhankelijk van gemeente en woningtype)</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground">4. Gemeenschapskosten (geen belasting)</p>
            <p className="text-sm">Bij appartementen en complexen met gedeelde voorzieningen:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm mt-1">
              <li>€40-120/maand (zwembad, tuinen, beveiliging, lift)</li>
            </ul>
          </div>
        </div>
        <div className="bg-primary/10 p-4 rounded-lg mt-3">
          <p className="font-semibold text-foreground mb-2">Totaal jaarlijks voor €250k appartement (niet-verhuurd):</p>
          <ul className="space-y-1 text-sm">
            <li>IBI: €300</li>
            <li>IRNR: €500</li>
            <li>Basura: €100</li>
            <li>Gemeenschap: €900 (€75/maand)</li>
            <li><span className="font-semibold text-foreground">Totaal: ~€1.800/jaar (€150/maand)</span></li>
          </ul>
        </div>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="item-3">
      <AccordionTrigger>Hoe werkt belasting op huurinkomsten?</AccordionTrigger>
      <AccordionContent className="text-muted-foreground space-y-3">
        <p>Als je je Spaanse woning verhuurt, betaal je belasting over je netto huurinkomsten 
        (bruto huur minus aftrekbare kosten).</p>
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-foreground">Belastingtarief:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><span className="font-semibold">19%</span> voor EU-inwoners (Nederlandse investeerders)</li>
              <li><span className="font-semibold">24%</span> voor niet-EU inwoners</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground">Aftrekbare kosten:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>IBI (onroerendgoedbelasting)</li>
              <li>Gemeenschapskosten</li>
              <li>Verzekeringen (opstal, aansprakelijkheid)</li>
              <li>Afschrijving van de woning (3% per jaar over 33 jaar)</li>
              <li>Onderhoud en reparaties</li>
              <li>Energiekosten (bij all-inclusive verhuur)</li>
              <li>Beheerkosten (als je een beheerder inschakelt)</li>
              <li>Accountantskosten</li>
              <li>Hypotheekrente (gedeeltelijk)</li>
            </ul>
          </div>
        </div>
        <div className="bg-muted p-4 rounded-lg">
          <p className="font-semibold text-foreground mb-2">Rekenvoorbeeld:</p>
          <div className="space-y-1 text-sm">
            <p>Bruto huurinkomsten per jaar: €15.000</p>
            <p className="text-muted-foreground">Aftrekbare kosten:</p>
            <ul className="pl-4 space-y-0.5 text-muted-foreground">
              <li>- IBI: €300</li>
              <li>- Gemeenschap: €900</li>
              <li>- Afschrijving: €2.500</li>
              <li>- Verzekeringen: €400</li>
              <li>- Onderhoud: €800</li>
              <li>- Beheer (20%): €3.000</li>
              <li>- Accountant: €400</li>
            </ul>
            <p className="text-muted-foreground">Totale kosten: €8.300</p>
            <p className="font-semibold">Netto belastbaar inkomen: €6.700</p>
            <p className="font-semibold text-foreground">Belasting (19%): €1.273</p>
            <p className="font-semibold text-foreground">Netto huurresultaat: €5.427 (3,6% netto rendement op €250k)</p>
          </div>
        </div>
        <div className="bg-primary/10 p-3 rounded-lg mt-3">
          <p className="text-sm">
            <span className="font-semibold text-foreground">Aangifte:</span> Je moet jaarlijks aangifte doen 
            via formulier <span className="font-semibold">Modelo 210</span>. Dit kan ook per kwartaal als je 
            regelmatig verhuurt. Wij werken samen met fiscalisten die dit voor je kunnen regelen.
          </p>
        </div>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="item-4">
      <AccordionTrigger>Moet ik ook in Nederland belasting betalen?</AccordionTrigger>
      <AccordionContent className="text-muted-foreground space-y-3">
        <p>Ja, als Nederlandse belastingplichtige moet je je Spaanse vastgoed ook opgeven in Nederland. 
        Gelukkig is er een belastingverdrag tussen Nederland en Spanje om dubbele belasting te voorkomen.</p>
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-foreground">Box 3 (Vermogensrendementsheffing)</p>
            <p className="text-sm">Je Spaanse woning valt in Box 3 als vermogen (tenzij je deze als 
            ondernemer verhuurt via een BV).</p>
            <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
              <li>Waarde: <span className="font-semibold">WOZ-waarde of aankoopprijs</span> (wat van toepassing is)</li>
              <li>Schulden: hypotheek is aftrekbaar als schuld</li>
              <li>Tarief: <span className="font-semibold">36%</span> over fictief rendement (~6,04% in 2024)</li>
              <li>Vrijstelling: eerste €57.000 (2024) is vrijgesteld per persoon</li>
            </ul>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="font-semibold text-foreground mb-2">Rekenvoorbeeld Box 3:</p>
            <div className="space-y-1 text-sm">
              <p>Waarde woning: €250.000</p>
              <p>Hypotheek: -€175.000</p>
              <p className="font-semibold">Netto vermogen: €75.000</p>
              <p>Vrijstelling: -€57.000</p>
              <p className="font-semibold">Belastbaar vermogen: €18.000</p>
              <p>Fictief rendement (6,04%): €1.087</p>
              <p className="font-semibold text-foreground">Belasting Box 3 (36%): €391/jaar</p>
            </div>
          </div>
          <div>
            <p className="font-semibold text-foreground">Verrekening van Spaanse belasting</p>
            <p className="text-sm">De belasting die je in Spanje betaalt (IRNR of huurinkomstenbelasting) 
            kun je <span className="font-semibold">verrekenen</span> met je Nederlandse belasting via de 
            'voorkoming dubbele belasting'. Dit voorkomt dat je twee keer belasting betaalt.</p>
            <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
              <li>Spaanse IRNR/huurbelasting is aftrekbaar in NL</li>
              <li>Je betaalt het <span className="font-semibold">verschil</span> in NL als NL-tarief hoger is</li>
              <li>Dit regel je via je Nederlandse belastingaangifte</li>
            </ul>
          </div>
        </div>
        <div className="bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/20 mt-3">
          <p className="text-sm">
            <span className="font-semibold text-foreground">⚠️ Belangrijk:</span> Fiscale regels kunnen 
            complex zijn en veranderen regelmatig. Raadpleeg altijd een fiscalist die gespecialiseerd is 
            in Nederlands-Spaanse vastgoedtransacties. Wij kunnen je doorverwijzen naar betrouwbare partners.
          </p>
        </div>
        <Link to="/contact" className="text-primary hover:underline inline-block mt-2">
          Vraag een fiscaal adviesgesprek aan →
        </Link>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="item-5">
      <AccordionTrigger>Wat is vermogensbelasting en wanneer betaal ik dit?</AccordionTrigger>
      <AccordionContent className="text-muted-foreground space-y-3">
        <p>
          <span className="font-semibold text-foreground">Impuesto sobre el Patrimonio</span> (vermogensbelasting) 
          is een jaarlijkse belasting in Spanje die alleen geldt bij een hoger vermogen.
        </p>
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-foreground">Wanneer betaal je vermogensbelasting?</p>
            <p className="text-sm">Alleen als je totale vermogen in Spanje boven een bepaald bedrag komt:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm mt-1">
              <li><span className="font-semibold">Landelijk minimum:</span> €700.000</li>
              <li><span className="font-semibold">Varieert per regio:</span> sommige regio's hebben vrijstellingen tot €2 miljoen</li>
              <li><span className="font-semibold">Murcia & Valencia:</span> zeer gunstige regelingen, vaak volledige vrijstelling</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground">Hoe wordt het berekend?</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Berekend over je totale vermogen in Spanje (alle woningen, bankrekeningen, etc.)</li>
              <li>Hypotheekschulden zijn aftrekbaar</li>
              <li>Progressief tarief: 0,2% - 3,5%</li>
              <li>Eigen woning: €300.000 vrijstelling (als je resident bent)</li>
            </ul>
          </div>
          <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/20">
            <p className="text-sm">
              <span className="font-semibold text-foreground">✅ Goed nieuws:</span> Voor de meeste Nederlandse 
              investeerders met één woning in Spanje (tot ~€500.000) is deze belasting niet van toepassing. 
              Het speelt vooral bij meerdere woningen of zeer hoge vermogens in Spanje.
            </p>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="font-semibold text-foreground mb-2">Voorbeeld:</p>
            <div className="space-y-1 text-sm">
              <p>Woning 1: €250.000</p>
              <p>Woning 2: €350.000</p>
              <p>Spaanse bankrekening: €50.000</p>
              <p className="font-semibold">Totaal vermogen: €650.000</p>
              <p className="text-green-600 font-semibold">→ Onder de €700.000 vrijstelling: geen vermogensbelasting</p>
            </div>
          </div>
        </div>
        <p className="text-sm italic">
          In 2024 hebben veel autonome regio's (waaronder Murcia en Valencia) de vermogensbelasting 
          afgeschaft of sterk verlaagd. Informeer altijd naar de actuele regelingen.
        </p>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="item-6">
      <AccordionTrigger>Is aankoop via een vennootschap fiscaal interessant?</AccordionTrigger>
      <AccordionContent className="text-muted-foreground space-y-3">
        <p>
          Het kopen van een Spaanse woning via een Nederlandse BV of Spaanse SL kan fiscale voordelen 
          bieden, maar is niet voor iedereen de beste keuze.
        </p>
        <div className="space-y-3">
          <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/20">
            <p className="font-semibold text-foreground mb-2">✅ Voordelen van aankoop via BV:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Meer aftrekbare kosten: hypotheekrente, onderhoud, afschrijving</li>
              <li>Afschrijving toepassen (2-3% per jaar)</li>
              <li>Winst stapelen in BV tegen lager tarief (19-25,8%)</li>
              <li>Betere successieplanning: aandelen overdragen is eenvoudiger</li>
              <li>Aansprakelijkheid gescheiden van privévermogen</li>
              <li>Flexibel bij meerdere woningen of uitbreiding portefeuille</li>
            </ul>
          </div>
          <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/20">
            <p className="font-semibold text-foreground mb-2">❌ Nadelen van aankoop via BV:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Hogere aankoopkosten bij nieuwbouw: 10% IVA in plaats van 7-10% ITP</li>
              <li>Meer administratie: jaarrekening, accountant, vennootschapsbelasting</li>
              <li>Kosten accountant: €1.500-3.000/jaar</li>
              <li>Bij persoonlijk gebruik: bijtelling voor privégebruik</li>
              <li>Winst uitkeren: dividendbelasting (26,9% in NL)</li>
              <li>Complexer bij verkoop (exit)</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground">Wanneer is een BV interessant?</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Bij <span className="font-semibold">meerdere vastgoedinvesteringen</span> (portefeuille strategie)</li>
              <li>Bij <span className="font-semibold">puur zakelijke verhuur</span> zonder eigen gebruik</li>
              <li>Als je al een <span className="font-semibold">bestaande BV</span> hebt met liquide middelen</li>
              <li>Bij een <span className="font-semibold">hoger vermogen</span> en successieplanning</li>
              <li>Als je <span className="font-semibold">bestaande bouw</span> koopt (geen 10% IVA)</li>
            </ul>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="font-semibold text-foreground mb-2">Rekenvoorbeeld vergelijking:</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold text-foreground mb-1">Privé aankoop:</p>
                <ul className="space-y-0.5 text-xs">
                  <li>Koopprijs: €250.000</li>
                  <li>ITP (8%): €20.000</li>
                  <li>Notaris/advocaat: €4.500</li>
                  <li className="font-semibold">Totaal: €274.500</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Via BV (nieuwbouw):</p>
                <ul className="space-y-0.5 text-xs">
                  <li>Koopprijs: €250.000</li>
                  <li>IVA (10%): €25.000</li>
                  <li>AJD (1,5%): €3.750</li>
                  <li>Notaris/advocaat: €4.500</li>
                  <li>BV oprichting: €1.500</li>
                  <li className="font-semibold">Totaal: €284.750</li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              → Bij nieuwbouw is BV €10.000 duurder. Bij bestaande bouw ongeveer gelijk.
            </p>
          </div>
        </div>
        <div className="bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/20 mt-3">
          <p className="text-sm">
            <span className="font-semibold text-foreground">💡 Advies:</span> Voor je eerste investering 
            en bij eigen gebruik is privé aankoop meestal het eenvoudigst en voordeligst. Overweeg een BV 
            bij meerdere woningen of een serieuze verhuurstrategie. Bespreek dit altijd met een fiscalist.
          </p>
        </div>
        <Link to="/contact" className="text-primary hover:underline inline-block mt-2">
          Plan een adviesgesprek over structurering →
        </Link>
      </AccordionContent>
    </AccordionItem>
  </Accordion>

    {/* Tab-Specific CTA */}
    <div className="mt-8 p-6 bg-muted/30 rounded-lg border border-border/50">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2 text-lg font-semibold text-foreground mb-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          <span>Staat jouw vraag er niet tussen?</span>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Bekijk onze uitgebreide kennisbank of stel je vraag rechtstreeks aan een van onze adviseurs.
        </p>
        <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
          <Button asChild variant="default" className="gap-2">
            <Link to="/blog">
              <BookOpen className="w-4 h-4" />
              Kennisbank
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/afspraak">
              <MessageCircle className="w-4 h-4" />
              Stel je vraag
            </Link>
          </Button>
        </div>
      </div>
    </div>
  </>
);

const RentalContent = () => (
  <>
    <Accordion type="single" collapsible className="w-full">
    <AccordionItem value="item-1">
      <AccordionTrigger>Wat voor rendement kan ik verwachten?</AccordionTrigger>
      <AccordionContent className="text-muted-foreground space-y-3">
        <p>
          Het rendement van een Spaanse vastgoedinvestering bestaat uit huurinkomsten (cash flow) en 
          waardestijging op langere termijn.
        </p>
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-foreground">Bruto huurrendement (Costa Cálida regio):</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Vakantiehuur: <span className="font-semibold">5-8%</span> per jaar</li>
              <li>Langetermijnverhuur: <span className="font-semibold">4-6%</span> per jaar</li>
              <li>Afhankelijk van: locatie, type woning, seizoen, beheer</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground">Waardestijging (historisch):</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Gemiddeld: <span className="font-semibold">3-5%</span> per jaar</li>
              <li>Populaire gebieden: soms 5-8% per jaar</li>
              <li>Afhankelijk van marktcyclus en locatie</li>
            </ul>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="font-semibold text-foreground mb-2">Rekenvoorbeeld €250.000 appartement:</p>
            <div className="space-y-1 text-sm">
              <p className="font-semibold">Inkomsten:</p>
              <ul className="pl-4 space-y-0.5">
                <li>Bruto huurinkomsten: €15.000/jaar (6%)</li>
                <li>Bezetting: 25-30 weken (gemiddeld €500-600/week)</li>
              </ul>
              <p className="font-semibold mt-2">Kosten:</p>
              <ul className="pl-4 space-y-0.5">
                <li>Gemeenschap: €900</li>
                <li>Belastingen (IBI, basura): €400</li>
                <li>Verzekeringen: €400</li>
                <li>Onderhoud: €800</li>
                <li>Beheer (20%): €3.000</li>
                <li>Nutsvoorzieningen: €600</li>
              </ul>
              <p className="font-semibold mt-2 text-foreground">Netto huurinkomsten: ~€8.900 (3,6% netto rendement)</p>
              <p className="text-xs text-muted-foreground mt-1">+ Waardestijging (~4%): €10.000</p>
              <p className="font-semibold text-primary mt-1">Totaal rendement: ~€18.900/jaar (7,6%)</p>
            </div>
          </div>
          <div>
            <p className="font-semibold text-foreground">Factoren die rendement beïnvloeden:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><span className="font-semibold">Locatie:</span> Strand, golf, stad = hogere vraag</li>
              <li><span className="font-semibold">Type woning:</span> Nieuwbouw vs bestaand, faciliteiten</li>
              <li><span className="font-semibold">Seizoen:</span> Hoogseizoen (juni-sep) verdient het meest</li>
              <li><span className="font-semibold">Eigen gebruik:</span> Meer eigen gebruik = minder huurinkomsten</li>
              <li><span className="font-semibold">Beheer:</span> Professioneel beheer optimaliseert bezetting</li>
              <li><span className="font-semibold">Voorzieningen:</span> Zwembad, airco, wifi, parking = hogere prijzen</li>
            </ul>
          </div>
        </div>
        <div className="bg-primary/10 p-3 rounded-lg">
          <p className="text-sm">
            <span className="font-semibold text-foreground">💡 Tip:</span> Rendement is het hoogst als je 
            de woning maximaal verhuurt (30-40 weken) en minimaal zelf gebruikt. Vind je balans tussen 
            genieten en verdienen.
          </p>
        </div>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="item-2">
      <AccordionTrigger>Mag ik toeristische verhuur doen?</AccordionTrigger>
      <AccordionContent className="text-muted-foreground space-y-3">
        <p>
          Ja, in de meeste regio's in Spanje mag je je woning toeristische verhuren. Wel heb je daarvoor 
          een <span className="font-semibold text-foreground">toeristenlicentie (VV-licentie)</span> nodig.
        </p>
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-foreground">Wat is een VV-licentie?</p>
            <p className="text-sm">VV staat voor <span className="italic">Vivienda Vacacional</span> 
            (vakantiewoning). Dit is een vergunning van de lokale overheid die aantoont dat je woning 
            voldoet aan de eisen voor toeristische verhuur.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Eisen voor een VV-licentie:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>De woning moet aan minimale kwaliteitseisen voldoen</li>
              <li>Badkamer, keuken, slaapkamers volgens voorschriften</li>
              <li>Verantwoordelijk persoon aanwijzen (jij of beheerder)</li>
              <li>Klachtenregeling beschikbaar</li>
              <li>Identificatie van gasten verplicht</li>
              <li>Voldoen aan veiligheidsvoorschriften</li>
            </ul>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="font-semibold text-foreground mb-2">Verschillen per regio:</p>
            <div className="space-y-2 text-sm">
              <div>
                <p className="font-semibold">🟢 Murcia (Costa Cálida):</p>
                <p className="text-xs">Relatief soepel. VV-licentie is goed te verkrijgen, weinig beperkingen.</p>
              </div>
              <div>
                <p className="font-semibold">🟢 Valencia:</p>
                <p className="text-xs">Ook goed mogelijk, wel strikter op regels. Geen licentie voor appartementen in sommige gebieden.</p>
              </div>
              <div>
                <p className="font-semibold">🟡 Andalucía:</p>
                <p className="text-xs">Varieert per gemeente. Sommige gebieden hebben beperkingen.</p>
              </div>
              <div>
                <p className="font-semibold">🔴 Barcelona & Mallorca:</p>
                <p className="text-xs">Zeer streng. Veel beperkingen en hoge boetes bij illegale verhuur.</p>
              </div>
            </div>
          </div>
          <div>
            <p className="font-semibold text-foreground">Kosten VV-licentie:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Aanvraagkosten: €150-500 (afhankelijk van gemeente)</li>
              <li>Technisch rapport: €200-400</li>
              <li>Totale doorlooptijd: 2-6 maanden</li>
              <li>Licentie geldt voor onbepaalde tijd (tenzij regels wijzigen)</li>
            </ul>
          </div>
        </div>
        <div className="bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/20">
          <p className="text-sm">
            <span className="font-semibold text-foreground">⚠️ Belangrijk:</span> Verhuren zonder licentie 
            kan leiden tot hoge boetes (€3.000-€30.000). Zorg dat je licentie op orde is voordat je start 
            met verhuren via Airbnb, Booking.com, etc.
          </p>
        </div>
        <div className="bg-primary/10 p-3 rounded-lg mt-3">
          <p className="text-sm">
            <span className="font-semibold text-foreground">✅ Onze service:</span> Wij helpen je bij het 
            aanvragen van de VV-licentie, inclusief technisch rapport en alle benodigde documenten. 
            Dit regelen we voor je als onderdeel van onze service.
          </p>
        </div>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="item-3">
      <AccordionTrigger>Hoe regel ik beheer als ik in Nederland woon?</AccordionTrigger>
      <AccordionContent className="text-muted-foreground space-y-3">
        <p>
          Als je in Nederland woont en een woning in Spanje verhuurt, is professioneel beheer bijna 
          onmisbaar. Gelukkig zijn er uitstekende beheerpartners beschikbaar.
        </p>
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-foreground">Wat doet een beheerbedrijf?</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><span className="font-semibold">Gastencontact:</span> Beantwoorden vragen, check-in/out regelen</li>
              <li><span className="font-semibold">Schoonmaak:</span> Na elk verblijf professionele schoonmaak</li>
              <li><span className="font-semibold">Sleutelbeheer:</span> Veilige overdracht aan gasten</li>
              <li><span className="font-semibold">Onderhoud:</span> Kleine reparaties en storingen verhelpen</li>
              <li><span className="font-semibold">Inspectie:</span> Controleren van de woning voor/na gasten</li>
              <li><span className="font-semibold">Linnen & handdoeken:</span> Wassen en vervangen</li>
              <li><span className="font-semibold">Voorraad bijvullen:</span> Toiletpapier, zeep, etc.</li>
              <li><span className="font-semibold">Rapportage:</span> Maandelijks overzicht van inkomsten/kosten</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground">Kosten van beheer:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><span className="font-semibold">Basis beheer:</span> 15-25% van bruto huurinkomsten</li>
              <li><span className="font-semibold">All-inclusive:</span> 25-35% (inclusief marketing, foto's, prijsoptimalisatie)</li>
              <li><span className="font-semibold">Schoonmaak per verblijf:</span> €50-80 (aparte post aan gast)</li>
              <li><span className="font-semibold">Check-in service:</span> Vaak inclusief of €25-50 per check-in</li>
            </ul>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="font-semibold text-foreground mb-2">Rekenvoorbeeld:</p>
            <div className="space-y-1 text-sm">
              <p>Bruto huurinkomsten per jaar: €15.000</p>
              <p>Beheerkosten (20%): €3.000</p>
              <p>Schoonmaak (25 boekingen x €60): €1.500</p>
              <p className="font-semibold text-foreground">Totale beheerkosten: €4.500 (30% van omzet)</p>
              <p className="text-xs text-muted-foreground mt-1">
                → Dit is aftrekbaar van je belastbare huurinkomsten
              </p>
            </div>
          </div>
          <div>
            <p className="font-semibold text-foreground">Optie: Zelf beheren vanaf Nederland</p>
            <p className="text-sm">Het is technisch mogelijk om zelf te beheren via platforms als Airbnb en 
            Booking.com, maar dit vraagt:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm mt-1">
              <li>24/7 bereikbaarheid voor gasten (tijdsverschil!)</li>
              <li>Lokale contactpersoon voor sleutels en noodgevallen</li>
              <li>Schoonmaakservice regelen na elk verblijf</li>
              <li>Onderhoud op afstand coördineren (taalbarrière)</li>
              <li>Veel tijd en aandacht (niet echt vakantiegevoel)</li>
            </ul>
            <p className="text-sm mt-2 italic">
              Meeste eigenaren kiezen uiteindelijk voor professioneel beheer vanwege gemak en hogere bezetting.
            </p>
          </div>
        </div>
        <div className="bg-primary/10 p-3 rounded-lg">
          <p className="text-sm">
            <span className="font-semibold text-foreground">✅ Viva netwerk:</span> Wij werken samen met 
            betrouwbare lokale beheerders in Costa Cálida en Valencia die Nederlands-Spaanse eigenaren 
            specialiseren. We koppelen je aan de juiste partner.
          </p>
        </div>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="item-4">
      <AccordionTrigger>Kan ik de woning ook zelf gebruiken?</AccordionTrigger>
      <AccordionContent className="text-muted-foreground space-y-3">
        <p>
          Absoluut! De meeste investeerders gebruiken hun Spaanse woning zowel voor eigengebruik als 
          verhuur. Dit is een van de grootste voordelen van vastgoedinvesteren in Spanje.
        </p>
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-foreground">Balans tussen genieten en verdienen:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><span className="font-semibold">Gemiddelde:</span> 6-10 weken eigengebruik per jaar</li>
              <li><span className="font-semibold">Rest verhuren:</span> 20-30 weken per jaar</li>
              <li><span className="font-semibold">Lege periodes:</span> 10-20 weken (onderhoud, laagseizoen)</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground">Voordelen van eigengebruik + verhuur:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Je hebt je eigen vakantiehuis zonder volledige kosten te dragen</li>
              <li>Huurinkomsten dekken een groot deel van de vaste lasten</li>
              <li>Je kunt spontaan naar Spanje (lage-seizoen, tussendoor)</li>
              <li>Familie en vrienden kunnen er ook verblijven</li>
              <li>Je blijft betrokken bij de woning (controle, onderhoud)</li>
            </ul>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="font-semibold text-foreground mb-2">Praktische tips:</p>
            <ul className="space-y-1 text-sm">
              <li><span className="font-semibold">Block je eigen periodes tijdig:</span> Zeker in hoogseizoen</li>
              <li><span className="font-semibold">Kies laagseizoen voor eigen gebruik:</span> April-mei, oktober-november = goedkoper + minder verlies</li>
              <li><span className="font-semibold">Communiceer met beheerder:</span> Geef ruim van tevoren door wanneer jij komt</li>
              <li><span className="font-semibold">Persoonlijke spullen apart bewaren:</span> Kluis of afgesloten kast voor privézaken</li>
              <li><span className="font-semibold">Minimale verblijfduur hanteren:</span> Bijv. 7 dagen = minder check-ins, lagere kosten</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground">Impact op rendement:</p>
            <p className="text-sm">Hoe meer je de woning zelf gebruikt, hoe lager je huurinkomsten. 
            Maar daar staat tegenover dat je geniet van je eigen plek.</p>
            <div className="bg-muted p-3 rounded-lg mt-2">
              <div className="space-y-1 text-sm">
                <p><span className="font-semibold">Scenario 1:</span> 40 weken verhuur → €20.000 huuromzet</p>
                <p><span className="font-semibold">Scenario 2:</span> 10 weken eigen + 25 weken verhuur → €12.500 huuromzet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  → Je "mist" €7.500 huur, maar bespaart €3.000-5.000 aan vakantiekosten elders
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-green-500/10 p-3 rounded-lg border border-green-500/20">
          <p className="text-sm">
            <span className="font-semibold text-foreground">💚 Beste van twee werelden:</span> Je investeert 
            in een woning die je geld oplevert én waar je zelf van kunt genieten wanneer je wilt. 
            De ultieme combinatie van investeren en levenskwaliteit.
          </p>
        </div>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="item-5">
      <AccordionTrigger>Welke kosten komen kijken bij verhuur?</AccordionTrigger>
      <AccordionContent className="text-muted-foreground space-y-3">
        <p>
          Naast de huurinkomsten heb je ook kosten. Het is belangrijk om hier realistisch over te zijn, 
          zodat je een goede inschatting maakt van je netto rendement.
        </p>
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-foreground">Vaste kosten (jaarlijks):</p>
            <ul className="space-y-1 text-sm">
              <li><span className="font-semibold">Gemeenschapskosten:</span> €40-120/maand (€480-1.440/jaar)</li>
              <li><span className="font-semibold">IBI (onroerendgoedbelasting):</span> €200-600/jaar</li>
              <li><span className="font-semibold">Afvalbelasting:</span> €50-150/jaar</li>
              <li><span className="font-semibold">Verzekeringen:</span> €200-400/jaar (opstal + aansprakelijkheid)</li>
              <li><span className="font-semibold">Accountant/belastingaangifte:</span> €300-600/jaar</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground">Variabele kosten:</p>
            <ul className="space-y-1 text-sm">
              <li><span className="font-semibold">Elektriciteit & water:</span> €40-100/maand (€500-1.200/jaar)</li>
              <li><span className="font-semibold">Internet & TV:</span> €30-50/maand (€360-600/jaar)</li>
              <li><span className="font-semibold">Onderhoud & reparaties:</span> €500-1.500/jaar</li>
              <li><span className="font-semibold">Vervanging inventaris:</span> €200-500/jaar (beddengoed, keukenspullen)</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground">Verhuurspecifieke kosten:</p>
            <ul className="space-y-1 text-sm">
              <li><span className="font-semibold">Beheerkosten:</span> 15-25% van bruto huuromzet</li>
              <li><span className="font-semibold">Schoonmaak:</span> €50-80 per verblijf (vaak aan gast doorberekend)</li>
              <li><span className="font-semibold">Toeristenbelasting:</span> €0,50-2/nacht per gast (gast betaalt, maar jij int)</li>
              <li><span className="font-semibold">Marketing/foto's:</span> €300-800 eenmalig of in beheerpakket</li>
              <li><span className="font-semibold">Platform commissies:</span> 3-5% (Airbnb, Booking.com) - vaak al in beheer</li>
            </ul>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="font-semibold text-foreground mb-2">Volledig kostenvoorbeeld (€250k appartement):</p>
            <div className="space-y-0.5 text-sm">
              <p className="font-semibold">Vaste kosten per jaar:</p>
              <ul className="pl-4 space-y-0.5 text-xs">
                <li>Gemeenschap: €900</li>
                <li>IBI + basura: €400</li>
                <li>Verzekeringen: €350</li>
                <li>Accountant: €400</li>
                <li className="font-semibold">Subtotaal vast: €2.050</li>
              </ul>
              <p className="font-semibold mt-2">Variabele kosten per jaar:</p>
              <ul className="pl-4 space-y-0.5 text-xs">
                <li>Nutsvoorzieningen: €800</li>
                <li>Internet: €400</li>
                <li>Onderhoud: €800</li>
                <li>Inventaris: €300</li>
                <li className="font-semibold">Subtotaal variabel: €2.300</li>
              </ul>
              <p className="font-semibold mt-2">Verhuurkosten (bij €15k omzet):</p>
              <ul className="pl-4 space-y-0.5 text-xs">
                <li>Beheer (20%): €3.000</li>
                <li>Schoonmaak netto: €500 (rest via gast)</li>
                <li className="font-semibold">Subtotaal verhuur: €3.500</li>
              </ul>
              <p className="font-semibold text-foreground mt-3">TOTALE KOSTEN: €7.850/jaar</p>
              <p className="text-xs text-muted-foreground mt-1">
                + Hypotheekrente (indien gefinancierd): €4.000-6.000/jaar
              </p>
            </div>
          </div>
          <div>
            <p className="font-semibold text-foreground">Deze kosten zijn fiscaal aftrekbaar:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>✅ Alle bovenstaande kosten</li>
              <li>✅ Gedeeltelijke hypotheekrente</li>
              <li>✅ Afschrijving (3% per jaar over 33 jaar)</li>
              <li>✅ Beheer en schoonmaak</li>
              <li>❌ Niet aftrekbaar: kosten tijdens eigen gebruik</li>
            </ul>
          </div>
        </div>
        <div className="bg-primary/10 p-3 rounded-lg">
          <p className="text-sm">
            <span className="font-semibold text-foreground">💡 Realistisch:</span> Reken op 50-60% van je 
            bruto huurinkomsten als kosten (inclusief beheer, onderhoud, belastingen). Netto blijft dan 
            40-50% over als cashflow.
          </p>
        </div>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="item-6">
      <AccordionTrigger>Hoe optimaliseer ik mijn verhuurrendement?</AccordionTrigger>
      <AccordionContent className="text-muted-foreground space-y-3">
        <p>
          Met de juiste strategie kun je je verhuurrendement flink verhogen. Hier zijn de belangrijkste 
          tips om meer uit je investering te halen:
        </p>
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-foreground">1. Professionele presentatie</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><span className="font-semibold">Foto's:</span> Investeer in professionele fotografie (€200-500). Dit verhoogt boekingen met 20-40%</li>
              <li><span className="font-semibold">Beschrijving:</span> Uitgebreid maar helder, highlight USP's (zwembad, strand, golf)</li>
              <li><span className="font-semibold">Vertaling:</span> Aanbieden in meerdere talen (Engels, Nederlands, Duits)</li>
              <li><span className="font-semibold">360° tour:</span> Overweeg een virtuele tour voor extra vertrouwen</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground">2. Dynamische prijsstrategie</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><span className="font-semibold">Hoogseizoen (juli-aug):</span> Vraag topprijzen (€800-1.200/week)</li>
              <li><span className="font-semibold">Tussenseizoen (apr-jun, sep-okt):</span> Aantrekkelijke prijzen (€500-700/week)</li>
              <li><span className="font-semibold">Laagseizoen (nov-mrt):</span> Scherpe prijzen voor langere verblijven (€300-500/week)</li>
              <li><span className="font-semibold">Last-minute deals:</span> Bied kortingen aan 2-4 weken voor aankomst</li>
              <li><span className="font-semibold">Vroegboekkorting:</span> 10-15% korting bij boeking 3-6 maanden vooruit</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground">3. Aanwezig op meerdere platforms</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><span className="font-semibold">Airbnb:</span> Grootste bereik, vooral voor jonge reizigers</li>
              <li><span className="font-semibold">Booking.com:</span> Sterke in Europa, gezinnen en zakelijke reizigers</li>
              <li><span className="font-semibold">VRBO/HomeAway:</span> Populair bij Amerikaanse gasten</li>
              <li><span className="font-semibold">Nederlandse sites:</span> Vakantiehuisjes.nl, Ardoer, Roompot (voor Nederlandse doelgroep)</li>
              <li><span className="font-semibold">Direct boeken:</span> Eigen website of via beheerder (geen commissie)</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground">4. Investeer in kleine upgrades</p>
            <p className="text-sm">Deze investeringen betalen zich snel terug:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><span className="font-semibold">Airco:</span> €800-1.500 → verhoogt prijzen met €100-150/week in zomer</li>
              <li><span className="font-semibold">Hoogwaardig wifi:</span> €40/maand → absolute must voor digitale nomaden</li>
              <li><span className="font-semibold">Outdoor upgrades:</span> BBQ, loungeset, parasol → €500-1.000 → verhoogt aantrekkelijkheid</li>
              <li><span className="font-semibold">Smart TV + streaming:</span> €300 → moderne gasten verwachten dit</li>
              <li><span className="font-semibold">Kwaliteit beddengoed:</span> €500 → betere reviews = meer boekingen</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground">5. Focus op reviews</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Goede reviews = hoger in zoekresultaten = meer boekingen</li>
              <li>Streef naar 4,8+ gemiddelde score</li>
              <li>Reageer altijd op reviews (positief én negatief)</li>
              <li>Vraag gasten actief om een review achter te laten</li>
              <li>Los problemen meteen op tijdens verblijf (voorkom slechte reviews)</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground">6. Langetermijnverhuur in laagseizoen</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>November-maart: weinig toeristen</li>
              <li>Verhuur aan digital nomads, senioren, of snowbirds voor 1-3 maanden</li>
              <li>Vaste inkomsten zonder veel wisselingen</li>
              <li>Lagere prijs per week, maar geen lege periodes</li>
            </ul>
          </div>
        </div>
        <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/20">
          <p className="text-sm">
            <span className="font-semibold text-foreground">🎯 Impact:</span> Met deze optimalisaties kun je 
            je bezettingsgraad verhogen van 60% naar 80% en je gemiddelde weekprijs met 15-25%. 
            Dat kan €3.000-5.000 extra per jaar opleveren.
          </p>
        </div>
        <Link to="/contact" className="text-primary hover:underline inline-block mt-2">
          Vraag advies aan over verhuuroptimalisatie →
        </Link>
      </AccordionContent>
    </AccordionItem>
  </Accordion>

    {/* Tab-Specific CTA */}
    <div className="mt-8 p-6 bg-muted/30 rounded-lg border border-border/50">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2 text-lg font-semibold text-foreground mb-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          <span>Staat jouw vraag er niet tussen?</span>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Bekijk onze uitgebreide kennisbank of stel je vraag rechtstreeks aan een van onze adviseurs.
        </p>
        <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
          <Button asChild variant="default" className="gap-2">
            <Link to="/blog">
              <BookOpen className="w-4 h-4" />
              Kennisbank
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/afspraak">
              <MessageCircle className="w-4 h-4" />
              Stel je vraag
            </Link>
          </Button>
        </div>
      </div>
    </div>
  </>
);
