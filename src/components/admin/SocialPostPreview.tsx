import { cn } from "@/lib/utils";
import { Linkedin, Facebook, Instagram, Heart, MessageCircle, Share2, Send, Bookmark, ThumbsUp, MessageSquare, Repeat2 } from "lucide-react";

interface SocialPostPreviewProps {
  platform: "linkedin" | "facebook" | "instagram";
  content: string;
  hashtags?: string[];
  imageUrl?: string;
  accountName?: string;
}

export function SocialPostPreview({ 
  platform, 
  content, 
  hashtags, 
  imageUrl,
  accountName = "Top Immo Spain"
}: SocialPostPreviewProps) {
  
  
  if (platform === "linkedin") {
    return (
      <div className="bg-card border rounded-lg overflow-hidden max-w-md">
        {/* Header */}
        <div className="p-3 flex items-start gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-primary">T</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{accountName}</p>
            <p className="text-xs text-muted-foreground">2.500 volgers</p>
            <p className="text-xs text-muted-foreground">Nu • 🌐</p>
          </div>
          <Linkedin className="h-5 w-5 text-[#0A66C2] shrink-0" />
        </div>
        
        {/* Content */}
        <div className="px-3 pb-3">
          <p className="text-sm whitespace-pre-wrap line-clamp-[12]">{content}</p>
        </div>
        
        {/* Image */}
        {imageUrl && (
          <div className="relative aspect-video bg-muted">
            <img 
              src={imageUrl} 
              alt="Post afbeelding" 
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        {/* Actions */}
        <div className="px-3 py-2 border-t flex items-center justify-around text-muted-foreground">
          <button className="flex items-center gap-1 text-xs hover:text-primary transition-colors">
            <ThumbsUp className="h-4 w-4" />
            <span>Vind ik leuk</span>
          </button>
          <button className="flex items-center gap-1 text-xs hover:text-primary transition-colors">
            <MessageSquare className="h-4 w-4" />
            <span>Reactie</span>
          </button>
          <button className="flex items-center gap-1 text-xs hover:text-primary transition-colors">
            <Repeat2 className="h-4 w-4" />
            <span>Repost</span>
          </button>
          <button className="flex items-center gap-1 text-xs hover:text-primary transition-colors">
            <Send className="h-4 w-4" />
            <span>Verzenden</span>
          </button>
        </div>
      </div>
    );
  }
  
  if (platform === "facebook") {
    return (
      <div className="bg-card border rounded-lg overflow-hidden max-w-md">
        {/* Header */}
        <div className="p-3 flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center shrink-0">
            <span className="text-base font-bold text-primary">T</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{accountName}</p>
            <p className="text-xs text-muted-foreground">Nu • 🌐</p>
          </div>
          <Facebook className="h-5 w-5 text-[#1877F2] shrink-0" />
        </div>
        
        {/* Content */}
        <div className="px-3 pb-3">
          <p className="text-sm whitespace-pre-wrap line-clamp-[10]">{content}</p>
        </div>
        
        {/* Image */}
        {imageUrl && (
          <div className="relative aspect-video bg-muted">
            <img 
              src={imageUrl} 
              alt="Post afbeelding" 
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        {/* Engagement stats */}
        <div className="px-3 py-2 flex items-center justify-between text-xs text-muted-foreground border-b">
          <span>👍 ❤️ 42</span>
          <span>8 reacties • 3 keer gedeeld</span>
        </div>
        
        {/* Actions */}
        <div className="px-3 py-2 flex items-center justify-around text-muted-foreground">
          <button className="flex items-center gap-2 text-sm hover:text-primary transition-colors py-1.5 px-3 rounded-md hover:bg-muted">
            <ThumbsUp className="h-4 w-4" />
            <span>Vind ik leuk</span>
          </button>
          <button className="flex items-center gap-2 text-sm hover:text-primary transition-colors py-1.5 px-3 rounded-md hover:bg-muted">
            <MessageCircle className="h-4 w-4" />
            <span>Reageren</span>
          </button>
          <button className="flex items-center gap-2 text-sm hover:text-primary transition-colors py-1.5 px-3 rounded-md hover:bg-muted">
            <Share2 className="h-4 w-4" />
            <span>Delen</span>
          </button>
        </div>
      </div>
    );
  }
  
  // Instagram
  return (
    <div className="bg-card border rounded-lg overflow-hidden max-w-md">
      {/* Header */}
      <div className="p-3 flex items-center gap-3 border-b">
        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-500 p-0.5">
          <div className="h-full w-full rounded-full bg-card flex items-center justify-center">
            <span className="text-xs font-bold text-primary">T</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">topimmospain</p>
        </div>
        <Instagram className="h-5 w-5 shrink-0" />
      </div>
      
      {/* Image */}
      {imageUrl ? (
        <div className="relative aspect-square bg-muted">
          <img 
            src={imageUrl} 
            alt="Post afbeelding" 
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-square bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
          <span className="text-muted-foreground text-sm">Geen afbeelding</span>
        </div>
      )}
      
      {/* Actions */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Heart className="h-6 w-6 cursor-pointer hover:text-red-500 transition-colors" />
          <MessageCircle className="h-6 w-6 cursor-pointer hover:text-primary transition-colors" />
          <Send className="h-6 w-6 cursor-pointer hover:text-primary transition-colors" />
        </div>
        <Bookmark className="h-6 w-6 cursor-pointer hover:text-primary transition-colors" />
      </div>
      
      {/* Likes */}
      <div className="px-3 pb-1">
        <p className="text-sm font-semibold">156 vind-ik-leuks</p>
      </div>
      
      {/* Caption */}
      <div className="px-3 pb-3">
        <p className="text-sm">
          <span className="font-semibold">topimmospain </span>
          <span className="whitespace-pre-wrap line-clamp-3">{content}</span>
        </p>
      </div>
      
      {/* Timestamp */}
      <div className="px-3 pb-3">
        <p className="text-xs text-muted-foreground uppercase">Nu</p>
      </div>
    </div>
  );
}
