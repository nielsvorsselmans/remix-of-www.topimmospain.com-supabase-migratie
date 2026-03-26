import { FileText, Calendar, CheckCircle, BarChart3, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSocialPosts, useSocialPostCounts } from "@/hooks/useSocialPosts";
import { useRefreshPostEngagement } from "@/hooks/useGHLSocialStats";
import { SocialPostsTable } from "@/components/admin/SocialPostsTable";
import { SocialStatsOverview } from "@/components/admin/SocialStatsOverview";
import { useSearchParams } from "react-router-dom";

export default function SocialPosts() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "drafts";
  const { data: counts } = useSocialPostCounts();
  const { data: drafts, isLoading: loadingDrafts } = useSocialPosts('draft');
  const { data: scheduled, isLoading: loadingScheduled } = useSocialPosts('scheduled');
  const { data: published, isLoading: loadingPublished } = useSocialPosts('published');
  const refreshEngagement = useRefreshPostEngagement();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Social Posts</h1>
          <p className="text-muted-foreground">
            Beheer je social media posts - concepten, ingeplande en gepubliceerde content.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refreshEngagement.mutate()}
          disabled={refreshEngagement.isPending}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshEngagement.isPending ? 'animate-spin' : ''}`} />
          Ververs statistieken
        </Button>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="drafts" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Concepten
            {counts?.draft ? (
              <Badge variant="secondary" className="ml-1">
                {counts.draft}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Ingepland
            {counts?.scheduled ? (
              <Badge variant="secondary" className="ml-1">
                {counts.scheduled}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="published" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Gepubliceerd
            {counts?.published ? (
              <Badge variant="secondary" className="ml-1">
                {counts.published}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Statistieken
          </TabsTrigger>
        </TabsList>

        <TabsContent value="drafts">
          <div className="bg-card rounded-lg border">
            <SocialPostsTable 
              posts={drafts || []} 
              status="draft" 
              isLoading={loadingDrafts} 
            />
          </div>
        </TabsContent>

        <TabsContent value="scheduled">
          <div className="bg-card rounded-lg border">
            <SocialPostsTable 
              posts={scheduled || []} 
              status="scheduled" 
              isLoading={loadingScheduled}
              showEngagement
            />
          </div>
        </TabsContent>

        <TabsContent value="published">
          <div className="bg-card rounded-lg border">
            <SocialPostsTable 
              posts={published || []} 
              status="published" 
              isLoading={loadingPublished}
              showEngagement
            />
          </div>
        </TabsContent>

        <TabsContent value="stats">
          <SocialStatsOverview posts={published || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
