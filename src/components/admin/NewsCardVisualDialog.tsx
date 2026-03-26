import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NewsCardVisual } from "./NewsCardVisual";
import { SocialPost } from "@/hooks/useSocialPosts";

interface NewsCardVisualDialogProps {
  post: SocialPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Extract first sentence or up to 100 chars for headline
function extractHeadline(content: string): string {
  // Get first line or sentence
  const firstLine = content.split('\n')[0];
  const firstSentence = firstLine.split(/[.!?]/)[0];
  
  if (firstSentence.length <= 80) {
    return firstSentence.trim();
  }
  
  // Truncate at word boundary
  const truncated = firstSentence.substring(0, 80);
  const lastSpace = truncated.lastIndexOf(' ');
  return truncated.substring(0, lastSpace) + '...';
}

// Extract a summary from the post content for lead text
function extractLeadText(content: string): string {
  const lines = content.split('\n').filter(line => line.trim());
  
  // Skip first line (likely hook) and get next substantial paragraph
  if (lines.length > 1) {
    const secondPart = lines.slice(1).join(' ').substring(0, 200);
    const lastSpace = secondPart.lastIndexOf(' ');
    return secondPart.substring(0, lastSpace > 150 ? lastSpace : 200).trim() + '...';
  }
  
  return lines[0]?.substring(0, 150) + '...' || 'Lees meer over dit onderwerp...';
}

// Determine tag based on content keywords
function determineTag(content: string, projectName?: string | null): string {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('rendement') || lowerContent.includes('investeer') || lowerContent.includes('roi')) {
    return 'INVESTEREN';
  }
  if (lowerContent.includes('nieuw') || lowerContent.includes('lancering') || lowerContent.includes('exclusief')) {
    return 'NIEUW PROJECT';
  }
  if (lowerContent.includes('markt') || lowerContent.includes('prijs') || lowerContent.includes('trend')) {
    return 'MARKT UPDATE';
  }
  if (projectName) {
    return 'PROJECT UPDATE';
  }
  
  return 'EXPERTISE';
}

export function NewsCardVisualDialog({ post, open, onOpenChange }: NewsCardVisualDialogProps) {
  if (!post) return null;

  const headline = extractHeadline(post.content);
  const leadText = extractLeadText(post.content);
  const tag = determineTag(post.content, post.project_name);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Social Media Visual Genereren</DialogTitle>
        </DialogHeader>
        
        <NewsCardVisual
          initialTag={tag}
          initialHeadline={headline}
          initialSubtext={leadText}
          projectImageUrl={null} // Could be linked to project featured image
          projectName={post.project_name || undefined}
        />
      </DialogContent>
    </Dialog>
  );
}
