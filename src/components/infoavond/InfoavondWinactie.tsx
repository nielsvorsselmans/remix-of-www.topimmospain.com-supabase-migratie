import { Plane, Hotel, Car, MapPin, Gift, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InfoavondWinactieProps {
  hasEvents?: boolean;
}

export function InfoavondWinactie({ hasEvents = true }: InfoavondWinactieProps) {
  const scrollToRegistration = () => {
    const element = document.getElementById('registratie');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const benefits = [
    { text: "Vliegtickets + verblijf met ontbijt", icon: Plane },
    { text: "Luchthavenvervoer", icon: Car },
    { text: "Persoonlijke begeleiding en volledige planning ter plaatse", icon: Hotel },
    { text: "Ontdekking van de lokale vastgoedmarkt en het Spaanse leven", icon: MapPin }
  ];

  return (
    <section className="py-16 md:py-20 bg-gradient-to-br from-primary/5 via-accent/10 to-primary/5 relative overflow-hidden">
      <div className="container max-w-6xl mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-6 shadow-sm">
            <Gift className="h-5 w-5 text-primary" />
            <span className="text-foreground/80 text-sm font-medium">Een extraatje voor deelnemers</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Als dank verloten we een{" "}
            <span className="text-primary">oriëntatiereis voor 2 personen</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Omdat we geloven dat zelf ervaren de beste manier is om te ontdekken of Spanje bij jou past.
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center mb-10">
          {/* Left Column - Benefits as cards */}
          <div className="space-y-4">
            <div className="grid gap-3">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div 
                    key={index} 
                    className="flex items-center gap-4 bg-background/80 backdrop-blur-sm rounded-xl p-4 border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-foreground font-medium">{benefit.text}</span>
                  </div>
                );
              })}
            </div>

            {/* Bonus */}
            <div className="bg-primary/10 rounded-xl p-4 border border-primary/20 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Gift className="h-4 w-4 text-primary" />
                <p className="text-primary font-semibold">Bonus bij de reis:</p>
              </div>
              <p className="text-foreground/80">Volmacht + NIE-aanvraag inbegrepen.</p>
            </div>

            {/* Subtle note */}
            <p className="text-sm text-muted-foreground">
              {hasEvents ? "Onder alle aanwezigen van de infoavond." : "Onder alle deelnemers."}
            </p>
          </div>

          {/* Right Column - Video */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-xl opacity-50" />
            <div className="relative aspect-video rounded-2xl overflow-hidden shadow-xl bg-muted/50 ring-1 ring-border/50">
              <iframe
                src="https://player.vimeo.com/video/936602378?h=&title=0&byline=0&portrait=0"
                className="w-full h-full"
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title="Oriëntatiereis video"
              />
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <Button
            onClick={scrollToRegistration}
            size="lg"
            className="text-lg px-8 py-6 h-auto rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group bg-primary hover:bg-primary/90"
          >
            {hasEvents ? "Schrijf je in voor de infoavond" : "Hou me op de hoogte"}
            <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
}
