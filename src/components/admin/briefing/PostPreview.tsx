import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Copy, RefreshCw, Edit2, Sparkles, Target, CalendarDays, X, Save, FileText, ImageDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { GHLSchedulerSheet } from "../GHLSchedulerSheet";
import { ProjectPhotosDownloader } from "./ProjectPhotosDownloader";
import { supabase } from "@/integrations/supabase/client";

export interface PolishedPost {
  id: string;
  variation: "variation1" | "variation2";
  hookKey: string;
  hookText: string;
  polishedText: string;
  triggerWord: string;
  savedAsDraft?: boolean;
  scheduledStatus?: "published" | "scheduled" | "draft";
}

interface PostPreviewProps {
  polishedPosts: PolishedPost[];
  project: {
    id?: string;
    name: string;
    city: string;
    featuredImage: string;
    images?: string[];
  };
  onRegenerate: () => void;
  onBackToHooks?: () => void;
  onBackToStrategy?: () => void;
  isRegenerating?: boolean;
  onUpdatePost?: (postId: string, updates: Partial<PolishedPost>) => void;
}

const HOOK_LABELS: Record<string, string> = {
  patternInterrupt: "Pattern Interrupt",
  specificityHook: "Specificity",
  velvetRope: "Velvet Rope",
  contrarian: "Contrarian",
  imaginationOrBenefit: "Imagination",
};

