import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { invalidateLeadQueries } from "@/hooks/useDropOffLead";

export type QualificationStatus = 'new' | 'active' | 'waiting' | 'passive' | 'not_interested' | 'archived' | 'dropped_off';

export type EventType = 'orientatie' | 'webinar' | 'infoavond' | 'bezichtiging' | 'other';

export interface LeadToFollow {
  id: string;
  crm_user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  journey_phase: string | null;
  user_id: string | null;
  created_at: string | null;
  last_visit_at: string | null;
  ghl_contact_id: string | null;
  // Partner referral
  referred_by_partner_id: string | null;
  partner_name: string | null;
  partner_company: string | null;
  partner_logo_url: string | null;
  // Qualification
  follow_up_status: QualificationStatus;
  qualified_at: string | null;
  qualification_reason: string | null;
  reactivated_at: string | null;
  // Dropped off
  dropped_off_at: string | null;
  dropped_off_phase: string | null;
  dropped_off_reason: string | null;
  recontact_allowed: boolean | null;
  recontact_after: string | null;
  // Milestone progress
  milestones_total: number;
  milestones_completed: number;
  // Pre-account status
  has_account: boolean;
  has_call_planned: boolean;
  has_call_done: boolean;
  has_invitation_sent: boolean;
  // Activity
  days_inactive: number;
  // Event-based data (from GHL appointments and webinars)
  last_event_type: EventType | null;
  last_event_title: string | null;
  last_event_date: string | null;
  days_since_event: number | null;
  attended_webinar: boolean;
  last_webinar_date: string | null;
  // Viewing trip
  has_viewing_trip: boolean;
  // Upcoming appointment
  upcoming_appointment_date: string | null;
  upcoming_appointment_title: string | null;
  // Computed
  urgency: 'critical' | 'high' | 'medium' | 'low';
  next_action: string;
}

export interface LeadStats {
  total: number;
  active: number;
  waiting: number;
  passive: number;
  archived: number;
  droppedOff: number;
  callPlanned: number;
  invitationSent: number;
  needsAction: number;
  postOrientatie: number;
  postWebinar: number;
  appointmentSoon: number;
}

function calculateUrgency(lead: {
  days_inactive: number;
  has_account: boolean;
  has_call_planned: boolean;
  has_call_done: boolean;
  follow_up_status: string;
  has_upcoming_appointment: boolean;
}): 'critical' | 'high' | 'medium' | 'low' {
  // Passive/archived/dropped_off leads are always low urgency
  if (['passive', 'not_interested', 'archived', 'dropped_off'].includes(lead.follow_up_status)) return 'low';
  // High: upcoming appointment within 48h
  if (lead.has_upcoming_appointment) return 'high';
  // Critical: inactive > 14 days and no call done
  if (lead.days_inactive > 14 && !lead.has_call_done) return 'critical';
  // High: inactive > 7 days OR no call planned
  if (lead.days_inactive > 7 || (!lead.has_call_planned && !lead.has_call_done)) return 'high';
  // Medium: has call planned but no account
  if (lead.has_call_planned && !lead.has_account) return 'medium';
  // Low: everything seems on track
  return 'low';
}

function determineNextAction(lead: {
  has_account: boolean;
  has_call_planned: boolean;
  has_call_done: boolean;
  has_invitation_sent: boolean;
  has_viewing_trip: boolean;
}): string {
  if (!lead.has_call_planned && !lead.has_call_done) return 'Plan oriëntatiegesprek';
  if (lead.has_call_planned && !lead.has_call_done) return 'Voer gesprek';
  if (lead.has_call_done && !lead.has_viewing_trip) return 'Plan bezichtigingsreis';
  if (lead.has_call_done && !lead.has_invitation_sent) return 'Stuur portaaluitnodiging';
  if (lead.has_invitation_sent && !lead.has_account) return 'Opvolgen uitnodiging';
  if (lead.has_account) return 'Monitor activiteit';
  return 'Opvolgen';
}

// Helper function to categorize event type based on title
function categorizeEvent(title: string | null): EventType {
  if (!title) return 'other';
  const lower = title.toLowerCase();
  if (lower.includes('webinar')) return 'webinar';
  if (lower.includes('oriëntatie') || lower.includes('orientatie') || lower.includes('oriënter') || lower.includes('orienter')) {
    if (lower.includes('avond')) return 'infoavond';
    return 'orientatie';
  }
  if (lower.includes('bezichtiging') || lower.includes('viewing')) return 'bezichtiging';
  if (lower.includes('info') && lower.includes('avond')) return 'infoavond';
  return 'other';
}

