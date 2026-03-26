import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileDown, Check, X, MapPin } from "lucide-react";
import {
  ProjectEstimate,
  calculateTotalCosts,
  calculateExtrasCost,
  formatCurrency,
} from "@/hooks/useCostEstimator";

interface CostEstimatorComparisonProps {
  estimates: ProjectEstimate[];
  onDownloadComparisonPdf: () => void;
}

export function CostEstimatorComparison({
  estimates,
  onDownloadComparisonPdf,
}: CostEstimatorComparisonProps) {
  if (estimates.length < 2) return null;

  // Get all unique extras across all estimates
  const allExtras = new Set<string>();
  estimates.forEach((est) => {
    est.extras.forEach((extra) => allExtras.add(extra.name));
  });
  const extraNames = Array.from(allExtras);

  // Calculate totals for each estimate
  const calculations = estimates.map((est) => {
    const totalCosts = calculateTotalCosts(est.costs);
    const extrasCalc = calculateExtrasCost(est.extras);
    const subtotalWithCosts = est.basePrice + totalCosts;
    const totalInvestment = subtotalWithCosts + extrasCalc.total;

    return {
      estimate: est,
      totalCosts,
      extrasCalc,
      subtotalWithCosts,
      totalInvestment,
    };
  });

  // Find the cheapest option
  const minTotal = Math.min(...calculations.map((c) => c.totalInvestment));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Projectvergelijking</CardTitle>
        <Button onClick={onDownloadComparisonPdf} variant="outline" size="sm">
          <FileDown className="h-4 w-4 mr-2" />
          Download Vergelijking
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                  Project
                </th>
                {calculations.map((calc) => (
                  <th key={calc.estimate.id} className="text-center py-3 px-2">
                    <div className="space-y-2">
                      {calc.estimate.projectImage && (
                        <img
                          src={calc.estimate.projectImage}
                          alt={calc.estimate.projectName}
                          className="w-20 h-14 object-cover rounded mx-auto"
                        />
                      )}
                      <div className="font-semibold text-sm">
                        {calc.estimate.projectName}
                      </div>
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {calc.estimate.location}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Basic Info */}
              <tr className="border-b bg-muted/30">
                <td className="py-2 px-2 font-medium" colSpan={estimates.length + 1}>
                  Basisgegevens
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2 text-muted-foreground">Aankoopprijs</td>
                {calculations.map((calc) => (
                  <td key={calc.estimate.id} className="text-center py-2 px-2 font-medium">
                    {formatCurrency(calc.estimate.basePrice)}
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2 text-muted-foreground">Type</td>
                {calculations.map((calc) => (
                  <td key={calc.estimate.id} className="text-center py-2 px-2">
                    <Badge variant="outline">
                      {calc.estimate.propertyType === "nieuwbouw" ? "Nieuwbouw" : "Bestaand"}
                    </Badge>
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2 text-muted-foreground">Oplevertermijn</td>
                {calculations.map((calc) => (
                  <td key={calc.estimate.id} className="text-center py-2 px-2">
                    {calc.estimate.deliveryDate || "—"}
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2 text-muted-foreground">Bijkomende kosten</td>
                {calculations.map((calc) => (
                  <td key={calc.estimate.id} className="text-center py-2 px-2">
                    {formatCurrency(calc.totalCosts)}
                    <div className="text-xs text-muted-foreground">
                      ({((calc.totalCosts / calc.estimate.basePrice) * 100).toFixed(1)}%)
                    </div>
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2 text-muted-foreground">Subtotaal</td>
                {calculations.map((calc) => (
                  <td key={calc.estimate.id} className="text-center py-2 px-2 font-medium">
                    {formatCurrency(calc.subtotalWithCosts)}
                  </td>
                ))}
              </tr>

              {/* Extras Section */}
              {extraNames.length > 0 && (
                <>
                  <tr className="border-b bg-muted/30">
                    <td className="py-2 px-2 font-medium" colSpan={estimates.length + 1}>
                      Extra's & Meerwerk
                    </td>
                  </tr>
                  {extraNames.map((extraName) => (
                    <tr key={extraName} className="border-b">
                      <td className="py-2 px-2 text-muted-foreground">{extraName}</td>
                      {calculations.map((calc) => {
                        const extra = calc.estimate.extras.find((e) => e.name === extraName);
                        if (!extra) {
                          return (
                            <td
                              key={calc.estimate.id}
                              className="text-center py-2 px-2 text-muted-foreground"
                            >
                              —
                            </td>
                          );
                        }

                        if (extra.isIncluded) {
                          return (
                            <td
                              key={calc.estimate.id}
                              className="text-center py-2 px-2 text-green-600"
                            >
                              <div className="flex items-center justify-center gap-1">
                                <Check className="h-4 w-4" />
                                <span className="text-xs">Inclusief</span>
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td key={calc.estimate.id} className="text-center py-2 px-2">
                            {formatCurrency(extra.price)}
                            <div className="text-xs text-muted-foreground">
                              excl. {extra.viaDeveloper ? "10%" : "21%"} BTW
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr className="border-b">
                    <td className="py-2 px-2 text-muted-foreground font-medium">
                      Subtotaal extra's
                    </td>
                    {calculations.map((calc) => (
                      <td key={calc.estimate.id} className="text-center py-2 px-2 font-medium">
                        {calc.extrasCalc.total > 0
                          ? formatCurrency(calc.extrasCalc.total)
                          : "—"}
                      </td>
                    ))}
                  </tr>
                </>
              )}

              {/* Total */}
              <tr className="bg-primary/5">
                <td className="py-3 px-2 font-bold">Totale Investering</td>
                {calculations.map((calc) => (
                  <td key={calc.estimate.id} className="text-center py-3 px-2">
                    <div className="font-bold text-lg text-primary">
                      {formatCurrency(calc.totalInvestment)}
                    </div>
                    {calc.totalInvestment === minTotal && calculations.length > 1 && (
                      <Badge className="mt-1 bg-green-500">Goedkoopst</Badge>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
