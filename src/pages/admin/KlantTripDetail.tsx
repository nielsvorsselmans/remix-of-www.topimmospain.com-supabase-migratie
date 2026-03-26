import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useKlant, KlantTrip } from "@/hooks/useKlant";
import { useUpdateTrip, useUpdateTripViewings } from "@/hooks/useTripMutations";
import { TripFormDialog, TripFormData } from "@/components/admin/klant/TripFormDialog";
import { TripCustomerPreviewDialog } from "@/components/admin/klant/TripCustomerPreviewDialog";
import { ViewingFormDialog } from "@/components/admin/klant/ViewingFormDialog";
import { ScheduledViewing } from "@/components/admin/klant/TripDetailSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  ArrowLeft,
  Edit,
  Eye,
  Plane,
  Home,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  AlertTriangle,
  StickyNote,
  Presentation,
  Plus,
  Trash2,
} from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";

function getStatusBadge(status: string | null) {
  switch (status) {
    case "confirmed":
      return <Badge className="bg-green-600">Bevestigd</Badge>;
    case "completed":
      return <Badge variant="secondary">Afgerond</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Geannuleerd</Badge>;
    default:
      return <Badge variant="outline">Gepland</Badge>;
  }
}

export default function KlantTripDetail() {
  const { id, tripId } = useParams<{ id: string; tripId: string }>();
  const navigate = useNavigate();
  const { data: klant, isLoading } = useKlant(id || "");
  const updateTrip = useUpdateTrip();
  const updateViewings = useUpdateTripViewings();

  const [formOpen, setFormOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [viewingFormOpen, setViewingFormOpen] = useState(false);
  const [editingViewing, setEditingViewing] = useState<ScheduledViewing | null>(null);
  const [prefillDate, setPrefillDate] = useState<string | undefined>();
  const [deleteViewingId, setDeleteViewingId] = useState<string | null>(null);

  const trip = useMemo(() => {
    if (!klant) return null;
    return klant.trips.find((t) => t.id === tripId) || null;
  }, [klant, tripId]);

  const handleEditSubmit = async (data: TripFormData) => {
    if (!trip || !id) return;
    try {
      await updateTrip.mutateAsync({
        tripId: trip.id,
        crmLeadId: id,
        updates: data,
      });
      toast.success("Reis bijgewerkt");
      setFormOpen(false);
    } catch {
      toast.error("Kon reis niet opslaan");
    }
  };

  // Parse viewings from trip
  const viewings: ScheduledViewing[] = useMemo(() => {
    if (!trip) return [];
    try {
      const parsed = typeof trip.scheduled_viewings === "string"
        ? JSON.parse(trip.scheduled_viewings)
        : trip.scheduled_viewings;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [trip]);

  const saveViewings = async (updated: ScheduledViewing[]) => {
    if (!trip || !id) return;
    try {
      await updateViewings.mutateAsync({
        tripId: trip.id,
        crmLeadId: id,
        viewings: updated,
      });
    } catch {
      toast.error("Kon bezichtigingen niet opslaan");
    }
  };

  const handleAddOrUpdateViewing = async (viewing: ScheduledViewing) => {
    let updated: ScheduledViewing[];
    if (editingViewing) {
      updated = viewings.map(v => v.id === editingViewing.id ? viewing : v);
    } else {
      updated = [...viewings, viewing];
    }
    updated.sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      return d !== 0 ? d : a.time.localeCompare(b.time);
    });
    await saveViewings(updated);
    toast.success(editingViewing ? "Bezichtiging bijgewerkt" : "Bezichtiging toegevoegd");
    setEditingViewing(null);
  };

  const handleDeleteViewing = async () => {
    if (!deleteViewingId) return;
    const updated = viewings.filter(v => v.id !== deleteViewingId);
    await saveViewings(updated);
    toast.success("Bezichtiging verwijderd");
    setDeleteViewingId(null);
  };

  const openAddViewing = (date?: string) => {
    setEditingViewing(null);
    setPrefillDate(date);
    setViewingFormOpen(true);
  };

  const openEditViewing = (viewing: ScheduledViewing) => {
    setEditingViewing(viewing);
    setPrefillDate(undefined);
    setViewingFormOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!klant || !trip) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Reis niet gevonden.</p>
        <Button variant="link" onClick={() => navigate(-1)}>
          Terug
        </Button>
      </div>
    );
  }

  const klantNaam = [klant.first_name, klant.last_name].filter(Boolean).join(" ") || "Onbekend";
  const startDate = new Date(trip.trip_start_date);
  const endDate = new Date(trip.trip_end_date);
  const tripDays = differenceInDays(endDate, startDate) + 1;

  // Build day schedule
  const daySchedule = Array.from({ length: tripDays }, (_, i) => {
    const date = addDays(startDate, i);
    const dateStr = format(date, "yyyy-MM-dd");
    const dayViewings = viewings
      .filter((v) => v.date === dateStr)
      .sort((a, b) => a.time.localeCompare(b.time));
    return { date, dateStr, viewings: dayViewings };
  });

  const dayOptions = daySchedule.map(d => ({ date: d.date, dateStr: d.dateStr }));

  // Trip-level info
  const tripAny = trip as any;
  const airport = tripAny.airport || null;
  const arrivalTime = tripAny.arrival_time || null;
  const departureTime = tripAny.departure_time || null;

  // Assigned projects
  const assignedProjects = klant.assigned_projects || [];

  // Count viewings summary
  const daysWithViewings = daySchedule.filter(d => d.viewings.length > 0).length;
  const emptyDays = tripDays - daysWithViewings;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <button
        onClick={() => navigate(`/admin/klanten/${id}`)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Terug naar {klantNaam}
      </button>

      {/* Header — stacks vertically on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight">
              {trip.trip_type === "terugkeer" ? "Terugkeerreis" : "Bezichtigingsreis"}
            </h1>
            {trip.trip_type === "terugkeer" && (
              <Badge className="bg-teal-600">Koper ✓</Badge>
            )}
            {getStatusBadge(trip.status)}
          </div>
          <p className="text-muted-foreground mt-1">
            {format(startDate, "d MMMM", { locale: nl })} –{" "}
            {format(endDate, "d MMMM yyyy", { locale: nl })} ({tripDays} dagen)
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/admin/bezichtiging-companion/${tripId}`)}
          >
            <Presentation className="h-4 w-4 mr-1" />
            Bezichtigingstool
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
            <Eye className="h-4 w-4 mr-1" />
            Klantweergave
          </Button>
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Edit className="h-4 w-4 mr-1" />
            Bewerken
          </Button>
        </div>
      </div>

      {/* Logistics cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plane className="h-4 w-4" />
              Vlucht
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {airport && <p><span className="text-muted-foreground">Luchthaven:</span> {airport}</p>}
            {trip.flight_info && <p><span className="text-muted-foreground">Vlucht:</span> {trip.flight_info}</p>}
            {arrivalTime && <p><span className="text-muted-foreground">Aankomst:</span> {arrivalTime}</p>}
            {departureTime && <p><span className="text-muted-foreground">Vertrek:</span> {departureTime}</p>}
            {!airport && !trip.flight_info && !arrivalTime && !departureTime && (
              <p className="text-muted-foreground italic">Nog geen vluchtgegevens ingevuld</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Home className="h-4 w-4" />
              Verblijf
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {trip.accommodation_info ? (
              <p className="whitespace-pre-line">{trip.accommodation_info}</p>
            ) : (
              <p className="text-muted-foreground italic">Nog geen verblijf ingevuld</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Day-by-day schedule */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Dagplanning</h2>
            <p className="text-sm text-muted-foreground">
              {viewings.length} bezichtiging{viewings.length !== 1 ? "en" : ""} gepland
              {emptyDays > 0 && (
                <span className="text-amber-600 ml-2">· {emptyDays} dag{emptyDays !== 1 ? "en" : ""} zonder planning</span>
              )}
            </p>
          </div>
          <Button size="sm" onClick={() => openAddViewing()}>
            <Plus className="h-4 w-4 mr-1" />
            Bezichtiging
          </Button>
        </div>

        {daySchedule.map(({ date, dateStr, viewings: dayViewings }) => (
          <div key={dateStr} className="space-y-3">
            {/* Day header */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">
                {format(date, "EEEE d MMMM", { locale: nl })}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {dayViewings.length} bezichtiging{dayViewings.length !== 1 ? "en" : ""}
              </Badge>
            </div>

            {dayViewings.length === 0 ? (
              <div className="pl-6">
                <button
                  onClick={() => openAddViewing(dateStr)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-dashed border-muted-foreground/30 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Bezichtiging toevoegen
                </button>
              </div>
            ) : (
              <div className="space-y-3 pl-6">
                {dayViewings.map((viewing) => (
                  <ViewingCard
                    key={viewing.id}
                    viewing={viewing}
                    onEdit={() => openEditViewing(viewing)}
                    onDelete={() => setDeleteViewingId(viewing.id)}
                  />
                ))}
                <button
                  onClick={() => openAddViewing(dateStr)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors pl-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nog een bezichtiging
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Admin notes */}
      {trip.admin_notes && (
        <>
          <Separator />
          <div className="space-y-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              Admin notities
            </h2>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm whitespace-pre-line">{trip.admin_notes}</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Dialogs */}
      <TripFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleEditSubmit}
        trip={trip}
        isLoading={updateTrip.isPending}
      />

      <TripCustomerPreviewDialog
        trip={previewOpen ? trip : null}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        crmLeadId={id || ""}
        journeyPhase={klant.journey_phase || "selection"}
      />

      <ViewingFormDialog
        open={viewingFormOpen}
        onOpenChange={setViewingFormOpen}
        onSubmit={handleAddOrUpdateViewing}
        assignedProjects={assignedProjects}
        dayOptions={dayOptions}
        editingViewing={editingViewing}
        prefillDate={prefillDate}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteViewingId} onOpenChange={(open) => !open && setDeleteViewingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bezichtiging verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Deze bezichtiging wordt permanent verwijderd uit de dagplanning.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteViewing} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface ViewingCardProps {
  viewing: ScheduledViewing;
  onEdit: () => void;
  onDelete: () => void;
}

function ViewingCard({ viewing, onEdit, onDelete }: ViewingCardProps) {
  return (
    <Card className="group">
      <CardContent className="py-4 space-y-2">
        {/* Time + Project + Actions */}
        <div className="flex items-start gap-3">
          <div className="flex items-center gap-1.5 text-sm font-medium min-w-[48px]">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            {viewing.time}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium">{viewing.project_name}</p>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 max-sm:opacity-100 transition-opacity">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Contact */}
        {viewing.contact_person && (
          <div className="flex items-center gap-2 text-sm pl-[60px] flex-wrap">
            <span className="text-muted-foreground">Contact:</span>
            <span>{viewing.contact_person}</span>
            {viewing.contact_phone && (
              <a href={`tel:${viewing.contact_phone}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                <Phone className="h-3 w-3" />
                {viewing.contact_phone}
              </a>
            )}
            {viewing.contact_email && (
              <a href={`mailto:${viewing.contact_email}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                <Mail className="h-3 w-3" />
              </a>
            )}
          </div>
        )}

        {/* Location */}
        {viewing.showhouse_address && (
          <div className="flex items-center gap-2 text-sm pl-[60px]">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>{viewing.showhouse_address}</span>
            {viewing.showhouse_maps_url && (
              <a href={viewing.showhouse_maps_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-xs">
                <ExternalLink className="h-3 w-3" />
                Open Maps
              </a>
            )}
          </div>
        )}

        {/* Showhouse notes */}
        {viewing.showhouse_notes && (
          <div className="flex items-center gap-2 text-sm pl-[60px] text-amber-600">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>{viewing.showhouse_notes}</span>
          </div>
        )}

        {/* Notes */}
        {viewing.notes && (
          <p className="text-sm text-muted-foreground pl-[60px] italic">{viewing.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}
