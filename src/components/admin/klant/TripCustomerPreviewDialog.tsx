import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Eye, Loader2 } from "lucide-react";
import { EnrichedTripCard } from "@/components/EnrichedTripCard";
import { useEnrichedTripForAdmin } from "@/hooks/useEnrichedTripForAdmin";
import type { KlantTrip } from "@/hooks/useKlant";

interface TripCustomerPreviewDialogProps {
  trip: KlantTrip | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  crmLeadId: string;
  journeyPhase?: string;
}

export function TripCustomerPreviewDialog({
  trip,
  open,
  onOpenChange,
  crmLeadId,
  journeyPhase = 'selection',
}: TripCustomerPreviewDialogProps) {
  const { data: enrichedTrip, isLoading } = useEnrichedTripForAdmin(
    open ? trip : null,
    crmLeadId,
    journeyPhase
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Klantweergave Preview
          </DialogTitle>
          <Badge variant="outline" className="w-fit text-xs">
            Dit is exact wat de klant ziet op hun dashboard
          </Badge>
        </DialogHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : enrichedTrip ? (
            <EnrichedTripCard trip={enrichedTrip} showChecklist={true} />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Geen trip data beschikbaar
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
