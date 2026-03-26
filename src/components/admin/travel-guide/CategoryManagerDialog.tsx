import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Edit, GripVertical, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import * as Icons from "lucide-react";

interface TravelGuideCategory {
  id: string;
  name: string;
  name_singular: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  description: string | null;
}

interface CategoryManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AVAILABLE_ICONS = [
  "MapPin", "Waves", "Flag", "UtensilsCrossed", "ShoppingBasket", 
  "ShoppingBag", "Store", "Hospital", "Anchor", "Landmark", 
  "Sparkles", "Users", "Briefcase", "Coffee", "Beer", "Wine",
  "Palette", "Camera", "Mountain", "TreePine", "Plane", "Car"
];

export function CategoryManagerDialog({ open, onOpenChange }: CategoryManagerDialogProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<TravelGuideCategory>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: "",
    name_singular: "",
    icon: "MapPin",
    description: "",
  });

  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery({
    queryKey: ['travel-guide-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('travel_guide_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as TravelGuideCategory[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TravelGuideCategory> }) => {
      const { error } = await supabase
        .from('travel_guide_categories')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-guide-categories'] });
      toast.success("Categorie bijgewerkt");
      setEditingId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Er ging iets mis");
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newCategory) => {
      const maxOrder = categories?.reduce((max, cat) => Math.max(max, cat.sort_order), 0) || 0;
      const { error } = await supabase
        .from('travel_guide_categories')
        .insert({
          name: data.name,
          name_singular: data.name_singular,
          icon: data.icon,
          description: data.description || null,
          sort_order: maxOrder + 1,
          is_active: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-guide-categories'] });
      toast.success("Categorie toegevoegd");
      setIsAdding(false);
      setNewCategory({ name: "", name_singular: "", icon: "MapPin", description: "" });
    },
    onError: (error: any) => {
      toast.error(error.message || "Er ging iets mis");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('travel_guide_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-guide-categories'] });
      toast.success("Categorie verwijderd");
    },
    onError: (error: any) => {
      toast.error(error.message || "Er ging iets mis");
    },
  });

  const handleStartEdit = (category: TravelGuideCategory) => {
    setEditingId(category.id);
    setEditForm({
      name: category.name,
      name_singular: category.name_singular,
      icon: category.icon,
      description: category.description,
    });
  };

  const handleSaveEdit = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, updates: editForm });
    }
  };

  const handleToggleActive = (category: TravelGuideCategory) => {
    updateMutation.mutate({ id: category.id, updates: { is_active: !category.is_active } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Categorieën Beheren</DialogTitle>
          <DialogDescription>
            Beheer de POI categorieën voor de reisgids
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new category */}
          {isAdding ? (
            <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Naam (meervoud)</label>
                  <Input
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    placeholder="Bijv. Stranden"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Naam (enkelvoud)</label>
                  <Input
                    value={newCategory.name_singular}
                    onChange={(e) => setNewCategory({ ...newCategory, name_singular: e.target.value })}
                    placeholder="Bijv. Strand"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Icoon</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {AVAILABLE_ICONS.map((iconName) => {
                    const IconComponent = (Icons as any)[iconName];
                    return (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setNewCategory({ ...newCategory, icon: iconName })}
                        className={`p-2 rounded border ${
                          newCategory.icon === iconName 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <IconComponent className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Beschrijving</label>
                <Textarea
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  placeholder="Optionele beschrijving..."
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => createMutation.mutate(newCategory)}
                  disabled={!newCategory.name || !newCategory.name_singular || createMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Opslaan
                </Button>
                <Button variant="outline" onClick={() => setIsAdding(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Annuleren
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setIsAdding(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Nieuwe Categorie
            </Button>
          )}

          {/* Categories list */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Laden...</div>
          ) : (
            <div className="space-y-2">
              {categories?.map((category) => {
                const IconComponent = (Icons as any)[category.icon] || Icons.MapPin;
                const isEditing = editingId === category.id;

                return (
                  <div
                    key={category.id}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-background"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <IconComponent className="h-4 w-4 text-primary" />
                    </div>

                    {isEditing ? (
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <Input
                          value={editForm.name || ""}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          placeholder="Naam (meervoud)"
                        />
                        <Input
                          value={editForm.name_singular || ""}
                          onChange={(e) => setEditForm({ ...editForm, name_singular: e.target.value })}
                          placeholder="Naam (enkelvoud)"
                        />
                      </div>
                    ) : (
                      <div className="flex-1">
                        <p className="font-medium">{category.name}</p>
                        {category.description && (
                          <p className="text-xs text-muted-foreground">{category.description}</p>
                        )}
                      </div>
                    )}

                    <Badge variant={category.is_active ? "default" : "secondary"}>
                      {category.is_active ? "Actief" : "Inactief"}
                    </Badge>

                    <div className="flex items-center gap-1">
                      <Switch
                        checked={category.is_active}
                        onCheckedChange={() => handleToggleActive(category)}
                      />

                      {isEditing ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSaveEdit}
                            disabled={updateMutation.isPending}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(category.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
