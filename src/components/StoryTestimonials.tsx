import { useQuery } from "@tanstack/react-query";
import { Star, Quote } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";

export const StoryTestimonials = () => {
  const { data: testimonials, isLoading } = useQuery({
    queryKey: ['story-testimonials'],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-reviews?has_full_story=false&featured=true&limit=6`
      );

      if (!response.ok) throw new Error('Failed to fetch testimonials');

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  if (isLoading) {
    return (
      <section className="py-12 sm:py-16 md:py-24 bg-gradient-warm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-10 w-64 mx-auto mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-2xl p-8">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!testimonials || testimonials.length === 0) return null;

  return (
    <section className="py-12 sm:py-16 md:py-24 bg-gradient-warm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 sm:mb-6">
            Wat anderen zeggen
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4">
            Betrouwbaar, transparant en met persoonlijke aandacht
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent>
              {testimonials.map((testimonial: any) => (
                <CarouselItem key={testimonial.id} className="md:basis-1/2 lg:basis-1/3">
                  <div className="h-full bg-card p-6 sm:p-8 rounded-2xl shadow-soft hover:shadow-elegant transition-all duration-300 border border-border/50 relative">
                    <div className="absolute -top-3 -left-3 sm:-top-4 sm:-left-4 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-accent flex items-center justify-center shadow-soft">
                      <Quote className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    
                    <div className="flex gap-0.5 mb-4 mt-2">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                      ))}
                    </div>

                    <p className="text-sm sm:text-base text-foreground leading-relaxed mb-6 italic">
                      "{testimonial.quote}"
                    </p>

                    <div className="mt-auto pt-4 border-t border-border">
                      <p className="font-bold text-foreground mb-1 text-sm sm:text-base">
                        {testimonial.customer_name}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                        {testimonial.location}
                      </p>
                      {testimonial.customer_type && (
                        <p className="text-xs text-primary font-medium">
                          {testimonial.customer_type}
                        </p>
                      )}
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-12" />
            <CarouselNext className="hidden md:flex -right-12" />
          </Carousel>
        </div>
      </div>
    </section>
  );
};
