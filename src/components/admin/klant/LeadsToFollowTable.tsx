import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  ChevronRight,
  Phone,
  Mail,
  User,
  UserCheck,
  CheckCircle2,
  Circle,
  AlertCircle,
  Clock,
  UserMinus,
  Archive,
  MoreHorizontal,
  RotateCcw,
  Target,
  Video,
  MapPin,
  CalendarDays,
  PhoneCall,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { LeadToFollow, QualificationStatus, EventType } from "@/hooks/useLeadsToFollow";
import { getJourneyPhase } from "@/hooks/useKlanten";
import { PartnerBadge } from "@/components/admin/PartnerBadge";
import { LeadTasksPopover } from "./LeadTasksPopover";
import { useLeadTaskCounts } from "@/hooks/useLeadTasks";

const getEventIcon = (eventType: EventType | null) => {
  switch (eventType) {
    case 'orientatie': return <Target className="h-3.5 w-3.5" />;
    case 'webinar': return <Video className="h-3.5 w-3.5" />;
    case 'bezichtiging': return <MapPin className="h-3.5 w-3.5" />;
    case 'infoavond': return <CalendarDays className="h-3.5 w-3.5" />;
    default: return <CalendarDays className="h-3.5 w-3.5" />;
  }
};

const getEventLabel = (eventType: EventType | null) => {
  switch (eventType) {
    case 'orientatie': return 'Oriëntatie';
    case 'webinar': return 'Webinar';
    case 'bezichtiging': return 'Bezichtiging';
    case 'infoavond': return 'Infoavond';
    default: return 'Event';
  }
};

interface LeadsToFollowTableProps {
  leads: LeadToFollow[];
  onMarkCallDone?: (leadId: string) => void;
  onSendInvitation?: (leadId: string) => void;
  onUpdateStatus?: (leadId: string, status: QualificationStatus) => void;
}

