import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { 
  Mail, 
  Phone, 
  Users, 
  Search, 
  Download, 
  CheckCircle, 
  Clock,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  XCircle,
  Trash2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface WebinarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
}

interface WebinarRegistration {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  confirmed: boolean | null;
  created_at: string;
  ghl_contact_id: string | null;
  ghl_appointment_id: string | null;
  ghl_synced_at: string | null;
  crm_lead_id: string | null;
  utm_source: string | null;
  crm_lead?: {
    id: string;
    journey_phase: string | null;
    follow_up_status: string | null;
  } | null;
}

interface WebinarRegistrationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: WebinarEvent | null;
}

const JOURNEY_PHASES: Record<string, { label: string; color: string }> = {
  orientatie: { label: "Oriëntatie", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  verdieping: { label: "Verdieping", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400" },
  gesprek: { label: "Gesprek", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  bezichtiging: { label: "Bezichtiging", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  reservering: { label: "Reservering", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  aankoop: { label: "Aankoop", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
};

const FOLLOW_UP_STATUS: Record<string, { label: string; color: string }> = {
  new: { label: "Nieuw", color: "bg-blue-100 text-blue-800" },
  contacted: { label: "Gecontacteerd", color: "bg-yellow-100 text-yellow-800" },
  scheduled: { label: "Ingepland", color: "bg-purple-100 text-purple-800" },
  completed: { label: "Afgerond", color: "bg-green-100 text-green-800" },
  not_interested: { label: "Geen interesse", color: "bg-gray-100 text-gray-800" },
};

export function WebinarRegistrationsDialog({ 
  open, 
  onOpenChange, 
  event 
}: WebinarRegistrationsDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteRegistrationId, setDeleteRegistrationId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { data: registrations, isLoading } = useQuery({
    queryKey: ['webinar-registrations', event?.id],
    queryFn: async () => {
      if (!event?.id) return [];
      
      const { data, error } = await supabase
        .from('webinar_registrations')
        .select(`
          *,
          crm_lead:crm_leads(id, journey_phase, follow_up_status)
        `)
        .eq('event_id', event.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WebinarRegistration[];
    },
    enabled: !!event?.id && open,
  });

  const retrySyncMutation = useMutation({
    mutationFn: async (registration: WebinarRegistration) => {
      if (!event) throw new Error("No event");
      
      const { error } = await supabase.functions.invoke("sync-webinar-registration", {
        body: {
          registration_id: registration.id,
          email: registration.email,
          first_name: registration.first_name,
          last_name: registration.last_name,
          phone: registration.phone,
          event_title: event.title,
          event_date: event.date,
          event_time: event.time,
          event_duration_minutes: 60,
          number_of_persons: 1,
        },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webinar-registrations', event?.id] });
      toast.success("GHL sync opnieuw gestart");
    },
    onError: () => {
      toast.error("GHL sync mislukt");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (registrationId: string) => {
      const { error } = await supabase
        .from("webinar_registrations")
        .delete()
        .eq("id", registrationId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registratie verwijderd");
      queryClient.invalidateQueries({ queryKey: ['webinar-registrations', event?.id] });
      setDeleteRegistrationId(null);
    },
    onError: (error) => {
      toast.error("Verwijderen mislukt: " + error.message);
      setDeleteRegistrationId(null);
    },
  });

  const filteredRegistrations = registrations?.filter((reg) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      reg.first_name.toLowerCase().includes(searchLower) ||
      reg.last_name.toLowerCase().includes(searchLower) ||
      reg.email.toLowerCase().includes(searchLower) ||
      (reg.phone && reg.phone.includes(searchQuery))
    );
  });

  const confirmedCount = registrations?.filter(r => r.confirmed).length || 0;
  const syncedCount = registrations?.filter(r => r.ghl_synced_at).length || 0;
  const failedSyncCount = registrations?.filter(r => r.confirmed && !r.ghl_synced_at).length || 0;

  const getGHLSyncStatus = (reg: WebinarRegistration) => {
    if (reg.ghl_synced_at && reg.ghl_contact_id) {
      return { status: "success", label: "GHL OK", color: "text-green-600" };
    }
    if (reg.confirmed && !reg.ghl_synced_at) {
      return { status: "failed", label: "Sync mislukt", color: "text-red-600" };
    }
    if (!reg.confirmed) {
      return { status: "pending", label: "Wacht op bevestiging", color: "text-amber-600" };
    }
    return { status: "unknown", label: "-", color: "text-muted-foreground" };
  };

  const handleExportCSV = () => {
    if (!registrations || registrations.length === 0) return;

    const headers = ['Voornaam', 'Achternaam', 'Email', 'Telefoon', 'Bevestigd', 'GHL Sync', 'Journey Phase', 'Follow-up', 'Ingeschreven op', 'UTM Source'];
    const rows = registrations.map(reg => [
      reg.first_name,
      reg.last_name,
      reg.email,
      reg.phone || '',
      reg.confirmed ? 'Ja' : 'Nee',
      reg.ghl_synced_at ? 'Ja' : 'Nee',
      reg.crm_lead?.journey_phase || '',
      reg.crm_lead?.follow_up_status || '',
      format(new Date(reg.created_at), 'd-M-yyyy HH:mm'),
      reg.utm_source || ''
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `webinar-registraties-${event?.date || 'export'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1100px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Registraties: {event.title}</span>
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            {format(new Date(event.date), "EEEE d MMMM yyyy", { locale: nl })} om {event.time.slice(0, 5)}
          </div>
        </DialogHeader>

        <div className="flex items-center justify-between gap-4 py-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op naam, email of telefoon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {registrations?.length || 0} registraties
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1 text-green-600 border-green-300">
              <CheckCircle className="h-3 w-3" />
              {confirmedCount} bevestigd
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1 text-green-600 border-green-300">
              GHL: {syncedCount}/{confirmedCount}
            </Badge>
            {failedSyncCount > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {failedSyncCount} sync gefaald
              </Badge>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportCSV}
              disabled={!registrations || registrations.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Naam</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>GHL Sync</TableHead>
                <TableHead>CRM Lead</TableHead>
                <TableHead>Journey Fase</TableHead>
                <TableHead>Follow-up</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead className="text-right">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TooltipProvider>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredRegistrations && filteredRegistrations.length > 0 ? (
                  filteredRegistrations.map((registration) => {
                    const syncStatus = getGHLSyncStatus(registration);
                    const journeyPhase = registration.crm_lead?.journey_phase;
                    const followUpStatus = registration.crm_lead?.follow_up_status;

                    return (
                      <TableRow key={registration.id}>
                        <TableCell className="font-medium">
                          {registration.first_name} {registration.last_name}
                        </TableCell>
                        <TableCell>
                          {registration.confirmed ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1 w-fit">
                              <CheckCircle className="h-3 w-3" />
                              Bevestigd
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-300 flex items-center gap-1 w-fit">
                              <Clock className="h-3 w-3" />
                              Wachtend
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className={`flex items-center gap-1 ${syncStatus.color}`}>
                                {syncStatus.status === "success" && <CheckCircle className="h-4 w-4" />}
                                {syncStatus.status === "failed" && <XCircle className="h-4 w-4" />}
                                {syncStatus.status === "pending" && <Clock className="h-4 w-4" />}
                                <span className="text-sm">{syncStatus.label}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {syncStatus.status === "success" && (
                                <div className="text-xs">
                                  <p>Gesynchroniseerd op: {registration.ghl_synced_at && format(new Date(registration.ghl_synced_at), "d MMM HH:mm")}</p>
                                  <p>Contact ID: {registration.ghl_contact_id?.slice(0, 12)}...</p>
                                </div>
                              )}
                              {syncStatus.status === "failed" && "Klik op retry om opnieuw te synchroniseren"}
                              {syncStatus.status === "pending" && "Wacht tot de gebruiker de registratie bevestigt"}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          {registration.crm_lead_id ? (
                            <Link 
                              to={`/admin/klanten/${registration.crm_lead_id}`}
                              className="flex items-center gap-1 text-primary hover:underline text-sm"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Bekijk
                            </Link>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {journeyPhase && JOURNEY_PHASES[journeyPhase] ? (
                            <Badge className={`${JOURNEY_PHASES[journeyPhase].color} text-xs`}>
                              {JOURNEY_PHASES[journeyPhase].label}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {followUpStatus && FOLLOW_UP_STATUS[followUpStatus] ? (
                            <Badge className={`${FOLLOW_UP_STATUS[followUpStatus].color} text-xs`}>
                              {FOLLOW_UP_STATUS[followUpStatus].label}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <a 
                                  href={`mailto:${registration.email}`}
                                  className="text-primary hover:text-primary/80"
                                >
                                  <Mail className="h-4 w-4" />
                                </a>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{registration.email}</p>
                              </TooltipContent>
                            </Tooltip>
                            {registration.phone && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a 
                                    href={`tel:${registration.phone}`}
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    <Phone className="h-4 w-4" />
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{registration.phone}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {format(new Date(registration.created_at), "d MMM HH:mm", { locale: nl })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {syncStatus.status === "failed" && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => retrySyncMutation.mutate(registration)}
                                    disabled={retrySyncMutation.isPending}
                                  >
                                    <RefreshCw className={`h-4 w-4 ${retrySyncMutation.isPending ? "animate-spin" : ""}`} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Retry GHL sync</TooltipContent>
                              </Tooltip>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteRegistrationId(registration.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Registratie verwijderen</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {searchQuery 
                        ? "Geen resultaten gevonden" 
                        : "Nog geen registraties voor dit webinar"}
                    </TableCell>
                  </TableRow>
                )}
              </TooltipProvider>
            </TableBody>
          </Table>
        </div>

        {filteredRegistrations && filteredRegistrations.length > 0 && (
          <div className="text-sm text-muted-foreground pt-2">
            {filteredRegistrations.length} registratie{filteredRegistrations.length !== 1 ? 's' : ''} 
            {searchQuery && ` gevonden`}
          </div>
        )}
      </DialogContent>

      <AlertDialog open={!!deleteRegistrationId} onOpenChange={() => setDeleteRegistrationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Registratie verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Deze actie kan niet ongedaan worden gemaakt. De registratie wordt permanent verwijderd.
              Eventuele GHL afspraken blijven bestaan en moeten handmatig worden verwijderd.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteRegistrationId && deleteMutation.mutate(deleteRegistrationId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
