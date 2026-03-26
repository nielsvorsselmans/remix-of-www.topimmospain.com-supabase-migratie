import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Target, Users, User, UserCircle2, Download, MapPin } from "lucide-react";
import { LeadDetailSheet } from "@/components/admin/LeadDetailSheet";
import { LeadScoreBadge } from "@/components/admin/LeadScoreBadge";
import { VisitorDetailSheet } from "@/components/admin/VisitorDetailSheet";
import {
  useAllVisitors,
  getVisitorType,
  getVisitorDisplayName,
  calculateVisitorScore,
  getVisitorTemperature,
  VisitorProfile
} from "@/hooks/useAllVisitors";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

const JOURNEY_PHASES = [
  { key: 'orientatie', label: 'Oriëntatie', icon: '🔍', color: 'bg-blue-100 text-blue-800' },
  { key: 'selectie', label: 'Selectie', icon: '📋', color: 'bg-purple-100 text-purple-800' },
  { key: 'bezichtiging', label: 'Bezichtiging', icon: '✈️', color: 'bg-orange-100 text-orange-800' },
  { key: 'aankoop', label: 'Aankoop', icon: '🏠', color: 'bg-green-100 text-green-800' },
  { key: 'overdracht', label: 'Overdracht', icon: '🔑', color: 'bg-teal-100 text-teal-800' },
  { key: 'beheer', label: 'Beheer', icon: '⚙️', color: 'bg-gray-100 text-gray-800' },
];

export function getJourneyPhaseBadge(phase: string | null | undefined) {
  const phaseConfig = JOURNEY_PHASES.find(p => p.key === phase) || JOURNEY_PHASES[0];
  return (
    <Badge className={`${phaseConfig.color} border-0`}>
      {phaseConfig.icon} {phaseConfig.label}
    </Badge>
  );
}

