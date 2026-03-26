import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import { DashboardROICalculator } from "@/components/DashboardROICalculator";
import { QuickROICalculator } from "@/components/roi/QuickROICalculator";
import { DashboardBackToOntdekken } from "@/components/dashboard/DashboardBackToOntdekken";
import { Button } from "@/components/ui/button";
import { Zap, Settings2 } from "lucide-react";
import { ProjectWithRental } from "@/hooks/useProjectsWithRentalData";
import { PRESETS, ROIPreset } from "@/components/roi/ROIPresetSelector";

export default function ROICalculator() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") === "advanced" ? "advanced" : "quick";
  const [mode, setMode] = useState<"quick" | "advanced">(initialMode);

  // Lifted state from QuickROICalculator - persists across mode switches
  const [selectedProject, setSelectedProject] = useState<ProjectWithRental | null>(null);
  const [manualPrice, setManualPrice] = useState(250000);
  const [selectedPreset, setSelectedPreset] = useState<string>("moderate");
  const [presetValues, setPresetValues] = useState<ROIPreset>(PRESETS.moderate);

  const handleModeSwitch = (newMode: "quick" | "advanced") => {
    setMode(newMode);
    if (newMode === "advanced") {
      setSearchParams({ mode: "advanced" });
    } else {
      setSearchParams({});
    }
  };

  const handlePresetSelect = (preset: ROIPreset) => {
    setPresetValues(preset);
    const presetKey = Object.entries(PRESETS).find(
      ([_, p]) => 
        p.yearlyAppreciation === preset.yearlyAppreciation && 
        p.occupancyRate === preset.occupancyRate
    )?.[0];
    setSelectedPreset(presetKey || "moderate");
  };

  // Derive initial values for advanced calculator from quick mode selection
  const deriveRegion = (): "murcia" | "alicante" => {
    if (!selectedProject?.region) return "murcia";
    const region = selectedProject.region.toLowerCase();
    if (region.includes("alicante") || region.includes("costa blanca")) {
      return "alicante";
    }
    return "murcia";
  };

  const deriveRentalData = () => {
    if (!selectedProject?.rentalData) return undefined;
    
    const adr = selectedProject.rentalData.average_daily_rate || 100;
    return {
      occupancyRate: selectedProject.rentalData.occupancy || presetValues.occupancyRate,
      lowSeasonRate: Math.round(adr * 0.7), // Estimate low season at 70% of ADR
      highSeasonRate: Math.round(adr * 1.3), // Estimate high season at 130% of ADR
    };
  };

  return (
    <>
      <div className="space-y-6">
        <DashboardBackToOntdekken />
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Rendement Calculator</h1>
            <p className="text-muted-foreground">
              {mode === "quick" 
                ? "Snel inzicht in het rendementspotentieel van je investering"
                : "Gedetailleerde analyse met volledige controle over alle parameters"
              }
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <Button
              variant={mode === "quick" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleModeSwitch("quick")}
              className="gap-1.5"
            >
              <Zap className="h-4 w-4" />
              Snelle Analyse
            </Button>
            <Button
              variant={mode === "advanced" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleModeSwitch("advanced")}
              className="gap-1.5"
            >
              <Settings2 className="h-4 w-4" />
              Gedetailleerd
            </Button>
          </div>
        </div>

        {mode === "quick" ? (
          <QuickROICalculator 
            selectedProject={selectedProject}
            onSelectProject={setSelectedProject}
            manualPrice={manualPrice}
            onManualPriceChange={setManualPrice}
            selectedPreset={selectedPreset}
            presetValues={presetValues}
            onSelectPreset={handlePresetSelect}
            onSwitchToAdvanced={() => handleModeSwitch("advanced")} 
          />
        ) : (
          <DashboardROICalculator 
            initialPurchasePrice={selectedProject?.price_from || manualPrice}
            initialRegion={deriveRegion()}
            initialRentalData={deriveRentalData()}
            selectedProject={selectedProject}
            onSwitchToQuick={() => handleModeSwitch("quick")} 
          />
        )}
      </div>
    </>
  );
}
