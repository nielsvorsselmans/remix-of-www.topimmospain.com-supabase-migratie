import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BlogSoftCTA } from "@/components/BlogSoftCTA";
import { useExternalBlogPosts, type BlogPost as ExternalBlogPost } from "@/hooks/useExternalData";
import { BlogCard } from "@/components/BlogCard";
import { BlogListItem } from "@/components/BlogListItem";
import { BlogCategoryBadge } from "@/components/BlogCategoryBadge";
import { FeaturedPostsCarousel } from "@/components/FeaturedPostsCarousel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Loader2, ArrowRight, Calendar, LayoutGrid, List } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { getOptimizedImageUrl } from "@/lib/utils";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type BlogPost = ExternalBlogPost;

// Klantgerichte categorie-mapping
const CATEGORY_MAP: Record<string, string> = {
  "Starten met investeren": "aankoopproces,algemeen,veelgestelde vragen",
  "Financiering & Kosten": "financiering",
  "Belastingen & Fiscaal": "belastingen",
  "Verhuur & Rendement": "verhuur",
  "Regio's & Locaties": "regio-informatie,juridisch",
};

const CATEGORY_ORDER = [
  "Starten met investeren",
  "Financiering & Kosten",
  "Belastingen & Fiscaal",
  "Verhuur & Rendement",
  "Regio's & Locaties",
];

function getThemeForCategory(dbCategory: string): string | null {
  const lower = dbCategory.toLowerCase();
  for (const [theme, cats] of Object.entries(CATEGORY_MAP)) {
    if (cats.split(",").some(c => c.trim() === lower)) return theme;
  }
  return null;
}

