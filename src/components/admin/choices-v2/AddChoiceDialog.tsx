import { useState } from "react";
import { useCreateChoice, useChoiceFieldSuggestions, ChoiceType, SaleChoice } from "@/hooks/useSaleChoices";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChoiceCombobox } from "./ChoiceCombobox";

interface Props {
  saleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (choice: SaleChoice) => void;
  type: ChoiceType;
}

const dialogConfig: Record<ChoiceType, { title: string; titlePlaceholder: string }> = {
  request: {
    title: "Aanpassing toevoegen",
    titlePlaceholder: "bijv. Grondplanwijziging, Extra berging...",
  },
  material: {
    title: "Materiaalkeuze toevoegen",
    titlePlaceholder: "bijv. Vloertegels, Keukenkleuren...",
  },
  extra: {
    title: "Extra toevoegen",
    titlePlaceholder: "bijv. Airco, Lichtspots...",
  },
};

export function AddChoiceDialog({ saleId, open, onOpenChange, onCreated, type }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [room, setRoom] = useState('');
  const createChoice = useCreateChoice();
  const { categories, rooms } = useChoiceFieldSuggestions(saleId);
  const config = dialogConfig[type];

  const reset = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setRoom('');
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    createChoice.mutate(
      {
        sale_id: saleId,
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        room: room.trim() || undefined,
      },
      {
        onSuccess: (data) => {
          const created = {
            ...data,
            options: [],
            attachments: [],
          } as SaleChoice;
          reset();
          onOpenChange(false);
          onCreated?.(created);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Titel *</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={config.titlePlaceholder}
              autoFocus
            />
          </div>
          <div>
            <Label>Beschrijving</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optioneel..."
              rows={2}
            />
          </div>
          <div className={type === 'material' ? "grid grid-cols-2 gap-3" : ""}>
            <div>
              <Label>Categorie</Label>
              <ChoiceCombobox
                value={category}
                onChange={setCategory}
                suggestions={categories}
                placeholder="bijv. Keuken"
              />
            </div>
            {type === 'material' && (
              <div>
                <Label>Ruimte</Label>
                <ChoiceCombobox
                  value={room}
                  onChange={setRoom}
                  suggestions={rooms}
                  placeholder="bijv. Woonkamer"
                />
              </div>
            )}
          </div>
          <div className="pt-2">
            <Button
              onClick={handleSubmit}
              disabled={!title.trim() || createChoice.isPending}
              className="w-full"
            >
              Toevoegen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
