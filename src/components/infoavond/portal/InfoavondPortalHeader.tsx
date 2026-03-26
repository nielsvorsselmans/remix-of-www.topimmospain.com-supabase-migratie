import { CheckCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface InfoavondPortalHeaderProps {
  firstName: string;
  eventTitle: string;
  isConfirmed: boolean;
}

export function InfoavondPortalHeader({ firstName, eventTitle, isConfirmed }: InfoavondPortalHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-6 md:p-8 border border-primary/20">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {isConfirmed ? (
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-primary" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={isConfirmed ? "default" : "secondary"} className="text-xs">
              {isConfirmed ? "Bevestigd" : "Nog niet bevestigd"}
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {isConfirmed 
              ? `Welkom ${firstName}, je bent ingeschreven!`
              : `Dag ${firstName}, bevestig je inschrijving`
            }
          </h1>
          <p className="text-muted-foreground">
            {isConfirmed 
              ? `Je staat op de gastenlijst voor ${eventTitle}. Hieronder vind je alle praktische informatie.`
              : `Je registratie voor ${eventTitle} is nog niet bevestigd. Check je email voor de bevestigingslink.`
            }
          </p>
        </div>
      </div>
    </div>
  );
}
