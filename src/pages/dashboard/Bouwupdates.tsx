import { LockedPhaseContent } from "@/components/LockedPhaseContent";
import { useCustomerSale } from "@/hooks/useCustomerSale";
import { useSaleBuildUpdates, VideoLink, ProjectVideo } from "@/hooks/useSaleBuildUpdates";
import { Loader2, Home, Building2, MapPin, Video, Calendar, Play, Image, ChevronLeft, ChevronRight, Construction, LayoutGrid, GitBranch, CalendarDays, Sparkles, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo } from "react";
import { format, differenceInDays } from "date-fns";
import { nl } from "date-fns/locale";
import { Toggle } from "@/components/ui/toggle";
import { extractYouTubeId, getYouTubeEmbedUrl } from "@/lib/youtube";
import { Link } from "react-router-dom";

const VIDEO_TYPE_LABELS: Record<string, string> = {
  bouwupdate: "Bouwupdate",
  showhouse: "Showhouse",
  omgeving: "Omgeving",
  algemeen: "Algemeen",
};

// Use shared YouTube utility that supports all URL formats including Shorts

const isNewUpdate = (dateString: string) => {
  return differenceInDays(new Date(), new Date(dateString)) <= 7;
};

// Category styling configurations
const CATEGORY_CONFIG = {
  sale: {
    icon: Home,
    label: 'Mijn Woning',
    color: 'bg-emerald-500',
    borderColor: 'border-emerald-500',
    lineColor: 'from-emerald-500/60 to-emerald-500/20',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  },
  project: {
    icon: Building2,
    label: 'Project',
    color: 'bg-blue-500',
    borderColor: 'border-blue-500',
    lineColor: 'from-blue-500/60 to-blue-500/20',
    badgeClass: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  },
  city: {
    icon: MapPin,
    label: 'Gemeente',
    color: 'bg-amber-500',
    borderColor: 'border-amber-500',
    lineColor: 'from-amber-500/60 to-amber-500/20',
    badgeClass: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  },
};

interface FeaturedUpdateProps {
  video: ProjectVideo;
  onSelect: (video: ProjectVideo) => void;
}

