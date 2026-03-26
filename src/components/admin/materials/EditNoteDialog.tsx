import { useState, useEffect } from "react";
import { StickyNote } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateMaterialSelection } from "@/hooks/useMaterialSelections";

interface EditNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectionId: string;
  saleId: string;
  currentNote: string | null;
  selectionTitle: string;
}

export function EditNoteDialog({
  open,
  onOpenChange,
  selectionId,
  saleId,
  currentNote,
  selectionTitle,
}: EditNoteDialogProps) {
  const [note, setNote] = useState(currentNote || "");
  const updateSelection = useUpdateMaterialSelection();

  useEffect(() => {
    if (open) {
      setNote(currentNote || "");
    }
  }, [open, currentNote]);

  const handleSave = async () => {
    await updateSelection.mutateAsync({
      id: selectionId,
      saleId,
      notes: note.trim() || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5" />
            Toelichting bewerken
          </DialogTitle>
          <DialogDescription>
            Voeg een toelichting toe voor "{selectionTitle}" die uitlegt hoe de materialen toegepast moeten worden.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Bijv. Grote tegels (60x60) voor de vloer, mozaïek tegels voor de achterwand bij het kookgedeelte..."
            rows={4}
            className="resize-none"
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateSelection.isPending}
          >
            Annuleren
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateSelection.isPending}
          >
            {updateSelection.isPending ? "Opslaan..." : "Opslaan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
