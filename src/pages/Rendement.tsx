import { Helmet } from "react-helmet-async";
import { TrendingUp, Euro, PiggyBank, BarChart3, CheckCircle2, ArrowRight, BookOpen, Lock, Calculator, Users, Video } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ROICalculator } from "@/components/ROICalculator";
import { FinancialCalculator } from "@/components/FinancialCalculator";
import { PurchaseCostsBreakdown } from "@/components/PurchaseCostsBreakdown";
import { InvestmentFAQ } from "@/components/InvestmentFAQ";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Link } from "react-router-dom";
export default function Rendement() {
  return <div className="min-h-screen bg-background">
      <Navbar />
      <Helmet>
        <title>Rendement op Vastgoed in Spanje | Viva Vastgoed</title>
        <meta name="description" content="Ontdek huurrendement van 5-8% en waardestijging van 4-6% per jaar. Bereken je verwachte rendement met onze ROI calculator. Volledige transparantie over kosten en opbrengsten." />
        <meta name="keywords" content="vastgoed rendement spanje, huurrendement costa calida, roi calculator vastgoed, investeren spanje" />
      </Helmet>

      {/* Hero Section met Key Metrics */}
      <section className="relative bg-gradient-to-br from-primary via-accent to-primary/80 text-white py-20 md:py-32 overflow-hidden">
        {/* Decorative shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float" style={{
          animationDelay: "1s"
        }} />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto text-center mb-16">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 animate-fade-in">
              Wat kun je verdienen met vastgoed in Spanje?
            </h1>
            <p className="text-xl md:text-2xl text-white/90 animate-fade-in" style={{
            animationDelay: "0.2s"
          }}>
              Transparant inzicht in huurrendement, waardestijging en totale kosten
            </p>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="bg-white/10 backdrop-blur-md border-white/20 animate-fade-in-up" style={{
            animationDelay: "0.3s"
          }}>
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-white" />
                <div className="text-4xl font-bold mb-2">5-8%</div>
                <div className="text-white/80">Bruto huurrendement</div>
                <div className="text-sm text-white/60 mt-2">Gemiddeld in Costa Cálida</div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-md border-white/20 animate-fade-in-up" style={{
            animationDelay: "0.4s"
          }}>
              <CardContent className="p-6 text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-white" />
                <div className="text-4xl font-bold mb-2">4-6%</div>
                <div className="text-white/80">Jaarlijkse waardestijging</div>
                <div className="text-sm text-white/60 mt-2">Historisch gemiddelde</div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-md border-white/20 animate-fade-in-up" style={{
            animationDelay: "0.5s"
          }}>
              <CardContent className="p-6 text-center">
                <Euro className="h-12 w-12 mx-auto mb-4 text-white" />
                <div className="text-4xl font-bold mb-2">12-15%</div>
                <div className="text-white/80">Aankoopkosten</div>
                <div className="text-sm text-white/60 mt-2">Volledige transparantie</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Bereken je persoonlijke rendement
              </h2>
              <p className="text-xl text-muted-foreground">
                Speel met de cijfers en zie wat jouw investering kan opleveren
              </p>
            </div>

            <ROICalculator initialPurchasePrice={250000} initialMonthlyRent={1500} />
          </div>
        </div>
      </section>

      {/* Hoe Ontstaat Rendement */}
      <section className="py-20 md:py-28 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Hoe ontstaat rendement?
              </h2>
              <p className="text-xl text-muted-foreground">
                Drie pijlers van vastgoedrendement in Spanje
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Huurinkomsten */}
              <Card className="hover:shadow-elegant transition-shadow">
                <CardContent className="p-6">
                  <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Euro className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">1. Huurinkomsten</h3>
                  <div className="space-y-3 text-muted-foreground">
                    <div>
                      <p className="font-semibold text-foreground">Vakantieverhuur:</p>
                      <p className="text-sm">€100-€180/nacht in hoogseizoen</p>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Bezettingsgraad:</p>
                      <p className="text-sm">60-75% gemiddeld</p>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Netto opbrengst:</p>
                      <p className="text-sm">~€15.000-€25.000/jaar</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Waardestijging */}
              <Card className="hover:shadow-elegant transition-shadow">
                <CardContent className="p-6">
                  <div className="h-12 w-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                    <TrendingUp className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">2. Waardestijging</h3>
                  <div className="space-y-3 text-muted-foreground">
                    <div>
                      <p className="font-semibold text-foreground">Historisch:</p>
                      <p className="text-sm">4-6% per jaar (bron: Tinsa/Idealista)</p>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Focus op groeigebieden:</p>
                      <p className="text-sm">Pilar de la Horadada, Los Alcázares</p>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Nieuwbouw voordeel:</p>
                      <p className="text-sm">Potentieel hogere waardegroei</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Fiscaal voordeel */}
              <Card className="hover:shadow-elegant transition-shadow">
                <CardContent className="p-6">
                  <div className="h-12 w-12 bg-secondary/50 rounded-lg flex items-center justify-center mb-4">
                    <BarChart3 className="h-6 w-6 text-foreground" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">3. Belastingvoordelen</h3>
                  <div className="space-y-3 text-muted-foreground">
                    <div>
                      <p className="font-semibold text-foreground">Belastingverdrag:</p>
                      <p className="text-sm">NL-Spanje voorkomt dubbele belasting</p>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Afschrijving:</p>
                      <p className="text-sm">3% per jaar op gebouwwaarde</p>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Aftrekposten:</p>
                      <p className="text-sm">Rente, onderhoud, beheerkosten</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-8 p-6 bg-muted rounded-lg">
              <p className="text-muted-foreground">
                <strong className="text-foreground">Combinatie is kracht:</strong> Het totale rendement ontstaat door 
                de combinatie van deze drie pijlers. Terwijl je huurinkomsten ontvangt, stijgt de waarde van je vastgoed, 
                en kun je fiscale voordelen benutten. Dit maakt Spaans vastgoed aantrekkelijker dan veel andere investeringen.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Relevante Blogposts */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Verder lezen
              </h2>
              <p className="text-xl text-muted-foreground">
                Verdiep je kennis met deze artikelen over rendement en verhuur
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <Link to="/blog/rendement-verhuur-spanje" className="group">
                <Card className="h-full hover:shadow-elegant transition-all hover:border-primary/50">
                  <CardContent className="p-6">
                    <Badge variant="secondary" className="mb-3">Verhuur</Badge>
                    <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                      Wat voor rendement kan ik verwachten?
                    </h3>
                    <div className="flex items-center text-sm text-muted-foreground gap-2 mt-4">
                      <BookOpen className="h-4 w-4" />
                      <span>Lees meer</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/blog/optimaliseren-verhuurrendement" className="group">
                <Card className="h-full hover:shadow-elegant transition-all hover:border-primary/50">
                  <CardContent className="p-6">
                    <Badge variant="secondary" className="mb-3">Verhuur</Badge>
                    <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                      Hoe optimaliseer ik mijn verhuurrendement?
                    </h3>
                    <div className="flex items-center text-sm text-muted-foreground gap-2 mt-4">
                      <BookOpen className="h-4 w-4" />
                      <span>Lees meer</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/blog/belasting-huurinkomsten-spanje" className="group">
                <Card className="h-full hover:shadow-elegant transition-all hover:border-primary/50">
                  <CardContent className="p-6">
                    <Badge variant="secondary" className="mb-3">Belastingen</Badge>
                    <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                      Hoe werkt belasting op huurinkomsten?
                    </h3>
                    <div className="flex items-center text-sm text-muted-foreground gap-2 mt-4">
                      <BookOpen className="h-4 w-4" />
                      <span>Lees meer</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/blog/dubbele-belasting-nederland-spanje" className="group">
                <Card className="h-full hover:shadow-elegant transition-all hover:border-primary/50">
                  <CardContent className="p-6">
                    <Badge variant="secondary" className="mb-3">Belastingen</Badge>
                    <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                      Moet ik ook in Nederland belasting betalen?
                    </h3>
                    <div className="flex items-center text-sm text-muted-foreground gap-2 mt-4">
                      <BookOpen className="h-4 w-4" />
                      <span>Lees meer</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Kostentransparantie */}
      <section className="py-20 md:py-28 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Geen verborgen kosten
              </h2>
              <p className="text-xl text-muted-foreground mb-6">
                Dit is wat je écht betaalt bij een aankoop in Spanje
              </p>
              <div className="flex items-center justify-center gap-2 text-primary">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Alle kosten vooraf bekend</span>
              </div>
            </div>

            <PurchaseCostsBreakdown propertyPrice={250000} />

            <div className="mt-8">
              <FinancialCalculator />
            </div>
          </div>
        </div>
      </section>

      {/* Rendementsvergelijking */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Spanje vs Alternatieven
              </h2>
              <p className="text-xl text-muted-foreground">
                Vergelijk het rendement op €100.000 over 10 jaar
              </p>
            </div>

            <Card>
              <CardContent className="p-8">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-4 px-4">Investering</th>
                        <th className="text-right py-4 px-4">Na 10 jaar</th>
                        <th className="text-right py-4 px-4">Jaarlijks rendement</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <PiggyBank className="h-5 w-5 text-muted-foreground" />
                            Spaarrekening
                          </div>
                        </td>
                        <td className="text-right py-4 px-4 font-semibold">€116.000</td>
                        <td className="text-right py-4 px-4 text-muted-foreground">~1.5%</td>
                      </tr>
                      <tr className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-muted-foreground" />
                            NL Vastgoed (huur)
                          </div>
                        </td>
                        <td className="text-right py-4 px-4 font-semibold">€148.000</td>
                        <td className="text-right py-4 px-4 text-muted-foreground">~4%</td>
                      </tr>
                      <tr className="hover:bg-primary/5 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            <span className="font-semibold">Spanje Vastgoed</span>
                          </div>
                        </td>
                        <td className="text-right py-4 px-4 font-bold text-primary text-lg">€180.000+</td>
                        <td className="text-right py-4 px-4 font-semibold text-primary">~6-8%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Let op:</strong> Dit is een vereenvoudigde vergelijking. Rendementen uit het verleden bieden geen garantie voor de toekomst. 
                    Spaans vastgoed combineert huurinkomsten én waardestijging, wat het totaalrendement aanzienlijk hoger maakt.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Portaal CTA */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <Card className="border-primary/20 shadow-elegant">
              <CardContent className="p-8 md:p-12">
                <div className="text-center mb-10">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                    <Lock className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">
                    Ga dieper met het Viva Portaal
                  </h2>
                  <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Krijg toegang tot exclusieve data en tools om je investering door te rekenen
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-6 mb-10">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BarChart3 className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Rendementsvergelijking per project</h3>
                      <p className="text-sm text-muted-foreground">Vergelijk huurpotentie van alle projecten</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-accent" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Exclusieve verhuurdata</h3>
                      <p className="text-sm text-muted-foreground">Inzicht in bezettingsgraden en marktprijzen</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Calculator className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Persoonlijke portfolio-berekening</h3>
                      <p className="text-sm text-muted-foreground">Bereken je totale rendement over meerdere jaren</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                        <Video className="h-5 w-5 text-accent" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Expert video calls plannen</h3>
                      <p className="text-sm text-muted-foreground">Bespreek je rendementsdoelen met een adviseur</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/portaal">
                    <Button size="lg" className="gap-2 w-full sm:w-auto">
                      Gratis account aanmaken
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/portaal">
                    <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto">
                      Bekijk wat het portaal biedt
                    </Button>
                  </Link>
                </div>

                <p className="text-center text-sm text-muted-foreground mt-6">
                  Geen verplichtingen • Geen betaalgegevens nodig
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 md:py-28 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Veelgestelde vragen over rendement
              </h2>
            </div>

            <InvestmentFAQ defaultTab="rental" showTabs={["financing", "rental"]} variant="card" />
          </div>
        </div>
      </section>

      {/* Klantverhaal Spotlight */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="grid md:grid-cols-2 gap-8 p-8 md:p-12">
                  <div>
                    <div className="mb-6">
                      <Badge variant="secondary" className="mb-4">Succesverhaal</Badge>
                      <h3 className="text-2xl font-bold mb-2">
                        "Na 3 jaar al €45.000 aan huurinkomsten"
                      </h3>
                      <p className="text-muted-foreground">
                        Robert & Karin uit Groningen investeerden in een appartement in Los Alcázares en verhuren dit succesvol via Airbnb.
                      </p>
                    </div>
                    <Link to="/klantverhalen/robert-karin-los-alcazares">
                      <Button variant="outline" className="gap-2">
                        Lees het volledige verhaal
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <div className="flex items-center justify-center gap-8">
                        <div>
                          <div className="text-4xl font-bold text-primary">€45k</div>
                          <div className="text-sm text-muted-foreground">Huurinkomsten</div>
                        </div>
                        <div>
                          <div className="text-4xl font-bold text-accent">7.2%</div>
                          <div className="text-sm text-muted-foreground">Gem. rendement</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>Investering • Vakantieverhuur</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Klaar om je rendement te berekenen?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Ontdek welke projecten het beste passen bij jouw rendementsdoelen
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/projecten">
                <Button size="lg" className="gap-2">
                  Bekijk projecten met hoog rendement
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/portaal">
                <Button variant="outline" size="lg" className="gap-2">
                  Bereken je persoonlijke rendement
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            <p className="text-sm text-muted-foreground mt-6">
              Geen verplichtingen • Gratis oriëntatie
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>;
}