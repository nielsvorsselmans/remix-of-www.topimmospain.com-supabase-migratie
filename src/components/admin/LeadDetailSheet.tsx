import { useState, useMemo } from "react";
import { useProjectsList } from "@/hooks/useProjectsList";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCRMLead, calculateLeadScore, calculateLeadScoreWithBreakdown, getLeadTemperature } from "@/hooks/useCRMLeads";
import { EngagementBreakdown } from "./EngagementBreakdown";
import { LeadScoreBadge } from "./LeadScoreBadge";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { Mail, Phone, User, Calendar, Eye, MessageSquare, MapPin, Euro, Clock, Heart, Filter, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useLeadTimeline } from "@/hooks/useLeadTimeline";
import { LeadTimeline } from "./LeadTimeline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LeadDetailSheetProps {
  leadId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadDetailSheet({ leadId, open, onOpenChange }: LeadDetailSheetProps) {
  const { data: lead } = useCRMLead(leadId);
  const { data: timelineEvents = [] } = useLeadTimeline(lead);
  const queryClient = useQueryClient();

  const [followUpStatus, setFollowUpStatus] = useState<string>("");
  const [followUpNotes, setFollowUpNotes] = useState<string>("");

  // Extract project IDs OUTSIDE useQuery for proper queryKey dependency
  const favoriteProjectIds = (lead as any)?.customer_profiles?.favorite_projects || [];
  const viewedProjectIds = (lead as any)?.customer_profiles?.viewed_projects || [];

  // Use cached projects list for viewed/favorite lookups
  const { data: allProjects = [], isLoading: projectsListLoading } = useProjectsList(false);

  const viewedProjects = useMemo(() => {
    if (viewedProjectIds.length === 0) return [];
    return allProjects.filter(p => viewedProjectIds.includes(p.id));
  }, [allProjects, viewedProjectIds]);
  const viewedLoading = projectsListLoading;

  const favoriteProjects = useMemo(() => {
    if (favoriteProjectIds.length === 0) return [];
    return allProjects.filter(p => favoriteProjectIds.includes(p.id));
  }, [allProjects, favoriteProjectIds]);
  const favoritesLoading = projectsListLoading;

  // Get all linked visitor IDs
  const allLinkedVisitorIds = [
    lead?.visitor_id,
    ...((lead as any)?.customer_profiles?.linked_visitor_ids || [])
  ].filter(Boolean);

  // Fetch filter history from tracking_events for ALL visitor IDs AND user_id
  const { data: filterHistory } = useQuery({
    queryKey: ["lead-filter-history", leadId, allLinkedVisitorIds, lead?.user_id],
    queryFn: async () => {
      console.log('[Filter History] All visitor IDs:', allLinkedVisitorIds);
      console.log('[Filter History] User ID:', lead?.user_id);
      
      // Query 1: By visitor_ids
      let filtersByVisitor: any[] = [];
      if (allLinkedVisitorIds.length > 0) {
        const { data, error } = await supabase
          .from("tracking_events")
          .select("event_params, occurred_at")
          .in("visitor_id", allLinkedVisitorIds)
          .in("event_name", ["filter_applied", "filter"])
          .order("occurred_at", { ascending: false })
          .limit(10);
        
        console.log('[Filter History] Events by visitor_id:', data?.length, 'Error:', error);
        if (error) throw error;
        filtersByVisitor = data || [];
      }

      // Query 2: By user_id
      let filtersByUser: any[] = [];
      if (lead?.user_id) {
        const { data, error } = await supabase
          .from("tracking_events")
          .select("event_params, occurred_at")
          .eq("user_id", lead.user_id)
          .in("event_name", ["filter_applied", "filter"])
          .order("occurred_at", { ascending: false })
          .limit(10);
        
        console.log('[Filter History] Events by user_id:', data?.length, 'Error:', error);
        if (error) throw error;
        filtersByUser = data || [];
      }

      // Merge and deduplicate
      const allFilters = [...filtersByVisitor, ...filtersByUser];
      const uniqueFiltersMap = new Map(
        allFilters.map(f => [`${f.occurred_at}-${JSON.stringify(f.event_params)}`, f])
      );
      const uniqueFilters = Array.from(uniqueFiltersMap.values())
        .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
        .slice(0, 10);
      
      console.log('[Filter History] Total unique filters after merge:', uniqueFilters.length);
      return uniqueFilters;
    },
    enabled: allLinkedVisitorIds.length > 0 || !!lead?.user_id,
  });

  // Fetch chat conversations for ALL visitor IDs
  const { data: conversations } = useQuery({
    queryKey: ["lead-conversations", leadId, allLinkedVisitorIds],
    queryFn: async () => {
      if (allLinkedVisitorIds.length === 0) return [];

      const { data, error } = await supabase
        .from("chat_conversations")
        .select("id, created_at, completed_at, bot_type, converted")
        .in("visitor_id", allLinkedVisitorIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: allLinkedVisitorIds.length > 0,
  });

  const refreshFromGHLMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('refresh-crm-from-ghl', {
        body: { crm_user_id: lead.crm_user_id }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm-lead", leadId] });
      toast.success("Contact data vernieuwd uit GoHighLevel");
    },
    onError: (error: any) => {
      toast.error("Fout bij ophalen uit GHL: " + (error.message || "Onbekende fout"));
    },
  });

  const updateFollowUpMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("crm_leads")
        .update({
          follow_up_status: followUpStatus || lead?.follow_up_status,
          follow_up_notes: followUpNotes || lead?.follow_up_notes,
          last_follow_up_at: new Date().toISOString(),
        })
        .eq("id", leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm-lead", leadId] });
      toast.success("Follow-up status bijgewerkt");
    },
    onError: () => {
      toast.error("Fout bij bijwerken follow-up status");
    },
  });

  if (!lead) return null;

  const scoreBreakdown = calculateLeadScoreWithBreakdown(lead);
  const score = scoreBreakdown.total;
  const temperature = scoreBreakdown.temperature;
  const name = lead.first_name && lead.last_name 
    ? `${lead.first_name} ${lead.last_name}`
    : lead.first_name || 'Anonieme Lead';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-2xl">{name}</SheetTitle>
            <LeadScoreBadge score={score} temperature={temperature} />
          </div>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Tabs for Overview and Timeline */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overzicht</TabsTrigger>
              <TabsTrigger value="timeline">
                <Clock className="h-4 w-4 mr-2" />
                Timeline ({timelineEvents.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              {/* Engagement Score Breakdown */}
              <EngagementBreakdown breakdown={scoreBreakdown} />

              {/* Contact Info */}
              <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg">Contact Informatie</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={refreshFromGHLMutation.isPending}
                  >
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
            </CardHeader>
            <CardContent className="space-y-3">
              {lead.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.email}</span>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.phone}</span>
                </div>
              )}
              {lead.user_id && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="secondary">Account Gekoppeld</Badge>
                </div>
              )}
              {lead.ghl_contact_id && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  GHL Contact ID: {lead.ghl_contact_id}
                </div>
              )}
              {lead.last_ghl_refresh_at && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  ✓ Laatst gesynchroniseerd: {formatDistanceToNow(new Date(lead.last_ghl_refresh_at), {
                    addSuffix: true,
                    locale: nl,
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Engagement Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Engagement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Eerste bezoek</span>
                <span>
                  {lead.first_visit_at
                    ? formatDistanceToNow(new Date(lead.first_visit_at), {
                        addSuffix: true,
                        locale: nl,
                      })
                    : "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Laatste bezoek</span>
                <span>
                  {lead.last_visit_at
                    ? formatDistanceToNow(new Date(lead.last_visit_at), {
                        addSuffix: true,
                        locale: nl,
                      })
                    : "-"}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Totaal visits</span>
                <span className="font-medium">{(lead as any).customer_profiles?.engagement_data?.total_visits || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Page views</span>
                <span className="font-medium">{(lead as any).customer_profiles?.engagement_data?.total_page_views || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Project views</span>
                <span className="font-medium">{(lead as any).customer_profiles?.engagement_data?.total_project_views || 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Inferred Preferences from customer_profiles */}
          {((lead as any).customer_profiles?.inferred_preferences?.common_regions?.length || 
            (lead as any).customer_profiles?.inferred_preferences?.common_cities?.length || 
            (lead as any).customer_profiles?.inferred_preferences?.budget_min) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Voorkeuren (Afgeleid)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(lead as any).customer_profiles?.inferred_preferences?.budget_min && (lead as any).customer_profiles?.inferred_preferences?.budget_max && (
                  <div className="flex items-start gap-2">
                    <Euro className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-sm text-muted-foreground">Budget</div>
                      <div className="font-medium">
                        €{(lead as any).customer_profiles.inferred_preferences.budget_min.toLocaleString()} - €
                        {(lead as any).customer_profiles.inferred_preferences.budget_max.toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
                {(lead as any).customer_profiles?.inferred_preferences?.common_regions && (lead as any).customer_profiles.inferred_preferences.common_regions.length > 0 && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-sm text-muted-foreground">Regio's</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(lead as any).customer_profiles.inferred_preferences.common_regions.map((region: string) => (
                          <Badge key={region} variant="outline">
                            {region}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {(lead as any).customer_profiles?.inferred_preferences?.common_cities && (lead as any).customer_profiles.inferred_preferences.common_cities.length > 0 && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-sm text-muted-foreground">Steden</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(lead as any).customer_profiles.inferred_preferences.common_cities.map((city: string) => (
                          <Badge key={city} variant="outline">
                            {city}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Projects Section with Tabs */}
          {((viewedProjects && viewedProjects.length > 0) || (favoriteProjects && favoriteProjects.length > 0) || viewedLoading || favoritesLoading) && (
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
                      Favorieten ({favoriteProjects?.length || 0})
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
                              <img src={project.featured_image} alt={project.name} className="w-16 h-16 object-cover rounded" />
                            )}
                            <div className="flex-1">
                              <div className="font-medium">{project.name}</div>
                              <div className="text-sm text-muted-foreground">{project.city}, {project.region}</div>
                              {project.price_from && <div className="text-sm">vanaf €{project.price_from.toLocaleString()}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">Geen bekeken projecten</div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="favorites" className="mt-4">
                    {favoritesLoading ? (
                      <div className="text-center py-4 text-muted-foreground">Laden...</div>
                    ) : favoriteProjects && favoriteProjects.length > 0 ? (
                      <div className="space-y-3">
                        {favoriteProjects.map((project) => (
                          <div key={project.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                            {project.featured_image && (
                              <img src={project.featured_image} alt={project.name} className="w-16 h-16 object-cover rounded" />
                            )}
                            <div className="flex-1">
                              <div className="font-medium flex items-center gap-2">
                                {project.name}
                                <Heart className="h-4 w-4 text-red-500 fill-current" />
                              </div>
                              <div className="text-sm text-muted-foreground">{project.city}, {project.region}</div>
                              {project.price_from && <div className="text-sm">vanaf €{project.price_from.toLocaleString()}</div>}
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

          {/* Filter History */}
          {filterHistory && filterHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Gebruikte Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filterHistory.map((event, idx) => {
                    const filters = (event.event_params as any)?.all_filters || (event.event_params as any)?.filters || {};
                    return (
                      <div key={idx} className="space-y-2">
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(event.occurred_at), {
                            addSuffix: true,
                            locale: nl,
                          })}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {filters.price_min && (
                            <Badge variant="secondary" className="text-xs">
                              Min: €{filters.price_min.toLocaleString()}
                            </Badge>
                          )}
                          {filters.price_max && (
                            <Badge variant="secondary" className="text-xs">
                              Max: €{filters.price_max.toLocaleString()}
                            </Badge>
                          )}
                          {filters.regions && filters.regions.length > 0 && (
                            filters.regions.map((region: string) => (
                              <Badge key={region} variant="outline" className="text-xs">
                                {region}
                              </Badge>
                            ))
                          )}
                          {filters.cities && filters.cities.length > 0 && (
                            filters.cities.map((city: string) => (
                              <Badge key={city} variant="outline" className="text-xs">
                                {city}
                              </Badge>
                            ))
                          )}
                          {filters.bedrooms && filters.bedrooms.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {filters.bedrooms.join('/')} slaapkamers
                            </Badge>
                          )}
                        </div>
                        {idx < filterHistory.length - 1 && <Separator className="mt-2" />}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Chat Conversations */}
          {conversations && conversations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Chatbot Gesprekken ({conversations.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {conversations.map((conv) => (
                    <div key={conv.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                      <div>
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(conv.created_at), {
                            addSuffix: true,
                            locale: nl,
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">{conv.bot_type}</div>
                      </div>
                      <div className="flex gap-2">
                        {conv.completed_at && (
                          <Badge variant="secondary" className="text-xs">
                            Afgerond
                          </Badge>
                        )}
                        {conv.converted && (
                          <Badge variant="default" className="text-xs">
                            Geconverteerd
                          </Badge>
                        )}
                        {!conv.completed_at && (
                          <Badge variant="outline" className="text-xs">
                            Niet afgerond
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Follow-up Management */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Follow-up
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={followUpStatus || lead.follow_up_status || "new"}
                  onValueChange={setFollowUpStatus}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Selecteer status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Nieuw</SelectItem>
                    <SelectItem value="contacted">Gecontacteerd</SelectItem>
                    <SelectItem value="qualified">Gekwalificeerd</SelectItem>
                    <SelectItem value="converted">Geconverteerd</SelectItem>
                    <SelectItem value="lost">Verloren</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notities</Label>
                <Textarea
                  id="notes"
                  placeholder="Voeg follow-up notities toe..."
                  value={followUpNotes || lead.follow_up_notes || ""}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  rows={4}
                />
              </div>

              {lead.last_follow_up_at && (
                <div className="text-sm text-muted-foreground">
                  Laatste follow-up:{" "}
                  {formatDistanceToNow(new Date(lead.last_follow_up_at), {
                    addSuffix: true,
                    locale: nl,
                  })}
                </div>
              )}

              <Button
                onClick={() => updateFollowUpMutation.mutate()}
                disabled={updateFollowUpMutation.isPending}
                className="w-full"
              >
                {updateFollowUpMutation.isPending ? "Opslaan..." : "Follow-up Opslaan"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Activiteiten Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LeadTimeline events={timelineEvents} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
      </SheetContent>
    </Sheet>
  );
}
