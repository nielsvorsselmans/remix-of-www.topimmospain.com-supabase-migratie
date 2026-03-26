import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Pencil, Eye, Trash2, Plus, MessageSquare, Star, MoreVertical, BookOpen, Link2, Download, Check, X, Tag, TrendingUp, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { ReviewFormDialog } from "@/components/ReviewFormDialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoogleBusinessConnectionCard } from "@/components/admin/reviews/GoogleBusinessConnectionCard";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Review {
  id: string;
  customer_name: string;
  location: string;
  quote: string;
  rating: number;
  customer_type: string | null;
  property_type: string | null;
  investment_type: string | null;
  year: number | null;
  image_url: string | null;
  active: boolean;
  featured: boolean;
  has_full_story: boolean;
  story_title: string | null;
  story_slug: string | null;
  story_intro: string | null;
  story_featured_image: string | null;
  story_content: string | null;
  created_at: string;
  updated_at: string;
  sale_id: string | null;
  crm_lead_id: string | null;
  source: string | null;
  source_review_id: string | null;
  import_status: string | null;
  context_tags: string[] | null;
  google_author_name: string | null;
  google_review_time: string | null;
  imported_at: string | null;
  sales?: {
    property_description: string | null;
    projects: { name: string; display_title: string | null; city: string | null } | null;
  } | null;
  crm_leads?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

const CUSTOMER_TYPES = [
  "Genieter-Investeerder",
  "Rendementsgerichte Investeerder",
  "Oriënterende Ontdekker",
];

const CONTEXT_TAGS = [
  "financiering",
  "hypotheek",
  "begeleiding",
  "regio",
  "infoavond",
  "aankoop",
  "service",
  "verhuur",
  "nieuwbouw",
];

