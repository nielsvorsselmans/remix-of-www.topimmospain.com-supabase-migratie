import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Heart, X, Eye, MapPin, MessageSquare, Loader2, ExternalLink, Star } from "lucide-react";
import { AssignedProject } from "@/hooks/useAssignedProjects";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { statusConfig, formatPrice, isProjectSoldOut } from "@/lib/selection-utils";

interface UnifiedSelectionCardProps {
  selection: AssignedProject;
  onStatusChange: (params: { selectionId: string; status: AssignedProject['status'] }) => void;
  onNotesChange: (params: { selectionId: string; notes: string }) => void;
  onPromoteFavorite?: (params: { projectId: string; status: AssignedProject['status']; notes?: string }) => void;
  isUpdating?: boolean;
  isPreviewMode?: boolean;
}

export function UnifiedSelectionCard({ 
  selection, 
  onStatusChange, 
  onNotesChange,
  onPromoteFavorite,
  isUpdating,
  isPreviewMode = false
}: UnifiedSelectionCardProps) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(selection.customer_notes || "");
  const { project } = selection;
  const config = statusConfig[selection.status];
  const isFavorite = selection.source === 'favorite';
  const isRejected = selection.status === 'rejected';
  const isSoldOut = isProjectSoldOut(project);
  const isMobile = useIsMobile();


  const handleSaveNotes = () => {
    if (isFavorite || isPreviewMode) return;
    onNotesChange({ selectionId: selection.id, notes });
    setShowNotes(false);
  };

  const handleStatusChange = (status: AssignedProject['status']) => {
    if (isPreviewMode) return; // Block mutations in preview mode
    if (isFavorite && onPromoteFavorite) {
      onPromoteFavorite({ projectId: selection.project_id, status, notes: notes || undefined });
    } else {
      onStatusChange({ selectionId: selection.id, status });
    }
  };

  // Mobile vertical card layout with larger images and better touch targets
  if (isMobile) {
    return (
      <Card className={cn(
        "overflow-hidden transition-all",
        isRejected && "opacity-60",
        isSoldOut && !isRejected && "opacity-75",
        selection.source === 'admin' && "ring-1 ring-amber-300/50"
      )}>
        {/* Hero Image - Full width, 16:9 aspect ratio */}
        <div className="relative aspect-[16/9] w-full">
          {project.featured_image ? (
            <img 
              src={project.featured_image} 
              alt={project.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <MapPin className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          
          {/* Source Badge - Top left on image */}
          <Badge 
            className={cn(
              "absolute top-2 left-2 text-xs",
              isFavorite 
                ? "bg-rose-500 text-white" 
                : "bg-primary text-primary-foreground"
            )}
          >
            {isFavorite ? (
              <>
                <Heart className="h-3 w-3 mr-1 fill-current" />
                Jouw keuze
              </>
            ) : (
              <>
                <Star className="h-3 w-3 mr-1" />
                Adviseur
              </>
            )}
          </Badge>

          {/* Priority badge */}
          {selection.priority > 0 && selection.source === 'admin' && (
            <Badge className="absolute top-2 right-2 bg-primary/90 text-xs">
              #{selection.priority}
            </Badge>
          )}

          {/* Sold out badge */}
          {isSoldOut && (
            <Badge variant="destructive" className="absolute bottom-2 left-2 text-xs">
              Uitverkocht
            </Badge>
          )}

          {/* Quick view button */}
          <Button 
            size="icon" 
            variant="secondary" 
            className="absolute bottom-2 right-2 h-8 w-8 bg-background/80 backdrop-blur-sm"
            asChild
          >
            <a 
              href={`/dashboard/project/${project.id}`} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>

        {/* Content */}
        <CardContent className="p-3">
          {/* Title and location - 2 lines max */}
          <h3 className="font-semibold text-base line-clamp-2 leading-tight mb-1">
            {project.display_title || project.name}
          </h3>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{project.city}{project.region && `, ${project.region}`}</span>
          </p>

          {/* Price - Prominent */}
          {isSoldOut ? (
            <p className="text-lg font-semibold text-destructive mb-3">Uitverkocht</p>
          ) : (
            <p className="text-lg font-semibold text-primary mb-3">
              {project.price_from && project.price_to 
                ? `${formatPrice(project.price_from)} - ${formatPrice(project.price_to)}`
                : `Vanaf ${formatPrice(project.price_from || project.price_to)}`
              }
            </p>
          )}

          {/* Admin notes */}
          {selection.admin_notes && selection.source === 'admin' && (
            <div className="bg-muted/50 rounded-md p-2 mb-3 text-sm">
              <p className="text-muted-foreground text-xs mb-0.5">💬 Notitie adviseur:</p>
              <p className="line-clamp-2">{selection.admin_notes}</p>
            </div>
          )}

          {/* Action buttons - Large touch targets */}
          <div className="flex items-center gap-2">
            {selection.status === 'suggested' && (
              <>
                {!isSoldOut && (
                  <Button 
                    className="h-11 text-sm bg-teal-600 hover:bg-teal-700 flex-1"
                    onClick={() => handleStatusChange('interested')}
                    disabled={isUpdating || isPreviewMode}
                  >
                    {isUpdating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-1.5" />
                        Spreekt me aan
                      </>
                    )}
                  </Button>
                )}
                <Button 
                  variant="outline"
                  className={cn("h-11 text-sm flex-1", isSoldOut && "w-full")}
                  onClick={() => handleStatusChange('rejected')}
                  disabled={isUpdating || isPreviewMode}
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-1.5" />
                      Sla over
                    </>
                  )}
                </Button>
              </>
            )}

            {(selection.status === 'interested' || selection.status === 'to_visit') && (
              <>
                {selection.status === 'interested' && !isSoldOut && (
                  <Button 
                    className="h-11 text-sm bg-purple-600 hover:bg-purple-700 flex-1"
                    onClick={() => handleStatusChange('to_visit')}
                    disabled={isUpdating || isPreviewMode}
                  >
                    {isUpdating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <MapPin className="h-4 w-4 mr-1.5" />
                        Wil bezoeken
                      </>
                    )}
                  </Button>
                )}
                <Button 
                  variant="outline"
                  className="h-11 text-sm flex-1"
                  onClick={() => handleStatusChange('suggested')}
                  disabled={isUpdating || isPreviewMode}
                >
                  {isUpdating && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                  Terugzetten naar te beoordelen
                </Button>
              </>
            )}

            {selection.status === 'rejected' && (
              <Button 
                variant="outline"
                className="h-11 text-sm w-full"
                onClick={() => handleStatusChange('suggested')}
                disabled={isUpdating || isPreviewMode}
              >
                {isUpdating && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Toch bekijken
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Desktop layout (original)
  return (
    <Card className={cn(
      "overflow-hidden transition-all",
      isRejected && "opacity-60",
      isSoldOut && !isRejected && "opacity-75",
      selection.source === 'admin' && "ring-1 ring-amber-300/50"
    )}>
      <div className="flex flex-col md:flex-row">
        {/* Image */}
        <div className="relative w-full md:w-48 h-40 md:h-auto flex-shrink-0">
          {project.featured_image ? (
            <img 
              src={project.featured_image} 
              alt={project.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <MapPin className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          
          {/* Source Badge - Left */}
          <Badge 
            className={cn(
              "absolute top-2 left-2",
              isFavorite 
                ? "bg-rose-500 text-white" 
                : "bg-primary text-primary-foreground"
            )}
          >
            {isFavorite ? (
              <>
                <Heart className="h-3 w-3 mr-1 fill-current" />
                Favoriet
              </>
            ) : (
              <>
                <Star className="h-3 w-3 mr-1" />
                Adviseur
              </>
            )}
          </Badge>

          {/* Priority badge for admin projects */}
          {selection.priority > 0 && selection.source === 'admin' && (
            <Badge className="absolute bottom-2 left-2 bg-primary/90">
              Prioriteit {selection.priority}
            </Badge>
          )}

          {/* Sold out badge */}
          {isSoldOut && (
            <Badge variant="destructive" className="absolute top-2 right-2">
              Uitverkocht
            </Badge>
          )}
        </div>

        {/* Content */}
        <CardContent className="flex-1 p-4">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">
                  {project.display_title || project.name}
                </h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{project.city}{project.region && `, ${project.region}`}</span>
                </p>
              </div>
              
              {/* Status Badge */}
              <Badge variant="outline" className={cn("flex-shrink-0", config.color)}>
                <config.icon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
            </div>

            {/* Price */}
            {isSoldOut ? (
              <p className="text-sm font-medium text-destructive mb-3">Uitverkocht</p>
            ) : (
              <p className="text-sm font-medium mb-3">
                {project.price_from && project.price_to 
                  ? `${formatPrice(project.price_from)} - ${formatPrice(project.price_to)}`
                  : `Vanaf ${formatPrice(project.price_from || project.price_to)}`
                }
              </p>
            )}

            {/* Admin notes (only for admin-assigned projects) */}
            {selection.admin_notes && selection.source === 'admin' && (
              <div className="bg-muted/50 rounded-md p-2 mb-3 text-sm">
                <p className="text-muted-foreground text-xs mb-1">Notitie van je adviseur:</p>
                <p>{selection.admin_notes}</p>
              </div>
            )}

            {/* Customer notes input */}
            {showNotes && (
              <div className="mb-3 space-y-2">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Jouw notities over dit project..."
                  rows={3}
                  disabled={isPreviewMode}
                />
                <div className="flex gap-2">
                  {!isFavorite && !isPreviewMode && (
                    <Button size="sm" onClick={handleSaveNotes} disabled={isUpdating}>
                      Opslaan
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setShowNotes(false)}>
                    {isFavorite ? "Sluiten" : "Annuleren"}
                  </Button>
                </div>
                {isFavorite && !isPreviewMode && (
                  <p className="text-xs text-muted-foreground">
                    Je notitie wordt opgeslagen wanneer je het project beoordeelt.
                  </p>
                )}
              </div>
            )}

            {/* Customer notes display */}
            {!showNotes && selection.customer_notes && (
              <div className="bg-primary/5 rounded-md p-2 mb-3 text-sm">
                <p className="text-muted-foreground text-xs mb-1">Jouw notitie:</p>
                <p>{selection.customer_notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 mt-auto pt-2">
              <Button asChild variant="outline" size="sm">
                <a 
                  href={`/dashboard/project/${project.id}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Bekijk Details
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>

              {selection.status === 'suggested' && !isSoldOut && (
              <Button 
                size="sm" 
                variant="default"
                onClick={() => handleStatusChange('interested')}
                disabled={isUpdating}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1" />
                )}
                Spreekt me aan
                </Button>
              )}

              {selection.status === 'interested' && (
                <>
                  {!isSoldOut && (
                    <Button 
                      size="sm" 
                      variant="default"
                      onClick={() => handleStatusChange('to_visit')}
                      disabled={isUpdating}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {isUpdating ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <MapPin className="h-4 w-4 mr-1" />
                      )}
                      Wil bezoeken
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleStatusChange('suggested')}
                    disabled={isUpdating}
                  >
                    {isUpdating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    Terugzetten
                  </Button>
                </>
              )}

              {selection.status === 'to_visit' && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleStatusChange('interested')}
                  disabled={isUpdating}
                >
                  {isUpdating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Terug naar spreekt me aan
                </Button>
              )}

              {selection.status !== 'rejected' && (
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => handleStatusChange('rejected')}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                  <X className="h-4 w-4 mr-1" />
                )}
                Sla over
                </Button>
              )}

              {selection.status === 'rejected' && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleStatusChange('suggested')}
                  disabled={isUpdating}
                >
                  {isUpdating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Terugzetten
                </Button>
              )}

              {!showNotes && (
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => setShowNotes(true)}
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  {selection.customer_notes ? "Bewerk" : "Notitie"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
