import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Plus, Pencil, Trash2, Users, Calendar, MapPin, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { InfoEveningEventDialog } from "@/components/admin/InfoEveningEventDialog";
import { InfoEveningRegistrations } from "@/components/admin/InfoEveningRegistrations";

interface InfoEveningEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  doors_open_time: string | null;
  presentation_start_time: string | null;
  presentation_end_time: string | null;
  location_name: string;
  location_address: string;
  max_capacity: number | null;
  current_registrations: number | null;
  active: boolean | null;
  created_at: string;
}

export default function InfoAvonden() {
  const queryClient = useQueryClient();
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [registrationsDialogOpen, setRegistrationsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<InfoEveningEvent | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<InfoEveningEvent | null>(null);

  const { data: events, isLoading } = useQuery({
    queryKey: ['admin-info-evening-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('info_evening_events')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      return data as InfoEveningEvent[];
    },
  });

  const { data: totalRegistrations } = useQuery({
    queryKey: ['admin-info-evening-total-registrations'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('info_evening_registrations')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count || 0;
    },
  });

  const saveEventMutation = useMutation({
    mutationFn: async (data: { 
      id?: string;
      title: string; 
      date: Date; 
      doors_open_time: string;
      presentation_start_time: string;
      presentation_end_time: string;
      location_name: string; 
      location_address: string;
      max_capacity: number;
      active: boolean;
    }) => {
      const eventData = {
        title: data.title,
        date: format(data.date, 'yyyy-MM-dd'),
        time: data.presentation_start_time, // Keep 'time' column for backward compatibility
        doors_open_time: data.doors_open_time,
        presentation_start_time: data.presentation_start_time,
        presentation_end_time: data.presentation_end_time,
        location_name: data.location_name,
        location_address: data.location_address,
        max_capacity: data.max_capacity,
        active: data.active,
      };

      if (data.id) {
        const { error } = await supabase
          .from('info_evening_events')
          .update(eventData)
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('info_evening_events')
          .insert(eventData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-info-evening-events'] });
      toast.success(selectedEvent ? "Event bijgewerkt" : "Event toegevoegd");
    },
    onError: () => {
      toast.error("Er ging iets mis");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('info_evening_events')
        .update({ active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-info-evening-events'] });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('info_evening_events')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-info-evening-events'] });
      toast.success("Event verwijderd");
      setDeleteDialogOpen(false);
      setEventToDelete(null);
    },
    onError: () => {
      toast.error("Kan event niet verwijderen (mogelijk zijn er nog inschrijvingen)");
    },
  });

  const handleEditEvent = (event: InfoEveningEvent) => {
    setSelectedEvent(event);
    setEventDialogOpen(true);
  };

  const handleAddEvent = () => {
    setSelectedEvent(null);
    setEventDialogOpen(true);
  };

  const handleViewRegistrations = (event: InfoEveningEvent) => {
    setSelectedEvent(event);
    setRegistrationsDialogOpen(true);
  };

  const handleDeleteEvent = (event: InfoEveningEvent) => {
    setEventToDelete(event);
    setDeleteDialogOpen(true);
  };

  const handleSaveEvent = async (data: {
    title: string;
    date: Date;
    doors_open_time: string;
    presentation_start_time: string;
    presentation_end_time: string;
    location_name: string;
    location_address: string;
    max_capacity: number;
    active: boolean;
  }) => {
    await saveEventMutation.mutateAsync({
      ...data,
      id: selectedEvent?.id,
    });
  };

  const getCapacityBadge = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) {
      return <Badge variant="destructive">{current}/{max}</Badge>;
    } else if (percentage >= 70) {
      return <Badge className="bg-orange-500">{current}/{max}</Badge>;
    }
    return <Badge variant="secondary">{current}/{max}</Badge>;
  };

  const upcomingEvents = events?.filter(e => new Date(e.date) >= new Date()) || [];
  const totalCapacity = events?.reduce((sum, e) => sum + (e.max_capacity || 0), 0) || 0;
  const totalCurrentRegs = events?.reduce((sum, e) => sum + (e.current_registrations || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Infoavonden</h1>
        <p className="text-muted-foreground">Beheer fysieke infoavonden en inschrijvingen</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Totaal Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aankomende Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingEvents.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Totaal Inschrijvingen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRegistrations || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gemiddelde Bezetting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalCapacity > 0 ? Math.round((totalCurrentRegs / totalCapacity) * 100) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Infoavonden
          </CardTitle>
          <Button onClick={handleAddEvent}>
            <Plus className="h-4 w-4 mr-1" />
            Nieuw Event
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Titel</TableHead>
                <TableHead className="hidden sm:table-cell">Locatie</TableHead>
                <TableHead className="hidden sm:table-cell">Tijd</TableHead>
                <TableHead>Bezetting</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="text-right">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : events && events.length > 0 ? (
                events.map((event) => {
                  const isPast = new Date(event.date) < new Date();
                  return (
                    <TableRow key={event.id} className={isPast ? "opacity-60" : ""}>
                      <TableCell>
                        <div className="font-medium">
                          {format(new Date(event.date), "EEE d MMM", { locale: nl })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(event.date), "yyyy")}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{event.title}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {event.location_name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {event.location_address}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{event.time.substring(0, 5)}</TableCell>
                      <TableCell>
                        {getCapacityBadge(
                          event.current_registrations || 0,
                          event.max_capacity || 50
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={event.active ?? true}
                            onCheckedChange={(checked) => 
                              toggleActiveMutation.mutate({ id: event.id, active: checked })
                            }
                          />
                          {event.active ? (
                            <Eye className="h-4 w-4 text-green-600" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewRegistrations(event)}
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditEvent(event)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteEvent(event)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Geen events gevonden
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <InfoEveningEventDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        event={selectedEvent}
        onSave={handleSaveEvent}
      />

      <InfoEveningRegistrations
        open={registrationsDialogOpen}
        onOpenChange={setRegistrationsDialogOpen}
        event={selectedEvent}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Event verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je "{eventToDelete?.title}" wilt verwijderen? 
              Dit kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => eventToDelete && deleteEventMutation.mutate(eventToDelete.id)}
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
