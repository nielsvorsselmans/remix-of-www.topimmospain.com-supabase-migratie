import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useProjectsList } from "@/hooks/useProjectsList";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeadScoreBadge } from "./LeadScoreBadge";
import { LeadTimeline } from "./LeadTimeline";
import { EngagementBreakdown } from "./EngagementBreakdown";
import { useVisitorTimeline } from "@/hooks/useVisitorTimeline";
import { formatDistanceToNow, format } from "date-fns";
import { nl } from "date-fns/locale";
import { Mail, Phone, User, Eye, MapPin, Euro, Info, Heart, Filter, Home, Bed, Clock, History, RefreshCw, Save } from "lucide-react";
import type { VisitorProfile } from "@/hooks/useAllVisitors";
import { getVisitorType, getVisitorDisplayName, calculateVisitorScore, getVisitorTemperature, calculateVisitorScoreWithBreakdown } from "@/hooks/useAllVisitors";
import { useState, useEffect, useMemo } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const JOURNEY_PHASES = [
  { key: 'orientatie', label: 'Oriëntatie', icon: '🔍', color: 'bg-blue-100 text-blue-800' },
  { key: 'selectie', label: 'Selectie', icon: '📋', color: 'bg-purple-100 text-purple-800' },
  { key: 'bezichtiging', label: 'Bezichtiging', icon: '✈️', color: 'bg-orange-100 text-orange-800' },
  { key: 'aankoop', label: 'Aankoop', icon: '🏠', color: 'bg-green-100 text-green-800' },
  { key: 'overdracht', label: 'Overdracht', icon: '🔑', color: 'bg-teal-100 text-teal-800' },
  { key: 'beheer', label: 'Beheer', icon: '⚙️', color: 'bg-gray-100 text-gray-800' },
];

