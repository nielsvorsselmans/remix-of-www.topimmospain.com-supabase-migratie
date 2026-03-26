import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BlogCategoryBadge } from "@/components/BlogCategoryBadge";
import { ArrowRight, Calendar, User, Clock } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { getOptimizedImageUrl } from "@/lib/utils";

const calculateReadTime = (content: any, intro: string): number => {
  let wordCount = 0;
  
  if (content) {
    if (typeof content === 'string') {
      wordCount = content.split(/\s+/).length;
    } else if (typeof content === 'object') {
      wordCount = JSON.stringify(content).split(/\s+/).length;
    }
  } else {
    wordCount = intro.split(/\s+/).length;
  }
  
  const wordsPerMinute = 200;
  const readTime = Math.ceil(wordCount / wordsPerMinute);
  return Math.max(readTime, 3);
};

type BlogCardProps = {
  title: string;
  slug: string;
  intro: string;
  category: string;
  author: string;
  featured_image: string | null;
  published_at: string;
  content?: any;
};

export function BlogCard({
  title,
  slug,
  intro,
  category,
  author,
  featured_image,
  published_at,
  content,
}: BlogCardProps) {
  const readTime = calculateReadTime(content, intro);
  
  return (
    <Card className="h-full flex flex-col overflow-hidden relative group hover:scale-[1.02] hover:shadow-xl hover:border-primary/50 transition-all duration-300">
      {/* Gradient Glow Overlay on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-accent/0 group-hover:from-primary/5 group-hover:to-accent/5 transition-all duration-500 rounded-lg pointer-events-none" />
      
      {featured_image && (
        <div className="aspect-video overflow-hidden relative">
          <img
            src={getOptimizedImageUrl(featured_image, 600, 80)}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        </div>
      )}
      <CardHeader className="relative z-10">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <BlogCategoryBadge category={category} className="text-xs" />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{readTime} min</span>
          </div>
        </div>
        <CardTitle className="text-xl line-clamp-2 group-hover:text-primary transition-colors duration-300">
          <Link to={`/blog/${slug}`}>{title}</Link>
        </CardTitle>
        <CardDescription className="line-clamp-3">{intro}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto relative z-10">
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>{author}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <time dateTime={published_at}>
              {format(new Date(published_at), "d MMMM yyyy", { locale: nl })}
            </time>
          </div>
        </div>
        <Button variant="outline" asChild className="w-full group/btn hover:bg-primary hover:text-primary-foreground transition-all duration-300">
          <Link to={`/blog/${slug}`}>
            Lees meer
            <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
