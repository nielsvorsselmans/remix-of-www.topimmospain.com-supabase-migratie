import { UserPlus, SlidersHorizontal, Sparkles } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    step: "1",
    title: "Maak een gratis account",
    description: "In 30 seconden klaar. Alleen je e-mailadres, geen wachtwoord nodig.",
  },
  {
    icon: SlidersHorizontal,
    step: "2",
    title: "Vul je voorkeuren in",
    description: "Budget, regio, doel — zodat we je alleen laten zien wat relevant is.",
  },
  {
    icon: Sparkles,
    step: "3",
    title: "Ontvang persoonlijke inzichten",
    description: "Projecten die passen, kostenberekeningen en updates op jouw maat.",
  },
];

export function PortalHowItWorks() {
  return (
    <section className="py-16 sm:py-20 bg-background">
      <div className="container max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Hoe het werkt
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Drie simpele stappen naar een persoonlijke oriëntatie
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="relative text-center group">
                {/* Connector line (hidden on mobile, between items on desktop) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px bg-border" />
                )}

                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-5 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-9 h-9 text-primary" />
                </div>

                <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold mb-3">
                  {item.step}
                </div>

                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