const ReviewImpactMetrics = () => {
  const { data: impactData } = useQuery({
    queryKey: ['review-impact-metrics'],
    queryFn: async () => {
      // Get pageviews for klantverhalen pages (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: pageviews, error } = await supabase
        .from('tracking_events')
        .select('page_path')
        .like('page_path', '/klantverhalen/%')
        .gte('occurred_at', thirtyDaysAgo.toISOString());

      if (error) throw error;

      const totalViews = pageviews?.length || 0;

      // Count views per story
      const viewsByPath: Record<string, number> = {};
      pageviews?.forEach((e: any) => {
        const path = e.page_path;
        if (path && path !== '/klantverhalen/') {
          viewsByPath[path] = (viewsByPath[path] || 0) + 1;
        }
      });

      const topStories = Object.entries(viewsByPath)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([path, views]) => ({
          slug: path.replace('/klantverhalen/', ''),
          views,
        }));

      return { totalViews, topStories };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!impactData || impactData.totalViews === 0) return null;

  return (
    <Card className="p-4 border-primary/20 bg-primary/5">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Review Impact (30 dagen)</h3>
      </div>
      <div className="flex flex-wrap gap-6 items-start">
        <div>
          <p className="text-2xl font-bold text-primary">{impactData.totalViews}</p>
          <p className="text-xs text-muted-foreground">Pageviews klantverhalen</p>
        </div>
        {impactData.topStories.length > 0 && (
          <div className="flex-1 min-w-[200px]">
            <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Top verhalen
            </p>
            <div className="space-y-1">
              {impactData.topStories.map((story) => (
                <div key={story.slug} className="flex items-center justify-between text-sm">
                  <Link
                    to={`/klantverhalen/${story.slug}`}
                    className="text-primary hover:underline truncate max-w-[200px]"
                    target="_blank"
                  >
                    {story.slug}
                  </Link>
                  <span className="text-muted-foreground text-xs ml-2">{story.views}×</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

const Reviews = () => {
  const queryClient = useQueryClient();

  const { data: reviews = [], isLoading: loading } = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select(`
          *,
          sales (property_description, projects (name, display_title, city)),
          crm_leads (first_name, last_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [caseStudyFilter, setCaseStudyFilter] = useState<string>("all");
  const [couplingFilter, setCouplingFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [importStatusFilter, setImportStatusFilter] = useState<string>("all");
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const stats = useMemo(() => {
    const total = reviews.length;
    const active = reviews.filter((r) => r.active).length;
    const withCaseStudy = reviews.filter((r) => r.has_full_story).length;
    const featured = reviews.filter((r) => r.featured).length;
    const pendingReview = reviews.filter((r) => r.import_status === 'pending_review').length;
    const googleReviews = reviews.filter((r) => r.source === 'google').length;

    return { total, active, withCaseStudy, featured, pendingReview, googleReviews };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    let filtered = reviews;

    if (searchQuery) {
      filtered = filtered.filter(
        (review) =>
          review.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          review.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          review.quote.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (customerTypeFilter !== "all") {
      filtered = filtered.filter((r) => r.customer_type === customerTypeFilter);
    }

    if (statusFilter !== "all") {
      if (statusFilter === "active") {
        filtered = filtered.filter((r) => r.active);
      } else {
        filtered = filtered.filter((r) => !r.active);
      }
    }

    if (caseStudyFilter !== "all") {
      if (caseStudyFilter === "yes") {
        filtered = filtered.filter((r) => r.has_full_story);
      } else {
        filtered = filtered.filter((r) => !r.has_full_story);
      }
    }

    if (couplingFilter !== "all") {
      if (couplingFilter === "sale") {
        filtered = filtered.filter((r) => r.sale_id);
      } else if (couplingFilter === "lead") {
        filtered = filtered.filter((r) => r.crm_lead_id && !r.sale_id);
      } else if (couplingFilter === "none") {
        filtered = filtered.filter((r) => !r.sale_id && !r.crm_lead_id);
      }
    }

    if (sourceFilter !== "all") {
      filtered = filtered.filter((r) => r.source === sourceFilter);
    }

    if (importStatusFilter !== "all") {
      filtered = filtered.filter((r) => r.import_status === importStatusFilter);
    }

    return filtered;
  }, [reviews, searchQuery, customerTypeFilter, statusFilter, caseStudyFilter, couplingFilter, sourceFilter, importStatusFilter]);

  const handleEdit = (review: Review) => {
    setEditingReview(review);
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setEditingReview(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("reviews").delete().eq("id", id);

      if (error) throw error;

      toast.success("Review verwijderd");
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    } catch (error) {
      console.error("Error deleting review:", error);
      toast.error("Fout bij verwijderen van review");
    } finally {
      setDeletingReviewId(null);
    }
  };

  const toggleFeatured = async (review: Review) => {
    try {
      const { error } = await supabase
        .from("reviews")
        .update({ featured: !review.featured })
        .eq("id", review.id);

      if (error) throw error;

      toast.success(review.featured ? "Niet meer featured" : "Nu featured");
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    } catch (error) {
      console.error("Error toggling featured:", error);
      toast.error("Fout bij wijzigen featured status");
    }
  };

  const approveReview = async (review: Review, contextTags: string[] = []) => {
    try {
      const { error } = await supabase
        .from("reviews")
        .update({ 
          import_status: 'approved',
          active: true,
          context_tags: contextTags.length > 0 ? contextTags : review.context_tags || []
        })
        .eq("id", review.id);

      if (error) throw error;

      toast.success("Review goedgekeurd en geactiveerd");
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    } catch (error) {
      console.error("Error approving review:", error);
      toast.error("Fout bij goedkeuren van review");
    }
  };

  const rejectReview = async (review: Review) => {
    try {
      const { error } = await supabase
        .from("reviews")
        .update({ import_status: 'rejected' })
        .eq("id", review.id);

      if (error) throw error;

      toast.success("Review afgewezen");
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    } catch (error) {
      console.error("Error rejecting review:", error);
      toast.error("Fout bij afwijzen van review");
    }
  };

  const updateContextTags = async (review: Review, tags: string[]) => {
    try {
      const { error } = await supabase
        .from("reviews")
        .update({ context_tags: tags })
        .eq("id", review.id);

      if (error) throw error;

      toast.success("Context-tags bijgewerkt");
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    } catch (error) {
      console.error("Error updating context tags:", error);
      toast.error("Fout bij bijwerken van tags");
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    );
  };

  const ReviewCard = ({ review }: { review: Review }) => (
    <Card className="group relative overflow-hidden hover:shadow-lg transition-shadow">
      {/* Featured indicator */}
      {review.featured && (
        <div className="absolute top-3 right-3 z-10">
          <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
        </div>
      )}
      
      <CardContent className="p-5">
        {/* Header: Avatar + Name + Actions */}
        <div className="flex items-start gap-4 mb-4">
          <Avatar className="h-14 w-14 border-2 border-background shadow-sm">
            <AvatarImage src={review.image_url || ""} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {review.customer_name.split(" ").map(n => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{review.customer_name}</h3>
            <p className="text-sm text-muted-foreground">{review.location}</p>
            <div className="mt-1">{renderStars(review.rating)}</div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 max-sm:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(review)}>
                <Pencil className="h-4 w-4 mr-2" />
                Bewerken
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleFeatured(review)}>
                <Star className={`h-4 w-4 mr-2 ${review.featured ? "fill-current" : ""}`} />
                {review.featured ? "Niet meer featured" : "Featured maken"}
              </DropdownMenuItem>
              {review.has_full_story && review.story_slug && (
                <DropdownMenuItem asChild>
                  <Link to={`/klantverhalen/${review.story_slug}`} target="_blank">
                    <Eye className="h-4 w-4 mr-2" />
                    Bekijk verhaal
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setDeletingReviewId(review.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Verwijderen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Quote */}
        <blockquote className="text-sm text-muted-foreground italic leading-relaxed mb-4 line-clamp-4">
          "{review.quote}"
        </blockquote>

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          {/* Import Status for pending reviews */}
          {review.import_status === 'pending_review' && (
            <Badge variant="outline" className="border-orange-500 text-orange-600 bg-orange-50">
              Te beoordelen
            </Badge>
          )}
          {review.import_status === 'rejected' && (
            <Badge variant="outline" className="border-red-500 text-red-600">
              Afgewezen
            </Badge>
          )}

          {/* Status */}
          <Badge variant={review.active ? "default" : "secondary"} className={review.active ? "bg-green-600" : ""}>
            {review.active ? "Actief" : "Inactief"}
          </Badge>

          {/* Source */}
          {review.source === 'google' && (
            <Badge variant="outline" className="text-xs">
              Google
            </Badge>
          )}

          {/* Case Study */}
          {review.has_full_story && (
            <Badge variant="outline" className="border-blue-500 text-blue-600">
              <BookOpen className="h-3 w-3 mr-1" />
              Case Study
            </Badge>
          )}

          {/* Koppeling */}
          {review.sale_id && review.sales ? (
            <Link to={`/admin/verkopen/${review.sale_id}`}>
              <Badge className="bg-purple-600 hover:bg-purple-700 cursor-pointer">
                <Link2 className="h-3 w-3 mr-1" />
                Verkoop
              </Badge>
            </Link>
          ) : review.crm_lead_id && review.crm_leads ? (
            <Link to={`/admin/klanten/${review.crm_lead_id}`}>
              <Badge className="bg-blue-600 hover:bg-blue-700 cursor-pointer">
                <Link2 className="h-3 w-3 mr-1" />
                {[review.crm_leads.first_name, review.crm_leads.last_name].filter(Boolean).join(' ') || 'Klant'}
              </Badge>
            </Link>
          ) : null}

          {/* Customer type */}
          {review.customer_type && (
            <Badge variant="outline" className="text-xs">
              {review.customer_type}
            </Badge>
          )}

          {/* Context Tags */}
          {review.context_tags && review.context_tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {review.context_tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  <Tag className="h-2 w-2 mr-1" />
                  {tag}
                </Badge>
              ))}
              {review.context_tags.length > 2 && (
                <Badge variant="secondary" className="text-xs">
                  +{review.context_tags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions for Pending Reviews */}
        {review.import_status === 'pending_review' && (
          <div className="flex gap-2 mt-4 pt-4 border-t">
            <Button
              size="sm"
              onClick={() => approveReview(review)}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 mr-1" />
              Goedkeuren
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => rejectReview(review)}
              className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
            >
              <X className="h-4 w-4 mr-1" />
              Afwijzen
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reviews Beheer</h1>
          <p className="text-muted-foreground">Beheer klantverhalen en case studies</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" />
          Nieuwe Review
        </Button>
      </div>

      {/* Google Business Connection */}
      <GoogleBusinessConnectionCard />

      {/* Compact Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Totaal</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Actief</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Case Studies</p>
          <p className="text-2xl font-bold text-blue-600">{stats.withCaseStudy}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Featured</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.featured}</p>
        </Card>
      </div>

      {/* Review Impact Metrics */}
      <ReviewImpactMetrics />

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op naam, locatie of quote..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <Select value={customerTypeFilter} onValueChange={setCustomerTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Klanttype" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle types</SelectItem>
                {CUSTOMER_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="active">Actief</SelectItem>
                <SelectItem value="inactive">Inactief</SelectItem>
              </SelectContent>
            </Select>

            <Select value={caseStudyFilter} onValueChange={setCaseStudyFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Case Study" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="yes">Met case study</SelectItem>
                <SelectItem value="no">Zonder</SelectItem>
              </SelectContent>
            </Select>

            <Select value={couplingFilter} onValueChange={setCouplingFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Koppeling" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="sale">Aan verkoop</SelectItem>
                <SelectItem value="lead">Aan klant</SelectItem>
                <SelectItem value="none">Losse reviews</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Bron" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle bronnen</SelectItem>
                <SelectItem value="viva_direct">Viva Vastgoed</SelectItem>
                <SelectItem value="google">Google</SelectItem>
              </SelectContent>
            </Select>

            <Select value={importStatusFilter} onValueChange={setImportStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Import Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="pending_review">Te beoordelen</SelectItem>
                <SelectItem value="approved">Goedgekeurd</SelectItem>
                <SelectItem value="rejected">Afgewezen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-sm text-muted-foreground">
            {filteredReviews.length} van {reviews.length} reviews
          </p>
        </div>
      </Card>

      {/* Reviews Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-5">
              <div className="flex items-start gap-4 mb-4">
                <Skeleton className="h-14 w-14 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <Skeleton className="h-20 w-full mb-4" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredReviews.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="font-semibold mb-2">Geen reviews gevonden</h3>
          <p className="text-muted-foreground text-sm">
            Probeer andere filters of voeg een nieuwe review toe.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}

      {/* Review Form Dialog */}
      <ReviewFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        review={editingReview}
        onSuccess={() => {
          setIsDialogOpen(false);
          setEditingReview(null);
          queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingReviewId} onOpenChange={() => setDeletingReviewId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
            <AlertDialogDescription>
              Deze actie kan niet ongedaan gemaakt worden. De review wordt permanent verwijderd.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingReviewId && handleDelete(deletingReviewId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Reviews;
