import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Brain, TrendingUp, MessageSquare, Eye, Clock, Target, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

const getMostRead = (analytics: any[]) => {
  const counts: Record<string, { count: number; title: string }> = {};
  analytics.forEach(a => {
    const params = a.event_params as any;
    const slug = params?.blog_post_slug;
    const title = params?.blog_post_title;
    if (slug) {
      if (!counts[slug]) {
        counts[slug] = { count: 0, title: title || slug };
      }
      counts[slug].count++;
    }
  });
  return Object.entries(counts)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 5)
    .map(([slug, data]) => ({ slug, ...data }));
};

export default function BlogInsights() {
  const { data: insightsData, isLoading: loading } = useQuery({
    queryKey: ["admin-blog-insights"],
    queryFn: async () => {
      const [analyticsRes, feedbackRes, interestsRes] = await Promise.all([
        supabase
          .from('tracking_events')
          .select('*')
          .eq('event_name', 'blog_view')
          .order('occurred_at', { ascending: false })
          .limit(100),
        supabase
          .from('blog_feedback')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('blog_interest_analysis')
          .select('*')
          .order('last_analyzed_at', { ascending: false })
          .limit(20),
      ]);

      const analytics = analyticsRes.data || [];
      return {
        readingStats: {
          total_reads: analytics.length,
          avg_time: Math.round(
            analytics.reduce((sum, a) => {
              const timeSpent = typeof a.event_params === 'object' && a.event_params !== null 
                ? (a.event_params as any).time_spent_seconds || 0 
                : 0;
              return sum + timeSpent;
            }, 0) / (analytics.length || 1)
          ),
          completion_rate: '100',
          most_read: getMostRead(analytics),
        },
        feedbackList: feedbackRes.data || [],
        interestAnalysis: interestsRes.data || [],
      };
    },
  });

  const readingStats = insightsData?.readingStats || null;
  const feedbackList = insightsData?.feedbackList || [];
  const interestAnalysis = insightsData?.interestAnalysis || [];


  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Blog Insights</h1>
          <p className="text-muted-foreground">Zelflerende blog analytics en reader feedback</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Blog Insights</h1>
        <p className="text-muted-foreground">
          Zelflerende blog analytics en reader feedback
        </p>
      </div>

        {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totaal Gelezen</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{readingStats?.total_reads || 0}</div>
            <p className="text-xs text-muted-foreground">Laatste 100 sessies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gem. Leestijd</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor((readingStats?.avg_time || 0) / 60)}:{((readingStats?.avg_time || 0) % 60).toString().padStart(2, '0')}
            </div>
            <p className="text-xs text-muted-foreground">Minuten per artikel</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completie Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{readingStats?.completion_rate || 0}%</div>
            <p className="text-xs text-muted-foreground">Artikelen volledig gelezen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Feedback Items</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feedbackList.length}</div>
            <p className="text-xs text-muted-foreground">Van readers ontvangen</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="most-read" className="space-y-4">
        <TabsList>
          <TabsTrigger value="most-read">
            <BarChart className="w-4 h-4 mr-2" />
            Meest Gelezen
          </TabsTrigger>
          <TabsTrigger value="feedback">
            <MessageSquare className="w-4 h-4 mr-2" />
            Reader Feedback
          </TabsTrigger>
          <TabsTrigger value="interests">
            <Brain className="w-4 h-4 mr-2" />
            AI Interest Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="most-read" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Meest Gelezen Artikelen</CardTitle>
              <CardDescription>
                Populairste content op basis van reading analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {readingStats?.most_read?.map((article: any, index: number) => (
                  <div key={article.slug} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{article.title}</p>
                        <p className="text-sm text-muted-foreground">/{article.slug}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">{article.count} views</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Feedback</CardTitle>
              <CardDescription>
                Directe feedback van readers over content en gewenste topics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {feedbackList.map((feedback) => (
                    <div key={feedback.id} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          /{feedback.blog_post_slug}
                        </p>
                        {feedback.was_helpful !== null && (
                          <Badge variant={feedback.was_helpful ? "default" : "secondary"}>
                            {feedback.was_helpful ? "👍 Nuttig" : "👎 Niet nuttig"}
                          </Badge>
                        )}
                      </div>

                      {feedback.rating && (
                        <div className="flex items-center gap-1">
                          {"⭐".repeat(feedback.rating)}
                          <span className="text-sm text-muted-foreground ml-2">
                            {feedback.rating}/5
                          </span>
                        </div>
                      )}

                      {feedback.missing_info && (
                        <div className="bg-orange-50 p-3 rounded">
                          <p className="text-sm font-medium text-orange-900">Missende info:</p>
                          <p className="text-sm text-orange-800">{feedback.missing_info}</p>
                        </div>
                      )}

                      {feedback.suggested_topics && feedback.suggested_topics.length > 0 && (
                        <div className="bg-blue-50 p-3 rounded">
                          <p className="text-sm font-medium text-blue-900">Gewenste topics:</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {feedback.suggested_topics.map((topic: string, i: number) => (
                              <Badge key={i} variant="outline" className="bg-white">
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {feedback.comment && (
                        <p className="text-sm italic text-muted-foreground">
                          "{feedback.comment}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                AI Interest Analysis
              </CardTitle>
              <CardDescription>
                Automatisch gedetecteerde interesses en journey stages van readers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {interestAnalysis.map((analysis) => (
                    <div key={analysis.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {analysis.user_id ? 'Registered User' : 
                             analysis.crm_user_id ? 'CRM Lead' : 'Visitor'}
                          </span>
                        </div>
                        <Badge variant="outline">
                          <Target className="w-3 h-3 mr-1" />
                          {analysis.stage_in_journey}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-primary/5 p-3 rounded">
                          <p className="text-xs font-medium text-primary mb-2">Primary Interests</p>
                          <div className="flex flex-wrap gap-1">
                            {analysis.primary_interests?.map((interest: string, i: number) => (
                              <Badge key={i} className="text-xs">{interest}</Badge>
                            ))}
                          </div>
                        </div>

                        <div className="bg-secondary/50 p-3 rounded">
                          <p className="text-xs font-medium text-secondary-foreground mb-2">Secondary Interests</p>
                          <div className="flex flex-wrap gap-1">
                            {analysis.secondary_interests?.map((interest: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">{interest}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{analysis.total_articles_read} artikelen gelezen</span>
                        <span>•</span>
                        <span>{Math.floor(analysis.avg_time_per_article / 60)}m gem. leestijd</span>
                      </div>

                      {analysis.most_read_categories && analysis.most_read_categories.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {analysis.most_read_categories.slice(0, 3).map((cat: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {cat}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
