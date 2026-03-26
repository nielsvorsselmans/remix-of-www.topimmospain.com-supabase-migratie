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
import { Trash2, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InsightDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insightLabel: string;
  onArchive: () => void;
  onDelete: () => void;
  isLoading?: boolean;
  mode?: "single" | "bulk";
  count?: number;
}

export function InsightDeleteDialog({
  open,
  onOpenChange,
  insightLabel,
  onArchive,
  onDelete,
  isLoading,
  mode = "single",
  count = 1,
}: InsightDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {mode === "single" ? "Inzicht verwijderen?" : `${count} inzichten verwijderen?`}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            {mode === "single" ? (
              <>
                <p>
                  Je staat op het punt om het volgende inzicht te verwijderen:
                </p>
                <p className="font-medium text-foreground bg-muted p-2 rounded">
                  "{insightLabel}"
                </p>
              </>
            ) : (
              <p>
                Je staat op het punt om {count} inzichten te verwijderen.
              </p>
            )}
            <p className="text-sm">
              Je kunt kiezen om te <strong>archiveren</strong> (verberg uit lijsten, maar behoud data) 
              of <strong>definitief verwijderen</strong> (niet meer terug te halen).
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel disabled={isLoading}>Annuleren</AlertDialogCancel>
          <Button
            variant="outline"
            onClick={() => {
              onArchive();
              onOpenChange(false);
            }}
            disabled={isLoading}
            className="gap-2"
          >
            <Archive className="h-4 w-4" />
            Archiveren
          </Button>
          <AlertDialogAction
            onClick={() => {
              onDelete();
              onOpenChange(false);
            }}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Definitief Verwijderen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
