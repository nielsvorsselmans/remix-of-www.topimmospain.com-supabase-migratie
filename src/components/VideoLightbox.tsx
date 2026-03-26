import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getYouTubeEmbedUrl } from "@/lib/youtube";

interface VideoLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  youtubeId: string;
  title: string;
  isShorts?: boolean;
}

export function VideoLightbox({ open, onOpenChange, youtubeId, title, isShorts = false }: VideoLightboxProps) {
  // Build the embed URL using youtube-nocookie domain for privacy
  const embedUrl = `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1`;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`p-0 border-0 bg-black ${isShorts ? 'max-w-sm' : 'max-w-4xl'}`}>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 z-50 text-white hover:bg-white/20"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-5 w-5" />
        </Button>
        <div className={`w-full ${isShorts ? 'aspect-[9/16]' : 'aspect-video'}`}>
          <iframe
            title={`YouTube: ${title}`}
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
