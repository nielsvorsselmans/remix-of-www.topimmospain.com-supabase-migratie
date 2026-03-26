import { useCallback } from "react";
import { Link } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BlogCategoryBadge } from "@/components/BlogCategoryBadge";
import { getOptimizedImageUrl } from "@/lib/utils";

type FeaturedPost = {
  id: string;
  title: string;
  slug: string;
  intro: string;
  category: string;
  featured_image: string | null;
  published_at: string;
  content: any;
};

type FeaturedPostsCarouselProps = {
  posts: FeaturedPost[];
};

const calculateReadTime = (content: any): number => {
  let wordCount = 0;
  
  if (typeof content === 'string') {
    wordCount = content.split(/\s+/).length;
  } else if (content && typeof content === 'object') {
    const contentStr = JSON.stringify(content);
    wordCount = contentStr.split(/\s+/).length;
  }
  
  const wordsPerMinute = 200;
  const readTime = Math.ceil(wordCount / wordsPerMinute);
  return Math.max(readTime, 3);
};

export function FeaturedPostsCarousel({ posts }: FeaturedPostsCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { 
      loop: true,
      align: "start",
      skipSnaps: false,
    },
    [Autoplay({ delay: 5000, stopOnInteraction: false })]
  );

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  if (!posts || posts.length === 0) {
    return null;
  }

  return (
    <section className="py-12 mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Aanbevolen</h2>
          <p className="text-sm text-muted-foreground">Door onze redactie geselecteerd</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={scrollPrev}
            className="rounded-full h-8 w-8"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={scrollNext}
            className="rounded-full h-8 w-8"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="relative">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-4">
            {posts.map((post, index) => {
              const readTime = calculateReadTime(post.content);
              
              return (
                <div
                  key={post.id}
                  className="flex-[0_0_85%] min-w-0 sm:flex-[0_0_45%] lg:flex-[0_0_30%]"
                >
                  <Link to={`/blog/${post.slug}`} className="block group">
                    <Card className="overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-lg h-full">
                      <div className="flex gap-4 p-4">
                        {/* Ranking Badge */}
                        <div className="flex-shrink-0">
                          <div className="bg-primary/10 text-primary rounded-lg w-12 h-12 flex items-center justify-center font-bold text-xl">
                            {index + 1}
                          </div>
                        </div>

                        {/* Thumbnail */}
                        <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
                          <img
                            src={getOptimizedImageUrl(post.featured_image, 200, 75)}
                            alt={post.title}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <BlogCategoryBadge category={post.category} />
                          
                          <h3 className="font-bold line-clamp-2 text-sm group-hover:text-primary transition-colors leading-tight">
                            {post.title}
                          </h3>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{readTime} min</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
