import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, MapPin, Bed, Bath, Sparkles } from "lucide-react";
import { useAggregatedProjects } from "@/hooks/useExternalData";
import { useOntdekkenProgress } from "@/hooks/useOntdekkenProgress";
import { useCustomerProfile } from "@/hooks/useCustomerProfile";
import { cn, formatPrice } from "@/lib/utils";
import { isProjectSoldOut } from "@/lib/selection-utils";
import { ExplicitPreferences } from "@/utils/orientationPersonalization";

interface TeaserCardProps {
  project: {
    id: string;
    name: string;
    city?: string;
    featured_image?: string;
    price_from?: number;
    status?: string | null;
    minBedrooms?: number;
    maxBedrooms?: number;
    minBathrooms?: number;
    maxBathrooms?: number;
  };
  hasBudget: boolean;
}

function TeaserCard({ project, hasBudget }: TeaserCardProps) {
  const isSoldOut = isProjectSoldOut(project as { status?: string | null });
  
  return (
    <Card className={cn("overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow", isSoldOut && "opacity-75")}>
      <div className="relative h-40 overflow-hidden">
        <img
          src={project.featured_image || "/placeholder.svg"}
          alt={project.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        {isSoldOut && (
          <Badge variant="destructive" className="absolute top-3 right-3 text-xs">
            Uitverkocht
          </Badge>
        )}
        {!hasBudget && (
          <div className="absolute bottom-3 left-3 right-3">
            <Badge variant="secondary" className="bg-white/90 text-foreground text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              Vul je profiel aan voor een persoonlijke match
            </Badge>
          </div>
        )}
      </div>
      
      <CardContent className="p-4">
        <h4 className="font-semibold text-sm line-clamp-1 mb-2">{project.name}</h4>
        
        {project.city && (
          <div className="flex items-center gap-1 text-muted-foreground text-xs mb-2">
            <MapPin className="h-3 w-3" />
            <span>{project.city}</span>
          </div>
        )}
        
        <p className="text-lg font-bold text-primary">
          {isSoldOut 
            ? <span className="text-destructive">Uitverkocht</span>
            : project.price_from 
              ? `Vanaf ${formatPrice(project.price_from)}`
              : "Prijs op aanvraag"
          }
        </p>
        
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          {(project.minBedrooms || project.maxBedrooms) && (
            <div className="flex items-center gap-1">
              <Bed className="h-3 w-3" />
              <span>
                {project.minBedrooms === project.maxBedrooms 
                  ? project.minBedrooms
                  : `${project.minBedrooms}-${project.maxBedrooms}`
                } slpk
              </span>
            </div>
          )}
          {(project.minBathrooms || project.maxBathrooms) && (
            <div className="flex items-center gap-1">
              <Bath className="h-3 w-3" />
              <span>
                {project.minBathrooms === project.maxBathrooms 
                  ? project.minBathrooms
                  : `${project.minBathrooms}-${project.maxBathrooms}`
                } badk
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TeaserSkeleton() {
  return (
    <Card className="overflow-hidden animate-pulse">
      <div className="h-40 bg-muted" />
      <CardContent className="p-4 space-y-2">
        <div className="h-4 w-3/4 bg-muted rounded" />
        <div className="h-3 w-1/2 bg-muted rounded" />
        <div className="h-6 w-2/3 bg-muted rounded" />
      </CardContent>
    </Card>
  );
}

export function OntdekkenProjectTeasers() {
  const { completedItems } = useOntdekkenProgress();
  const { data: customerProfile } = useCustomerProfile();
  
  const preferences = customerProfile?.explicit_preferences as ExplicitPreferences | undefined;
  const budgetMax = preferences?.budget_max;
  const hasBudget = completedItems.hasBudget;
  
  // Fetch 3 projects, optionally filtered by budget
  const { data: aggregatedData, loading } = useAggregatedProjects({
    limit: 3,
    sortBy: 'recommended',
    maxPrice: budgetMax || undefined,
  });
  
  const projects = aggregatedData?.data || [];
  
  // Dynamic header based on budget
  const headerText = budgetMax 
    ? `Projecten die passen bij jouw budget`
    : "Populaire projecten in Spanje";
  
  const subText = budgetMax
    ? `Op basis van €${Math.round(budgetMax / 1000)}k+`
    : "Ontdek wat er mogelijk is";
  
  const ctaLink = hasBudget ? "/afspraak" : "/onboarding";
  const ctaText = hasBudget 
    ? "Vraag toegang aan voor de volledige selectie" 
    : "Vul je budget in voor gepersonaliseerde matches";
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{headerText}</h2>
          <p className="text-sm text-muted-foreground">{subText}</p>
        </div>
      </div>
      
      {/* Project grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <>
            <TeaserSkeleton />
            <TeaserSkeleton />
            <TeaserSkeleton />
          </>
        ) : projects.length > 0 ? (
          projects.map((project: any) => (
            <TeaserCard 
              key={project.id} 
              project={project}
              hasBudget={hasBudget}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            <p>Geen projecten gevonden. Probeer je budget aan te passen.</p>
          </div>
        )}
      </div>
      
      {/* CTA */}
      <div className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-4",
        "p-4 rounded-lg bg-muted/50 border border-dashed"
      )}>
        <p className="text-sm text-muted-foreground text-center sm:text-left">
          {hasBudget 
            ? "Wil je alle projecten zien die passen bij jouw wensen?"
            : "Wil je projecten zien die bij jouw budget passen?"
          }
        </p>
        <Button asChild>
          <Link to={ctaLink}>
            {hasBudget ? "Plan gesprek met Lars" : "Vul je profiel aan"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
