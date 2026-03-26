import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle, ChevronRight } from "lucide-react";
import { Klant } from "@/hooks/useKlant";
import { useGHLAppointments, useUpdateAppointmentNotes, GHLAppointment, UpdateAppointmentData } from "@/hooks/useGHLAppointments";
import { format, isPast, isFuture } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { AppointmentDetailSheet } from "./AppointmentDetailSheet";

interface KlantAfsprakenCardProps {
  klant: Klant;
}

function AppointmentStatusBadge({ status }: { status: string | null }) {
  switch (status?.toLowerCase()) {
    case 'confirmed':
      return <Badge variant="default" className="bg-green-500 text-xs"><CheckCircle className="h-3 w-3 mr-1" />Bevestigd</Badge>;
    case 'cancelled':
      return <Badge variant="destructive" className="text-xs"><XCircle className="h-3 w-3 mr-1" />Geannuleerd</Badge>;
    case 'completed':
      return <Badge variant="secondary" className="text-xs"><CheckCircle className="h-3 w-3 mr-1" />Voltooid</Badge>;
    case 'no_show':
      return <Badge variant="destructive" className="text-xs"><AlertCircle className="h-3 w-3 mr-1" />No-show</Badge>;
    default:
      return <Badge variant="outline" className="text-xs"><Clock className="h-3 w-3 mr-1" />{status || 'Gepland'}</Badge>;
  }
}

function CompactAppointmentItem({ 
  appointment, 
  onOpenDetails,
  isUpcoming,
}: { 
  appointment: GHLAppointment; 
  onOpenDetails: () => void;
  isUpcoming: boolean;
}) {
  const startDate = new Date(appointment.start_time);
  const endDate = new Date(appointment.end_time);

  return (
    <div 
      className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
        isUpcoming ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/30'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{appointment.title || 'Afspraak'}</span>
          <AppointmentStatusBadge status={appointment.status} />
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {format(startDate, "d MMM yyyy", { locale: nl })} · {format(startDate, "HH:mm")} - {format(endDate, "HH:mm")}
        </div>
      </div>
      <Button 
        size="sm" 
        variant="ghost" 
        className="h-8 px-2 text-xs shrink-0"
        onClick={onOpenDetails}
      >
        Details
        <ChevronRight className="h-3 w-3 ml-1" />
      </Button>
    </div>
  );
}

export function KlantAfsprakenCard({ klant }: KlantAfsprakenCardProps) {
  const [selectedAppointment, setSelectedAppointment] = useState<GHLAppointment | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  
  const { data: appointments, isLoading, refetch, isRefetching } = useGHLAppointments(
    klant.ghl_contact_id || null,
    klant.id
  );
  const updateNotes = useUpdateAppointmentNotes();

  const handleOpenDetails = (appointment: GHLAppointment) => {
    setSelectedAppointment(appointment);
    setSheetOpen(true);
  };

  const handleSaveNotes = async (data: UpdateAppointmentData) => {
    try {
      await updateNotes.mutateAsync(data);
      toast.success("Notitie opgeslagen");
      setSheetOpen(false);
    } catch (error) {
      toast.error("Kon notitie niet opslaan");
    }
  };

  const upcomingAppointments = appointments?.filter(a => isFuture(new Date(a.start_time))) || [];
  const pastAppointments = appointments?.filter(a => isPast(new Date(a.start_time))) || [];

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Afspraken
              {appointments && appointments.length > 0 && (
                <Badge variant="secondary" className="text-xs">{appointments.length}</Badge>
              )}
              {!klant.ghl_contact_id && (
                <Badge variant="outline" className="text-xs">Geen GHL link</Badge>
              )}
            </CardTitle>
            {klant.ghl_contact_id && (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => refetch()}
                disabled={isRefetching}
              >
                <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : !appointments?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Geen afspraken gevonden
            </p>
          ) : (
            <>
              {upcomingAppointments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Toekomstig ({upcomingAppointments.length})
                  </h4>
                  {upcomingAppointments.map(appointment => (
                    <CompactAppointmentItem 
                      key={appointment.id} 
                      appointment={appointment}
                      isUpcoming={true}
                      onOpenDetails={() => handleOpenDetails(appointment)}
                    />
                  ))}
                </div>
              )}

              {pastAppointments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Historie ({pastAppointments.length})
                  </h4>
                  {pastAppointments.slice(0, 5).map(appointment => (
                    <CompactAppointmentItem 
                      key={appointment.id} 
                      appointment={appointment}
                      isUpcoming={false}
                      onOpenDetails={() => handleOpenDetails(appointment)}
                    />
                  ))}
                  {pastAppointments.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{pastAppointments.length - 5} eerdere afspraken
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AppointmentDetailSheet
        appointment={selectedAppointment}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSaveNotes={handleSaveNotes}
        isSaving={updateNotes.isPending}
        crmLeadId={klant.id}
      />
    </>
  );
}
