import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PublicBox3Calculator } from "@/components/PublicBox3Calculator";
import { CTASection } from "@/components/CTASection";
import { Card, CardContent } from "@/components/ui/card";
import { Calculator, Building2, PiggyBank, TrendingDown, Clock } from "lucide-react";
import { Helmet } from "react-helmet-async";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import larsProfile from "@/assets/lars-profile.webp";

export default function Box3Rekentools() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Box 3 Calculator 2025 | Vermogensbelasting met Spaans Vastgoed | Top Immo Spain</title>
        <meta 
          name="description" 
          content="Bereken je Nederlandse Box 3 vermogensbelasting met Spaans vastgoed. Stap-voor-stap uitleg + interactieve calculator. Ontdek hoeveel je kunt besparen."
        />
        <meta 
          name="keywords" 
          content="box 3 calculator, vermogensbelasting 2025, spaans vastgoed belasting, forfaitair rendement, belastingbesparing spanje"
        />
        <link rel="canonical" href="https://topimmospain.com/rekentools/box3" />
      </Helmet>
      
      <Navbar />
      
      <main className="pt-24 pb-16">
        {/* Hero Section */}
        <section className="container mx-auto px-4 mb-12">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Calculator className="h-4 w-4" />
              Rekentools voor Investeerders
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Box 3 Vermogensbelasting Calculator 2025
            </h1>
            <p className="text-xl text-muted-foreground mb-4 max-w-3xl mx-auto">
              Ik leg je stap voor stap uit hoe Box 3 werkt, met een handige calculator om je eigen situatie te berekenen
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>8 min leestijd</span>
            </div>
          </div>
        </section>

        {/* Personal Introduction with Lars */}
        <section className="container mx-auto px-4 mb-12">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <Avatar className="h-24 w-24 md:h-28 md:w-28 shrink-0 border-4 border-background shadow-lg">
                    <AvatarImage src={larsProfile} alt="Lars van Top Immo Spain" />
                    <AvatarFallback className="text-2xl">L</AvatarFallback>
                  </Avatar>
                  <div className="text-center md:text-left">
                    <p className="text-lg md:text-xl text-foreground mb-3 italic">
                      "Box 3 berekeningen kunnen ingewikkeld lijken, maar ik leg je graag stap voor stap 
                      uit hoe het werkt – en hoe Spaans vastgoed fiscaal interessant kan zijn voor je situatie."
                    </p>
                    <p className="font-medium text-primary">
                      — Lars, Top Immo Spain
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Quick Intro */}
        <section className="container mx-auto px-4 mb-12">
          <div className="max-w-4xl mx-auto">
            <Card className="mb-8">
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold mb-4">Wat is Box 3 Vermogensbelasting?</h2>
                <p className="text-muted-foreground mb-4">
                  In Nederland betaal je belasting over je vermogen via het Box 3-systeem. De Belastingdienst 
                  gebruikt een <strong>forfaitair rendement</strong> – een fictief rendement dat je geacht 
                  wordt te behalen, ongeacht wat je werkelijk verdient. Dit maakt de berekening een stuk 
                  overzichtelijker en levert een gestandaardiseerd belastingbedrag op.
                </p>
                <p className="text-muted-foreground mb-6">
                  Voor 2025 gelden de volgende forfaitaire rendementen:
                </p>
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <PiggyBank className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="font-semibold">Spaargeld</p>
                    <p className="text-2xl font-bold text-primary">1,44%</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <TrendingDown className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="font-semibold">Beleggingen</p>
                    <p className="text-2xl font-bold text-primary">5,88%</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <Building2 className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="font-semibold">Schulden</p>
                    <p className="text-2xl font-bold text-primary">2,62%</p>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  Over dit berekende fictieve inkomen betaal je <strong>36% belasting</strong>. De vrijstelling 
                  voor 2025 is €57.684 per persoon (€115.368 met fiscaal partner).
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Calculator Section - Prominent */}
        <section className="container mx-auto px-4 mb-12">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-semibold mb-4">Benieuwd naar jouw situatie?</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Vul je eigen cijfers in en ontdek hoeveel belasting je betaalt in Box 3 – en hoeveel 
                je zou kunnen besparen als je investeert in Spaans vastgoed. Probeer het hieronder.
              </p>
            </div>
            
            <PublicBox3Calculator />
          </div>
        </section>

        {/* Spanish Real Estate Section */}
        <section className="container mx-auto px-4 mb-12">
          <div className="max-w-4xl mx-auto">
            <Card className="mb-8">
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold mb-4">Hoe wordt Spaans vastgoed belast in Box 3?</h2>
                <p className="text-muted-foreground mb-4">
                  Als je in Nederland woont en vastgoed in Spanje bezit, moet je dit opgeven 
                  in je Nederlandse Box 3-aangifte. Je vastgoed wordt behandeld als belegging, 
                  dus er wordt een forfaitair rendement van <strong>5,88%</strong> op toegepast.
                </p>
                <p className="text-muted-foreground mb-4">
                  Nu komt het interessante: door het belastingverdrag tussen Nederland en Spanje 
                  kan dit fiscaal voordelig uitpakken:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
                  <li>Je betaalt in Spanje al lokale belastingen over je vastgoed</li>
                  <li>Nederland houdt hier rekening mee via het belastingverdrag</li>
                  <li>Het netto effect? Vaak een lagere totale belastingdruk</li>
                </ul>
                <p className="text-muted-foreground">
                  Daarnaast kan een <strong>Spaanse hypotheek</strong> op je vastgoed je Box 3-grondslag verlagen, 
                  omdat schulden aftrekbaar zijn (boven de drempel van €3.800 per persoon).
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Step-by-Step Explanation - Accordion */}
        <section className="container mx-auto px-4 mb-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-semibold mb-4">Hoe werkt de Box 3 berekening precies?</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                De Box 3-berekening bestaat uit meerdere stappen. Ik neem je er stap voor stap doorheen, 
                zodat je precies begrijpt hoe het werkt.
              </p>
            </div>

            {/* Callout: Verschil NL schulden vs ES hypotheek */}
            <Card className="mb-8 border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <span className="text-amber-600">⚠️</span>
                  Belangrijk: NL Schulden vs. Spaanse Hypotheek
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Voor de Box 3 berekening worden <strong>Nederlandse schulden</strong> en een <strong>Spaanse hypotheek</strong> 
                  apart behandeld. Dit is cruciaal voor de berekening van de Spaanse vrijstelling:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>NL schulden:</strong> Verlagen alleen je totale forfaitair rendement</li>
                  <li>• <strong>ES hypotheek:</strong> Verlaagt ook je Spaanse vrijstelling (rendement vastgoed minus rendement hypotheek)</li>
                </ul>
              </CardContent>
            </Card>

            {/* Voorbeeldcijfers Card */}
            <Card className="mb-8 border-primary/30 bg-primary/5">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-3">📊 Voorbeeldcijfers voor deze uitleg</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  We gebruiken dezelfde voorbeeldcijfers als de calculator hierboven:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div className="p-3 bg-background rounded-lg">
                    <p className="text-muted-foreground">Spaargeld</p>
                    <p className="font-semibold text-primary">€300.000</p>
                  </div>
                  <div className="p-3 bg-background rounded-lg">
                    <p className="text-muted-foreground">Beleggingen NL</p>
                    <p className="font-semibold text-primary">€300.000</p>
                  </div>
                  <div className="p-3 bg-background rounded-lg">
                    <p className="text-muted-foreground">ES Vastgoed</p>
                    <p className="font-semibold text-primary">€300.000</p>
                  </div>
                  <div className="p-3 bg-background rounded-lg">
                    <p className="text-muted-foreground">NL Schulden</p>
                    <p className="font-semibold text-destructive">€200.000</p>
                  </div>
                  <div className="p-3 bg-background rounded-lg">
                    <p className="text-muted-foreground">ES Hypotheek</p>
                    <p className="font-semibold text-destructive">€0</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Accordion type="single" collapsible className="space-y-4">
              {/* Stap 1 */}
              <AccordionItem value="step-1" className="border rounded-lg px-6 bg-card">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-4 text-left">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm shrink-0">
                      1
                    </span>
                    <span className="font-semibold">Berekening van het Netto Vermogen</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <div className="pl-12 space-y-4">
                    <p className="text-muted-foreground">
                      We beginnen met het berekenen van je totale netto vermogen: bezittingen minus 
                      aftrekbare schulden (schulden boven de drempel van €3.800).
                    </p>
                    
                    <Card className="bg-muted/30 border-muted">
                      <CardContent className="p-4">
                        <p className="font-medium mb-2">Voorbeeld - Bezittingen:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>Spaargeld: €300.000</li>
                          <li>Beleggingen NL: €300.000</li>
                          <li>ES Vastgoed: €300.000</li>
                          <li className="text-foreground font-medium pt-2 border-t border-muted mt-2">Totaal bezittingen: €900.000</li>
                        </ul>
                        
                        <p className="font-medium mb-2 mt-4">Schulden (apart berekend):</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>NL Schulden: €200.000</li>
                          <li>ES Hypotheek: €0</li>
                          <li className="font-medium">Totaal schulden: €200.000</li>
                          <li className="text-muted-foreground">Schuldendrempel: −€3.800</li>
                          <li className="text-foreground font-medium">Aftrekbare schulden: €196.200</li>
                        </ul>
                        
                        <p className="mt-4 pt-3 border-t border-muted font-medium">
                          Netto vermogen: €900.000 − €196.200 = <span className="text-primary">€703.800</span>
                        </p>
                      </CardContent>
                    </Card>

                    <div className="bg-primary/5 border-l-4 border-primary p-4 rounded-r-lg">
                      <p className="font-medium text-sm mb-1">💡 Goed om te weten</p>
                      <p className="text-sm text-muted-foreground">
                        Je betaalt alleen belasting over je netto vermogen. Let op: NL schulden 
                        en ES hypotheek worden bij elkaar opgeteld, maar de ES hypotheek speelt later nog 
                        een rol bij de Spaanse vrijstelling.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Stap 2 */}
              <AccordionItem value="step-2" className="border rounded-lg px-6 bg-card">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-4 text-left">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm shrink-0">
                      2
                    </span>
                    <span className="font-semibold">Heffingsvrij Vermogen & Belastbare Grondslag</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <div className="pl-12 space-y-4">
                    <p className="text-muted-foreground">
                      Van het netto vermogen wordt het heffingsvrij vermogen afgetrokken. 
                      Voor 2025 is dit €57.684 per persoon (€115.368 met fiscaal partner).
                    </p>
                    
                    <Card className="bg-muted/30 border-muted">
                      <CardContent className="p-4">
                        <p className="font-medium mb-2">Voorbeeld:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>Netto vermogen: €703.800</li>
                          <li>Heffingsvrij vermogen: −€57.684</li>
                        </ul>
                        <p className="mt-3 font-medium">
                          Belastbare grondslag: €703.800 − €57.684 = <span className="text-primary">€646.116</span>
                        </p>
                      </CardContent>
                    </Card>

                    <div className="bg-primary/5 border-l-4 border-primary p-4 rounded-r-lg">
                      <p className="font-medium text-sm mb-1">💡 Goed om te weten</p>
                      <p className="text-sm text-muted-foreground">
                        Het heffingsvrij vermogen beschermt kleinere vermogens tegen belastingheffing.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Stap 3 */}
              <AccordionItem value="step-3" className="border rounded-lg px-6 bg-card">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-4 text-left">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm shrink-0">
                      3
                    </span>
                    <span className="font-semibold">Forfaitair Rendement per Categorie</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <div className="pl-12 space-y-4">
                    <p className="text-muted-foreground">
                      De Belastingdienst past een vast forfaitair rendement toe op elke vermogenscategorie. 
                      Het rendement wordt berekend over de <strong>werkelijke waarden</strong> van de bezittingen, 
                      niet over de belastbare grondslag.
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="p-3 bg-muted/50 rounded text-center">
                        <p className="font-medium">Spaargeld</p>
                        <p className="text-primary font-bold">1,44%</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded text-center">
                        <p className="font-medium">Beleggingen</p>
                        <p className="text-primary font-bold">5,88%</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded text-center">
                        <p className="font-medium">Schulden</p>
                        <p className="text-primary font-bold">2,62%</p>
                      </div>
                    </div>
                    
                    <Card className="bg-muted/30 border-muted">
                      <CardContent className="p-4">
                        <p className="font-medium mb-2">Voorbeeldberekening rendement:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>Spaargeld: €300.000 × 1,44% = <span className="text-foreground">€4.320</span></li>
                          <li>Beleggingen NL: €300.000 × 5,88% = <span className="text-foreground">€17.640</span></li>
                          <li>ES Vastgoed: €300.000 × 5,88% = <span className="text-foreground">€17.640</span></li>
                          <li className="text-destructive">Schulden totaal: €196.200 × 2,62% = −€5.140</li>
                        </ul>
                        <p className="mt-3 font-medium">
                          Totaal forfaitair rendement: €4.320 + €17.640 + €17.640 − €5.140 = <span className="text-primary">€34.460</span>
                        </p>
                      </CardContent>
                    </Card>

                    <div className="bg-primary/5 border-l-4 border-primary p-4 rounded-r-lg">
                      <p className="font-medium text-sm mb-1">💡 Goed om te weten</p>
                      <p className="text-sm text-muted-foreground">
                        Het forfaitaire rendement maakt de berekening een stuk eenvoudiger. Je hoeft niet te bewijzen 
                        hoeveel rendement je daadwerkelijk hebt behaald.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Stap 4 */}
              <AccordionItem value="step-4" className="border rounded-lg px-6 bg-card">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-4 text-left">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm shrink-0">
                      4
                    </span>
                    <span className="font-semibold">Effectief Rendement & Box 3 Inkomen</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <div className="pl-12 space-y-4">
                    <p className="text-muted-foreground">
                      Het effectief rendement is de verhouding tussen het forfaitair rendement en het 
                      netto vermogen. Dit percentage wordt vervolgens toegepast op de belastbare grondslag.
                    </p>
                    
                    <Card className="bg-muted/30 border-muted">
                      <CardContent className="p-4">
                        <p className="font-medium mb-2">Berekening effectief rendement:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>Forfaitair rendement: €34.460</li>
                          <li>Netto vermogen: €703.800</li>
                        </ul>
                        <p className="mt-2 font-medium">
                          Effectief rendement: €34.460 ÷ €703.800 = <span className="text-primary">4,90%</span>
                        </p>
                        
                        <p className="font-medium mb-2 mt-4">Box 3 inkomen (bruto):</p>
                        <p className="text-sm text-muted-foreground">
                          Belastbare grondslag × effectief rendement
                        </p>
                        <p className="mt-2 font-medium">
                          €646.116 × 4,90% = <span className="text-primary">€31.660</span>
                        </p>
                      </CardContent>
                    </Card>

                    <div className="bg-primary/5 border-l-4 border-primary p-4 rounded-r-lg">
                      <p className="font-medium text-sm mb-1">💡 Goed om te weten</p>
                      <p className="text-sm text-muted-foreground">
                        Door het effectief rendement te gebruiken wordt er rekening gehouden met de 
                        samenstelling van je vermogen, niet alleen de totale waarde.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Stap 5 */}
              <AccordionItem value="step-5" className="border rounded-lg px-6 bg-card">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-4 text-left">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm shrink-0">
                      5
                    </span>
                    <span className="font-semibold">Spaanse Vrijstelling (Belastingverdrag)</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <div className="pl-12 space-y-4">
                    <p className="text-muted-foreground">
                      Door het belastingverdrag Nederland-Spanje wordt het rendement op Spaans vastgoed 
                      vrijgesteld in Nederland. <strong>Cruciaal:</strong> alleen de Spaanse hypotheek 
                      wordt afgetrokken van deze vrijstelling, niet de Nederlandse schulden.
                    </p>
                    
                    <Card className="bg-muted/30 border-muted">
                      <CardContent className="p-4">
                        <p className="font-medium mb-2">Berekening Spaanse vrijstelling:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>Rendement ES vastgoed: €300.000 × 5,88% = <span className="text-foreground">€17.640</span></li>
                          <li>Rendement ES hypotheek: €0 × 2,62% = <span className="text-foreground">€0</span></li>
                        </ul>
                        <p className="mt-3 font-medium">
                          Spaanse vrijstelling: €17.640 − €0 = <span className="text-primary">€17.640</span>
                        </p>
                      </CardContent>
                    </Card>

                    <div className="bg-amber-500/10 border-l-4 border-amber-500 p-4 rounded-r-lg">
                      <p className="font-medium text-sm mb-1">💡 Let op bij Spaanse hypotheek</p>
                      <p className="text-sm text-muted-foreground">
                        Als je een Spaanse hypotheek van bijv. €100.000 hebt, wordt het rendement daarvan 
                        (€100.000 × 2,62% = €2.620) afgetrokken van de vrijstelling. Je vrijstelling wordt 
                        dan €17.640 − €2.620 = €15.020. Dit resulteert in hogere Nederlandse belasting.
                      </p>
                    </div>

                    <div className="bg-primary/5 border-l-4 border-primary p-4 rounded-r-lg">
                      <p className="font-medium text-sm mb-1">💡 Goed om te weten</p>
                      <p className="text-sm text-muted-foreground">
                        Het belastingverdrag voorkomt dat je dubbel belasting betaalt. Omdat je in Spanje al lokale 
                        belastingen betaalt over je vastgoed, stelt Nederland dit rendement vrij.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Stap 6 */}
              <AccordionItem value="step-6" className="border rounded-lg px-6 bg-card">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-4 text-left">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm shrink-0">
                      6
                    </span>
                    <span className="font-semibold">Eindberekening Box 3 Belasting</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <div className="pl-12 space-y-4">
                    <p className="text-muted-foreground">
                      Het Box 3 inkomen na vrijstelling wordt belast tegen 36%. Dit is de uiteindelijke 
                      belasting die je betaalt in Nederland.
                    </p>
                    
                    <Card className="bg-muted/30 border-muted">
                      <CardContent className="p-4">
                        <p className="font-medium mb-2">Eindberekening:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>Box 3 inkomen bruto: €31.660</li>
                          <li>Spaanse vrijstelling: −€17.640</li>
                          <li className="text-foreground font-medium pt-2 border-t border-muted mt-2">Box 3 inkomen netto: €14.020</li>
                        </ul>
                        <p className="mt-4 font-medium">
                          Belasting: €14.020 × 36% = <span className="text-primary text-lg">€5.047</span>
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-green-500/10 border-green-500/30">
                      <CardContent className="p-4">
                        <p className="font-medium mb-2 text-green-700 dark:text-green-400">Vergelijking: Zonder Spaans vastgoed</p>
                        <p className="text-sm text-muted-foreground mb-2">
                          Als dezelfde €300.000 in NL beleggingen zou zitten (€600.000 totaal):
                        </p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>Geen Spaanse vrijstelling van €17.640</li>
                          <li>Box 3 inkomen netto: €31.660 (volledig belast)</li>
                          <li>Belasting: €31.660 × 36% = <span className="font-medium">€11.398</span></li>
                        </ul>
                        <p className="mt-3 font-medium text-green-700 dark:text-green-400">
                          Besparing door Spaans vastgoed: €11.398 − €5.047 = €6.351 per jaar
                        </p>
                      </CardContent>
                    </Card>

                    <div className="bg-primary/5 border-l-4 border-primary p-4 rounded-r-lg">
                      <p className="font-medium text-sm mb-1">💡 Goed om te weten</p>
                      <p className="text-sm text-muted-foreground">
                        Dit is het eindresultaat. Door de Spaanse vrijstelling betaal je aanzienlijk minder 
                        belasting dan wanneer al je vermogen in Nederland zou staan.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* Personal CTA Section */}
        <CTASection />
      </main>
      
      <Footer />
    </div>
  );
}
