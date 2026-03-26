import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, ArrowRight, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getOptimizedImageUrl } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

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

export const LatestBlogPosts = () => {
  const { data: posts, isLoading } = useQuery({
    queryKey: ['latest-blog-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, intro, category, featured_image, published_at, created_at, content')
        .eq('published', true)
        .order('published_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return data || [];
    },
    staleTime: 30 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Skeleton className="h-8 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-96" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!posts || posts.length === 0) {
    return null;
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Aankoopproces': 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20',
      'Financiering': 'bg-green-500/10 text-green-600 hover:bg-green-500/20',
      'Regio-informatie': 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/20',
      'Belastingen': 'bg-purple-500/10 text-purple-600 hover:bg-purple-500/20',
      'Verhuur': 'bg-pink-500/10 text-pink-600 hover:bg-pink-500/20',
      'Onderhoud': 'bg-teal-500/10 text-teal-600 hover:bg-teal-500/20',
      'Praktisch': 'bg-teal-500/10 text-teal-600 hover:bg-teal-500/20',
    };
    return colors[category] || 'bg-accent text-accent-foreground';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <Badge className="mb-4" variant="outline">
            Kennis & Inzichten
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Laatste updates
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Blijf op de hoogte van het laatste nieuws en tips over investeren in Spanje
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {posts.map((post: any) => {
            const readTime = calculateReadTime(post.content);
            
            return (
              <Card key={post.id} className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
                {post.featured_image && (
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={getOptimizedImageUrl(post.featured_image, 600, 80)}
                      alt={post.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Badge className={getCategoryColor(post.category)}>
                      {post.category}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{readTime} min</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(post.published_at || post.created_at)}</span>
                    </div>
                  </div>
                <h3 className="text-xl font-bold leading-tight group-hover:text-primary transition-colors">
                  {post.title}
                </h3>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4 line-clamp-3">
                  {post.intro}
                </p>
                <Link to={`/blog/${post.slug}`}>
                  <Button variant="ghost" className="group/btn p-0 h-auto font-semibold">
                    Lees meer
                    <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Link to="/blog">
            <Button size="lg" variant="outline">
              Bekijk alle artikelen
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
