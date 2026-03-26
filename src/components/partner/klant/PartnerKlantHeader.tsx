import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { User, Calendar, Mail, Phone, Flame, Thermometer, Snowflake, AlertTriangle, TrendingUp } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { PartnerKlant } from "@/hooks/usePartnerKlant";

interface PartnerKlantHeaderProps {
  klant: PartnerKlant;
}

// Calculate lead score based on engagement data
function calculateLeadScore(klant: PartnerKlant): number {
  let score = 0;
  
  // Account status (20 points)
  if (klant.user_id) score += 20;
  
  // Journey phase progression (20 points max)
  const phaseScores: Record<string, number> = {
    orientatie: 5,
    selectie: 10,
    bezichtiging: 15,
    aankoop: 20,
  };
  score += phaseScores[klant.journey_phase || "orientatie"] || 0;
  
  // Viewed projects (15 points max)
  const viewedCount = klant.viewed_projects?.length || 0;
  score += Math.min(viewedCount * 3, 15);
  
  // Favorite projects (15 points max)
  const favoriteCount = klant.favorite_projects?.length || 0;
  score += Math.min(favoriteCount * 5, 15);
  
  // Assigned projects (10 points max)
  const assignedCount = klant.assigned_projects?.length || 0;
  score += Math.min(assignedCount * 5, 10);
  
  // Has trips (10 points)
  if (klant.trips?.length > 0) score += 10;
  
  // Recent activity (10 points)
  if (klant.last_visit_at) {
    const daysSinceVisit = Math.floor(
      (Date.now() - new Date(klant.last_visit_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceVisit <= 7) score += 10;
    else if (daysSinceVisit <= 14) score += 5;
    else if (daysSinceVisit <= 30) score += 2;
  }
  
  return Math.min(score, 100);
}

function getScoreColor(score: number): string {
  if (score >= 70) return "text-green-600 dark:text-green-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getScoreBgColor(score: number): string {
  if (score >= 70) return "bg-green-100 dark:bg-green-900/30";
  if (score >= 40) return "bg-amber-100 dark:bg-amber-900/30";
  return "bg-red-100 dark:bg-red-900/30";
}

function getJourneyPhaseBadge(phase: string | null) {
  const phases: Record<string, { label: string; className: string }> = {
    orientatie: { label: "Oriëntatie", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
    selectie: { label: "Selectie", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
    bezichtiging: { label: "Bezichtiging", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
    aankoop: { label: "Aankoop", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  };

  const config = phases[phase || "orientatie"] || phases.orientatie;
  return <Badge className={config.className}>{config.label}</Badge>;
}

function getLeadTemperatureBadge(temperature: string | null) {
  if (!temperature) return null;
  
  const tempConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    hot: { 
      label: "Warm", 
      icon: <Flame className="h-3 w-3" />, 
      className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" 
    },
    warm: { 
      label: "Lauw", 
      icon: <Thermometer className="h-3 w-3" />, 
      className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" 
    },
    cold: { 
      label: "Koud", 
      icon: <Snowflake className="h-3 w-3" />, 
      className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" 
    },
  };

  const config = tempConfig[temperature.toLowerCase()];
  if (!config) return null;

  return (
    <Badge className={`${config.className} flex items-center gap-1`}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

export function PartnerKlantHeader({ klant }: PartnerKlantHeaderProps) {
  const fullName = [klant.first_name, klant.last_name].filter(Boolean).join(" ") || "Onbekend";
  const leadScore = calculateLeadScore(klant);
  const isDroppedOff = !!klant.dropped_off_at;

  const handleEmailClick = () => {
    if (klant.email) {
      window.location.href = `mailto:${klant.email}`;
    }
  };

  const handlePhoneClick = () => {
    if (klant.phone) {
      window.location.href = `tel:${klant.phone}`;
    }
  };

  return (
    <TooltipProvider>
      <Card className={isDroppedOff ? "border-destructive/50" : ""}>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-7 w-7 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold">{fullName}</h1>
                  {/* Lead Score Badge */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${getScoreBgColor(leadScore)}`}>
                        <TrendingUp className={`h-3.5 w-3.5 ${getScoreColor(leadScore)}`} />
                        <span className={`text-sm font-bold ${getScoreColor(leadScore)}`}>{leadScore}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">Lead Score: {leadScore}/100</p>
                      <p className="text-xs text-muted-foreground">
                        Gebaseerd op activiteit, voorkeuren en journey voortgang
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {isDroppedOff && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Afgehaakt
                    </Badge>
                  )}
                  {getJourneyPhaseBadge(klant.journey_phase)}
                  {getLeadTemperatureBadge(klant.lead_temperature)}
                  {klant.user_id && (
                    <Badge variant="outline" className="text-xs">
                      Heeft account
                    </Badge>
                  )}
                </div>
                {klant.email && (
                  <p className="text-sm text-muted-foreground mt-2">{klant.email}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-3">
              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                {klant.email && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleEmailClick}
                  >
                    <Mail className="h-4 w-4 mr-1" />
                    Email
                  </Button>
                )}
                {klant.phone && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handlePhoneClick}
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    Bellen
                  </Button>
                )}
              </div>

              {/* Meta info */}
              <div className="text-right text-sm text-muted-foreground space-y-0.5">
                {klant.last_visit_at && (
                  <div className="flex items-center gap-1 justify-end">
                    <span>Laatste bezoek: {formatDistanceToNow(new Date(klant.last_visit_at), { addSuffix: true, locale: nl })}</span>
                  </div>
                )}
                {klant.created_at && (
                  <div className="flex items-center gap-1 justify-end">
                    <Calendar className="h-3 w-3" />
                    <span>Klant sinds {format(new Date(klant.created_at), "d MMM yyyy", { locale: nl })}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
