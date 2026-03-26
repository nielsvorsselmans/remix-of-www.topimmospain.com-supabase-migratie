import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Calendar, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

export const InvestorPageClosingCTA = () => {
  return (
    <section className="bg-gradient-to-br from-primary/5 to-accent/10 rounded-2xl p-8 md:p-12 shadow-elegant">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Klaar voor de volgende stap?
          </h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              Je hebt nu een compleet beeld van de investering: van aankoopkosten en rendement 
              tot financieringsmogelijkheden en juridische zekerheid. Alle informatie die je 
              nodig hebt om een weloverwogen beslissing te maken.
            </p>
            <p>
              Voor veel investeerders is dit het moment om dieper in te gaan: projecten vergelijken, 
              scenario's doorrekenen en persoonlijk advies inwinnen over actuele marktkansen.
            </p>
          </div>
        </div>

        {/* CTA Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Viva Portaal Card */}
          <Card className="border-2 hover:border-primary/50 transition-all duration-300 shadow-lg">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Database className="w-6 h-6 text-primary" />
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Vergelijk en bereken verder
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Krijg toegang tot al je data, tools en kennis op één centrale plek.
                </p>
              </div>

              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">Bewaar dit project</strong> en vergelijk met andere opties
                  </span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">Gebruik onze rekentools</strong> voor verschillende scenario's
                  </span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">Toegang tot kennisbank</strong> over Spaanse vastgoedmarkt
                  </span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">Ontvang updates</strong> over nieuwe projecten in jouw regio
                  </span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">Persoonlijke dashboard</strong> met al je favorieten
                  </span>
                </li>
              </ul>

              <Button asChild className="w-full" size="lg">
                <Link to="/auth">
                  Maak gratis account aan
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Oriëntatiegesprek Card */}
          <Card className="border-2 hover:border-primary/50 transition-all duration-300 shadow-lg">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Bespreek jouw situatie persoonlijk
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Plan een vrijblijvend gesprek om jouw specifieke situatie en doelen te bespreken.
                </p>
              </div>

              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">Bespreek dit specifieke project</strong> met onze experts
                  </span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">Vergelijk met andere actuele mogelijkheden</strong> op de markt
                  </span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">Krijg advies</strong> over financiering en optimale structuur
                  </span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">Ontdek welke strategie</strong> bij jou past (verhuur vs. doorverkoop)
                  </span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">30 minuten persoonlijk advies</strong> zonder verplichtingen
                  </span>
                </li>
              </ul>

              <Button asChild variant="outline" className="w-full" size="lg">
                <a href="https://vivavastgoed.com/orientatiegesprek" target="_blank" rel="noopener noreferrer">
                  Plan een gesprek
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};
