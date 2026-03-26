import { Clock, Laptop, Mail, MessageCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const scheduleItems = [
  { time: "19:45", label: "Inloggen & check" },
  { time: "20:00", label: "Start presentatie" },
  { time: "20:45", label: "Live Q&A" },
  { time: "21:15", label: "Afsluiting" },
];

const requirements = [
  "Laptop, tablet of smartphone met internet",
  "Rustige plek waar je ongestoord kunt volgen",
  "Pen en papier voor notities (optioneel)",
];

const afterRegistration = [
  "Bevestigingsmail met praktische info",
  "Herinnering 24 uur voor het webinar",
  "Herinnering 1 uur voor aanvang met link",
  "Opname binnen 24 uur na afloop",
];

export function WebinarPraktisch() {
  const scrollToRegistration = () => {
    const element = document.getElementById("webinar-registratie");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="py-12 md:py-16 lg:py-24">
      <div className="container px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 md:mb-4">
              Praktische informatie
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
              Alles wat je moet weten om optimaal voorbereid te zijn.
            </p>
          </div>

          {/* Content Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
            {/* Schedule */}
            <div className="bg-card border border-border rounded-xl p-4 md:p-6">
              <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm md:text-base text-foreground">Tijdschema</h3>
              </div>
              <div className="space-y-3 md:space-y-4">
                {scheduleItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 md:gap-3">
                    <span className="text-xs md:text-sm font-medium text-primary bg-primary/10 px-2 py-0.5 md:py-1 rounded min-w-[45px] md:min-w-[50px] text-center">
                      {item.time}
                    </span>
                    <span className="text-xs md:text-sm text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Requirements */}
            <div className="bg-card border border-border rounded-xl p-4 md:p-6">
              <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Laptop className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm md:text-base text-foreground">Wat je nodig hebt</h3>
              </div>
              <ul className="space-y-2 md:space-y-3">
                {requirements.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 md:gap-3">
                    <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-xs md:text-sm text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* After Registration */}
            <div className="bg-card border border-border rounded-xl p-4 md:p-6 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm md:text-base text-foreground">Na inschrijving</h3>
              </div>
              <ul className="space-y-2 md:space-y-3">
                {afterRegistration.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 md:gap-3">
                    <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-xs md:text-sm text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Q&A Info */}
          <div className="mt-6 md:mt-8 bg-primary/5 border border-primary/20 rounded-xl p-4 md:p-6 flex flex-col sm:flex-row items-center gap-4 md:gap-6">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            </div>
            <div className="text-center sm:text-left flex-1">
              <h4 className="font-semibold text-sm md:text-base text-foreground mb-1">Live je vragen stellen</h4>
              <p className="text-xs md:text-sm text-muted-foreground">
                Tijdens het webinar kun je via de chat live je vragen stellen. 
                Onze experts beantwoorden de meest gestelde vragen aan het einde.
              </p>
            </div>
            <Button onClick={scrollToRegistration} className="flex-shrink-0 w-full sm:w-auto h-10 md:h-11 text-sm">
              Reserveer je plek
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}