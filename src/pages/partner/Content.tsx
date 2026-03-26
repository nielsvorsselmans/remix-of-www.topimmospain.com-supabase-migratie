import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePartner } from "@/contexts/PartnerContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { BlogCategoryBadge } from "@/components/BlogCategoryBadge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { getOptimizedImageUrl } from "@/lib/utils";
import {
  Copy, Check, FileText, Eye, Share2, Trophy,
  EyeOff, CheckCircle, Lightbulb, MoreVertical, Sparkles,
  Search, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";

const SITE_URL = "https://www.topimmospain.com";
const ITEMS_PER_PAGE = 12;

type ContentTab = "new" | "shared" | "dismissed" | "all";
type SortOption = "newest" | "most_shared" | "most_views" | "az";

// Category-based sharing tips for partners
const SHARING_TIPS: Record<string, string> = {
  rendement: "Rendement-artikelen werken het best als je er een concreet voorbeeld of eigen ervaring aan koppelt. 'Een klant van mij behaalde dit rendement...' wekt vertrouwen.",
  financiering: "Financieringsartikelen zijn waardevol — positioneer jezelf als expert door te zeggen: 'Dit is wat ik mijn klanten altijd adviseer over hypotheken in Spanje.'",
  juridisch: "Juridische content bouwt autoriteit. Voeg toe waarom dit relevant is voor jouw doelgroep en wat jij als adviseur hierin kunt betekenen.",
  belastingen: "Fiscale tips zijn waardevol — deel vanuit je eigen expertise: 'Dit is een vraag die ik vaak krijg van klanten. Dit artikel legt het helder uit.'",
  aankoopproces: "Deel dit artikel met een persoonlijke noot over hoe jij klanten begeleidt in dit proces. Dat maakt het concreet en herkenbaar.",
  regio: "Regio-content scoort op emotie. Deel een persoonlijke anekdote of foto van de omgeving — dat maakt het menselijk en aantrekkelijk.",
  praktisch: "Praktische tips zijn perfect om te delen als 'snelle tip' op social media. Voeg toe: 'Dit is iets waar veel van mijn klanten tegenaan lopen.'",
  algemeen: "Voeg altijd een persoonlijke noot toe aan je post. Waarom deel je dit? Wat maakt het relevant voor jouw netwerk?",
};

function getSharingTip(category: string): string {
  return SHARING_TIPS[category.toLowerCase()] || SHARING_TIPS.algemeen;
}

export default function PartnerContent() {
  const { currentPartner, impersonatedPartner } = usePartner();
  const activePartner = impersonatedPartner || currentPartner;
  const partnerId = activePartner?.id || "";
  const partnerSlug = activePartner?.slug || "";
  const partnerName = activePartner?.name?.split(" ")[0] || "Partner";
  const queryClient = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState<string>("Alle");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ContentTab>("new");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [currentPage, setCurrentPage] = useState(1);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data: posts, isLoading } = useQuery({
    queryKey: ["partner-content-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, intro, category, featured_image, published_at, created_at")
        .eq("published", true)
        .order("published_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: shareCounts } = useQuery({
    queryKey: ["partner-content-shares", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_content_shares")
        .select("blog_post_id, share_type")
        .eq("partner_id", partnerId);

      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((row) => {
        counts[row.blog_post_id] = (counts[row.blog_post_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!partnerId,
    staleTime: 2 * 60 * 1000,
  });

  const { data: contentStatuses } = useQuery({
    queryKey: ["partner-content-status", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_content_status")
        .select("blog_post_id, status")
        .eq("partner_id", partnerId);

      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((row) => {
        map[row.blog_post_id] = row.status;
      });
      return map;
    },
    enabled: !!partnerId,
    staleTime: 2 * 60 * 1000,
  });

  const { data: pageStats } = useQuery({
    queryKey: ["partner-content-page-stats", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-partner-page-stats', {
        body: { partner_id: partnerId, days: 0 },
      });
      if (error) throw error;
      const stats = data?.page_stats || [];
      // Build slug -> stats map
      const slugMap: Record<string, { views: number; visitors: number }> = {};
      let totalViews = 0;
      for (const s of stats) {
        totalViews += s.total_views || 0;
        const match = s.path?.match(/^\/blog\/([^/?]+)/);
        if (match) {
          slugMap[match[1]] = {
            views: s.total_views || 0,
            visitors: s.unique_visitors || 0,
          };
        }
      }
      return { slugMap, totalViews };
    },
    enabled: !!partnerId,
    staleTime: 5 * 60 * 1000,
  });

  const categories = ["Alle", ...new Set(posts?.map((p) => p.category) || [])];

  // Filter by category
  const categoryFiltered = useMemo(() => {
    if (!posts) return [];
    return selectedCategory === "Alle"
      ? posts
      : posts.filter((p) => p.category === selectedCategory);
  }, [posts, selectedCategory]);

  // Filter by tab
  const tabFiltered = useMemo(() => {
    if (!categoryFiltered || !contentStatuses) return categoryFiltered;
    switch (activeTab) {
      case "new":
        return categoryFiltered.filter((p) => !contentStatuses[p.id]);
      case "shared":
        return categoryFiltered.filter((p) => contentStatuses[p.id] === "shared");
      case "dismissed":
        return categoryFiltered.filter((p) => contentStatuses[p.id] === "dismissed");
      case "all":
      default:
        return categoryFiltered;
    }
  }, [categoryFiltered, contentStatuses, activeTab]);

  // Filter by search
  const searchFiltered = useMemo(() => {
    if (!tabFiltered || !debouncedSearch) return tabFiltered;
    const q = debouncedSearch.toLowerCase();
    return tabFiltered.filter(
      (p) => p.title.toLowerCase().includes(q) || p.intro.toLowerCase().includes(q)
    );
  }, [tabFiltered, debouncedSearch]);

  // Sort
  const sortedPosts = useMemo(() => {
    if (!searchFiltered) return [];
    const sorted = [...searchFiltered];
    switch (sortOption) {
      case "most_shared":
        sorted.sort((a, b) => (shareCounts?.[b.id] || 0) - (shareCounts?.[a.id] || 0));
        break;
      case "most_views":
        sorted.sort((a, b) => (pageStats?.slugMap[b.slug]?.views || 0) - (pageStats?.slugMap[a.slug]?.views || 0));
        break;
      case "az":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "newest":
      default:
        // Already sorted by published_at desc from query
        break;
    }
    return sorted;
  }, [searchFiltered, sortOption, shareCounts, pageStats]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil((sortedPosts?.length || 0) / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPosts = useMemo(() => {
    if (!sortedPosts) return [];
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return sortedPosts.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedPosts, safePage]);

  // Reset page when filters change
  const resetPage = () => setCurrentPage(1);

  const tabCounts = useMemo(() => {
    if (!categoryFiltered || !contentStatuses) return { new: 0, shared: 0, dismissed: 0, all: 0 };
    return {
      new: categoryFiltered.filter((p) => !contentStatuses[p.id]).length,
      shared: categoryFiltered.filter((p) => contentStatuses[p.id] === "shared").length,
      dismissed: categoryFiltered.filter((p) => contentStatuses[p.id] === "dismissed").length,
      all: categoryFiltered.length,
    };
  }, [categoryFiltered, contentStatuses]);

  const bestPerformingId = shareCounts
    ? Object.entries(shareCounts).sort(([, a], [, b]) => b - a)[0]?.[0]
    : null;

  // Hero article: newest unshared article
  const heroArticle = useMemo(() => {
    if (!posts || !contentStatuses) return null;
    return posts.find((p) => !contentStatuses[p.id]) || null;
  }, [posts, contentStatuses]);

  const buildShareUrl = (slug: string) =>
    `${SITE_URL}/blog/${slug}?partner=${partnerSlug}&utm_source=partner&utm_medium=social&utm_campaign=${partnerSlug}`;

  const logShare = async (blogPostId: string, shareType: string) => {
    if (!partnerId) return;
    try {
      await supabase.from("partner_content_shares").insert({
        partner_id: partnerId,
        blog_post_id: blogPostId,
        share_type: shareType,
      });
    } catch (err) {
      console.error("Error logging share:", err);
    }
  };

  const setContentStatus = async (blogPostId: string, status: "shared" | "dismissed") => {
    if (!partnerId) return;
    try {
      const { error } = await supabase
        .from("partner_content_status")
        .upsert(
          { partner_id: partnerId, blog_post_id: blogPostId, status },
          { onConflict: "partner_id,blog_post_id" }
        );
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["partner-content-status", partnerId] });
    } catch (err) {
      console.error("Error setting content status:", err);
      toast.error("Kon status niet bijwerken");
    }
  };

  const removeContentStatus = async (blogPostId: string) => {
    if (!partnerId) return;
    try {
      const { error } = await supabase
        .from("partner_content_status")
        .delete()
        .eq("partner_id", partnerId)
        .eq("blog_post_id", blogPostId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["partner-content-status", partnerId] });
    } catch (err) {
      console.error("Error removing content status:", err);
    }
  };

  const handleCopyLink = async (postId: string, slug: string) => {
    try {
      await navigator.clipboard.writeText(buildShareUrl(slug));
      setCopiedId(postId);
      toast.success("Link gekopieerd met jouw tracking!");
      logShare(postId, "copy_link");
      setContentStatus(postId, "shared");
      queryClient.invalidateQueries({ queryKey: ["partner-content-shares", partnerId] });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Kon link niet kopiëren");
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "short",
    });

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  const totalShares = shareCounts ? Object.values(shareCounts).reduce((a, b) => a + b, 0) : 0;
  const totalPageViews = pageStats?.totalViews || 0;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Personalized impact banner */}
      <Card className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold mb-1">
                Hoi {partnerName}! 👋
              </h1>
              <p className="text-sm text-muted-foreground">
                {totalShares > 0 || totalPageViews > 0
                  ? `Jouw gedeelde content heeft ${totalPageViews} pageviews opgeleverd. Blijf delen om je bereik te vergroten!`
                  : "Deel je eerste artikel om hier jouw resultaten te zien. Elke klik via jouw link wordt automatisch getrackt!"}
              </p>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  <Share2 className="h-4 w-4 text-primary" />
                  {totalShares}x gedeeld
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Eye className="h-4 w-4 text-chart-2" />
                  {totalPageViews} pageviews
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {posts?.length || 0} artikelen
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hero: recommended article */}
      {heroArticle && activeTab === "new" && (
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-background to-primary/[0.02]">
          <div className="flex flex-col md:flex-row">
            {heroArticle.featured_image && (
              <div className="md:w-2/5 h-48 md:h-auto overflow-hidden shrink-0">
                <img
                  src={getOptimizedImageUrl(heroArticle.featured_image, 800, 80)}
                  alt={heroArticle.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardContent className="flex-1 p-5 md:p-6 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1 text-xs">
                    <Sparkles className="h-3 w-3" />
                    Aanbevolen
                  </Badge>
                  <BlogCategoryBadge category={heroArticle.category} />
                  {pageStats?.slugMap[heroArticle.slug] && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                      <Eye className="h-3 w-3" /> {pageStats.slugMap[heroArticle.slug].views} views
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold leading-tight mb-2">
                  {heroArticle.title}
                </h2>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {heroArticle.intro}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs text-muted-foreground hover:text-primary"
                  asChild
                >
                  <a href={`${SITE_URL}/blog/${heroArticle.slug}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" /> Lees artikel
                  </a>
                </Button>
                <Button
                  size="sm"
                  className="ml-auto gap-2"
                  onClick={() => handleCopyLink(heroArticle.id, heroArticle.slug)}
                >
                  {copiedId === heroArticle.id ? (
                    <><Check className="h-4 w-4" /> Gekopieerd!</>
                  ) : (
                    <><Copy className="h-4 w-4" /> Kopieer deellink</>
                  )}
                </Button>
              </div>
            </CardContent>
          </div>
        </Card>
      )}

      {/* Search & Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek artikelen..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); resetPage(); }}
            className="pl-9"
          />
        </div>
        <Select value={sortOption} onValueChange={(v) => { setSortOption(v as SortOption); resetPage(); }}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Sorteren" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Nieuwste</SelectItem>
            <SelectItem value="most_shared">Meest gedeeld</SelectItem>
            <SelectItem value="most_views">Meeste kliks</SelectItem>
            <SelectItem value="az">A-Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status tabs */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as ContentTab); resetPage(); }}>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="new">Nieuw ({tabCounts.new})</TabsTrigger>
          <TabsTrigger value="shared">Gedeeld ({tabCounts.shared})</TabsTrigger>
          <TabsTrigger value="dismissed">Verborgen ({tabCounts.dismissed})</TabsTrigger>
          <TabsTrigger value="all">Alle ({tabCounts.all})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => { setSelectedCategory(cat); resetPage(); }}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Posts grid */}
      {!paginatedPosts || paginatedPosts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {debouncedSearch
              ? `Geen artikelen gevonden voor "${debouncedSearch}".`
              : activeTab === "new"
                ? "Geen nieuwe artikelen — je hebt alles beoordeeld! 🎉"
                : activeTab === "shared"
                  ? "Je hebt nog geen artikelen gedeeld."
                  : activeTab === "dismissed"
                    ? "Geen verborgen artikelen."
                    : "Geen artikelen gevonden."}
          </p>
          {activeTab !== "new" && activeTab !== "all" && !debouncedSearch && (
            <Button variant="link" size="sm" className="mt-2" onClick={() => setActiveTab("new")}>
              Bekijk nieuwe artikelen
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedPosts
              .filter((p) => heroArticle && activeTab === "new" ? p.id !== heroArticle.id : true)
              .map((post) => {
                const shares = shareCounts?.[post.id] || 0;
                const isBestPerformer = bestPerformingId === post.id && shares > 0;
                const status = contentStatuses?.[post.id];
                const articleStats = pageStats?.slugMap[post.slug];

                return (
                  <Card
                    key={post.id}
                    className={`group overflow-hidden flex flex-col ${isBestPerformer ? "ring-2 ring-amber-500/50" : ""} ${status === "dismissed" ? "opacity-60" : ""}`}
                  >
                    {/* Image with badges & dropdown */}
                    <div className="relative h-40 overflow-hidden">
                      {post.featured_image ? (
                        <img
                          src={getOptimizedImageUrl(post.featured_image, 500, 75)}
                          alt={post.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <FileText className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                      )}

                      {/* Top-left badges */}
                      <div className="absolute top-2 left-2 flex gap-1">
                        {isBestPerformer && (
                          <Badge className="bg-amber-500 text-white gap-1 text-xs">
                            <Trophy className="h-3 w-3" /> Top
                          </Badge>
                        )}
                        {status === "shared" && (
                          <Badge className="bg-green-600 text-white gap-1 text-xs">
                            <CheckCircle className="h-3 w-3" /> Gedeeld
                          </Badge>
                        )}
                      </div>

                      {/* Top-right dropdown for status actions */}
                      <div className="absolute top-2 right-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="secondary"
                              size="icon"
                              className="h-7 w-7 bg-background/80 backdrop-blur-sm hover:bg-background"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {status === "shared" ? (
                              <DropdownMenuItem onClick={() => removeContentStatus(post.id)}>
                                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                Markering verwijderen
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => setContentStatus(post.id, "shared")}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Markeer als gedeeld
                              </DropdownMenuItem>
                            )}
                            {status === "dismissed" ? (
                              <DropdownMenuItem onClick={() => removeContentStatus(post.id)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Weer tonen
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => setContentStatus(post.id, "dismissed")}>
                                <EyeOff className="h-4 w-4 mr-2" />
                                Verbergen
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Content */}
                    <CardContent className="flex-1 flex flex-col p-4 gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <BlogCategoryBadge category={post.category} className="text-xs" />
                          <span className="text-xs text-muted-foreground">
                            {formatDate(post.published_at || post.created_at)}
                          </span>
                          {shares > 0 && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5 ml-auto">
                              <Share2 className="h-3 w-3" /> {shares}x
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-semibold leading-snug line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {post.intro}
                        </p>
                      </div>

                      {/* Per-article stats */}
                      {articleStats && articleStats.views > 0 && (
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" /> {articleStats.views} views
                          </span>
                          <span className="flex items-center gap-1">
                            👤 {articleStats.visitors} bezoekers
                          </span>
                        </div>
                      )}

                      {/* Sharing tip - collapsible */}
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <button className="flex items-center gap-1.5 text-xs text-primary/80 hover:text-primary transition-colors w-full text-left">
                            <Lightbulb className="h-3.5 w-3.5 shrink-0" />
                            <span>Deeltip bekijken</span>
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="mt-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {getSharingTip(post.category)}
                            </p>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      {/* Preview link */}
                      <a
                        href={`${SITE_URL}/blog/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Lees artikel
                      </a>

                      {/* Actions */}
                      <div className="mt-auto">
                        <Button
                          size="sm"
                          className="w-full gap-1.5 text-xs"
                          onClick={() => handleCopyLink(post.id, post.slug)}
                        >
                          {copiedId === post.id ? (
                            <><Check className="h-3.5 w-3.5" /> Gekopieerd!</>
                          ) : (
                            <><Copy className="h-3.5 w-3.5" /> Kopieer deellink</>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination className="mt-6">
              <PaginationContent>
                {safePage > 1 && (
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => { setCurrentPage(safePage - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="cursor-pointer"
                    />
                  </PaginationItem>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    if (totalPages <= 5) return true;
                    if (page === 1 || page === totalPages) return true;
                    return Math.abs(page - safePage) <= 1;
                  })
                  .map((page, idx, arr) => {
                    const items = [];
                    if (idx > 0 && page - arr[idx - 1] > 1) {
                      items.push(
                        <PaginationItem key={`ellipsis-${page}`}>
                          <span className="px-2 text-muted-foreground">…</span>
                        </PaginationItem>
                      );
                    }
                    items.push(
                      <PaginationItem key={page}>
                        <PaginationLink
                          isActive={page === safePage}
                          onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                    return items;
                  })}
                {safePage < totalPages && (
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => { setCurrentPage(safePage + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="cursor-pointer"
                    />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
}
