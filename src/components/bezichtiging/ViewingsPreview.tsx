import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { Clock, MapPin, ArrowRight, Home } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { EnrichedViewing } from "@/hooks/useEnrichedTrips";

interface ViewingsPreviewProps {
  viewings: EnrichedViewing[];
  totalCount: number;
}

export function ViewingsPreview({ viewings, totalCount }: ViewingsPreviewProps) {
  // Show max 3 viewings
  const previewViewings = viewings.slice(0, 3);
  const remainingCount = totalCount - previewViewings.length;

  if (previewViewings.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Home className="h-4 w-4 text-primary" />
          Geplande bezichtigingen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {previewViewings.map((viewing, index) => (
          <Link 
            to="/dashboard/bezichtiging"
            key={viewing.id || index}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
          >
            {/* Project image */}
            <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
              {viewing.project_featured_image ? (
                <img 
                  src={viewing.project_featured_image} 
                  alt={viewing.project_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Home className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Viewing details */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{viewing.project_name}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {viewing.time}
                </span>
                {viewing.date && (
                  <span>
                    {format(parseISO(viewing.date), "d MMM", { locale: nl })}
                  </span>
                )}
              </div>
              {viewing.showhouse_address && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 truncate">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{viewing.showhouse_address}</span>
                </p>
              )}
            </div>

            {/* Arrow */}
            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </Link>
        ))}

        {/* Show remaining count and link */}
        <div className="pt-2">
          <Button variant="outline" asChild className="w-full">
            <Link to="/dashboard/bezichtiging">
              {remainingCount > 0 
                ? `+ ${remainingCount} meer bezichtigingen bekijken`
                : "Bekijk volledige planning"
              }
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
