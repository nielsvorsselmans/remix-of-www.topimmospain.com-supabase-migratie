import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface FeaturedStorySpotlightProps {
  story: {
    id: string;
    customer_name: string;
    location: string;
    rating: number;
    quote: string;
    story_title?: string;
    story_intro?: string;
    story_slug?: string;
    story_featured_image?: string;
    image_url?: string;
    photo_urls?: string[];
    customer_type?: string;
    property_type?: string;
    year?: number;
  };
}

export const FeaturedStorySpotlight = ({ story }: FeaturedStorySpotlightProps) => {
  return (
    <section className="relative w-full h-[70vh] min-h-[500px] overflow-hidden">
      {/* Background Image */}
      {(story.story_featured_image || story.image_url || story.photo_urls?.[0]) && (
        <div className="absolute inset-0">
          <img
            src={story.story_featured_image || story.image_url || story.photo_urls?.[0]}
            alt={story.story_title || story.customer_name}
            className="w-full h-full object-cover"
          />
          {/* Donkere gradient overlay voor dramatisch contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        </div>
      )}

      {/* Featured badge - Top left */}
      <div className="absolute top-8 left-8 z-20 animate-scale-in">
        <Badge className="bg-primary text-primary-foreground border-0 shadow-xl px-4 py-2 text-sm font-semibold backdrop-blur-md">
          <span className="mr-2">⭐</span>
          Uitgelicht Succesverhaal
        </Badge>
      </div>

      {/* Content - Bottom overlay */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-8 md:p-12 lg:p-16">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Customer name & location */}
          <div className="flex items-center gap-3 text-sm text-white/90">
            <span className="font-semibold">{story.customer_name}</span>
            <span>•</span>
            <span>{story.location}</span>
          </div>

          {/* Title */}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight drop-shadow-lg">
            {story.story_title || story.customer_name}
          </h2>

          {/* Intro or Quote */}
          {story.story_intro ? (
            <p className="text-lg md:text-xl text-white/90 line-clamp-2 max-w-3xl drop-shadow-md">
              {story.story_intro}
            </p>
          ) : (
            <p className="text-lg md:text-xl text-white/90 italic line-clamp-2 max-w-3xl drop-shadow-md">
              "{story.quote}"
            </p>
          )}

          {/* CTA */}
          {story.story_slug && (
            <Button 
              asChild 
              size="lg" 
              className="mt-4 shadow-2xl hover:scale-105 transition-transform"
            >
              <Link to={`/klantverhalen/${story.story_slug}`}>
                Lees het verhaal
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
};
