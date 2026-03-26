import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, Percent, Euro, Wallet, Building, AlertTriangle, Scale, CheckCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ROILiveSummaryProps {
  annualROI: number;
  totalROI: number;
  investmentYears: number;
  netRentalYield: number;
  averageCashflow: number;
  totalReturn: number;
  futureValue: number;
  totalInvestment: number;
  useMortgage: boolean;
  annualROE?: number;
  returnOnEquity?: number;
  equityInvestment?: number;
  formatCurrency: (value: number) => string;
  // Optional risk indicator props
  yearlyAppreciation?: number;
  occupancyRate?: number;
  rentalGrowthRate?: number;
}

type RiskLevel = "conservatief" | "gemiddeld" | "optimistisch";

function assessRiskLevel(
  yearlyAppreciation: number,
  occupancyRate: number,
  rentalGrowthRate: number
): RiskLevel {
  let score = 0;

  // Waardestijging
  if (yearlyAppreciation > 5) score += 2;
  else if (yearlyAppreciation > 3) score += 1;

  // Bezettingsgraad
  if (occupancyRate > 68) score += 2;
  else if (occupancyRate > 55) score += 1;

  // Huurgroei
  if (rentalGrowthRate > 4.5) score += 2;
  else if (rentalGrowthRate > 3) score += 1;

  if (score <= 1) return "conservatief";
  if (score <= 3) return "gemiddeld";
  return "optimistisch";
}

export function ROILiveSummary({
  annualROI,
  totalROI,
  investmentYears,
  netRentalYield,
  averageCashflow,
  totalReturn,
  futureValue,
  totalInvestment,
  useMortgage,
  annualROE,
  returnOnEquity,
  equityInvestment,
  formatCurrency,
  yearlyAppreciation,
  occupancyRate,
  rentalGrowthRate,
}: ROILiveSummaryProps) {
  const isPositive = totalReturn > 0;
  const cashflowPositive = averageCashflow > 0;

  // Mini risk indicator
  const showRisk = yearlyAppreciation !== undefined && occupancyRate !== undefined && rentalGrowthRate !== undefined;
  const riskLevel = showRisk ? assessRiskLevel(yearlyAppreciation, occupancyRate, rentalGrowthRate) : null;

  const riskConfig = {
    conservatief: {
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/50",
      icon: CheckCircle,
    },
    gemiddeld: {
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-100 dark:bg-amber-900/50",
      icon: Info,
    },
    optimistisch: {
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-900/50",
      icon: AlertTriangle,
    },
  };

  return (
    <Card className="bg-gradient-to-br from-card to-muted/30 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Live Resultaten
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary ROI */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {useMortgage ? "ROI (op totaal)" : "Jaarlijks ROI"}
            </span>
            <Badge variant={annualROI >= 5 ? "default" : "secondary"} className="text-xs">
              {annualROI >= 5 ? "Sterk" : "Matig"}
            </Badge>
          </div>
          <div className="text-2xl font-bold text-primary">
            {annualROI.toFixed(1)}%
            <span className="text-sm font-normal text-muted-foreground"> / jaar</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Totaal: {totalROI.toFixed(1)}% over {investmentYears} jaar
          </p>
        </div>

        {/* ROE for mortgage */}
        {useMortgage && annualROE !== undefined && (
          <>
            <Separator />
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">ROE (eigen vermogen)</span>
              <div className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                {annualROE.toFixed(1)}%
                <span className="text-sm font-normal text-muted-foreground"> / jaar</span>
              </div>
              {equityInvestment && (
                <p className="text-xs text-muted-foreground">
                  Op {formatCurrency(equityInvestment)} eigen inbreng
                </p>
              )}
            </div>
          </>
        )}

        <Separator />

        {/* Cashflow */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Euro className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Gem. Cashflow</span>
          </div>
          <div className={`text-lg font-semibold ${cashflowPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {formatCurrency(averageCashflow)} / jaar
          </div>
        </div>

        {/* Net Rental Yield */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Percent className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Netto Huurrendement</span>
          </div>
          <div className="text-lg font-semibold">
            {netRentalYield.toFixed(2)}%
          </div>
        </div>

        <Separator />

        {/* Future Value */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Building className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Waarde na {investmentYears} jaar</span>
          </div>
          <div className="text-lg font-semibold">
            {formatCurrency(futureValue)}
          </div>
        </div>

        {/* Total Return */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-1.5 mb-1">
            <Wallet className="h-3.5 w-3.5 text-primary" />
            <span className="text-sm font-medium">Totale Winst</span>
          </div>
          <div className={`text-xl font-bold ${isPositive ? "text-primary" : "text-destructive"}`}>
            {formatCurrency(totalReturn)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Huur + waardestijging - kosten
          </p>
        </div>

        {/* Mini Risk Indicator */}
        {showRisk && riskLevel && (
          <>
            <Separator />
            <div className={cn(
              "flex items-center gap-2 p-2 rounded-lg",
              riskConfig[riskLevel].bgColor
            )}>
              <Scale className={cn("h-4 w-4", riskConfig[riskLevel].color)} />
              <div className="flex-1">
                <span className={cn("text-sm font-medium capitalize", riskConfig[riskLevel].color)}>
                  {riskLevel}
                </span>
                <p className="text-xs text-muted-foreground">aannames</p>
              </div>
            </div>
          </>
        )}

        {/* Warning if negative */}
        {!isPositive && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-destructive/10 text-destructive text-xs">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              Pas de parameters aan voor een positief rendement
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