function FeaturedUpdate({ video, onSelect }: FeaturedUpdateProps) {
  const isPhoto = video.media_type === "photo";
  const imageUrls = video.image_urls || [];
  const isNew = isNewUpdate(video.video_date);

  return (
    <Card 
      className="overflow-hidden cursor-pointer group border-primary/20 bg-gradient-to-br from-primary/5 to-transparent hover:border-primary/40 transition-all duration-300"
      onClick={() => onSelect(video)}
    >
      <div className="grid md:grid-cols-2 gap-0">
        <div className="relative aspect-video md:aspect-auto md:min-h-[280px] bg-muted overflow-hidden">
          {isPhoto && imageUrls.length > 0 ? (
            <img
              src={imageUrls[0]}
              alt={video.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : video.thumbnail_url ? (
            <img
              src={video.thumbnail_url}
              alt={video.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
              {isPhoto ? (
                <Image className="h-16 w-16 text-primary/40" />
              ) : (
                <Video className="h-16 w-16 text-primary/40" />
              )}
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
              {isPhoto ? (
                <Image className="h-7 w-7 text-primary-foreground" />
              ) : (
                <Play className="h-7 w-7 text-primary-foreground ml-1" />
              )}
            </div>
          </div>

          <div className="absolute top-3 left-3 flex gap-2">
            {isNew && (
              <Badge className="bg-green-500 hover:bg-green-600 text-white shadow-md">
                Nieuw
              </Badge>
            )}
            <Badge variant={isPhoto ? "secondary" : "default"} className="shadow-md">
              {isPhoto ? <>📷 {imageUrls.length}</> : <>🎬 Video</>}
            </Badge>
          </div>
        </div>

        <div className="p-6 flex flex-col justify-center">
          <Badge variant="outline" className="w-fit mb-3 text-xs">
            {VIDEO_TYPE_LABELS[video.video_type] || video.video_type}
          </Badge>
          <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
            {video.title}
          </h3>
          <p className="text-sm text-muted-foreground flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4" />
            {format(new Date(video.video_date), "d MMMM yyyy", { locale: nl })}
          </p>
          {video.description && (
            <p className="text-muted-foreground line-clamp-3 text-sm">
              {video.description}
            </p>
          )}
          <Button variant="outline" className="mt-4 w-fit group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            Bekijk update
          </Button>
        </div>
      </div>
    </Card>
  );
}

interface VideoCardProps {
  link: VideoLink;
  onSelect: (video: ProjectVideo) => void;
}

function VideoCard({ link, onSelect }: VideoCardProps) {
  const video = link.project_videos;
  const isPhoto = video.media_type === "photo";
  const imageUrls = video.image_urls || [];
  const isNew = isNewUpdate(video.video_date);

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:border-primary/50 transition-all duration-300 group hover:shadow-lg animate-fade-in"
      onClick={() => onSelect(video)}
    >
      <div className="relative aspect-video bg-muted overflow-hidden">
        {isPhoto && imageUrls.length > 0 ? (
          <img
            src={imageUrls[0]}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            {isPhoto ? (
              <Image className="h-12 w-12 text-muted-foreground/50" />
            ) : (
              <Video className="h-12 w-12 text-muted-foreground/50" />
            )}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
            {isPhoto ? (
              <Image className="h-6 w-6 text-primary-foreground" />
            ) : (
              <Play className="h-6 w-6 text-primary-foreground ml-1" />
            )}
          </div>
        </div>

        <div className="absolute top-2 left-2 flex gap-2">
          {isNew && (
            <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs shadow-sm">
              Nieuw
            </Badge>
          )}
        </div>

        <Badge
          className="absolute top-2 right-2 shadow-sm"
          variant={isPhoto ? "secondary" : "default"}
        >
          {isPhoto ? <>📷 {imageUrls.length}</> : <>🎬</>}
        </Badge>
      </div>

      <CardContent className="p-4">
        <h3 className="font-medium line-clamp-1 group-hover:text-primary transition-colors">
          {video.title}
        </h3>
        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
          <Badge variant="outline" className="text-xs">
            {VIDEO_TYPE_LABELS[video.video_type] || video.video_type}
          </Badge>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(video.video_date), "d MMM yyyy", { locale: nl })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

interface EnhancedTimelineItemProps {
  video: ProjectVideo;
  onSelect: (video: ProjectVideo) => void;
  isFirst: boolean;
  isLast: boolean;
  category: 'sale' | 'project' | 'city';
  animationDelay: number;
}

function EnhancedTimelineItem({ video, onSelect, isFirst, isLast, category, animationDelay }: EnhancedTimelineItemProps) {
  const isPhoto = video.media_type === "photo";
  const imageUrls = video.image_urls || [];
  const isNew = isNewUpdate(video.video_date);
  const config = CATEGORY_CONFIG[category];
  const CategoryIcon = config.icon;

  return (
    <div 
      className="relative flex gap-4 sm:gap-6 group/item opacity-0 animate-fade-in"
      style={{ animationDelay: `${animationDelay}ms`, animationFillMode: 'forwards' }}
    >
      {/* Timeline line and marker */}
      <div className="flex flex-col items-center">
        {/* Iconic marker */}
        <div className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full ${config.color} flex items-center justify-center flex-shrink-0 z-10 shadow-lg transition-transform duration-300 group-hover/item:scale-110`}>
          <CategoryIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          {isFirst && isNew && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse shadow-md">
              <Sparkles className="h-3 w-3 text-yellow-900" />
            </div>
          )}
        </div>
        {/* Connecting line with gradient */}
        {!isLast && (
          <div className={`w-1 flex-1 bg-gradient-to-b ${config.lineColor} min-h-[100px] transition-all duration-300 group-hover/item:opacity-100`} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-8 sm:pb-10">
        {/* Date and badges */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
          <span className="text-sm font-semibold text-foreground">
            {format(new Date(video.video_date), "d MMMM yyyy", { locale: nl })}
          </span>
          {isFirst && (
            <Badge className="bg-gradient-to-r from-yellow-400 to-amber-500 text-amber-900 text-xs shadow-sm border-0">
              <Sparkles className="h-3 w-3 mr-1" />
              Nieuwste
            </Badge>
          )}
          {!isFirst && isNew && (
            <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs">
              Nieuw
            </Badge>
          )}
        </div>

        {/* Card with larger thumbnail */}
        <Card 
          className={`overflow-hidden cursor-pointer border-2 border-transparent hover:${config.borderColor} transition-all duration-300 group hover:shadow-xl hover:-translate-y-1`}
          onClick={() => onSelect(video)}
        >
          <div className="flex flex-col sm:flex-row">
            {/* Larger thumbnail */}
            <div className="relative w-full sm:w-56 md:w-64 aspect-video sm:aspect-[4/3] bg-muted overflow-hidden flex-shrink-0">
              {isPhoto && imageUrls.length > 0 ? (
                <img
                  src={imageUrls[0]}
                  alt={video.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : video.thumbnail_url ? (
                <img
                  src={video.thumbnail_url}
                  alt={video.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                  {isPhoto ? (
                    <Image className="h-12 w-12 text-muted-foreground/50" />
                  ) : (
                    <Video className="h-12 w-12 text-muted-foreground/50" />
                  )}
                </div>
              )}

              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                <div className={`w-14 h-14 rounded-full ${config.color} flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform`}>
                  {isPhoto ? (
                    <Image className="h-6 w-6 text-white" />
                  ) : (
                    <Play className="h-6 w-6 text-white ml-0.5" />
                  )}
                </div>
              </div>

              <Badge
                className="absolute top-2 right-2 shadow-sm"
                variant={isPhoto ? "secondary" : "default"}
              >
                {isPhoto ? <>📷 {imageUrls.length}</> : <>🎬</>}
              </Badge>
            </div>

            {/* Info */}
            <CardContent className="p-4 flex-1 flex flex-col justify-center">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge variant="outline" className={`text-xs flex items-center gap-1 ${config.badgeClass}`}>
                  <CategoryIcon className="h-3 w-3" />
                  {config.label}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {VIDEO_TYPE_LABELS[video.video_type] || video.video_type}
                </Badge>
              </div>
              <h3 className="font-semibold text-base sm:text-lg group-hover:text-primary transition-colors">
                {video.title}
              </h3>
              {video.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                  {video.description}
                </p>
              )}
            </CardContent>
          </div>
        </Card>
      </div>
    </div>
  );
}

interface MonthGroupHeaderProps {
  month: string;
  year: string;
  count: number;
}

function MonthGroupHeader({ month, year, count }: MonthGroupHeaderProps) {
  return (
    <div className="flex items-center gap-4 py-4 mb-2">
      <div className="flex items-center gap-3 bg-gradient-to-r from-primary/10 to-transparent px-4 py-2 rounded-full">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <CalendarDays className="h-4 w-4 text-primary" />
        </div>
        <span className="font-bold text-lg capitalize">{month}</span>
        <span className="text-muted-foreground">{year}</span>
        <Badge variant="secondary" className="ml-1">
          {count} {count === 1 ? 'update' : 'updates'}
        </Badge>
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
    </div>
  );
}

interface TimelineViewProps {
  saleVideos: VideoLink[];
  projectVideos: VideoLink[];
  cityVideos: VideoLink[];
  onSelectVideo: (video: ProjectVideo) => void;
}

function TimelineView({ saleVideos, projectVideos, cityVideos, onSelectVideo }: TimelineViewProps) {
  // Combine all videos with their category and sort by date
  const allVideos = useMemo(() => {
    return [
      ...saleVideos.map(v => ({ ...v, category: 'sale' as const })),
      ...projectVideos.map(v => ({ ...v, category: 'project' as const })),
      ...cityVideos.map(v => ({ ...v, category: 'city' as const })),
    ].sort((a, b) => new Date(b.project_videos.video_date).getTime() - new Date(a.project_videos.video_date).getTime());
  }, [saleVideos, projectVideos, cityVideos]);

  // Group videos by month
  const groupedByMonth = useMemo(() => {
    const groups: { monthKey: string; month: string; year: string; videos: typeof allVideos }[] = [];
    
    allVideos.forEach(video => {
      const date = new Date(video.project_videos.video_date);
      const monthKey = format(date, 'yyyy-MM');
      const month = format(date, 'MMMM', { locale: nl });
      const year = format(date, 'yyyy');
      
      const existingGroup = groups.find(g => g.monthKey === monthKey);
      if (existingGroup) {
        existingGroup.videos.push(video);
      } else {
        groups.push({ monthKey, month, year, videos: [video] });
      }
    });
    
    return groups;
  }, [allVideos]);

  if (allVideos.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <Video className="h-8 w-8 text-muted-foreground/60" />
        </div>
        <p className="text-muted-foreground font-medium">Nog geen updates</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Zodra er updates zijn, verschijnen ze hier in chronologische volgorde.
        </p>
      </div>
    );
  }

  let globalIndex = 0;

  return (
    <div className="space-y-2">
      {groupedByMonth.map((group) => (
        <div key={group.monthKey}>
          <MonthGroupHeader month={group.month} year={group.year} count={group.videos.length} />
          <div className="space-y-0 pl-1 sm:pl-2">
            {group.videos.map((link, indexInGroup) => {
              const currentGlobalIndex = globalIndex++;
              return (
                <EnhancedTimelineItem
                  key={link.id}
                  video={link.project_videos}
                  onSelect={onSelectVideo}
                  isFirst={currentGlobalIndex === 0}
                  isLast={currentGlobalIndex === allVideos.length - 1}
                  category={link.category}
                  animationDelay={currentGlobalIndex * 100}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

interface VideoGridProps {
  videos: VideoLink[];
  onSelectVideo: (video: ProjectVideo) => void;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  emptySubtext?: string;
}

function VideoGrid({ videos, onSelectVideo, emptyMessage = "Geen updates beschikbaar", emptyIcon, emptySubtext }: VideoGridProps) {
  if (videos.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          {emptyIcon || <Video className="h-8 w-8 text-muted-foreground/60" />}
        </div>
        <p className="text-muted-foreground font-medium">{emptyMessage}</p>
        {emptySubtext && (
          <p className="text-sm text-muted-foreground/70 mt-1 max-w-md mx-auto">{emptySubtext}</p>
        )}
      </div>
    );
  }

  const featuredVideo = videos[0];
  const remainingVideos = videos.slice(1);

  return (
    <div className="space-y-6">
      {featuredVideo && (
        <FeaturedUpdate video={featuredVideo.project_videos} onSelect={onSelectVideo} />
      )}
      
      {remainingVideos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {remainingVideos.map((link) => (
            <VideoCard key={link.id} link={link} onSelect={onSelectVideo} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Bouwupdates() {
  const { data: sale, isLoading: saleLoading } = useCustomerSale();
  const { data: updates, isLoading: updatesLoading } = useSaleBuildUpdates(sale?.id || null);
  const [selectedVideo, setSelectedVideo] = useState<ProjectVideo | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('timeline');

  const isLoading = saleLoading || updatesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!sale) {
    return (
      <LockedPhaseContent
        phaseName="Bouwupdates"
        phaseNumber={3}
        title="Bouwupdates"
        description="Deze sectie wordt beschikbaar wanneer je een aankoop hebt gedaan."
        comingSoonFeatures={[
          "Updates van jouw specifieke woning",
          "Voortgang van het volledige project",
          "Informatie over de gemeente"
        ]}
        ctaText="Bekijk projecten"
        ctaLink="/dashboard/projecten"
      />
    );
  }

  const handlePrevImage = () => {
    if (selectedVideo?.image_urls) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? selectedVideo.image_urls.length - 1 : prev - 1
      );
    }
  };

  const handleNextImage = () => {
    if (selectedVideo?.image_urls) {
      setCurrentImageIndex((prev) =>
        prev === selectedVideo.image_urls.length - 1 ? 0 : prev + 1
      );
    }
  };

  const handleSelectVideo = (video: ProjectVideo) => {
    setSelectedVideo(video);
    setCurrentImageIndex(0);
  };

  const saleCount = updates?.saleVideos.length || 0;
  const projectCount = updates?.projectVideos.length || 0;
  const cityCount = updates?.cityVideos.length || 0;
  const totalUpdates = saleCount + projectCount + cityCount;

  return (
    <>
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        {/* Mobile back button */}
        <div className="md:hidden">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
            <Link to="/dashboard/mijn-woning">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Terug naar Mijn Woning
            </Link>
          </Button>
        </div>

        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Video className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Bouwupdates</h1>
              <p className="text-muted-foreground mt-1">
                Volg de voortgang van jouw woning, het project en de omgeving
              </p>
            </div>
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {totalUpdates} {totalUpdates === 1 ? 'update' : 'updates'}
            </Badge>
          </div>

          {/* Project context banner */}
          {updates?.projectName && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="font-medium">{updates.projectName}</span>
              {updates.cityName && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{updates.cityName}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* View Mode Toggle & Content */}
        {totalUpdates > 0 ? (
          <div className="space-y-6">
            {/* View toggle */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {viewMode === 'timeline' ? 'Alle updates chronologisch' : 'Updates per categorie'}
              </p>
              <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                <Toggle
                  pressed={viewMode === 'timeline'}
                  onPressedChange={() => setViewMode('timeline')}
                  size="sm"
                  className="data-[state=on]:bg-background data-[state=on]:shadow-sm"
                  aria-label="Timeline weergave"
                >
                  <GitBranch className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline text-xs">Timeline</span>
                </Toggle>
                <Toggle
                  pressed={viewMode === 'grid'}
                  onPressedChange={() => setViewMode('grid')}
                  size="sm"
                  className="data-[state=on]:bg-background data-[state=on]:shadow-sm"
                  aria-label="Grid weergave"
                >
                  <LayoutGrid className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline text-xs">Categorieën</span>
                </Toggle>
              </div>
            </div>

            {viewMode === 'timeline' ? (
              <TimelineView
                saleVideos={updates?.saleVideos || []}
                projectVideos={updates?.projectVideos || []}
                cityVideos={updates?.cityVideos || []}
                onSelectVideo={handleSelectVideo}
              />
            ) : (
              <Tabs defaultValue="woning" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 h-12">
                  <TabsTrigger value="woning" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Home className="h-4 w-4" />
                    <span className="hidden sm:inline">Mijn Woning</span>
                    <span className="sm:hidden">Woning</span>
                    {saleCount > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                        {saleCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="project" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Building2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Project</span>
                    {projectCount > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                        {projectCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="gemeente" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="hidden sm:inline">Gemeente</span>
                    {cityCount > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                        {cityCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="woning" className="mt-6">
                  <VideoGrid
                    videos={updates?.saleVideos || []}
                    onSelectVideo={handleSelectVideo}
                    emptyMessage="Nog geen updates van jouw woning"
                    emptyIcon={<Home className="h-8 w-8 text-muted-foreground/60" />}
                    emptySubtext="Zodra er exclusieve updates zijn over jouw specifieke woning, vind je ze hier. We houden je op de hoogte!"
                  />
                </TabsContent>

                <TabsContent value="project" className="mt-6">
                  <VideoGrid
                    videos={updates?.projectVideos || []}
                    onSelectVideo={handleSelectVideo}
                    emptyMessage="Nog geen projectupdates"
                    emptyIcon={<Building2 className="h-8 w-8 text-muted-foreground/60" />}
                    emptySubtext="Updates over de algemene voortgang van het project verschijnen hier zodra ze beschikbaar zijn."
                  />
                </TabsContent>

                <TabsContent value="gemeente" className="mt-6">
                  <VideoGrid
                    videos={updates?.cityVideos || []}
                    onSelectVideo={handleSelectVideo}
                    emptyMessage={`Nog geen updates over ${updates?.cityName || 'de gemeente'}`}
                    emptyIcon={<MapPin className="h-8 w-8 text-muted-foreground/60" />}
                    emptySubtext="Informatie en impressies van de gemeente waar jouw woning staat verschijnen hier."
                  />
                </TabsContent>
              </Tabs>
            )}
          </div>
        ) : (
          <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
                <Construction className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Binnenkort beschikbaar</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Zodra er updates zijn over jouw woning, het project of de gemeente, vind je ze hier terug. 
                We werken hard om je op de hoogte te houden!
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Video/Photo Dialog */}
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl">
          {selectedVideo && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedVideo.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                  {selectedVideo.media_type === "photo" && selectedVideo.image_urls?.length > 0 ? (
                    <>
                      <img
                        src={selectedVideo.image_urls[currentImageIndex]}
                        alt={`${selectedVideo.title} - ${currentImageIndex + 1}`}
                        className="w-full h-full object-contain bg-black"
                      />
                      {selectedVideo.image_urls.length > 1 && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrevImage();
                            }}
                          >
                            <ChevronLeft className="h-6 w-6" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNextImage();
                            }}
                          >
                            <ChevronRight className="h-6 w-6" />
                          </Button>
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full text-white text-sm">
                            {currentImageIndex + 1} / {selectedVideo.image_urls.length}
                          </div>
                        </>
                      )}
                    </>
                  ) : getYouTubeEmbedUrl(selectedVideo.video_url) ? (
                    <iframe
                      src={`${getYouTubeEmbedUrl(selectedVideo.video_url)}?autoplay=1`}
                      title={selectedVideo.title}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : selectedVideo.video_url ? (
                    <video
                      src={selectedVideo.video_url}
                      controls
                      autoPlay
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <p className="text-muted-foreground">Geen media beschikbaar</p>
                    </div>
                  )}
                </div>

                {/* Thumbnail strip for photos */}
                {selectedVideo.media_type === "photo" && selectedVideo.image_urls?.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {selectedVideo.image_urls.map((url, index) => (
                      <button
                        key={url}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${
                          index === currentImageIndex ? "border-primary" : "border-transparent"
                        }`}
                      >
                        <img src={url} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Badge variant="outline">
                    {VIDEO_TYPE_LABELS[selectedVideo.video_type] || selectedVideo.video_type}
                  </Badge>
                  <Badge variant={selectedVideo.media_type === "photo" ? "secondary" : "default"}>
                    {selectedVideo.media_type === "photo"
                      ? `📷 ${selectedVideo.image_urls?.length || 0} foto's`
                      : "🎬 Video"}
                  </Badge>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(selectedVideo.video_date), "d MMMM yyyy", { locale: nl })}
                  </span>
                </div>
                {selectedVideo.description && (
                  <p className="text-muted-foreground">{selectedVideo.description}</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
