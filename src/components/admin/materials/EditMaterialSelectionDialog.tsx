import { useState, useEffect, useMemo } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  MaterialSelection,
  useUpdateMaterialSelection,
  MATERIAL_CATEGORIES,
  ROOM_PRESETS,
} from "@/hooks/useMaterialSelections";

interface EditMaterialSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selection: MaterialSelection;
  saleId: string;
}

export function EditMaterialSelectionDialog({
  open,
  onOpenChange,
  selection,
  saleId,
}: EditMaterialSelectionDialogProps) {
  const [category, setCategory] = useState(selection.category);
  const [room, setRoom] = useState(selection.room || "__none__");
  const [title, setTitle] = useState(selection.title);
  const [description, setDescription] = useState(selection.description || "");
  const [notes, setNotes] = useState(selection.notes || "");
  const [customerVisible, setCustomerVisible] = useState(selection.customer_visible);

  const updateSelection = useUpdateMaterialSelection();

  // Include current category/room in options even if not in presets
  // Also filter out any empty values to prevent Radix Select errors
  const availableCategories = useMemo(() => {
    const categories = [...MATERIAL_CATEGORIES] as Array<{ value: string; label: string }>;
    const normalizedCategory = selection.category?.trim();
    if (normalizedCategory && !categories.some(c => c.value === normalizedCategory)) {
      categories.unshift({
        value: normalizedCategory,
        label: normalizedCategory.charAt(0).toUpperCase() + normalizedCategory.slice(1).replace(/_/g, ' ')
      });
    }
    // Filter out any items with empty values
    return categories.filter(c => c.value && c.value.trim() !== '');
  }, [selection.category]);

  const availableRooms = useMemo(() => {
    const rooms = [...ROOM_PRESETS] as Array<{ value: string; label: string }>;
    const normalizedRoom = selection.room?.trim();
    if (normalizedRoom && !rooms.some(r => r.value === normalizedRoom)) {
      rooms.unshift({
        value: normalizedRoom,
        label: normalizedRoom.charAt(0).toUpperCase() + normalizedRoom.slice(1).replace(/_/g, ' ')
      });
    }
    // Filter out any items with empty values
    return rooms.filter(r => r.value && r.value.trim() !== '');
  }, [selection.room]);

  // Reset form when selection changes
  useEffect(() => {
    setCategory(selection.category);
    setRoom(selection.room || "__none__");
    setTitle(selection.title);
    setDescription(selection.description || "");
    setNotes(selection.notes || "");
    setCustomerVisible(selection.customer_visible);
  }, [selection]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !title) return;

    await updateSelection.mutateAsync({
      id: selection.id,
      saleId,
      category,
      room: room === "__none__" ? null : room || null,
      title,
      description: description || null,
      notes: notes || null,
      customer_visible: customerVisible,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Materiaalkeuze bewerken</DialogTitle>
          <DialogDescription>
            Pas de gegevens van deze materiaalkeuze aan.
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
                {availableCategories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="room">Ruimte (optioneel)</Label>
            <Select value={room} onValueChange={setRoom}>
              <SelectTrigger>
                <SelectValue placeholder="Alle ruimtes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Alle ruimtes</SelectItem>
                {availableRooms.map((r) => (
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
            <Label htmlFor="description">Beschrijving</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Extra informatie"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Admin notitie</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Interne notities (niet zichtbaar voor klant)"
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="customerVisible">Zichtbaar voor klant</Label>
              <p className="text-xs text-muted-foreground">
                Toon in het klantportaal
              </p>
            </div>
            <Switch
              id="customerVisible"
              checked={customerVisible}
              onCheckedChange={setCustomerVisible}
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
            <Button
              type="submit"
              disabled={updateSelection.isPending || !category || !title}
            >
              {updateSelection.isPending ? "Opslaan..." : "Opslaan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
