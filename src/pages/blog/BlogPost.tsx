import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BlogCategoryBadge } from "@/components/BlogCategoryBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Plane, Home, Loader2, Calendar, User, Clock, ArrowRight, Lightbulb } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import ReactMarkdown from "react-markdown";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useExternalBlogPosts, type BlogPost } from "@/hooks/useExternalData";
import { ReadingProgressBar } from "@/components/ReadingProgressBar";
import { RelatedArticles } from "@/components/RelatedArticles";
import { InlineRelatedLinks } from "@/components/InlineRelatedLinks";
import { useBlogTracking } from "@/hooks/useBlogTracking";
import { ExitIntentPopup } from "@/components/ExitIntentPopup";
import { BlogTableOfContents } from "@/components/BlogTableOfContents";
import { BlogSocialShare } from "@/components/BlogSocialShare";
import { BlogContentRenderer } from "@/components/BlogContentRenderer";
import { useJourneyPhase } from "@/hooks/useJourneyPhase";
import { BlogGatedContent } from "@/components/BlogGatedContent";
import { BlogUnifiedCTA } from "@/components/BlogUnifiedCTA";
import { CTASection } from "@/components/CTASection";
import { PartnerBlogBanner } from "@/components/PartnerBlogBanner";
import { BlogToolsCTA } from "@/components/BlogToolsCTA";

type BlogPostContent = {
  introduction?: string;
  sections?: Array<{
    title: string;
    content: string;
    list?: string[];
    items?: Array<string | {
      subtitle: string;
      description: string;
    }>;
  }>;
  cards?: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
};

// Helper component to render text with markdown support
const RichText = ({ children }: { children: string }) => {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <span>{children}</span>,
        strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
};

// Calculate read time based on content
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

// Extract keywords from title for matching
const extractKeywords = (title: string): string[] => {
  const commonWords = ['de', 'het', 'een', 'in', 'van', 'voor', 'op', 'bij', 'je', 'mijn', 'is', 'wat', 'hoe', 'zijn'];
  return title
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.includes(word));
};

// Score posts based on keyword overlap
const scorePostRelevance = (
  currentTitle: string,
  currentCategory: string,
  post: BlogPost
): number => {
  let score = 0;
  const currentKeywords = extractKeywords(currentTitle);
  const postKeywords = extractKeywords(post.title);
  
  // Is this a related category?
  const relatedCategories = categoryRelationships[currentCategory.toLowerCase()] || [];
  if (relatedCategories.includes(post.category.toLowerCase())) {
    score += 2;
  }
  
  // Count keyword overlaps
  const keywordMatches = currentKeywords.filter(kw => 
    postKeywords.some(pk => pk.includes(kw) || kw.includes(pk))
  ).length;
  score += keywordMatches;
  
  return score;
};

