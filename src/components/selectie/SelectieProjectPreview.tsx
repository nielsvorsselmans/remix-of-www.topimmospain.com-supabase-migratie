import { MapPin, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAssignedProjects } from "@/hooks/useAssignedProjects";
import { formatPrice } from "@/lib/utils";
import { isProjectSoldOut } from "@/lib/selection-utils";

export function SelectieProjectPreview() {
  const { projects } = useAssignedProjects();
  
  // Show max 3 on desktop, 2 on mobile
  const suggestedProjects = projects
    .filter(p => p.status === 'suggested' && !isProjectSoldOut(p.project))
    .slice(0, 3);

  if (suggestedProjects.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">
        Te beoordelen projecten
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {suggestedProjects.map((project) => (
          <Link
            key={project.id}
            to="/dashboard/projecten"
            className="block group"
          >
            <div className="rounded-lg border bg-card overflow-hidden transition-colors hover:bg-accent/50">
              {/* Stacked image */}
              <div className="aspect-video w-full overflow-hidden bg-muted">
                {project.project.featured_image ? (
                  <img
                    src={project.project.featured_image}
                    alt={project.project.display_title || project.project.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">
                    Geen foto
                  </div>
                )}
              </div>

              {/* Info below image */}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {project.project.display_title || project.project.name}
                    </p>
                    {project.project.city && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="h-3 w-3" />
                        {project.project.city}
                        {project.project.region && `, ${project.project.region}`}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                </div>
                <p className="text-sm font-semibold text-primary mt-1.5">
                  {project.project.price_from 
                    ? `Vanaf ${formatPrice(project.project.price_from)}`
                    : "Prijs op aanvraag"
                  }
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
