import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BedDouble, Bath, Waves, Info, MessageSquare } from "lucide-react";

interface ProjectStats {
  minBedrooms: number;
  maxBedrooms: number;
  minBathrooms: number;
  maxBathrooms: number;
  availableCount: number;
  minDistanceToBeach: number | null;
}

interface ProjectOverviewCardProps {
  description?: string | null;
  stats: ProjectStats | null;
  adminNotes?: string | null;
  showAdminNotes?: boolean;
}

export function ProjectOverviewCard({
  description,
  stats,
  adminNotes,
  showAdminNotes = false,
}: ProjectOverviewCardProps) {
  const formatRange = (min: number, max: number) => 
    min === max ? min.toString() : `${min} - ${max}`;

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        {/* Header with inline admin note */}
        <div className="flex flex-col md:flex-row md:items-start gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <Info className="h-4 w-4 text-primary" />
            <span className="font-semibold">Over dit project</span>
          </div>
          
          {/* Admin notes inline - more subtle */}
          {showAdminNotes && adminNotes && (
            <div className="flex items-start gap-2 md:ml-auto bg-primary/5 border border-primary/20 rounded px-3 py-1.5 max-w-md">
              <MessageSquare className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground line-clamp-2">{adminNotes}</p>
            </div>
          )}
        </div>

        {/* Stats and description in row on desktop */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Quick stats - compact inline badges */}
          {stats && (
            <div className="flex flex-wrap gap-2 md:flex-col md:gap-1.5 shrink-0">
              <div className="flex items-center gap-1.5 text-sm bg-muted/50 rounded-full px-2.5 py-1">
                <BedDouble className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium">{formatRange(stats.minBedrooms, stats.maxBedrooms)}</span>
                <span className="text-muted-foreground text-xs">slk</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm bg-muted/50 rounded-full px-2.5 py-1">
                <Bath className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium">{formatRange(stats.minBathrooms, stats.maxBathrooms)}</span>
                <span className="text-muted-foreground text-xs">bdk</span>
              </div>
              {stats.minDistanceToBeach && (
                <div className="flex items-center gap-1.5 text-sm bg-muted/50 rounded-full px-2.5 py-1">
                  <Waves className="h-3.5 w-3.5 text-primary" />
                  <span className="font-medium">
                    {stats.minDistanceToBeach >= 1000 
                      ? `${(stats.minDistanceToBeach / 1000).toFixed(1)} km` 
                      : `${stats.minDistanceToBeach} m`}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {description && (
            <p className="text-muted-foreground text-sm leading-relaxed line-clamp-4 md:line-clamp-none">
              {description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
