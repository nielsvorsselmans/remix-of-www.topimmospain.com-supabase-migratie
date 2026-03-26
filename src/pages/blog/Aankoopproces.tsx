import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { DashboardBackLink } from "@/components/DashboardBackLink";
import { CheckCircle2, FileText, Home, Key, Euro, Shield } from "lucide-react";

const Aankoopproces = () => {
  const steps = [
    {
      icon: Home,
      title: "1. Oriëntatie & Selectie",
      duration: "1-2 weken",
      description: "U bepaalt uw wensen en budget. Wij tonen u passende woningen en organiseren bezichtigingen.",
      tasks: [
        "Bepaal uw investeringsdoelen",
        "Stel budget vast inclusief bijkomende kosten",
        "Bekijk woningen via ons portaal",
        "Plan bezichtigingen in"
      ]
    },
    {
      icon: FileText,
      title: "2. Aanvraag NIE & Juridische Check",
      duration: "2-4 weken",
      description: "U vraagt een NIE-nummer aan en wij laten de woning juridisch controleren.",
      tasks: [
        "NIE-nummer aanvragen",
        "Juridische controle van eigendomsakte",
        "Checken op lasten en hypotheken",
        "Verificatie bouwvergunningen"
      ]
    },
    {
      icon: Euro,
      title: "3. Reservering & Aanbetaling",
      duration: "1 week",
      description: "U reserveert de woning met een reserveringsovereenkomst en betaalt een aanbetaling.",
      tasks: [
        "Ondertekenen reserveringsovereenkomst",
        "Betaling reserveringsgeld (€3.000-€6.000)",
        "Woning wordt uit de verkoop gehaald",
        "Start hypotheekprocedure indien nodig"
      ]
    },
    {
      icon: Shield,
      title: "4. Voorlopig Koopcontract",
      duration: "1-2 weken",
      description: "U ondertekent het voorlopige contract en betaalt 10% van de aankoopprijs.",
      tasks: [
        "Ondertekenen compromis de venta",
        "Betaling 10% van aankoopprijs",
        "Afspraken over sleuteldatum",
        "Voorwaarden definitieve akte bespreken"
      ]
    },
    {
      icon: FileText,
      title: "5. Notarisakte & Eigendomsoverdracht",
      duration: "4-8 weken",
      description: "Bij de notaris wordt de definitieve koopakte ondertekend en wordt u officieel eigenaar.",
      tasks: [
        "Betaling restant koopsom",
        "Betaling overdrachtsbelasting en notariskosten",
        "Ondertekenen definitieve akte",
        "Ontvangst sleutels"
      ]
    },
    {
      icon: Key,
      title: "6. Na de Aankoop",
      duration: "Doorlopend",
      description: "Wij helpen u met het regelen van nutsvoorzieningen, verzekeringen en eventueel verhuur.",
      tasks: [
        "Inschrijving kadaster",
        "Aansluiten nutsvoorzieningen",
        "Afsluiten verzekeringen",
        "Eventueel verhuur regelen"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <DashboardBackLink />
      
      <section className="py-20 bg-gradient-subtle">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
            Het Aankoopproces
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Stap voor stap uitgelegd: van oriëntatie tot sleuteloverdracht
          </p>
        </div>
      </section>

      <section className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Volledig Begeleid Door Viva Vastgoed
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Het kopen van vastgoed in Spanje verschilt van Nederland. Wij begeleiden u door het hele proces 
            en zorgen ervoor dat alles juridisch en financieel correct verloopt. Geen verrassingen, 
            alleen transparantie en rust.
          </p>
        </div>

        <div className="space-y-8">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={idx} className="bg-card p-8 rounded-2xl border border-border shadow-sm">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-2xl font-bold text-foreground">
                        {step.title}
                      </h3>
                      <span className="text-sm text-muted-foreground font-medium">
                        {step.duration}
                      </span>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      {step.description}
                    </p>
                    <ul className="space-y-2">
                      {step.tasks.map((task, taskIdx) => (
                        <li key={taskIdx} className="flex items-start gap-2">
                          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-foreground">{task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-16 bg-gradient-warm p-10 rounded-2xl">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Totale Doorlooptijd
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            Het volledige aankoopproces duurt gemiddeld 2-3 maanden. Dit kan korter zijn bij 
            een contante aankoop of langer als er een hypotheek bij komt kijken. Wij houden u 
            in elke fase op de hoogte en zorgen voor een soepel verloop.
          </p>
          <a
            href="/6-stappen-plan"
            className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Bekijk het interactieve 6-Stappen Plan
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Aankoopproces;
