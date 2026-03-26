import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Eye, Calendar, MapPin, Euro } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { PartnerKlant } from "@/hooks/usePartnerKlant";

interface PartnerKlantEngagementCardProps {
  klant: PartnerKlant;
}

export function PartnerKlantEngagementCard({ klant }: PartnerKlantEngagementCardProps) {
  const engagement = klant.engagement_data || {};
  const inferred = klant.inferred_preferences || {};

  const totalPageViews = engagement.total_page_views || 0;
  const totalProjectViews = engagement.total_project_views || 0;
  const totalVisits = engagement.total_visits || 0;

  // Calculate engagement score
  let score = 0;
  score += Math.min(totalPageViews * 2, 30);
  score += Math.min(totalProjectViews * 4, 40);
  if (inferred.budget_min && inferred.budget_max) score += 20;
  if (inferred.common_regions?.length > 0) score += 10;
  const engagementScore = Math.min(score, 100);

  const getEngagementLabel = (score: number) => {
    if (score >= 70) return { label: "Hoog", className: "bg-green-500" };
    if (score >= 40) return { label: "Gemiddeld", className: "bg-orange-500" };
    return { label: "Laag", className: "" };
  };

  const engagementConfig = getEngagementLabel(engagementScore);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Engagement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold">{engagementScore}</p>
            <p className="text-xs text-muted-foreground">van 100 punten</p>
          </div>
          <Badge className={engagementConfig.className}>{engagementConfig.label}</Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-semibold">{totalVisits}</p>
            <p className="text-xs text-muted-foreground">Bezoeken</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-semibold">{totalPageViews}</p>
            <p className="text-xs text-muted-foreground">Pagina's</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-semibold">{totalProjectViews}</p>
            <p className="text-xs text-muted-foreground">Projecten</p>
          </div>
        </div>

        {/* Inferred preferences */}
        {(inferred.budget_min || inferred.common_regions?.length > 0) && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Afgeleide voorkeuren
            </p>
            {inferred.budget_min && inferred.budget_max && (
              <div className="flex items-center gap-2 text-sm">
                <Euro className="h-3 w-3 text-muted-foreground" />
                <span>€{(inferred.budget_min / 1000).toFixed(0)}k - €{(inferred.budget_max / 1000).toFixed(0)}k</span>
              </div>
            )}
            {inferred.common_regions?.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span>{inferred.common_regions.slice(0, 3).join(", ")}</span>
              </div>
            )}
          </div>
        )}

        {/* Last visit */}
        {klant.last_visit_at && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
            <Calendar className="h-3 w-3" />
            Laatste bezoek: {format(new Date(klant.last_visit_at), "d MMM yyyy HH:mm", { locale: nl })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
