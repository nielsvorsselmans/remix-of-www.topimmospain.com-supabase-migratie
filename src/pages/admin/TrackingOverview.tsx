import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Activity, Eye, Filter, MousePointer, Heart, Calendar, TrendingUp, Clock, FileEdit, Send, LogOut, MessageSquare, Users, UserCheck, UserX, ChevronDown, ChevronRight, Percent, RefreshCw } from "lucide-react";
import { format, startOfDay, endOfDay, subDays, isWithinInterval } from "date-fns";
import { nl } from "date-fns/locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

// Event types that represent real page views (excludes auto-tracking)
const PAGE_VIEW_EVENTS = ['page_view', 'project_view', 'blog_view'];
const AUTO_TRACKING_EVENTS = ['project_engagement'];

// Helper to check if a path is a project page
const isProjectPath = (path: string | null | undefined): boolean => {
  if (!path) return false;
  return path.startsWith('/project/') && path.split('/').length >= 3;
};

interface VisitorSummary {
  visitorId: string;
  displayName: string;
  status: 'active' | 'bouncer' | 'bot';
  firstVisit: Date;
  lastActivity: Date;
  sessionDuration: number;
  pageViews: number;
  projectViews: number;
  totalTimeSpent: number;
  eventTypes: Set<string>;
  events: any[];
}

