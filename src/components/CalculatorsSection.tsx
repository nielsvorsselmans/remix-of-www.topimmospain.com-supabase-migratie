import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Calculator, TrendingDown, ArrowRight, PiggyBank, Building2 } from "lucide-react";

export function CalculatorsSection() {
  // Pre-calculated example results for the teaser
  const exampleSavings = 3245; // Based on default scenario

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Calculator className="h-4 w-4" />
            Rekentools
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Rekentools voor Investeerders
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Bereken je situatie met onze gratis tools en ontdek de mogelijkheden van investeren in Spanje
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Featured: Box 3 Calculator */}
          <Card className="overflow-hidden border-primary/20 hover:shadow-lg transition-shadow">
            <div className="grid md:grid-cols-2">
              {/* Content Side */}
              <CardHeader className="p-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <PiggyBank className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-primary">Populair</span>
                </div>
                <CardTitle className="text-2xl mb-2">Box 3 Vermogensbelasting Calculator</CardTitle>
                <CardDescription className="text-base mb-6">
                  Ontdek hoe Spaans vastgoed je Nederlandse vermogensbelasting kan verlagen. 
                  Vergelijk je huidige situatie met een scenario met Spaans vastgoed.
                </CardDescription>
                
                <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    Actuele forfaitaire rendementen 2025
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    Scenario vergelijking met/zonder vastgoed
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    Inclusief Spaanse hypotheek berekening
                  </li>
                </ul>

                <Button asChild>
                  <Link to="/rekentools/box3">
                    Open Calculator
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>

              {/* Preview Side */}
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-8 flex flex-col justify-center items-center">
                <p className="text-sm text-muted-foreground mb-2">Voorbeeld Besparing</p>
                <div className="flex items-center gap-3 mb-4">
                  <TrendingDown className="h-8 w-8 text-primary" />
                  <span className="text-4xl font-bold text-primary">
                    €{exampleSavings.toLocaleString('nl-NL')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  per jaar minder Box 3 belasting<br />
                  <span className="text-xs">(bij €900.000 vermogen met €300.000 in Spaans vastgoed)</span>
                </p>
                
                <div className="mt-6 grid grid-cols-2 gap-4 text-center">
                  <div className="bg-background/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Zonder ES vastgoed</p>
                    <p className="font-semibold">€10.845</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Met ES vastgoed</p>
                    <p className="font-semibold text-primary">€7.600</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Future calculators teaser */}
          <div className="mt-8 grid md:grid-cols-2 gap-4">
            <Card className="p-6 opacity-75">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="font-medium">ROI Calculator</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Bereken je verwachte rendement inclusief huurinkomsten en waardestijging.
              </p>
              <Button variant="ghost" size="sm" className="mt-4" asChild>
                <Link to="/portaal">Beschikbaar in het portaal</Link>
              </Button>
            </Card>

            <Card className="p-6 opacity-75">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="font-medium">Aankoopkosten Calculator</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Krijg inzicht in alle kosten bij de aankoop van Spaans vastgoed.
              </p>
              <Button variant="ghost" size="sm" className="mt-4" asChild>
                <Link to="/portaal">Beschikbaar in het portaal</Link>
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
