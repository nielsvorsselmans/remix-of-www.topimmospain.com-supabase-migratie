import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface RegionalComparisonProps {
  projectRate: number;
  regionAvgRate: number;
  projectOccupancy: number;
  regionAvgOccupancy: number;
  currency?: string;
}

export function RegionalComparison({
  projectRate,
  regionAvgRate,
  projectOccupancy,
  regionAvgOccupancy,
  currency = 'EUR'
}: RegionalComparisonProps) {
  const currencySymbol = currency === 'EUR' ? '€' : currency;
  
  // Calculate differences
  const rateDiff = regionAvgRate > 0 
    ? ((projectRate - regionAvgRate) / regionAvgRate) * 100 
    : 0;
  const occupancyDiff = projectOccupancy - regionAvgOccupancy;

  const getIndicator = (diff: number) => {
    if (diff > 2) return { icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-100" };
    if (diff < -2) return { icon: TrendingDown, color: "text-rose-600", bg: "bg-rose-100" };
    return { icon: Minus, color: "text-amber-600", bg: "bg-amber-100" };
  };

  const rateIndicator = getIndicator(rateDiff);
  const occupancyIndicator = getIndicator(occupancyDiff);

  const maxRate = Math.max(projectRate, regionAvgRate);
  const maxOccupancy = Math.max(projectOccupancy, regionAvgOccupancy);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Hoe presteert deze locatie?</h3>
      
      <div className="space-y-5">
        {/* Nightly Rate Comparison */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Gemiddelde nachtprijs</span>
            <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", rateIndicator.bg, rateIndicator.color)}>
              <rateIndicator.icon className="h-3 w-3" />
              {rateDiff > 0 ? '+' : ''}{rateDiff.toFixed(0)}%
            </div>
          </div>
          
          <div className="space-y-1.5">
            {/* Project bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-6 bg-muted rounded-md overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-md flex items-center justify-end px-2"
                  style={{ width: `${(projectRate / maxRate) * 100}%` }}
                >
                  <span className="text-xs font-semibold text-primary-foreground">
                    {currencySymbol}{projectRate}
                  </span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground w-20">Dit project</span>
            </div>
            
            {/* Region bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-6 bg-muted rounded-md overflow-hidden">
                <div 
                  className="h-full bg-muted-foreground/30 rounded-md flex items-center justify-end px-2"
                  style={{ width: `${(regionAvgRate / maxRate) * 100}%` }}
                >
                  <span className="text-xs font-medium text-foreground">
                    {currencySymbol}{regionAvgRate}
                  </span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground w-20">Regio gem.</span>
            </div>
          </div>
        </div>

        {/* Occupancy Comparison */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Bezettingsgraad</span>
            <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", occupancyIndicator.bg, occupancyIndicator.color)}>
              <occupancyIndicator.icon className="h-3 w-3" />
              {occupancyDiff > 0 ? '+' : ''}{occupancyDiff.toFixed(0)}pt
            </div>
          </div>
          
          <div className="space-y-1.5">
            {/* Project bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-6 bg-muted rounded-md overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-md flex items-center justify-end px-2"
                  style={{ width: `${(projectOccupancy / (maxOccupancy || 100)) * 100}%` }}
                >
                  <span className="text-xs font-semibold text-primary-foreground">
                    {projectOccupancy}%
                  </span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground w-20">Dit project</span>
            </div>
            
            {/* Region bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-6 bg-muted rounded-md overflow-hidden">
                <div 
                  className="h-full bg-muted-foreground/30 rounded-md flex items-center justify-end px-2"
                  style={{ width: `${(regionAvgOccupancy / (maxOccupancy || 100)) * 100}%` }}
                >
                  <span className="text-xs font-medium text-foreground">
                    {regionAvgOccupancy}%
                  </span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground w-20">Regio gem.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
