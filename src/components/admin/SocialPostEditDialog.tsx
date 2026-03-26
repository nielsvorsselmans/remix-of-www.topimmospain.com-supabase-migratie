import { useEffect, useState } from "react";
import { Linkedin, Facebook, Instagram } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SocialPost, useUpdateSocialPost } from "@/hooks/useSocialPosts";
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

interface SocialPostEditDialogProps {
  post: SocialPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SocialPostEditDialog({ post, open, onOpenChange }: SocialPostEditDialogProps) {
  const [content, setContent] = useState("");
  const updatePost = useUpdateSocialPost();

  useEffect(() => {
    if (post) {
      setContent(post.content);
    }
  }, [post]);

  const handleSave = async () => {
    if (!post) return;

    try {
      const result = await updatePost.mutateAsync({
        postId: post.id,
        updates: { content },
        ghlPostId: post.ghl_post_id,
      });
      if (result?.synced === true) {
        toast.success("Post bijgewerkt en gesynchroniseerd met GHL");
      } else if (result?.synced === false) {
        toast.warning("Post lokaal bijgewerkt, maar synchronisatie met GHL mislukt");
      } else {
        toast.success("Post bijgewerkt");
      }
      onOpenChange(false);
    } catch {
      toast.error("Fout bij opslaan");
    }
  };

  const characterCount = content.length;
  const maxChars = post?.platform === 'linkedin' ? 3000 : 2200;

  if (!post) return null;

  const PlatformIcon = platformIcons[post.platform];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`p-1.5 rounded text-white ${platformColors[post.platform]}`}>
              <PlatformIcon className="h-4 w-4" />
            </div>
            <span>Post bewerken</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              className="resize-none"
              placeholder="Schrijf je post..."
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{characterCount} / {maxChars} karakters</span>
              {characterCount > maxChars && (
                <span className="text-destructive">Te lang!</span>
              )}
            </div>
          </div>

          {post.project_name && (
            <div className="text-sm">
              <span className="text-muted-foreground">Project: </span>
              <span className="font-medium">{post.project_name}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={updatePost.isPending || characterCount > maxChars}
          >
            {updatePost.isPending ? "Opslaan..." : "Opslaan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
