import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EventType = 'appointment' | 'webinar' | 'info_evening' | 'manual';

export interface KlantEvent {
  id: string;
  type: EventType;
  title: string;
  date: Date;
  endDate?: Date;
  status: 'upcoming' | 'past';
  confirmed: boolean;
  ghlSynced: boolean | null;
  ghlSyncedAt: string | null;
  location?: string;
  appointmentStatus?: string | null;
  localNotes?: string | null;
  numberOfPersons?: number;
  manualEventType?: string;
  description?: string | null;
  originalData: any;
}

export function useKlantEvents(crmLeadId: string, ghlContactId: string | null) {
  return useQuery({
    queryKey: ['klant-events', crmLeadId],
    queryFn: async (): Promise<KlantEvent[]> => {
      const now = new Date();
      const events: KlantEvent[] = [];

      // 1. Fetch GHL Appointments
      const { data: appointments, error: appointmentsError } = await supabase
        .from('ghl_contact_appointments')
        .select('*')
        .eq('crm_lead_id', crmLeadId)
        .order('start_time', { ascending: false });

      if (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError);
      } else if (appointments) {
        appointments.forEach(apt => {
          const startDate = new Date(apt.start_time);
          const endDate = new Date(apt.end_time);
          events.push({
            id: apt.id,
            type: 'appointment',
            title: apt.title || 'Afspraak',
            date: startDate,
            endDate: endDate,
            status: startDate > now ? 'upcoming' : 'past',
            confirmed: apt.status === 'confirmed',
            ghlSynced: true,
            ghlSyncedAt: apt.synced_at,
            appointmentStatus: apt.status,
            localNotes: apt.local_notes,
            originalData: apt,
          });
        });
      }

      // 2. Fetch Webinar Registrations
      const { data: webinarRegs, error: webinarError } = await supabase
        .from('webinar_registrations')
        .select(`
          *,
          webinar_events (
            id,
            title,
            date,
            time
          )
        `)
        .eq('crm_lead_id', crmLeadId);

      if (webinarError) {
        console.error('Error fetching webinar registrations:', webinarError);
      } else if (webinarRegs) {
        webinarRegs.forEach(reg => {
          const event = reg.webinar_events as any;
          if (!event) return;
          
          const eventDate = new Date(`${event.date}T${event.time || '00:00:00'}`);
          events.push({
            id: reg.id,
            type: 'webinar',
            title: event.title || 'Webinar',
            date: eventDate,
            status: eventDate > now ? 'upcoming' : 'past',
            confirmed: reg.confirmed || false,
            ghlSynced: !!reg.ghl_synced_at,
            ghlSyncedAt: reg.ghl_synced_at,
            originalData: reg,
          });
        });
      }

      // 3. Fetch Info Evening Registrations
      const { data: infoRegs, error: infoError } = await supabase
        .from('info_evening_registrations')
        .select(`
          *,
          info_evening_events (
            id,
            title,
            date,
            time,
            location_name,
            location_address
          )
        `)
        .eq('crm_lead_id', crmLeadId);

      if (infoError) {
        console.error('Error fetching info evening registrations:', infoError);
      } else if (infoRegs) {
        infoRegs.forEach(reg => {
          const event = reg.info_evening_events as any;
          if (!event) return;
          
          const eventDate = new Date(`${event.date}T${event.time || '00:00:00'}`);
          events.push({
            id: reg.id,
            type: 'info_evening',
            title: event.title || 'Infoavond',
            date: eventDate,
            status: eventDate > now ? 'upcoming' : 'past',
            confirmed: reg.confirmed || false,
            ghlSynced: !!reg.ghl_synced_at,
            ghlSyncedAt: reg.ghl_synced_at,
            location: event.location_name,
            numberOfPersons: reg.number_of_persons,
            originalData: reg,
          });
        });
      }

      // 4. Fetch Manual Events
      const { data: manualEvents, error: manualError } = await supabase
        .from('manual_events')
        .select('*')
        .eq('crm_lead_id', crmLeadId)
        .order('event_date', { ascending: false });

      if (manualError) {
        console.error('Error fetching manual events:', manualError);
      } else if (manualEvents) {
        manualEvents.forEach(evt => {
          const eventDate = new Date(evt.event_date);
          events.push({
            id: evt.id,
            type: 'manual',
            title: evt.title,
            date: eventDate,
            status: eventDate > now ? 'upcoming' : 'past',
            confirmed: true, // Manual events are always "confirmed"
            ghlSynced: null, // Not synced to GHL
            ghlSyncedAt: null,
            localNotes: evt.notes,
            manualEventType: evt.event_type,
            description: evt.description,
            originalData: evt,
          });
        });
      }

      // Sort by date (newest first for past, soonest first for upcoming)
      events.sort((a, b) => {
        // Upcoming events first, sorted ascending (soonest first)
        // Past events after, sorted descending (most recent first)
        if (a.status === 'upcoming' && b.status === 'past') return -1;
        if (a.status === 'past' && b.status === 'upcoming') return 1;
        
        if (a.status === 'upcoming') {
          return a.date.getTime() - b.date.getTime();
        } else {
          return b.date.getTime() - a.date.getTime();
        }
      });

      return events;
    },
    enabled: !!crmLeadId,
  });
}
