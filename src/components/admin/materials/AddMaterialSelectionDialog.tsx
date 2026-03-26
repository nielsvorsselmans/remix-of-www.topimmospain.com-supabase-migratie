import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMaterialCategoriesWithFallback, useMaterialRoomsWithFallback } from "@/hooks/useMaterialSettings";

interface AddMaterialSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    category: string;
    room?: string;
    title: string;
    description?: string;
  }) => Promise<void>;
  isLoading: boolean;
  projectId?: string;
}

export function AddMaterialSelectionDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  projectId,
}: AddMaterialSelectionDialogProps) {
  const [category, setCategory] = useState("");
  const [room, setRoom] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const { categories } = useMaterialCategoriesWithFallback(projectId);
  const { rooms } = useMaterialRoomsWithFallback(projectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !title) return;

    await onSubmit({
      category,
      room: room || undefined,
      title,
      description: description || undefined,
    });

    // Reset form
    setCategory("");
    setRoom("");
    setTitle("");
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Materiaalkeuze toevoegen</DialogTitle>
          <DialogDescription>
            Voeg een nieuwe categorie toe voor materiaalkeuzes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Categorie *</Label>
            <Select value={category} onValueChange={setCategory}>
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
            <Select value={room || "__all__"} onValueChange={(val) => setRoom(val === "__all__" ? "" : val)}>
              <SelectTrigger>
                <SelectValue placeholder="Alle ruimtes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Alle ruimtes</SelectItem>
                {rooms.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Titel *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bijv. Vloertegels Woonkamer"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschrijving (optioneel)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Extra informatie over deze materiaalkeuze"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuleren
            </Button>
            <Button type="submit" disabled={isLoading || !category || !title}>
              {isLoading ? "Bezig..." : "Toevoegen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
