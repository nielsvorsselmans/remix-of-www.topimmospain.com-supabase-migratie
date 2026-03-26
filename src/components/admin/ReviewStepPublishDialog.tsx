import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Star, Video, Camera, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type SocialPlatform = "linkedin" | "facebook" | "instagram";

interface ReviewData {
  id: string;
  customer_name: string;
  quote: string;
  rating: number;
  video_url: string | null;
  photo_urls: string[] | null;
  active: boolean;
  featured: boolean;
  social_snippet?: string | null;
  story_slug?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  review: ReviewData;
  projectId: string | null;
  onSaved: () => void;
}

export function ReviewStepPublishDialog({ open, onOpenChange, review, projectId, onSaved }: Props) {
  const [active, setActive] = useState(review.active);
  const [featured, setFeatured] = useState(review.featured);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>(["linkedin"]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setActive(review.active);
      setFeatured(review.featured);
      setSelectedPlatforms(["linkedin"]);
      setPublished(false);
    }
  }, [open, review.active, review.featured]);

  const togglePlatform = (platform: SocialPlatform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handlePublish = async () => {
    setPublishing(true);

    const { error } = await supabase
      .from("reviews")
      .update({
        active,
        featured,
        review_status: active ? "published" : "review",
      })
      .eq("id", review.id);

    if (error) {
      setPublishing(false);
      toast.error("Kon review niet publiceren");
      return;
    }

    // Create social posts if publishing — but check for existing drafts first
    if (active && review.quote && selectedPlatforms.length > 0) {
      // Check which platforms already have a draft for this review
      const { data: existingPosts } = await supabase
        .from("social_posts")
        .select("platform")
        .eq("project_id", projectId)
        .in("platform", selectedPlatforms)
        .eq("status", "draft")
        .ilike("content", `%${review.customer_name}%`);

      const existingPlatforms = new Set(existingPosts?.map((p) => p.platform) || []);
      const newPlatforms = selectedPlatforms.filter((p) => !existingPlatforms.has(p));

      if (newPlatforms.length > 0) {
        // Use AI-generated social_snippet if available, else fallback to template
        const content = (review as any).social_snippet 
          ? `${(review as any).social_snippet}\n\n#klantverhaal #vastgoed #spanje`
          : `⭐ "${review.quote}" — ${review.customer_name}\n\n#klantverhaal #vastgoed #spanje`;
        const inserts = newPlatforms.map((platform) => ({
          platform,
          content,
          status: "draft" as const,
          project_id: projectId,
        }));
        await supabase.from("social_posts").insert(inserts);
      }
    }

    setPublishing(false);
    setPublished(true);
    const postCount = selectedPlatforms.length;
    toast.success(
      active
        ? `Review gepubliceerd${postCount > 0 ? ` + ${postCount} social post draft(s)` : ""}`
        : "Review status bijgewerkt"
    );
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4" /> Review publiceren
          </DialogTitle>
          <DialogDescription>Controleer de review en zet live.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Preview */}
          <div className="rounded-md border p-3 space-y-2 bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-3 w-3 ${i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'}`} />
                ))}
              </div>
              <span className="text-xs font-medium">{review.customer_name}</span>
            </div>
            <p className="text-xs text-muted-foreground italic">"{review.quote}"</p>
            <div className="flex gap-3 text-[10px] text-muted-foreground">
              {review.video_url && (
                <span className="flex items-center gap-1"><Video className="h-3 w-3" /> Video</span>
              )}
              {review.photo_urls && review.photo_urls.length > 0 && (
                <span className="flex items-center gap-1"><Camera className="h-3 w-3" /> {review.photo_urls.length} foto's</span>
              )}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="active-toggle" className="text-xs">Live op website</Label>
              <Switch id="active-toggle" checked={active} onCheckedChange={setActive} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="featured-toggle" className="text-xs">Uitgelicht</Label>
              <Switch id="featured-toggle" checked={featured} onCheckedChange={setFeatured} />
            </div>
          </div>

          {/* Social platforms */}
          {active && (
            <div className="space-y-2">
              <Label className="text-xs">Social post drafts aanmaken voor:</Label>
              <div className="flex flex-col gap-2">
                {(["linkedin", "facebook", "instagram"] as SocialPlatform[]).map((platform) => (
                  <label key={platform} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={selectedPlatforms.includes(platform)}
                      onCheckedChange={() => togglePlatform(platform)}
                    />
                    <span className="capitalize">{platform}</span>
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground bg-primary/5 p-2 rounded">
                Bij publicatie worden automatisch draft social posts aangemaakt. Bestaande drafts worden niet overschreven.
              </p>
            </div>
          )}

          {published ? (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-md text-center space-y-2">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1.5">
                  <Check className="h-4 w-4" /> Review succesvol {active ? 'gepubliceerd' : 'opgeslagen'}
                </p>
                {active && (review as any).story_slug && (
                  <a
                    href={`/klantverhalen/${(review as any).story_slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Bekijk op website →
                  </a>
                )}
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={() => onOpenChange(false)}>Sluiten</Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Annuleren</Button>
              <Button size="sm" onClick={handlePublish} disabled={publishing || !review.quote}>
                {publishing && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                {active ? "Publiceer" : "Opslaan"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
