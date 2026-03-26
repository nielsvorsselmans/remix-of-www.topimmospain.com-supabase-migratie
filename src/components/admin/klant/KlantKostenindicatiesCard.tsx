import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calculator, Calendar, Euro, FileDown, MapPin, Plus } from "lucide-react";
import { useCustomerCostEstimates, CostEstimateAssignment } from "@/hooks/useCostEstimates";
import { formatCurrency, calculateTotalCosts, calculateExtrasCost } from "@/hooks/useCostEstimator";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

interface KlantKostenindicatiesCardProps {
  crmLeadId: string;
}

export function KlantKostenindicatiesCard({ crmLeadId }: KlantKostenindicatiesCardProps) {
  const { data: assignments = [], isLoading } = useCustomerCostEstimates(crmLeadId);

  const calculateTotal = (assignment: CostEstimateAssignment) => {
    if (!assignment.cost_estimate) return 0;
    const est = assignment.cost_estimate;
    const totalCosts = calculateTotalCosts(est.costs);
    const extrasCalc = calculateExtrasCost(est.extras);
    return est.base_price + totalCosts + extrasCalc.total;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "viewed":
        return <Badge variant="secondary">Bekeken</Badge>;
      case "interested":
        return <Badge className="bg-green-100 text-green-700">Geïnteresseerd</Badge>;
      default:
        return <Badge variant="outline">Verzonden</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-4 w-4" />
          Kostenindicaties
        </CardTitle>
        <CardDescription>
          {assignments.length === 0
            ? "Nog geen indicaties toegewezen"
            : `${assignments.length} ${assignments.length === 1 ? "indicatie" : "indicaties"} toegewezen`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {assignments.length === 0 ? (
          <div className="text-center py-6">
            <Calculator className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground mb-4">
              Geen kostenindicaties toegewezen
            </p>
            <Button variant="outline" size="sm" asChild>
              <a href="/admin/kostenindicatie">
                <Plus className="h-4 w-4 mr-1" />
                Nieuwe indicatie maken
              </a>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => {
              const est = assignment.cost_estimate;
              if (!est) return null;

              return (
                <div
                  key={assignment.id}
                  className="border rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-start gap-3">
                    {est.project_image && (
                      <img
                        src={est.project_image}
                        alt={est.project_name}
                        className="w-14 h-10 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{est.project_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {est.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {est.location}
                          </span>
                        )}
                        {est.delivery_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {est.delivery_date}
                          </span>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(assignment.status)}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div>
                      <p className="font-semibold text-sm flex items-center gap-1">
                        <Euro className="h-3 w-3" />
                        {formatCurrency(calculateTotal(assignment))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Toegewezen{" "}
                        {formatDistanceToNow(new Date(assignment.assigned_at), {
                          addSuffix: true,
                          locale: nl,
                        })}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {est.property_type === "nieuwbouw" ? "Nieuwbouw" : "Bestaand"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
