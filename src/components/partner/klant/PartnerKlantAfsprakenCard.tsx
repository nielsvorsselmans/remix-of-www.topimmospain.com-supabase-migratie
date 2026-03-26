import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Plus, Info } from "lucide-react";
import { PartnerKlant } from "@/hooks/usePartnerKlant";
import { useGHLAppointments, GHLAppointment } from "@/hooks/useGHLAppointments";
import { format, isPast, isFuture } from "date-fns";
import { nl } from "date-fns/locale";
import { PartnerAddAfspraakDialog } from "./PartnerAddAfspraakDialog";

interface PartnerKlantAfsprakenCardProps {
  klant: PartnerKlant;
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
  isUpcoming,
}: { 
  appointment: GHLAppointment; 
  isUpcoming: boolean;
}) {
  const startDate = new Date(appointment.start_time);
  const endDate = new Date(appointment.end_time);

  return (
    <div 
      className={`p-3 rounded-lg border ${
        isUpcoming ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/30'
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-medium text-sm truncate">{appointment.title || 'Afspraak'}</span>
        <AppointmentStatusBadge status={appointment.status} />
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {format(startDate, "EEEE d MMMM yyyy", { locale: nl })} · {format(startDate, "HH:mm")} - {format(endDate, "HH:mm")}
      </div>
    </div>
  );
}

export function PartnerKlantAfsprakenCard({ klant }: PartnerKlantAfsprakenCardProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  
  // Note: Partners see appointments in read-only mode
  // ghl_contact_id might not be available in PartnerKlant, so we pass null
  const { data: appointments, isLoading } = useGHLAppointments(
    null, // Partners don't have GHL access, only see local appointments
    klant.id
  );

  const upcomingAppointments = appointments?.filter(a => isFuture(new Date(a.start_time))) || [];
  const pastAppointments = appointments?.filter(a => isPast(new Date(a.start_time))) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Afspraken
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </CardContent>
      </Card>
    );
  }

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
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddDialogOpen(true)}
              className="h-8 gap-1"
            >
              <Plus className="h-4 w-4" />
              Afspraak
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm">
              Hier zie je afspraken die jij hebt ingepland. Centrale afspraken met Viva Vastgoed 
              worden door ons team beheerd en zijn zichtbaar in het klantportaal.
            </AlertDescription>
          </Alert>
          
          {!appointments?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nog geen lokale afspraken ingepland
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

      <PartnerAddAfspraakDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        crmLeadId={klant.id}
      />
    </>
  );
}
