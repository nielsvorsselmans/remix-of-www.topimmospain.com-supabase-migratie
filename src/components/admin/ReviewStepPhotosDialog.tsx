import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { MediaUploader } from "@/components/MediaUploader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewId: string;
  currentPhotos: string[] | null;
  onSaved: () => void;
}

export function ReviewStepPhotosDialog({ open, onOpenChange, reviewId, currentPhotos, onSaved }: Props) {
  const [photos, setPhotos] = useState<string[]>(currentPhotos || []);
  const [saving, setSaving] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setPhotos(currentPhotos || []);
    }
  }, [open, currentPhotos]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("reviews")
      .update({ photo_urls: photos, image_url: photos.length > 0 ? photos[0] : null })
      .eq("id", reviewId);

    setSaving(false);
    if (error) {
      toast.error("Kon foto's niet opslaan");
      return;
    }
    toast.success("Foto's opgeslagen");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Camera className="h-4 w-4" /> Klantfoto's uploaden
          </DialogTitle>
          <DialogDescription>Upload foto's van de klant of het pand voor de review.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="p-2.5 bg-primary/5 border border-primary/10 rounded-md text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground/80">💡 Tips voor de beste foto's:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Een foto van de klant bij het pand werkt het best als hoofdfoto</li>
              <li>Voeg 2-3 foto's van het pand zelf toe (exterieur + interieur)</li>
              <li>Liggend formaat (landschap) werkt het best op de website</li>
            </ul>
          </div>
          <MediaUploader
            uploadedUrls={photos}
            onUrlsChange={setPhotos}
            maxFiles={10}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Annuleren</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Opslaan ({photos.length} foto's)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
