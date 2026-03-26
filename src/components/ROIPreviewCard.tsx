import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, TrendingUp, Calculator, BarChart3, ArrowRight, Calendar, Percent } from "lucide-react";
import { useEffect } from "react";
import { trackEvent } from "@/lib/tracking";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface RentalData {
  averageDailyRate?: number;
  occupancyRate?: number;
  annualRevenue?: number;
}

interface ROIPreviewCardProps {
  projectId: string;
  projectName: string;
  priceFrom?: number | null;
  priceTo?: number | null;
  onSignupClick: () => void;
  rentalData?: RentalData | null;
  isLoadingRental?: boolean;
}

export const ROIPreviewCard = ({ 
  projectId, 
  projectName, 
  priceFrom, 
  priceTo, 
  onSignupClick,
  rentalData,
  isLoadingRental = false
}: ROIPreviewCardProps) => {
  const basePrice = priceFrom || priceTo || 200000;
  
  // Calculate estimated values from rental data or use defaults
  const hasRealData = !!rentalData?.averageDailyRate;
  const averageDailyRate = rentalData?.averageDailyRate || 120;
  const occupancyRate = rentalData?.occupancyRate || 65;
  
  // Calculate annual revenue and yield
  const estimatedAnnualRevenue = Math.round(averageDailyRate * 365 * (occupancyRate / 100));
  const estimatedGrossYield = ((estimatedAnnualRevenue / basePrice) * 100).toFixed(1);
  
  // Net yield after costs (approx 30% costs)
  const estimatedNetYield = (parseFloat(estimatedGrossYield) * 0.7).toFixed(1);

  // Track when card comes into view
  useEffect(() => {
    trackEvent('roi_preview_viewed', {
      project_id: projectId,
      project_name: projectName,
      has_real_data: hasRealData,
    });
  }, [projectId, projectName, hasRealData]);

  const handleClick = () => {
    trackEvent('roi_preview_cta_clicked', {
      project_id: projectId,
      project_name: projectName,
    });
    onSignupClick();
  };


  return (
    <Card className="relative overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-primary/10 to-transparent shadow-elegant">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />
      
      <CardContent className="relative p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-primary/10">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Verhuurpotentieel</h3>
              <p className="text-sm text-muted-foreground">Marktdata voor dit project</p>
            </div>
          </div>
          {hasRealData && (
            <Badge variant="outline" className="text-xs gap-1">
              <BarChart3 className="w-3 h-3" />
              Airbnb data
            </Badge>
          )}
        </div>

        {/* Market data - VISIBLE */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Average daily rate - VISIBLE */}
          <div className="p-4 rounded-lg bg-background/60 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground font-medium">Gem. nachtprijs</span>
            </div>
            {isLoadingRental ? (
              <div className="h-7 bg-muted animate-pulse rounded" />
            ) : (
              <p className="text-xl font-bold text-foreground">
                {formatCurrency(averageDailyRate)}
              </p>
            )}
          </div>

          {/* Occupancy rate - VISIBLE */}
          <div className="p-4 rounded-lg bg-background/60 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground font-medium">Bezettingsgraad</span>
            </div>
            {isLoadingRental ? (
              <div className="h-7 bg-muted animate-pulse rounded" />
            ) : (
              <p className="text-xl font-bold text-foreground">
                {occupancyRate}%
              </p>
            )}
          </div>
        </div>

        {/* Blurred preview metrics - HIDDEN */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Annual rental income - BLURRED */}
          <div className="relative p-4 rounded-lg bg-background/60 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground font-medium">Jaarlijkse huuropbrengst</span>
            </div>
            <div className="relative">
              <p className="text-xl font-bold text-foreground blur-[6px] select-none">
                {formatCurrency(estimatedAnnualRevenue)}
              </p>
              <div className="absolute inset-0 flex items-center justify-center">
                <Lock className="w-5 h-5 text-primary/60" />
              </div>
            </div>
          </div>

          {/* Net yield - BLURRED */}
          <div className="relative p-4 rounded-lg bg-background/60 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground font-medium">Netto rendement</span>
            </div>
            <div className="relative">
              <p className="text-xl font-bold text-foreground blur-[6px] select-none">
                ~{estimatedNetYield}%
              </p>
              <div className="absolute inset-0 flex items-center justify-center">
                <Lock className="w-5 h-5 text-primary/60" />
              </div>
            </div>
          </div>
        </div>

        {/* Teaser text with yield */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
          <p className="text-sm text-foreground">
            Dit project haalt een verwacht{" "}
            <strong className="text-primary">netto rendement van ~{estimatedNetYield}%</strong> per jaar.
            Benieuwd naar de volledige berekening?
          </p>
        </div>

        {/* Teaser list */}
        <div className="space-y-2 mb-6 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Exacte aankoopkosten en belastingen
          </p>
          <p className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Vergelijkbare huurprijzen in de omgeving
          </p>
          <p className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            10-jarige waarde- en rendementsprognose
          </p>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Button 
            size="lg" 
            className="w-full gap-2"
            onClick={handleClick}
          >
            Bereken jouw rendement
            <ArrowRight className="w-4 h-4" />
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Gratis toegang • Geen verplichtingen
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
