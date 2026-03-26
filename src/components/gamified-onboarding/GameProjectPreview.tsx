import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Building2, MapPin, Waves, Trees } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { StyleMatcherResult, BudgetBuilderResult } from "@/constants/gamifiedOnboarding";

interface GameProjectPreviewProps {
  stylePreferences?: Partial<StyleMatcherResult>;
  amenityPreferences?: {
    pool?: string;
    sea_distance?: string;
  };
  budgetMin?: number;
  budgetMax?: number;
  maxProjects?: number;
  title?: string;
  className?: string;
}

// Kernregio gemeentes met prioriteit (Viva Vastgoed focus areas)
const PRIORITY_MUNICIPALITIES = [
  "Los Alcázares",
  "San Javier",
  "San Pedro del Pinatar",
  "Pilar de la Horadada",
  "San Miguel de Salinas",
];

interface ProjectPreview {
  id: string;
  name: string;
  city: string | null;
  featured_image: string | null;
  price_from: number | null;
  price_to: number | null;
  has_sea_views: boolean;
  has_private_pool: boolean;
  has_communal_pool: boolean;
  min_distance_to_beach: number | null;
  property_types: string[];
}

interface ScoredProjectPreview extends ProjectPreview {
  score: number;
  matchReasons: string[];
}

/**
 * Live project preview component for gamified onboarding
 * Shows 2-3 matching projects based on current game selections
 */