export function PostPreview({
  polishedPosts,
  project,
  onRegenerate,
  onBackToHooks,
  onBackToStrategy,
  isRegenerating = false,
  onUpdatePost,
}: PostPreviewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [schedulingPost, setSchedulingPost] = useState<PolishedPost | null>(null);
  const [schedulingDraftId, setSchedulingDraftId] = useState<string | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, PolishedPost["scheduledStatus"]>>({});
  const [isSavingDraft, setIsSavingDraft] = useState<string | null>(null);
  const [showPhotosDownloader, setShowPhotosDownloader] = useState(false);

  const hasPhotos = (project.images && project.images.length > 0) || project.featuredImage;

  const copyToClipboard = async (post: PolishedPost) => {
    const content = editedContent[post.id] || post.polishedText;
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(post.id);
      toast.success("Post gekopieerd naar klembord!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast.error("Kon niet kopiëren naar klembord");
    }
  };

  const handleStartEdit = (post: PolishedPost) => {
    setEditedContent(prev => ({ ...prev, [post.id]: post.polishedText }));
    setEditingId(post.id);
  };

  const handleSaveEdit = (postId: string) => {
    setEditingId(null);
    toast.success("Wijzigingen opgeslagen");
  };

  const handleCancelEdit = (postId: string) => {
    const post = polishedPosts.find(p => p.id === postId);
    if (post) {
      setEditedContent(prev => ({ ...prev, [postId]: post.polishedText }));
    }
    setEditingId(null);
  };

  const handleSaveAsDraft = async (post: PolishedPost) => {
    if (!project.id) {
      toast.error("Project ID ontbreekt");
      return;
    }

    setIsSavingDraft(post.id);
    try {
      const content = editedContent[post.id] || post.polishedText;
      
      const { error } = await supabase
        .from('social_posts')
        .insert({
          project_id: project.id,
          content: content,
          platform: 'linkedin',
          status: 'draft',
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      setLocalStatuses(prev => ({ ...prev, [post.id]: "draft" }));
      onUpdatePost?.(post.id, { savedAsDraft: true, scheduledStatus: "draft" });
      toast.success("Post opgeslagen als concept");
    } catch (error) {
      console.error("Save draft error:", error);
      toast.error("Kon post niet opslaan als concept");
    } finally {
      setIsSavingDraft(null);
    }
  };

  const handleScheduled = (postId: string, status: "published" | "scheduled" | "draft") => {
    setLocalStatuses(prev => ({ ...prev, [postId]: status }));
    onUpdatePost?.(postId, { scheduledStatus: status });
    setSchedulingPost(null);
    setSchedulingDraftId(null);
  };

  const handleOpenScheduler = async (post: PolishedPost) => {
    if (!project.id) {
      toast.error("Project ID ontbreekt");
      return;
    }
    const content = editedContent[post.id] || post.polishedText;
    // Create a social_posts draft first so we always have an existingPostId
    try {
      const { data, error } = await supabase
        .from('social_posts')
        .insert({
          project_id: project.id,
          content,
          platform: 'linkedin',
          status: 'draft',
        })
        .select('id')
        .single();
      if (error) throw error;
      setSchedulingDraftId(data.id);
      setSchedulingPost(post);
    } catch (err) {
      console.error("Failed to create draft for scheduling:", err);
      toast.error("Kon geen concept aanmaken voor inplannen");
    }
  };

  const getStatusBadge = (post: PolishedPost) => {
    const status = localStatuses[post.id] || post.scheduledStatus;
    if (!status) return null;

    const variants: Record<string, { label: string; className: string }> = {
      published: { label: "Gepubliceerd", className: "bg-green-100 text-green-800" },
      scheduled: { label: "Ingepland", className: "bg-blue-100 text-blue-800" },
      draft: { label: "Concept", className: "bg-gray-100 text-gray-800" },
    };

    const variant = variants[status];
    return (
      <Badge variant="secondary" className={`text-xs ${variant.className}`}>
        {variant.label}
      </Badge>
    );
  };

  const renderPost = (post: PolishedPost) => {
    const isEditing = editingId === post.id;
    const currentContent = editedContent[post.id] || post.polishedText;
    const status = localStatuses[post.id] || post.scheduledStatus;
    const hookLabel = HOOK_LABELS[post.hookKey] || post.hookKey;
    const variationLabel = post.variation === "variation1" ? "V1" : "V2";

    return (
      <Card key={post.id} className="overflow-hidden">
        <CardHeader className="py-3 px-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {variationLabel}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {hookLabel}
              </Badge>
              {getStatusBadge(post)}
            </div>
            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
              ✨ Gepolijst
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {isEditing ? (
            <div className="space-y-3">
              <Textarea
                value={currentContent}
                onChange={(e) => setEditedContent(prev => ({ ...prev, [post.id]: e.target.value }))}
                className="min-h-[250px] font-sans text-sm leading-relaxed"
                placeholder="Bewerk je post..."
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCancelEdit(post.id)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Annuleren
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSaveEdit(post.id)}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Opslaan
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-background border rounded-lg p-3 max-h-[200px] overflow-y-auto">
                <p className="text-foreground whitespace-pre-wrap leading-relaxed text-sm">
                  {currentContent}
                </p>
              </div>

              {/* Trigger Word */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Trigger woord:</span>
                <Badge variant="secondary" className="font-mono text-xs">
                  {post.triggerWord}
                </Badge>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStartEdit(post)}
                  disabled={!!status}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Bewerken
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(post)}
                >
                  {copiedId === post.id ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Gekopieerd!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Kopieer
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSaveAsDraft(post)}
                  disabled={!!status || isSavingDraft === post.id}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {isSavingDraft === post.id ? "Opslaan..." : "Concept"}
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleOpenScheduler(post)}
                  disabled={!!status}
                >
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Inplannen
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  // Group posts by variation
  const v1Posts = polishedPosts.filter(p => p.variation === "variation1");
  const v2Posts = polishedPosts.filter(p => p.variation === "variation2");

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Edit2 className="h-5 w-5" />
                Gegenereerde Posts
              </CardTitle>
              <CardDescription>
                {polishedPosts.length} post{polishedPosts.length !== 1 ? "s" : ""} voor {project.name}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {onBackToHooks && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBackToHooks}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Hooks wijzigen
                </Button>
              )}
              {onBackToStrategy && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBackToStrategy}
                >
                  <Target className="h-4 w-4 mr-2" />
                  Strategie
                </Button>
              )}
              {hasPhotos && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPhotosDownloader(true)}
                >
                  <ImageDown className="h-4 w-4 mr-2" />
                  Foto's
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={onRegenerate}
                disabled={isRegenerating}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? "animate-spin" : ""}`} />
                Regenereer
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-6">
              {/* Variation 1 Posts */}
              {v1Posts.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Badge variant="outline">Variatie 1</Badge>
                    <span>{v1Posts.length} post{v1Posts.length !== 1 ? "s" : ""}</span>
                  </h3>
                  <div className="space-y-4">
                    {v1Posts.map(renderPost)}
                  </div>
                </div>
              )}

              {/* Variation 2 Posts */}
              {v2Posts.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Badge variant="outline">Variatie 2</Badge>
                    <span>{v2Posts.length} post{v2Posts.length !== 1 ? "s" : ""}</span>
                  </h3>
                  <div className="space-y-4">
                    {v2Posts.map(renderPost)}
                  </div>
                </div>
              )}

              {polishedPosts.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Geen posts gegenereerd</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* GHL Scheduler Sheet */}
      {schedulingPost && schedulingDraftId && (
        <GHLSchedulerSheet
          isOpen={true}
          onClose={() => { setSchedulingPost(null); setSchedulingDraftId(null); }}
          content={editedContent[schedulingPost.id] || schedulingPost.polishedText}
          triggerWord={schedulingPost.triggerWord}
          projectId={project.id}
          existingPostId={schedulingDraftId}
          description={`${project.name} - Publiceer via GoHighLevel`}
          platform="linkedin"
          onScheduled={(status) => handleScheduled(schedulingPost.id, status)}
        />
      )}

      {/* Photos Downloader Sheet */}
      <ProjectPhotosDownloader
        isOpen={showPhotosDownloader}
        onClose={() => setShowPhotosDownloader(false)}
        projectName={project.name}
        images={project.images || []}
        featuredImage={project.featuredImage}
      />
    </>
  );
}
