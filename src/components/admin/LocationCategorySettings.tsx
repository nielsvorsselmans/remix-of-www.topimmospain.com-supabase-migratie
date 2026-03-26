import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  GripVertical,
  Save,
  Plus,
  Trash2,
  Waves,
  Flag,
  ShoppingCart,
  Utensils,
  Building2,
  Plane,
  GraduationCap,
  TrainFront,
  Store,
  Anchor,
  MapPin,
} from "lucide-react";

interface LocationCategorySetting {
  id: string;
  google_type: string;
  label: string;
  label_singular: string;
  icon: string | null;
  radius_meters: number;
  max_results: number;
  is_active: boolean;
  sort_order: number;
}

const iconMap: Record<string, React.ReactNode> = {
  waves: <Waves className="h-4 w-4" />,
  flag: <Flag className="h-4 w-4" />,
  "shopping-cart": <ShoppingCart className="h-4 w-4" />,
  utensils: <Utensils className="h-4 w-4" />,
  "building-2": <Building2 className="h-4 w-4" />,
  plane: <Plane className="h-4 w-4" />,
  "graduation-cap": <GraduationCap className="h-4 w-4" />,
  "train-front": <TrainFront className="h-4 w-4" />,
  store: <Store className="h-4 w-4" />,
  anchor: <Anchor className="h-4 w-4" />,
};

