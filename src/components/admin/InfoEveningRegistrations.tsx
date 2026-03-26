import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Mail, Phone, Users, Search, Download, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface InfoEveningEvent {
  id: string;
  title: string;
  date: string;
  location_name: string;
}

interface InfoEveningRegistrationsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: InfoEveningEvent | null;
}

export function InfoEveningRegistrations({ 
  open, 
  onOpenChange, 
  event 
}: InfoEveningRegistrationsProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: registrations, isLoading } = useQuery({
    queryKey: ['info-evening-registrations', event?.id],
    queryFn: async () => {
      if (!event?.id) return [];
      
      const { data, error } = await supabase
        .from('info_evening_registrations')
        .select('*')
        .eq('event_id', event.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!event?.id && open,
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

  const totalPersons = registrations?.reduce((sum, reg) => sum + (reg.number_of_persons || 1), 0) || 0;
  const confirmedCount = registrations?.filter(r => r.confirmed).length || 0;

  const handleExportCSV = () => {
    if (!registrations || registrations.length === 0) return;

    const headers = ['Voornaam', 'Achternaam', 'Email', 'Telefoon', 'Aantal personen', 'Bevestigd', 'Ingeschreven op', 'UTM Source'];
    const rows = registrations.map(reg => [
      reg.first_name,
      reg.last_name,
      reg.email,
      reg.phone || '',
      reg.number_of_persons || 1,
      reg.confirmed ? 'Ja' : 'Nee',
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
    link.download = `inschrijvingen-${event?.title.toLowerCase().replace(/\s+/g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Inschrijvingen: {event.title}</span>
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            {format(new Date(event.date), "EEEE d MMMM yyyy", { locale: nl })} - {event.location_name}
          </div>
        </DialogHeader>

        <div className="flex items-center justify-between gap-4 py-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op naam, email of telefoon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {totalPersons} personen
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              {confirmedCount}/{registrations?.length || 0} bevestigd
            </Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportCSV}
              disabled={!registrations || registrations.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Naam</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefoon</TableHead>
                <TableHead className="text-center">Personen</TableHead>
                <TableHead>Ingeschreven op</TableHead>
                <TableHead>Bron</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : filteredRegistrations && filteredRegistrations.length > 0 ? (
                filteredRegistrations.map((registration) => (
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
                        <Badge variant="outline" className="text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-600 flex items-center gap-1 w-fit">
                          <Clock className="h-3 w-3" />
                          Wachtend
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <a 
                        href={`mailto:${registration.email}`}
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <Mail className="h-3 w-3" />
                        {registration.email}
                      </a>
                    </TableCell>
                    <TableCell>
                      {registration.phone ? (
                        <a 
                          href={`tel:${registration.phone}`}
                          className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                        >
                          <Phone className="h-3 w-3" />
                          {registration.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">
                        {registration.number_of_persons || 1}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(registration.created_at), "d MMM yyyy HH:mm", { locale: nl })}
                    </TableCell>
                    <TableCell>
                      {registration.utm_source ? (
                        <Badge variant="secondary" className="text-xs">
                          {registration.utm_source}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchQuery 
                      ? "Geen resultaten gevonden" 
                      : "Nog geen inschrijvingen voor dit event"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {filteredRegistrations && filteredRegistrations.length > 0 && (
          <div className="text-sm text-muted-foreground pt-2">
            {filteredRegistrations.length} inschrijving{filteredRegistrations.length !== 1 ? 'en' : ''} 
            {searchQuery && ` gevonden`}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
