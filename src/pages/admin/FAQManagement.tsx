import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DOMPurify from "dompurify";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Eye, Edit, Trash2, GripVertical, ToggleLeft, ToggleRight, Download } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FAQCategoryDialog } from "@/components/admin/FAQCategoryDialog";
import { FAQItemDialog } from "@/components/admin/FAQItemDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import * as Icons from "lucide-react";

export default function FAQManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [contextFilter, setContextFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: 'category' | 'item'; id: string | null }>({ open: false, type: 'category', id: null });
  const [isImporting, setIsImporting] = useState(false);

  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery({
    queryKey: ['admin-faq-categories', contextFilter, statusFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('faq_categories')
        .select(`
          *,
          faq_items(*)
        `)
        .order('order_index', { ascending: true });

      if (contextFilter !== 'all') {
        query = query.eq('context_type', contextFilter);
      }

      if (statusFilter !== 'all') {
        query = query.eq('active', statusFilter === 'active');
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by search query
      if (searchQuery) {
        return data?.filter(cat => 
          cat.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cat.faq_items.some((item: any) => 
            item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.answer.toLowerCase().includes(searchQuery.toLowerCase())
          )
        );
      }

      return data?.map(cat => ({
        ...cat,
        faq_items: cat.faq_items.sort((a: any, b: any) => a.order_index - b.order_index)
      }));
    },
  });

  const toggleCategoryMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('faq_categories')
        .update({ active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faq-categories'] });
      toast.success("Status bijgewerkt");
    },
  });

  const toggleItemMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('faq_items')
        .update({ active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faq-categories'] });
      toast.success("Status bijgewerkt");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: 'category' | 'item'; id: string }) => {
      const table = type === 'category' ? 'faq_categories' : 'faq_items';
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faq-categories'] });
      toast.success("Verwijderd");
      setDeleteDialog({ open: false, type: 'category', id: null });
    },
  });

  const stats = {
    totalCategories: categories?.length || 0,
    totalItems: categories?.reduce((acc, cat) => acc + cat.faq_items.length, 0) || 0,
    activeItems: categories?.reduce((acc, cat) => 
      acc + cat.faq_items.filter((item: any) => item.active).length, 0) || 0,
  };

  const handleImportExistingFAQ = async () => {
    try {
      setIsImporting(true);
      const { data, error } = await supabase.functions.invoke('migrate-faq-content');
      
      if (error) throw error;
      
      toast.success(data.message || 'FAQ content succesvol geïmporteerd');
      queryClient.invalidateQueries({ queryKey: ['admin-faq-categories'] });
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Fout bij importeren van FAQ content');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">FAQ Beheer</h1>
            <p className="text-muted-foreground">Beheer veelgestelde vragen per context</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleImportExistingFAQ}
              disabled={isImporting}
            >
              <Download className="h-4 w-4 mr-2" />
              {isImporting ? 'Bezig met importeren...' : 'Importeer Bestaande FAQ'}
            </Button>
            <Button onClick={() => {
              setEditingCategory(null);
              setCategoryDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Categorie
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Categorieën</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalCategories}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Totaal Vragen</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalItems}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Actieve Vragen</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.activeItems}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek vragen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={contextFilter} onValueChange={setContextFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Context" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Contexten</SelectItem>
                <SelectItem value="investment">Investment</SelectItem>
                <SelectItem value="contact">Contact</SelectItem>
                <SelectItem value="story">Story</SelectItem>
                <SelectItem value="phase">Phase</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="active">Actief</SelectItem>
                <SelectItem value="inactive">Inactief</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Categories List */}
        <div className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Laden...
              </CardContent>
            </Card>
          ) : categories && categories.length > 0 ? (
            categories.map((category) => {
              const IconComponent = (Icons as any)[category.icon_name] || Icons.HelpCircle;
              return (
                <Card key={category.id}>
                  <Collapsible defaultOpen={true}>
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                          <IconComponent className="h-5 w-5 text-primary" />
                          <div className="flex-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              {category.display_name}
                              <Badge variant={category.active ? "default" : "secondary"}>
                                {category.active ? "Actief" : "Inactief"}
                              </Badge>
                              <Badge variant="outline">{category.context_type}</Badge>
                              {category.context_value && (
                                <Badge variant="outline">{category.context_value}</Badge>
                              )}
                            </CardTitle>
                            <CardDescription>
                              {category.faq_items.length} {category.faq_items.length === 1 ? 'vraag' : 'vragen'}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCategoryMutation.mutate({ id: category.id, active: !category.active })}
                            className="gap-2"
                          >
                            {category.active ? (
                              <>
                                <ToggleRight className="h-4 w-4" />
                                Actief
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="h-4 w-4" />
                                Inactief
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingCategory(category);
                              setCategoryDialogOpen(true);
                            }}
                            className="gap-2"
                          >
                            <Edit className="h-4 w-4" />
                            Bewerk
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteDialog({ open: true, type: 'category', id: category.id })}
                            className="gap-2 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Verwijder
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent className="space-y-2">
                        {category.faq_items.length > 0 ? (
                          category.faq_items.map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                              <div className="flex items-center gap-2 flex-1">
                                <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                                <div className="flex-1">
                                  <p className="font-medium">{item.question}</p>
                                  <p className="text-sm text-muted-foreground line-clamp-1" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.answer) }} />
                                </div>
                                <Badge variant={item.active ? "default" : "secondary"}>
                                  {item.active ? "Actief" : "Inactief"}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1 ml-4">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleItemMutation.mutate({ id: item.id, active: !item.active })}
                                >
                                  {item.active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingItem(item);
                                    setSelectedCategoryId(category.id);
                                    setItemDialogOpen(true);
                                  }}
                                  className="gap-1"
                                >
                                  <Edit className="h-3 w-3" />
                                  Bewerk
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteDialog({ open: true, type: 'item', id: item.id })}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-center text-muted-foreground py-4">Geen vragen in deze categorie</p>
                        )}
                        <Button
                          variant="outline"
                          className="w-full mt-2"
                          onClick={() => {
                            setEditingItem(null);
                            setSelectedCategoryId(category.id);
                            setItemDialogOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Vraag Toevoegen
                        </Button>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">Nog geen FAQ categorieën</p>
                <Button onClick={() => {
                  setEditingCategory(null);
                  setCategoryDialogOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Eerste Categorie Toevoegen
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <FAQCategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        category={editingCategory}
        onSuccess={() => {
          setCategoryDialogOpen(false);
          setEditingCategory(null);
        }}
      />

      <FAQItemDialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        item={editingItem}
        categoryId={selectedCategoryId}
        onSuccess={() => {
          setItemDialogOpen(false);
          setEditingItem(null);
          setSelectedCategoryId(null);
        }}
      />

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
            <AlertDialogDescription>
              Dit verwijdert de {deleteDialog.type === 'category' ? 'categorie en alle vragen erin' : 'vraag'} permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteDialog.id) {
                  deleteMutation.mutate({ type: deleteDialog.type, id: deleteDialog.id });
                }
              }}
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}