import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { Linkedin, Facebook, Instagram, Trash2, Edit, Calendar, Eye, ExternalLink, ImageIcon, BarChart3, Heart, MessageCircle, Users, ParkingCircle, RotateCcw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SocialPost, SocialPostStatus, useDeleteSocialPost, useDuplicateToFacebook, useSyncToGHL } from "@/hooks/useSocialPosts";
import { SocialPostEditDialog } from "./SocialPostEditDialog";
import { GHLScheduler } from "./GHLScheduler";
import { NewsCardVisualDialog } from "./NewsCardVisualDialog";
import { PostPerformanceDialog } from "./PostPerformanceDialog";
import { toast } from "sonner";

const platformIcons = {
  linkedin: Linkedin,
  facebook: Facebook,
  instagram: Instagram,
};

const platformColors = {
  linkedin: "bg-blue-600",
  facebook: "bg-blue-500",
  instagram: "bg-gradient-to-r from-purple-500 to-pink-500",
};

interface SocialPostsTableProps {
  posts: SocialPost[];
  status: SocialPostStatus;
  isLoading?: boolean;
  showEngagement?: boolean;
}

export function SocialPostsTable({ posts, status, isLoading, showEngagement }: SocialPostsTableProps) {
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [schedulingPost, setSchedulingPost] = useState<SocialPost | null>(null);
  const [viewingPost, setViewingPost] = useState<SocialPost | null>(null);
  const [visualPost, setVisualPost] = useState<SocialPost | null>(null);
  const [performancePost, setPerformancePost] = useState<SocialPost | null>(null);
  const deletePost = useDeleteSocialPost();
  const duplicateToFb = useDuplicateToFacebook();
  const syncToGHL = useSyncToGHL();

  const handleDuplicateToFacebook = async (post: SocialPost) => {
    try {
      const result = await duplicateToFb.mutateAsync(post);
      const hasLink = !!post.blog_post_id;
      toast.success(hasLink 
        ? "Facebook-concept aangemaakt met bloglink" 
        : "Facebook-concept aangemaakt (zonder bloglink)");
      // Open scheduler for the new Facebook draft, preserving blog link
      setSchedulingPost({
        ...post,
        id: result.id,
        platform: 'facebook',
        status: 'draft',
      });
    } catch {
      toast.error("Fout bij aanmaken Facebook-concept");
    }
  };

  // Calculate avg engagement rate for comparison in dialog
  const avgEngagementRate = (() => {
    if (!showEngagement || posts.length === 0) return 0;
    const totalImpressions = posts.reduce((s, p) => s + (p.impressions || 0), 0);
    const totalEngagement = posts.reduce((s, p) => s + (p.likes || 0) + (p.comments || 0), 0);
    return totalImpressions > 0 ? (totalEngagement / totalImpressions * 100) : 0;
  })();

  const handleDelete = async (postId: string) => {
    try {
      await deletePost.mutateAsync(postId);
      toast.success("Post verwijderd");
    } catch {
      toast.error("Fout bij verwijderen");
    }
  };

  const truncateContent = (content: string, maxLength = 80) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Geen posts gevonden</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Platform</TableHead>
            <TableHead>Content</TableHead>
            <TableHead className="w-[150px] hidden sm:table-cell">Project</TableHead>
            <TableHead className="w-[150px] hidden sm:table-cell">
              {status === 'scheduled' ? 'Gepland voor' : 'Aangemaakt'}
            </TableHead>
            {showEngagement && (
              <>
                <TableHead className="w-[70px] text-right hidden md:table-cell">Likes</TableHead>
                <TableHead className="w-[70px] text-right hidden md:table-cell">Reacties</TableHead>
                <TableHead className="w-[90px] text-right hidden md:table-cell">Impressies</TableHead>
              </>
            )}
            <TableHead className="w-[120px] text-right">Acties</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.map((post) => {
            const PlatformIcon = platformIcons[post.platform];
            const dateToShow = status === 'scheduled' && post.scheduled_for 
              ? post.scheduled_for 
              : post.created_at;

            return (
              <TableRow key={post.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded text-white ${platformColors[post.platform]}`}>
                      <PlatformIcon className="h-4 w-4" />
                    </div>
                    <span className="text-sm capitalize">{post.platform}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-sm text-muted-foreground">
                    {truncateContent(post.content)}
                  </p>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {post.project_name ? (
                    <Badge variant="outline" className="text-xs">
                      {post.project_name}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(dateToShow), "d MMM yyyy HH:mm", { locale: nl })}
                  </span>
                </TableCell>
                {showEngagement && (
                  <>
                    <TableCell className="text-right hidden md:table-cell">
                      <span className="text-sm">{post.likes || 0}</span>
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell">
                      <span className="text-sm">{post.comments || 0}</span>
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell">
                      <span className="text-sm">{post.impressions || 0}</span>
                    </TableCell>
                  </>
                )}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {(status === 'draft' || status === 'parked') && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingPost(post)}
                          title="Bewerken"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setVisualPost(post)}
                            title="Visual maken"
                          >
                            <ImageIcon className="h-4 w-4" />
                          </Button>
                        )}
                        {post.platform === 'linkedin' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDuplicateToFacebook(post)}
                            disabled={duplicateToFb.isPending}
                            title="Dupliceer naar Facebook"
                          >
                            <Facebook className="h-4 w-4 text-blue-500" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSchedulingPost(post)}
                          title="Inplannen"
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
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
                                Deze actie kan niet ongedaan worden gemaakt. De post wordt permanent verwijderd.
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
                      </>
                    )}
                    {(status === 'scheduled' || status === 'published') && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewingPost(post)}
                          title="Bekijken"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {status === 'scheduled' && post.platform === 'linkedin' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDuplicateToFacebook(post)}
                            disabled={duplicateToFb.isPending}
                            title="Dupliceer naar Facebook"
                          >
                            <Facebook className="h-4 w-4 text-blue-500" />
                          </Button>
                        )}
                        {status === 'published' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setPerformancePost(post)}
                            title="Performance bekijken"
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                        )}
                        {post.ghl_post_id && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={async () => {
                                try {
                                  await syncToGHL.mutateAsync(post);
                                  toast.success("Post gesynchroniseerd met GHL");
                                } catch {
                                  toast.error("Synchronisatie mislukt");
                                }
                              }}
                              disabled={syncToGHL.isPending}
                              title="Sync naar GHL"
                            >
                              <RotateCcw className={`h-4 w-4 ${syncToGHL.isPending ? 'animate-spin' : ''}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              title="Bekijk in GoHighLevel"
                            >
                              <a
                                href={`https://app.gohighlevel.com/posts/${post.ghl_post_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Edit Dialog */}
      <SocialPostEditDialog
        post={editingPost}
        open={!!editingPost}
        onOpenChange={(open) => !open && setEditingPost(null)}
      />

      {/* Schedule Dialog */}
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

      {/* View Dialog */}
      <Dialog open={!!viewingPost} onOpenChange={(open) => !open && setViewingPost(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewingPost && (
                <>
                  <div className={`p-1.5 rounded text-white ${platformColors[viewingPost.platform]}`}>
                    {(() => {
                      const Icon = platformIcons[viewingPost.platform];
                      return <Icon className="h-4 w-4" />;
                    })()}
                  </div>
                  <span className="capitalize">{viewingPost?.platform} Post</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewingPost && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="whitespace-pre-wrap text-sm">{viewingPost.content}</p>
              </div>

              {/* Engagement stats */}
              {(viewingPost.likes > 0 || viewingPost.comments > 0 || viewingPost.impressions > 0 || viewingPost.reach > 0) && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Engagement</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Likes", value: viewingPost.likes, icon: Heart, color: "text-red-500" },
                      { label: "Reacties", value: viewingPost.comments, icon: MessageCircle, color: "text-blue-500" },
                      { label: "Impressies", value: viewingPost.impressions, icon: Eye, color: "text-amber-500" },
                      { label: "Bereik", value: viewingPost.reach, icon: Users, color: "text-green-500" },
                    ].map((stat) => {
                      const Icon = stat.icon;
                      return (
                        <div key={stat.label} className="flex items-center gap-2 bg-muted/30 rounded-md p-2">
                          <Icon className={`h-3.5 w-3.5 ${stat.color}`} />
                          <div>
                            <p className="text-xs text-muted-foreground">{stat.label}</p>
                            <p className="text-sm font-medium">{stat.value.toLocaleString("nl-NL")}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {viewingPost.impressions > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Engagement rate: <span className="font-medium text-foreground">
                        {((viewingPost.likes + viewingPost.comments) / viewingPost.impressions * 100).toFixed(1)}%
                      </span>
                    </p>
                  )}
                  {viewingPost.engagement_updated_at && (
                    <p className="text-xs text-muted-foreground">
                      Laatst bijgewerkt: {formatDistanceToNow(new Date(viewingPost.engagement_updated_at), { addSuffix: true, locale: nl })}
                    </p>
                  )}
                </div>
              )}

              {/* Blog link indicator */}
              {viewingPost.blog_post_id && (
                <div className="flex items-center gap-2 bg-emerald-500/10 rounded-md p-2">
                  <ExternalLink className="h-3.5 w-3.5 text-emerald-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Gekoppeld blogartikel</p>
                    <p className="text-sm font-medium truncate">{viewingPost.blog_post_title || "Blogartikel"}</p>
                  </div>
                  {viewingPost.blog_post_title && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs shrink-0" asChild>
                      <a href={`/admin/blog`}>Bekijk</a>
                    </Button>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                {viewingPost.project_name && (
                  <Badge variant="outline">{viewingPost.project_name}</Badge>
                )}
                <span>
                  {viewingPost.status === 'scheduled' && viewingPost.scheduled_for
                    ? `Gepland: ${format(new Date(viewingPost.scheduled_for), "d MMM yyyy HH:mm", { locale: nl })}`
                    : `Aangemaakt: ${format(new Date(viewingPost.created_at), "d MMM yyyy HH:mm", { locale: nl })}`}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Visual Generator Dialog */}
      <NewsCardVisualDialog
        post={visualPost}
        open={!!visualPost}
        onOpenChange={(open) => !open && setVisualPost(null)}
      />

      {/* Performance Dialog */}
      <PostPerformanceDialog
        post={performancePost}
        open={!!performancePost}
        onOpenChange={(open) => !open && setPerformancePost(null)}
        avgEngagementRate={avgEngagementRate}
      />
    </>
  );
}
