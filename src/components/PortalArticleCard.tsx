import { Card, CardContent } from "@/components/ui/card";
import { BlogCategoryBadge } from "@/components/BlogCategoryBadge";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getOptimizedImageUrl } from "@/lib/utils";

interface PortalArticleCardProps {
  title: string;
  slug: string;
  intro: string;
  category: string;
  featured_image: string | null;
}

export function PortalArticleCard({ title, slug, intro, category, featured_image }: PortalArticleCardProps) {
  return (
    <Card className="group hover:shadow-md transition-all duration-300 overflow-hidden">
      <div className="flex gap-4 p-4">
        {featured_image && (
          <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0">
            <img
              src={getOptimizedImageUrl(featured_image, 160, 80)}
              alt={title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <BlogCategoryBadge category={category} className="text-xs mb-2" />
          <h4 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h4>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{intro}</p>
        </div>
      </div>
      <CardContent className="pt-0 pb-3 px-4">
        <Link to={`/blog/${slug}`} target="_blank">
          <Button variant="ghost" size="sm" className="p-0 h-auto text-xs font-semibold group/btn">
            Lees artikel
            <ArrowRight className="ml-1 w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
