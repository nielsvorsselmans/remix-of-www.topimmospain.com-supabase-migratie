import { useState } from "react";
import { Plus, GripVertical, Palette, Package, Copy, FileText, MoreHorizontal, Settings, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useMaterialSelections,
  useCreateMaterialSelection,
  useDeleteMaterialSelection,
  MATERIAL_CATEGORIES,
} from "@/hooks/useMaterialSelections";
import { useMaterialCategoriesWithFallback } from "@/hooks/useMaterialSettings";
import { MaterialCategoryCard } from "./MaterialCategoryCard";
import { AddMaterialSelectionDialog } from "./AddMaterialSelectionDialog";
import { CopyMaterialsDialog } from "./CopyMaterialsDialog";
import { ApplyTemplatesDialog } from "./ApplyTemplatesDialog";
import { MaterialSettingsDialog } from "./MaterialSettingsDialog";
import { MaterialsPdfDownload } from "./MaterialsPdfDownload";
import { ExportToTemplatesButton } from "./ExportToTemplatesButton";

interface MaterialSelectionsManagerProps {
  saleId: string;
  projectId?: string;
}

export function MaterialSelectionsManager({ saleId, projectId }: MaterialSelectionsManagerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const { data: selections, isLoading } = useMaterialSelections(saleId);
  const createSelection = useCreateMaterialSelection();
  const { categories } = useMaterialCategoriesWithFallback(projectId);

  // Group selections by category
  const groupedSelections = selections?.reduce((acc, selection) => {
    const category = selection.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(selection);
    return acc;
  }, {} as Record<string, typeof selections>);

  const handleAddSelection = async (data: {
    category: string;
    room?: string;
    title: string;
    description?: string;
  }) => {
    const maxOrder = selections?.reduce((max, s) => Math.max(max, s.order_index), -1) ?? -1;
    await createSelection.mutateAsync({
      sale_id: saleId,
      ...data,
      order_index: maxOrder + 1,
    });
    setShowAddDialog(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-1/3" />
            </CardHeader>
            <CardContent>
              <div className="h-24 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalSelections = selections?.length ?? 0;
  const decidedSelections = selections?.filter(s => s.chosen_option_id)?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Materiaalkeuzes</h3>
            <p className="text-sm text-muted-foreground">
              Beheer de materiaalkeuzes voor deze verkoop
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {totalSelections > 0 && (
            <>
              <Badge variant="secondary" className="text-sm">
                {decidedSelections}/{totalSelections} gekozen
              </Badge>
              <MaterialsPdfDownload saleId={saleId} disabled={selections.length === 0} />
              {projectId && (
                <ExportToTemplatesButton
                  saleId={saleId}
                  projectId={projectId}
                  selectionsCount={totalSelections}
                />
              )}
            </>
          )}
          
          {/* More options dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowCopyDialog(true)}>
                <Copy className="h-4 w-4 mr-2" />
                Kopiëren van andere woning
              </DropdownMenuItem>
              {projectId && (
                <DropdownMenuItem onClick={() => setShowTemplatesDialog(true)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Project templates toepassen
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings button */}
          {projectId && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowSettingsDialog(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
          
          <Button onClick={() => setShowAddDialog(true)} size="sm">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Categorie toevoegen</span>
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {totalSelections === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="p-3 bg-muted rounded-full mb-4">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <h4 className="font-medium text-lg mb-2">Nog geen materiaalkeuzes</h4>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Voeg materiaalkeuzes toe zoals vloertegels, keukenkleuren of sanitair opties
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCopyDialog(true)}>
                <Copy className="h-4 w-4 mr-2" />
                Kopiëren van andere woning
              </Button>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Eerste categorie toevoegen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grouped selections by category */}
      {groupedSelections && Object.entries(groupedSelections).map(([category, categorySelections]) => {
        const categoryLabel = categories.find(c => c.value === category)?.label || MATERIAL_CATEGORIES.find(c => c.value === category)?.label || category;
        
        return (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground/50" />
              <h4 className="font-medium text-sm uppercase tracking-wider text-muted-foreground">
                {categoryLabel}
              </h4>
              <Badge variant="outline" className="text-xs">
                {categorySelections?.length ?? 0}
              </Badge>
            </div>
            
            <div className="space-y-3 pl-6">
              {categorySelections?.map((selection) => (
                <MaterialCategoryCard
                  key={selection.id}
                  selection={selection}
                  saleId={saleId}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Dialogs */}
      <AddMaterialSelectionDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSubmit={handleAddSelection}
        isLoading={createSelection.isPending}
        projectId={projectId}
      />

      <CopyMaterialsDialog
        open={showCopyDialog}
        onOpenChange={setShowCopyDialog}
        saleId={saleId}
        projectId={projectId}
      />

      <ApplyTemplatesDialog
        open={showTemplatesDialog}
        onOpenChange={setShowTemplatesDialog}
        saleId={saleId}
        projectId={projectId}
      />

      {projectId && (
        <MaterialSettingsDialog
          open={showSettingsDialog}
          onOpenChange={setShowSettingsDialog}
          projectId={projectId}
        />
      )}
    </div>
  );
}
