import { useState } from "react";
import { Plus, Pencil, Trash2, GripVertical, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useMaterialTemplates,
  useCreateMaterialTemplate,
  useUpdateMaterialTemplate,
  useDeleteMaterialTemplate,
  useSyncTemplatesFromSelections,
  type MaterialTemplate,
} from "@/hooks/useMaterialTemplates";
import { useMaterialCategoriesWithFallback, useMaterialRoomsWithFallback } from "@/hooks/useMaterialSettings";

interface TemplateSettingsTabProps {
  projectId: string;
}

export function TemplateSettingsTab({ projectId }: TemplateSettingsTabProps) {
  const { data: templates, isLoading } = useMaterialTemplates(projectId);
  const createTemplate = useCreateMaterialTemplate();
  const updateTemplate = useUpdateMaterialTemplate();
  const deleteTemplate = useDeleteMaterialTemplate();
  const syncTemplates = useSyncTemplatesFromSelections();
  
  const { categories } = useMaterialCategoriesWithFallback(projectId);
  const { rooms } = useMaterialRoomsWithFallback(projectId);
  
  const [showSyncDialog, setShowSyncDialog] = useState(false);

  const [editingTemplate, setEditingTemplate] = useState<MaterialTemplate | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state for add/edit
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    room: "",
    description: "",
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      title: "",
      category: "",
      room: "",
      description: "",
      is_active: true,
    });
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddDialog(true);
  };

  const handleOpenEdit = (template: MaterialTemplate) => {
    setFormData({
      title: template.title,
      category: template.category,
      room: template.room || "",
      description: template.description || "",
      is_active: template.is_active,
    });
    setEditingTemplate(template);
  };

  const handleSaveAdd = async () => {
    if (!formData.title.trim() || !formData.category) return;
    
    const maxOrder = templates?.reduce((max, t) => Math.max(max, t.order_index), -1) ?? -1;
    
    await createTemplate.mutateAsync({
      project_id: projectId,
      title: formData.title.trim(),
      category: formData.category,
      room: formData.room || null,
      description: formData.description || null,
      is_active: formData.is_active,
      order_index: maxOrder + 1,
      default_options: [],
    });
    
    setShowAddDialog(false);
    resetForm();
  };

  const handleSaveEdit = async () => {
    if (!editingTemplate || !formData.title.trim() || !formData.category) return;
    
    await updateTemplate.mutateAsync({
      id: editingTemplate.id,
      projectId,
      title: formData.title.trim(),
      category: formData.category,
      room: formData.room || null,
      description: formData.description || null,
      is_active: formData.is_active,
    });
    
    setEditingTemplate(null);
    resetForm();
  };

  const handleToggleActive = async (template: MaterialTemplate) => {
    await updateTemplate.mutateAsync({
      id: template.id,
      projectId,
      is_active: !template.is_active,
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteTemplate.mutateAsync({ id: deleteId, projectId });
    setDeleteId(null);
  };

  const handleSync = async () => {
    await syncTemplates.mutateAsync(projectId);
    setShowSyncDialog(false);
  };

  if (isLoading) {
    return <div className="p-4 text-muted-foreground">Laden...</div>;
  }

  const hasTemplates = templates && templates.length > 0;
  
  // Check templates health - count how many have no options or no images
  const templatesWithoutOptions = templates?.filter(
    t => !t.default_options || t.default_options.length === 0
  ).length || 0;
  const templatesWithoutImages = templates?.filter(
    t => t.default_options && t.default_options.length > 0 && 
         !t.default_options.some(opt => opt.images && opt.images.length > 0)
  ).length || 0;
  const hasHealthWarning = templatesWithoutOptions > 0 || templatesWithoutImages > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Templates worden automatisch toegepast als je "Project templates toepassen" gebruikt bij een nieuwe verkoop.
        </p>
        {hasTemplates && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowSyncDialog(true)}
                  disabled={syncTemplates.isPending}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncTemplates.isPending ? 'animate-spin' : ''}`} />
                  Synchroniseren
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Update templates met opties en afbeeldingen<br />van de meest recente verkopen</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Health warning */}
      {hasHealthWarning && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">Templates incompleet</p>
            <p className="text-amber-700 dark:text-amber-300 mt-1">
              {templatesWithoutOptions > 0 && `${templatesWithoutOptions} template(s) zonder opties. `}
              {templatesWithoutImages > 0 && `${templatesWithoutImages} template(s) zonder afbeeldingen. `}
              <button 
                onClick={() => setShowSyncDialog(true)}
                className="underline font-medium hover:no-underline"
              >
                Synchroniseer nu
              </button> om templates bij te werken met data van bestaande verkopen.
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasTemplates && (
        <div className="bg-muted/50 rounded-lg p-6 text-center">
          <p className="text-muted-foreground mb-4">
            Er zijn nog geen templates voor dit project.
          </p>
          <Button onClick={handleOpenAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Eerste template maken
          </Button>
        </div>
      )}

      {/* List of templates */}
      {hasTemplates && (
        <div className="space-y-2">
          {templates?.map((template) => {
            const categoryLabel = categories.find(c => c.value === template.category)?.label || template.category;
            const roomLabel = template.room ? (rooms.find(r => r.value === template.room)?.label || template.room) : null;
            
            return (
              <div
                key={template.id}
                className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg group"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-move" />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${!template.is_active ? "text-muted-foreground line-through" : ""}`}>
                      {template.title}
                    </span>
                    {!template.is_active && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Inactief
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {categoryLabel}
                    </Badge>
                    {roomLabel && (
                      <Badge variant="outline" className="text-xs">
                        {roomLabel}
                      </Badge>
                    )}
                    {/* Show options count and images status */}
                    {template.default_options && template.default_options.length > 0 ? (
                      <Badge variant="outline" className="text-xs">
                        {template.default_options.length} opties
                        {template.default_options.some(opt => opt.images && opt.images.length > 0) 
                          ? ` • met afbeeldingen` 
                          : ' • geen afbeeldingen'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                        Geen opties
                      </Badge>
                    )}
                  </div>
                </div>

                <Switch
                  checked={template.is_active}
                  onCheckedChange={() => handleToggleActive(template)}
                  disabled={updateTemplate.isPending}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleOpenEdit(template)}
                  className="opacity-0 group-hover:opacity-100"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setDeleteId(template.id)}
                  className="opacity-0 group-hover:opacity-100 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add button */}
      {hasTemplates && (
        <Button
          variant="outline"
          className="w-full border-dashed"
          onClick={handleOpenAdd}
        >
          <Plus className="h-4 w-4 mr-2" />
          Template toevoegen
        </Button>
      )}

      {/* Add/Edit Dialog */}
      <Dialog 
        open={showAddDialog || !!editingTemplate} 
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setEditingTemplate(null);
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Template bewerken" : "Nieuwe template"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="bijv. Vloertegels woonkamer"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categorie *</Label>
              <Select
                value={formData.category}
                onValueChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kies een categorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="room">Ruimte (optioneel)</Label>
              <Select
                value={formData.room || "__none__"}
                onValueChange={(val) => setFormData(prev => ({ ...prev, room: val === "__none__" ? "" : val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Alle ruimtes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Alle ruimtes</SelectItem>
                  {rooms.map((room) => (
                    <SelectItem key={room.value} value={room.value}>
                      {room.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beschrijving (optioneel)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Extra informatie over deze template..."
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="is_active">Actief (wordt meegenomen bij toepassen)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setEditingTemplate(null);
                resetForm();
              }}
            >
              Annuleren
            </Button>
            <Button
              onClick={editingTemplate ? handleSaveEdit : handleSaveAdd}
              disabled={
                (editingTemplate ? updateTemplate.isPending : createTemplate.isPending) ||
                !formData.title.trim() ||
                !formData.category
              }
            >
              {editingTemplate ? "Opslaan" : "Toevoegen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Template verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je deze template wilt verwijderen? Dit heeft geen invloed op reeds toegepaste materiaalkeuzes.
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

      {/* Sync confirmation dialog */}
      <AlertDialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Templates synchroniseren?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Dit zal alle templates bijwerken met de opties en afbeeldingen van de 
                meest recente verkopen die dezelfde titel hebben.
              </p>
              <p className="text-amber-600 dark:text-amber-400">
                ⚠️ Bestaande template opties worden overschreven!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={syncTemplates.isPending}>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSync}
              disabled={syncTemplates.isPending}
            >
              {syncTemplates.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Synchroniseren...
                </>
              ) : (
                "Synchroniseren"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
