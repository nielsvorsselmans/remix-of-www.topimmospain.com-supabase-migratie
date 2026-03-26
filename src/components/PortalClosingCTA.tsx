import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";
import larsProfile from "@/assets/lars-profile.webp";

export function PortalClosingCTA() {
  const scrollToForm = () => {
    // Scroll to the registration form section
    const formSection = document.querySelector('[data-portal-form]') || 
      document.querySelector('section:has(.card)');
    if (formSection) {
      formSection.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <section className="py-16 sm:py-20 bg-gradient-to-br from-muted/30 to-background">
      <div className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-[140px_1fr] gap-6 md:gap-8 items-center">
          {/* Photo */}
          <div className="flex justify-center md:justify-start">
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden ring-4 ring-primary/20">
              <img
                src={larsProfile}
                alt="Lars van Viva Vastgoed"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Content */}
          <div className="text-center md:text-left space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              Begin je oriëntatie
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Maak een gratis account en ontdek op jouw tempo wat bij je past. Je krijgt persoonlijke inzichten, relevante projecten en eerlijk advies — zonder verplichtingen.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button size="lg" onClick={scrollToForm} className="w-full sm:w-auto">
                <ArrowUp className="mr-2 h-4 w-4" />
                Start je oriëntatie
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground pt-2">
              <span>✓ Gratis</span>
              <span>✓ Geen creditcard nodig</span>
              <span>✓ Direct toegang</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
