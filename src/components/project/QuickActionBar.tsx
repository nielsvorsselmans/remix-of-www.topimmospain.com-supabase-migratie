import { Button } from "@/components/ui/button";
import { Sparkles, X, Check, Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Status = "interested" | "suggested" | "rejected" | "visited" | "to_visit";

interface QuickActionBarProps {
  selectedStatus: Status | null;
  onStatusChange: (status: Status) => void;
  availableCount: number;
  priceFrom?: number | null;
  isFavorite?: boolean;
  isPreviewMode?: boolean;
  isUpdating?: boolean;
  isSoldOut?: boolean;
  className?: string;
}

export function QuickActionBar({
  selectedStatus,
  onStatusChange,
  availableCount,
  priceFrom,
  isFavorite = false,
  isPreviewMode = false,
  isUpdating = false,
  isSoldOut = false,
  className,
}: QuickActionBarProps) {

  return (
    <div className={cn(
      "sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border py-3 px-4 -mx-4 md:-mx-0 md:rounded-lg md:border md:shadow-sm",
      className
    )}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Left side: Quick info */}
        <div className="flex items-center gap-4 text-sm">
          {isSoldOut ? (
            <span className="font-semibold text-destructive">Uitverkocht</span>
          ) : (
            <>
              <div>
                <span className="text-muted-foreground">Vanaf </span>
                <span className="font-semibold text-foreground">{formatPrice(priceFrom ?? null)}</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div>
                <span className="font-medium text-primary">{availableCount}</span>
                <span className="text-muted-foreground"> beschikbaar</span>
              </div>
            </>
          )}
        </div>

        {/* Right side: Action buttons */}
        <TooltipProvider>
          <div className="flex items-center gap-2">
            {!isSoldOut && (
              <Button
                size="sm"
                variant={selectedStatus === 'interested' ? 'default' : 'outline'}
                onClick={() => onStatusChange('interested')}
                disabled={isPreviewMode || isUpdating}
                className={cn(
                  "gap-1.5",
                  selectedStatus === 'interested' && "bg-teal-600 hover:bg-teal-700 border-teal-600"
                )}
              >
                {isUpdating && selectedStatus === 'interested' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">Spreekt me aan</span>
              </Button>
            )}

            {!isSoldOut && (
              <Button
                size="sm"
                variant={selectedStatus === 'to_visit' ? 'default' : 'outline'}
                onClick={() => onStatusChange('to_visit')}
                disabled={isPreviewMode || isUpdating}
                className={cn(
                  "gap-1.5",
                  selectedStatus === 'to_visit' && "bg-purple-600 hover:bg-purple-700 border-purple-600"
                )}
              >
                {isUpdating && selectedStatus === 'to_visit' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <MapPin className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">Wil bezoeken</span>
              </Button>
            )}
            
            {!isSoldOut && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      variant={selectedStatus === 'suggested' ? 'default' : 'outline'}
                      onClick={() => onStatusChange('suggested')}
                      disabled={isFavorite || isPreviewMode || isUpdating}
                      className="gap-1.5"
                    >
                      {isUpdating && selectedStatus === 'suggested' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      <span className="hidden sm:inline">Twijfel</span>
                    </Button>
                  </span>
                </TooltipTrigger>
                {isFavorite && (
                  <TooltipContent>
                    <p>Deze status is alleen beschikbaar voor door ons voorgestelde projecten</p>
                  </TooltipContent>
                )}
              </Tooltip>
            )}
            
            <Button
              size="sm"
              variant={selectedStatus === 'rejected' ? 'default' : 'outline'}
              onClick={() => onStatusChange('rejected')}
              disabled={isPreviewMode || isUpdating}
              className={cn(
                "gap-1.5",
                selectedStatus === 'rejected' && "bg-muted text-muted-foreground border-muted"
              )}
            >
              {isUpdating && selectedStatus === 'rejected' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">Sla over</span>
            </Button>
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
}
