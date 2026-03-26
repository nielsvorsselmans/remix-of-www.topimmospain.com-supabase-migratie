import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PartnerKlantTrip } from "@/hooks/usePartnerKlant";

export interface PartnerTripFormData {
  trip_start_date: string;
  trip_end_date: string;
  status: string;
  airport?: string;
  arrival_time?: string;
  departure_time?: string;
  flight_info?: string;
  accommodation_info?: string;
  admin_notes?: string;
}

interface PartnerTripFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PartnerTripFormData) => Promise<void>;
  trip?: PartnerKlantTrip | null;
  isLoading?: boolean;
}

export function PartnerTripFormDialog({
  open,
  onOpenChange,
  onSubmit,
  trip,
  isLoading,
}: PartnerTripFormDialogProps) {
  const { register, handleSubmit, reset, setValue, watch } = useForm<PartnerTripFormData>();

  useEffect(() => {
    if (trip) {
      reset({
        trip_start_date: trip.trip_start_date,
        trip_end_date: trip.trip_end_date,
        status: trip.status || "planned",
        airport: trip.airport || "",
        arrival_time: trip.arrival_time || "",
        departure_time: trip.departure_time || "",
        flight_info: trip.flight_info || "",
        accommodation_info: trip.accommodation_info || "",
        admin_notes: trip.admin_notes || "",
      });
    } else {
      reset({
        trip_start_date: "",
        trip_end_date: "",
        status: "planned",
      });
    }
  }, [trip, reset]);

  const handleFormSubmit = async (data: PartnerTripFormData) => {
    await onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{trip ? "Reis bewerken" : "Nieuwe reis plannen"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Startdatum</Label>
              <Input type="date" {...register("trip_start_date", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Einddatum</Label>
              <Input type="date" {...register("trip_end_date", { required: true })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={watch("status")}
              onValueChange={(value) => setValue("status", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Gepland</SelectItem>
                <SelectItem value="confirmed">Bevestigd</SelectItem>
                <SelectItem value="completed">Afgerond</SelectItem>
                <SelectItem value="cancelled">Geannuleerd</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Luchthaven</Label>
            <Input placeholder="bijv. Alicante" {...register("airport")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Opslaan..." : "Opslaan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
