import { useState } from "react";
import { Plus, Pencil, Trash2, GripVertical, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  useMaterialCategories,
  useCreateMaterialCategory,
  useUpdateMaterialCategory,
  useDeleteMaterialCategory,
  useInitializeDefaultCategories,
  useReorderMaterialCategories,
  type MaterialCategory,
} from "@/hooks/useMaterialSettings";

interface CategorySettingsTabProps {
  projectId: string;
}

export function CategorySettingsTab({ projectId }: CategorySettingsTabProps) {
  const { data: categories, isLoading } = useMaterialCategories(projectId);
  const createCategory = useCreateMaterialCategory();
  const updateCategory = useUpdateMaterialCategory();
  const deleteCategory = useDeleteMaterialCategory();
  const initializeDefaults = useInitializeDefaultCategories();
  const reorderCategories = useReorderMaterialCategories();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editValue, setEditValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const hasCustomCategories = categories && categories.length > 0;

  const handleInitializeDefaults = async () => {
    await initializeDefaults.mutateAsync(projectId);
  };

  const handleStartEdit = (category: MaterialCategory) => {
    setEditingId(category.id);
    setEditLabel(category.label);
    setEditValue(category.value);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editLabel.trim()) return;
    
    await updateCategory.mutateAsync({
      id: editingId,
      projectId,
      label: editLabel.trim(),
      value: editValue.trim() || editLabel.trim().toLowerCase().replace(/\s+/g, "_"),
    });
    setEditingId(null);
    setEditLabel("");
    setEditValue("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditLabel("");
    setEditValue("");
  };

  const handleToggleActive = async (category: MaterialCategory) => {
    await updateCategory.mutateAsync({
      id: category.id,
      projectId,
      is_active: !category.is_active,
    });
  };

  const handleAddCategory = async () => {
    if (!newLabel.trim()) return;
    
    const maxOrder = categories?.reduce((max, c) => Math.max(max, c.order_index), -1) ?? -1;
    
    await createCategory.mutateAsync({
      project_id: projectId,
      label: newLabel.trim(),
      value: newLabel.trim().toLowerCase().replace(/\s+/g, "_"),
      order_index: maxOrder + 1,
    });
    
    setNewLabel("");
    setIsAdding(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteCategory.mutateAsync({ id: deleteId, projectId });
    setDeleteId(null);
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDragEnd = async () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex && categories) {
      const reordered = [...categories];
      const [removed] = reordered.splice(draggedIndex, 1);
      reordered.splice(dragOverIndex, 0, removed);

      await reorderCategories.mutateAsync({
        projectId,
        orderedIds: reordered.map((c) => c.id),
      });
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  if (isLoading) {
    return <div className="p-4 text-muted-foreground">Laden...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Initialize defaults button if no custom categories */}
      {!hasCustomCategories && (
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Er zijn nog geen project-specifieke categorieën. Je kunt de standaard categorieën gebruiken of ze initialiseren om aan te passen.
          </p>
          <Button
            variant="outline"
            onClick={handleInitializeDefaults}
            disabled={initializeDefaults.isPending}
          >
            Standaard categorieën laden om aan te passen
          </Button>
        </div>
      )}

      {/* List of categories */}
      {hasCustomCategories && (
        <div className="space-y-2">
          {categories?.map((category, index) => (
            <div
              key={category.id}
              draggable={editingId !== category.id}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 p-3 bg-muted/30 rounded-lg group transition-all duration-200 ${
                draggedIndex === index ? "opacity-50" : ""
              } ${
                dragOverIndex === index && draggedIndex !== index
                  ? "ring-2 ring-primary ring-offset-2"
                  : ""
              }`}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab active:cursor-grabbing" />
              
              {editingId === category.id ? (
                <>
                  <Input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    placeholder="Label"
                    className="flex-1"
                    autoFocus
                  />
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="Waarde (optioneel)"
                    className="w-40"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleSaveEdit}
                    disabled={updateCategory.isPending}
                  >
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleCancelEdit}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className={`flex-1 ${!category.is_active ? "text-muted-foreground line-through" : ""}`}>
                    {category.label}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {category.value}
                  </Badge>
                  <Switch
                    checked={category.is_active}
                    onCheckedChange={() => handleToggleActive(category)}
                    disabled={updateCategory.isPending}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleStartEdit(category)}
                    className="opacity-0 group-hover:opacity-100"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setDeleteId(category.id)}
                    className="opacity-0 group-hover:opacity-100 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add new category */}
      {hasCustomCategories && (
        <>
          {isAdding ? (
            <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border-2 border-dashed border-primary/30">
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Nieuwe categorie naam..."
                className="flex-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddCategory();
                  if (e.key === "Escape") setIsAdding(false);
                }}
              />
              <Button
                size="sm"
                onClick={handleAddCategory}
                disabled={createCategory.isPending || !newLabel.trim()}
              >
                Toevoegen
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAdding(false);
                  setNewLabel("");
                }}
              >
                Annuleren
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Categorie toevoegen
            </Button>
          )}
        </>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Categorie verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je deze categorie wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
