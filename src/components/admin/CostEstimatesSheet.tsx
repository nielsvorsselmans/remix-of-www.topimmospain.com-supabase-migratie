import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Trash2,
  UserPlus,
  FileDown,
  Calendar,
  MapPin,
  Euro,
  Pencil,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { useCostEstimates, SavedCostEstimate } from "@/hooks/useCostEstimates";
import { formatCurrency, calculateTotalCosts, calculateExtrasCost } from "@/hooks/useCostEstimator";
import { AssignCostEstimateDialog } from "./AssignCostEstimateDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CostEstimatesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (estimates: SavedCostEstimate[]) => void;
}

export function CostEstimatesSheet({ open, onOpenChange, onEdit }: CostEstimatesSheetProps) {
  const { estimates, isLoading, deleteEstimate, isDeleting } = useCostEstimates();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedEstimate, setSelectedEstimate] = useState<SavedCostEstimate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [estimateToDelete, setEstimateToDelete] = useState<string | null>(null);

  // Group estimates by name + created_at (rounded to minute) to separate different scenarios with same name
  const groupedEstimates = estimates.reduce((acc, est) => {
    // Create a unique key from name + created_at (rounded to the minute)
    const createdMinute = new Date(est.created_at).toISOString().slice(0, 16);
    const key = `${est.name}__${createdMinute}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(est);
    return acc;
  }, {} as Record<string, SavedCostEstimate[]>);

  // Helper to extract display name from key
  const getDisplayName = (key: string) => key.split('__')[0];

  const handleAssign = (estimate: SavedCostEstimate) => {
    setSelectedEstimate(estimate);
    setAssignDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setEstimateToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (estimateToDelete) {
      deleteEstimate(estimateToDelete);
      setDeleteDialogOpen(false);
      setEstimateToDelete(null);
    }
  };

  const calculateTotal = (est: SavedCostEstimate) => {
    const totalCosts = calculateTotalCosts(est.costs);
    const extrasCalc = calculateExtrasCost(est.extras);
    return est.base_price + totalCosts + extrasCalc.total;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Opgeslagen Scenario's</SheetTitle>
            <SheetDescription>
              Beheer je opgeslagen kostenindicaties
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-120px)] mt-6 -mx-6 px-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : Object.keys(groupedEstimates).length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Nog geen scenario's opgeslagen
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedEstimates).map(([key, items]) => (
                  <div key={key} className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-4 py-3 border-b">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{getDisplayName(key)}</h3>
                          <p className="text-xs text-muted-foreground">
                            {items.length} {items.length === 1 ? "project" : "projecten"} •{" "}
                            {formatDistanceToNow(new Date(items[0].created_at), {
                              addSuffix: true,
                              locale: nl,
                            })}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {formatCurrency(items.reduce((sum, est) => sum + calculateTotal(est), 0))}
                        </Badge>
                      </div>
                    </div>

                    <div className="divide-y">
                      {items.map((est) => (
                        <div key={est.id} className="p-4 space-y-3">
                          <div className="flex items-start gap-3">
                            {est.project_image && (
                              <img
                                src={est.project_image}
                                alt={est.project_name}
                                className="w-16 h-12 object-cover rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{est.project_name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
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
                            <div className="text-right">
                              <p className="font-semibold text-sm flex items-center gap-1">
                                <Euro className="h-3 w-3" />
                                {formatCurrency(calculateTotal(est))}
                              </p>
                              <Badge variant="outline" className="text-xs mt-1">
                                {est.property_type === "nieuwbouw" ? "Nieuwbouw" : "Bestaand"}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => {
                                onEdit?.(items);
                                onOpenChange(false);
                              }}
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Bewerken
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAssign(est)}
                            >
                              <UserPlus className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(est.id)}
                              disabled={isDeleting}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <AssignCostEstimateDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        costEstimate={selectedEstimate}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kostenindicatie verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je deze kostenindicatie wilt verwijderen? 
              Dit kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
