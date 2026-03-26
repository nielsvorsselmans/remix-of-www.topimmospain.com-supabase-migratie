import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingDown, TrendingUp, Zap, Target } from "lucide-react";

export interface ROIPreset {
  yearlyAppreciation: number;
  occupancyRate: number;
  rentalGrowthRate: number;
  managementFee: number;
}

const PRESETS: Record<string, ROIPreset & { label: string; description: string; icon: React.ReactNode }> = {
  conservative: {
    label: "Conservatief",
    description: "Veilige aannames",
    icon: <TrendingDown className="h-4 w-4" />,
    yearlyAppreciation: 3,
    occupancyRate: 55,
    rentalGrowthRate: 3,
    managementFee: 22,
  },
  moderate: {
    label: "Gemiddeld",
    description: "Realistische markt",
    icon: <Target className="h-4 w-4" />,
    yearlyAppreciation: 4,
    occupancyRate: 65,
    rentalGrowthRate: 4,
    managementFee: 20,
  },
  optimistic: {
    label: "Optimistisch",
    description: "Sterke markt",
    icon: <TrendingUp className="h-4 w-4" />,
    yearlyAppreciation: 6,
    occupancyRate: 72,
    rentalGrowthRate: 5,
    managementFee: 18,
  },
};

interface ROIPresetSelectorProps {
  onSelectPreset: (preset: ROIPreset) => void;
  selectedPreset?: string | null;
}

export function ROIPresetSelector({ onSelectPreset, selectedPreset }: ROIPresetSelectorProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Kies een startpunt voor je berekening</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(PRESETS).map(([key, preset]) => (
            <Button
              key={key}
              variant={selectedPreset === key ? "default" : "outline"}
              size="sm"
              className="flex flex-col h-auto py-3 px-2"
              onClick={() => onSelectPreset(preset)}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {preset.icon}
                <span className="text-xs font-semibold">{preset.label}</span>
              </div>
              <div className="text-[10px] text-muted-foreground opacity-80 leading-tight">
                {preset.yearlyAppreciation}% groei · {preset.occupancyRate}% bezet
              </div>
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Of pas alle parameters handmatig aan hieronder
        </p>
      </CardContent>
    </Card>
  );
}

export { PRESETS };
