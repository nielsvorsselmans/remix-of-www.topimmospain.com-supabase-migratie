import { Card } from "@/components/ui/card";
import { Phone } from "lucide-react";
import larsProfile from "@/assets/lars-profile.webp";

interface PurchaseClosingCTAProps {
  hasMultipleSales?: boolean;
}

export const PurchaseClosingCTA = ({ hasMultipleSales = false }: PurchaseClosingCTAProps) => {
  return (
    <Card className="bg-muted/50 border-none">
      <div className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start gap-6">
          {/* Grotere foto links */}
          <div className="flex-shrink-0">
            <img 
              src={larsProfile} 
              alt="Lars" 
              className="h-40 w-40 object-cover rounded-xl shadow-sm"
            />
          </div>

          {/* Content rechts */}
          <div className="flex-1">
            <h3 className="text-xl font-semibold mb-2">
              We kijken ernaar uit
            </h3>
            <p className="text-muted-foreground mb-4">
              {hasMultipleSales 
                ? "We kijken er enorm naar uit om je woningen verder klaar te maken en je gelukkig te zien wanneer alles helemaal af is. Bij elke stap staan we voor je klaar."
                : "We kijken er enorm naar uit om je woning verder klaar te maken en je gelukkig te zien wanneer alles helemaal af is. Tot snel!"
              }
            </p>
            <p className="text-sm font-medium italic text-muted-foreground mb-4">
              — Lars van Viva Vastgoed
            </p>
            
            {/* Contact info */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>Vragen?</span>
              <a href="tel:+34621394859" className="text-primary hover:underline font-medium">
                +34 621 394 859
              </a>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};