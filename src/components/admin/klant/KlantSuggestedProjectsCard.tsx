import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Lightbulb, MapPin, Plus, Star } from "lucide-react";
import { Klant, useAddKlantProject } from "@/hooks/useKlant";
import { 
  scoreAndSortProjects, 
  getScoreStars, 
  CustomerPreferences,
  ProjectForScoring,
  buildCustomerPreferencesFromExplicit,
} from "@/lib/projectScoring";
import { toast } from "sonner";
import { useMemo, useState } from "react";

interface KlantSuggestedProjectsCardProps {
  klant: Klant;
}

export function KlantSuggestedProjectsCard({ klant }: KlantSuggestedProjectsCardProps) {
  const [addingId, setAddingId] = useState<string | null>(null);
  const addProject = useAddKlantProject();

  const assignedProjectIds = klant.assigned_projects.map(p => p.project_id);

  // Build customer preferences from klant data including gamified preferences
  const customerPreferences: CustomerPreferences = useMemo(() => {
    const explicitPrefs = klant.explicit_preferences as Record<string, any> | undefined;
    const inferredPrefs = klant.inferred_preferences as Record<string, any> | undefined;
    
    // Get gamified preferences from explicit_preferences
    const gamifiedPrefs = buildCustomerPreferencesFromExplicit(explicitPrefs);

    return {
      budgetMin: inferredPrefs?.budget_min || explicitPrefs?.budget_min,
      budgetMax: inferredPrefs?.budget_max || explicitPrefs?.budget_max,
      preferredRegions: [
        ...(explicitPrefs?.preferred_regions || []),
        ...(inferredPrefs?.common_regions || []),
      ],
      preferredCities: [
        ...(explicitPrefs?.preferred_cities || []),
        ...(inferredPrefs?.common_cities || []),
      ],
      viewedProjects: klant.viewed_projects || [],
      favoriteProjects: klant.favorite_projects || [],
      assignedProjectIds,
      // Gamified onboarding data
      stylePreferences: gamifiedPrefs.stylePreferences,
      amenityPreferences: gamifiedPrefs.amenityPreferences,
      investmentBlend: gamifiedPrefs.investmentBlend,
      bedroomsMin: gamifiedPrefs.bedroomsMin,
    };
  }, [klant, assignedProjectIds]);

  // Check if we have any preferences data
  const hasPreferencesData = 
    customerPreferences.budgetMin || 
    customerPreferences.budgetMax || 
    (customerPreferences.preferredRegions?.length ?? 0) > 0 ||
    (customerPreferences.preferredCities?.length ?? 0) > 0 ||
    (customerPreferences.viewedProjects?.length ?? 0) > 0 ||
    (customerPreferences.favoriteProjects?.length ?? 0) > 0 ||
    customerPreferences.stylePreferences ||
    customerPreferences.amenityPreferences ||
    customerPreferences.investmentBlend !== undefined;

  // Use project_aggregations materialized view instead of heavy properties join
  const { data: allProjects, isLoading } = useQuery({
    queryKey: ["all-projects-for-suggestions-extended"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_aggregations")
        .select("id, name, city, region, price_from, price_to, featured_image, has_sea_views, has_private_pool, has_communal_pool, min_distance_to_beach, min_bedrooms, max_bedrooms, property_types")
        .order("name");
      
      if (error) throw error;

      return (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        city: p.city,
        region: p.region,
        price_from: p.price_from,
        price_to: p.price_to,
        featured_image: p.featured_image,
        has_sea_views: p.has_sea_views ?? false,
        has_private_pool: p.has_private_pool ?? false,
        has_communal_pool: p.has_communal_pool ?? false,
        min_distance_to_beach: p.min_distance_to_beach,
        min_bedrooms: p.min_bedrooms,
        max_bedrooms: p.max_bedrooms,
        property_types: p.property_types || [],
      } as ProjectForScoring));
    },
    enabled: !!hasPreferencesData,
  });

  // Score and sort projects using enhanced scoring
  const suggestedProjects = useMemo(() => {
    if (!allProjects || !hasPreferencesData) return [];
    return scoreAndSortProjects(allProjects, customerPreferences, 20).slice(0, 6);
  }, [allProjects, customerPreferences, hasPreferencesData]);

  const handleQuickAssign = async (projectId: string) => {
    setAddingId(projectId);
    try {
      await addProject.mutateAsync({
        crmLeadId: klant.id,
        projectId,
        status: "suggested",
        priority: assignedProjectIds.length,
      });
      toast.success("Project toegevoegd");
    } catch (error) {
      toast.error("Fout bij toevoegen project");
    } finally {
      setAddingId(null);
    }
  };

  // Don't show if no preferences data
  if (!hasPreferencesData) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          Voorgestelde Projecten
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Op basis van voorkeuren, stijl en gedrag
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : suggestedProjects.length === 0 ? (
          <div className="text-center py-6">
            <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Geen passende projecten gevonden
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestedProjects.map((project) => {
              const stars = getScoreStars(project.score);
              const isAdding = addingId === project.id;

              return (
                <div
                  key={project.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  {project.featured_image ? (
                    <img
                      src={project.featured_image}
                      alt=""
                      className="h-14 w-14 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-medium truncate">{project.name}</p>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {Array.from({ length: stars }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                        ))}
                        {Array.from({ length: 5 - stars }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 text-muted-foreground/30" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {project.city}
                      {project.price_from && (
                        <span className="ml-1">
                          · €{project.price_from.toLocaleString()} - €{(project.price_to || project.price_from).toLocaleString()}
                        </span>
                      )}
                    </p>
                    {project.matchReasons.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {project.matchReasons.slice(0, 4).map((reason, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {reason}
                          </Badge>
                        ))}
                        {project.matchReasons.length > 4 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            +{project.matchReasons.length - 4}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-shrink-0 h-8"
                    disabled={isAdding}
                    onClick={() => handleQuickAssign(project.id)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {isAdding ? "..." : "Toewijzen"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
