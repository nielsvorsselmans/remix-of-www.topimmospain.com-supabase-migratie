import { useState } from "react";
import { Check, Trash2, Edit, Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  MaterialOption,
  useUpdateMaterialOption,
  useDeleteMaterialOption,
  useChooseMaterialOption,
} from "@/hooks/useMaterialSelections";
import { EditMaterialOptionDialog } from "./EditMaterialOptionDialog";
import { MaterialImageUploader } from "./MaterialImageUploader";
import { cn } from "@/lib/utils";

interface MaterialOptionCardProps {
  option: MaterialOption;
  saleId: string;
  selectionId?: string;
}

export function MaterialOptionCard({ option, saleId, selectionId }: MaterialOptionCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showImageUploader, setShowImageUploader] = useState(false);

  const updateOption = useUpdateMaterialOption();
  const deleteOption = useDeleteMaterialOption();
  const chooseOption = useChooseMaterialOption();

  const primaryImage = option.images?.find((img) => img.is_primary) || option.images?.[0];

  const handleToggleChosen = async () => {
    if (selectionId && !option.is_chosen) {
      // Use the new hook that also updates the selection
      await chooseOption.mutateAsync({
        optionId: option.id,
        selectionId,
        saleId,
      });
    } else {
      // Just toggle the option directly
      await updateOption.mutateAsync({
        id: option.id,
        saleId,
        is_chosen: !option.is_chosen,
      });
    }
  };

  const handleDelete = async () => {
    await deleteOption.mutateAsync({ id: option.id, saleId });
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <div
        className={cn(
          "relative group border rounded-lg overflow-hidden transition-all",
          option.is_chosen
            ? "border-green-500 ring-2 ring-green-500/20 bg-green-50/50 dark:bg-green-950/20"
            : "hover:border-primary/50"
        )}
      >
        {/* Image area */}
        <div className="relative aspect-[4/3] bg-muted">
          {primaryImage ? (
            <img
              src={primaryImage.image_url}
              alt={option.name}
              className="w-full h-full object-cover"
            />
          ) : option.color_code ? (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ backgroundColor: option.color_code }}
            >
              <span className="text-xs font-mono bg-black/50 text-white px-2 py-1 rounded">
                {option.color_code}
              </span>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ImageIcon className="h-8 w-8" />
            </div>
          )}

          {/* Image count badge */}
          {option.images && option.images.length > 1 && (
            <Badge
              variant="secondary"
              className="absolute top-2 right-2 text-xs"
            >
              {option.images.length} foto's
            </Badge>
          )}

          {/* Chosen indicator */}
          {option.is_chosen && (
            <div className="absolute top-2 left-2 p-1.5 bg-green-500 rounded-full text-white">
              <Check className="h-3 w-3" />
            </div>
          )}

          {/* Action buttons on hover */}
          <div className="absolute inset-0 bg-black/60 opacity-0 max-sm:opacity-100 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8"
              onClick={() => setShowImageUploader(true)}
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8"
              onClick={() => setShowEditDialog(true)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="destructive"
              className="h-8 w-8"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Info area */}
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{option.name}</p>
              {option.brand && (
                <p className="text-xs text-muted-foreground truncate">
                  {option.brand}
                  {option.product_code && ` • ${option.product_code}`}
                </p>
              )}
            </div>

            {/* Color swatch */}
            {option.color_code && !primaryImage && (
              <div
                className="w-6 h-6 rounded-full border flex-shrink-0"
                style={{ backgroundColor: option.color_code }}
              />
            )}
          </div>

          {/* Badges */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {option.is_default && (
              <Badge variant="outline" className="text-xs">
                Standaard
              </Badge>
            )}
            {option.price != null && option.price > 0 && (
              <Badge className="text-xs bg-amber-500 hover:bg-amber-600 text-white">
                +€{option.price.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </Badge>
            )}
          </div>

          {/* Choose button */}
          <Button
            variant={option.is_chosen ? "default" : "outline"}
            size="sm"
            className="w-full mt-3"
            onClick={handleToggleChosen}
            disabled={updateOption.isPending || chooseOption.isPending}
          >
            {option.is_chosen ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Gekozen
              </>
            ) : (
              "Selecteren"
            )}
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      <EditMaterialOptionDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        option={option}
        saleId={saleId}
      />

      <MaterialImageUploader
        open={showImageUploader}
        onOpenChange={setShowImageUploader}
        option={option}
        saleId={saleId}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Optie verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je "{option.name}" wilt verwijderen? Alle bijbehorende
              afbeeldingen worden ook verwijderd.
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
