import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Euro, TrendingUp, Calendar, Home, Info, ChevronDown, ChevronUp, Database } from "lucide-react";
import { RentalSeasonalChart } from "./RentalSeasonalChart";
import { RegionalComparison } from "./RegionalComparison";
import { ComparablesMap } from "../ComparablesMap";

// Match the Comparable interface from ComparablesMap
interface Comparable {
  id: string;
  name: string;
  cover_photo_url?: string | null;
  amenities?: string[];
  bedrooms: number;
  bathrooms: number;
  guests: number;
  revenue: {
    monthly_avg: number;
    annual: number;
    currency: string;
  };
  occupancy: {
    rate: number;
  };
  pricing: {
    avg_nightly_rate: number;
  };
  location: {
    city: string;
    distance_km: number;
    latitude: number | null;
    longitude: number | null;
  };
}

interface RentalDataInsightsProps {
  monthlyRevenue: number;
  annualRevenue: number;
  occupancy: number;
  averageDailyRate: number;
  currency: string;
  monthlyDistributions: number[];
  comparables: Comparable[];
  centerLat: number;
  centerLng: number;
  isLoading?: boolean;
  lastUpdated?: string;
}

export function RentalDataInsights({
  monthlyRevenue,
  annualRevenue,
  occupancy,
  averageDailyRate,
  currency,
  monthlyDistributions,
  comparables,
  centerLat,
  centerLng,
  isLoading = false,
  lastUpdated,
}: RentalDataInsightsProps) {
  const [showAllComparables, setShowAllComparables] = useState(false);
  const currencySymbol = currency === 'EUR' ? '€' : currency;

  // Calculate regional averages from comparables
  const { regionAvgRate, regionAvgOccupancy } = useMemo(() => {
    if (!comparables || comparables.length === 0) {
      return { regionAvgRate: averageDailyRate, regionAvgOccupancy: occupancy };
    }

    const rates = comparables
      .map(c => c.pricing?.avg_nightly_rate || 0)
      .filter(r => r > 0);
    const occupancies = comparables
      .map(c => c.occupancy?.rate || 0)
      .filter(o => o > 0);

    return {
      regionAvgRate: rates.length > 0 ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : averageDailyRate,
      regionAvgOccupancy: occupancies.length > 0 ? Math.round(occupancies.reduce((a, b) => a + b, 0) / occupancies.length) : occupancy
    };
  }, [comparables, averageDailyRate, occupancy]);

  const visibleComparables = showAllComparables ? comparables : comparables.slice(0, 5);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Data Source Badge - more compact */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg border border-border text-xs">
        <Database className="h-4 w-4 text-primary flex-shrink-0" />
        <span className="text-foreground">
          <span className="font-medium">{comparables.length} vergelijkbare woningen</span> binnen 5km
        </span>
        <span className="text-muted-foreground ml-auto">
          {lastUpdated ? lastUpdated : 'Airbnb data'}
        </span>
      </div>

      {/* Key Metrics Cards - more compact */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-3 border border-primary/20">
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-medium text-muted-foreground">Maandelijks</span>
          </div>
          <p className="text-lg font-bold text-primary">
            {currencySymbol}{monthlyRevenue?.toLocaleString() ?? '0'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-accent/30 to-accent/10 rounded-lg p-3 border border-accent/40">
          <div className="flex items-center gap-1 mb-1">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-medium text-muted-foreground">Bezetting</span>
          </div>
          <p className="text-lg font-bold text-primary">
            {occupancy ?? 0}%
          </p>
        </div>

        <div className="bg-gradient-to-br from-secondary/30 to-secondary/10 rounded-lg p-3 border border-secondary/40">
          <div className="flex items-center gap-1 mb-1">
            <Euro className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-medium text-muted-foreground">Nachtprijs</span>
          </div>
          <p className="text-lg font-bold text-primary">
            {currencySymbol}{averageDailyRate ?? 0}
          </p>
        </div>
      </div>

      {/* Regional Comparison + Seasonal Chart side by side on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <RegionalComparison
              projectRate={averageDailyRate}
              regionAvgRate={regionAvgRate}
              projectOccupancy={occupancy}
              regionAvgOccupancy={regionAvgOccupancy}
              currency={currency}
            />
          </CardContent>
        </Card>

        {monthlyDistributions && monthlyDistributions.length > 0 && (
          <RentalSeasonalChart
            monthlyDistributions={monthlyDistributions}
            annualRevenue={annualRevenue}
            currency={currency}
            compact
          />
        )}
      </div>

      {/* Reference Properties Section */}
      {comparables && comparables.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Home className="h-4 w-4 text-primary" />
              Referentiewoningen ({comparables.length})
            </h3>
          </div>

          {/* Explanatory text */}
          <p className="text-xs text-muted-foreground">
            De markers tonen vergelijkbare vakantiewoningen in de directe omgeving. Klik op een marker voor details over bezettingsgraad en nachtprijs.
          </p>

          {/* Enlarged map */}
          <div className="h-80 md:h-96 rounded-lg overflow-hidden border border-border shadow-sm">
            <ComparablesMap
              comparables={comparables}
              centerLat={centerLat}
              centerLng={centerLng}
              currency={currency}
            />
          </div>

          {/* Compact table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Naam</th>
                  <th className="text-center px-2 py-2 font-medium">Slk</th>
                  <th className="text-right px-3 py-2 font-medium">Nacht</th>
                  <th className="text-right px-3 py-2 font-medium">Bez.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleComparables.map((comp, idx) => {
                  const rate = comp.pricing?.avg_nightly_rate || 0;
                  const occ = comp.occupancy?.rate || 0;
                  return (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {comp.cover_photo_url && (
                            <img 
                              src={comp.cover_photo_url} 
                              alt=""
                              className="w-8 h-8 rounded object-cover"
                            />
                          )}
                          <span className="truncate max-w-[120px]">{comp.name}</span>
                        </div>
                      </td>
                      <td className="text-center px-2 py-2 text-muted-foreground">{comp.bedrooms}</td>
                      <td className="text-right px-3 py-2 font-medium">{currencySymbol}{Math.round(rate)}</td>
                      <td className="text-right px-3 py-2 text-muted-foreground">{Math.round(occ)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {comparables.length > 5 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllComparables(!showAllComparables)}
              className="w-full text-muted-foreground"
            >
              {showAllComparables ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Toon minder
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Bekijk alle {comparables.length} woningen
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Info note */}
      <div className="flex items-start gap-2 p-3 bg-accent/10 rounded-lg border border-accent/30 text-xs text-muted-foreground">
        <Info className="h-4 w-4 text-accent-foreground flex-shrink-0 mt-0.5" />
        <p>
          Dit zijn schattingen op basis van marktdata. Werkelijke opbrengsten kunnen variëren afhankelijk van seizoen, marketing en beheer.
        </p>
      </div>
    </div>
  );
}