export function useLeadsToFollow(qualificationFilter: QualificationStatus[] = ['active', 'waiting']) {
  return useQuery({
    queryKey: ["leads-to-follow", qualificationFilter],
    queryFn: async () => {
      // First, get all lead IDs that have a sale
      const { data: saleLeadIds } = await supabase
        .from("sale_customers")
        .select("crm_lead_id");
      
      const excludedIds = saleLeadIds?.map(s => s.crm_lead_id).filter(Boolean) || [];

      // Fetch leads in orientatie, selectie, bezichtiging phases (not kopers)
      const { data: leads, error: leadsError } = await supabase
        .from("crm_leads")
        .select(`
          id,
          crm_user_id,
          first_name,
          last_name,
          email,
          phone,
          journey_phase,
          user_id,
          created_at,
          last_visit_at,
          ghl_contact_id,
          follow_up_status,
          qualified_at,
          qualification_reason,
          reactivated_at,
          dropped_off_at,
          dropped_off_phase,
          dropped_off_reason,
          recontact_allowed,
          recontact_after,
          referred_by_partner_id
        `)
        .in("journey_phase", ["orientatie", "selectie", "bezichtiging"])
        .order("last_visit_at", { ascending: false, nullsFirst: false });

      if (leadsError) throw leadsError;
      if (!leads) return { leads: [], stats: { total: 0, active: 0, waiting: 0, passive: 0, archived: 0, droppedOff: 0, callPlanned: 0, invitationSent: 0, needsAction: 0, postOrientatie: 0, postWebinar: 0, appointmentSoon: 0 } };

      // Filter out leads with sales
      const filteredLeads = leads.filter(l => !excludedIds.includes(l.id));

      // Fetch partners for referred leads
      const partnerIds = filteredLeads.map(l => l.referred_by_partner_id).filter(Boolean) as string[];
      let partnerMap = new Map<string, { name: string | null; company: string | null; logo_url: string | null }>();
      
      if (partnerIds.length > 0) {
        const { data: partners } = await supabase
          .from("partners")
          .select("id, name, company, logo_url")
          .in("id", partnerIds);
        
        partners?.forEach(p => {
          partnerMap.set(p.id, { name: p.name, company: p.company, logo_url: p.logo_url });
        });
      }

      // Fetch milestones for these leads
      const leadIds = filteredLeads.map(l => l.id);
      const { data: milestones } = await supabase
        .from("journey_milestones")
        .select("crm_lead_id, template_key, completed_at, admin_only")
        .in("crm_lead_id", leadIds);

      // Fetch past appointments for each lead (for event tracking)
      const { data: appointments } = await supabase
        .from("ghl_contact_appointments")
        .select("crm_lead_id, start_time, title, status")
        .in("crm_lead_id", leadIds)
        .lt("start_time", new Date().toISOString())
        .in("status", ["confirmed", "completed", "showed"])
        .order("start_time", { ascending: false });

      // Fetch webinar registrations with event dates
      const { data: webinarRegistrations } = await supabase
        .from("webinar_registrations")
        .select(`
          crm_lead_id,
          confirmed,
          webinar_events (
            id,
            date,
            time,
            title
          )
        `)
        .in("crm_lead_id", leadIds)
        .eq("confirmed", true);

      // Group appointments by lead - collect all for finding latest event
      const appointmentsByLead = new Map<string, Array<{ start_time: string; title: string | null; event_type: EventType }>>();
      appointments?.forEach(a => {
        const existing = appointmentsByLead.get(a.crm_lead_id) || [];
        existing.push({ 
          start_time: a.start_time, 
          title: a.title,
          event_type: categorizeEvent(a.title)
        });
        appointmentsByLead.set(a.crm_lead_id, existing);
      });

      // Group webinar registrations by lead
      const webinarsByLead = new Map<string, { event_date: string; title: string }>();
      webinarRegistrations?.forEach(w => {
        if (w.crm_lead_id && w.webinar_events) {
          const eventData = w.webinar_events as any;
          const eventDate = new Date(`${eventData.date}T${eventData.time || '00:00'}`);
          // Only include past webinars
          if (eventDate < new Date()) {
            webinarsByLead.set(w.crm_lead_id, {
              event_date: eventDate.toISOString(),
              title: eventData.title || 'Webinar'
            });
          }
        }
      });

      // Fetch viewing trips for these leads
      const { data: viewingTrips } = await supabase
        .from("customer_viewing_trips")
        .select("crm_lead_id")
        .in("crm_lead_id", leadIds);
      
      // Create a Set for quick lookup
      const leadsWithViewingTrip = new Set(viewingTrips?.map(t => t.crm_lead_id) || []);

      // Fetch upcoming appointments (within next 48 hours)
      const now = new Date();
      const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const { data: upcomingAppointments } = await supabase
        .from("ghl_contact_appointments")
        .select("crm_lead_id, start_time, title, status")
        .in("crm_lead_id", leadIds)
        .gte("start_time", now.toISOString())
        .lte("start_time", in48h.toISOString())
        .in("status", ["confirmed", "new", "showed"])
        .order("start_time", { ascending: true });

      // Map upcoming appointments by lead (first upcoming only)
      const upcomingByLead = new Map<string, { date: string; title: string | null }>();
      upcomingAppointments?.forEach(a => {
        if (!upcomingByLead.has(a.crm_lead_id)) {
          upcomingByLead.set(a.crm_lead_id, { date: a.start_time, title: a.title });
        }
      });

      // Group milestones by lead
      const milestonesByLead = new Map<string, typeof milestones>();
      milestones?.forEach(m => {
        const existing = milestonesByLead.get(m.crm_lead_id) || [];
        existing.push(m);
        milestonesByLead.set(m.crm_lead_id, existing);
      });

      // Process leads
      const processedLeads: LeadToFollow[] = filteredLeads.map(lead => {
        const leadMilestones = milestonesByLead.get(lead.id) || [];
        const partner = lead.referred_by_partner_id ? partnerMap.get(lead.referred_by_partner_id) : null;
        const leadAppointments = appointmentsByLead.get(lead.id) || [];
        const webinarData = webinarsByLead.get(lead.id);
        
        const hasAccount = lead.user_id !== null;
        const hasCallPlanned = leadMilestones.some(m => m.template_key === 'ori_call_gepland' && m.completed_at);
        const hasCallDone = leadMilestones.some(m => m.template_key === 'ori_call_gevoerd' && m.completed_at);
        const hasInvitationSent = leadMilestones.some(m => m.template_key === 'ori_uitnodiging_verstuurd' && m.completed_at);
        const hasViewingTrip = leadsWithViewingTrip.has(lead.id);
        
        const daysInactive = lead.last_visit_at 
          ? Math.floor((Date.now() - new Date(lead.last_visit_at).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        // Find the most recent relevant event (orientation/webinar/infoavond)
        // Prioritize orientatie gesprekken over webinars
        const orientatieAppointments = leadAppointments.filter(a => a.event_type === 'orientatie');
        const latestOrientatie = orientatieAppointments[0];
        
        // Determine last event - either from GHL appointments or webinar registrations
        let lastEventType: EventType | null = null;
        let lastEventTitle: string | null = null;
        let lastEventDate: string | null = null;

        // Check for orientatie gesprek first (highest priority)
        if (latestOrientatie) {
          lastEventType = 'orientatie';
          lastEventTitle = latestOrientatie.title;
          lastEventDate = latestOrientatie.start_time;
        } else if (webinarData) {
          // Then check webinar
          lastEventType = 'webinar';
          lastEventTitle = webinarData.title;
          lastEventDate = webinarData.event_date;
        } else if (leadAppointments.length > 0) {
          // Fallback to any other appointment
          const latest = leadAppointments[0];
          lastEventType = latest.event_type;
          lastEventTitle = latest.title;
          lastEventDate = latest.start_time;
        }

        const daysSinceEvent = lastEventDate 
          ? Math.floor((Date.now() - new Date(lastEventDate).getTime()) / (1000 * 60 * 60 * 24))
          : null;

        const attendedWebinar = !!webinarData;
        const lastWebinarDate = webinarData?.event_date || null;

        const followUpStatus = (lead.follow_up_status as QualificationStatus) || 'passive';
        const upcomingAppt = upcomingByLead.get(lead.id);
        const hasUpcomingAppointment = !!upcomingAppt;
        
        const urgency = calculateUrgency({ 
          days_inactive: daysInactive, 
          has_account: hasAccount, 
          has_call_planned: hasCallPlanned, 
          has_call_done: hasCallDone,
          follow_up_status: followUpStatus,
          has_upcoming_appointment: hasUpcomingAppointment,
        });
        const nextAction = determineNextAction({ has_account: hasAccount, has_call_planned: hasCallPlanned, has_call_done: hasCallDone, has_invitation_sent: hasInvitationSent, has_viewing_trip: hasViewingTrip });

        return {
          ...lead,
          partner_name: partner?.name || null,
          partner_company: partner?.company || null,
          partner_logo_url: partner?.logo_url || null,
          follow_up_status: followUpStatus,
          milestones_total: leadMilestones.length,
          milestones_completed: leadMilestones.filter(m => m.completed_at).length,
          has_account: hasAccount,
          has_call_planned: hasCallPlanned,
          has_call_done: hasCallDone,
          has_invitation_sent: hasInvitationSent,
          has_viewing_trip: hasViewingTrip,
          days_inactive: daysInactive,
          last_event_type: lastEventType,
          last_event_title: lastEventTitle,
          last_event_date: lastEventDate,
          days_since_event: daysSinceEvent,
          attended_webinar: attendedWebinar,
          last_webinar_date: lastWebinarDate,
          upcoming_appointment_date: upcomingAppt?.date || null,
          upcoming_appointment_title: upcomingAppt?.title || null,
          urgency,
          next_action: nextAction,
        };
      });

      // Calculate stats from ALL leads (before filtering)
      const stats: LeadStats = {
        total: processedLeads.filter(l => ['active', 'waiting'].includes(l.follow_up_status)).length,
        active: processedLeads.filter(l => l.follow_up_status === 'active').length,
        waiting: processedLeads.filter(l => l.follow_up_status === 'waiting').length,
        passive: processedLeads.filter(l => l.follow_up_status === 'passive').length,
        archived: processedLeads.filter(l => ['not_interested', 'archived'].includes(l.follow_up_status)).length,
        droppedOff: processedLeads.filter(l => l.follow_up_status === 'dropped_off').length,
        callPlanned: processedLeads.filter(l => l.has_call_planned && !l.has_call_done && ['active', 'waiting'].includes(l.follow_up_status)).length,
        invitationSent: processedLeads.filter(l => l.has_invitation_sent && !l.has_account && ['active', 'waiting'].includes(l.follow_up_status)).length,
        needsAction: processedLeads.filter(l => (l.urgency === 'critical' || l.urgency === 'high') && ['active', 'waiting'].includes(l.follow_up_status)).length,
        // Leads met oriëntatiegesprek maar nog geen bezichtigingsreis
        postOrientatie: processedLeads.filter(l => 
          l.last_event_type === 'orientatie' && 
          !l.has_viewing_trip &&
          ['active', 'waiting', 'new'].includes(l.follow_up_status)
        ).length,
        // Leads die webinar hebben gevolgd maar nog geen oriëntatiegesprek
        postWebinar: processedLeads.filter(l => 
          l.attended_webinar && 
          l.last_event_type !== 'orientatie' &&
          ['active', 'waiting', 'new'].includes(l.follow_up_status)
        ).length,
        // Leads met een afspraak binnen 48 uur
        appointmentSoon: processedLeads.filter(l => 
          l.upcoming_appointment_date !== null &&
          ['active', 'waiting', 'new'].includes(l.follow_up_status)
        ).length,
      };

      // Filter by qualification status
      const filteredByQualification = processedLeads.filter(l => 
        qualificationFilter.length === 0 || qualificationFilter.includes(l.follow_up_status)
      );

      // Sort by urgency (critical first), then by status (active before waiting)
      const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const statusOrder: Record<string, number> = { active: 0, waiting: 1, passive: 2, not_interested: 3, archived: 4 };
      filteredByQualification.sort((a, b) => {
        const statusDiff = (statusOrder[a.follow_up_status] || 5) - (statusOrder[b.follow_up_status] || 5);
        if (statusDiff !== 0) return statusDiff;
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      });

      return { leads: filteredByQualification, stats, allLeads: processedLeads };
    },
  });
}

export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: QualificationStatus }) => {
      // Prevent setting dropped_off via this hook - use useDropOffLead instead
      if (status === 'dropped_off') {
        throw new Error("Use useDropOffLead hook to mark leads as dropped off");
      }
      
      const { error } = await supabase
        .from("crm_leads")
        .update({ 
          follow_up_status: status,
          updated_at: new Date().toISOString()
        })
        .eq("id", leadId);
      
      if (error) throw error;
      return leadId;
    },
    onSuccess: (leadId) => {
      invalidateLeadQueries(queryClient, leadId);
      toast.success("Lead status bijgewerkt");
    },
    onError: (error) => {
      console.error("Error updating lead status:", error);
      toast.error("Kon status niet bijwerken");
    }
  });
}

export function useKopers() {
  return useQuery({
    queryKey: ["kopers"],
    queryFn: async () => {
      // Fetch leads that have a sale
      const { data: saleCustomers, error: saleError } = await supabase
        .from("sale_customers")
        .select(`
          crm_lead_id,
          crm_leads (
            id,
            crm_user_id,
            first_name,
            last_name,
            email,
            phone,
            journey_phase,
            user_id,
            created_at,
            last_visit_at,
            ghl_contact_id
          )
        `);

      if (saleError) throw saleError;
      
      const kopers = saleCustomers
        ?.flatMap(sc => {
          const leads = sc.crm_leads;
          return Array.isArray(leads) ? leads : leads ? [leads] : [];
        }) || [];

      // Dedupliceer op id
      const unique = Array.from(
        new Map(kopers.map(k => [k.id, k])).values()
      );

      return unique;
    },
  });
}
