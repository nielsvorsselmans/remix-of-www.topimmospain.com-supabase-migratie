import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const benefits = [
  "Ontdek welke regio en prijsklasse bij jou passen",
  "Vergelijk woningen die aansluiten bij jouw wensen",
  "Bereken wat een investering je oplevert — en kost",
  "Stel je vragen direct aan je persoonlijke adviseur",
];

interface PortalPreviewSectionProps {
  onSignupOpen: () => void;
}

export const PortalPreviewSection = ({ onSignupOpen }: PortalPreviewSectionProps) => {
  return (
    <section className="py-12 sm:py-16 md:py-24 bg-secondary/30">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
          Jouw persoonlijke startpunt
        </h2>
        <p className="text-base sm:text-lg text-muted-foreground mb-8 sm:mb-10 max-w-xl mx-auto leading-relaxed">
          In je gratis portaal ontdek je rustig wat bij je past — op jouw tempo, zonder verplichtingen.
        </p>

        <div className="flex flex-col gap-3 sm:gap-4 max-w-md mx-auto text-left mb-8 sm:mb-10">
          {benefits.map((benefit) => (
            <div key={benefit} className="flex items-start gap-3">
              <div className="mt-0.5 p-1 rounded-full bg-primary/10 flex-shrink-0">
                <Check className="h-4 w-4 text-primary" />
              </div>
              <span className="text-foreground text-sm sm:text-base leading-relaxed">{benefit}</span>
            </div>
          ))}
        </div>

        <Button
          size="lg"
          onClick={onSignupOpen}
          className="rounded-full px-8 text-base"
        >
          Maak je gratis account aan
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

        <p className="mt-4 text-xs sm:text-sm text-muted-foreground">
          Gratis · Vrijblijvend · Geen verplichtingen
        </p>
      </div>
    </section>
  );
};
