import { SharedROICalculator } from "@/components/roi/SharedROICalculator";
import { ROIProjectHeroCard } from "@/components/roi/ROIProjectHeroCard";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { ProjectWithRental } from "@/hooks/useProjectsWithRentalData";

interface DashboardROICalculatorProps {
  initialPurchasePrice?: number;
  initialRegion?: "murcia" | "alicante";
  initialRentalData?: {
    occupancyRate?: number;
    lowSeasonRate?: number;
    highSeasonRate?: number;
  };
  selectedProject?: ProjectWithRental | null;
  onSwitchToQuick?: () => void;
}

export function DashboardROICalculator({ 
  initialPurchasePrice,
  initialRegion,
  initialRentalData,
  selectedProject,
  onSwitchToQuick 
}: DashboardROICalculatorProps) {
  return (
    <div className="space-y-4">
      {/* Back button */}
      {onSwitchToQuick && (
        <Button
          variant="outline"
          size="sm"
          onClick={onSwitchToQuick}
          className="gap-1.5"
        >
          <Zap className="h-4 w-4" />
          Terug naar Snelle Analyse
        </Button>
      )}

      {/* Project Hero Card - maintains context when switching modes */}
      {selectedProject && (
        <ROIProjectHeroCard project={selectedProject} />
      )}

      {/* Advanced Calculator */}
      <SharedROICalculator
        initialPurchasePrice={initialPurchasePrice}
        initialRegion={initialRegion}
        initialRentalData={initialRentalData}
        showPropertySelector={false}
        showMarketDataBadge={!!initialRentalData}
      />
    </div>
  );
}
