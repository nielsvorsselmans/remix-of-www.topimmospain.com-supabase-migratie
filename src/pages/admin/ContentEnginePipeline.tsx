import { useState, useMemo } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Search, Linkedin, Facebook, Instagram, Edit, Trash2, Calendar, Eye, BarChart3, ParkingCircle, RotateCcw, Archive } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSocialPosts, useDeleteSocialPost, useUpdateSocialPost, SocialPost } from "@/hooks/useSocialPosts";
import { SocialPostEditDialog } from "@/components/admin/SocialPostEditDialog";
import { GHLScheduler } from "@/components/admin/GHLScheduler";
import { PostPerformanceDialog } from "@/components/admin/PostPerformanceDialog";
import { toast } from "sonner";

const statusConfig = {
  draft: { label: "Concept", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: "🟡" },
  parked: { label: "Geparkeerd", color: "bg-blue-100 text-blue-800 border-blue-200", icon: "🔵" },
  scheduled: { label: "Ingepland", color: "bg-orange-100 text-orange-800 border-orange-200", icon: "🟠" },
  published: { label: "Gepubliceerd", color: "bg-green-100 text-green-800 border-green-200", icon: "🟢" },
};

const platformIcons = { linkedin: Linkedin, facebook: Facebook, instagram: Instagram };

