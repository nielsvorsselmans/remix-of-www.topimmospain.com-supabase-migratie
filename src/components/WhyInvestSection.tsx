import { Palmtree, Shield, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MicroTestimonial } from "./shared/MicroTestimonial";

export const WhyInvestSection = () => {
  const pillars = [
    {
      title: "Rust",
      icon: Palmtree,
      description: "Weg van de drukte, dichter bij uzelf. Spaans vastgoed biedt een plek om tot rust te komen – of u nu investeert voor later of nu al wilt genieten van het mediterrane leven."
    },
    {
      title: "Vrijheid",
      icon: Shield,
      description: "Financiële vrijheid door passief inkomen, of de vrijheid om te genieten wanneer u wilt. Uw tweede huis, uw keuze – wij regelen de rest."
    },
    {
      title: "Rendement",
      icon: TrendingUp,
      description: "Aantrekkelijke huurinkomsten en waardestijging. Uw spaargeld moet iets opbrengen – Spaans vastgoed biedt perspectief waar een spaarrekening dat niet meer deed."
    }
  ];

  return (
    <section className="py-10 sm:py-16 md:py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 sm:mb-6">
            Waarom investeren in Spanje?
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4">
            Veel mensen die overwegen om in Spaans vastgoed te investeren, vinden het lastig om de juiste keuze te maken. Wij helpen u met transparante begeleiding.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 lg:gap-12">
          {pillars.map((pillar, index) => {
            const Icon = pillar.icon;
            return (
              <div 
                key={index}
                className="bg-card p-6 sm:p-8 rounded-2xl shadow-soft hover:shadow-elegant transition-all duration-300 border border-border/50"
              >
                <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3 sm:mb-4">
                  {pillar.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed text-base sm:text-lg">
                  {pillar.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-10 max-w-md mx-auto">
          <MicroTestimonial
            quote="Wij geloven dat de juiste begeleiding het verschil maakt. Geen verkoopdruk, maar eerlijk advies zodat je zelf een goede keuze kunt maken."
            author="Lars"
            location="Top Immo Spain"
          />
        </div>

        <div className="mt-8 text-center">
          <Button variant="link" className="text-primary gap-1.5" asChild>
            <a href="/portaal">
              Ontdek welk type investeerder je bent
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};
