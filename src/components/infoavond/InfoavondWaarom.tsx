import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const learningPoints = [
  "De 5 valkuilen die 90% van de kopers niet kent – en hoe je ze vermijdt.",
  "Rendement vs. realiteit: wat kun je werkelijk verwachten van Spaans vastgoed?",
  "Juridische zekerheid: hoe bescherm je jezelf als buitenlandse koper?",
  "Financiering in Spanje: mogelijkheden, vereisten en valkuilen.",
  "Jouw vragen, onze eerlijke antwoorden – in kleine groep."
];

interface InfoavondWaaromProps {
  hasEvents?: boolean;
}

export function InfoavondWaarom({ hasEvents = true }: InfoavondWaaromProps) {
  const scrollToRegistration = () => {
    const element = document.getElementById('registratie');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left column - Content */}
          <div className="space-y-8">
            <div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Wat leer je tijdens deze avond?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Geen verkooppraatjes, maar eerlijke informatie. We bespreken de kansen én de risico's, zodat jij een weloverwogen beslissing kunt nemen.
              </p>
            </div>
            
            <div className="space-y-4">
              {learningPoints.map((point, index) => (
                <div key={index} className="flex gap-4 items-start">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-primary-foreground font-semibold text-sm shadow-md">
                    {index + 1}
                  </div>
                  <p className="text-foreground pt-1">{point}</p>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <Button 
                size="lg" 
                onClick={scrollToRegistration}
                className="group shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {hasEvents ? "Ja, ik wil me inschrijven" : "Hou me op de hoogte"}
                <ArrowDown className="ml-2 h-4 w-4 transition-transform group-hover:translate-y-1" />
              </Button>
              <p className="text-sm text-muted-foreground mt-3 flex items-center gap-2">
                <span className="text-primary">✓</span> Laat je portemonnee thuis – deze avond draait puur om kennis.
              </p>
            </div>
          </div>
          
          {/* Right column - Video */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-xl opacity-50" />
            <div className="relative aspect-video md:aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl bg-muted ring-1 ring-border/50">
              <video
                src="https://storage.googleapis.com/msgsndr/nE3PBl88odKh2Kdr7Njt/media/68c150c56462635f3c399d97.mp4"
                controls
                preload="metadata"
                className="w-full h-full object-cover"
              >
                Je browser ondersteunt geen video.
              </video>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
