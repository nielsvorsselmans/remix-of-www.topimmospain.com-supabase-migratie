import { Search, FileText, Home, Key, TrendingUp, Heart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ProcessSection = () => {
  const phases = [
    {
      icon: Search,
      phase: "Fase 1",
      title: "Oriëntatie",
      description: "Ontdek rustig wat bij je past in je persoonlijke portaal"
    },
    {
      icon: FileText,
      phase: "Fase 2",
      title: "Selectie",
      description: "Wij zoeken samen het juiste vastgoed"
    },
    {
      icon: Home,
      phase: "Fase 3",
      title: "Bezichtiging",
      description: "Professionele begeleiding ter plaatse in Spanje"
    },
    {
      icon: Key,
      phase: "Fase 4",
      title: "Aankoop",
      description: "Juridische en financiële begeleiding van A tot Z"
    },
    {
      icon: TrendingUp,
      phase: "Fase 5",
      title: "Overdracht",
      description: "Notaris, ondertekening en sleuteloverdracht"
    },
    {
      icon: Heart,
      phase: "Fase 6",
      title: "Nazorg",
      description: "Doorlopende ondersteuning na aankoop"
    }
  ];

  return (
    <section className="py-12 sm:py-16 md:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 sm:mb-6">
            Hoe werkt het?
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4">
            Wij begeleiden u van begin tot eind met ons 6-fasenmodel. Transparant, professioneel en volledig afgestemd op uw wensen.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {phases.map((phase, index) => (
            <div 
              key={index}
              className="relative bg-card p-6 sm:p-8 rounded-2xl shadow-soft hover:shadow-elegant transition-all duration-300 border border-border/50 group"
            >
              <div className="absolute -top-3 -left-3 sm:-top-4 sm:-left-4 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-base sm:text-lg shadow-elegant">
                {index + 1}
              </div>
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-secondary flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-accent/20 transition-colors">
                <phase.icon className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
              </div>
              <div className="text-xs sm:text-sm font-semibold text-primary mb-2">
                {phase.phase}
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2 sm:mb-3">
                {phase.title}
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {phase.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-muted-foreground mb-3 text-sm sm:text-base">
            Jij staat nu in Fase 1 — je portaal helpt je verder.
          </p>
          <Button variant="link" className="text-primary gap-1.5" asChild>
            <a href="/portaal">
              Bekijk je persoonlijke stappenplan
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};
