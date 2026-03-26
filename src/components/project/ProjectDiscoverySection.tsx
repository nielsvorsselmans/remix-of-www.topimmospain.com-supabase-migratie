import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CompactPropertyList } from "@/components/project/CompactPropertyList";
import { ProjectDocumentsSection } from "@/components/ProjectDocumentsSection";
import { BuildUpdatesTimeline } from "@/components/BuildUpdatesTimeline";
import { Video, Home, FileText, Hammer, ChevronDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { extractYouTubeId, getYouTubeEmbedUrl } from "@/lib/youtube";

interface Property {
  id: string;
  title: string;
  description?: string | null;
  price?: number | null;
  city?: string | null;
  property_type?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area_sqm?: number | null;
  distance_to_beach_m?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  status?: string | null;
  image_url?: string | null;
  images?: any;
  features?: any;
}

interface ProjectDiscoverySectionProps {
  projectId: string;
  properties: Property[];
  showhouseVideoUrl?: string | null;
  environmentVideoUrl?: string | null;
}

// Use shared YouTube utility that supports all URL formats including Shorts

interface CollapsibleCardProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: string;
  preview?: React.ReactNode;
}

function CollapsibleCard({ title, icon, defaultOpen = false, children, badge, preview }: CollapsibleCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                {icon}
                {title}
                {badge && (
                  <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {badge}
                  </span>
                )}
              </span>
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                isOpen && "rotate-180"
              )} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        {/* Preview when closed */}
        {!isOpen && preview && (
          <CardContent className="pt-0 pb-3">
            {preview}
          </CardContent>
        )}
        <CollapsibleContent>
          <CardContent className="pt-0">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// YouTube thumbnail preview component
function VideoThumbnailPreview({ 
  environmentVideoUrl, 
  showhouseVideoUrl 
}: { 
  environmentVideoUrl?: string | null; 
  showhouseVideoUrl?: string | null;
}) {
  const envVideoId = environmentVideoUrl ? extractYouTubeId(environmentVideoUrl) : null;
  const showVideoId = showhouseVideoUrl ? extractYouTubeId(showhouseVideoUrl) : null;
  
  return (
    <div className="flex gap-2">
      {envVideoId && (
        <div className="relative flex-1 aspect-video rounded overflow-hidden bg-muted group">
          <img 
            src={`https://img.youtube.com/vi/${envVideoId}/mqdefault.jpg`}
            alt="Omgeving video"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
            <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
              <div className="w-0 h-0 border-l-[8px] border-l-primary border-y-[5px] border-y-transparent ml-1" />
            </div>
          </div>
          <span className="absolute bottom-1 left-1 text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded">
            Omgeving
          </span>
        </div>
      )}
      {showVideoId && (
        <div className="relative flex-1 aspect-video rounded overflow-hidden bg-muted group">
          <img 
            src={`https://img.youtube.com/vi/${showVideoId}/mqdefault.jpg`}
            alt="Showhouse video"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
            <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
              <div className="w-0 h-0 border-l-[8px] border-l-primary border-y-[5px] border-y-transparent ml-1" />
            </div>
          </div>
          <span className="absolute bottom-1 left-1 text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded">
            Showhouse
          </span>
        </div>
      )}
    </div>
  );
}

export function ProjectDiscoverySection({
  projectId,
  properties,
  showhouseVideoUrl,
  environmentVideoUrl,
}: ProjectDiscoverySectionProps) {
  const hasVideos = showhouseVideoUrl || environmentVideoUrl;
  const availableCount = properties.filter(p => p.status === 'available').length;

  return (
    <div className="space-y-3">
      {/* Videos - closed by default with thumbnail preview */}
      {hasVideos && (
        <CollapsibleCard 
          title="Video's" 
          icon={<Video className="h-4 w-4 text-primary" />}
          defaultOpen={false}
          badge={`${[environmentVideoUrl, showhouseVideoUrl].filter(Boolean).length} video's`}
          preview={
            <VideoThumbnailPreview 
              environmentVideoUrl={environmentVideoUrl} 
              showhouseVideoUrl={showhouseVideoUrl} 
            />
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {environmentVideoUrl && getYouTubeEmbedUrl(environmentVideoUrl) && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" />
                  Omgeving & Locatie
                </p>
                <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                  <iframe
                    src={getYouTubeEmbedUrl(environmentVideoUrl) || ''}
                    title="Omgeving & Locatie"
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
            {showhouseVideoUrl && getYouTubeEmbedUrl(showhouseVideoUrl) && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Home className="h-3.5 w-3.5" />
                  Showhouse Tour
                </p>
                <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                  <iframe
                    src={getYouTubeEmbedUrl(showhouseVideoUrl) || ''}
                    title="Showhouse Tour"
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </div>
        </CollapsibleCard>
      )}

      {/* Properties */}
      {properties.length > 0 && (
        <CollapsibleCard 
          title="Beschikbare woningen" 
          icon={<Home className="h-4 w-4 text-primary" />}
          defaultOpen={true}
          badge={`${availableCount} beschikbaar`}
        >
          <CompactPropertyList properties={properties} maxVisible={5} />
        </CollapsibleCard>
      )}

      {/* Documents */}
      <CollapsibleCard 
        title="Documenten" 
        icon={<FileText className="h-4 w-4 text-primary" />}
        defaultOpen={false}
      >
        <ProjectDocumentsSection projectId={projectId} visibilityType="portal" />
      </CollapsibleCard>

      {/* Build Updates */}
      <CollapsibleCard 
        title="Bouwvoortgang" 
        icon={<Hammer className="h-4 w-4 text-primary" />}
        defaultOpen={false}
      >
        <BuildUpdatesTimeline projectId={projectId} isPortal={true} />
      </CollapsibleCard>
    </div>
  );
}
