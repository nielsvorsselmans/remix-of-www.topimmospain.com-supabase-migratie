import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useClarity } from "@/hooks/useClarity";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Eye, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PortalTestimonials } from "@/components/PortalTestimonials";
import { PortalOutcomePromises } from "@/components/PortalOutcomePromises";
import { PortalHowItWorks } from "@/components/PortalHowItWorks";
import { PortalClosingCTA } from "@/components/PortalClosingCTA";
import { PortalHeroForm } from "@/components/PortalHeroForm";
import larsProfile from "@/assets/lars-profile.webp";
import heroImage from "@/assets/hero-property.jpg";

export default function Portaal() {
  const { session, loading, isAdmin, isPartner, isAdvocaat, rolesLoaded } = useAuth();
  const navigate = useNavigate();
  const { trackEvent } = useClarity();
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && session && rolesLoaded && !isAdmin) {
      if (isPartner) {
        navigate("/partner/dashboard");
      } else if (isAdvocaat) {
        navigate("/advocaat/dashboard");
      } else {
        navigate("/dashboard");
      }
    }
  }, [session, loading, rolesLoaded, isAdmin, isPartner, isAdvocaat, navigate]);

  useEffect(() => {
    trackEvent("page_view", { page: "portaal" });
  }, [trackEvent]);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {isAdmin && session && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">
              Je bekijkt deze pagina als admin
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="h-7 text-amber-950 hover:bg-amber-600 hover:text-amber-950"
          >
            Ga naar dashboard
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
      <Navbar />

      <main className="flex-1">
        {/* Hero — Value proposition + Lars intro */}
        <section
          className="relative py-20 sm:py-24 md:py-32 overflow-hidden"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.75)), url(${heroImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center animate-fade-in space-y-6">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white drop-shadow-2xl">
                Ontdek wat bij <span className="text-primary">jouw situatie</span> past
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-white/90 leading-relaxed max-w-2xl mx-auto drop-shadow-lg">
                In je persoonlijke omgeving help ik je stap voor stap. Je ontdekt welke regio, welk budget en welk type investering bij jou past — op jouw tempo, zonder verplichtingen.
              </p>

              {/* Lars intro */}
              <div className="flex items-center justify-center gap-4 pt-4">
                <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-primary/40 flex-shrink-0">
                  <img
                    src={larsProfile}
                    alt="Lars van Viva Vastgoed"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-white/80 text-sm sm:text-base text-left max-w-md">
                  <span className="font-semibold text-white">Lars</span> — "Ik begeleid je persoonlijk. Geen verkooppraatjes, wel eerlijk advies."
                </p>
              </div>

              <button
                onClick={scrollToForm}
                className="inline-flex items-center gap-2 mt-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-3.5 rounded-lg text-base transition-colors"
              >
                Start je oriëntatie
              </button>
            </div>
          </div>
        </section>

        {/* Outcome Promises */}
        <PortalOutcomePromises />

        {/* How It Works */}
        <PortalHowItWorks />

        {/* Registration Form Section */}
        <section ref={formRef} data-portal-form className="py-16 sm:py-20 bg-gradient-to-b from-muted/30 to-background">
          <div className="container max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
                Start je persoonlijke oriëntatie
              </h2>
              <p className="text-muted-foreground">
                Maak een gratis account aan — het duurt maar 30 seconden.
              </p>
            </div>

            <Card className="p-6 sm:p-8 bg-card border-border shadow-lg">
              <PortalHeroForm />
            </Card>
          </div>
        </section>

        {/* Testimonials */}
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <PortalTestimonials />
        </div>

        {/* Closing CTA */}
        <PortalClosingCTA />
      </main>

      <Footer />
    </div>
  );
}
