import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Search, Users, MapPin, Building2, Calendar, ChevronRight,
  Flame, Thermometer, Snowflake, Phone, PhoneCall, PhoneOff,
  Activity, ArrowUpDown, Clock, TrendingUp, AlertTriangle, Eye, Plane, X
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { calculateKlantScore, getKlantTemperature, getJourneyPhase, type Klant } from "@/hooks/useKlanten";
import { PipelinePhaseBar } from "./PipelinePhaseBar";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 50;

const getRecencyColor = (lastVisitAt: string | null): string => {
  if (!lastVisitAt) return "text-muted-foreground";
  const hoursAgo = (Date.now() - new Date(lastVisitAt).getTime()) / (1000 * 60 * 60);
  if (hoursAgo < 24) return "text-green-600 dark:text-green-400";
  if (hoursAgo < 168) return "text-foreground";
  if (hoursAgo < 720) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
};

const formatTimeOnSite = (seconds: number | undefined): string => {
  if (!seconds) return "-";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}u`;
};

interface PipelineTabProps {
  klanten: Klant[] | undefined;
}

export function PipelineTab({ klanten }: PipelineTabProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [journeyPhaseFilter, setJourneyPhaseFilter] = useState("all");
  const [temperatureFilter, setTemperatureFilter] = useState("all");
  const [callStatusFilter, setCallStatusFilter] = useState("all");
  const [engagementFilter, setEngagementFilter] = useState("all");
  const [sortBy, setSortBy] = useState("last-visit-desc");
  const [currentPage, setCurrentPage] = useState(1);

  const hasActiveFilters = temperatureFilter !== "all" || callStatusFilter !== "all" || engagementFilter !== "all";

  const resetAllFilters = () => {
    setJourneyPhaseFilter("all");
    setTemperatureFilter("all");
    setCallStatusFilter("all");
    setEngagementFilter("all");
    setCurrentPage(1);
  };

  // Quick stats
  const quickStats = useMemo(() => {
    if (!klanten) return { today: 0, week: 0, inactive: 0 };
    const activeKlanten = klanten.filter(k => k.follow_up_status !== 'dropped_off');
    const now = Date.now();
    let today = 0, week = 0, inactive = 0;
    activeKlanten.forEach(k => {
      if (!k.last_visit_at) { inactive++; return; }
      const hoursAgo = (now - new Date(k.last_visit_at).getTime()) / (1000 * 60 * 60);
      if (hoursAgo < 24) today++;
      if (hoursAgo < 168) week++;
      if (hoursAgo > 336) inactive++;
    });
    return { today, week, inactive };
  }, [klanten]);

  // Filter
  const filteredKlanten = useMemo(() => {
    if (!klanten) return [];
    return klanten.filter(klant => {
      if (klant.follow_up_status === 'dropped_off') return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const name = `${klant.first_name || ""} ${klant.last_name || ""}`.toLowerCase();
        const email = (klant.email || "").toLowerCase();
        if (!name.includes(query) && !email.includes(query)) return false;
      }
      if (journeyPhaseFilter !== "all" && klant.journey_phase !== journeyPhaseFilter) return false;
      if (temperatureFilter !== "all") {
        const score = calculateKlantScore(klant);
        if (getKlantTemperature(score) !== temperatureFilter) return false;
      }
      if (callStatusFilter !== "all") {
        if (callStatusFilter === "planned" && !klant.has_upcoming_call) return false;
        if (callStatusFilter === "done" && !klant.has_past_call) return false;
        if (callStatusFilter === "none" && (klant.has_upcoming_call || klant.has_past_call)) return false;
      }
      if (engagementFilter !== "all") {
        const engagement = klant.engagement_data as Record<string, number> | null;
        const projectViews = engagement?.total_project_views || 0;
        const pageViews = engagement?.total_page_views || 0;
        const visits = engagement?.total_visits || 0;
        const timeOnSite = engagement?.total_time_on_site_seconds || 0;
        switch (engagementFilter) {
          case "today": {
            const h = klant.last_visit_at ? (Date.now() - new Date(klant.last_visit_at).getTime()) / (1000*60*60) : 999;
            if (h > 24) return false; break;
          }
          case "super-active": if (projectViews < 50 && pageViews < 100) return false; break;
          case "active-browsers": if (projectViews < 20) return false; break;
          case "regular-visitors": if (visits < 5) return false; break;
          case "recent": {
            const d = klant.last_visit_at ? (Date.now() - new Date(klant.last_visit_at).getTime()) / (1000*60*60*24) : 999;
            if (d > 7) return false; break;
          }
          case "long-sessions": if (timeOnSite < 1800) return false; break;
          case "inactive": {
            const d = klant.last_visit_at ? (Date.now() - new Date(klant.last_visit_at).getTime()) / (1000*60*60*24) : 999;
            if (d < 14) return false; break;
          }
        }
      }
      return true;
    });
  }, [klanten, searchQuery, journeyPhaseFilter, temperatureFilter, callStatusFilter, engagementFilter]);

  // Sort
  const sortedKlanten = useMemo(() => {
    const sorted = [...filteredKlanten];
    switch (sortBy) {
      case "last-visit-desc":
        sorted.sort((a, b) => (b.last_visit_at ? new Date(b.last_visit_at).getTime() : 0) - (a.last_visit_at ? new Date(a.last_visit_at).getTime() : 0));
        break;
      case "last-visit-asc":
        sorted.sort((a, b) => (a.last_visit_at ? new Date(a.last_visit_at).getTime() : Infinity) - (b.last_visit_at ? new Date(b.last_visit_at).getTime() : Infinity));
        break;
      case "most-projects":
        sorted.sort((a, b) => ((b.engagement_data as any)?.total_project_views || 0) - ((a.engagement_data as any)?.total_project_views || 0));
        break;
      case "most-visits":
        sorted.sort((a, b) => ((b.engagement_data as any)?.total_visits || 0) - ((a.engagement_data as any)?.total_visits || 0));
        break;
      case "longest-sessions":
        sorted.sort((a, b) => ((b.engagement_data as any)?.total_time_on_site_seconds || 0) - ((a.engagement_data as any)?.total_time_on_site_seconds || 0));
        break;
      case "score-desc":
        sorted.sort((a, b) => calculateKlantScore(b) - calculateKlantScore(a));
        break;
    }
    return sorted;
  }, [filteredKlanten, sortBy]);

  // Pagination
  const totalPages = Math.ceil(sortedKlanten.length / ITEMS_PER_PAGE);
  const paginatedKlanten = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedKlanten.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedKlanten, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [journeyPhaseFilter, temperatureFilter, callStatusFilter, engagementFilter, searchQuery, sortBy]);

  const getTemperatureIcon = (temp: string) => {
    switch (temp) {
      case 'hot': return <Flame className="h-4 w-4 text-red-500" />;
      case 'warm': return <Thermometer className="h-4 w-4 text-orange-500" />;
      case 'cool': return <Thermometer className="h-4 w-4 text-blue-400" />;
      default: return <Snowflake className="h-4 w-4 text-blue-200" />;
    }
  };

  const getCallStatusIcon = (klant: Klant) => {
    if (klant.has_upcoming_call) return <PhoneCall className="h-4 w-4 text-green-500" />;
    if (klant.has_past_call) return <Phone className="h-4 w-4 text-blue-500" />;
    return <PhoneOff className="h-4 w-4 text-muted-foreground" />;
  };

  const getEngagementBadge = (klant: Klant) => {
    const engagement = klant.engagement_data as Record<string, number> | null;
    const projectViews = engagement?.total_project_views || 0;
    const pageViews = engagement?.total_page_views || 0;
    if (projectViews >= 50 || pageViews >= 100) return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 text-xs">Super actief</Badge>;
    if (projectViews >= 20) return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs">Actief</Badge>;
    if (projectViews >= 10) return <Badge variant="outline" className="text-muted-foreground text-xs">Basis</Badge>;
    return null;
  };

  const formatBudget = (klant: Klant) => {
    const prefs = klant.inferred_preferences;
    if (!prefs?.budget_min && !prefs?.budget_max) return "-";
    const min = prefs.budget_min ? `€${Math.round(prefs.budget_min / 1000)}k` : "";
    const max = prefs.budget_max ? `€${Math.round(prefs.budget_max / 1000)}k` : "";
    if (min && max) return `${min} - ${max}`;
    return min || max;
  };

  const formatRegions = (klant: Klant) => {
    const regions = klant.inferred_preferences?.common_regions;
    if (!regions || regions.length === 0) return "-";
    return regions.slice(0, 2).join(", ");
  };

  if (!klanten) return null;

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/50">
              <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-green-700 dark:text-green-300">{quickStats.today}</p>
              <p className="text-xs text-green-600 dark:text-green-400">Vandaag actief</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/50">
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{quickStats.week}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">Deze week</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/50">
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-orange-700 dark:text-orange-300">{quickStats.inactive}</p>
              <p className="text-xs text-orange-600 dark:text-orange-400">Inactief (14+ d)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Phase Bar */}
      <PipelinePhaseBar
        klanten={klanten}
        activePhase={journeyPhaseFilter}
        onPhaseClick={setJourneyPhaseFilter}
      />

      {/* Filters */}
      <div className="sticky top-14 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-2">
        <Card>
          <CardContent className="p-3">
            <div className="flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Zoek op naam of email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Sorteren" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last-visit-desc">Laatste bezoek (nieuwst)</SelectItem>
                    <SelectItem value="last-visit-asc">Laatste bezoek (oudst)</SelectItem>
                    <SelectItem value="score-desc">Score (hoogst)</SelectItem>
                    <SelectItem value="most-projects">Meeste projectweergaven</SelectItem>
                    <SelectItem value="most-visits">Meeste bezoeken</SelectItem>
                    <SelectItem value="longest-sessions">Langste sessies</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={temperatureFilter} onValueChange={setTemperatureFilter}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Temperatuur" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle temp.</SelectItem>
                    <SelectItem value="hot">🔥 Hot</SelectItem>
                    <SelectItem value="warm">🌡️ Warm</SelectItem>
                    <SelectItem value="cool">❄️ Cool</SelectItem>
                    <SelectItem value="cold">🧊 Cold</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={callStatusFilter} onValueChange={setCallStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Call status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle calls</SelectItem>
                    <SelectItem value="planned">📅 Ingepland</SelectItem>
                    <SelectItem value="done">✅ Gevoerd</SelectItem>
                    <SelectItem value="none">❌ Geen</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={engagementFilter} onValueChange={setEngagementFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Activity className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Engagement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle engagement</SelectItem>
                    <SelectItem value="today">🟢 Vandaag actief</SelectItem>
                    <SelectItem value="recent">📆 Recent (7 dagen)</SelectItem>
                    <SelectItem value="super-active">🚀 Super actief</SelectItem>
                    <SelectItem value="active-browsers">👀 Actieve browsers</SelectItem>
                    <SelectItem value="regular-visitors">🔄 Regelmatige bezoekers</SelectItem>
                    <SelectItem value="long-sessions">⏱️ Lange sessies</SelectItem>
                    <SelectItem value="inactive">⚠️ Inactief (14+ dagen)</SelectItem>
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={resetAllFilters} className="gap-1 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" /> Reset
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-4 pb-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4" />
              {sortedKlanten.length} klanten
              {totalPages > 1 && (
                <span className="text-muted-foreground">— pagina {currentPage}/{totalPages}</span>
              )}
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Klant</TableHead>
                <TableHead>Fase</TableHead>
                <TableHead>Score</TableHead>
                <TableHead className="hidden md:table-cell">
                  <div className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />Engagement</div>
                </TableHead>
                <TableHead className="hidden lg:table-cell">Budget</TableHead>
                <TableHead className="hidden lg:table-cell">Regio</TableHead>
                <TableHead className="hidden md:table-cell text-center">
                  <div className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />Proj</div>
                </TableHead>
                <TableHead className="hidden md:table-cell text-center">
                  <div className="flex items-center gap-1"><Plane className="h-3.5 w-3.5" />Reis</div>
                </TableHead>
                <TableHead className="hidden md:table-cell text-center">
                  <Phone className="h-3.5 w-3.5" />
                </TableHead>
                <TableHead className="hidden xl:table-cell">Laatste bezoek</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedKlanten.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Geen klanten gevonden</TableCell>
                </TableRow>
              ) : (
                paginatedKlanten.map(klant => {
                  const score = calculateKlantScore(klant);
                  const temp = getKlantTemperature(score);
                  const phase = getJourneyPhase(klant.journey_phase);
                  const name = `${klant.first_name || ""} ${klant.last_name || ""}`.trim() || klant.email || "Onbekend";
                  const engagement = klant.engagement_data as Record<string, number> | null;

                  return (
                    <TableRow key={klant.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/admin/klanten/${klant.id}`)}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{name}</p>
                          {klant.email && name !== klant.email && (
                            <p className="text-xs text-muted-foreground">{klant.email}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(phase.color, "text-xs")}>{phase.icon} {phase.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getTemperatureIcon(temp)}
                          <span className="font-medium text-sm">{score}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          {getEngagementBadge(klant)}
                          <span className="text-xs text-muted-foreground">
                            {engagement?.total_visits || 0}× · {formatTimeOnSite(engagement?.total_time_on_site_seconds)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{formatBudget(klant)}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {formatRegions(klant)}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-center">
                        <Badge variant="outline" className="text-xs">{klant.assigned_projects_count}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-center">
                        {klant.planned_trips_count > 0 ? (
                          <Badge className="bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 text-xs">{klant.planned_trips_count}</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">0</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-center">
                        {getCallStatusIcon(klant)}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <div className="flex flex-col">
                          <span className={cn("text-sm font-medium", getRecencyColor(klant.last_visit_at))}>
                            {klant.last_visit_at
                              ? formatDistanceToNow(new Date(klant.last_visit_at), { addSuffix: true, locale: nl })
                              : "-"}
                          </span>
                          {klant.last_visit_at && (
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(klant.last_visit_at), "EEE d MMM HH:mm", { locale: nl })}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 pt-2">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={cn(currentPage === 1 && "pointer-events-none opacity-50")}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (currentPage <= 3) pageNum = i + 1;
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = currentPage - 2 + i;
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink isActive={currentPage === pageNum} onClick={() => setCurrentPage(pageNum)} className="cursor-pointer">
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <PaginationItem><PaginationEllipsis /></PaginationItem>
                  )}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={cn(currentPage === totalPages && "pointer-events-none opacity-50")}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
