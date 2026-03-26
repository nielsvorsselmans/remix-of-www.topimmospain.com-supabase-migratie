import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Plus, Pencil, Trash2, Users, Video, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { WebinarRegistrationsDialog } from "@/components/admin/WebinarRegistrationsDialog";

interface WebinarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  duration_minutes: number;
  max_capacity: number;
  current_registrations: number;
  active: boolean;
  webinar_url: string | null;
  description: string | null;
}

export default function AdminWebinars() {
  const queryClient = useQueryClient();
  const [editingEvent, setEditingEvent] = useState<WebinarEvent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingEvent, setViewingEvent] = useState<WebinarEvent | null>(null);

  const { data: events, isLoading } = useQuery({
    queryKey: ["admin-webinar-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webinar_events")
        .select("*")
        .order("date", { ascending: true });
      if (error) throw error;
      return data as WebinarEvent[];
    },
  });


  const saveMutation = useMutation({
    mutationFn: async (event: Partial<WebinarEvent>) => {
      if (event.id) {
        const { error } = await supabase
          .from("webinar_events")
          .update(event)
          .eq("id", event.id);
        if (error) throw error;
      } else {
        const { id, ...insertData } = event;
        const { error } = await supabase.from("webinar_events").insert({
          title: insertData.title || "",
          date: insertData.date || "",
          time: insertData.time || "19:30",
          duration_minutes: insertData.duration_minutes,
          max_capacity: insertData.max_capacity,
          active: insertData.active,
          webinar_url: insertData.webinar_url,
          description: insertData.description,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-webinar-events"] });
      setIsDialogOpen(false);
      setEditingEvent(null);
      toast.success("Webinar opgeslagen");
    },
    onError: () => toast.error("Kon webinar niet opslaan"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("webinar_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-webinar-events"] });
      setDeleteId(null);
      toast.success("Webinar verwijderd");
    },
    onError: () => toast.error("Kon webinar niet verwijderen"),
  });

  const handleAddNew = () => {
    setEditingEvent({
      id: "",
      title: "Gratis Online Webinar: Investeren in Spaans Vastgoed",
      date: "",
      time: "19:30",
      duration_minutes: 60,
      max_capacity: 100,
      current_registrations: 0,
      active: true,
      webinar_url: null,
      description: null,
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingEvent) return;
    const { id, ...data } = editingEvent;
    saveMutation.mutate(id ? editingEvent : data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Webinars</h1>
          <p className="text-muted-foreground">Beheer online webinar sessies</p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-2" />
          Nieuw Webinar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Video className="h-4 w-4" />
            <span className="text-sm">Totaal webinars</span>
          </div>
          <p className="text-2xl font-bold">{events?.length || 0}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">Komende webinars</span>
          </div>
          <p className="text-2xl font-bold">
            {events?.filter((e) => new Date(e.date) >= new Date()).length || 0}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="h-4 w-4" />
            <span className="text-sm">Totaal registraties</span>
          </div>
          <p className="text-2xl font-bold">
            {events?.reduce((acc, e) => acc + e.current_registrations, 0) || 0}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Datum</TableHead>
              <TableHead className="hidden sm:table-cell">Tijd</TableHead>
              <TableHead>Titel</TableHead>
              <TableHead className="hidden sm:table-cell">Registraties</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="text-right">Acties</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Geen webinars gevonden. Klik op "Nieuw Webinar" om er een toe te voegen.
                </TableCell>
              </TableRow>
            ) : (
              events?.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    {format(new Date(event.date), "d MMM yyyy", { locale: nl })}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{event.time.slice(0, 5)}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{event.title}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={event.current_registrations >= event.max_capacity ? "destructive" : "secondary"}>
                      {event.current_registrations}/{event.max_capacity}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={event.active ? "default" : "outline"}>
                      {event.active ? "Actief" : "Inactief"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => setViewingEvent(event)}>
                      <Users className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setEditingEvent(event); setIsDialogOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(event.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEvent?.id ? "Webinar bewerken" : "Nieuw webinar"}</DialogTitle>
          </DialogHeader>
          {editingEvent && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Titel</Label>
                <Input
                  value={editingEvent.title}
                  onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Datum</Label>
                  <Input
                    type="date"
                    value={editingEvent.date}
                    onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tijd</Label>
                  <Input
                    type="time"
                    value={editingEvent.time}
                    onChange={(e) => setEditingEvent({ ...editingEvent, time: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duur (minuten)</Label>
                  <Input
                    type="number"
                    value={editingEvent.duration_minutes}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, duration_minutes: parseInt(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max capaciteit</Label>
                  <Input
                    type="number"
                    value={editingEvent.max_capacity}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, max_capacity: parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Webinar URL (Zoom/Teams/etc)</Label>
                <Input
                  value={editingEvent.webinar_url || ""}
                  onChange={(e) => setEditingEvent({ ...editingEvent, webinar_url: e.target.value })}
                  placeholder="https://zoom.us/j/..."
                />
              </div>
              <div className="space-y-2">
                <Label>Beschrijving</Label>
                <Textarea
                  value={editingEvent.description || ""}
                  onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Actief</Label>
                <Switch
                  checked={editingEvent.active}
                  onCheckedChange={(checked) => setEditingEvent({ ...editingEvent, active: checked })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button onClick={handleSave} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Opslaan..." : "Opslaan"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Registrations Dialog */}
      <WebinarRegistrationsDialog 
        open={!!viewingEvent} 
        onOpenChange={(open) => !open && setViewingEvent(null)}
        event={viewingEvent}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Webinar verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dit verwijdert ook alle registraties voor dit webinar. Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
