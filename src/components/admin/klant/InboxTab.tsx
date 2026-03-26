import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users } from "lucide-react";
import { useLeadsToFollow, useUpdateLeadStatus, type QualificationStatus } from "@/hooks/useLeadsToFollow";
import { useMarkCallDone, useMarkInvitationSent } from "@/hooks/useMilestones";
import { LeadStatsCards } from "@/components/admin/klant/LeadStatsCards";
import { LeadsToFollowTable } from "@/components/admin/klant/LeadsToFollowTable";

export function InboxTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [qualificationFilter, setQualificationFilter] = useState<QualificationStatus[]>(['active', 'waiting']);
  const [statsFilter, setStatsFilter] = useState<string>("");

  const { data: leadsData, isLoading } = useLeadsToFollow(qualificationFilter);
  const updateLeadStatus = useUpdateLeadStatus();
  const markCallDone = useMarkCallDone();
  const markInvitationSent = useMarkInvitationSent();

  const handleStatsFilterClick = (filter: string) => {
    if (statsFilter === filter) {
      setStatsFilter("");
      setQualificationFilter(['active', 'waiting']);
    } else {
      setStatsFilter(filter);
      // Action cards always show active+waiting leads, just filtered differently
      setQualificationFilter(['active', 'waiting']);
    }
  };

  const filteredLeads = useMemo(() => {
    if (!leadsData?.leads) return [];
    let filtered = leadsData.leads;

    if (statsFilter === "callPlanned") {
      filtered = filtered.filter(l => l.has_call_planned && !l.has_call_done);
    } else if (statsFilter === "invitationSent") {
      filtered = filtered.filter(l => l.has_invitation_sent && !l.has_account);
    } else if (statsFilter === "needsAction") {
      filtered = filtered.filter(l => l.urgency === 'critical' || l.urgency === 'high');
    } else if (statsFilter === "postOrientatie") {
      filtered = filtered.filter(l => l.last_event_type === 'orientatie' && !l.has_viewing_trip);
    } else if (statsFilter === "appointmentSoon") {
      filtered = filtered.filter(l => l.upcoming_appointment_date !== null);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(lead => {
        const name = `${lead.first_name || ""} ${lead.last_name || ""}`.toLowerCase();
        const email = (lead.email || "").toLowerCase();
        return name.includes(query) || email.includes(query);
      });
    }

    return filtered;
  }, [leadsData?.leads, statsFilter, searchQuery]);

  if (isLoading) return null;

  return (
    <div className="space-y-6">
      {leadsData?.stats && (
        <LeadStatsCards
          stats={leadsData.stats}
          onFilterClick={handleStatsFilterClick}
          activeFilter={statsFilter}
        />
      )}

      <div className="sticky top-14 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-2">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek op naam of email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={qualificationFilter.join(',')}
                onValueChange={(value) => {
                  setQualificationFilter(value.split(',') as QualificationStatus[]);
                  setStatsFilter("");
                }}
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filter op status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active,waiting">Alle actieve</SelectItem>
                  <SelectItem value="active">Alleen actief</SelectItem>
                  <SelectItem value="waiting">Afwachtend</SelectItem>
                  <SelectItem value="passive">Passief</SelectItem>
                  <SelectItem value="not_interested,archived">Gearchiveerd</SelectItem>
                  <SelectItem value="dropped_off">Afgehaakt</SelectItem>
                  <SelectItem value="active,waiting,passive,not_interested,archived,dropped_off">Alles tonen</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Leads ({filteredLeads.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LeadsToFollowTable
            leads={filteredLeads}
            onMarkCallDone={(id) => markCallDone.mutate(id)}
            onSendInvitation={(id) => markInvitationSent.mutate(id)}
            onUpdateStatus={(leadId, status) => updateLeadStatus.mutate({ leadId, status })}
          />
        </CardContent>
      </Card>
    </div>
  );
}
