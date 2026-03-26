import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Calendar, 
  Video, 
  Users, 
  Clock, 
  MapPin, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  PenSquare
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useKlantEvents, KlantEvent, EventType } from "@/hooks/useKlantEvents";
import { Klant } from "@/hooks/useKlant";
import { useQueryClient } from "@tanstack/react-query";
import { AppointmentDetailSheet } from "./AppointmentDetailSheet";
import { AddManualEventDialog } from "./AddManualEventDialog";
import { ManualEventDetailSheet } from "./ManualEventDetailSheet";
import { useUpdateAppointmentNotes, UpdateAppointmentData } from "@/hooks/useGHLAppointments";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface KlantEvenementenCardProps {
  klant: Klant;
}

const eventTypeConfig: Record<EventType, {
  label: string;
  icon: React.ElementType;
  borderColor: string;
  bgColor: string;
  badgeVariant: string;
}> = {
  appointment: {
    label: 'Afspraak',
    icon: Calendar,
    borderColor: 'border-l-blue-400',
    bgColor: 'bg-blue-50/50 dark:bg-blue-950/20',
    badgeVariant: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  webinar: {
    label: 'Webinar',
    icon: Video,
    borderColor: 'border-l-purple-400',
    bgColor: 'bg-purple-50/50 dark:bg-purple-950/20',
    badgeVariant: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  },
  info_evening: {
    label: 'Infoavond',
    icon: Users,
    borderColor: 'border-l-amber-400',
    bgColor: 'bg-amber-50/50 dark:bg-amber-950/20',
    badgeVariant: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  },
  manual: {
    label: 'Handmatig',
    icon: PenSquare,
    borderColor: 'border-l-emerald-400',
    bgColor: 'bg-emerald-50/50 dark:bg-emerald-950/20',
    badgeVariant: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  },
};

function EventTypeBadge({ type }: { type: EventType }) {
  const config = eventTypeConfig[type];
  const Icon = config.icon;
  
  return (
    <Badge variant="outline" className={`${config.badgeVariant} border-0 gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function StatusBadge({ event }: { event: KlantEvent }) {
  const hasNotes = !!(event.localNotes && event.localNotes.trim());
  
  if (event.type === 'appointment' && event.appointmentStatus) {
    // If status = confirmed AND there are notes, hide the badge (NoteBadge takes over)
    if (event.appointmentStatus === 'confirmed' && hasNotes) {
      return null;
    }
    
    const statusConfig: Record<string, { icon: React.ElementType; className: string; label: string }> = {
      confirmed: { icon: CheckCircle2, className: 'bg-green-100 text-green-800', label: 'Bevestigd' },
      cancelled: { icon: XCircle, className: 'bg-red-100 text-red-800', label: 'Geannuleerd' },
      noshow: { icon: XCircle, className: 'bg-orange-100 text-orange-800', label: 'No-show' },
      completed: { icon: CheckCircle2, className: 'bg-blue-100 text-blue-800', label: 'Voltooid' },
    };
    
    const status = statusConfig[event.appointmentStatus] || { 
      icon: AlertCircle, 
      className: 'bg-muted text-muted-foreground', 
      label: event.appointmentStatus 
    };
    const Icon = status.icon;
    
    return (
      <Badge variant="outline" className={`${status.className} border-0 gap-1`}>
        <Icon className="h-3 w-3" />
        {status.label}
      </Badge>
    );
  }
  
  if (event.confirmed) {
    return (
      <Badge variant="outline" className="bg-green-100 text-green-800 border-0 gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Bevestigd
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="bg-muted text-muted-foreground border-0 gap-1">
      <AlertCircle className="h-3 w-3" />
      Onbevestigd
    </Badge>
  );
}

function NoteBadge({ hasNotes }: { hasNotes: boolean }) {
  if (!hasNotes) return null;
  
  return (
    <Badge variant="outline" className="bg-indigo-100 text-indigo-800 border-0 gap-1">
      <FileText className="h-3 w-3" />
      Notitie
    </Badge>
  );
}

function GHLSyncBadge({ synced, syncedAt }: { synced: boolean | null; syncedAt: string | null }) {
  if (synced === null) return null;
  
  if (synced) {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
        GHL ✓
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
      GHL sync mislukt
    </Badge>
  );
}

function EventItem({ event, onClick }: { event: KlantEvent; onClick?: () => void }) {
  const config = eventTypeConfig[event.type];
  
  return (
    <div 
      className={`p-3 rounded-lg border-l-4 ${config.borderColor} ${config.bgColor} cursor-pointer hover:opacity-80 transition-opacity`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <EventTypeBadge type={event.type} />
            <StatusBadge event={event} />
            <NoteBadge hasNotes={!!(event.localNotes && event.localNotes.trim())} />
            {event.type !== 'appointment' && (
              <GHLSyncBadge synced={event.ghlSynced} syncedAt={event.ghlSyncedAt} />
            )}
          </div>
          
          <h4 className="font-medium text-sm truncate">{event.title}</h4>
          
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(event.date, "d MMM yyyy 'om' HH:mm", { locale: nl })}
            </span>
            
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {event.location}
              </span>
            )}
            
            {event.numberOfPersons && event.numberOfPersons > 1 && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {event.numberOfPersons} personen
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function KlantEvenementenCard({ klant }: KlantEvenementenCardProps) {
  const queryClient = useQueryClient();
  const { data: events, isLoading, refetch, isRefetching } = useKlantEvents(klant.id, klant.ghl_contact_id);
  const [showAllPast, setShowAllPast] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<KlantEvent | null>(null);
  const [selectedManualEvent, setSelectedManualEvent] = useState<KlantEvent | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const updateNotesMutation = useUpdateAppointmentNotes();

  const upcomingEvents = events?.filter(e => e.status === 'upcoming') || [];
  const pastEvents = events?.filter(e => e.status === 'past') || [];
  const displayedPastEvents = showAllPast ? pastEvents : pastEvents.slice(0, 3);

  const handleRefresh = async () => {
    setIsSyncing(true);
    
    try {
      // First sync appointments from GHL if contact has ghl_contact_id
      if (klant.ghl_contact_id) {
        console.log(`[KlantEvenementenCard] Syncing GHL appointments for ${klant.ghl_contact_id}`);
        
        const { data, error } = await supabase.functions.invoke('get-ghl-contact-appointments', {
          body: { 
            ghl_contact_id: klant.ghl_contact_id, 
            crm_lead_id: klant.id 
          },
        });
        
        if (error) {
          console.error('[KlantEvenementenCard] GHL sync error:', error);
          toast.error("GHL sync mislukt, lokale data wordt getoond");
        } else {
          console.log(`[KlantEvenementenCard] Synced ${data?.length || 0} appointments from GHL`);
        }
      }
      
      // Then refetch all events from database
      await refetch();
      toast.success("Evenementen vernieuwd");
    } catch (err) {
      console.error('[KlantEvenementenCard] Refresh error:', err);
      toast.error("Fout bij vernieuwen evenementen");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEventClick = (event: KlantEvent) => {
    if (event.type === 'appointment') {
      setSelectedAppointment(event);
    } else if (event.type === 'manual') {
      setSelectedManualEvent(event);
    }
    // TODO: Add detail sheets for webinar and info_evening types
  };

  const handleSaveNotes = async (data: UpdateAppointmentData): Promise<void> => {
    if (!selectedAppointment) return;
    
    await updateNotesMutation.mutateAsync(data);
    
    // Update selectedAppointment with the new notes so the sheet stays in sync
    setSelectedAppointment(prev => prev ? {
      ...prev,
      localNotes: data.localNotes || null,
      originalData: {
        ...prev.originalData,
        local_notes: data.localNotes || null,
      }
    } : null);
    
    // Also invalidate klant-events to refresh the list
    queryClient.invalidateQueries({ queryKey: ['klant-events', klant.id] });
    
    // Only show toast for regular notes save (not when saving AI summary - that has its own toast)
    if (data.isSummaryPublished === undefined) {
      toast.success("Notities opgeslagen");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Evenementen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const totalEvents = (events?.length || 0);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Evenementen
            {totalEvents > 0 && (
              <Badge variant="secondary" className="ml-1">{totalEvents}</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <AddManualEventDialog crmLeadId={klant.id} />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleRefresh}
              disabled={isRefetching || isSyncing}
            >
              <RefreshCw className={`h-4 w-4 ${(isRefetching || isSyncing) ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {totalEvents === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Geen evenementen gevonden
            </p>
          ) : (
            <>
              {/* Upcoming Events */}
              {upcomingEvents.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Toekomstig</h4>
                  <div className="space-y-2">
                    {upcomingEvents.map(event => (
                      <EventItem 
                        key={`${event.type}-${event.id}`} 
                        event={event}
                        onClick={() => handleEventClick(event)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Past Events */}
              {pastEvents.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Historie</h4>
                  <div className="space-y-2">
                    {displayedPastEvents.map(event => (
                      <EventItem 
                        key={`${event.type}-${event.id}`} 
                        event={event}
                        onClick={() => handleEventClick(event)}
                      />
                    ))}
                  </div>
                  
                  {pastEvents.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowAllPast(!showAllPast)}
                    >
                      {showAllPast ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-1" />
                          Minder tonen
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-1" />
                          Toon alle ({pastEvents.length})
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Appointment Detail Sheet */}
      {selectedAppointment && selectedAppointment.type === 'appointment' && (
        <AppointmentDetailSheet
          appointment={{
            id: selectedAppointment.originalData.id,
            crm_lead_id: selectedAppointment.originalData.crm_lead_id,
            ghl_appointment_id: selectedAppointment.originalData.ghl_appointment_id,
            title: selectedAppointment.title,
            start_time: selectedAppointment.originalData.start_time,
            end_time: selectedAppointment.originalData.end_time,
            status: selectedAppointment.appointmentStatus || null,
            calendar_id: selectedAppointment.originalData.calendar_id,
            local_notes: selectedAppointment.localNotes || null,
            synced_at: selectedAppointment.ghlSyncedAt,
            created_at: selectedAppointment.originalData.created_at,
            updated_at: selectedAppointment.originalData.updated_at,
          }}
          open={!!selectedAppointment}
          onOpenChange={(open) => !open && setSelectedAppointment(null)}
          onSaveNotes={handleSaveNotes}
          isSaving={updateNotesMutation.isPending}
          crmLeadId={klant.id}
        />
      )}

      {/* Manual Event Detail Sheet */}
      {selectedManualEvent && selectedManualEvent.type === 'manual' && (
        <ManualEventDetailSheet
          event={selectedManualEvent.originalData}
          open={!!selectedManualEvent}
          onOpenChange={(open) => !open && setSelectedManualEvent(null)}
        />
      )}
    </>
  );
}