const formatRadius = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(meters % 1000 === 0 ? 0 : 1)} km`;
  }
  return `${meters} m`;
};

export function LocationCategorySettings() {
  const [categories, setCategories] = useState<LocationCategorySetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedCategories, setEditedCategories] = useState<Record<string, Partial<LocationCategorySetting>>>({});
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategory, setNewCategory] = useState({
    google_type: "",
    label: "",
    label_singular: "",
    radius_meters: 5000,
    max_results: 5,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("location_category_settings")
      .select("*")
      .order("sort_order");

    if (error) {
      console.error("Error fetching categories:", error);
      toast.error("Kon categorieën niet laden");
    } else {
      setCategories(data || []);
    }
    setLoading(false);
  };

  const handleEdit = (id: string, field: keyof LocationCategorySetting, value: any) => {
    setEditedCategories((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const getEditedValue = (
    category: LocationCategorySetting,
    field: keyof LocationCategorySetting
  ): string | number | boolean | null => {
    const edited = editedCategories[category.id]?.[field];
    if (edited !== undefined) return edited;
    return category[field];
  };

  const hasChanges = Object.keys(editedCategories).length > 0;

  const handleSave = async () => {
    if (!hasChanges) return;

    setSaving(true);
    try {
      const updates = Object.entries(editedCategories).map(([id, changes]) => ({
        id,
        ...changes,
        updated_at: new Date().toISOString(),
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("location_category_settings")
          .update(update)
          .eq("id", update.id);

        if (error) throw error;
      }

      toast.success(`${updates.length} categorie(ën) opgeslagen`);
      setEditedCategories({});
      fetchCategories();
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Opslaan mislukt");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string, currentValue: boolean) => {
    const { error } = await supabase
      .from("location_category_settings")
      .update({ is_active: !currentValue, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast.error("Wijziging mislukt");
    } else {
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_active: !currentValue } : c))
      );
      toast.success(`Categorie ${!currentValue ? "geactiveerd" : "gedeactiveerd"}`);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.google_type || !newCategory.label || !newCategory.label_singular) {
      toast.error("Vul alle velden in");
      return;
    }

    const maxOrder = Math.max(...categories.map((c) => c.sort_order), 0);

    const { error } = await supabase.from("location_category_settings").insert({
      ...newCategory,
      sort_order: maxOrder + 1,
      is_active: true,
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("Google type bestaat al");
      } else {
        toast.error("Toevoegen mislukt");
      }
    } else {
      toast.success("Categorie toegevoegd");
      setNewCategory({
        google_type: "",
        label: "",
        label_singular: "",
        radius_meters: 5000,
        max_results: 5,
      });
      setShowAddForm(false);
      fetchCategories();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Weet je zeker dat je deze categorie wilt verwijderen?")) return;

    const { error } = await supabase
      .from("location_category_settings")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Verwijderen mislukt");
    } else {
      toast.success("Categorie verwijderd");
      fetchCategories();
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const draggedIndex = categories.findIndex((c) => c.id === draggedId);
    const targetIndex = categories.findIndex((c) => c.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newCategories = [...categories];
    const [removed] = newCategories.splice(draggedIndex, 1);
    newCategories.splice(targetIndex, 0, removed);

    // Update sort_order
    const updated = newCategories.map((c, i) => ({ ...c, sort_order: i + 1 }));
    setCategories(updated);
  };

  const handleDragEnd = async () => {
    if (!draggedId) return;

    // Save new order to database
    const updates = categories.map((c, i) => ({
      id: c.id,
      sort_order: i + 1,
    }));

    for (const update of updates) {
      await supabase
        .from("location_category_settings")
        .update({ sort_order: update.sort_order, updated_at: new Date().toISOString() })
        .eq("id", update.id);
    }

    setDraggedId(null);
    toast.success("Volgorde opgeslagen");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">Categorie Instellingen</h4>
          <p className="text-xs text-muted-foreground">
            Deze instellingen gelden voor alle projecten
          </p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Opslaan
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Nieuwe
          </Button>
        </div>
      </div>

      {showAddForm && (
        <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Input
              placeholder="Google Type (bijv. beach)"
              value={newCategory.google_type}
              onChange={(e) =>
                setNewCategory({ ...newCategory, google_type: e.target.value })
              }
            />
            <Input
              placeholder="Label meervoud"
              value={newCategory.label}
              onChange={(e) =>
                setNewCategory({ ...newCategory, label: e.target.value })
              }
            />
            <Input
              placeholder="Label enkelvoud"
              value={newCategory.label_singular}
              onChange={(e) =>
                setNewCategory({ ...newCategory, label_singular: e.target.value })
              }
            />
            <Input
              type="number"
              placeholder="Radius (m)"
              value={newCategory.radius_meters}
              onChange={(e) =>
                setNewCategory({
                  ...newCategory,
                  radius_meters: parseInt(e.target.value) || 5000,
                })
              }
            />
            <Input
              type="number"
              placeholder="Max resultaten"
              value={newCategory.max_results}
              onChange={(e) =>
                setNewCategory({
                  ...newCategory,
                  max_results: parseInt(e.target.value) || 5,
                })
              }
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddCategory}>
              Toevoegen
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAddForm(false)}
            >
              Annuleren
            </Button>
          </div>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Categorie</TableHead>
              <TableHead>Google Type</TableHead>
              <TableHead className="w-28">Radius</TableHead>
              <TableHead className="w-20">Max</TableHead>
              <TableHead className="w-20">Actief</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow
                key={category.id}
                draggable
                onDragStart={(e) => handleDragStart(e, category.id)}
                onDragOver={(e) => handleDragOver(e, category.id)}
                onDragEnd={handleDragEnd}
                className={`cursor-move ${
                  draggedId === category.id ? "opacity-50" : ""
                } ${!category.is_active ? "opacity-60" : ""}`}
              >
                <TableCell>
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {category.icon && iconMap[category.icon] ? (
                      iconMap[category.icon]
                    ) : (
                      <MapPin className="h-4 w-4" />
                    )}
                    <span className="font-medium">{category.label}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-xs">
                    {category.google_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    className="h-8 w-24"
                    value={Number(getEditedValue(category, "radius_meters"))}
                    onChange={(e) =>
                      handleEdit(
                        category.id,
                        "radius_meters",
                        parseInt(e.target.value) || 0
                      )
                    }
                  />
                  <span className="text-xs text-muted-foreground ml-1">
                    ({formatRadius(Number(getEditedValue(category, "radius_meters")))})
                  </span>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    className="h-8 w-16"
                    value={Number(getEditedValue(category, "max_results"))}
                    onChange={(e) =>
                      handleEdit(
                        category.id,
                        "max_results",
                        parseInt(e.target.value) || 1
                      )
                    }
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={category.is_active}
                    onCheckedChange={() =>
                      handleToggleActive(category.id, category.is_active)
                    }
                  />
                </TableCell>
                <TableCell>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(category.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        💡 Sleep categorieën om de volgorde aan te passen. Wijzigingen aan radius
        en max resultaten worden toegepast bij de volgende "Force Refresh" van een
        project.
      </p>
    </div>
  );
}