export function LeadsToFollowTable({ leads, onMarkCallDone, onSendInvitation, onUpdateStatus }: LeadsToFollowTableProps) {
  const navigate = useNavigate();
  const leadIds = leads.map(l => l.id);
  const { data: taskCounts } = useLeadTaskCounts(leadIds);

  const getUrgencyBadge = (urgency: LeadToFollow['urgency']) => {
    switch (urgency) {
      case 'critical':
        return <Badge variant="destructive" className="gap-1 text-xs"><AlertCircle className="h-3 w-3" /> Kritiek</Badge>;
      case 'high':
        return <Badge className="bg-orange-500 hover:bg-orange-600 gap-1 text-xs"><Clock className="h-3 w-3" /> Hoog</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="gap-1 text-xs">Medium</Badge>;
      default:
        return <Badge variant="outline" className="gap-1 text-xs">Laag</Badge>;
    }
  };

  const getQualificationBadge = (status: QualificationStatus) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-600 text-xs">Actief</Badge>;
      case 'waiting':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-xs">Afwachtend</Badge>;
      case 'passive':
        return <Badge variant="secondary" className="text-xs">Passief</Badge>;
      case 'not_interested':
        return <Badge variant="outline" className="text-xs text-muted-foreground">Niet geïnteresseerd</Badge>;
      case 'archived':
        return <Badge variant="outline" className="text-xs text-muted-foreground">Gearchiveerd</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Onbekend</Badge>;
    }
  };

  if (leads.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Geen leads om op te volgen
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lead</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Laatste event</TableHead>
            <TableHead className="hidden sm:table-cell text-center">Voortgang</TableHead>
            <TableHead>Urgentie</TableHead>
            <TableHead className="hidden sm:table-cell">Taken</TableHead>
            <TableHead className="hidden lg:table-cell">Actie</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map(lead => {
            const phase = getJourneyPhase(lead.journey_phase);
            const name = `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || lead.email || "Onbekend";
            const counts = taskCounts?.get(lead.id) || { open: 0, total: 0 };

            return (
              <TableRow
                key={lead.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/admin/klanten/${lead.id}`)}
              >
                {/* Lead: naam + email + badges */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{name}</p>
                      {lead.email && name !== lead.email && (
                        <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                      )}
                    </div>
                    {lead.referred_by_partner_id && (
                      <PartnerBadge
                        partnerId={lead.referred_by_partner_id}
                        partnerName={lead.partner_name}
                        partnerCompany={lead.partner_company}
                        partnerLogoUrl={lead.partner_logo_url}
                        size="sm"
                      />
                    )}
                    {lead.reactivated_at && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300 text-xs gap-1 shrink-0">
                            <RotateCcw className="h-3 w-3" />
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          Gereactiveerd op {new Date(lead.reactivated_at).toLocaleDateString('nl-NL')}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>

                {/* Status + Fase */}
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {getQualificationBadge(lead.follow_up_status)}
                    <Badge className={`${phase.color} text-xs`}>
                      {phase.icon} {phase.label}
                    </Badge>
                  </div>
                </TableCell>

                {/* Laatste event + upcoming appointment */}
                <TableCell className="hidden md:table-cell">
                  {lead.upcoming_appointment_date ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                          <CalendarDays className="h-3.5 w-3.5" />
                          <span>📅 {format(new Date(lead.upcoming_appointment_date), 'EEE HH:mm', { locale: nl })}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">Aankomende afspraak</p>
                        <p className="text-sm">{lead.upcoming_appointment_title || 'Afspraak'}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(lead.upcoming_appointment_date), 'PPP HH:mm', { locale: nl })}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ) : lead.last_event_date ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={`flex items-center gap-1.5 text-sm ${
                          lead.days_since_event !== null && lead.days_since_event > 7 && !lead.has_account
                            ? 'text-red-600 font-medium'
                            : lead.days_since_event !== null && lead.days_since_event <= 3
                            ? 'text-green-600'
                            : 'text-muted-foreground'
                        }`}>
                          {getEventIcon(lead.last_event_type)}
                          <span>{formatDistanceToNow(new Date(lead.last_event_date), { addSuffix: true, locale: nl })}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="flex items-center gap-1.5 font-medium">
                          {getEventIcon(lead.last_event_type)}
                          <span>{getEventLabel(lead.last_event_type)}</span>
                        </div>
                        <p className="text-sm">{lead.last_event_title || 'Event'}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(lead.last_event_date), 'PPP', { locale: nl })}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ) : lead.attended_webinar ? (
                    <div className="flex items-center gap-1.5 text-sm text-purple-600">
                      <Video className="h-3.5 w-3.5" />
                      <span>Webinar</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>

                {/* Voortgang: 4 mini-iconen */}
                <TableCell className="hidden sm:table-cell">
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {lead.has_call_planned ? (
                          <PhoneCall className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Phone className="h-3.5 w-3.5 text-muted-foreground/40" />
                        )}
                      </TooltipTrigger>
                      <TooltipContent>Call {lead.has_call_planned ? 'gepland' : 'niet gepland'}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {lead.has_call_done ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />
                        )}
                      </TooltipTrigger>
                      <TooltipContent>Call {lead.has_call_done ? 'gevoerd' : 'niet gevoerd'}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {lead.has_invitation_sent ? (
                          <Mail className="h-3.5 w-3.5 text-blue-500" />
                        ) : (
                          <Mail className="h-3.5 w-3.5 text-muted-foreground/40" />
                        )}
                      </TooltipTrigger>
                      <TooltipContent>Uitnodiging {lead.has_invitation_sent ? 'verstuurd' : 'niet verstuurd'}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {lead.has_account ? (
                          <UserCheck className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <User className="h-3.5 w-3.5 text-muted-foreground/40" />
                        )}
                      </TooltipTrigger>
                      <TooltipContent>Account {lead.has_account ? 'actief' : 'geen'}</TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>

                {/* Urgentie */}
                <TableCell>
                  {getUrgencyBadge(lead.urgency)}
                </TableCell>

                {/* Taken */}
                <TableCell className="hidden sm:table-cell">
                  <LeadTasksPopover leadId={lead.id} openCount={counts.open} totalCount={counts.total} />
                </TableCell>

                {/* Actie + knoppen */}
                <TableCell className="hidden lg:table-cell">
                  <span className="text-sm text-muted-foreground">{lead.next_action}</span>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    {!lead.has_call_done && lead.has_call_planned && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMarkCallDone?.(lead.id)}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Markeer call als gevoerd</TooltipContent>
                      </Tooltip>
                    )}
                    {lead.has_call_done && !lead.has_invitation_sent && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onSendInvitation?.(lead.id)}>
                            <Mail className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Stuur portaaluitnodiging</TooltipContent>
                      </Tooltip>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {lead.follow_up_status !== 'active' && (
                          <DropdownMenuItem onClick={() => onUpdateStatus?.(lead.id, 'active')}>
                            <UserCheck className="h-4 w-4 mr-2 text-green-500" /> Actief
                          </DropdownMenuItem>
                        )}
                        {lead.follow_up_status !== 'waiting' && (
                          <DropdownMenuItem onClick={() => onUpdateStatus?.(lead.id, 'waiting')}>
                            <Clock className="h-4 w-4 mr-2 text-yellow-500" /> Afwachtend
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {lead.follow_up_status !== 'not_interested' && (
                          <DropdownMenuItem onClick={() => onUpdateStatus?.(lead.id, 'not_interested')}>
                            <UserMinus className="h-4 w-4 mr-2 text-muted-foreground" /> Niet geïnteresseerd
                          </DropdownMenuItem>
                        )}
                        {lead.follow_up_status !== 'archived' && (
                          <DropdownMenuItem onClick={() => onUpdateStatus?.(lead.id, 'archived')}>
                            <Archive className="h-4 w-4 mr-2 text-muted-foreground" /> Archiveren
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}