export default function CRMLeads() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [temperatureFilter, setTemperatureFilter] = useState<string>("all");
  const [journeyPhaseFilter, setJourneyPhaseFilter] = useState<string>("all");
  const [engagementFilter, setEngagementFilter] = useState<string>("real");
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorProfile | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);

  const { data: allVisitors, isLoading } = useAllVisitors();

  // Apply engagement filter first
  const visitors = allVisitors?.filter(visitor => {
    // Always show accounts and CRM leads (never filter them out)
    if (visitor.user_id || visitor.crm_user_id) return true;
    
    const pageViews = visitor.engagement_data?.total_page_views || 0;
    
    if (engagementFilter === "all") return true;
    if (engagementFilter === "real") return pageViews >= 2;
    if (engagementFilter === "high") return pageViews >= 5;
    
    return true;
  });

  // Calculate metrics
  const totalUnfiltered = allVisitors?.length || 0;
  const botsFiltered = totalUnfiltered - (visitors?.length || 0);
  
  // Calculate journey phase metrics
  const journeyPhaseMetrics = JOURNEY_PHASES.reduce((acc, phase) => {
    acc[phase.key] = visitors?.filter(v => 
      v.crm_leads?.journey_phase === phase.key
    ).length || 0;
    return acc;
  }, {} as Record<string, number>);
  
  const metrics = {
    total: visitors?.length || 0,
    accounts: visitors?.filter(v => v.user_id).length || 0,
    crmLeads: visitors?.filter(v => v.crm_user_id && !v.user_id).length || 0,
    anonymous: visitors?.filter(v => !v.user_id && !v.crm_user_id).length || 0,
    hot: visitors?.filter(v => getVisitorTemperature(calculateVisitorScore(v)) === 'hot').length || 0,
    botsFiltered,
  };

  // Filter visitors
  const filteredVisitors = visitors?.filter(visitor => {
    const score = calculateVisitorScore(visitor);
    const temp = getVisitorTemperature(score);
    const type = getVisitorType(visitor);
    const displayName = getVisitorDisplayName(visitor);
    const journeyPhase = visitor.crm_leads?.journey_phase || 'orientatie';
    
    const matchesSearch = !searchQuery || 
      displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visitor.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visitor.crm_leads?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === "all" || type === typeFilter;
    const matchesTemp = temperatureFilter === "all" || temp === temperatureFilter;
    const matchesJourneyPhase = journeyPhaseFilter === "all" || journeyPhase === journeyPhaseFilter;
    
    return matchesSearch && matchesType && matchesTemp && matchesJourneyPhase;
  }) || [];

  const exportToCSV = () => {
    const csvData = filteredVisitors.map(visitor => ({
      Naam: getVisitorDisplayName(visitor),
      Type: getVisitorType(visitor),
      Email: visitor.profiles?.email || visitor.crm_leads?.email || '',
      Telefoon: visitor.crm_leads?.phone || '',
      Score: calculateVisitorScore(visitor),
      'Totaal Visits': visitor.engagement_data?.total_visits || 0,
      'Page Views': visitor.engagement_data?.total_page_views || 0,
      'Project Views': visitor.engagement_data?.total_project_views || 0,
      'Laatste Bezoek': visitor.engagement_data?.last_visit_at,
    }));
    
    const headers = Object.keys(csvData[0] || {});
    const csv = [
      headers.join(','),
      ...csvData.map(row => headers.map(h => row[h as keyof typeof row]).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bezoekers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Bezoekers Dashboard</h1>
        <p className="text-muted-foreground">
          Volledige overzicht van alle websitebezoekers - accounts, leads en anonieme bezoekers
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totaal Bezoekers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total}</div>
            {metrics.botsFiltered > 0 && engagementFilter !== "all" && (
              <p className="text-xs text-muted-foreground mt-1">
                ({metrics.botsFiltered} bots uitgefilterd)
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accounts</CardTitle>
            <User className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.accounts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CRM Leads</CardTitle>
            <UserCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.crmLeads}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anoniem</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.anonymous}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hot Leads</CardTitle>
            <Target className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{metrics.hot}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Per Fase</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-xs">
              {JOURNEY_PHASES.slice(0, 4).map(phase => (
                <div key={phase.key} className="flex justify-between">
                  <span>{phase.icon} {phase.label}</span>
                  <span className="font-medium">{journeyPhaseMetrics[phase.key]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Zoek op naam of email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle types</SelectItem>
                <SelectItem value="account">🔵 Accounts</SelectItem>
                <SelectItem value="crm">🟢 CRM Leads</SelectItem>
                <SelectItem value="anonymous">⚪ Anoniem</SelectItem>
              </SelectContent>
            </Select>

            <Select value={temperatureFilter} onValueChange={setTemperatureFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Temperatuur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle temperaturen</SelectItem>
                <SelectItem value="hot">Hot 🔥</SelectItem>
                <SelectItem value="warm">Warm 🌡️</SelectItem>
                <SelectItem value="cold">Cold ❄️</SelectItem>
              </SelectContent>
            </Select>

            <Select value={journeyPhaseFilter} onValueChange={setJourneyPhaseFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Journey fase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle fases</SelectItem>
                {JOURNEY_PHASES.map(phase => (
                  <SelectItem key={phase.key} value={phase.key}>
                    {phase.icon} {phase.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={engagementFilter} onValueChange={setEngagementFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Engagement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="real">🎯 Echte bezoekers</SelectItem>
                <SelectItem value="all">📊 Alle bezoekers</SelectItem>
                <SelectItem value="high">🔥 Hoge interesse (5+)</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Visitors Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Laden...</div>
          ) : filteredVisitors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Geen bezoekers gevonden
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Score</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="hidden sm:table-cell">Fase</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="hidden md:table-cell">Interesse</TableHead>
                  <TableHead className="hidden md:table-cell">Engagement</TableHead>
                  <TableHead className="hidden lg:table-cell">Laatste Bezoek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVisitors.map((visitor) => {
                  const score = calculateVisitorScore(visitor);
                  const temp = getVisitorTemperature(score);
                  const type = getVisitorType(visitor);
                  const displayName = getVisitorDisplayName(visitor);

                  return (
                    <TableRow 
                      key={visitor.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedVisitor(visitor);
                        setIsDetailSheetOpen(true);
                      }}
                    >
                      <TableCell>
                        <LeadScoreBadge score={score} temperature={temp} />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant={
                          type === 'account' ? 'default' :
                          type === 'crm' ? 'secondary' :
                          'outline'
                        }>
                          {type === 'account' ? '🔵 Account' : 
                           type === 'crm' ? '🟢 CRM Lead' : 
                           '⚪ Bezoeker'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {visitor.crm_leads ? (
                          getJourneyPhaseBadge(visitor.crm_leads.journey_phase)
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{displayName}</div>
                          {(visitor.profiles?.email || visitor.crm_leads?.email) && (
                            <div className="text-sm text-muted-foreground">
                              {visitor.profiles?.email || visitor.crm_leads?.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="space-y-1">
                          {visitor.inferred_preferences?.common_regions?.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {visitor.inferred_preferences.common_regions[0]}
                            </Badge>
                          )}
                          {visitor.inferred_preferences?.budget_min && visitor.inferred_preferences?.budget_max && (
                            <div className="text-xs text-muted-foreground">
                              €{Math.round(visitor.inferred_preferences.budget_min / 1000)}k - €{Math.round(visitor.inferred_preferences.budget_max / 1000)}k
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="text-sm space-y-1">
                          <div>{visitor.engagement_data?.total_visits || 0} visits</div>
                          <div className="text-muted-foreground">
                            {visitor.engagement_data?.total_project_views || 0} projecten
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {visitor.engagement_data?.last_visit_at ? (
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(visitor.engagement_data.last_visit_at), { 
                              addSuffix: true,
                              locale: nl 
                            })}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedVisitor && (
        <VisitorDetailSheet
          visitor={selectedVisitor}
          open={isDetailSheetOpen}
          onOpenChange={setIsDetailSheetOpen}
        />
      )}
    </div>
  );
}
