import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Pencil, Eye, Trash2, Plus, FileText, Sparkles, MoreHorizontal, ImageIcon, Download, MessageCircleQuestion } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { BlogPostFormDialog } from "@/components/BlogPostFormDialog";
import { BatchBlogImageGenerator } from "@/components/BatchBlogImageGenerator";
import { BlogImportButton } from "@/components/BlogImportButton";
import { AddToGuideButton } from "@/components/admin/AddToGuideButton";
import { BlogGeneratorDialog } from "@/components/admin/BlogGeneratorDialog";
import { TestAIAnalysisDialog } from "@/components/admin/TestAIAnalysisDialog";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  author: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  featured_image: string | null;
  intro: string;
  content: any;
  meta_description: string | null;
  meta_keywords: string[] | null;
  seo_bullets: string[];
}

const CATEGORIES = [
  "Aankoopproces",
  "Financiering",
  "Oriënteren",
  "belastingen",
  "juridisch",
  "verhuur",
  "Praktisch",
];

const BlogPosts = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isBatchImageOpen, setIsBatchImageOpen] = useState(false);
  const [isTestAIOpen, setIsTestAIOpen] = useState(false);

  const { data: postsData, isLoading: loading } = useQuery({
    queryKey: ["admin-blog-posts"],
    queryFn: async () => {
      const [postsRes, guideRes] = await Promise.all([
        supabase
          .from("blog_posts")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("orientation_guide_items")
          .select("blog_post_id")
          .not("blog_post_id", "is", null),
      ]);

      if (postsRes.error) throw postsRes.error;
      if (guideRes.error) throw guideRes.error;

      return {
        posts: (postsRes.data || []) as BlogPost[],
        guidePostIds: new Set(guideRes.data?.map(g => g.blog_post_id).filter(Boolean) as string[]),
      };
    },
  });

  const posts = postsData?.posts || [];
  const guidePostIds = postsData?.guidePostIds || new Set<string>();
  const refreshPosts = () => queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });

  const stats = useMemo(() => {
    const total = posts.length;
    const published = posts.filter((p) => p.published).length;
    const draft = posts.filter((p) => !p.published).length;
    const categories = new Set(posts.map((p) => p.category)).size;

    return { total, published, draft, categories };
  }, [posts]);

  const filteredAndSortedPosts = useMemo(() => {
    let filtered = posts;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (post) =>
          post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.intro.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((p) => p.category === categoryFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "published") {
        filtered = filtered.filter((p) => p.published);
      } else {
        filtered = filtered.filter((p) => !p.published);
      }
    }

    // Sorting
    const sorted = [...filtered];
    switch (sortBy) {
      case "title":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "category":
        sorted.sort((a, b) => a.category.localeCompare(b.category));
        break;
      case "published-date":
        sorted.sort((a, b) => {
          const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
          const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
          return dateB - dateA;
        });
        break;
      case "newest":
      default:
        sorted.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
    }

    return sorted;
  }, [posts, searchQuery, categoryFilter, statusFilter, sortBy]);

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setEditingPost(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);

      if (error) throw error;

      toast.success("Blog post verwijderd");
      refreshPosts();
    } catch (error) {
      console.error("Error deleting blog post:", error);
      toast.error("Fout bij verwijderen van blog post");
    } finally {
      setDeletingPostId(null);
    }
  };

  const handleGenerateSummaries = async () => {
    try {
      toast.info("AI genereert samenvattingen voor alle blog posts...");

      const { data, error } = await supabase.functions.invoke('generate-blog-summaries');

      if (error) throw error;

      toast.success(
        `${data.results.success} samenvattingen succesvol gegenereerd. ${data.results.failed} gefaald.`
      );

      refreshPosts();
    } catch (error) {
      console.error("Error generating summaries:", error);
      toast.error("Kon samenvattingen niet genereren");
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Niet gepubliceerd";
    return new Date(dateString).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">Beheer alle blog posts op de website</p>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Totaal Posts</CardDescription>
                  <CardTitle className="text-3xl">{stats.total}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Gepubliceerd</CardDescription>
                  <CardTitle className="text-3xl text-green-600">{stats.published}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Concept</CardDescription>
                  <CardTitle className="text-3xl text-orange-600">{stats.draft}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Categorieën</CardDescription>
                  <CardTitle className="text-3xl">{stats.categories}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Alle Blog Posts</CardTitle>
                    <CardDescription>
                      {filteredAndSortedPosts.length} van {posts.length} posts
                    </CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={() => setIsGeneratorOpen(true)}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      AI Genereer Blog
                    </Button>
                    <Button variant="outline" onClick={handleNew}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nieuwe Blog Post
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setIsBatchImageOpen(true)}>
                          <ImageIcon className="h-4 w-4 mr-2" />
                          Batch Genereer Afbeeldingen
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleGenerateSummaries}>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Genereer Samenvattingen
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsTestAIOpen(true)}>
                          <MessageCircleQuestion className="h-4 w-4 mr-2" />
                          Test AI Analyse
                        </DropdownMenuItem>
                        <BlogImportButton asDropdownItem />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Filters and Search */}
                <div className="space-y-3 mt-4">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Zoek op titel, slug of intro..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Categorie" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle categorieën</SelectItem>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle statussen</SelectItem>
                        <SelectItem value="published">Gepubliceerd</SelectItem>
                        <SelectItem value="draft">Concept</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Sorteren" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Nieuwste eerst</SelectItem>
                        <SelectItem value="title">Op titel</SelectItem>
                        <SelectItem value="category">Op categorie</SelectItem>
                        <SelectItem value="published-date">Publicatiedatum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Titel</TableHead>
                        <TableHead className="hidden sm:table-cell">Categorie</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden sm:table-cell">Datum</TableHead>
                        <TableHead className="text-right">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedPosts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>Geen blog posts gevonden</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAndSortedPosts.map((post) => {
                          const isInGuide = guidePostIds.has(post.id);
                          const displayDate = post.published 
                            ? post.published_at 
                            : post.updated_at;
                          const dateLabel = post.published ? "Gepubliceerd" : "Bijgewerkt";
                          
                          return (
                            <TableRow key={post.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {post.featured_image && (
                                    <img
                                      src={post.featured_image}
                                      alt=""
                                      className="h-8 w-12 object-cover rounded flex-shrink-0"
                                    />
                                  )}
                                  <div className="min-w-0">
                                    <div className="font-medium truncate">{post.title}</div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      /{post.slug}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                <Badge variant="outline">{post.category}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  {post.published ? (
                                    <Badge className="bg-green-600">Gepubliceerd</Badge>
                                  ) : (
                                    <Badge variant="secondary">Concept</Badge>
                                  )}
                                  {isInGuide && (
                                    <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                                      Gids
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                <div className="text-sm" title={`${dateLabel}: ${formatDate(displayDate)}\nAangemaakt: ${formatDate(post.created_at)}\nBijgewerkt: ${formatDate(post.updated_at)}`}>
                                  {formatDate(displayDate)}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  {!isInGuide && (
                                    <AddToGuideButton
                                      blogPostId={post.id}
                                      blogPostTitle={post.title}
                                      isInGuide={false}
                                      onSuccess={refreshPosts}
                                    />
                                  )}
                                  {post.published && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      asChild
                                      title="Bekijk post"
                                    >
                                      <Link to={`/blog/${post.slug}`} target="_blank">
                                        <Eye className="h-4 w-4" />
                                      </Link>
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(post)}
                                    title="Bewerken"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeletingPostId(post.id)}
                                    title="Verwijderen"
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

      {/* Batch Image Generator Dialog */}
      <BatchBlogImageGenerator 
        onComplete={refreshPosts} 
        open={isBatchImageOpen}
        onOpenChange={setIsBatchImageOpen}
      />

      {/* Blog Post Form Dialog */}
      <BlogPostFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        post={editingPost}
        onSuccess={() => {
          setIsDialogOpen(false);
          setEditingPost(null);
          refreshPosts();
        }}
      />

      {/* AI Blog Generator Dialog */}
      <BlogGeneratorDialog
        open={isGeneratorOpen}
        onOpenChange={setIsGeneratorOpen}
        onSuccess={() => {
          setIsGeneratorOpen(false);
          refreshPosts();
        }}
      />

      {/* Test AI Analysis Dialog */}
      <TestAIAnalysisDialog
        open={isTestAIOpen}
        onOpenChange={setIsTestAIOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingPostId} onOpenChange={() => setDeletingPostId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
            <AlertDialogDescription>
              Deze actie kan niet ongedaan gemaakt worden. De blog post wordt permanent verwijderd.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingPostId && handleDelete(deletingPostId)}
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

export default BlogPosts;