export function GameProjectPreview({
  stylePreferences,
  amenityPreferences,
  budgetMin,
  budgetMax,
  maxProjects = 3,
  title = "Projecten die passen",
  className,
}: GameProjectPreviewProps) {
  // Fetch aggregated project data
  // Use project_aggregations materialized view instead of heavy properties join
  const { data: projects, isLoading } = useQuery({
    queryKey: ["game-project-previews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_aggregations")
        .select("id, name, city, featured_image, price_from, price_to, has_sea_views, has_private_pool, has_communal_pool, min_distance_to_beach, property_types")
        .not("featured_image", "is", null)
        .limit(50);

      if (error) throw error;

      return (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        city: p.city,
        featured_image: p.featured_image,
        price_from: p.price_from,
        price_to: p.price_to,
        has_sea_views: p.has_sea_views ?? false,
        has_private_pool: p.has_private_pool ?? false,
        has_communal_pool: p.has_communal_pool ?? false,
        min_distance_to_beach: p.min_distance_to_beach,
        property_types: p.property_types || [],
      } as ProjectPreview));
    },
    staleTime: 5 * 60 * 1000,
  });

  // Filter and score projects based on preferences
  const matchingProjects = useMemo(() => {
    if (!projects) return [];

    let filtered = [...projects];

    // Filter by style preferences
    if (stylePreferences?.view === "sea") {
      // Prioritize sea views, but include close to beach as fallback
      filtered = filtered.filter(
        p => p.has_sea_views || (p.min_distance_to_beach && p.min_distance_to_beach < 2000)
      );
    }

    if (stylePreferences?.location_type === "coastal") {
      filtered = filtered.filter(
        p => p.min_distance_to_beach === null || p.min_distance_to_beach < 5000
      );
    } else if (stylePreferences?.location_type === "inland") {
      filtered = filtered.filter(
        p => p.min_distance_to_beach === null || p.min_distance_to_beach > 8000
      );
    }

    // Filter by amenity preferences
    if (amenityPreferences?.pool === "private") {
      filtered = filtered.filter(p => p.has_private_pool);
    } else if (amenityPreferences?.pool === "shared") {
      filtered = filtered.filter(p => p.has_communal_pool || p.has_private_pool);
    }

    if (amenityPreferences?.sea_distance === "walking") {
      filtered = filtered.filter(
        p => p.min_distance_to_beach !== null && p.min_distance_to_beach < 1000
      );
    }

    // Filter by budget
    if (budgetMin || budgetMax) {
      filtered = filtered.filter(p => {
        const priceMin = p.price_from || 0;
        const priceMax = p.price_to || p.price_from || Infinity;
        const prefMin = budgetMin || 0;
        const prefMax = budgetMax || Infinity;
        return priceMin <= prefMax && priceMax >= prefMin;
      });
    }

    // Score remaining projects for sorting with match reasons
    const scored = filtered.map(project => {
      let score = 0;
      const matchReasons: string[] = [];
      
      // Sea views bonus with reason
      if (project.has_sea_views && stylePreferences?.view === "sea") {
        score += 20;
        matchReasons.push("Zeezicht");
      } else if (project.has_sea_views && stylePreferences?.view === "both") {
        score += 10;
        matchReasons.push("Zeezicht");
      }
      
      // Pool bonus with reason
      if (project.has_private_pool && amenityPreferences?.pool === "private") {
        score += 15;
        matchReasons.push("Privé zwembad");
      } else if (project.has_communal_pool && amenityPreferences?.pool === "shared") {
        score += 10;
        matchReasons.push("Zwembad");
      }
      
      // Distance bonus with reason
      if (project.min_distance_to_beach && project.min_distance_to_beach < 500) {
        score += 10;
        matchReasons.push(`${project.min_distance_to_beach}m strand`);
      } else if (project.min_distance_to_beach && project.min_distance_to_beach < 1500) {
        score += 5;
        matchReasons.push("Dicht bij zee");
      }
      
      // Budget match with nuanced reasons
      if (budgetMin || budgetMax) {
        const projectMin = project.price_from || 0;
        const projectMax = project.price_to || projectMin;
        const prefMin = budgetMin || 0;
        const prefMax = budgetMax || Infinity;
        
        if (projectMin >= prefMin && projectMax <= prefMax) {
          score += 20;
          matchReasons.push("Binnen budget");
        } else if (projectMin <= prefMax && projectMin >= prefMin) {
          score += 10;
          matchReasons.push("Startprijs binnen budget");
        }
      }
      
      // Priority municipality bonus (core Viva Vastgoed regions)
      if (project.city && PRIORITY_MUNICIPALITIES.includes(project.city)) {
        score += 8;
        matchReasons.push("Kernregio");
      }
      
      return { ...project, score, matchReasons };
    });

    // Sort by score and return top matches
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, maxProjects);
  }, [projects, stylePreferences, amenityPreferences, budgetMin, budgetMax, maxProjects]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getDistanceLabel = (distance: number | null) => {
    if (!distance) return null;
    if (distance < 100) return `${distance}m`;
    if (distance < 1000) return `${distance}m`;
    return `${(distance / 1000).toFixed(1)}km`;
  };

  // Don't render if no filters applied yet
  const hasFilters = stylePreferences?.view || stylePreferences?.location_type || 
                     amenityPreferences?.pool || amenityPreferences?.sea_distance ||
                     budgetMin || budgetMax;

  if (!hasFilters) return null;

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        <p className="text-sm text-muted-foreground">{title}</p>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-32 flex-shrink-0 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (matchingProjects.length === 0) {
    return (
      <div className={cn("text-center py-4", className)}>
        <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Geen projecten gevonden met deze criteria
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
        {title}
      </p>
      
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
        {matchingProjects.map(project => (
          <div
            key={project.id}
            className={cn(
              "flex-shrink-0 w-36 rounded-lg overflow-hidden",
              "bg-card border shadow-sm",
              "transition-all hover:shadow-md hover:scale-[1.02]"
            )}
          >
            {/* Image */}
            <div className="aspect-[4/3] relative">
              {project.featured_image ? (
                <img
                  src={project.featured_image}
                  alt={project.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              
              {/* Badge overlay */}
              <div className="absolute top-1.5 right-1.5 flex gap-1">
                {project.has_sea_views && (
                  <span className="bg-blue-500/90 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <Waves className="h-2.5 w-2.5" />
                  </span>
                )}
                {(project.has_private_pool || project.has_communal_pool) && (
                  <span className="bg-teal-500/90 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    🏊
                  </span>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="p-2 space-y-1">
              <p className="font-medium text-xs truncate" title={project.name}>
                {project.name}
              </p>
              
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <MapPin className="h-2.5 w-2.5" />
                <span className="truncate">{project.city || "Spanje"}</span>
                {project.min_distance_to_beach && project.min_distance_to_beach < Infinity && (
                  <>
                    <span>•</span>
                    <span>{getDistanceLabel(project.min_distance_to_beach)}</span>
                  </>
                )}
              </div>

              {project.price_from && (
                <p className="text-xs font-semibold text-primary">
                  {formatPrice(project.price_from)}
                  {project.price_to && project.price_to !== project.price_from && (
                    <span className="text-muted-foreground font-normal">
                      {" - "}{formatPrice(project.price_to)}
                    </span>
                  )}
                </p>
              )}
              
              {/* Match reasons as badges */}
              {project.matchReasons && project.matchReasons.length > 0 && (
                <div className="text-[9px] text-muted-foreground/80 flex flex-wrap gap-1">
                  {project.matchReasons.slice(0, 2).map((reason, i) => (
                    <span key={i} className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                      {reason}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