// Helper function to format duration
const formatDuration = (seconds: number | null): string => {
  if (!seconds) return "—";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

type TimeFilterType = "today" | "yesterday" | "7days" | "30days" | "custom";

const TrackingOverview = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>("today");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);

  // Calculate the date range based on the filter
  const getDateRange = (): { from: Date; to: Date } => {
    const now = new Date();
    const today = startOfDay(now);
    
    switch (timeFilter) {
      case "today":
        return { from: today, to: now };
      case "yesterday":
        const yesterday = subDays(today, 1);
        return { from: yesterday, to: endOfDay(yesterday) };
      case "7days":
        return { from: subDays(today, 6), to: now };
      case "30days":
        return { from: subDays(today, 29), to: now };
      case "custom":
        if (customDateRange?.from && customDateRange?.to) {
          return { 
            from: startOfDay(customDateRange.from), 
            to: endOfDay(customDateRange.to) 
          };
        }
        return { from: today, to: now };
      default:
        return { from: today, to: now };
    }
  };

  const dateRange = getDateRange();

  // Format the active period for display
  const getActivePeriodLabel = (): string => {
    const { from, to } = dateRange;
    
    switch (timeFilter) {
      case "today":
        return `Vandaag (${format(from, "d MMM yyyy", { locale: nl })})`;
      case "yesterday":
        return `Gisteren (${format(from, "d MMM yyyy", { locale: nl })})`;
      case "7days":
        return `${format(from, "d MMM", { locale: nl })} - ${format(to, "d MMM yyyy", { locale: nl })}`;
      case "30days":
        return `${format(from, "d MMM", { locale: nl })} - ${format(to, "d MMM yyyy", { locale: nl })}`;
      case "custom":
        if (customDateRange?.from && customDateRange?.to) {
          return `${format(customDateRange.from, "d MMM", { locale: nl })} - ${format(customDateRange.to, "d MMM yyyy", { locale: nl })}`;
        }
        return "Selecteer periode";
      default:
        return "";
    }
  };

  // Fetch CRM leads for name lookup
  const { data: crmLeads } = useQuery({
    queryKey: ["crm-leads-lookup"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_leads")
        .select("visitor_id, crm_user_id, first_name, last_name, email");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch user profiles for authenticated users
  const { data: profiles } = useQuery({
    queryKey: ["profiles-lookup"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch tracking events
  const { data: events, refetch } = useQuery({
    queryKey: ["tracking-events", eventFilter, timeFilter, customDateRange?.from?.toISOString(), customDateRange?.to?.toISOString()],
    queryFn: async () => {
      const { from, to } = dateRange;
      
      let query = supabase
        .from("tracking_events")
        .select("*")
        .gte("occurred_at", from.toISOString())
        .lte("occurred_at", to.toISOString())
        .order("occurred_at", { ascending: false })
        .limit(100);

      // Apply event type filter
      if (eventFilter !== "all") {
        query = query.eq("event_name", eventFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch ALL events for statistics and visitor overview
  const { data: allEvents } = useQuery({
    queryKey: ["tracking-all-events", timeFilter, customDateRange?.from?.toISOString(), customDateRange?.to?.toISOString()],
    queryFn: async () => {
      const { from, to } = dateRange;

      const { data, error } = await supabase
        .from("tracking_events")
        .select("*")
        .gte("occurred_at", from.toISOString())
        .lte("occurred_at", to.toISOString())
        .order("occurred_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Calculate improved statistics
  const stats = useMemo(() => {
    if (!allEvents) return null;

    // Filter out auto-tracking events for visitor counts
    const realEvents = allEvents.filter(e => !AUTO_TRACKING_EVENTS.includes(e.event_name));
    const pageViewEvents = allEvents.filter(e => PAGE_VIEW_EVENTS.includes(e.event_name));
    
    // Count visitors who have at least one page view
    const realVisitors = new Set(pageViewEvents.map(e => e.visitor_id));
    
    // Count page views per visitor for bounce rate
    const pageViewsPerVisitor: Record<string, number> = {};
    pageViewEvents.forEach(e => {
      pageViewsPerVisitor[e.visitor_id] = (pageViewsPerVisitor[e.visitor_id] || 0) + 1;
    });
    
    // Active visitors: 2+ page views OR total time > 30s
    const timePerVisitor: Record<string, number> = {};
    allEvents.forEach(e => {
      if (e.time_spent_seconds && e.time_spent_seconds > 0) {
        timePerVisitor[e.visitor_id] = (timePerVisitor[e.visitor_id] || 0) + e.time_spent_seconds;
      }
    });
    
    const activeVisitors = new Set(
      Array.from(realVisitors).filter(v => 
        (pageViewsPerVisitor[v] || 0) >= 2 || (timePerVisitor[v] || 0) > 30
      )
    );
    
    // Bounce rate: visitors with only 1 page view / total real visitors
    const bouncers = Array.from(realVisitors).filter(v => (pageViewsPerVisitor[v] || 0) === 1);
    const bounceRate = realVisitors.size > 0 
      ? Math.round((bouncers.length / realVisitors.size) * 100) 
      : 0;

    // Event counts (excluding auto-tracking)
    const eventCounts = realEvents.reduce((acc, event) => {
      acc[event.event_name] = (acc[event.event_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Average time on page (excluding auto-tracking)
    const timeData = realEvents.filter(e => e.time_spent_seconds !== null && e.time_spent_seconds > 0);
    const avgTimeOnPage = timeData.length 
      ? Math.round(timeData.reduce((sum, e) => sum + (e.time_spent_seconds || 0), 0) / timeData.length)
      : 0;

    return {
      totalEvents: realEvents.length,
      totalAutoTrackingEvents: allEvents.length - realEvents.length,
      uniqueVisitors: realVisitors.size,
      activeVisitors: activeVisitors.size,
      bounceRate,
      eventCounts,
      avgTimeOnPage,
    };
  }, [allEvents]);

  // Group events by visitor for overview
  const visitorSummaries = useMemo((): VisitorSummary[] => {
    if (!allEvents) return [];

    const visitorMap: Record<string, VisitorSummary> = {};

    allEvents.forEach(event => {
      const vid = event.visitor_id;
      if (!vid) return;

      if (!visitorMap[vid]) {
        visitorMap[vid] = {
          visitorId: vid,
          displayName: '',
          status: 'bot',
          firstVisit: new Date(event.occurred_at),
          lastActivity: new Date(event.occurred_at),
          sessionDuration: 0,
          pageViews: 0,
          projectViews: 0,
          totalTimeSpent: 0,
          eventTypes: new Set(),
          events: [],
        };
      }

      const summary = visitorMap[vid];
      summary.events.push(event);
      summary.eventTypes.add(event.event_name);

      const eventTime = new Date(event.occurred_at);
      if (eventTime < summary.firstVisit) summary.firstVisit = eventTime;
      if (eventTime > summary.lastActivity) summary.lastActivity = eventTime;

      if (event.time_spent_seconds && event.time_spent_seconds > 0) {
        summary.totalTimeSpent += event.time_spent_seconds;
      }

      if (event.event_name === 'page_view') summary.pageViews++;
      // Count as project view if: explicit project_view OR page_view on /project/* path
      if (event.event_name === 'project_view' || 
          (event.event_name === 'page_view' && isProjectPath(event.path))) {
        summary.projectViews++;
      }
    });

    // Calculate status and session duration for each visitor
    return Object.values(visitorMap).map(summary => {
      summary.sessionDuration = Math.round((summary.lastActivity.getTime() - summary.firstVisit.getTime()) / 1000);
      
      // Determine status
      if (summary.pageViews === 0) {
        summary.status = 'bot';
      } else if (summary.pageViews === 1 && summary.totalTimeSpent < 10) {
        summary.status = 'bouncer';
      } else if (summary.pageViews >= 2 || summary.totalTimeSpent > 30) {
        summary.status = 'active';
      } else {
        summary.status = 'bouncer';
      }

      // Get display name from CRM or profile
      const firstEvent = summary.events[0];
      if (firstEvent?.user_id) {
        const profile = profiles?.find(p => p.id === firstEvent.user_id);
        if (profile?.first_name && profile?.last_name) {
          summary.displayName = `${profile.first_name} ${profile.last_name}`;
        } else if (profile?.email) {
          summary.displayName = profile.email;
        }
      }
      
      if (!summary.displayName) {
        const crmLead = crmLeads?.find(
          lead => lead.crm_user_id === firstEvent?.crm_user_id || lead.visitor_id === summary.visitorId
        );
        if (crmLead?.first_name && crmLead?.last_name) {
          summary.displayName = `${crmLead.first_name} ${crmLead.last_name}`;
        } else if (crmLead?.email) {
          summary.displayName = crmLead.email;
        }
      }

      if (!summary.displayName) {
        summary.displayName = summary.visitorId.substring(0, 8) + '...';
      }

      return summary;
    }).sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  }, [allEvents, crmLeads, profiles]);

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel("tracking-events-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tracking_events",
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  // Helper function to get visitor display name
  const getVisitorDisplayName = (event: any) => {
    // Priority 1: Authenticated user - lookup in profiles
    if (event.user_id) {
      const profile = profiles?.find(p => p.id === event.user_id);
      if (profile?.first_name && profile?.last_name) {
        return `${profile.first_name} ${profile.last_name}`;
      }
      if (profile?.email) {
        return profile.email;
      }
    }
    
    // Priority 2: CRM visitor - lookup in crm_leads
    const crmLead = crmLeads?.find(
      lead => lead.crm_user_id === event.crm_user_id || lead.visitor_id === event.visitor_id
    );
    
    if (crmLead?.first_name && crmLead?.last_name) {
      return `${crmLead.first_name} ${crmLead.last_name}`;
    }
    if (crmLead?.email) {
      return crmLead.email;
    }
    
    // Fallback: Show truncated visitor_id
    return event.visitor_id?.substring(0, 8) + '...';
  };

  // Filter events by search term
  const filteredEvents = events?.filter((event) => {
    if (!searchTerm) return true;
    return (
      event.visitor_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.path?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.event_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getEventIcon = (eventName: string) => {
    switch (eventName) {
      case "page_view":
        return <Eye className="h-4 w-4" />;
      case "cta_click":
      case "cta_clicked":
        return <MousePointer className="h-4 w-4" />;
      case "project_favorited":
      case "project_unfavorited":
        return <Heart className="h-4 w-4" />;
      case "filter":
      case "filter_applied":
        return <Filter className="h-4 w-4" />;
      case "appointment_booked":
        return <Calendar className="h-4 w-4" />;
      case "contact_form_started":
        return <FileEdit className="h-4 w-4" />;
      case "contact_form_submitted":
        return <Send className="h-4 w-4" />;
      case "contact_form_abandoned":
        return <LogOut className="h-4 w-4" />;
      case "contact_method_clicked":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getEventColor = (eventName: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (eventName) {
      case "page_view":
        return "default";
      case "cta_click":
      case "cta_clicked":
        return "secondary";
      case "project_favorited":
        return "destructive";
      case "filter":
      case "filter_applied":
        return "outline";
      case "appointment_booked":
        return "default";
      case "contact_form_started":
        return "outline";
      case "contact_form_submitted":
        return "default";
      case "contact_form_abandoned":
        return "destructive";
      case "contact_method_clicked":
        return "secondary";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Period Filter */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tracking Overzicht</h1>
          <p className="text-muted-foreground">
            {getActivePeriodLabel()}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
            <Button
              variant={timeFilter === "today" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTimeFilter("today")}
              className="h-8"
            >
              Vandaag
            </Button>
            <Button
              variant={timeFilter === "yesterday" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTimeFilter("yesterday")}
              className="h-8"
            >
              Gisteren
            </Button>
            <Button
              variant={timeFilter === "7days" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTimeFilter("7days")}
              className="h-8"
            >
              7 dagen
            </Button>
            <Button
              variant={timeFilter === "30days" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTimeFilter("30days")}
              className="h-8"
            >
              30 dagen
            </Button>
          </div>
          
          {/* Custom Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={timeFilter === "custom" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 gap-2",
                  timeFilter === "custom" && "bg-primary text-primary-foreground"
                )}
              >
                <Calendar className="h-4 w-4" />
                {timeFilter === "custom" && customDateRange?.from && customDateRange?.to
                  ? `${format(customDateRange.from, "d MMM", { locale: nl })} - ${format(customDateRange.to, "d MMM", { locale: nl })}`
                  : "Custom"
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                initialFocus
                mode="range"
                defaultMonth={customDateRange?.from}
                selected={customDateRange}
                onSelect={(range) => {
                  setCustomDateRange(range);
                  if (range?.from && range?.to) {
                    setTimeFilter("custom");
                  }
                }}
                numberOfMonths={2}
                locale={nl}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          
          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-8 gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Vernieuwen
          </Button>
        </div>
      </div>

      {/* Statistics Cards - Improved */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Echte Bezoekers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.uniqueVisitors || 0}</div>
            <p className="text-xs text-muted-foreground">
              Met minimaal 1 pageview
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actieve Bezoekers</CardTitle>
            <UserCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats?.activeVisitors || 0}</div>
            <p className="text-xs text-muted-foreground">
              2+ pageviews of 30s+ tijd
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(stats?.bounceRate || 0) > 70 ? 'text-destructive' : (stats?.bounceRate || 0) > 50 ? 'text-orange-500' : 'text-green-600'}`}>
              {stats?.bounceRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Bezoekers met 1 pageview
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totaal Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEvents || 0}</div>
            <p className="text-xs text-muted-foreground">
              Excl. {stats?.totalAutoTrackingEvents || 0} auto-tracking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gem. Tijd per Pagina</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(stats?.avgTimeOnPage || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Op echte events
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visitor Overview Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bezoekers Overzicht
          </CardTitle>
          <CardDescription>
            {visitorSummaries.length} bezoekers gegroepeerd - klik om events te zien
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {visitorSummaries.map((visitor) => (
              <VisitorRow 
                key={visitor.visitorId} 
                visitor={visitor} 
                getEventIcon={getEventIcon}
                getEventColor={getEventColor}
              />
            ))}
            {visitorSummaries.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                Geen bezoekers gevonden in deze periode
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter tracking events op type en periode</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Zoeken</label>
              <Input
                placeholder="Zoek op visitor ID, pad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Event Type</label>
              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Events</SelectItem>
                  
                  {/* Pagina events */}
                  <SelectItem value="page_view">Page View</SelectItem>
                  <SelectItem value="project_view">Project View</SelectItem>
                  <SelectItem value="blog_view">Blog View</SelectItem>
                  
                  {/* Interactie events */}
                  <SelectItem value="cta_click">CTA Click</SelectItem>
                  <SelectItem value="cta_clicked">CTA Clicked</SelectItem>
                  <SelectItem value="filter">Filter</SelectItem>
                  <SelectItem value="filter_applied">Filter Applied</SelectItem>
                  <SelectItem value="project_favorited">Project Favorited</SelectItem>
                  
                  {/* Contact events */}
                  <SelectItem value="contact_form_started">Contact Form Started</SelectItem>
                  <SelectItem value="contact_form_submitted">Contact Form Submitted</SelectItem>
                  <SelectItem value="contact_form_abandoned">Contact Form Abandoned</SelectItem>
                  <SelectItem value="contact_method_clicked">Contact Method Clicked</SelectItem>
                  
                  {/* Conversie events */}
                  <SelectItem value="appointment_booked">Appointment Booked</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recente Events</CardTitle>
          <CardDescription>
            Laatste {filteredEvents?.length || 0} tracking events (real-time updates)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Visitor ID</TableHead>
                  <TableHead>Pad</TableHead>
                  <TableHead>Tijd op pagina</TableHead>
                  <TableHead>Parameters</TableHead>
                  <TableHead>Tijdstip</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents && filteredEvents.length > 0 ? (
                  filteredEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getEventIcon(event.event_name)}
                          <Badge variant={getEventColor(event.event_name)}>
                            {event.event_name}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {getVisitorDisplayName(event)}
                      </TableCell>
                      <TableCell className="text-sm">{event.path}</TableCell>
                      <TableCell className="text-sm font-medium">
                        {event.time_spent_seconds !== null 
                          ? formatDuration(event.time_spent_seconds)
                          : <Badge variant="outline" className="text-orange-600">Exit</Badge>
                        }
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                        {JSON.stringify(event.event_params)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(event.occurred_at), "PPp", { locale: nl })}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Geen tracking events gevonden
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Visitor Row Component with collapsible events
const VisitorRow = ({ 
  visitor, 
  getEventIcon, 
  getEventColor 
}: { 
  visitor: VisitorSummary; 
  getEventIcon: (name: string) => JSX.Element;
  getEventColor: (name: string) => "default" | "secondary" | "destructive" | "outline";
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const statusConfig = {
    active: { label: 'Actief', icon: UserCheck, color: 'text-green-600 bg-green-50 border-green-200' },
    bouncer: { label: 'Bouncer', icon: UserX, color: 'text-orange-600 bg-orange-50 border-orange-200' },
    bot: { label: 'Bot/Geen PV', icon: Activity, color: 'text-muted-foreground bg-muted/50 border-muted' },
  };

  const StatusIcon = statusConfig[visitor.status].icon;

  // Get unique event types (excluding project_engagement for display)
  const displayEventTypes = Array.from(visitor.eventTypes).filter(e => !AUTO_TRACKING_EVENTS.includes(e));

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${statusConfig[visitor.status].color}`}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <StatusIcon className="h-4 w-4" />
            </div>
            
            <div className="flex flex-col">
              <span className="font-medium">{visitor.displayName}</span>
              <span className="text-xs text-muted-foreground">
                {format(visitor.firstVisit, "HH:mm", { locale: nl })} - {format(visitor.lastActivity, "HH:mm", { locale: nl })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{visitor.pageViews} pv</span>
            </div>
            {visitor.projectViews > 0 && (
              <div className="flex items-center gap-1 text-primary">
                <Heart className="h-3 w-3" />
                <span>{visitor.projectViews} proj</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatDuration(visitor.totalTimeSpent)}</span>
            </div>
            <div className="flex gap-1 flex-wrap max-w-[200px]">
              {displayEventTypes.slice(0, 4).map(eventType => (
                <Badge key={eventType} variant="outline" className="text-xs py-0">
                  {eventType.replace(/_/g, ' ')}
                </Badge>
              ))}
              {displayEventTypes.length > 4 && (
                <Badge variant="outline" className="text-xs py-0">
                  +{displayEventTypes.length - 4}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="ml-8 mt-2 mb-4 border-l-2 border-muted pl-4 space-y-1">
          {visitor.events
            .filter(e => !AUTO_TRACKING_EVENTS.includes(e.event_name))
            .slice(0, 20)
            .map((event, idx) => (
            <div key={event.id || idx} className="flex items-center gap-3 text-sm py-1">
              <span className="text-xs text-muted-foreground w-12">
                {format(new Date(event.occurred_at), "HH:mm")}
              </span>
              <div className="flex items-center gap-2">
                {getEventIcon(event.event_name)}
                <Badge variant={getEventColor(event.event_name)} className="text-xs">
                  {event.event_name}
                </Badge>
              </div>
              <span className="text-muted-foreground truncate max-w-[300px]">{event.path}</span>
              {event.time_spent_seconds && (
                <span className="text-xs text-muted-foreground">
                  ({formatDuration(event.time_spent_seconds)})
                </span>
              )}
            </div>
          ))}
          {visitor.events.filter(e => !AUTO_TRACKING_EVENTS.includes(e.event_name)).length > 20 && (
            <p className="text-xs text-muted-foreground">
              + {visitor.events.filter(e => !AUTO_TRACKING_EVENTS.includes(e.event_name)).length - 20} meer events...
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default TrackingOverview;
