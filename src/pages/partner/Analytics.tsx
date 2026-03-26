import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePartner } from "@/contexts/PartnerContext";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  TrendingUp, 
  Eye,
  MousePointer,
  UserPlus,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Share2,
  Trophy,
  BarChart3,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, subMonths } from "date-fns";
import { nl } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

const PERIOD_OPTIONS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "Alles", days: 0 },
] as const;

// Map raw paths to readable names
function readablePath(path: string): string {
  if (path === "/" || path === "") return "Homepagina";
  if (path === "/projecten") return "Projecten overzicht";
  if (path === "/over-ons") return "Over ons";
  if (path === "/contact") return "Contact";
  if (path === "/investeren") return "Investeren in Spanje";
  if (path === "/orienteren") return "Oriëntatiepagina";
  if (path === "/aanbod") return "Aanbod";
  if (path === "/hypotheek") return "Hypotheek";
  if (path === "/ontdekken") return "Ontdekken";
  const blogMatch = path.match(/^\/blog\/(.+)/);
  if (blogMatch) {
    return blogMatch[1].replace(/-/g, " ").replace(/^\w/, c => c.toUpperCase());
  }
  const projectMatch = path.match(/^\/projecten\/(.+)/);
  if (projectMatch) {
    return `Project: ${projectMatch[1].replace(/-/g, " ")}`;
  }
  return path;
}