function getPostReadTime(content: any, intro: string): number {
  let wordCount = 0;
  if (content) {
    if (typeof content === 'string') {
      wordCount = content.split(/\s+/).length;
    } else if (typeof content === 'object') {
      wordCount = JSON.stringify(content).replace(/[{}\[\]",:]/g, ' ').split(/\s+/).filter(Boolean).length;
    }
  } else {
    wordCount = intro.split(/\s+/).length;
  }
  return Math.max(Math.ceil(wordCount / 200), 1);
}

type SortOption = "newest" | "oldest" | "readTime";
type ViewMode = "grid" | "list";

export default function BlogOverzicht() {
  const { blogPosts, loading } = useExternalBlogPosts();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(12);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Initialize category from URL parameter
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      const theme = getThemeForCategory(categoryParam);
      setSelectedTheme(theme || categoryParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (blogPosts) {
      const publishedPosts = blogPosts.filter(post => post.published);
      setPosts(publishedPosts);
    }
  }, [blogPosts]);

  // Calculate category counts
  const themeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const theme of CATEGORY_ORDER) {
      const dbCategories = CATEGORY_MAP[theme];
      if (!dbCategories) continue;
      const cats = dbCategories.split(",").map(c => c.trim().toLowerCase());
      counts[theme] = posts.filter(post => cats.includes(post.category.toLowerCase())).length;
    }
    return counts;
  }, [posts]);

  // Filter and sort
  const filteredPosts = useMemo(() => {
    let filtered = posts;

    if (selectedTheme) {
      const dbCategories = CATEGORY_MAP[selectedTheme];
      if (dbCategories) {
        const cats = dbCategories.split(",").map(c => c.trim().toLowerCase());
        filtered = filtered.filter(post => cats.includes(post.category.toLowerCase()));
      } else {
        filtered = filtered.filter(post => post.category === selectedTheme);
      }
    }

    if (searchQuery) {
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.intro.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    const sorted = [...filtered];
    switch (sortBy) {
      case "newest":
        sorted.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
        break;
      case "oldest":
        sorted.sort((a, b) => new Date(a.published_at).getTime() - new Date(b.published_at).getTime());
        break;
      case "readTime":
        sorted.sort((a, b) => getPostReadTime(a.content, a.intro) - getPostReadTime(b.content, b.intro));
        break;
    }

    return sorted;
  }, [searchQuery, selectedTheme, posts, sortBy]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(12);
  }, [searchQuery, selectedTheme, sortBy]);

  // Get available themes
  const availableThemes = CATEGORY_ORDER.filter(theme => (themeCounts[theme] || 0) > 0);

  const handleThemeChange = (theme: string | null) => {
    setSelectedTheme(theme);
    if (theme) {
      setSearchParams({ category: theme });
    } else {
      setSearchParams({});
    }
  };

  // Featured posts for carousel
  const featuredPosts = posts.filter((p: any) => p.is_featured === true);
  const carouselPosts = featuredPosts.length >= 3 ? featuredPosts.slice(0, 5) : posts.slice(0, 5);

  // Result count label
  const resultLabel = useMemo(() => {
    const count = filteredPosts.length;
    if (selectedTheme && searchQuery) {
      return `${count} artikel${count !== 1 ? 'en' : ''} in "${selectedTheme}" voor "${searchQuery}"`;
    }
    if (selectedTheme) {
      return `${count} artikel${count !== 1 ? 'en' : ''} in "${selectedTheme}"`;
    }
    if (searchQuery) {
      return `${count} artikel${count !== 1 ? 'en' : ''} voor "${searchQuery}"`;
    }
    return `${count} artikel${count !== 1 ? 'en' : ''}`;
  }, [filteredPosts.length, selectedTheme, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!loading && posts.length === 0) {
    return (
      <>
        <Helmet>
          <title>Kennisbank | Investeren in Spanje | Top Immo Spain</title>
        </Helmet>
        <div className="min-h-screen bg-background">
          <Navbar />
          <div className="container max-w-3xl mx-auto px-4 py-32 text-center space-y-4">
            <h1 className="text-3xl font-bold text-foreground">Kennisbank</h1>
            <p className="text-lg text-muted-foreground">
              Er zijn momenteel nog geen artikelen beschikbaar. Kom binnenkort terug voor handige informatie over investeren in Spanje.
            </p>
          </div>
          <Footer />
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Kennisbank | Investeren in Spanje | Top Immo Spain</title>
        <meta name="description" content="Alles wat je moet weten over investeren in Spanje: financiering, juridische zaken, belastingen en verhuur. Educatie, vertrouwen en begeleiding op één plek." />
        <link rel="canonical" href="https://www.topimmospain.com/blog" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Kennisbank | Investeren in Spanje | Top Immo Spain" />
        <meta property="og:description" content="Alles wat je moet weten over investeren in Spanje: financiering, juridische zaken, belastingen en verhuur. Educatie, vertrouwen en begeleiding op één plek." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.topimmospain.com/blog" />
        {posts.length > 0 && posts[0].featured_image && (
          <meta property="og:image" content={posts[0].featured_image} />
        )}
        
        {/* Hreflang tags */}
        <link rel="alternate" hrefLang="nl" href="https://www.topimmospain.com/blog" />
        <link rel="alternate" hrefLang="x-default" href="https://www.topimmospain.com/blog" />
        
        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": "Kennisbank - Top Immo Spain",
            "description": "Alles wat je moet weten over investeren in Spanje: financiering, juridische zaken, belastingen en verhuur.",
            "url": "https://www.topimmospain.com/blog",
            "inLanguage": "nl",
            "dateModified": posts.length > 0 ? (posts[0].updated_at || posts[0].published_at) : new Date().toISOString(),
            "publisher": {
              "@type": "Organization",
              "name": "Top Immo Spain",
              "logo": {
                "@type": "ImageObject",
                "url": "https://www.topimmospain.com/logo.png"
              }
            },
            "mainEntity": {
              "@type": "ItemList",
              "itemListElement": posts.map((post, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "url": `https://www.topimmospain.com/blog/${post.slug}`,
                "name": post.title
              }))
            }
          })}
        </script>
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Navbar />
      
      {/* Immersive Hero with Featured Article */}
      {filteredPosts.length > 0 && (
        <section className="relative h-[50vh] min-h-[400px] md:h-[70vh] md:min-h-[600px] overflow-hidden">
          <div className="absolute inset-0">
            <img 
              src={getOptimizedImageUrl(filteredPosts[0].featured_image, 1200, 85)} 
              alt={filteredPosts[0].title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
          </div>

          <div className="container max-w-7xl mx-auto px-4 relative h-full flex flex-col justify-end pb-16 pt-32">
            <div className="max-w-3xl space-y-4">
              <Breadcrumb className="mb-4 animate-fade-in">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild className="text-white/80 hover:text-white">
                      <Link to="/">Home</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="text-white/60" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-white">Blog</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

              <div className="flex items-center gap-3 mb-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/90 backdrop-blur-sm border border-white/20">
                  <span className="text-lg">⭐</span>
                  <span className="text-sm font-semibold text-white">Uitgelicht Artikel</span>
                </div>
                <BlogCategoryBadge category={filteredPosts[0].category} />
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight drop-shadow-lg">
                {filteredPosts[0].title}
              </h1>
              
              <p className="text-xl text-white/90 leading-relaxed drop-shadow-md">
                {filteredPosts[0].intro}
              </p>

              <div className="flex items-center gap-6 text-sm text-white/80 pt-4">
                {filteredPosts[0].published_at && (
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(filteredPosts[0].published_at), 'd MMMM yyyy', { locale: nl })}
                  </span>
                )}
              </div>

              <Link 
                to={`/blog/${filteredPosts[0].slug}`}
                className="inline-flex items-center gap-2 text-white font-semibold hover:gap-3 transition-all group mt-6 bg-primary/20 backdrop-blur-sm px-6 py-3 rounded-full border border-white/20"
              >
                Lees artikel
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </section>
      )}

      <div className="container max-w-7xl mx-auto px-4 pb-8">
        {/* Doel-statement / Kennisbank Intro */}
        <div className="py-12 text-center max-w-3xl mx-auto space-y-3">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Jouw kennisbank over investeren in Spanje
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Alles wat je moet weten over financiering, belastingen, verhuur en het aankoopproces — 
            op jouw tempo. Geen verkooppraatjes, wel heldere antwoorden.
          </p>
        </div>

        {/* Sticky Search, Sort and Theme Filters */}
        <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-sm border-b border-border pb-6 pt-4 -mx-4 px-4 space-y-4">
          {/* Search + Sort row */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-4xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="text"
                placeholder="Zoek artikelen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-base border-2 focus:border-primary/50 transition-colors"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-[180px] h-12">
                  <SelectValue placeholder="Sorteren" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Nieuwste eerst</SelectItem>
                  <SelectItem value="oldest">Oudste eerst</SelectItem>
                  <SelectItem value="readTime">Leestijd (kort → lang)</SelectItem>
                </SelectContent>
              </Select>
              {/* Grid/List toggle */}
              <div className="hidden sm:flex items-center border border-border rounded-md overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2.5 transition-colors ${
                    viewMode === "grid"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label="Grid weergave"
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2.5 transition-colors ${
                    viewMode === "list"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label="Lijst weergave"
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Theme filter pills */}
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => handleThemeChange(null)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                selectedTheme === null
                  ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg scale-105'
                  : 'bg-background border-2 border-border hover:border-primary/50 text-foreground hover:scale-105'
              }`}
            >
              Alle artikelen ({posts.length})
            </button>
            {availableThemes.map((theme) => (
              <button
                key={theme}
                onClick={() => handleThemeChange(theme)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedTheme === theme
                    ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg scale-105'
                    : 'bg-background border-2 border-border hover:border-primary/50 text-foreground hover:scale-105'
                }`}
              >
                {theme} ({themeCounts[theme] || 0})
              </button>
            ))}
          </div>
        </div>

        {/* Result count */}
        <div className="pt-6 pb-2">
          <p className="text-sm text-muted-foreground">{resultLabel}</p>
        </div>

        {/* Featured Posts Carousel - only show when enough posts and no filters */}
        {!selectedTheme && !searchQuery && posts.length > 1 && carouselPosts.length > 0 && (
          <FeaturedPostsCarousel posts={carouselPosts} />
        )}

        {/* Blog posts grid/list - Skip first post as it's featured in hero */}
        {filteredPosts.length > 1 ? (
          <div className="pb-8 space-y-8">
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPosts.slice(1, visibleCount + 1).map((post, index) => (
                  <div
                    key={post.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <BlogCard
                      title={post.title}
                      slug={post.slug}
                      intro={post.intro}
                      category={post.category}
                      author={post.author}
                      featured_image={post.featured_image}
                      published_at={post.published_at}
                      content={post.content}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredPosts.slice(1, visibleCount + 1).map((post, index) => (
                  <div
                    key={post.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <BlogListItem
                      title={post.title}
                      slug={post.slug}
                      intro={post.intro}
                      category={post.category}
                      author={post.author}
                      featured_image={post.featured_image}
                      published_at={post.published_at}
                      content={post.content}
                    />
                  </div>
                ))}
              </div>
            )}
            
            {/* Load More Button */}
            {visibleCount < filteredPosts.length - 1 && (
              <div className="flex justify-center pt-4">
                <Button
                  onClick={() => setVisibleCount(prev => prev + 12)}
                  variant="outline"
                  size="lg"
                  className="group"
                >
                  Laad meer artikelen
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            )}
          </div>
        ) : filteredPosts.length === 1 && (selectedTheme || searchQuery) ? (
          <div className="p-12 text-center border rounded-lg space-y-4">
            <Search className="w-12 h-12 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground">
              Geen extra artikelen gevonden met deze filters.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                handleThemeChange(null);
              }}
            >
              Wis filters
            </Button>
          </div>
        ) : filteredPosts.length <= 1 && !selectedTheme && !searchQuery ? (
          <div className="p-12 text-center border rounded-lg border-dashed space-y-2">
            <p className="text-muted-foreground">
              Meer artikelen volgen binnenkort. Blijf op de hoogte!
            </p>
          </div>
        ) : (
          <div className="p-12 text-center border rounded-lg space-y-4">
            <Search className="w-12 h-12 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground">
              Geen artikelen gevonden met deze filters.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                handleThemeChange(null);
              }}
            >
              Wis filters
            </Button>
          </div>
        )}

      </div>

      {/* Zachte, blog-specifieke CTA */}
      <BlogSoftCTA />

      <Footer />
      </div>
    </>
  );
}
