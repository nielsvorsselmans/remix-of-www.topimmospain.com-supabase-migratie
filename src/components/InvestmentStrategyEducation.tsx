import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Video, Check } from "lucide-react";
import { Link } from "react-router-dom";
export function InvestmentStrategyEducation() {
  return <section className="bg-accent/5 rounded-xl p-8 my-8">
      <div className="max-w-4xl mx-auto">
        {/* Educational Introduction */}
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Van data naar strategie: slim investeren in Spanje
          </h2>
          <div className="space-y-4 text-muted-foreground max-w-3xl mx-auto">
            <p>
              De historische huurdata hierboven geven je een goed beeld van wat vergelijkbare 
              woningen vandaag opbrengen. Maar ervaren investeerders kijken verder dan alleen het verleden.
            </p>
            <p>
              De grootste rendementen worden vaak behaald door het <strong className="text-foreground">herkennen 
              van opkomende gebieden</strong> waar de prijzen bovengemiddeld snel stijgen. Het gaat om timing: 
              aankopen op de juiste locatie, op het juiste moment, voordat de markt volledig is doorontwikkeld.
            </p>
            <p>
              Denk aan gebieden waar nieuwe infrastructuur wordt aangelegd, waar toerisme groeit, of waar 
              grote projectontwikkelaars net beginnen te investeren. Dat zijn de signalen die ervaren 
              investeerders zoeken.
            </p>
          </div>
        </div>

        {/* Two CTA Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Portal CTA Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Home className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Ontdek meer in het Viva Vastgoed Portaal</CardTitle>
              <CardDescription>
                Vergelijk projecten, bekijk actuele data en krijg toegang tot al onze rekentools 
                op één centrale plek.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>Vergelijk rendement tussen verschillende projecten</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>Sla favorieten op en kom later terug</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>Toegang tot financiële calculators en scenario's</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>Complete kennisbank over investeren in Spanje</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>Persoonlijke aanbevelingen op basis van jouw voorkeuren</span>
                </li>
              </ul>
              <Button asChild className="w-full">
                <Link to="/auth">Maak gratis account aan</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Video Call CTA Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mb-4">
                <Video className="w-6 h-6 text-secondary" />
              </div>
              <CardTitle className="text-xl">Bespreek de actuele marktkansen</CardTitle>
              <CardDescription>
                Benieuwd naar welke gebieden vandaag de meeste potentie hebben? Plan een 
                vrijblijvend gesprek met onze experts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                  <span>Inzicht in opkomende regio's en prijsontwikkelingen</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                  <span>Persoonlijk advies over timing en locatiekeuze</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                  <span>Analyse van jouw investeringsdoelen en budget</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                  <span>Eerlijke discussie over kansen én risico's</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                  <span>30 minuten videocall zonder verplichtingen</span>
                </li>
              </ul>
              <Button asChild variant="outline" className="w-full">
                <a href="https://vivavastgoed.com/orientatiegesprek" target="_blank" rel="noopener noreferrer">
                  Plan een oriëntatiegesprek
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>;
}