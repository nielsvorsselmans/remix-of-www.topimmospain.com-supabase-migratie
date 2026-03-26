import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { ArrowRight, Heart, Video, MessageSquare, Phone, ExternalLink } from "lucide-react";
import larsProfile from "@/assets/lars-profile.webp";
import { useCustomerTrips } from "@/hooks/useCustomerTrips";
import { useEffectiveCustomer } from "@/hooks/useEffectiveCustomer";
import { useFavoritesCount } from "@/hooks/useFavorites";
import { useAssignedProjects } from "@/hooks/useAssignedProjects";
import { useProjectsList, type ProjectListItem } from "@/hooks/useProjectsList";

interface ScoredProject extends ProjectListItem {
  matchScore: number;
  matchReasons: string[];
}

interface DashboardWelcomeBackProps {
  firstName: string;
  customerProfile: any;
  onStartOnboarding?: () => void;
}

export function DashboardWelcomeBack({
  firstName,
  customerProfile,
  onStartOnboarding
}: DashboardWelcomeBackProps) {
  const { userId, crmLeadId } = useEffectiveCustomer();
  const { data: customerTrips } = useCustomerTrips();
  const { data: favoritesCount = 0 } = useFavoritesCount();
  const { adminProjects, interestedCount } = useAssignedProjects();
  
  const adminAssignedCount = adminProjects.length;
  const viewedProjectIds = customerProfile?.viewed_projects || [];
  const explicitPrefs = customerProfile?.explicit_preferences || {};
  const inferredPrefs = customerProfile?.inferred_preferences || {};

  // Build dynamic subtext based on real engagement
  const buildSubtext = (): string => {
    const parts: string[] = [];
    if (favoritesCount > 0) parts.push(`${favoritesCount} favoriet${favoritesCount === 1 ? '' : 'en'}`);
    if (interestedCount > 0) parts.push(`${interestedCount} project${interestedCount === 1 ? '' : 'en'} als interessant beoordeeld`);
    if (adminAssignedCount > 0) parts.push(`${adminAssignedCount} aanbeveling${adminAssignedCount === 1 ? '' : 'en'} van Lars`);

    if (parts.length === 0) {
      return "Fijn dat je er weer bent. Laten we samen kijken wat de volgende stap is.";
    }
    if (favoritesCount > 0 && adminAssignedCount > 0) {
      return `${favoritesCount} favoriet${favoritesCount === 1 ? '' : 'en'} en ${adminAssignedCount} aanbeveling${adminAssignedCount === 1 ? '' : 'en'} van Lars — benieuwd naar de volgende stap?`;
    }
    if (adminAssignedCount > 0 && favoritesCount === 0) {
      return `Lars heeft ${adminAssignedCount} project${adminAssignedCount === 1 ? '' : 'en'} voor je geselecteerd. Bekijk ze in Mijn Selectie.`;
    }
    return `Je hebt ${parts.join(' en ')}. Klaar voor de volgende stap?`;
  };

  // Check if user has upcoming viewing trip
  const hasUpcomingTrip = customerTrips?.some(trip => 
    new Date(trip.trip_start_date) >= new Date()
  );

  // Check if user has explicit preferences set
  const hasExplicitPreferences = !!(
    explicitPrefs?.budget_min || 
    explicitPrefs?.budget_max || 
    (explicitPrefs?.preferred_regions && explicitPrefs.preferred_regions.length > 0) ||
    explicitPrefs?.investment_goal ||
    explicitPrefs?.timeline
  );

  const calculateMatchScore = (project: ProjectListItem): {
    score: number;
    reasons: string[];
  } => {
    let score = 0;
    const reasons: string[] = [];

    // Budget scoring (max 50 points)
    const budgetMin = explicitPrefs?.budget_min || inferredPrefs?.budget_min;
    const budgetMax = explicitPrefs?.budget_max || inferredPrefs?.budget_max;
    if (budgetMin && budgetMax && project.price_from && project.price_to) {
      const projectAvg = (project.price_from + project.price_to) / 2;
      const userAvg = (budgetMin + budgetMax) / 2;
      const userRange = budgetMax - budgetMin;
      if (projectAvg >= budgetMin && projectAvg <= budgetMax) {
        score += 50;
        reasons.push("Je prijsrange");
      } else if (userRange > 0) {
        const distance = Math.min(Math.abs(projectAvg - budgetMin), Math.abs(projectAvg - budgetMax));
        const proximityScore = Math.max(0, 50 - distance / userRange * 50);
        score += proximityScore;
        if (proximityScore > 25) {
          reasons.push("Dicht bij je budget");
        }
      }
    }

    // Region scoring (40 points)
    const preferredRegions = explicitPrefs?.preferred_regions || inferredPrefs?.common_regions || [];
    if (preferredRegions.length > 0 && project.region && preferredRegions.includes(project.region)) {
      score += 40;
      reasons.push("In de regio die je verkent");
    }

    // City scoring (30 points)
    const commonCities = inferredPrefs?.common_cities || [];
    if (commonCities.length > 0 && project.city && commonCities.includes(project.city)) {
      score += 30;
      reasons.push(`In ${project.city}`);
    }

    // Fresh content bonus (10 points)
    if (!viewedProjectIds.includes(project.id)) {
      score += 10;
      reasons.push("Nieuw voor jou");
    }
    return {
      score,
      reasons
    };
  };

  // Use cached project list instead of 3 waterfall queries
  const { data: allProjects = [] } = useProjectsList();

  // Fetch exclude IDs (favorites + selections) in parallel
  const { data: excludeData } = useQuery({
    queryKey: ["dashboard-exclude-ids", userId, crmLeadId],
    queryFn: async () => {
      const [selectionsRes, favoritesRes] = await Promise.all([
        crmLeadId
          ? supabase.from("customer_project_selections").select("project_id").eq("crm_lead_id", crmLeadId)
          : Promise.resolve({ data: [] }),
        userId
          ? supabase.from("user_favorites").select("project_id").eq("user_id", userId)
          : Promise.resolve({ data: [] }),
      ]);
      return {
        selectionIds: (selectionsRes.data || []).map((s: any) => s.project_id),
        favoriteIds: (favoritesRes.data || []).map((f: any) => f.project_id),
      };
    },
    enabled: !!(userId || crmLeadId),
  });

  // Client-side scoring and filtering using cached projects
  const recommendations = useMemo(() => {
    if (!customerProfile || allProjects.length === 0) return [];

    const excludeIds = new Set([
      ...viewedProjectIds,
      ...(excludeData?.selectionIds || []),
      ...(excludeData?.favoriteIds || []),
    ]);

    const candidates = allProjects.filter((p) => !excludeIds.has(p.id));

    const scored: ScoredProject[] = candidates.map((p) => {
      const { score, reasons } = calculateMatchScore(p);
      return { ...p, matchScore: score, matchReasons: reasons };
    });

    return scored.sort((a, b) => b.matchScore - a.matchScore).slice(0, 3);
  }, [allProjects, customerProfile, viewedProjectIds, excludeData, explicitPrefs, inferredPrefs]);


  return (
    <div className="space-y-6">
      {/* Welkom + Advisor header */}
      <Card className="border-primary/20 bg-gradient-to-br from-background to-muted/20 -mx-4 rounded-none border-x-0 sm:mx-0 sm:rounded-lg sm:border-x">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border-2 border-primary/20 shrink-0">
              <AvatarImage src={larsProfile} alt="Lars" className="object-cover" />
              <AvatarFallback>LV</AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-semibold mb-1 sm:mb-2">
                Welkom terug, {firstName}! 👋
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-4">
                {buildSubtext()}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button asChild className="w-full sm:w-auto">
                  <Link to="/afspraak">
                    <Video className="h-4 w-4 mr-2" />
                    Plan een gesprek
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full sm:w-auto">
                  <Link to="/contact">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Stel een vraag
                  </Link>
                </Button>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4 justify-center sm:justify-start">
                <Phone className="h-4 w-4" />
                <span>Vragen?</span>
                <a className="text-primary hover:underline font-medium" href="tel:+32468122903">
                  +32 468 122 903
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gepersonaliseerde aanbevelingen - alleen tonen als geen bezichtigingsreis gepland */}
      {!hasUpcomingTrip && recommendations && recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  Projecten die bij je kunnen passen
                </CardTitle>
              </div>
              <a
                href="https://wa.me/32468122903?text=Hallo%20Lars%2C%20kun%20je%20deze%20projecten%20voor%20mij%20beoordelen%3F"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="ghost" size="sm">
                  Laat Lars beoordelen
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {recommendations.map(project => (
                <a 
                  key={project.id} 
                  href={`/project/${project.id}`} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group"
                >
                  <div className="relative overflow-hidden rounded-lg border border-border hover:border-primary/50 transition-colors">
                    {project.featured_image && (
                      <img 
                        src={project.featured_image} 
                        alt={project.display_title || project.name} 
                        className="w-full h-32 object-cover group-hover:scale-105 transition-transform" 
                      />
                    )}
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="font-medium text-sm line-clamp-1 flex-1">
                          {project.display_title || project.name}
                        </h4>
                        <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {project.city} • {project.region}
                      </p>
                      {project.price_from && (
                        <p className="text-sm font-semibold text-primary mt-1">
                          Vanaf €{project.price_from.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verbeter je aanbevelingen - alleen tonen als geen expliciete voorkeuren */}
      {!hasExplicitPreferences && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">Verbeter je aanbevelingen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Beantwoord een paar korte vragen zodat we projecten kunnen vinden die écht bij je passen.
            </p>
            <div className="flex flex-wrap gap-2">
              {!explicitPrefs?.budget_min && !explicitPrefs?.budget_max && (
                <Badge variant="outline">Budget</Badge>
              )}
              {(!explicitPrefs?.preferred_regions || explicitPrefs.preferred_regions.length === 0) && (
                <Badge variant="outline">Gewenste regio</Badge>
              )}
              {!explicitPrefs?.investment_goal && (
                <Badge variant="outline">Investeringsdoel</Badge>
              )}
              {!explicitPrefs?.timeline && (
                <Badge variant="outline">Tijdlijn</Badge>
              )}
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-2"
              onClick={() => onStartOnboarding?.()}
            >
              Voltooi je profiel
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
