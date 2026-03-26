import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Save, Linkedin, ArrowLeft, Camera } from "lucide-react";
import { SocialPostPreview } from "./SocialPostPreview";
import { LinkedInPhotoSelector } from "./LinkedInPhotoSelector";
import { useMarkPhotoUsed, type LinkedInPhoto } from "@/hooks/usePhotoLibrary";
import { CharacterCounter, PLATFORM_LIMITS } from "./CharacterCounter";
import { LinkedInBriefingView, type LinkedInBriefing, type ApprovedBriefing } from "./LinkedInBriefingView";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateSocialPost } from "@/hooks/useSocialPosts";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface LinkedInPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blogPost: {
    id: string;
    title: string;
    intro?: string;
    summary?: string | null;
    meta_keywords?: string[] | null;
    slug: string;
  };
  existingPostId?: string | null;
  existingContent?: string | null;
}

type Phase = "idle" | "brainstorming" | "briefing" | "writing" | "editing";

export function LinkedInPostDialog({
  open,
  onOpenChange,
  blogPost,
  existingPostId,
  existingContent,
}: LinkedInPostDialogProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [briefing, setBriefing] = useState<LinkedInBriefing | null>(null);
  const [content, setContent] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [postId, setPostId] = useState<string | null>(existingPostId || null);
  const [selectedPhoto, setSelectedPhoto] = useState<LinkedInPhoto | null>(null);
  const updatePost = useUpdateSocialPost();
  const markPhotoUsed = useMarkPhotoUsed();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      if (existingContent) {
        const lines = existingContent.split("\n");
        const hashtagLine = lines.findIndex(l => l.trim().startsWith("#"));
        if (hashtagLine >= 0) {
          setContent(lines.slice(0, hashtagLine).join("\n").trim());
          setHashtags(lines[hashtagLine].split(/\s+/).filter(h => h.startsWith("#")));
        } else {
          setContent(existingContent);
          setHashtags([]);
        }
        setPostId(existingPostId || null);
        setPhase("editing");
        setBriefing(null);
      } else {
        setContent("");
        setHashtags([]);
        setPostId(null);
        setSelectedPhoto(null);
        setPhase("idle");
        setBriefing(null);
      }
    }
  }, [open, existingContent, existingPostId]);

  const startBrainstorm = async () => {
    setPhase("brainstorming");
    try {
      const { data, error } = await supabase.functions.invoke("generate-linkedin-post", {
        body: {
          step: "brainstorm",
          blog_post_id: blogPost.id,
          title: blogPost.title,
          intro: blogPost.intro,
          summary: blogPost.summary,
          keywords: blogPost.meta_keywords,
          slug: blogPost.slug,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setBriefing(data.briefing);
      setPhase("briefing");
      toast.success("Briefing gegenereerd!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Brainstorm mislukt");
      setPhase("idle");
    }
  };

  const writePost = async (approved: ApprovedBriefing) => {
    setPhase("writing");
    try {
      const { data, error } = await supabase.functions.invoke("generate-linkedin-post", {
        body: {
          step: "write",
          blog_post_id: blogPost.id,
          title: blogPost.title,
          briefing: approved,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setContent(data.content);
      setHashtags(data.hashtags || []);
      setPostId(data.id);
      setPhase("editing");
      queryClient.invalidateQueries({ queryKey: ["social-posts-all"] });
      queryClient.invalidateQueries({ queryKey: ["linkedin-posts-for-blogs"] });
      toast.success("LinkedIn post geschreven!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Schrijven mislukt");
      setPhase("briefing");
    }
  };

  const save = async () => {
    if (!postId) return;
    const fullContent = `${content}\n\n${hashtags.join(" ")}`;
    try {
      await updatePost.mutateAsync({
        postId,
        updates: { content: fullContent },
        photoId: selectedPhoto?.id || null,
      });
      if (selectedPhoto) {
        await markPhotoUsed.mutateAsync(selectedPhoto.id);
      }
      queryClient.invalidateQueries({ queryKey: ["linkedin-posts-for-blogs"] });
      toast.success("LinkedIn post opgeslagen!");
      onOpenChange(false);
    } catch {
      toast.error("Opslaan mislukt");
    }
  };

  const fullText = `${content}\n\n${hashtags.join(" ")}`;
  const charCount = fullText.trim().length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Linkedin className="h-5 w-5 text-[#0A66C2]" />
            LinkedIn post voor: {blogPost.title}
          </DialogTitle>
        </DialogHeader>

        {/* Phase: Idle — start button */}
        {phase === "idle" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <p className="text-sm text-muted-foreground text-center max-w-md">
              De AI analyseert eerst je blogartikel en stelt een strategische briefing samen. 
              Daarna kies je de hook, teasers en trigger-woord voordat de post wordt geschreven.
            </p>
            <Button onClick={startBrainstorm} size="lg">
              <Sparkles className="h-4 w-4 mr-2" />
              Analyseer artikel
            </Button>
          </div>
        )}

        {/* Phase: Brainstorming — loading */}
        {phase === "brainstorming" && (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Artikel wordt geanalyseerd...</p>
          </div>
        )}

        {/* Phase: Briefing review */}
        {phase === "briefing" && briefing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <LinkedInBriefingView
              briefing={briefing}
              onApprove={writePost}
              isWriting={false}
            />
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Post wordt hier zichtbaar na schrijven</h3>
              <SocialPostPreview
                platform="linkedin"
                content="Je LinkedIn post verschijnt hier na het schrijven..."
                hashtags={[]}
                accountName="Top Immo Spain"
              />
            </div>
          </div>
        )}

        {/* Phase: Writing — loading */}
        {phase === "writing" && briefing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <LinkedInBriefingView
              briefing={briefing}
              onApprove={writePost}
              isWriting={true}
            />
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Post wordt geschreven...</p>
            </div>
          </div>
        )}

        {/* Phase: Editing — editor + preview */}
        {phase === "editing" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Post tekst</h3>
                <Button size="sm" variant="outline" onClick={() => {
                  setBriefing(null);
                  setPhase("idle");
                }}>
                  <Sparkles className="h-4 w-4 mr-1" />
                  Opnieuw genereren
                </Button>
              </div>

              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Schrijf of genereer je LinkedIn post..."
                className="min-h-[250px] text-sm"
              />

              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Hashtags (gescheiden door spaties)
                </label>
                <Textarea
                  value={hashtags.join(" ")}
                  onChange={(e) =>
                    setHashtags(e.target.value.split(/\s+/).filter((h) => h.length > 0))
                  }
                  placeholder="#vastgoed #spanje #investeren"
                  className="min-h-[60px] text-sm mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Camera className="h-3 w-3" />
                  Foto kiezen
                </label>
                <div className="mt-1">
                  <LinkedInPhotoSelector
                    selectedPhotoId={selectedPhoto?.id || null}
                    onSelect={setSelectedPhoto}
                  />
                </div>
              </div>

              <CharacterCounter current={charCount} max={PLATFORM_LIMITS.linkedin} />

              <Button
                onClick={save}
                disabled={!postId || !content.trim() || updatePost.isPending}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-1" />
                Opslaan als concept
              </Button>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Preview</h3>
              {selectedPhoto && (
                <div className="rounded-lg overflow-hidden border">
                  <img src={selectedPhoto.image_url} alt="Geselecteerde foto" className="w-full max-h-[200px] object-cover" />
                </div>
              )}
              <SocialPostPreview
                platform="linkedin"
                content={content || "Je LinkedIn post verschijnt hier..."}
                hashtags={hashtags}
                accountName="Top Immo Spain"
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
