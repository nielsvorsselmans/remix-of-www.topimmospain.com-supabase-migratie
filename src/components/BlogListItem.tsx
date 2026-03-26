import { Link } from "react-router-dom";
import { BlogCategoryBadge } from "@/components/BlogCategoryBadge";
import { Calendar, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { getOptimizedImageUrl } from "@/lib/utils";

const calculateReadTime = (content: any, intro: string): number => {
  let wordCount = 0;
  if (content) {
    if (typeof content === 'string') {
      wordCount = content.split(/\s+/).length;
    } else if (typeof content === 'object') {
      const text = JSON.stringify(content);
      wordCount = text.replace(/[{}\[\]",:]/g, ' ').split(/\s+/).filter(Boolean).length;
    }
  } else {
    wordCount = intro.split(/\s+/).length;
  }
  return Math.max(Math.ceil(wordCount / 200), 1);
};

type BlogListItemProps = {
  title: string;
  slug: string;
  intro: string;
  category: string;
  author: string;
  featured_image: string | null;
  published_at: string;
  content?: any;
};

export function BlogListItem({
  title,
  slug,
  intro,
  category,
  author,
  featured_image,
  published_at,
  content,
}: BlogListItemProps) {
  const readTime = calculateReadTime(content, intro);

  return (
    <Link
      to={`/blog/${slug}`}
      className="flex gap-4 p-4 rounded-lg border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200 group"
    >
      {featured_image && (
        <div className="hidden sm:block w-24 h-24 flex-shrink-0 rounded-md overflow-hidden">
          <img
            src={getOptimizedImageUrl(featured_image, 200, 75)}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <BlogCategoryBadge category={category} className="text-xs" />
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {readTime} min
          </span>
        </div>
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-1 hidden md:block">{intro}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {author}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {format(new Date(published_at), "d MMM yyyy", { locale: nl })}
          </span>
        </div>
      </div>
    </Link>
  );
}