export default function PartnerAnalytics() {
  const { user } = useAuth();
  const { impersonatedPartner, isImpersonating } = usePartner();
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState<number>(30);

  // Fetch partner ID
  const { data: partner } = useQuery({
    queryKey: ["partner-profile", user?.id, impersonatedPartner?.id],
    queryFn: async () => {
      if (isImpersonating && impersonatedPartner) {
        return { 
          id: impersonatedPartner.id, 
          referral_code: impersonatedPartner.referral_code,
          slug: impersonatedPartner.slug,
          name: impersonatedPartner.name,
        };
      }
      
      const { data, error } = await supabase
        .from("partners")
        .select("id, referral_code, slug, name")
        .eq("user_id", user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id || isImpersonating,
  });

  // Fetch partner referrals
  const { data: referrals, isLoading: referralsLoading } = useQuery({
    queryKey: ["partner-analytics-referrals", partner?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_referrals")
        .select("*")
        .eq("partner_id", partner?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!partner?.id,
  });

  // Fetch partner leads
  const { data: leads } = useQuery({
    queryKey: ["partner-analytics-leads", partner?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_leads")
        .select("id, created_at, journey_phase")
        .eq("referred_by_partner_id", partner?.id);
      if (error) throw error;
      return data;
    },
    enabled: !!partner?.id,
  });

  // Fetch content shares (filtered by period)
  const { data: contentShares } = useQuery({
    queryKey: ["partner-analytics-shares", partner?.id, selectedPeriod],
    queryFn: async () => {
      let query = supabase
        .from("partner_content_shares")
        .select("blog_post_id, share_type, created_at")
        .eq("partner_id", partner?.id);
      if (selectedPeriod > 0) {
        query = query.gte("created_at", subDays(new Date(), selectedPeriod).toISOString());
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!partner?.id,
  });

  // Fetch chatbot conversations (count only to avoid 1000-row limit)
  const { data: chatConversations } = useQuery({
    queryKey: ["partner-analytics-chats", partner?.id, selectedPeriod],
    queryFn: async () => {
      const { data: refs } = await supabase
        .from("partner_referrals")
        .select("visitor_id")
        .eq("partner_id", partner?.id);
      const visitorIds = refs?.map(r => r.visitor_id).filter(Boolean) || [];
      if (visitorIds.length === 0) return { total: 0, converted: 0 };

      let totalQuery = supabase
        .from("chat_conversations")
        .select("id", { count: "exact", head: true })
        .in("visitor_id", visitorIds);

      let convertedQuery = supabase
        .from("chat_conversations")
        .select("id", { count: "exact", head: true })
        .in("visitor_id", visitorIds)
        .eq("converted", true);

      if (selectedPeriod > 0) {
        const since = subDays(new Date(), selectedPeriod).toISOString();
        totalQuery = totalQuery.gte("created_at", since);
        convertedQuery = convertedQuery.gte("created_at", since);
      }

      const [totalRes, convertedRes] = await Promise.all([totalQuery, convertedQuery]);
      return {
        total: totalRes.count || 0,
        converted: convertedRes.count || 0,
      };
    },
    enabled: !!partner?.id,
  });

  // Fetch page stats with days filter
  const { data: pageStats, isLoading: pageStatsLoading } = useQuery({
    queryKey: ["partner-page-stats", partner?.id, selectedPeriod],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-partner-page-stats', {
        body: { partner_id: partner?.id, days: selectedPeriod > 0 ? selectedPeriod : undefined },
      });
      if (error) throw error;
      return (data?.page_stats || []) as { path: string; unique_visitors: number; total_views: number }[];
    },
    enabled: !!partner?.id,
  });

  // Fetch blog post titles
  const { data: blogPosts } = useQuery({
    queryKey: ["partner-analytics-blog-titles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, category")
        .eq("published", true);
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Filter data by selected period
  const periodStart = selectedPeriod > 0 ? subDays(new Date(), selectedPeriod) : null;
  const previousPeriodStart = selectedPeriod > 0 ? subDays(new Date(), selectedPeriod * 2) : null;

  const filteredReferrals = useMemo(() => {
    if (!referrals) return [];
    if (!periodStart) return referrals;
    return referrals.filter(r => r.first_visit_at && new Date(r.first_visit_at) >= periodStart);
  }, [referrals, periodStart]);

  const previousReferrals = useMemo(() => {
    if (!referrals || !periodStart || !previousPeriodStart) return [];
    return referrals.filter(r => {
      if (!r.first_visit_at) return false;
      const d = new Date(r.first_visit_at);
      return d >= previousPeriodStart && d < periodStart;
    });
  }, [referrals, periodStart, previousPeriodStart]);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    if (!periodStart) return leads;
    return leads.filter(l => l.created_at && new Date(l.created_at) >= periodStart);
  }, [leads, periodStart]);

  const previousLeads = useMemo(() => {
    if (!leads || !periodStart || !previousPeriodStart) return [];
    return leads.filter(l => {
      if (!l.created_at) return false;
      const d = new Date(l.created_at);
      return d >= previousPeriodStart && d < periodStart;
    });
  }, [leads, periodStart, previousPeriodStart]);

  // Calculated stats
  const totalVisitors = filteredReferrals.length;
  const totalLeads = filteredLeads.length;
  const conversionRate = totalVisitors > 0 ? ((totalLeads / totalVisitors) * 100).toFixed(1) : "0";
  const totalPageViews = pageStats?.reduce((sum, p) => sum + p.total_views, 0) || 0;

  const totalChats = chatConversations?.total || 0;
  const convertedChats = chatConversations?.converted || 0;
  const chatConversionRate = totalChats > 0 ? ((convertedChats / totalChats) * 100).toFixed(0) : "0";

  // Trend calculations
  const calcTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const visitorTrend = calcTrend(totalVisitors, previousReferrals.length);
  const leadTrend = calcTrend(totalLeads, previousLeads.length);
  const pageViewTrend = selectedPeriod > 0 ? null : null; // Page view trend needs two edge function calls, skip for now

  // Prepare chart data
  const chartDays = Math.min(selectedPeriod || 30, 90);
  const chartInterval = eachDayOfInterval({
    start: subDays(new Date(), chartDays - 1),
    end: new Date()
  });

  const dailyData = chartInterval.map(day => {
    const dayStr = format(day, "yyyy-MM-dd");
    const dayVisitors = filteredReferrals?.filter(r => 
      r.first_visit_at && format(new Date(r.first_visit_at), "yyyy-MM-dd") === dayStr
    ).length || 0;
    const dayLeads = filteredLeads?.filter(l => 
      l.created_at && format(new Date(l.created_at), "yyyy-MM-dd") === dayStr
    ).length || 0;
    return {
      date: format(day, "d MMM", { locale: nl }),
      bezoekers: dayVisitors,
      leads: dayLeads,
    };
  });

  const last6Months = eachMonthOfInterval({
    start: subMonths(new Date(), 5),
    end: new Date()
  });

  const monthlyData = last6Months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const allReferrals = referrals || [];
    const allLeads = leads || [];
    const monthVisitors = allReferrals.filter(r => {
      if (!r.first_visit_at) return false;
      const d = new Date(r.first_visit_at);
      return d >= monthStart && d <= monthEnd;
    }).length;
    const monthLeads = allLeads.filter(l => {
      if (!l.created_at) return false;
      const d = new Date(l.created_at);
      return d >= monthStart && d <= monthEnd;
    }).length;
    return {
      month: format(month, "MMM", { locale: nl }),
      bezoekers: monthVisitors,
      leads: monthLeads,
    };
  });

  // Content performance
  const contentPerformance = useMemo(() => {
    if (!blogPosts || !contentShares) return [];
    const sharesByPost: Record<string, number> = {};
    contentShares.forEach((s) => {
      sharesByPost[s.blog_post_id] = (sharesByPost[s.blog_post_id] || 0) + 1;
    });
    const pageStatsBySlug: Record<string, { visitors: number; views: number }> = {};
    (pageStats || []).forEach((ps) => {
      const blogMatch = ps.path.match(/^\/blog\/(.+)/);
      if (blogMatch) {
        pageStatsBySlug[blogMatch[1]] = { visitors: ps.unique_visitors, views: ps.total_views };
      }
    });
    return blogPosts
      .map((post) => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        category: post.category,
        shares: sharesByPost[post.id] || 0,
        visitors: pageStatsBySlug[post.slug]?.visitors || 0,
        views: pageStatsBySlug[post.slug]?.views || 0,
      }))
      .filter((p) => p.shares > 0 || p.visitors > 0)
      .sort((a, b) => b.views - a.views || b.shares - a.shares);
  }, [blogPosts, contentShares, pageStats]);

  const periodLabel = PERIOD_OPTIONS.find(p => p.days === selectedPeriod)?.label || "30d";
  const hasData = totalVisitors > 0 || totalPageViews > 0 || totalLeads > 0;

  const TrendBadge = ({ value, suffix = "vs vorige periode" }: { value: number; suffix?: string }) => {
    const isPositive = value >= 0;
    return (
      <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
        <span>{value > 0 ? "+" : ""}{value}% {suffix}</span>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Impact Banner */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  {hasData
                    ? `Jouw impact ${selectedPeriod > 0 ? `(${periodLabel})` : ""}`
                    : "Welkom bij Analytics"}
                </h2>
                {hasData ? (
                  <p className="text-muted-foreground mt-1">
                    <span className="font-semibold text-foreground">{totalVisitors}</span> bezoekers hebben{" "}
                    <span className="font-semibold text-foreground">{totalPageViews}</span> pagina's bekeken
                    {totalLeads > 0 && (
                      <>, waarvan <span className="font-semibold text-foreground">{totalLeads}</span> leads</>
                    )}
                  </p>
                ) : (
                  <p className="text-muted-foreground mt-1">
                    Deel je eerste artikel om hier resultaten te zien
                  </p>
                )}
                {hasData && selectedPeriod > 0 && visitorTrend !== 0 && (
                  <TrendBadge value={visitorTrend} suffix="meer bezoekers dan vorige periode" />
                )}
              </div>
            </div>
            {/* Period Selector */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              {PERIOD_OPTIONS.map((option) => (
                <Button
                  key={option.days}
                  variant={selectedPeriod === option.days ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedPeriod(option.days)}
                  className="text-xs px-3"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Bezoekers
            </CardDescription>
            <CardTitle className="text-2xl sm:text-3xl">{totalVisitors}</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedPeriod > 0 ? (
              <TrendBadge value={visitorTrend} />
            ) : (
              <div className="text-sm text-muted-foreground">Totaal alle tijd</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <MousePointer className="h-4 w-4" />
              Pageviews
            </CardDescription>
            <CardTitle className="text-2xl sm:text-3xl">{totalPageViews}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Gem. {totalVisitors > 0 ? (totalPageViews / totalVisitors).toFixed(1) : 0} per bezoeker
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Leads
            </CardDescription>
            <CardTitle className="text-2xl sm:text-3xl">{totalLeads}</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedPeriod > 0 ? (
              <TrendBadge value={leadTrend} />
            ) : (
              <div className="text-sm text-muted-foreground">Via jouw referral link</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Conversie
            </CardDescription>
            <CardTitle className="text-2xl sm:text-3xl">{conversionRate}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Bezoeker → lead
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chatbot Conversations */}
      {totalChats > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                💬 Chatbot gesprekken
              </CardDescription>
              <CardTitle className="text-2xl sm:text-3xl">{totalChats}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Via jouw doorverwezen bezoekers</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">🎯 Geconverteerd</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl">{convertedChats}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Gesprekken → leads</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Chat conversie
              </CardDescription>
              <CardTitle className="text-2xl sm:text-3xl">{chatConversionRate}%</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Gesprek naar lead</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bezoekers & Leads ({chartDays} dagen)</CardTitle>
            <CardDescription>Dagelijks overzicht van je referral traffic</CardDescription>
          </CardHeader>
          <CardContent>
            {referralsLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="bezoekers" fill="hsl(var(--primary))" name="Bezoekers" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="leads" fill="hsl(var(--chart-2))" name="Leads" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maandelijkse trend</CardTitle>
            <CardDescription>Groei over de laatste 6 maanden</CardDescription>
          </CardHeader>
          <CardContent>
            {referralsLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line type="monotone" dataKey="bezoekers" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} name="Bezoekers" />
                  <Line type="monotone" dataKey="leads" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ fill: "hsl(var(--chart-2))" }} name="Leads" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Populairste Pagina's */}
      {(pageStats?.length || 0) > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Populairste Pagina's
            </CardTitle>
            <CardDescription>Welke pagina's jouw bezoekers het meest bekijken</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 pr-4 font-medium text-muted-foreground">Pagina</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground w-28">Bezoekers</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground w-24">Views</th>
                  </tr>
                </thead>
                <tbody>
                  {pageStats?.slice(0, 15).map((stat) => (
                    <tr key={stat.path} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <div className="flex flex-col">
                          <span className="font-medium">{readablePath(stat.path)}</span>
                          {readablePath(stat.path) !== stat.path && (
                            <span className="font-mono text-xs text-muted-foreground">{stat.path}</span>
                          )}
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {stat.unique_visitors}
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        {stat.total_views}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : !pageStatsLoading && hasData ? null : !pageStatsLoading ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Nog geen paginastatistieken</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Deel artikelen via de Content Hub om te zien welke pagina's jouw bezoekers bekijken.
            </p>
            <Button variant="outline" onClick={() => navigate("/partner/content")}>
              Ga naar Content Hub
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Content Performance */}
      {contentPerformance.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Content Prestaties
            </CardTitle>
            <CardDescription>Overzicht van je gedeelde artikelen en hun resultaten</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 pr-4 font-medium text-muted-foreground">Artikel</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground w-24">Shares</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground w-28">Bezoekers</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground w-24">Views</th>
                  </tr>
                </thead>
                <tbody>
                  {contentPerformance.map((item, idx) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          {idx === 0 && (item.views > 0 || item.shares > 0) && (
                            <Trophy className="h-4 w-4 text-amber-500 flex-shrink-0" />
                          )}
                          <span className="line-clamp-1 font-medium">{item.title}</span>
                        </div>
                        <Badge variant="secondary" className="mt-1 text-xs">{item.category}</Badge>
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <Share2 className="h-3 w-3 text-muted-foreground" />
                          {item.shares}
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {item.visitors}
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">{item.views}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : !hasData ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Nog geen content gedeeld</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Begin met het delen van artikelen om te zien hoe ze presteren.
            </p>
            <Button variant="outline" onClick={() => navigate("/partner/content")}>
              Ontdek de Content Hub
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Referral Link Info */}
      <Card>
        <CardHeader>
          <CardTitle>Jouw Referral Link</CardTitle>
          <CardDescription>Deel deze link om bezoekers te tracken</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg font-mono text-sm break-all">
            {partner?.slug 
              ? `${window.location.origin}/?partner=${partner.slug}`
              : partner?.referral_code 
                ? `${window.location.origin}/?partner=${partner.referral_code}`
                : "Geen referral code beschikbaar"
            }
          </div>
          
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3">Hoe werkt de tracking?</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">1.</span>
                <span>Wanneer iemand via jouw link binnenkomt, wordt de koppeling opgeslagen in de browser van de bezoeker.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">2.</span>
                <span>Alle pagina's die de bezoeker daarna bekijkt worden automatisch aan jou gekoppeld.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">3.</span>
                <span>Als de bezoeker later terugkomt — ook zonder de link — blijft de koppeling actief.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">4.</span>
                <span>Een klein bannertje toont aan de bezoeker dat ze via jouw bedrijf zijn binnengekomen.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">5.</span>
                <span>Leads die via jouw bezoekers binnenkomen verschijnen automatisch in je dashboard.</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
