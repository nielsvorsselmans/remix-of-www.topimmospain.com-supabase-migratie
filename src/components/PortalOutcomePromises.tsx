import { MapPin, Calculator, ShieldCheck, Lightbulb } from "lucide-react";

const outcomes = [
  {
    icon: MapPin,
    title: "Welke regio past bij jou",
    description: "Ontdek welke Spaanse regio aansluit bij jouw budget, doel en levensstijl.",
    delay: "0ms",
  },
  {
    icon: Calculator,
    title: "Wat het oplevert — en kost",
    description: "Krijg een helder beeld van rendement, bijkomende kosten en financieringsopties.",
    delay: "100ms",
  },
  {
    icon: ShieldCheck,
    title: "Of het bij jouw situatie past",
    description: "Begrijp of investeren in Spaans vastgoed past bij jouw financiële situatie en plannen.",
    delay: "200ms",
  },
  {
    icon: Lightbulb,
    title: "Hoe het proces werkt",
    description: "Van oriëntatie tot aankoop: leer stap voor stap hoe het traject eruitziet.",
    delay: "300ms",
  },
];

export const PortalOutcomePromises = () => {
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-background via-muted/20 to-background">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-foreground">
            Dit ontdek je in jouw omgeving
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Concrete antwoorden op de vragen die je nu hebt
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {outcomes.map((outcome, index) => {
            const Icon = outcome.icon;
            return (
              <div
                key={index}
                className="group relative bg-background border border-border rounded-xl p-6 sm:p-8 hover:border-primary/50 transition-all duration-300 animate-fade-in hover:shadow-lg hover:shadow-primary/10"
                style={{ animationDelay: outcome.delay }}
              >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
                  </div>

                  <h3 className="text-xl sm:text-2xl font-semibold mb-3 text-foreground group-hover:text-primary transition-colors duration-300">
                    {outcome.title}
                  </h3>

                  <p className="text-muted-foreground leading-relaxed">
                    {outcome.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
