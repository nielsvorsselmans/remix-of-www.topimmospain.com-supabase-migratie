import { useState } from "react";
import { usePhotoLibrary, type PhotoCategory, type LinkedInPhoto } from "@/hooks/usePhotoLibrary";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

interface LinkedInPhotoSelectorProps {
  selectedPhotoId: string | null;
  onSelect: (photo: LinkedInPhoto | null) => void;
}

export function LinkedInPhotoSelector({ selectedPhotoId, onSelect }: LinkedInPhotoSelectorProps) {
  const [category, setCategory] = useState<PhotoCategory | undefined>();
  const { data: photos, isLoading } = usePhotoLibrary(category);

  const isRecentlyUsed = (photo: LinkedInPhoto) => {
    if (!photo.last_used_at) return false;
    const daysSince = (Date.now() - new Date(photo.last_used_at).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince < 7;
  };

  if (isLoading) return <p className="text-xs text-muted-foreground">Foto's laden...</p>;
  if (!photos?.length) return <p className="text-xs text-muted-foreground">Geen foto's beschikbaar. Upload eerst foto's in de bibliotheek.</p>;

  return (
    <div className="space-y-2">
      <Tabs value={category || "all"} onValueChange={(v) => setCategory(v === "all" ? undefined : v as PhotoCategory)}>
        <TabsList className="h-8">
          <TabsTrigger value="all" className="text-xs px-2 py-1">Alle</TabsTrigger>
          <TabsTrigger value="headshot" className="text-xs px-2 py-1">Headshot</TabsTrigger>
          <TabsTrigger value="speaking" className="text-xs px-2 py-1">Speaking</TabsTrigger>
          <TabsTrigger value="location" className="text-xs px-2 py-1">Locatie</TabsTrigger>
          <TabsTrigger value="lifestyle" className="text-xs px-2 py-1">Lifestyle</TabsTrigger>
          <TabsTrigger value="office" className="text-xs px-2 py-1">Kantoor</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto">
        {/* No photo option */}
        <button
          onClick={() => onSelect(null)}
          className={cn(
            "aspect-square rounded border-2 flex items-center justify-center text-xs text-muted-foreground hover:bg-muted/50 transition-colors",
            !selectedPhotoId ? "border-primary bg-primary/5" : "border-dashed border-muted-foreground/30"
          )}
        >
          Geen foto
        </button>

        {photos.map((photo) => (
          <button
            key={photo.id}
            onClick={() => onSelect(photo)}
            className={cn(
              "aspect-square rounded border-2 overflow-hidden relative group",
              selectedPhotoId === photo.id ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-muted-foreground/30"
            )}
          >
            <img src={photo.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
            
            {selectedPhotoId === photo.id && (
              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                <Check className="h-5 w-5 text-primary" />
              </div>
            )}

            {isRecentlyUsed(photo) && selectedPhotoId !== photo.id && (
              <div className="absolute top-0.5 right-0.5">
                <AlertTriangle className="h-3 w-3 text-yellow-500" />
              </div>
            )}

            <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {photo.times_used}× • {photo.last_used_at
                ? formatDistanceToNow(new Date(photo.last_used_at), { locale: nl, addSuffix: true })
                : "nooit"}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
