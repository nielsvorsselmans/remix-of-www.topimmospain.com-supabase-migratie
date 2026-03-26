import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, Info, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

interface ROIRiskIndicatorProps {
  yearlyAppreciation: number;
  occupancyRate: number;
  rentalGrowthRate: number;
}

interface RiskAssessment {
  level: "conservatief" | "gemiddeld" | "optimistisch";
  score: number;
  factors: { label: string; status: "ok" | "warning" | "high"; message: string }[];
}

function assessRisk(
  yearlyAppreciation: number,
  occupancyRate: number,
  rentalGrowthRate: number
): RiskAssessment {
  let score = 0;
  const factors: RiskAssessment["factors"] = [];

  // Waardestijging assessment - aligned with presets (3%, 4%, 6%)
  if (yearlyAppreciation <= 3) {
    factors.push({
      label: `Waardestijging ${yearlyAppreciation}%`,
      status: "ok",
      message: "Conservatief, onder historisch gemiddelde",
    });
  } else if (yearlyAppreciation <= 5) {
    score += 1;
    factors.push({
      label: `Waardestijging ${yearlyAppreciation}%`,
      status: "warning",
      message: "Gemiddeld, past bij historische marktontwikkeling",
    });
  } else {
    score += 2;
    factors.push({
      label: `Waardestijging ${yearlyAppreciation}%`,
      status: "high",
      message: "Optimistisch - sterke markt aanname",
    });
  }

  // Bezettingsgraad assessment - aligned with presets (55%, 65%, 72%)
  if (occupancyRate <= 55) {
    factors.push({
      label: `Bezetting ${occupancyRate}%`,
      status: "ok",
      message: "Conservatief, haalbaar met standaard verhuur",
    });
  } else if (occupancyRate <= 68) {
    score += 1;
    factors.push({
      label: `Bezetting ${occupancyRate}%`,
      status: "warning",
      message: "Gemiddeld, realistisch met actief beheer",
    });
  } else {
    score += 2;
    factors.push({
      label: `Bezetting ${occupancyRate}%`,
      status: "high",
      message: "Optimistisch - vereist toplocatie en professioneel beheer",
    });
  }

  // Huurgroei assessment - aligned with presets (3%, 4%, 5%)
  if (rentalGrowthRate <= 3) {
    factors.push({
      label: `Huurgroei ${rentalGrowthRate}%`,
      status: "ok",
      message: "Conservatief, in lijn met inflatie",
    });
  } else if (rentalGrowthRate <= 4.5) {
    score += 1;
    factors.push({
      label: `Huurgroei ${rentalGrowthRate}%`,
      status: "warning",
      message: "Gemiddeld marktniveau",
    });
  } else {
    score += 2;
    factors.push({
      label: `Huurgroei ${rentalGrowthRate}%`,
      status: "high",
      message: "Optimistisch - afhankelijk van sterke vraag",
    });
  }

  let level: RiskAssessment["level"];
  if (score <= 1) level = "conservatief";
  else if (score <= 3) level = "gemiddeld";
  else level = "optimistisch";

  return { level, score, factors };
}

export function ROIRiskIndicator({
  yearlyAppreciation,
  occupancyRate,
  rentalGrowthRate,
}: ROIRiskIndicatorProps) {
  const assessment = assessRisk(yearlyAppreciation, occupancyRate, rentalGrowthRate);
  
  const levelConfig = {
    conservatief: {
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500",
      position: "left-[15%]",
    },
    gemiddeld: {
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500",
      position: "left-[50%]",
    },
    optimistisch: {
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-500",
      position: "left-[85%]",
    },
  };

  const config = levelConfig[assessment.level];

  return (
    <Card className="border-muted">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Risicoanalyse van je aannames</span>
        </div>

        {/* Visual indicator bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Conservatief</span>
            <span>Gemiddeld</span>
            <span>Optimistisch</span>
          </div>
          <div className="relative h-2 bg-gradient-to-r from-emerald-200 via-amber-200 to-orange-200 rounded-full dark:from-emerald-900/50 dark:via-amber-900/50 dark:to-orange-900/50">
            <div
              className={cn(
                "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white dark:border-background shadow-md transition-all duration-300",
                config.bgColor,
                config.position
              )}
            />
          </div>
        </div>

        {/* Factor breakdown */}
        <div className="space-y-2">
          {assessment.factors.map((factor, index) => (
            <div
              key={index}
              className={cn(
                "flex items-start gap-2 text-xs p-2 rounded-md",
                factor.status === "ok" && "bg-emerald-50 dark:bg-emerald-950/20",
                factor.status === "warning" && "bg-amber-50 dark:bg-amber-950/20",
                factor.status === "high" && "bg-orange-50 dark:bg-orange-950/20"
              )}
            >
              {factor.status === "ok" && (
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
              )}
              {factor.status === "warning" && (
                <Info className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              )}
              {factor.status === "high" && (
                <AlertTriangle className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <span className="font-medium">{factor.label}:</span>{" "}
                <span className="text-muted-foreground">{factor.message}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
