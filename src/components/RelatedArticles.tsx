import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { type BlogPost } from "@/hooks/useExternalData";
import { BlogCategoryBadge } from "@/components/BlogCategoryBadge";
import { supabase } from "@/integrations/supabase/client";

interface RelatedArticlesProps {
  currentPostId: string;
  currentCategory: string;
  allPosts: BlogPost[];
  onArticleClick?: () => void;
}

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
  return Math.max(readTime, 1);
};

// Category relationships map - semantic connections between topics
const categoryRelationships: Record<string, string[]> = {
  belastingen: ['financiering', 'verhuur', 'aankoopproces'],
  financiering: ['belastingen', 'aankoopproces', 'juridisch'],
  verhuur: ['belastingen', 'financiering'],
  juridisch: ['aankoopproces', 'belastingen'],
  aankoopproces: ['juridisch', 'financiering', 'belastingen'],
  regio: ['aankoopproces', 'juridisch', 'verhuur'],
  algemeen: ['aankoopproces', 'juridisch', 'verhuur']
};

// Topic cluster scoring for intelligent related article suggestions
const calculateTopicRelevance = (post: BlogPost, currentPost: BlogPost): number => {
  let score = 0;
  
  // Same category = bonus (verlaagd voor betere cross-category mix)
  if (post.category === currentPost.category) {
    score += 50;
  } else {
    // Cross-category: check of categorie gerelateerd is
    const relatedCategories = categoryRelationships[currentPost.category.toLowerCase()] || [];
    if (relatedCategories.includes(post.category.toLowerCase())) {
      score += 30;
    }
  }
  
  // Keyword overlap in title
  const currentKeywords = currentPost.title.toLowerCase().split(/\s+/);
  const postKeywords = post.title.toLowerCase().split(/\s+/);
  const keywordOverlap = currentKeywords.filter(word => 
    word.length > 4 && postKeywords.includes(word)
  ).length;
  score += keywordOverlap * 20;
  
  // Meta keywords overlap
  if (currentPost.meta_keywords && post.meta_keywords) {
    const sharedKeywords = currentPost.meta_keywords.filter(keyword =>
      post.meta_keywords?.includes(keyword)
    ).length;
    score += sharedKeywords * 15;
  }
  
  // Content similarity based on intro
  const currentIntroWords = currentPost.intro.toLowerCase().split(/\s+/);
  const postIntroWords = post.intro.toLowerCase().split(/\s+/);
  const introOverlap = currentIntroWords.filter(word =>
    word.length > 5 && postIntroWords.includes(word)
  ).length;
  score += introOverlap * 10;
  
  return score;
};

export const RelatedArticles = ({ currentPostId, currentCategory, allPosts, onArticleClick }: RelatedArticlesProps) => {
  // Get current post for topic clustering
  const currentPost = allPosts.find(p => p.id === currentPostId);
  if (!currentPost) return null;

  // Score and rank posts by topic relevance
  const scoredPosts = allPosts
    .filter(post => 
      post.id !== currentPostId && 
      post.published === true
    )
    .map(post => ({
      post,
      score: calculateTopicRelevance(post, currentPost),
      isCrossCategory: post.category.toLowerCase() !== currentPost.category.toLowerCase()
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(item => ({ 
      post: item.post, 
      isCrossCategory: item.isCrossCategory,
      score: item.score 
    }));

  if (scoredPosts.length === 0) return null;

  const handleArticleClick = async (clickedPost: typeof scoredPosts[0]) => {
    if (onArticleClick) {
      onArticleClick();
    }

    // Track cross-category click with metadata
    const visitorId = localStorage.getItem('tis_visitor_id');
    if (!visitorId) return;

    try {
      await supabase.from('tracking_events').insert({
        visitor_id: visitorId,
        event_name: 'blog_related_article_click',
        site: 'topimmospain',
        path: window.location.pathname,
        full_url: window.location.href,
        event_params: {
          source_post_id: currentPostId,
          source_category: currentPost.category,
          target_post_id: clickedPost.post.id,
          target_category: clickedPost.post.category,
          target_slug: clickedPost.post.slug,
          is_cross_category: clickedPost.isCrossCategory,
          relevance_score: clickedPost.score
        }
      });
    } catch (error) {
      console.error('Failed to track related article click:', error);
    }
  };

  return (
    <section className="py-12 border-t">
      <div className="mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          Gerelateerde artikelen
        </h2>
        <p className="text-muted-foreground">
          Deze artikelen zijn ook relevant voor jouw zoektocht
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {scoredPosts.map((item) => {
          const readTime = calculateReadTime(item.post.content);
          
          return (
            <Card key={item.post.id} className="group hover:shadow-lg transition-all duration-300">
              {item.post.featured_image && (
                <div className="relative h-40 overflow-hidden rounded-t-lg">
                  <img
                    src={item.post.featured_image}
                    alt={item.post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-2 text-xs">
                  <BlogCategoryBadge category={item.post.category} className="text-xs" />
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{readTime} min</span>
                  </div>
                </div>
                <h3 className="text-lg font-bold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                  {item.post.title}
                </h3>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {item.post.intro}
                </p>
                <Link to={`/blog/${item.post.slug}`} onClick={() => handleArticleClick(item)}>
                  <Button variant="ghost" size="sm" className="p-0 h-auto font-semibold group/btn">
                    Lees meer
                    <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
};
