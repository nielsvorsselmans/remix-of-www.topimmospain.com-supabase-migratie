import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, format } from "date-fns";
import { nl } from "date-fns/locale";
import { 
  Activity, 
  Eye, 
  Clock, 
  Star, 
  TrendingUp, 
  Users, 
  ChevronRight,
  ArrowUpDown,
  Flame,
  Search
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Klant } from "@/hooks/useKlanten";

interface WebsiteActivityTabProps {
  klanten: Klant[] | undefined;
}

// Helper function to format time on site
const formatTimeOnSite = (seconds: number | undefined): string => {
  if (!seconds) return "-";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}u ${minutes}m`;
  return `${minutes}m`;
};

// Helper function to get recency color based on last visit
const getRecencyColor = (lastVisitAt: string | null): string => {
  if (!lastVisitAt) return "text-muted-foreground";
  const hoursAgo = (Date.now() - new Date(lastVisitAt).getTime()) / (1000 * 60 * 60);
  if (hoursAgo < 24) return "text-green-600 dark:text-green-400";
  if (hoursAgo < 168) return "text-foreground"; // 7 days
  if (hoursAgo < 720) return "text-orange-600 dark:text-orange-400"; // 30 days
  return "text-red-600 dark:text-red-400";
};

export function WebsiteActivityTab({ klanten }: WebsiteActivityTabProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState<string>("all");
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("last-visit");

  // Filter to only klanten with website activity
  const activityKlanten = useMemo(() => {
    if (!klanten) return [];
    
    return klanten.filter(k => {
      const engagement = k.engagement_data || {};
      const hasActivity = 
        (engagement.total_project_views || 0) > 0 ||
        (engagement.total_page_views || 0) > 0 ||
        (engagement.total_visits || 0) > 0;
      return hasActivity;
    });
  }, [klanten]);

  // Calculate quick stats
  const quickStats = useMemo(() => {
    if (!activityKlanten) return { today: 0, lastHour: 0, topBrowsers: 0, manyFavs: 0 };
    
    const now = Date.now();
    let today = 0, lastHour = 0, topBrowsers = 0, manyFavs = 0;
    
    activityKlanten.forEach(k => {
      const engagement = k.engagement_data || {};
      const projectViews = engagement.total_project_views || 0;
      
      if (k.last_visit_at) {
        const hoursAgo = (now - new Date(k.last_visit_at).getTime()) / (1000 * 60 * 60);
        if (hoursAgo < 1) lastHour++;
        if (hoursAgo < 24) today++;
      }
      
      if (projectViews >= 20) topBrowsers++;
      if (k.favorite_projects_count >= 3) manyFavs++;
    });
    
    return { today, lastHour, topBrowsers, manyFavs };
  }, [activityKlanten]);

  // Apply filters
  const filteredKlanten = useMemo(() => {
    let filtered = [...activityKlanten];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(klant => {
        const name = `${klant.first_name || ""} ${klant.last_name || ""}`.toLowerCase();
        const email = (klant.email || "").toLowerCase();
        return name.includes(query) || email.includes(query);
      });
    }
    
    // Time filter
    if (timeFilter !== "all") {
      const now = Date.now();
      filtered = filtered.filter(k => {
        if (!k.last_visit_at) return false;
        const hoursAgo = (now - new Date(k.last_visit_at).getTime()) / (1000 * 60 * 60);
        
        switch (timeFilter) {
          case "today": return hoursAgo < 24;
          case "yesterday": return hoursAgo >= 24 && hoursAgo < 48;
          case "week": return hoursAgo < 168;
          case "month": return hoursAgo < 720;
          default: return true;
        }
      });
    }
    
    // Activity level filter
    if (activityFilter !== "all") {
      filtered = filtered.filter(k => {
        const engagement = k.engagement_data || {};
        const projectViews = engagement.total_project_views || 0;
        const pageViews = engagement.total_page_views || 0;
        const visits = engagement.total_visits || 0;
        
        switch (activityFilter) {
          case "super-active": return projectViews >= 50 || pageViews >= 100;
          case "active": return projectViews >= 20 && projectViews < 50;
          case "basic": return projectViews >= 5 && projectViews < 20;
          case "new": return visits <= 2;
          default: return true;
        }
      });
    }
    
    // Sorting
    switch (sortBy) {
      case "last-visit":
        filtered.sort((a, b) => {
          const dateA = a.last_visit_at ? new Date(a.last_visit_at).getTime() : 0;
          const dateB = b.last_visit_at ? new Date(b.last_visit_at).getTime() : 0;
          return dateB - dateA;
        });
        break;
      case "most-projects":
        filtered.sort((a, b) => {
          const viewsA = a.engagement_data?.total_project_views || 0;
          const viewsB = b.engagement_data?.total_project_views || 0;
          return viewsB - viewsA;
        });
        break;
      case "most-time":
        filtered.sort((a, b) => {
          const timeA = a.engagement_data?.total_time_on_site_seconds || 0;
          const timeB = b.engagement_data?.total_time_on_site_seconds || 0;
          return timeB - timeA;
        });
        break;
      case "most-favorites":
        filtered.sort((a, b) => {
          return b.favorite_projects_count - a.favorite_projects_count;
        });
        break;
    }
    
    return filtered;
  }, [activityKlanten, searchQuery, timeFilter, activityFilter, sortBy]);

  return (
    <div className="space-y-6">
      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/50">
              <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">{quickStats.lastHour}</p>
              <p className="text-sm text-green-600 dark:text-green-400">Afgelopen uur</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/50">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{quickStats.today}</p>
              <p className="text-sm text-blue-600 dark:text-blue-400">Vandaag actief</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/50">
              <Eye className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{quickStats.topBrowsers}</p>
              <p className="text-sm text-purple-600 dark:text-purple-400">Top browsers (20+)</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/50">
              <Star className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{quickStats.manyFavs}</p>
              <p className="text-sm text-amber-600 dark:text-amber-400">Veel favorieten (3+)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoek op naam of email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <Clock className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Tijdsperiode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle tijd</SelectItem>
                  <SelectItem value="today">Vandaag</SelectItem>
                  <SelectItem value="yesterday">Gisteren</SelectItem>
                  <SelectItem value="week">Laatste 7 dagen</SelectItem>
                  <SelectItem value="month">Laatste 30 dagen</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={activityFilter} onValueChange={setActivityFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Activiteit niveau" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle niveaus</SelectItem>
                  <SelectItem value="super-active">🚀 Super actief (50+)</SelectItem>
                  <SelectItem value="active">🔥 Actief (20-50)</SelectItem>
                  <SelectItem value="basic">📊 Basis (5-20)</SelectItem>
                  <SelectItem value="new">🆕 Nieuw (≤2 bezoeken)</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sorteren op" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last-visit">Laatste bezoek</SelectItem>
                  <SelectItem value="most-projects">Meeste projectweergaven</SelectItem>
                  <SelectItem value="most-time">Langste sessietijd</SelectItem>
                  <SelectItem value="most-favorites">Meeste favorieten</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Website Activiteit ({filteredKlanten.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Klant</TableHead>
                <TableHead>Laatste bezoek</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Eye className="h-4 w-4" />
                    <span>Projecten</span>
                  </div>
                </TableHead>
                <TableHead className="hidden md:table-cell text-center">Pagina's</TableHead>
                <TableHead className="hidden md:table-cell text-center">Bezoeken</TableHead>
                <TableHead className="hidden lg:table-cell text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>Tijd</span>
                  </div>
                </TableHead>
                <TableHead className="hidden lg:table-cell text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Star className="h-4 w-4" />
                    <span>Favs</span>
                  </div>
                </TableHead>
                <TableHead className="hidden xl:table-cell">Eerste bezoek</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredKlanten.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Geen klanten met website activiteit gevonden
                  </TableCell>
                </TableRow>
              ) : (
                filteredKlanten.map(klant => {
                  const engagement = klant.engagement_data || {};
                  const projectViews = engagement.total_project_views || 0;
                  const pageViews = engagement.total_page_views || 0;
                  const visits = engagement.total_visits || 0;
                  const timeOnSite = engagement.total_time_on_site_seconds || 0;
                  const name = `${klant.first_name || ""} ${klant.last_name || ""}`.trim() || klant.email || "Onbekend";
                  const isHotLead = projectViews >= 20;
                  
                  return (
                    <TableRow 
                      key={klant.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/admin/klanten/${klant.id}`)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{name}</p>
                          {klant.email && name !== klant.email && (
                            <p className="text-sm text-muted-foreground">{klant.email}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className={cn(
                            "text-sm font-medium",
                            getRecencyColor(klant.last_visit_at)
                          )}>
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
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isHotLead && <Flame className="h-4 w-4 text-orange-500" />}
                          <span className={cn(
                            "font-medium",
                            isHotLead && "text-orange-600 dark:text-orange-400"
                          )}>
                            {projectViews}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-center text-muted-foreground">
                        {pageViews}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-center text-muted-foreground">
                        {visits}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-center text-muted-foreground">
                        {formatTimeOnSite(timeOnSite)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-center">
                        {klant.favorite_projects_count > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            {klant.favorite_projects_count}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                        {klant.first_visit_at 
                          ? format(new Date(klant.first_visit_at), "d MMM yyyy", { locale: nl })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
