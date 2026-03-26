import { PILLARS, Pillar } from "@/constants/orientation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const PILLAR_COPY: Record<Pillar, { question: string; benefit: string; link: string }> = {
  regio: {
    question: "Welke regio past bij jou?",
    benefit: "Ontdek de omgeving, het klimaat en de levensstijl — niet alleen het pand. Zodat je weet waar je investeert.",
    link: "/orientatie/regios-ontdekken",
  },
  financiering: {
    question: "Wat kost het écht?",
    benefit: "Hypotheek, eigen inbreng, bijkomende kosten en maandlasten. Helder overzicht, geen verrassingen.",
    link: "/orientatie/financiering",
  },
  juridisch: {
    question: "Hoe zit het juridisch?",
    benefit: "NIE-nummer, eigendomscontrole, notaris en contracten. Wij leggen elke stap uit.",
    link: "/orientatie/juridisch",
  },
  fiscaliteit: {
    question: "Welke belastingen betaal je?",
    benefit: "Bij aankoop én bij bezit. Zodat je vooraf weet wat je kunt verwachten.",
    link: "/orientatie/fiscaliteit",
  },
};

export function PreparationSection() {
  return (
    <section className="py-12 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16 max-w-2xl mx-auto">
          <p className="text-sm font-medium tracking-wide uppercase text-primary mb-3">
            Voorbereiding
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Goed voorbereid investeren in Spanje
          </h2>
          <p className="text-lg text-muted-foreground">
            Een goede investering begint met de juiste kennis. Wij helpen je op 4 vlakken voorbereiden.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 mb-12">
          {PILLARS.map((pillar) => {
            const copy = PILLAR_COPY[pillar.key];
            const Icon = pillar.icon;

            return (
              <Link key={pillar.key} to={copy.link} className="group">
                <Card className={cn(
                  "h-full transition-all duration-300 border",
                  pillar.colors.border,
                  pillar.colors.hover,
                  "hover:shadow-md"
                )}>
                  <CardContent className="p-5 sm:p-6 md:p-8">
                    <div className={cn(
                      "inline-flex items-center justify-center w-11 h-11 rounded-xl mb-4",
                      pillar.colors.iconBg
                    )}>
                      <Icon className={cn("h-5 w-5", pillar.colors.text)} />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {copy.question}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {copy.benefit}
                    </p>
                    <span className={cn(
                      "inline-flex items-center gap-1 text-sm font-medium mt-4",
                      pillar.colors.text,
                      "opacity-0 group-hover:opacity-100 transition-opacity"
                    )}>
                      Lees meer <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button asChild size="lg" variant="default">
            <Link to="/portaal">
              Start je oriëntatie
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
