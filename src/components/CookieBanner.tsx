import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCookieConsent, setCookieConsent, hasConsentChoice } from "@/lib/tracking";

export const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    if (!hasConsentChoice()) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    setCookieConsent("accepted");
    setIsVisible(false);
  };

  const handleDecline = () => {
    setCookieConsent("declined");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-fade-in">
      <div className="bg-card border-t border-primary/20 shadow-elegant">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Text section */}
            <div className="flex items-start gap-3 text-center sm:text-left flex-1">
              <Cookie className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  Wij gebruiken cookies om uw ervaring te personaliseren. Bij weigeren kunnen wij u geen persoonlijke aanbevelingen doen.{" "}
                  <Link 
                    to="/cookies" 
                    className="text-primary hover:underline font-medium"
                  >
                    Meer informatie
                  </Link>
                </p>
              </div>
            </div>
            
            {/* Buttons section */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <button 
                onClick={handleDecline} 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Weigeren
              </button>
              <Button onClick={handleAccept} size="sm">
                Akkoord
              </Button>
              <button
                onClick={handleAccept}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                aria-label="Sluiten"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
