import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calculator, Calendar, Euro, FileDown, MapPin, Eye } from "lucide-react";
import { useMyAssignedCostEstimates, CostEstimateAssignment } from "@/hooks/useCostEstimates";
import { formatCurrency, calculateTotalCosts, calculateExtrasCost } from "@/hooks/useCostEstimator";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function KostenindicatiesCard() {
  const { data: assignments = [], isLoading } = useMyAssignedCostEstimates();
  const queryClient = useQueryClient();

  // Mutation to mark as viewed
  const markViewedMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from("cost_estimate_assignments")
        .update({ status: "viewed" })
        .eq("id", assignmentId)
        .eq("status", "pending");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-cost-estimates"] });
    },
  });

  const calculateTotal = (assignment: CostEstimateAssignment) => {
    if (!assignment.cost_estimate) return 0;
    const est = assignment.cost_estimate;
    const totalCosts = calculateTotalCosts(est.costs);
    const extrasCalc = calculateExtrasCost(est.extras);
    return est.base_price + totalCosts + extrasCalc.total;
  };

  const handleView = (assignment: CostEstimateAssignment) => {
    // Mark as viewed if pending
    if (assignment.status === "pending") {
      markViewedMutation.mutate(assignment.id);
    }
    // TODO: Open detail view or PDF
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
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't show if no assignments
  if (assignments.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-primary" />
          Kostenindicaties
        </CardTitle>
        <CardDescription>
          Je adviseur heeft {assignments.length}{" "}
          {assignments.length === 1 ? "indicatie" : "indicaties"} met je gedeeld
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {assignments.map((assignment) => {
            const est = assignment.cost_estimate;
            if (!est) return null;

            return (
              <div
                key={assignment.id}
                className="border rounded-lg overflow-hidden"
              >
                {/* Header with image */}
                <div className="flex items-start gap-4 p-4">
                  {est.project_image && (
                    <img
                      src={est.project_image}
                      alt={est.project_name}
                      className="w-20 h-14 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">{est.project_name}</h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
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
                      {assignment.status === "pending" && (
                        <Badge className="bg-blue-100 text-blue-700">Nieuw</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Total and actions */}
                <div className="bg-muted/50 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Totale investering</p>
                    <p className="text-xl font-bold text-primary flex items-center gap-1">
                      {formatCurrency(calculateTotal(assignment))}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleView(assignment)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Bekijken
                    </Button>
                  </div>
                </div>

                {/* Notes if any */}
                {est.notes && (
                  <div className="px-4 py-3 border-t bg-green-50 text-green-800 text-sm">
                    <p className="font-medium text-xs text-green-600 mb-1">
                      Opmerking van je adviseur:
                    </p>
                    <p className="whitespace-pre-wrap">{est.notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
