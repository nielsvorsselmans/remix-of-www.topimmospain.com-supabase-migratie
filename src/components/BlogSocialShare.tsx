import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Linkedin, Twitter, Mail, Check } from "lucide-react";
import { toast } from "sonner";

interface BlogSocialShareProps {
  title: string;
  slug: string;
  onShare?: () => void;
  variant?: "sidebar" | "inline";
}

export const BlogSocialShare = ({ title, slug, onShare, variant = "sidebar" }: BlogSocialShareProps) => {
  const [copied, setCopied] = useState(false);
  const url = `https://www.topimmospain.com/blog/${slug}`;

  const handleShare = (platform: string) => {
    if (onShare) onShare();

    switch (platform) {
      case 'linkedin':
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
          '_blank',
          'width=600,height=400'
        );
        break;
      case 'twitter':
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
          '_blank',
          'width=600,height=400'
        );
        break;
      case 'whatsapp':
        window.open(
          `https://wa.me/?text=${encodeURIComponent(`${title} - ${url}`)}`,
          '_blank'
        );
        break;
      case 'email':
        window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success("Link gekopieerd!");
        setTimeout(() => setCopied(false), 2000);
        break;
    }
  };

  // Inline variant: horizontal, compact, icon-only buttons
  if (variant === "inline") {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Deel dit artikel:</span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleShare('linkedin')}
            className="h-9 w-9 rounded-full"
            title="Delen op LinkedIn"
          >
            <Linkedin className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleShare('twitter')}
            className="h-9 w-9 rounded-full"
            title="Delen op Twitter/X"
          >
            <Twitter className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleShare('whatsapp')}
            className="h-9 w-9 rounded-full"
            title="Delen via WhatsApp"
          >
            <Share2 className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleShare('email')}
            className="h-9 w-9 rounded-full"
            title="Delen via email"
          >
            <Mail className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleShare('copy')}
            className="h-9 w-9 rounded-full"
            title="Link kopiëren"
          >
            {copied ? (
              <Check className="w-4 h-4 text-primary" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Sidebar variant: vertical buttons with labels
  return (
    <div className="space-y-3">
      <h3 className="font-bold text-sm text-foreground">Deel artikel</h3>
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleShare('linkedin')}
          className="justify-start"
        >
          <Linkedin className="w-4 h-4 mr-2" />
          LinkedIn
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleShare('twitter')}
          className="justify-start"
        >
          <Twitter className="w-4 h-4 mr-2" />
          Twitter/X
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleShare('whatsapp')}
          className="justify-start"
        >
          <Share2 className="w-4 h-4 mr-2" />
          WhatsApp
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleShare('email')}
          className="justify-start"
        >
          <Mail className="w-4 h-4 mr-2" />
          Email
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleShare('copy')}
          className="justify-start"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-2 text-primary" />
              Gekopieerd!
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4 mr-2" />
              Kopieer link
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
