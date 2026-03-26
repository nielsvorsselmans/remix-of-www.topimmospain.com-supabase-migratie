import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MapPin, Home, Euro, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectsList } from "@/hooks/useProjectsList";

// Allowed regions for Costa Cálida and Costa Blanca Zuid
const ALLOWED_REGIONS = ["Murcia", "Costa Calida", "Costa Cálida", "Alicante", "Costa Blanca", "Costa Blanca Zuid"];

interface SaleRelevantProjectsProps {
  currentProjectId?: string;
}

export function SaleRelevantProjects({ currentProjectId }: SaleRelevantProjectsProps) {
  const { data: allProjects, isLoading } = useProjectsList();

  const projects = useMemo(() => {
    if (!allProjects) return [];
    return allProjects
      .filter(p => {
        if (p.id === currentProjectId) return false;
        if (!p.region) return false;
        return ALLOWED_REGIONS.some(region =>
          p.region?.toLowerCase().includes(region.toLowerCase())
        );
      })
      .slice(0, 6);
  }, [allProjects, currentProjectId]);

  const formatPriceLocal = (price: number | null) => {
    if (!price) return null;
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Home className="h-5 w-5" />
            Relevante Projecten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!projects?.length) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Home className="h-5 w-5" />
            Relevante Projecten
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/partner/projecten" className="gap-1">
              Alle projecten
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Projecten aan de Costa Cálida en Costa Blanca Zuid
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link 
              key={project.id}
              to={`/partner/projecten`}
              className="group block"
            >
              <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                {project.featured_image ? (
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      src={project.featured_image}
                      alt={project.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {project.status && (
                      <Badge 
                        variant="secondary" 
                        className="absolute top-2 right-2 text-xs"
                      >
                        {project.status}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    <Home className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="p-3 space-y-2">
                  <h4 className="font-medium line-clamp-1 group-hover:text-primary transition-colors">
                    {project.display_title || project.name}
                  </h4>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{project.city}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    {project.price_from && (
                      <div className="flex items-center gap-1 text-sm font-medium text-primary">
                        <Euro className="h-3.5 w-3.5" />
                        <span>Vanaf {formatPriceLocal(project.price_from)}</span>
                      </div>
                    )}
                  </div>
                  {project.property_types && project.property_types.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {project.property_types.slice(0, 2).map((type: string) => (
                        <Badge key={type} variant="outline" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
