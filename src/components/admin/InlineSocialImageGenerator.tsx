import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, ImageIcon } from "lucide-react";

interface InlineSocialImageGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postContent?: string;
  onGenerated: (url: string) => void;
}

export function InlineSocialImageGenerator({ open, onOpenChange, postContent, onGenerated }: InlineSocialImageGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-social-image", {
        body: {
          platform: "linkedin",
          postContent: postContent || "",
          prompt: prompt.trim() || undefined,
        },
      });

      if (error) throw new Error(error.message || "Generatie mislukt");
      if (!data?.success) throw new Error(data?.error || "Geen afbeelding gegenereerd");

      toast.success("Afbeelding gegenereerd!");
      onGenerated(data.imageUrl);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Social image generation error:", err);
      toast.error(err.message || "Fout bij genereren");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            AI Post Afbeelding
          </DialogTitle>
          <DialogDescription>
            Genereer een landschap-afbeelding op basis van je post content. Geen referentiefoto nodig.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Optionele prompt (laat leeg voor automatisch)</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Bijv: Zonsondergang over de Middellandse Zee met luxe villa op de voorgrond..."
              className="min-h-[60px] text-sm"
            />
          </div>

          {postContent && (
            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
              <span className="font-medium">Post context:</span> {postContent.substring(0, 120)}...
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Genereren...</>
            ) : (
              <><ImageIcon className="h-4 w-4 mr-2" />Genereer Afbeelding</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
