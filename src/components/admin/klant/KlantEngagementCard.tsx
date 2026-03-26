import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Heart, FileText, Clock, MousePointer, TrendingUp, ExternalLink } from "lucide-react";
import { Klant, klantToVisitorProfile } from "@/hooks/useKlant";
import { VisitorDetailSheet } from "@/components/admin/VisitorDetailSheet";

interface KlantEngagementCardProps {
  klant: Klant;
}

export function KlantEngagementCard({ klant }: KlantEngagementCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const engagement = klant.engagement_data || {};
  const inferred = klant.inferred_preferences || {};
  const visitorProfile = klantToVisitorProfile(klant);

  const formatDuration = (seconds: number) => {
    if (!seconds) return "0 min";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}u ${remainingMinutes}m`;
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Website Gedrag</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setDetailOpen(true)}
            className="h-8 px-2"
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Details
          </Button>
        </CardHeader>
      <CardContent className="space-y-4">
        {/* Engagement metrics */}
        <div className="grid grid-cols-2 gap-3">
          <MetricBox
            icon={MousePointer}
            label="Bezoeken"
            value={engagement.total_visits || 0}
          />
          <MetricBox
            icon={Eye}
            label="Pagina's"
            value={engagement.total_page_views || 0}
          />
          <MetricBox
            icon={FileText}
            label="Projecten"
            value={engagement.total_project_views || 0}
          />
          <MetricBox
            icon={Heart}
            label="Favorieten"
            value={klant.favorite_projects?.length || 0}
          />
        </div>

        {/* Time on site */}
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Totale tijd:</span>
          <span className="text-sm font-medium">
            {formatDuration(engagement.total_time_on_site_seconds || 0)}
          </span>
        </div>

        {/* Inferred preferences */}
        {(inferred.budget_min || inferred.budget_max || inferred.common_regions?.length > 0) && (
          <div className="border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Afgeleide Voorkeuren</p>
            
            {(inferred.budget_min || inferred.budget_max) && (
              <div className="flex items-center gap-2 text-sm mb-1">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Budget:</span>
                <span className="font-medium">
                  €{((inferred.budget_min || 0) / 1000).toFixed(0)}k - €{((inferred.budget_max || 0) / 1000).toFixed(0)}k
                </span>
              </div>
            )}

            {inferred.common_regions?.length > 0 && (
              <div className="flex items-start gap-2 text-sm">
                <span className="text-muted-foreground">Regio's:</span>
                <span className="font-medium">
                  {inferred.common_regions.slice(0, 3).join(", ")}
                </span>
              </div>
            )}

            {inferred.common_cities?.length > 0 && (
              <div className="flex items-start gap-2 text-sm">
                <span className="text-muted-foreground">Steden:</span>
                <span className="font-medium">
                  {inferred.common_cities.slice(0, 3).join(", ")}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
      
      <VisitorDetailSheet 
        visitor={visitorProfile}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}

function MetricBox({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="p-2 bg-muted/50 rounded-lg text-center">
      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
        <Icon className="h-3 w-3" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
