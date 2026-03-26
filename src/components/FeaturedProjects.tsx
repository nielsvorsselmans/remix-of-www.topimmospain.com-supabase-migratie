import { useAggregatedProjects } from "@/hooks/useExternalData";
import { ProjectCard } from "./ProjectCard";
import { ProjectCardSkeleton } from "./ProjectCardSkeleton";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export const FeaturedProjects = () => {
  const { data: aggregatedData, loading } = useAggregatedProjects({
    limit: 6,
    sortBy: 'recommended',
  });

  const projects = (aggregatedData?.data || []).map((project: any) => ({
    ...project,
    propertyTypes: project.property_types || project.propertyTypes || [],
    availableCount: project.available_count ?? 0,
    totalCount: project.total_count ?? 0,
    minBedrooms: project.min_bedrooms ?? 0,
    maxBedrooms: project.max_bedrooms ?? 0,
    minBathrooms: project.min_bathrooms ?? 0,
    maxBathrooms: project.max_bathrooms ?? 0,
    minArea: project.min_area ?? 0,
    maxArea: project.max_area ?? 0,
  }));

  if (loading) {
    return (
      <section className="py-12 sm:py-16 md:py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <Skeleton className="h-10 sm:h-12 w-64 mx-auto mb-4" />
            <Skeleton className="h-5 w-96 mx-auto" />
          </div>

          {/* Desktop Grid Skeletons */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </div>

          {/* Mobile Carousel Skeletons */}
          <div className="md:hidden">
            <ProjectCardSkeleton />
          </div>
        </div>
      </section>
    );
  }

  if (!projects || projects.length === 0) {
    return null;
  }

  return (
    <section className="py-12 sm:py-16 md:py-20 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Uitgelichte Projecten
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Ontdek onze meest interessante nieuwbouwprojecten aan de Costa Cálida
          </p>
        </div>

        {/* Desktop Grid */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {projects.map((project: any) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>

        {/* Mobile Carousel */}
        <div className="md:hidden mb-12">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {projects.map((project: any) => (
                <CarouselItem key={project.id} className="pl-2 md:pl-4">
                  <ProjectCard project={project} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="flex items-center justify-center gap-2 mt-4">
              <CarouselPrevious className="relative left-0 translate-y-0" />
              <CarouselNext className="relative right-0 translate-y-0" />
            </div>
          </Carousel>
        </div>

        <div className="text-center mt-8 sm:mt-12">
          <Link to="/projecten">
            <Button 
              size="lg" 
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg shadow-elegant"
            >
              Bekijk alle projecten
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
