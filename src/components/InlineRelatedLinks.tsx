import { Link } from "react-router-dom";
import { ArrowRight, BookOpen } from "lucide-react";
import { type BlogPost } from "@/hooks/useExternalData";

interface InlineRelatedLinksProps {
  posts: BlogPost[];
  context: "financiering" | "juridisch" | "belastingen" | "verhuur";
}

export const InlineRelatedLinks = ({ posts, context }: InlineRelatedLinksProps) => {
  if (posts.length === 0) return null;

  const contextLabels = {
    financiering: "Financiering & Hypotheek",
    juridisch: "Juridisch & Zekerheid",
    belastingen: "Belastingen & Fiscaal",
    verhuur: "Verhuur & Rendement"
  };

  return (
    <div className="my-8 p-6 bg-gradient-to-r from-primary/5 to-primary/10 border-l-4 border-primary rounded-r-lg space-y-6">
      {/* Same Category Posts */}
      {posts.length > 0 && (
        <div>
          <div className="flex items-start gap-3 mb-4">
            <BookOpen className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold text-foreground mb-1">
                Lees ook over {contextLabels[context]}
              </h3>
              <p className="text-sm text-muted-foreground">
                Verdiep je kennis met deze gerelateerde artikelen
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {posts.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="flex items-center gap-2 text-sm text-primary hover:underline group"
              >
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                <span className="font-medium">{post.title}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
