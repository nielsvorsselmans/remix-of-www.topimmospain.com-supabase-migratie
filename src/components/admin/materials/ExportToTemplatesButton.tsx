import { useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useExportSelectionsToTemplates } from "@/hooks/useMaterialTemplates";

interface ExportToTemplatesButtonProps {
  saleId: string;
  projectId: string;
  selectionsCount: number;
}

export function ExportToTemplatesButton({
  saleId,
  projectId,
  selectionsCount,
}: ExportToTemplatesButtonProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const exportMutation = useExportSelectionsToTemplates();

  const handleExport = async () => {
    await exportMutation.mutateAsync({ saleId, projectId });
    setShowConfirmDialog(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowConfirmDialog(true)}
        disabled={selectionsCount === 0 || exportMutation.isPending}
      >
        {exportMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Exporteren...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Naar templates
          </>
        )}
      </Button>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exporteren naar project templates?</AlertDialogTitle>
          <AlertDialogDescription asChild>
              <div className="space-y-2">
                <span className="block">
                  Dit maakt <strong>{selectionsCount} templates</strong> aan voor dit project, 
                  gebaseerd op de huidige materiaalselecties.
                </span>
                <span className="block">
                  De opties worden overgenomen, maar <strong>zonder de gemaakte keuzes</strong>. 
                  Hierdoor kunnen toekomstige kopers hun eigen keuze maken.
                </span>
                <span className="block text-muted-foreground text-sm">
                  Templates die al bestaan (zelfde titel) worden <strong>bijgewerkt</strong> met de nieuwe opties en afbeeldingen.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={exportMutation.isPending}>
              Annuleren
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExport}
              disabled={exportMutation.isPending}
            >
              {exportMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Bezig...
                </>
              ) : (
                "Exporteren"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
