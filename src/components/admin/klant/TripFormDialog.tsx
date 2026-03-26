import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { KlantTrip } from "@/hooks/useKlant";

interface TripFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TripFormData) => void;
  trip?: KlantTrip | null;
  isLoading?: boolean;
}

export interface TripFormData {
  trip_start_date: string;
  trip_end_date: string;
  arrival_time: string;
  departure_time: string;
  airport: string;
  flight_info: string;
  accommodation_info: string;
  status: string;
  trip_type: string;
  admin_notes: string;
}

const AIRPORTS = [
  { value: "ALC", label: "Alicante (ALC)" },
  { value: "MJV", label: "Murcia (MJV)" },
  { value: "AGP", label: "Málaga (AGP)" },
  { value: "other", label: "Andere" },
];

const STATUSES = [
  { value: "planned", label: "Gepland" },
  { value: "confirmed", label: "Bevestigd" },
  { value: "completed", label: "Afgerond" },
  { value: "cancelled", label: "Geannuleerd" },
];

export function TripFormDialog({
  open,
  onOpenChange,
  onSubmit,
  trip,
  isLoading,
}: TripFormDialogProps) {
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [arrivalTime, setArrivalTime] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [airport, setAirport] = useState("");
  const [flightInfo, setFlightInfo] = useState("");
  const [accommodationInfo, setAccommodationInfo] = useState("");
  const [status, setStatus] = useState("planned");
  const [tripType, setTripType] = useState("bezichtiging");
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    if (trip) {
      setStartDate(new Date(trip.trip_start_date));
      setEndDate(new Date(trip.trip_end_date));
      setArrivalTime((trip as any).arrival_time || "");
      setDepartureTime((trip as any).departure_time || "");
      setAirport((trip as any).airport || "");
      setFlightInfo(trip.flight_info || "");
      setAccommodationInfo(trip.accommodation_info || "");
      setStatus(trip.status || "planned");
      setTripType((trip as any).trip_type || "bezichtiging");
      setAdminNotes(trip.admin_notes || "");
    } else {
      setStartDate(undefined);
      setEndDate(undefined);
      setArrivalTime("");
      setDepartureTime("");
      setAirport("");
      setFlightInfo("");
      setAccommodationInfo("");
      setStatus("planned");
      setTripType("bezichtiging");
      setAdminNotes("");
    }
  }, [trip, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return;

    onSubmit({
      trip_start_date: format(startDate, "yyyy-MM-dd"),
      trip_end_date: format(endDate, "yyyy-MM-dd"),
      arrival_time: arrivalTime,
      departure_time: departureTime,
      airport,
      flight_info: flightInfo,
      accommodation_info: accommodationInfo,
      status,
      trip_type: tripType,
      admin_notes: adminNotes,
    });
  };

  const isValid = startDate && endDate && startDate <= endDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {trip ? "Bezichtigingsreis bewerken" : "Nieuwe bezichtigingsreis"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Aankomstdatum *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "d MMM yyyy", { locale: nl }) : "Kies datum"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    locale={nl}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Vertrekdatum *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "d MMM yyyy", { locale: nl }) : "Kies datum"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => startDate ? date < startDate : false}
                    locale={nl}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Aankomsttijd</Label>
              <Input
                type="time"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Vertrektijd</Label>
              <Input
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
              />
            </div>
          </div>

          {/* Trip Type */}
          <div className="space-y-2">
            <Label>Reistype</Label>
            <Select value={tripType} onValueChange={setTripType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bezichtiging">Bezichtigingsreis</SelectItem>
                <SelectItem value="terugkeer">Terugkeer koper</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Airport & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Luchthaven</Label>
              <Select value={airport} onValueChange={setAirport}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer luchthaven" />
                </SelectTrigger>
                <SelectContent>
                  {AIRPORTS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Flight Info */}
          <div className="space-y-2">
            <Label>Vluchtgegevens</Label>
            <Input
              placeholder="bv. Ryanair FR1234, 10:30 vertrek"
              value={flightInfo}
              onChange={(e) => setFlightInfo(e.target.value)}
            />
          </div>

          {/* Accommodation */}
          <div className="space-y-2">
            <Label>Verblijf</Label>
            <Textarea
              placeholder="Hotel/appartement naam, adres, check-in/out tijden..."
              value={accommodationInfo}
              onChange={(e) => setAccommodationInfo(e.target.value)}
              rows={2}
            />
          </div>

          {/* Admin Notes */}
          <div className="space-y-2">
            <Label>Admin notities</Label>
            <Textarea
              placeholder="Interne opmerkingen over deze reis..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuleren
            </Button>
            <Button type="submit" disabled={!isValid || isLoading}>
              {isLoading ? "Opslaan..." : trip ? "Bijwerken" : "Aanmaken"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}