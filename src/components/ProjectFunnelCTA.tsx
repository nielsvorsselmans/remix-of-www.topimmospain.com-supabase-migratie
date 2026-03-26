import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Plane, Home } from "lucide-react";
import { Link } from "react-router-dom";

export const ProjectFunnelCTA = () => {
  return (
    <section className="py-12 bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Klaar voor de volgende stap?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We begeleiden je graag verder in je oriëntatie. Kies wat nu het beste bij je past — alles is vrijblijvend.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Home className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Viva Vastgoed Portaal</CardTitle>
              <CardDescription className="text-base">
                Ontdek je persoonlijke investeringsomgeving
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Maak gratis een account aan en krijg toegang tot aangepaste aanbevelingen, 
                rendementscalculaties en persoonlijke begeleiding op jouw tempo.
              </p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Persoonlijke aanbevelingen op basis van jouw voorkeuren</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Rendementscalculaties en kostenoverzichten</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Complete kennisbank over investeren in Spanje</span>
                </li>
              </ul>
              <Button asChild className="w-full">
                <a href="/auth" target="_blank" rel="noopener noreferrer">Maak gratis account aan</a>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Video className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Oriëntatiegesprek</CardTitle>
              <CardDescription className="text-base">
                Bespreek je situatie vrijblijvend met ons team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Plan een videocall met een van onze adviseurs. We luisteren naar jouw wensen, 
                beantwoorden je vragen en helpen je helder krijgen wat het beste bij je past.
              </p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>30 minuten persoonlijk advies via videocall</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Antwoorden op al je vragen over investeren</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Geen verplichtingen of verkooppraat</span>
                </li>
              </ul>
              <Button asChild variant="secondary" className="w-full">
                <a href="https://vivavastgoed.com/orientatiegesprek" target="_blank" rel="noopener noreferrer">Plan een gesprek</a>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Plane className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Bezichtigingsreis</CardTitle>
              <CardDescription className="text-base">
                Ervaar de locatie en panden in het echt
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ontdek hoe een bezichtigingsreis verloopt. We organiseren alles voor je: 
                van planning tot begeleiding ter plaatse. Zo zie en voel je of het echt bij je past.
              </p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Volledig verzorgde bezichtigingsreis</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Persoonlijke begeleiding door lokale experts</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Ontdek de buurt, voorzieningen en levensstijl</span>
                </li>
              </ul>
              <Button asChild variant="outline" className="w-full">
                <a href="/blog/bezichtigingsreis-spanje-waarom-essentieel" target="_blank" rel="noopener noreferrer">Meer over bezichtigen</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};
