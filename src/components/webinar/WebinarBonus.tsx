import { BookOpen, Calculator, Phone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const tools = [
  {
    icon: BookOpen,
    title: "Oriëntatiegids",
    description: "Stap voor stap begrijpen hoe investeren in Spanje werkt.",
  },
  {
    icon: Calculator,
    title: "Rendementstools",
    description: "Bereken zelf kosten en verwacht rendement.",
  },
  {
    icon: Phone,
    title: "Oriënterend gesprek",
    description: "Vrijblijvend je persoonlijke situatie bespreken.",
  },
];

export function WebinarBonus() {
  const scrollToRegistration = () => {
    const element = document.getElementById("webinar-registratie");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="py-12 md:py-16 lg:py-24 bg-secondary/30">
      <div className="container px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 md:mb-12">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs md:text-sm font-medium mb-3 md:mb-4">
              Toegang tot oriëntatietools
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 md:mb-4 px-2">
              Na het webinar: verder oriënteren in je eigen tempo
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto px-2">
              Na inschrijving krijg je toegang tot het Viva Portaal. 
              Geen sales, geen druk — gewoon de tools die je nodig hebt.
            </p>
          </div>

          {/* Tools Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
            {tools.map((tool, index) => {
              const Icon = tool.icon;
              return (
                <div
                  key={index}
                  className="bg-card border border-border rounded-xl p-4 md:p-6 text-center hover:shadow-elegant transition-shadow"
                >
                  <div className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm md:text-base text-foreground mb-1 md:mb-2">{tool.title}</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">{tool.description}</p>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <div className="text-center">
            <Button size="lg" onClick={scrollToRegistration} className="group w-full sm:w-auto h-11 md:h-12 text-sm md:text-base">
              Schrijf je in voor het webinar
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <p className="text-xs md:text-sm text-muted-foreground mt-2 md:mt-3">
              Je krijgt direct toegang tot deze tools na inschrijving
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}