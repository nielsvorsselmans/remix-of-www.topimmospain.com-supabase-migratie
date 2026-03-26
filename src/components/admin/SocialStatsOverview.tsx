import { useMemo } from "react";
import { Heart, MessageCircle, Eye, Users, TrendingUp, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SocialPost } from "@/hooks/useSocialPosts";
import { usePostGenerationsWithEngagement, PostGenerationWithEngagement } from "@/hooks/usePostGenerations";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";
import { format, parseISO, startOfWeek } from "date-fns";
import { nl } from "date-fns/locale";

interface SocialStatsOverviewProps {
  posts: SocialPost[];
}

function engagementRate(likes: number, comments: number, impressions: number): number {
  if (impressions === 0) return 0;
  return (likes + comments) / impressions * 100;
}

export function SocialStatsOverview({ posts }: SocialStatsOverviewProps) {
  const { data: generations, isLoading: loadingGenerations } = usePostGenerationsWithEngagement();

  // Aggregate totals
  const totals = posts.reduce(
    (acc, post) => {
      acc.likes += post.likes || 0;
      acc.comments += post.comments || 0;
      acc.impressions += post.impressions || 0;
      acc.reach += post.reach || 0;
      return acc;
    },
    { likes: 0, comments: 0, impressions: 0, reach: 0 }
  );

  const avgEngagement = engagementRate(totals.likes, totals.comments, totals.impressions);
  const hasData = totals.likes > 0 || totals.comments > 0 || totals.impressions > 0;

  // Trend data: engagement rate per week
  const trendData = useMemo(() => {
    if (!posts || posts.length === 0) return [];
    const weekMap = new Map<string, { likes: number; comments: number; impressions: number; count: number }>();
    
    for (const post of posts) {
      if (!post.impressions) continue;
      const weekStart = format(startOfWeek(parseISO(post.created_at), { weekStartsOn: 1 }), "yyyy-MM-dd");
      const existing = weekMap.get(weekStart) || { likes: 0, comments: 0, impressions: 0, count: 0 };
      existing.likes += post.likes || 0;
      existing.comments += post.comments || 0;
      existing.impressions += post.impressions || 0;
      existing.count += 1;
      weekMap.set(weekStart, existing);
    }

    return Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, data]) => ({
        week: format(parseISO(week), "d MMM", { locale: nl }),
        rate: Number(engagementRate(data.likes, data.comments, data.impressions).toFixed(1)),
        posts: data.count,
      }));
  }, [posts]);

  // Archetype performance from generations
  const archetypeData = useMemo(() => {
    if (!generations || generations.length === 0) return [];
    const archetypeMap = new Map<string, { totalRate: number; count: number }>();

    for (const gen of generations) {
      const archetype = (gen.briefing_snapshot as any)?.archetype || "onbekend";
      const rate = engagementRate(gen.likes, gen.comments, gen.impressions);
      const existing = archetypeMap.get(archetype) || { totalRate: 0, count: 0 };
      existing.totalRate += rate;
      existing.count += 1;
      archetypeMap.set(archetype, existing);
    }

    return Array.from(archetypeMap.entries())
      .map(([archetype, data]) => ({
        archetype,
        avgRate: Number((data.totalRate / data.count).toFixed(1)),
        count: data.count,
      }))
      .sort((a, b) => b.avgRate - a.avgRate);
  }, [generations]);

  // Top hooks from generations
  const topHooks = useMemo(() => {
    if (!generations || generations.length === 0) return [];
    return generations
      .filter((g) => g.impressions > 0)
      .map((g) => ({
        hook: (g.briefing_snapshot as any)?.selected_hook || g.post_content?.split("\n")[0] || "—",
        archetype: (g.briefing_snapshot as any)?.archetype || "—",
        rate: engagementRate(g.likes, g.comments, g.impressions),
        likes: g.likes,
        comments: g.comments,
        impressions: g.impressions,
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 10);
  }, [generations]);

  const stats = [
    { label: "Likes", value: totals.likes, icon: Heart, color: "text-red-500" },
    { label: "Reacties", value: totals.comments, icon: MessageCircle, color: "text-blue-500" },
    { label: "Impressies", value: totals.impressions, icon: Eye, color: "text-amber-500" },
    { label: "Bereik", value: totals.reach, icon: Users, color: "text-green-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value.toLocaleString("nl-NL")}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Avg engagement card */}
      {hasData && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Gemiddelde Engagement Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgEngagement.toFixed(1)}%</div>
            <p className="text-sm text-muted-foreground mt-1">
              Over {posts.length} gepubliceerde post{posts.length !== 1 ? "s" : ""} · (likes + reacties) / impressies
            </p>
          </CardContent>
        </Card>
      )}

      {!hasData && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nog geen statistieken beschikbaar.</p>
          <p className="text-sm mt-1">
            Klik op "Ververs statistieken" om engagement data op te halen van je gepubliceerde posts.
          </p>
        </div>
      )}

      {/* Trend Chart */}
      {trendData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Engagement Trend (per week)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="week" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis unit="%" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  formatter={(value: number) => [`${value}%`, "Engagement Rate"]}
                />
                <Line type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Archetype Performance */}
      {archetypeData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Performance per Archetype
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={archetypeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="archetype" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis unit="%" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  formatter={(value: number, name: string) => [
                    name === "avgRate" ? `${value}%` : value,
                    name === "avgRate" ? "Gem. Engagement" : "Aantal posts",
                  ]}
                />
                <Bar dataKey="avgRate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
              {archetypeData.map((a) => (
                <span key={a.archetype}>
                  {a.archetype}: {a.count} post{a.count !== 1 ? "s" : ""}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Hooks Table */}
      {topHooks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Hooks (op engagement rate)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hook</TableHead>
                  <TableHead className="w-[100px]">Archetype</TableHead>
                  <TableHead className="w-[70px] text-right">Rate</TableHead>
                  <TableHead className="w-[60px] text-right">❤️</TableHead>
                  <TableHead className="w-[60px] text-right">💬</TableHead>
                  <TableHead className="w-[80px] text-right">👁️</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topHooks.map((hook, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm max-w-[300px] truncate" title={hook.hook}>
                      {hook.hook}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{hook.archetype}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{hook.rate.toFixed(1)}%</TableCell>
                    <TableCell className="text-right text-sm">{hook.likes}</TableCell>
                    <TableCell className="text-right text-sm">{hook.comments}</TableCell>
                    <TableCell className="text-right text-sm">{hook.impressions}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {loadingGenerations && archetypeData.length === 0 && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          Generatie-data laden...
        </div>
      )}
    </div>
  );
}
