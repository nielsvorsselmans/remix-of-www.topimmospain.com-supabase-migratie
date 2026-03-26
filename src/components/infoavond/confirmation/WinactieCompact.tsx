import { Sparkles, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const WinactieCompact = () => {
  return (
    <Card className="border-amber-200/50 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10 dark:border-amber-800/30">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground">
                  Exclusieve Winactie
                </h3>
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <Check className="w-3 h-3 mr-1" />
                  Je doet mee
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Door aanwezig te zijn maak je kans op een volledig verzorgde 
                <span className="font-medium text-foreground"> oriëntatiereis voor 2 personen</span> naar de Costa Cálida.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-amber-200/50 dark:border-amber-800/30">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Incl. vluchten, verblijf, bezoeken aan projecten en persoonlijke begeleiding
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