// Get both same-category and cross-category related posts
const getCrossRelatedPosts = (
  allPosts: BlogPost[],
  currentPostId: string,
  category: string,
  title: string
): { sameCategoryPosts: BlogPost[], crossCategoryPosts: BlogPost[] } => {
  // Same category posts (max 2)
  const sameCategoryPosts = allPosts
    .filter(post => 
      post.id !== currentPostId &&
      post.category === category &&
      post.published === true
    )
    .slice(0, 2);
  
  // Cross category posts - score and sort by relevance
  const crossCategoryPosts = allPosts
    .filter(post => 
      post.id !== currentPostId &&
      post.category !== category &&
      post.published === true
    )
    .map(post => ({
      post,
      score: scorePostRelevance(title, category, post)
    }))
    .filter(item => item.score > 0) // Only include posts with some relevance
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(item => item.post);
  
  return { sameCategoryPosts, crossCategoryPosts };
};

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { blogPosts, loading } = useExternalBlogPosts();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [showExitIntent, setShowExitIntent] = useState(false);
  const [hasShownExitIntent, setHasShownExitIntent] = useState(false);
  const [scrollDepth, setScrollDepth] = useState(0);

  // Detect user journey phase
  const { phase: journeyPhase } = useJourneyPhase(post?.category);

  // Initialize blog tracking
  const { trackRelatedArticleClick, trackShare } = useBlogTracking(
    post ? {
      blogPostId: post.id,
      slug: post.slug,
      title: post.title,
      category: post.category
    } : {
      blogPostId: '',
      slug: '',
      title: '',
      category: ''
    }
  );

  useEffect(() => {
    if (!slug || loading) return;
    
    const foundPost = blogPosts.find(
      (p) => p.slug === slug && p.published === true
    );
    
    setPost(foundPost || null);
  }, [slug, blogPosts, loading]);

  // Scroll to top when article changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  // Exit intent detection
  useEffect(() => {
    if (!post || hasShownExitIntent) return;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !hasShownExitIntent) {
        setShowExitIntent(true);
        setHasShownExitIntent(true);
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [post, hasShownExitIntent]);

  // Scroll depth tracking for engagement-based components
  useEffect(() => {
    if (!post) return;

    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const scrollableDistance = documentHeight - windowHeight;
      const currentScrollDepth = Math.round((scrollTop / scrollableDistance) * 100);
      
      setScrollDepth(currentScrollDepth);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial calculation
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [post]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">Artikel niet gevonden</h1>
          <Button asChild>
            <Link to="/blog">Terug naar overzicht</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  // Parse content structure - handle both new (html.sections) and old formats
  const parseContent = (content: any): { sections: any[], introduction?: string } => {
    // New format: content.html.sections
    if (content?.html?.sections) {
      return { sections: content.html.sections };
    }
    // Old format: content.sections with title/content structure
    if (content?.sections && Array.isArray(content.sections)) {
      return { sections: content.sections, introduction: content.introduction };
    }
    // Fallback
    return { sections: [] };
  };

  const parsedContent = parseContent(post.content);

  const readTime = calculateReadTime(post.content);
  
  const wordCount = (() => {
    let count = 0;
    count += post.intro.split(/\s+/).length;
    if (post.content.introduction) {
      count += post.content.introduction.split(/\s+/).length;
    }
    if (post.content.sections) {
      post.content.sections.forEach((section: any) => {
        if (section.content) {
          count += section.content.split(/\s+/).length;
        }
        if (section.list) count += section.list.join(' ').split(/\s+/).length;
        if (section.items) count += JSON.stringify(section.items).split(/\s+/).length;
      });
    }
    return count;
  })();

  const faqItems = (() => {
    const faqs: Array<{ question: string; answer: string }> = [];
    if (post.content.sections) {
      post.content.sections.forEach(section => {
        if (section.title && section.content && 
            (section.title.includes('?') || section.title.toLowerCase().startsWith('wat ') || 
             section.title.toLowerCase().startsWith('hoe ') || section.title.toLowerCase().startsWith('waarom '))) {
          faqs.push({
            question: section.title,
            answer: section.content
          });
        }
      });
    }
    return faqs;
  })();

  const isHowTo = post.category === 'Financiering' || post.category === 'Juridisch' || 
                  post.title.toLowerCase().includes('proces') || 
                  post.title.toLowerCase().includes('stappen');

  const howToSteps = (() => {
    if (!isHowTo) return [];
    return parsedContent.sections
      .filter((section: any) => section.type === 'heading' && section.content)
      .map((section: any, index: number) => ({
        "@type": "HowToStep",
        "position": index + 1,
        "name": section.content,
        "text": parsedContent.sections[index + 1]?.content || "",
      }));
  })();
  
  // Filter sections for Table of Contents (only headings)
  const tocSections = parsedContent.sections
    .filter((section: any) => section.type === 'heading' && section.content)
    .map((section: any) => ({ title: section.content }));

  return (
    <>
      <ReadingProgressBar />
      <Helmet>
        <title>{post.title} | Top Immo Spain</title>
        <meta name="description" content={post.meta_description || post.intro} />
        {post.meta_keywords && (
          <meta name="keywords" content={post.meta_keywords.join(", ")} />
        )}
        <link rel="canonical" href={`https://www.topimmospain.com/blog/${post.slug}`} />
        
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.meta_description || post.intro} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://www.topimmospain.com/blog/${post.slug}`} />
        {post.featured_image && <meta property="og:image" content={post.featured_image} />}
        
        {/* Article-specific OG tags */}
        {post.published_at && <meta property="article:published_time" content={post.published_at} />}
        <meta property="article:modified_time" content={post.updated_at || post.published_at} />
        {post.author && <meta property="article:author" content={post.author} />}
        <meta property="article:section" content={post.category} />
        
        {/* Hreflang tags */}
        <link rel="alternate" hrefLang="nl" href={`https://www.topimmospain.com/blog/${post.slug}`} />
        <link rel="alternate" hrefLang="x-default" href={`https://www.topimmospain.com/blog/${post.slug}`} />
        
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://www.topimmospain.com"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Blog",
                "item": "https://www.topimmospain.com/blog"
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": post.title,
                "item": `https://www.topimmospain.com/blog/${post.slug}`
              }
            ]
          })}
        </script>
        
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": post.title,
            "description": post.meta_description || post.intro,
            "image": post.featured_image,
            "author": {
              "@type": "Person",
              "name": post.author
            },
            "publisher": {
              "@type": "Organization",
              "name": "Top Immo Spain",
              "logo": {
                "@type": "ImageObject",
                "url": "https://www.topimmospain.com/logo.png"
              }
            },
            "inLanguage": "nl",
            "datePublished": post.published_at,
            "dateModified": post.updated_at || post.published_at,
            "wordCount": wordCount,
            "articleSection": post.category,
            "speakable": {
              "@type": "SpeakableSpecification",
              "cssSelector": [".prose"]
            },
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": `https://www.topimmospain.com/blog/${post.slug}`
            }
          })}
        </script>

        {faqItems.length > 0 && (
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": faqItems.map(faq => ({
                "@type": "Question",
                "name": faq.question,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": faq.answer
                }
              }))
            })}
          </script>
        )}

        {isHowTo && howToSteps.length > 0 && (
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "HowTo",
              "name": post.title,
              "description": post.meta_description || post.intro,
              "image": post.featured_image,
              "totalTime": `PT${readTime}M`,
              "step": howToSteps
            })}
          </script>
        )}
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-50">
          <Navbar />
        </div>
        
        {/* Immersive Hero Section */}
        {post.featured_image ? (
          <div className="relative h-[60vh] min-h-[500px] w-full overflow-hidden">
            <img 
              src={post.featured_image} 
              alt={`${post.title} - ${post.category}`}
              className="absolute inset-0 w-full h-full object-cover"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-transparent" />
            
            <div className="relative container max-w-5xl mx-auto px-4 h-full flex flex-col justify-end pb-12">
              <Breadcrumb className="mb-6">
                <BreadcrumbList className="text-white/90">
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild className="text-white/90 hover:text-white">
                      <Link to="/">Home</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="text-white/60" />
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild className="text-white/90 hover:text-white">
                      <Link to="/blog">Blog</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="text-white/60" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-white">{post.title}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

              <div className="mb-4">
                <BlogCategoryBadge category={post.category} />
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 max-w-4xl animate-fade-in">
                {post.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-white/90 flex-wrap">
                {post.author && (
                  <>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{post.author}</span>
                    </div>
                    <span>•</span>
                  </>
                )}
                {post.published_at && (
                  <>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <time dateTime={post.published_at}>
                        {format(new Date(post.published_at), "d MMMM yyyy", { locale: nl })}
                      </time>
                    </div>
                    <span>•</span>
                  </>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{readTime} min leestijd</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-primary/10 via-background to-accent/10 py-16">
            <div className="container max-w-5xl mx-auto px-4">
              <Breadcrumb className="mb-6">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to="/">Home</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to="/blog">Blog</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{post.title}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

              <div className="mb-4">
                <BlogCategoryBadge category={post.category} />
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 max-w-4xl">
                {post.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                {post.author && (
                  <>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{post.author}</span>
                    </div>
                    <span>•</span>
                  </>
                )}
                {post.published_at && (
                  <>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <time dateTime={post.published_at}>
                        {format(new Date(post.published_at), "d MMMM yyyy", { locale: nl })}
                      </time>
                    </div>
                    <span>•</span>
                  </>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{readTime} min leestijd</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Two-column layout */}
        <div className="container max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main Content */}
            <article className="lg:col-span-8 space-y-8 animate-fade-in">
              {/* Partner referral banner */}
              <PartnerBlogBanner />

              {/* Intro */}
              {post.intro && (
                <div className="prose prose-lg max-w-none">
                  <p className="text-xl text-muted-foreground leading-relaxed">
                    <RichText>{post.intro}</RichText>
                  </p>
                </div>
              )}

              {/* Summary Section */}
              {post.summary && (
                <div className="bg-primary/5 border-l-4 border-primary p-6 rounded-r-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-primary-foreground font-bold text-sm">✓</span>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground mb-2">Samenvatting</h2>
                      <p className="text-base text-foreground leading-relaxed">
                        <RichText>{post.summary}</RichText>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Introduction - old format fallback */}
              {parsedContent.introduction && (
                <div className="prose prose-lg max-w-none">
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    <RichText>{parsedContent.introduction}</RichText>
                  </p>
                </div>
              )}

              <Separator />

              {/* Main Content - New Renderer */}
              <BlogContentRenderer sections={parsedContent.sections} />

              {/* Cards section */}
              {post.content.cards && post.content.cards.length > 0 && (
                <div className="grid md:grid-cols-2 gap-6">
                  {post.content.cards.map((card, index) => (
                    <Card key={index} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="text-4xl mb-3">{card.icon}</div>
                        <CardTitle className="text-xl">
                          <RichText>{card.title}</RichText>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-base text-muted-foreground leading-relaxed">
                          <RichText>{card.description}</RichText>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Example section with gated content demo */}
              {post.example_section && (
                <>
                  <Separator />
                  <BlogGatedContent
                    title="Exclusieve Voorbeeldberekening"
                    description="Zie exact hoe dit voor jouw situatie uitpakt met concrete cijfers en scenario's"
                    benefits={[
                      "Persoonlijke berekeningen met jouw gegevens",
                      "Concrete voorbeelden uit de praktijk",
                      "Downloadbare checklist en samenvatting"
                    ]}
                    previewContent={
                      <div className="bg-muted/30 p-8 rounded-lg">
                        <div className="text-lg text-muted-foreground leading-relaxed italic">
                          <RichText>{post.example_section}</RichText>
                        </div>
                      </div>
                    }
                  >
                    <div className="bg-muted/30 p-8 rounded-lg">
                      <div className="text-lg text-muted-foreground leading-relaxed italic">
                        <RichText>{post.example_section}</RichText>
                      </div>
                    </div>
                  </BlogGatedContent>
                </>
              )}

              {/* Inline Tools CTA */}
              <BlogToolsCTA variant="inline" category={post.category} />

              {/* Inline Related Links */}
              {post.content.sections && post.content.sections.length >= 3 && (() => {
                const contextMap: Record<string, "financiering" | "juridisch" | "belastingen" | "verhuur"> = {
                  "Financiering": "financiering",
                  "Juridisch": "juridisch",
                  "Belastingen": "belastingen",
                  "Verhuur": "verhuur"
                };
                const context = contextMap[post.category];
                const { sameCategoryPosts } = getCrossRelatedPosts(
                  blogPosts, 
                  post.id, 
                  post.category,
                  post.title
                );
                
                return context && sameCategoryPosts.length > 0 ? (
                  <InlineRelatedLinks 
                    posts={sameCategoryPosts}
                    context={context}
                  />
                ) : null;
              })()}

              {/* Online limitation */}
              {post.online_limitation && (
                <>
                  <Separator />
                  <section className="space-y-6">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                      Waarom je dit pas echt begrijpt ter plaatse
                    </h2>
                    <div className="text-lg text-muted-foreground leading-relaxed">
                      <RichText>{post.online_limitation}</RichText>
                    </div>
                  </section>
                </>
              )}

              {/* SEO Summary */}
              {post.seo_bullets && post.seo_bullets.length > 0 && (
                <>
                  <Separator />
                  <div className="bg-primary/5 p-8 rounded-lg">
                    <h3 className="text-xl font-bold text-foreground mb-6">
                      In dit artikel heb je ontdekt:
                    </h3>
                    <ul className="space-y-3">
                      {post.seo_bullets.map((bullet, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="text-primary mt-1 font-bold">→</span>
                          <span className="text-muted-foreground">
                            <RichText>{bullet}</RichText>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {/* Inline Social Share (bottom of article) */}
              <div className="my-8">
                <BlogSocialShare 
                  title={post.title}
                  slug={post.slug}
                  onShare={trackShare}
                  variant="inline"
                />
              </div>

              {/* Unified CTA with Rating */}
              <Separator />
              <BlogUnifiedCTA
                journeyPhase={journeyPhase}
                category={post.category}
                articleTitle={post.title}
                articleId={post.id}
              />

              {/* Related Articles */}
              <RelatedArticles 
                currentPostId={post.id} 
                currentCategory={post.category} 
                allPosts={blogPosts}
                onArticleClick={trackRelatedArticleClick}
              />
            </article>

            {/* Sticky Sidebar */}
            <aside className="lg:col-span-4 space-y-6">
              <div className="sticky top-24 space-y-6">
                {/* Table of Contents */}
                {tocSections.length > 0 && (
                  <div className="bg-card border rounded-lg p-4">
                    <BlogTableOfContents sections={tocSections} />
                  </div>
                )}

                {/* Social Share in Sidebar */}
                <div className="bg-card border rounded-lg p-4">
                  <BlogSocialShare 
                    title={post.title}
                    slug={post.slug}
                    onShare={trackShare}
                    variant="sidebar"
                  />
                </div>

                {/* Tools CTA */}
                <BlogToolsCTA variant="sidebar" category={post.category} />
              </div>
            </aside>
          </div>
        </div>

        <CTASection />

        <Footer />
        
        {/* Exit Intent Popup */}
        {showExitIntent && (
          <ExitIntentPopup
            blogPostId={post.id}
            slug={post.slug}
            journeyPhase={journeyPhase}
            onClose={() => setShowExitIntent(false)}
          />
        )}
      </div>
    </>
  );
}