export default function ContentEnginePipeline() {
  const { data: allPosts, isLoading } = useSocialPosts();
  const deletePost = useDeleteSocialPost();
  const updatePost = useUpdateSocialPost();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [articleFilter, setArticleFilter] = useState<string>("all");

  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [schedulingPost, setSchedulingPost] = useState<SocialPost | null>(null);
  const [viewingPost, setViewingPost] = useState<SocialPost | null>(null);
  const [performancePost, setPerformancePost] = useState<SocialPost | null>(null);

  // Get unique blog titles for article filter
  const articleOptions = useMemo(() => {
    if (!allPosts) return [];
    const titles = new Set<string>();
    allPosts.forEach(p => {
      if (p.blog_post_title) titles.add(p.blog_post_title);
    });
    return Array.from(titles).sort();
  }, [allPosts]);

  // Filter posts
  const filteredPosts = useMemo(() => {
    if (!allPosts) return [];
    return allPosts.filter(post => {
      if (search && !post.content.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "all" && post.status !== statusFilter) return false;
      if (platformFilter !== "all" && post.platform !== platformFilter) return false;
      if (articleFilter !== "all" && post.blog_post_title !== articleFilter) return false;
      return true;
    });
  }, [allPosts, search, statusFilter, platformFilter, articleFilter]);

  const statusCounts = useMemo(() => {
    if (!allPosts) return { draft: 0, parked: 0, scheduled: 0, published: 0 };
    return {
      draft: allPosts.filter(p => p.status === "draft").length,
      parked: allPosts.filter(p => p.status === "parked").length,
      scheduled: allPosts.filter(p => p.status === "scheduled").length,
      published: allPosts.filter(p => p.status === "published").length,
    };
  }, [allPosts]);

  const handleDelete = async (postId: string) => {
    try {
      await deletePost.mutateAsync(postId);
      toast.success("Post verwijderd");
    } catch {
      toast.error("Fout bij verwijderen");
    }
  };

  const handleStatusChange = async (postId: string, newStatus: string) => {
    try {
      await updatePost.mutateAsync({ postId, updates: { status: newStatus as any } });
      toast.success(newStatus === "parked" ? "Post geparkeerd" : "Status bijgewerkt");
    } catch {
      toast.error("Fout bij bijwerken");
    }
  };

  const truncate = (text: string, max = 100) =>
    text.length <= max ? text : text.substring(0, max) + "...";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Content Pipeline</h1>
          <p className="text-muted-foreground">
            Alle social posts op één plek — zoek, filter en beheer je content.
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {allPosts?.length || 0} posts
        </Badge>
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("all")}
        >
          Alles ({allPosts?.length || 0})
        </Button>
        {(Object.entries(statusConfig) as [string, typeof statusConfig.draft][]).map(([key, cfg]) => (
          <Button
            key={key}
            variant={statusFilter === key ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(key)}
          >
            {cfg.icon} {cfg.label} ({statusCounts[key as keyof typeof statusCounts]})
          </Button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek op tekst..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle platforms</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
          </SelectContent>
        </Select>
        {articleOptions.length > 0 && (
          <Select value={articleFilter} onValueChange={setArticleFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Artikel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle artikelen</SelectItem>
              {articleOptions.map(title => (
                <SelectItem key={title} value={title}>
                  {title.length > 30 ? title.substring(0, 30) + "..." : title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Table */}
      {filteredPosts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Archive className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>Geen posts gevonden</p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[100px]">Platform</TableHead>
                <TableHead>Content</TableHead>
                <TableHead className="w-[160px] hidden md:table-cell">Artikel</TableHead>
                <TableHead className="w-[100px] hidden sm:table-cell">Datum</TableHead>
                <TableHead className="w-[140px] text-right">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPosts.map((post) => {
                const cfg = statusConfig[post.status as keyof typeof statusConfig] || statusConfig.draft;
                const PlatformIcon = platformIcons[post.platform as keyof typeof platformIcons];

                return (
                  <TableRow key={post.id}>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${cfg.color}`}>
                        {cfg.icon} {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {PlatformIcon && <PlatformIcon className="h-4 w-4 text-muted-foreground" />}
                        <span className="text-xs capitalize">{post.platform}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground leading-snug">
                        {truncate(post.content)}
                      </p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {post.blog_post_title ? (
                        <Badge variant="outline" className="text-xs font-normal">
                          {post.blog_post_title.length > 25
                            ? post.blog_post_title.substring(0, 25) + "..."
                            : post.blog_post_title}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(post.created_at), "d MMM", { locale: nl })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        {/* Draft actions */}
                        {post.status === "draft" && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => setEditingPost(post)} title="Bewerken">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleStatusChange(post.id, "parked")} title="Parkeren">
                              <ParkingCircle className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setSchedulingPost(post)} title="Inplannen">
                              <Calendar className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {/* Parked actions */}
                        {post.status === "parked" && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => setEditingPost(post)} title="Bewerken">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleStatusChange(post.id, "draft")} title="Terugzetten als concept">
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setSchedulingPost(post)} title="Inplannen">
                              <Calendar className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {/* Scheduled actions */}
                        {post.status === "scheduled" && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => setViewingPost(post)} title="Bekijken">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleStatusChange(post.id, "draft")} title="Annuleren">
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {/* Published actions */}
                        {post.status === "published" && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => setViewingPost(post)} title="Bekijken">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setPerformancePost(post)} title="Performance">
                              <BarChart3 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {/* Delete for draft/parked */}
                        {(post.status === "draft" || post.status === "parked") && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="Verwijderen">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Post verwijderen?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Deze actie kan niet ongedaan worden gemaakt.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuleren</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(post.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Verwijderen
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialogs */}
      <SocialPostEditDialog
        post={editingPost}
        open={!!editingPost}
        onOpenChange={(open) => !open && setEditingPost(null)}
      />

      <Dialog open={!!schedulingPost} onOpenChange={(open) => !open && setSchedulingPost(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post Inplannen</DialogTitle>
          </DialogHeader>
          {schedulingPost && (
            <GHLScheduler
              content={schedulingPost.content}
              platform={schedulingPost.platform}
              existingPostId={schedulingPost.id}
              showPhotoSelector
              initialPhotoId={schedulingPost.photo_id}
              initialPhotoUrl={schedulingPost.photo_url}
              onScheduled={() => setSchedulingPost(null)}
              onClose={() => setSchedulingPost(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingPost} onOpenChange={(open) => !open && setViewingPost(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Post bekijken</DialogTitle>
          </DialogHeader>
          {viewingPost && (
            <div className="whitespace-pre-wrap text-sm">{viewingPost.content}</div>
          )}
        </DialogContent>
      </Dialog>

      {performancePost && (
        <PostPerformanceDialog
          post={performancePost}
          avgEngagementRate={0}
          open={!!performancePost}
          onOpenChange={(open) => !open && setPerformancePost(null)}
        />
      )}
    </div>
  );
}
