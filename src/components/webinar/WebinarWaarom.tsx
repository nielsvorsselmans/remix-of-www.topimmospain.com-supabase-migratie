import { TrendingUp, Shield, MapPin, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const leerpunten = [
  {
    icon: TrendingUp,
    title: "Rendementsanalyse",
    description: "Leer hoe je het potentiële rendement van een vastgoedinvestering berekent",
  },
  {
    icon: Shield,
    title: "Juridische zekerheid",
    description: "Ontdek welke juridische controles essentieel zijn bij een Spaanse aankoop",
  },
  {
    icon: MapPin,
    title: "Toplocaties",
    description: "We tonen de meest interessante regio's voor investeerders aan de Costa Cálida",
  },
  {
    icon: Users,
    title: "Begeleiding van A tot Z",
    description: "Hoe wij je helpen bij elke stap, van oriëntatie tot sleuteloverdracht",
  },
];

export function WebinarWaarom() {
  const scrollToRegistration = () => {
    const element = document.getElementById("webinar-registratie");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="py-12 md:py-16 lg:py-24 bg-muted/30">
      <div className="container px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 md:mb-4">
              Wat leer je tijdens dit webinar?
            </h2>
            <p className="text-sm md:text-lg text-muted-foreground px-2">
              In 60 minuten krijg je een complete introductie in investeren in Spaans vastgoed
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 md:gap-6 mb-8 md:mb-12">
            {leerpunten.map((punt, index) => (
              <div
                key={index}
                className="flex gap-3 md:gap-4 p-4 md:p-6 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <punt.icon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm md:text-base text-foreground mb-0.5 md:mb-1">{punt.title}</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">{punt.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 2025 Actualiteit */}
          <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 md:p-4 mb-6 md:mb-8">
            <p className="text-xs md:text-sm text-muted-foreground text-center">
              <span className="font-medium text-foreground">Update 2026:</span> We bespreken ook 
              de recente wijzigingen in de Spaanse vastgoedmarkt.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6">
              <div className="flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              </div>
              <div className="text-center sm:text-left flex-1">
                <h3 className="text-base md:text-xl font-semibold text-foreground mb-1 md:mb-2">
                  60 minuten vol waardevolle inzichten
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Na het webinar weet je precies waar je op moet letten en kun je een weloverwogen beslissing nemen.
                </p>
              </div>
              <Button onClick={scrollToRegistration} size="lg" className="flex-shrink-0 w-full sm:w-auto h-10 md:h-11 text-sm md:text-base">
                Reserveer je plek
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}