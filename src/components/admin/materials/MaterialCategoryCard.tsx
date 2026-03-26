import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, Check, Edit, Eye, EyeOff, MoreHorizontal, StickyNote, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  MaterialSelection,
  useDeleteMaterialSelection,
  useUpdateMaterialSelection,
  useCreateMaterialOption,
  ROOM_PRESETS,
} from "@/hooks/useMaterialSelections";
import { MaterialOptionCard } from "./MaterialOptionCard";
import { AddMaterialOptionDialog } from "./AddMaterialOptionDialog";
import { EditMaterialSelectionDialog } from "./EditMaterialSelectionDialog";
import { EditNoteDialog } from "./EditNoteDialog";

interface MaterialCategoryCardProps {
  selection: MaterialSelection;
  saleId: string;
}

export function MaterialCategoryCard({ selection, saleId }: MaterialCategoryCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showAddOption, setShowAddOption] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);

  const deleteSelection = useDeleteMaterialSelection();
  const updateSelection = useUpdateMaterialSelection();
  const createOption = useCreateMaterialOption();

  const chosenOption = selection.options?.find((o) => o.is_chosen);
  const roomLabel = ROOM_PRESETS.find((r) => r.value === selection.room)?.label || selection.room;

  const handleToggleVisibility = async () => {
    await updateSelection.mutateAsync({
      id: selection.id,
      saleId,
      customer_visible: !selection.customer_visible,
    });
  };

  const handleDelete = async () => {
    await deleteSelection.mutateAsync({ id: selection.id, saleId });
    setShowDeleteConfirm(false);
  };

  const handleAddOption = async (data: {
    name: string;
    description?: string;
    color_code?: string;
    brand?: string;
    product_code?: string;
    is_default?: boolean;
  }): Promise<string> => {
    const maxOrder = selection.options?.reduce((max, o) => Math.max(max, o.order_index), -1) ?? -1;
    const result = await createOption.mutateAsync({
      saleId,
      selection_id: selection.id,
      ...data,
      order_index: maxOrder + 1,
    });
    setShowAddOption(false);
    return result.result.id;
  };

  return (
    <>
      <Card className={!selection.customer_visible ? "opacity-60" : ""}>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="py-3 px-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{selection.title}</span>
                    {roomLabel && (
                      <Badge variant="outline" className="text-xs">
                        {roomLabel}
                      </Badge>
                    )}
                    {!selection.customer_visible && (
                      <Badge variant="secondary" className="text-xs">
                        <EyeOff className="h-3 w-3 mr-1" />
                        Verborgen
                      </Badge>
                    )}
                  </div>
                  {selection.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selection.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pl-9 sm:pl-0">
                {chosenOption ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    <Check className="h-3 w-3 mr-1" />
                    {chosenOption.name}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-600">
                    Nog te kiezen
                  </Badge>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowAddOption(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Optie toevoegen
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Bewerken
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowNoteDialog(true)}>
                      <StickyNote className="h-4 w-4 mr-2" />
                      Toelichting bewerken
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleToggleVisibility}>
                      {selection.customer_visible ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-2" />
                          Verbergen voor klant
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Tonen aan klant
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Verwijderen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="pt-0 pb-4 px-4">
              {/* Options grid */}
              {selection.options && selection.options.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selection.options.map((option) => (
                    <MaterialOptionCard
                      key={option.id}
                      option={option}
                      saleId={saleId}
                      selectionId={selection.id}
                    />
                  ))}
                  
                  {/* Add option button */}
                  <button
                    onClick={() => setShowAddOption(true)}
                    className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors min-h-[120px]"
                  >
                    <Plus className="h-5 w-5" />
                    <span className="text-sm">Optie toevoegen</span>
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2">
                  <p className="text-muted-foreground text-sm">Nog geen opties</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddOption(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Eerste optie toevoegen
                  </Button>
                </div>
              )}

              {/* Notes - always show section */}
              <div 
                className="mt-4 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors group"
                onClick={() => setShowNoteDialog(true)}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                    <StickyNote className="h-3 w-3" />
                    Toelichting voor klant
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowNoteDialog(true);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
                {selection.notes ? (
                  <p className="text-sm">{selection.notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Klik om toelichting toe te voegen...
                  </p>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Dialogs */}
      <AddMaterialOptionDialog
        open={showAddOption}
        onOpenChange={setShowAddOption}
        onSubmit={handleAddOption}
        isLoading={createOption.isPending}
        saleId={saleId}
      />

      <EditMaterialSelectionDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        selection={selection}
        saleId={saleId}
      />

      <EditNoteDialog
        open={showNoteDialog}
        onOpenChange={setShowNoteDialog}
        selectionId={selection.id}
        saleId={saleId}
        currentNote={selection.notes}
        selectionTitle={selection.title}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Categorie verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je "{selection.title}" wilt verwijderen? Alle bijbehorende
              opties en afbeeldingen worden ook verwijderd. Deze actie kan niet ongedaan
              worden gemaakt.
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
    </>
  );
}
