import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Heart, X, Eye, MapPin, Loader2, ExternalLink, Star } from "lucide-react";
import { AssignedProject } from "@/hooks/useAssignedProjects";
import { cn } from "@/lib/utils";
import { statusConfig, formatPrice, isProjectSoldOut } from "@/lib/selection-utils";

interface CompactSelectionCardProps {
  selection: AssignedProject;
  onStatusChange: (params: { selectionId: string; status: AssignedProject['status'] }) => void;
  onPromoteFavorite?: (params: { projectId: string; status: AssignedProject['status']; notes?: string }) => void;
  isUpdating?: boolean;
  // Note: Compact view does not support notes editing - use UnifiedSelectionCard for full functionality
}

export function CompactSelectionCard({ 
  selection, 
  onStatusChange,
  onPromoteFavorite,
  isUpdating,
}: CompactSelectionCardProps) {
  const { project } = selection;
  const config = statusConfig[selection.status];
  const isFavorite = selection.source === 'favorite';
  const isRejected = selection.status === 'rejected';
  const isSoldOut = isProjectSoldOut(project);


  const handleStatusChange = (status: AssignedProject['status']) => {
    if (isFavorite && onPromoteFavorite) {
      onPromoteFavorite({ projectId: selection.project_id, status });
    } else {
      onStatusChange({ selectionId: selection.id, status });
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border bg-card transition-all hover:shadow-sm",
      isRejected && "opacity-60",
      isSoldOut && !isRejected && "opacity-75",
      selection.source === 'admin' && "ring-1 ring-amber-300/50"
    )}>
      {/* Thumbnail */}
      <div className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden">
        {project.featured_image ? (
          <img 
            src={project.featured_image} 
            alt={project.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        
        {/* Source indicator */}
        <div className={cn(
          "absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center",
          isFavorite ? "bg-rose-500" : "bg-primary"
        )}>
          {isFavorite ? (
            <Heart className="h-3 w-3 text-white fill-current" />
          ) : (
            <Star className="h-3 w-3 text-white" />
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">
          {project.display_title || project.name}
        </h4>
        <p className="text-xs text-muted-foreground truncate">
          {project.city}{project.region && `, ${project.region}`}
        </p>
        <p className="text-xs font-medium mt-0.5">
          {isSoldOut ? (
            <span className="text-destructive">Uitverkocht</span>
          ) : (
            project.price_from && project.price_to 
              ? `${formatPrice(project.price_from)} - ${formatPrice(project.price_to)}`
              : `Vanaf ${formatPrice(project.price_from || project.price_to)}`
          )}
        </p>
      </div>

      {/* Status badge */}
      <Badge variant="outline" className={cn("flex-shrink-0 text-xs", config.color)}>
        <config.icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <a 
            href={`/dashboard/project/${project.id}`} 
            target="_blank" 
            rel="noopener noreferrer"
            title="Bekijk details"
          >
            <Eye className="h-4 w-4" />
          </a>
        </Button>

        {selection.status === 'suggested' && (
          <>
            {!isSoldOut && (
              <Button 
                size="icon"
                className="h-8 w-8 bg-teal-600 hover:bg-teal-700"
                onClick={() => handleStatusChange('interested')}
                disabled={isUpdating}
                title="Spreekt me aan"
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button 
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => handleStatusChange('rejected')}
              disabled={isUpdating}
              title="Sla over"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        )}

        {selection.status === 'interested' && (
          <>
            {!isSoldOut && (
              <Button 
                size="icon"
                className="h-8 w-8 bg-purple-600 hover:bg-purple-700"
                onClick={() => handleStatusChange('to_visit')}
                disabled={isUpdating}
                title="Wil bezoeken"
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button 
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => handleStatusChange('suggested')}
              disabled={isUpdating}
              title="Terugzetten"
            >
              {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
              {!isUpdating && <X className="h-4 w-4" />}
            </Button>
          </>
        )}

        {selection.status === 'to_visit' && (
          <Button 
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={() => handleStatusChange('interested')}
            disabled={isUpdating}
            title="Terug naar spreekt me aan"
          >
            {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
            {!isUpdating && <Heart className="h-4 w-4" />}
          </Button>
        )}

        {selection.status === 'rejected' && (
          <Button 
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={() => handleStatusChange('suggested')}
            disabled={isUpdating}
            title="Terugzetten"
          >
            {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
            {!isUpdating && <Star className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}
