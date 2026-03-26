import { usePartner } from '@/contexts/PartnerContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Building2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PartnerBlogBanner() {
  const { currentPartner } = usePartner();

  if (!currentPartner) {
    return null;
  }

  const initials = currentPartner.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Use image_url from the partner record (cast since context type may not include it)
  const partnerWithImage = currentPartner as typeof currentPartner & { image_url?: string | null };
  const imageUrl = partnerWithImage.image_url || currentPartner.logo_url;

  return (
    <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 flex items-center gap-4">
      <Avatar className="h-14 w-14 flex-shrink-0">
        {imageUrl ? (
          <AvatarImage src={imageUrl} alt={currentPartner.name} />
        ) : null}
        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">
          Dit artikel werd gedeeld door
        </p>
        <p className="font-semibold text-foreground truncate">
          {currentPartner.name}
        </p>
        <p className="text-sm text-muted-foreground truncate">
          {currentPartner.company}
        </p>
      </div>

      {currentPartner.email && (
        <Button
          variant="outline"
          size="sm"
          className="flex-shrink-0 gap-1.5"
          asChild
        >
          <a href={`mailto:${currentPartner.email}`}>
            Neem contact op
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </Button>
      )}
    </div>
  );
}
