import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  GripVertical,
  BookOpen,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { OrientationGuideItemDialog } from "@/components/admin/OrientationGuideItemDialog";
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
import { PILLAR_CONFIG, PILLAR_KEYS, Pillar } from "@/constants/orientation";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string;
}

interface GuideItem {
  id: string;
  pillar: Pillar;
  blog_post_id: string | null;
  custom_title: string | null;
  custom_description: string | null;
  custom_read_time_minutes: number | null;
  order_index: number;
  is_required: boolean;
  active: boolean;
  blog_posts?: BlogPost | null;
}

const OrientationGuideAdmin = () => {
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState<GuideItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPillar, setSelectedPillar] = useState<Pillar>('regio');
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const { data: guideData, isLoading: loading } = useQuery({
    queryKey: ["admin-orientation-guide"],
    queryFn: async () => {
      const [guideRes, blogRes] = await Promise.all([
        supabase
          .from("orientation_guide_items")
          .select("*, blog_posts(id, title, slug, category)")
          .order("order_index", { ascending: true }),
        supabase
          .from("blog_posts")
          .select("id, title, slug, category")
          .eq("published", true)
          .order("title", { ascending: true }),
      ]);

      if (guideRes.error) throw guideRes.error;
      if (blogRes.error) throw blogRes.error;

      return {
        guideItems: (guideRes.data as GuideItem[]) || [],
        blogPosts: (blogRes.data || []) as BlogPost[],
      };
    },
  });

  const guideItems = guideData?.guideItems || [];
  const blogPosts = guideData?.blogPosts || [];
  const refreshData = () => queryClient.invalidateQueries({ queryKey: ["admin-orientation-guide"] });

  const handleAddItem = (pillar: Pillar) => {
    setSelectedPillar(pillar);
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleEditItem = (item: GuideItem) => {
    setSelectedPillar(item.pillar);
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from("orientation_guide_items")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Item verwijderd");
      refreshData();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Fout bij verwijderen");
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleToggleActive = async (item: GuideItem) => {
    try {
      const { error } = await supabase
        .from("orientation_guide_items")
        .update({ active: !item.active })
        .eq("id", item.id);

      if (error) throw error;

      refreshData();
      toast.success(item.active ? "Item gedeactiveerd" : "Item geactiveerd");
    } catch (error) {
      console.error("Error toggling item:", error);
      toast.error("Fout bij bijwerken");
    }
  };

  const handleToggleRequired = async (item: GuideItem) => {
    try {
      const { error } = await supabase
        .from("orientation_guide_items")
        .update({ is_required: !item.is_required })
        .eq("id", item.id);

      if (error) throw error;

      refreshData();
    } catch (error) {
      console.error("Error toggling required:", error);
      toast.error("Fout bij bijwerken");
    }
  };

  const getItemsForPillar = (pillar: Pillar) => {
    return guideItems.filter((item) => item.pillar === pillar);
  };

  const getItemTitle = (item: GuideItem) => {
    return item.custom_title || item.blog_posts?.title || "Onbekend item";
  };

  const getUsedBlogPostIds = () => {
    return new Set(guideItems.filter(i => i.blog_post_id).map(i => i.blog_post_id));
  };

  const stats = {
    total: guideItems.length,
    active: guideItems.filter(i => i.active).length,
    required: guideItems.filter(i => i.is_required).length,
    withBlog: guideItems.filter(i => i.blog_post_id).length,
  };

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground mb-6">
        Beheer de 4-pijler oriëntatiegids voor infoavond voorbereiding
      </p>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Totaal Items</CardDescription>
                  <CardTitle className="text-3xl">{stats.total}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Actief</CardDescription>
                  <CardTitle className="text-3xl text-green-600">{stats.active}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Verplicht</CardDescription>
                  <CardTitle className="text-3xl text-orange-600">{stats.required}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Met Blog Artikel</CardDescription>
                  <CardTitle className="text-3xl text-blue-600">{stats.withBlog}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Pillar Tabs */}
            <Tabs defaultValue="regio" className="space-y-4">
              <TabsList className="grid grid-cols-4 w-full max-w-2xl">
                {PILLAR_KEYS.map((pillarKey) => {
                  const config = PILLAR_CONFIG[pillarKey];
                  const Icon = config.icon;
                  const count = getItemsForPillar(pillarKey).length;
                  return (
                    <TabsTrigger key={pillarKey} value={pillarKey} className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{config.title}</span>
                      <Badge variant="secondary" className="ml-1">{count}</Badge>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {PILLAR_KEYS.map((pillarKey) => {
                const config = PILLAR_CONFIG[pillarKey];
                const Icon = config.icon;
                const items = getItemsForPillar(pillarKey);

                return (
                  <TabsContent key={pillarKey} value={pillarKey}>
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${config.colors.progress}`}>
                              <Icon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <CardTitle>{config.title}</CardTitle>
                              <CardDescription>
                                {items.length} items in deze pijler
                              </CardDescription>
                            </div>
                          </div>
                          <Button onClick={() => handleAddItem(pillarKey)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Item Toevoegen
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {loading ? (
                          <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                              <Skeleton key={i} className="h-16 w-full" />
                            ))}
                          </div>
                        ) : items.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>Nog geen items in deze pijler</p>
                            <Button
                              variant="outline"
                              className="mt-4"
                              onClick={() => handleAddItem(pillarKey)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Eerste item toevoegen
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {items.map((item, index) => (
                              <div
                                key={item.id}
                                className={`flex items-center gap-4 p-4 border rounded-lg ${
                                  !item.active ? "opacity-50 bg-muted/50" : ""
                                }`}
                              >
                                <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                                <span className="text-sm text-muted-foreground w-6">
                                  {index + 1}.
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium truncate">
                                      {getItemTitle(item)}
                                    </span>
                                    {item.is_required && (
                                      <Badge variant="destructive" className="text-xs">
                                        Verplicht
                                      </Badge>
                                    )}
                                    {item.blog_post_id ? (
                                      <Badge variant="outline" className="text-xs">
                                        <BookOpen className="h-3 w-3 mr-1" />
                                        Blog
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary" className="text-xs">
                                        Custom
                                      </Badge>
                                    )}
                                  </div>
                                  {item.custom_description && (
                                    <p className="text-sm text-muted-foreground truncate">
                                      {item.custom_description}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Verplicht</span>
                                    <Switch
                                      checked={item.is_required}
                                      onCheckedChange={() => handleToggleRequired(item)}
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Actief</span>
                                    <Switch
                                      checked={item.active}
                                      onCheckedChange={() => handleToggleActive(item)}
                                    />
                                  </div>
                                  {item.blog_posts?.slug && (
                                    <Button variant="ghost" size="sm" asChild>
                                      <a
                                        href={`/blog/${item.blog_posts.slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                      </a>
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditItem(item)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeletingItemId(item.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                );
              })}
            </Tabs>

      {/* Item Dialog */}
      <OrientationGuideItemDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        item={editingItem}
        pillar={selectedPillar}
        blogPosts={blogPosts}
        usedBlogPostIds={getUsedBlogPostIds()}
        onSuccess={() => {
          setIsDialogOpen(false);
          setEditingItem(null);
          refreshData();
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingItemId} onOpenChange={() => setDeletingItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
            <AlertDialogDescription>
              Dit item wordt permanent verwijderd uit de oriëntatiegids.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingItemId && handleDeleteItem(deletingItemId)}
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OrientationGuideAdmin;
