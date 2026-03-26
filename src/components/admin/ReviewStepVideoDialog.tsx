import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video, Loader2, FileText, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { extractYouTubeId } from "@/lib/youtube";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewId: string;
  currentUrl: string | null;
  onSaved: () => void;
}

export function ReviewStepVideoDialog({ open, onOpenChange, reviewId, currentUrl, onSaved }: Props) {
  const [videoUrl, setVideoUrl] = useState(currentUrl || "");
  const [saving, setSaving] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptStatus, setTranscriptStatus] = useState<"idle" | "loading" | "success" | "not_found">("idle");

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setVideoUrl(currentUrl || "");
      setTranscriptStatus("idle");
      setTranscribing(false);
    }
  }, [open, currentUrl]);

  const handleTranscribe = async (url: string) => {
    const ytId = extractYouTubeId(url);
    if (!ytId) return;

    setTranscribing(true);
    setTranscriptStatus("loading");
    try {
      const { data, error } = await supabase.functions.invoke("transcribe-youtube", {
        body: { video_url: url, review_id: reviewId },
      });
      if (error) throw error;
      if (data?.transcript) {
        setTranscriptStatus("success");
        toast.success(`Transcript opgehaald (${data.word_count} woorden)`);
      } else {
        setTranscriptStatus("not_found");
      }
    } catch {
      setTranscriptStatus("not_found");
    } finally {
      setTranscribing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("reviews")
      .update({ video_url: videoUrl || null })
      .eq("id", reviewId);

    setSaving(false);
    if (error) {
      toast.error("Kon video URL niet opslaan");
      return;
    }
    toast.success("Video URL opgeslagen");
    onSaved();

    // Auto-transcribe after saving if it's a YouTube URL
    if (videoUrl && extractYouTubeId(videoUrl)) {
      handleTranscribe(videoUrl);
    }

    onOpenChange(false);
  };

  const isYouTube = !!extractYouTubeId(videoUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Video className="h-4 w-4" /> Video toevoegen
          </DialogTitle>
          <DialogDescription>Plak een YouTube of Vimeo link van de klantreview.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="video-url" className="text-xs">Video URL</Label>
            <Input
              id="video-url"
              placeholder="https://youtube.com/watch?v=..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />
          </div>

          {/* Transcript status indicator */}
          {isYouTube && transcriptStatus !== "idle" && (
            <div className="flex items-center gap-2 text-xs p-2 rounded-md bg-muted/30">
              {transcriptStatus === "loading" && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  <span className="text-muted-foreground">Transcript ophalen...</span>
                </>
              )}
              {transcriptStatus === "success" && (
                <>
                  <Check className="h-3 w-3 text-emerald-600" />
                  <span className="text-emerald-600">Transcript opgehaald — wordt gebruikt bij AI generatie</span>
                </>
              )}
              {transcriptStatus === "not_found" && (
                <>
                  <FileText className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Geen ondertiteling beschikbaar voor deze video</span>
                </>
              )}
            </div>
          )}

          {isYouTube && transcriptStatus === "idle" && (
            <p className="text-[10px] text-muted-foreground">
              💡 Na opslaan wordt automatisch het transcript opgehaald voor de AI review generatie.
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Annuleren</Button>
            <Button size="sm" onClick={handleSave} disabled={saving || transcribing}>
              {saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Opslaan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