function JourneyProgressBar({ currentPhase }: { currentPhase: string }) {
  const currentIndex = JOURNEY_PHASES.findIndex(p => p.key === currentPhase);
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {JOURNEY_PHASES.map((phase, idx) => (
          <div 
            key={phase.key}
            className={cn(
              "flex-1 h-2 rounded-full transition-colors",
              idx <= currentIndex ? "bg-primary" : "bg-muted"
            )}
            title={phase.label}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{JOURNEY_PHASES[0].icon}</span>
        <span>{JOURNEY_PHASES[JOURNEY_PHASES.length - 1].icon}</span>
      </div>
    </div>
  );
}

interface VisitorDetailSheetProps {
  visitor: VisitorProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VisitorDetailSheet({ visitor, open, onOpenChange }: VisitorDetailSheetProps) {
  const [filterHistoryOpen, setFilterHistoryOpen] = useState(false);
  const [journeyPhase, setJourneyPhase] = useState(visitor.crm_leads?.journey_phase || 'orientatie');
  const [adminNotes, setAdminNotes] = useState(visitor.crm_leads?.admin_notes || '');
  const { user } = useAuth();
  
  // Reset form when visitor changes
  useEffect(() => {
    setJourneyPhase(visitor.crm_leads?.journey_phase || 'orientatie');
    setAdminNotes(visitor.crm_leads?.admin_notes || '');
  }, [visitor.id, visitor.crm_leads?.journey_phase, visitor.crm_leads?.admin_notes]);
  
  const visitorType = getVisitorType(visitor);
  const displayName = getVisitorDisplayName(visitor);
  const score = calculateVisitorScore(visitor);
  const temperature = getVisitorTemperature(score);
  const scoreBreakdown = calculateVisitorScoreWithBreakdown(visitor);

  const queryClient = useQueryClient();

  const refreshFromGHLMutation = useMutation({
    mutationFn: async () => {
      const crm_user_id = visitor.crm_leads?.crm_user_id;
      if (!crm_user_id) throw new Error("Geen CRM ID beschikbaar");
      
      const { data, error } = await supabase.functions.invoke('refresh-crm-from-ghl', {
        body: { crm_user_id }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-visitors"] });
      toast.success("Contact data vernieuwd uit GoHighLevel");
    },
    onError: (error: any) => {
      toast.error("Fout bij ophalen uit GHL: " + (error.message || "Onbekende fout"));
    },
  });

  const updateJourneyPhaseMutation = useMutation({
    mutationFn: async ({ phase, notes }: { phase: string; notes: string }) => {
      const crm_user_id = visitor.crm_leads?.crm_user_id;
      if (!crm_user_id) throw new Error("Geen CRM lead gekoppeld");
      
      const { error } = await supabase
        .from("crm_leads")
        .update({
          journey_phase: phase,
          journey_phase_updated_at: new Date().toISOString(),
          journey_phase_updated_by: user?.id,
          admin_notes: notes,
        })
        .eq("crm_user_id", crm_user_id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-visitors"] });
      toast.success("Klanttraject bijgewerkt");
    },
    onError: (error: any) => {
      toast.error("Fout bij opslaan: " + (error.message || "Onbekende fout"));
    },
  });

  const handleSaveJourneyChanges = () => {
    updateJourneyPhaseMutation.mutate({ phase: journeyPhase, notes: adminNotes });
  };

  // Fetch timeline events
  const { data: timelineEvents, isLoading: isTimelineLoading } = useVisitorTimeline(visitor);

  // Use cached projects list for viewed/favorite lookups
  const { data: allProjects = [], isLoading: projectsListLoading } = useProjectsList(false);

  const viewedProjectIds = visitor.viewed_projects || [];
  const viewedProjects = useMemo(() => {
    if (viewedProjectIds.length === 0) return [];
    return allProjects.filter(p => viewedProjectIds.includes(p.id));
  }, [allProjects, viewedProjectIds]);
  const viewedLoading = projectsListLoading;

  const favoriteProjectIds = visitor.favorite_projects || [];
  const favoriteProjects = useMemo(() => {
    if (favoriteProjectIds.length === 0) return [];
    return allProjects.filter(p => favoriteProjectIds.includes(p.id));
  }, [allProjects, favoriteProjectIds]);
  const favoritesLoading = projectsListLoading;

  // Fetch favorites from user_favorites table (source of truth for account holders)
  const { data: userFavoritesFromTable, isLoading: userFavoritesLoading } = useQuery({
    queryKey: ["visitor-user-favorites-table", visitor.user_id],
    queryFn: async () => {
      if (!visitor.user_id) return [];

      const { data, error } = await supabase
        .from("user_favorites")
        .select(`
          project_id,
          created_at,
          projects:project_id (
            id, name, city, region, price_from, featured_image
          )
        `)
        .eq("user_id", visitor.user_id)
        .order("created_at", { ascending: false });

      console.log('[VisitorDetailSheet] User favorites from table:', data?.length);
      if (error) throw error;
      return data?.map(f => f.projects).filter(Boolean) || [];
    },
    enabled: !!visitor.user_id,
  });

  // Use user_favorites table as source of truth for account holders
  // Fall back to customer_profiles.favorite_projects for anonymous visitors
  const effectiveFavoriteProjects = visitor.user_id 
    ? userFavoritesFromTable 
    : favoriteProjects;
  
  const effectiveFavoritesLoading = visitor.user_id 
    ? userFavoritesLoading 
    : favoritesLoading;

  // Fetch filter history for this visitor
  const { data: filterHistory, isLoading: filterHistoryLoading } = useQuery({
    queryKey: ["visitor-filter-history", visitor.id, visitor.user_id],
    queryFn: async () => {
      const allVisitorIds = (visitor as any).linked_visitor_ids || [visitor.visitor_id];
      
      // Query by visitor_ids
      let eventsByVisitor: any[] = [];
      if (allVisitorIds.length > 0) {
        const { data } = await supabase
          .from("tracking_events")
          .select("event_params, occurred_at")
          .in("visitor_id", allVisitorIds)
          .in("event_name", ["filter", "filter_applied"])
          .order("occurred_at", { ascending: false })
          .limit(50);
        eventsByVisitor = data || [];
      }
      
      // Query by user_id
      let eventsByUser: any[] = [];
      if (visitor.user_id) {
        const { data } = await supabase
          .from("tracking_events")
          .select("event_params, occurred_at")
          .eq("user_id", visitor.user_id)
          .in("event_name", ["filter", "filter_applied"])
          .order("occurred_at", { ascending: false })
          .limit(50);
        eventsByUser = data || [];
      }
      
      // Merge and deduplicate
      const allEvents = [...eventsByVisitor, ...eventsByUser];
      return allEvents;
    },
  });

  const engagementData = (visitor.engagement_data as any) || {};
  const inferredPrefs = (visitor.inferred_preferences as any) || {};

  // Aggregate filter preferences
  const aggregateFilterPreferences = (filterEvents: any[]) => {
    if (!filterEvents || filterEvents.length === 0) return null;
    
    const regions: string[] = [];
    const cities: string[] = [];
    const propertyTypes: string[] = [];
    const budgets: { min: number; max: number }[] = [];
    const bedrooms: number[] = [];
    
    filterEvents.forEach(event => {
      const filters = event.event_params?.filters || event.event_params?.all_filters || {};
      
      if (filters.selectedRegions) regions.push(...filters.selectedRegions);
      if (filters.selectedCities) cities.push(...filters.selectedCities);
      if (filters.selectedPropertyTypes) propertyTypes.push(...filters.selectedPropertyTypes);
      if (filters.priceMin) budgets.push({ min: filters.priceMin, max: filters.priceMax || 1000000 });
      if (filters.priceMax) budgets.push({ min: filters.priceMin || 0, max: filters.priceMax });
      if (filters.bedrooms) bedrooms.push(...(Array.isArray(filters.bedrooms) ? filters.bedrooms : [filters.bedrooms]));
    });
    
    // Count frequencies and get top items
    const countFrequency = (arr: string[]) => {
      const counts: Record<string, number> = {};
      arr.forEach(item => { counts[item] = (counts[item] || 0) + 1; });
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([item]) => item);
    };
    
    // Calculate average budget range
    const avgBudget = budgets.length > 0 ? {
      min: Math.round(budgets.reduce((sum, b) => sum + b.min, 0) / budgets.length),
      max: Math.round(budgets.reduce((sum, b) => sum + b.max, 0) / budgets.length),
    } : null;
    
    return {
      regions: countFrequency(regions),
      cities: countFrequency(cities),
      propertyTypes: countFrequency(propertyTypes),
      budget: avgBudget,
      bedrooms: countFrequency(bedrooms.map(String)),
      totalFilterEvents: filterEvents.length,
    };
  };

  const filterPrefs = aggregateFilterPreferences(filterHistory || []);

  const getTypeBadge = () => {
    switch (visitorType) {
      case "account":
        return <Badge className="bg-blue-500 text-white">🔵 Account</Badge>;
      case "crm":
        return <Badge className="bg-green-500 text-white">🟢 CRM Lead</Badge>;
      case "anonymous":
        return <Badge variant="outline">⚪ Bezoeker</Badge>;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <SheetTitle className="text-2xl">{displayName}</SheetTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {getTypeBadge()}
                <LeadScoreBadge score={score} temperature={temperature} />
                {(visitor as any).linked_visitor_ids && (visitor as any).linked_visitor_ids.length > 1 && (
                  <Badge variant="outline" className="gap-1">
                    <Info className="h-3 w-3" />
                    {(visitor as any).linked_visitor_ids.length} devices
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overzicht</TabsTrigger>
            <TabsTrigger value="activity">
              Activiteit {timelineEvents?.length ? `(${timelineEvents.length})` : ''}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Contact Info */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg">Contact Informatie</CardTitle>
                  {visitor.crm_leads?.crm_user_id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" disabled={refreshFromGHLMutation.isPending}>
                          <RefreshCw className={`h-4 w-4 mr-2 ${refreshFromGHLMutation.isPending ? 'animate-spin' : ''}`} />
                          Sync
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => refreshFromGHLMutation.mutate()}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Ophalen uit GHL
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled>
                          Sync naar GHL (binnenkort)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </CardHeader>
            <CardContent className="space-y-3">
              {visitor.profiles?.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{visitor.profiles.email}</span>
                </div>
              )}
              {visitor.crm_leads?.email && !visitor.profiles?.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{visitor.crm_leads.email}</span>
                </div>
              )}
              {visitor.crm_leads?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{visitor.crm_leads.phone}</span>
                </div>
              )}
              {visitor.user_id && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="secondary">Account Gekoppeld</Badge>
                </div>
              )}
              {visitor.crm_leads?.crm_user_id && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  GHL Contact ID: {visitor.crm_leads.crm_user_id}
                </div>
              )}
              {visitor.crm_leads?.last_ghl_refresh_at && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  ✓ Laatst gesynchroniseerd: {formatDistanceToNow(new Date(visitor.crm_leads.last_ghl_refresh_at), {
                    addSuffix: true,
                    locale: nl,
                  })}
                </div>
              )}
              {!visitor.profiles?.email && !visitor.crm_leads?.email && (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Geen contact informatie beschikbaar
                </div>
              )}
            </CardContent>
          </Card>

          {/* Journey Phase Management - alleen voor CRM leads */}
          {visitor.crm_leads && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Klanttraject
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Visual journey progress bar */}
                <JourneyProgressBar currentPhase={journeyPhase} />
                
                {/* Phase selector dropdown */}
                <div className="space-y-2">
                  <Label>Huidige fase</Label>
                  <Select value={journeyPhase} onValueChange={setJourneyPhase}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JOURNEY_PHASES.map(phase => (
                        <SelectItem key={phase.key} value={phase.key}>
                          {phase.icon} {phase.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Admin notities */}
                <div className="space-y-2">
                  <Label>Admin Notities</Label>
                  <Textarea 
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Notities over deze klant..."
                    rows={3}
                  />
                </div>
                
                <Button 
                  onClick={handleSaveJourneyChanges}
                  disabled={updateJourneyPhaseMutation.isPending}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateJourneyPhaseMutation.isPending ? "Opslaan..." : "Wijzigingen Opslaan"}
                </Button>
                
                {/* Laatste update info */}
                {visitor.crm_leads.journey_phase_updated_at && (
                  <p className="text-xs text-muted-foreground">
                    Laatste fase update: {formatDistanceToNow(new Date(visitor.crm_leads.journey_phase_updated_at), {
                      addSuffix: true,
                      locale: nl,
                    })}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Engagement Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Engagement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Eerste bezoek</span>
                <span>
                  {engagementData.first_visit_at
                    ? formatDistanceToNow(new Date(engagementData.first_visit_at), {
                        addSuffix: true,
                        locale: nl,
                      })
                    : "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Laatste bezoek</span>
                <span>
                  {engagementData.last_visit_at
                    ? formatDistanceToNow(new Date(engagementData.last_visit_at), {
                        addSuffix: true,
                        locale: nl,
                      })
                    : "-"}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Totaal visits</span>
                <span className="font-medium">{engagementData.total_visits || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Page views</span>
                <span className="font-medium">{engagementData.total_page_views || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Project views</span>
                <span className="font-medium">{engagementData.total_project_views || 0}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Totale tijd op site</span>
                <span className="font-medium">
                  {engagementData.total_time_on_site_seconds 
                    ? `${Math.floor(engagementData.total_time_on_site_seconds / 60)} min`
                    : "0 min"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gem. tijd per pagina</span>
                <span className="font-medium">
                  {engagementData.avg_time_per_page 
                    ? `${Math.round(engagementData.avg_time_per_page)} sec`
                    : "0 sec"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Engagement diepte</span>
                <Badge variant={
                  engagementData.engagement_depth === 'very_high' ? 'default' :
                  engagementData.engagement_depth === 'high' ? 'secondary' :
                  engagementData.engagement_depth === 'medium' ? 'outline' : 'outline'
                }>
                  {engagementData.engagement_depth === 'very_high' ? '🔥 Zeer hoog' :
                   engagementData.engagement_depth === 'high' ? '⚡ Hoog' :
                   engagementData.engagement_depth === 'medium' ? '👍 Gemiddeld' : '👀 Laag'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Engagement Score Breakdown */}
          <EngagementBreakdown breakdown={scoreBreakdown} />

          {/* Voorkeuren Section with Tabs */}
          {(inferredPrefs.common_regions?.length || 
            inferredPrefs.common_cities?.length || 
            inferredPrefs.budget_min ||
            filterHistory?.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Voorkeuren</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="projects" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="projects" className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Uit projecten
                    </TabsTrigger>
                    <TabsTrigger value="filters" className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Uit filters ({filterPrefs?.totalFilterEvents || 0})
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="projects" className="mt-4 space-y-3">
                    <div className="text-sm text-muted-foreground mb-2">
                      Automatisch afgeleid uit bekeken projecten
                    </div>
                    {inferredPrefs.budget_min && inferredPrefs.budget_max && (
                      <div className="flex items-start gap-2">
                        <Euro className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="text-sm text-muted-foreground">Budget bereik</div>
                          <div className="font-medium">
                            €{inferredPrefs.budget_min.toLocaleString()} - €{inferredPrefs.budget_max.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    )}
                    {inferredPrefs.common_regions && inferredPrefs.common_regions.length > 0 && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="text-sm text-muted-foreground">Meest bekeken regio's</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {inferredPrefs.common_regions.map((region: string) => (
                              <Badge key={region} variant="secondary">{region}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {inferredPrefs.common_cities && inferredPrefs.common_cities.length > 0 && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="text-sm text-muted-foreground">Meest bekeken steden</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {inferredPrefs.common_cities.map((city: string) => (
                              <Badge key={city} variant="secondary">{city}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {!inferredPrefs.budget_min && !inferredPrefs.common_regions?.length && !inferredPrefs.common_cities?.length && (
                      <div className="text-center py-4 text-muted-foreground">
                        Nog geen voorkeuren afgeleid uit projecten
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="filters" className="mt-4 space-y-3">
                    {filterHistoryLoading ? (
                      <div className="text-center py-4 text-muted-foreground">Laden...</div>
                    ) : filterPrefs ? (
                      <>
                        <div className="text-sm text-muted-foreground mb-2">
                          Afgeleid uit {filterPrefs.totalFilterEvents} filter acties
                        </div>
                        {filterPrefs.budget && (
                          <div className="flex items-start gap-2">
                            <Euro className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <div className="text-sm text-muted-foreground">Gezocht budget</div>
                              <div className="font-medium">
                                €{filterPrefs.budget.min.toLocaleString()} - €{filterPrefs.budget.max.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        )}
                        {filterPrefs.regions.length > 0 && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <div className="text-sm text-muted-foreground">Gezochte regio's</div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {filterPrefs.regions.map((region: string) => (
                                  <Badge key={region} variant="secondary">{region}</Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                        {filterPrefs.cities.length > 0 && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <div className="text-sm text-muted-foreground">Gezochte steden</div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {filterPrefs.cities.map((city: string) => (
                                  <Badge key={city} variant="secondary">{city}</Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                        {filterPrefs.propertyTypes.length > 0 && (
                          <div className="flex items-start gap-2">
                            <Home className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <div className="text-sm text-muted-foreground">Woningtypes</div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {filterPrefs.propertyTypes.map((type: string) => (
                                  <Badge key={type} variant="secondary">{type}</Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                        {filterPrefs.bedrooms.length > 0 && (
                          <div className="flex items-start gap-2">
                            <Bed className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <div className="text-sm text-muted-foreground">Slaapkamers</div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {filterPrefs.bedrooms.map((bed: string) => (
                                  <Badge key={bed} variant="secondary">{bed}+</Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                        {!filterPrefs.budget && filterPrefs.regions.length === 0 && filterPrefs.cities.length === 0 && 
                         filterPrefs.propertyTypes.length === 0 && filterPrefs.bedrooms.length === 0 && (
                          <div className="text-center py-4 text-muted-foreground">
                            Geen filter voorkeuren gevonden
                          </div>
                        )}
                        
                        {/* Button to open full filter history */}
                        {filterHistory && filterHistory.length > 0 && (
                          <div className="pt-3 border-t">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full"
                              onClick={() => setFilterHistoryOpen(true)}
                            >
                              <History className="h-4 w-4 mr-2" />
                              Bekijk volledige filtergeschiedenis ({filterHistory.length})
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        Geen filter activiteit gevonden
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Projects Section with Tabs */}
          {((viewedProjects && viewedProjects.length > 0) || (effectiveFavoriteProjects && effectiveFavoriteProjects.length > 0) || viewedLoading || effectiveFavoritesLoading) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Projecten</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="viewed" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="viewed" className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Bekeken ({viewedProjects?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="favorites" className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      Favorieten ({effectiveFavoriteProjects?.length || 0})
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="viewed" className="mt-4">
                    {viewedLoading ? (
                      <div className="text-center py-4 text-muted-foreground">Laden...</div>
                    ) : viewedProjects && viewedProjects.length > 0 ? (
                      <div className="space-y-3">
                        {viewedProjects.map((project) => (
                          <div key={project.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                            {project.featured_image && (
                              <img
                                src={project.featured_image}
                                alt={project.name}
                                className="w-16 h-16 object-cover rounded"
                              />
                            )}
                            <div className="flex-1">
                              <div className="font-medium">{project.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {project.city}, {project.region}
                              </div>
                              {project.price_from && (
                                <div className="text-sm">vanaf €{project.price_from.toLocaleString()}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">Geen bekeken projecten</div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="favorites" className="mt-4">
                    {effectiveFavoritesLoading ? (
                      <div className="text-center py-4 text-muted-foreground">Laden...</div>
                    ) : effectiveFavoriteProjects && effectiveFavoriteProjects.length > 0 ? (
                      <div className="space-y-3">
                        {effectiveFavoriteProjects.map((project) => (
                          <div key={project.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                            {project.featured_image && (
                              <img
                                src={project.featured_image}
                                alt={project.name}
                                className="w-16 h-16 object-cover rounded"
                              />
                            )}
                            <div className="flex-1">
                              <div className="font-medium flex items-center gap-2">
                                {project.name}
                                <Heart className="h-4 w-4 text-red-500 fill-current" />
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {project.city}, {project.region}
                              </div>
                              {project.price_from && (
                                <div className="text-sm">vanaf €{project.price_from.toLocaleString()}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">Geen favoriete projecten</div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            {isTimelineLoading ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Activiteiten laden...
                </CardContent>
              </Card>
            ) : (
              <LeadTimeline events={timelineEvents || []} />
            )}
          </TabsContent>
        </Tabs>
        
        {/* Filter History Dialog */}
        <Dialog open={filterHistoryOpen} onOpenChange={setFilterHistoryOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Filtergeschiedenis ({filterHistory?.length || 0} acties)
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              {filterHistory?.map((event, index) => {
                const filters = event.event_params?.filters || event.event_params?.all_filters || {};
                const hasFilters = Object.entries(filters).some(([key, value]) => {
                  if (key === 'availability') return false; // Skip default
                  if (Array.isArray(value)) return value.length > 0;
                  if (typeof value === 'number') return true;
                  if (typeof value === 'boolean') return value;
                  return value && value !== '';
                });
                
                return (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    {/* Timestamp Header */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {format(new Date(event.occurred_at), "d MMM yyyy 'om' HH:mm", { locale: nl })}
                    </div>
                    
                    {/* Filter Details */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {/* Budget */}
                      {(filters.priceMin || filters.priceMax) && (
                        <div className="flex items-center gap-2">
                          <Euro className="h-3 w-3 text-muted-foreground" />
                          <span>
                            €{filters.priceMin?.toLocaleString() || '0'} - €{filters.priceMax?.toLocaleString() || '∞'}
                          </span>
                        </div>
                      )}
                      
                      {/* Regions */}
                      {filters.selectedRegions?.length > 0 && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>{filters.selectedRegions.join(', ')}</span>
                        </div>
                      )}
                      
                      {/* Cities */}
                      {filters.selectedCities?.length > 0 && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>{filters.selectedCities.join(', ')}</span>
                        </div>
                      )}
                      
                      {/* Property Types */}
                      {filters.selectedPropertyTypes?.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Home className="h-3 w-3 text-muted-foreground" />
                          <span>{filters.selectedPropertyTypes.join(', ')}</span>
                        </div>
                      )}
                      
                      {/* Bedrooms */}
                      {filters.bedrooms?.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Bed className="h-3 w-3 text-muted-foreground" />
                          <span>{filters.bedrooms.join(', ')}+ slaapkamers</span>
                        </div>
                      )}
                      
                      {/* Bathrooms */}
                      {filters.bathrooms?.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">🚿</span>
                          <span>{filters.bathrooms.join(', ')}+ badkamers</span>
                        </div>
                      )}
                      
                      {/* Pool */}
                      {filters.hasPool && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">🏊</span>
                          <span>Zwembad: {filters.hasPool === 'private' ? 'Privé' : filters.hasPool}</span>
                        </div>
                      )}
                      
                      {/* Sea Views */}
                      {filters.hasSeaViews && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">🌊</span>
                          <span>Zeezicht</span>
                        </div>
                      )}
                      
                      {/* Search Query */}
                      {filters.search && (
                        <div className="flex items-center gap-2 col-span-2">
                          <span className="text-muted-foreground">🔍</span>
                          <span>Zoekopdracht: "{filters.search}"</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Empty state for filter action without active filters */}
                    {!hasFilters && (
                      <div className="text-sm text-muted-foreground italic">
                        Filters gereset / standaard filters
                      </div>
                    )}
                  </div>
                );
              })}
              
              {(!filterHistory || filterHistory.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  Geen filtergeschiedenis gevonden
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
