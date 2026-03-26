import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { SaleChecklistItem } from "@/hooks/useSaleChecklist";

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { title: string; description?: string; prerequisiteFor?: string | null }) => void;
  isPending: boolean;
  initialTitle: string;
  initialDescription?: string;
  initialPrerequisiteFor?: string | null;
  currentItemId?: string;
  allItems?: SaleChecklistItem[];
}

export function EditTaskDialog({
  open,
  onOpenChange,
  onSave,
  isPending,
  initialTitle,
  initialDescription,
  initialPrerequisiteFor,
  currentItemId,
  allItems = [],
}: EditTaskDialogProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription || "");
  const [prerequisiteFor, setPrerequisiteFor] = useState(initialPrerequisiteFor || "");

  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setDescription(initialDescription || "");
      setPrerequisiteFor(initialPrerequisiteFor || "");
    }
  }, [open, initialTitle, initialDescription, initialPrerequisiteFor]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      prerequisiteFor: prerequisiteFor && prerequisiteFor !== "none" ? prerequisiteFor : null,
    });
  };

  // Filter eligible tasks (exclude self, only incomplete)
  const eligibleTasks = allItems.filter(
    (item) => item.id !== currentItemId && !item.completed_at
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Taak bewerken</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Titel *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titel van de taak"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Beschrijving</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optionele beschrijving..."
              rows={3}
            />
          </div>

          {eligibleTasks.length > 0 && (
            <div className="space-y-2">
              <Label>Prerequisite voor</Label>
              <Select value={prerequisiteFor || "none"} onValueChange={setPrerequisiteFor}>
                <SelectTrigger>
                  <SelectValue placeholder="Geen (optioneel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Geen</SelectItem>
                  {eligibleTasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Deze taak moet eerst voltooid worden vóór de geselecteerde taak.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit" disabled={isPending || !title.trim()}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Opslaan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
