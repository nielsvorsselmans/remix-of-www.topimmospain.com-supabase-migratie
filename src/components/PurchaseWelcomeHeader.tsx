import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import larsProfile from "@/assets/lars-profile.webp";

const PHASE_LABELS: Record<string, string> = {
  reservatie: "Reservatie",
  koopcontract: "Koopcontract",
  voorbereiding: "Voorbereiding",
  akkoord: "Akkoord",
  overdracht: "Overdracht",
};

interface PurchaseWelcomeHeaderProps {
  firstName?: string;
  salesCount?: number;
  activePhase?: string;
  activePhaseIndex?: number;
}

export const PurchaseWelcomeHeader = ({ 
  firstName, 
  salesCount = 1, 
  activePhase, 
  activePhaseIndex 
}: PurchaseWelcomeHeaderProps) => {
  const hasMultipleSales = salesCount > 1;

  const getMessage = () => {
    if (hasMultipleSales) {
      return `Je hebt ${salesCount} lopende aankopen. Hieronder zie je de voortgang van elk traject.`;
    }
    if (activePhase && activePhaseIndex !== undefined) {
      const phaseLabel = PHASE_LABELS[activePhase] || activePhase;
      return `Je bent nu in de fase ${phaseLabel} — stap ${activePhaseIndex + 1} van 5 richting je sleuteloverdracht.`;
    }
    return "Hier vind je een overzicht van je aankooptraject. We begeleiden je stap voor stap naar de sleuteloverdracht.";
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-muted/20">
      <CardContent className="p-6">
        <div className="flex gap-4 items-start">
          <Avatar className="h-12 w-12 border-2 border-primary/20 shrink-0">
            <AvatarImage src={larsProfile} alt="Lars" className="object-cover" />
            <AvatarFallback>LV</AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-1">
              Welkom terug{firstName ? `, ${firstName}` : ''}!
            </h2>
            <p className="text-muted-foreground text-sm">
              {getMessage()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
