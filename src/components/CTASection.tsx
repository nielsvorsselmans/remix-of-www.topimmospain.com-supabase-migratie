import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Compass, Check, HelpCircle } from "lucide-react";
import { useClarity } from "@/hooks/useClarity";
import { useAuth } from "@/hooks/useAuth";
import larsProfile from "@/assets/lars-profile.webp";

export const CTASection = () => {
  const { trackEvent } = useClarity();
  const { user } = useAuth();

  const handleAppointmentClick = () => {
    trackEvent("cta_click", { 
      cta_type: "schedule_appointment",
      location: "cta_section_bottom",
      button_text: "Plan een Oriëntatiegesprek"
    });
  };

  const handlePortalClick = () => {
    trackEvent("cta_click", { 
      cta_type: user ? "open_dashboard" : "open_portal",
      location: "cta_section_bottom",
      button_text: user ? "Naar mijn Dashboard" : "Open jouw Oriëntatie Portaal",
      is_logged_in: !!user
    });
  };

  const commonQuestions = [
    "Welke regio past het beste bij mij?",
    "Welk type vastgoed sluit aan bij mijn doelen?",
    "Wat is de beste manier om dit te financieren?",
    "Is het beter om privé of zakelijk aan te kopen?"
  ];

  return (
    <section className="py-16 bg-gradient-to-br from-primary/5 to-accent/10">
      <div className="container">
        <Card className="overflow-hidden border-primary/20 shadow-xl">
          <CardContent className="p-0">
            <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 items-center">
              {/* Foto sectie */}
              <div className="lg:col-span-1 px-6 py-8 lg:p-12 flex justify-center">
                <div className="relative">
                  <img
                    src={larsProfile}
                    alt="Lars van Top Immo Spain"
                    className="w-48 h-48 lg:w-64 lg:h-64 object-cover rounded-2xl shadow-lg border-4 border-background"
                  />
                  <div className="absolute -bottom-3 -right-3 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                    Lars van Top Immo Spain
                  </div>
                </div>
              </div>

              {/* Content sectie */}
              <div className="lg:col-span-2 px-6 pb-8 lg:p-12 space-y-6 text-center lg:text-left">
                <div className="space-y-3">
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                    Vragen waar je nog geen antwoord op hebt?
                  </h2>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    Een oriëntatiegesprek helpt om je beeld te vormen — niet om je iets te verkopen.
                  </p>
                </div>

                {/* Common questions */}
                <div className="flex justify-center lg:justify-start">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                    {commonQuestions.map((question, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <HelpCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground">{question}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex flex-col lg:flex-row gap-3">
                  <Link 
                    to="/afspraak"
                    onClick={handleAppointmentClick}
                  >
                    <Button 
                      size="lg"
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                    >
                      <Calendar className="mr-2 h-5 w-5" />
                      Plan een Oriëntatiegesprek
                    </Button>
                  </Link>
                  <Link 
                    to={user ? "/dashboard" : "/portaal"}
                    onClick={handlePortalClick}
                  >
                    <Button 
                      size="lg"
                      variant="outline"
                      className="w-full border-2"
                    >
                      <Compass className="mr-2 h-5 w-5" />
                      {user ? "Naar mijn Dashboard" : "Open jouw Oriëntatie Portaal"}
                    </Button>
                  </Link>
                </div>

                {/* Trust badges */}
                <div className="pt-4 border-t border-border">
                  <div className="flex flex-wrap gap-2 items-center justify-center lg:justify-start text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-primary" />
                      30 minuten
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-primary" />
                      Vrijblijvend
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-primary" />
                      Persoonlijk advies
                    </span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground">
                  Heeft u vragen? Neem gerust <Link to="/contact" className="text-primary hover:underline font-medium">contact</Link> met ons op.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
