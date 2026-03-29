import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Star, ArrowRight, User } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

interface RelatedStoriesProps {
  currentSlug: string;
  customerType: string;
}

export const RelatedStories = ({ currentSlug, customerType }: RelatedStoriesProps) => {
  const { data: stories, isLoading } = useQuery({
    queryKey: ['related-stories', customerType],
    queryFn: async () => {
      const params = new URLSearchParams({
        has_full_story: 'true',
        customer_type: customerType,
        limit: '4',
      });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-reviews?${params.toString()}`
      );

      if (!response.ok) throw new Error('Failed to fetch stories');

      const data = await response.json();
      const reviews = Array.isArray(data) ? data : [];
      // Filter out current story
      return reviews.filter((r: any) => r.story_slug !== currentSlug).slice(0, 3);
    },
  });

  if (isLoading) {
    return (
      <section className="py-12 sm:py-16 md:py-24 bg-gradient-to-b from-muted/20 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-8 sm:mb-12 text-center">Anderen zoals jij</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-2xl p-6 sm:p-8 border border-border/50">
                <Skeleton className="h-6 w-3/4 mb-4" />
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

  if (!stories || stories.length === 0) return null;

  return (
    <section className="py-12 sm:py-16 md:py-24 bg-gradient-to-b from-muted/20 to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 sm:mb-6">
            Anderen zoals jij
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4">
            Ontdek hoe andere investeerders met vergelijkbare wensen hun droom verwerkelijkten
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {stories.map((story: any) => (
            <Link
              key={story.id}
              to={`/klantverhalen/${story.story_slug}`}
              className="group block"
            >
              <div className="bg-card h-full rounded-2xl shadow-soft hover:shadow-elegant transition-all duration-300 border border-border/50 hover:border-primary/30 p-6 sm:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors duration-300" />
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <Badge variant="secondary" className="text-xs font-medium">
                      {story.customer_type}
                    </Badge>
                    <div className="flex gap-0.5">
                      {Array.from({ length: story.rating }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                      {story.customer_name}
                    </h3>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3 leading-relaxed">
                    {story.story_intro || story.quote}
                  </p>

                  <div className="flex items-center text-sm text-primary font-medium group-hover:gap-2 transition-all pt-4 border-t border-border">
                    Lees het volledige verhaal
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
