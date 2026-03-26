import { OrientationGuide } from "@/components/orientation";
import { Lightbulb } from "lucide-react";

export const InfoavondOrientationTab = () => {
  return (
    <div className="space-y-6">
      {/* Intro text */}
      <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">Bereid je goed voor</p>
            <p className="text-xs text-muted-foreground mt-1">
              Tijdens de infoavond bespreken we 4 belangrijke pijlers: regio's, financiering, 
              juridische zaken en fiscaliteit. Lees je in via onderstaande artikelen zodat je 
              gerichte vragen kunt stellen.
            </p>
          </div>
        </div>
      </div>

      {/* Orientation Guide */}
      <OrientationGuide showHeader={false} />
    </div>
  );
};
