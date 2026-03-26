import { TrendingUp, Euro, Building, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

interface ROICompactHeaderProps {
  annualROI: number;
  averageCashflow: number;
  futureValue: number;
  totalReturn: number;
  investmentYears: number;
  useMortgage: boolean;
  annualROE?: number;
  equityInvestment?: number;
  formatCurrency: (value: number) => string;
}

export function ROICompactHeader({
  annualROI,
  averageCashflow,
  futureValue,
  totalReturn,
  investmentYears,
  useMortgage,
  annualROE,
  equityInvestment,
  formatCurrency,
}: ROICompactHeaderProps) {
  const displayROI = useMortgage && annualROE ? annualROE : annualROI;
  const roiLabel = useMortgage ? "ROE" : "ROI";
  const isPositive = totalReturn > 0;
  const isCashflowPositive = averageCashflow > 0;

  return (
    <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted/50 border">
      {/* ROI */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-background border">
        <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        <div className="text-sm">
          <span className="text-muted-foreground">{roiLabel}:</span>{" "}
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {displayROI.toFixed(1)}%/j
          </span>
        </div>
      </div>

      {/* Cashflow */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-background border">
        <Euro className={cn("h-4 w-4", isCashflowPositive ? "text-blue-600 dark:text-blue-400" : "text-destructive")} />
        <div className="text-sm">
          <span className="text-muted-foreground">Cashflow:</span>{" "}
          <span className={cn("font-semibold", isCashflowPositive ? "text-blue-600 dark:text-blue-400" : "text-destructive")}>
            {formatCurrency(averageCashflow)}/j
          </span>
        </div>
      </div>

      {/* Future Value */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-background border">
        <Building className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <div className="text-sm">
          <span className="text-muted-foreground">Waarde {investmentYears}j:</span>{" "}
          <span className="font-semibold text-amber-600 dark:text-amber-400">
            {formatCurrency(futureValue)}
          </span>
        </div>
      </div>

      {/* Total Return */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-background border">
        <Wallet className={cn("h-4 w-4", isPositive ? "text-violet-600 dark:text-violet-400" : "text-destructive")} />
        <div className="text-sm">
          <span className="text-muted-foreground">Winst:</span>{" "}
          <span className={cn("font-semibold", isPositive ? "text-violet-600 dark:text-violet-400" : "text-destructive")}>
            {formatCurrency(totalReturn)}
          </span>
        </div>
      </div>
    </div>
  );
}
