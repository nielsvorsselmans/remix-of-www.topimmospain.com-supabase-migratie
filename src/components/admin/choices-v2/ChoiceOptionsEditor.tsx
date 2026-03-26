import { useState } from "react";
import { SaleChoice, SaleChoiceOption, SaleChoiceAttachment } from "@/hooks/useSaleChoices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Star, Check, Trash2, Upload, X } from "lucide-react";

interface Props {
  choice: SaleChoice;
  saleId: string;
  showImages?: boolean;
  onCreateOption: (data: { name: string; description?: string; price?: number; brand?: string; is_recommended?: boolean }) => void;
  onUpdateOption: (id: string, data: any) => void;
  onDeleteOption: (id: string) => void;
  onUploadImage?: (optionId: string, file: File) => void;
  onDeleteImage?: (id: string, filePath: string) => void;
}

export function ChoiceOptionsEditor({
  choice,
  showImages,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
  onUploadImage,
  onDeleteImage,
}: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newBrand, setNewBrand] = useState('');

  const handleAdd = () => {
    if (!newName.trim()) return;
    onCreateOption({
      name: newName.trim(),
      price: newPrice ? parseFloat(newPrice) : undefined,
      brand: newBrand.trim() || undefined,
    });
    setNewName('');
    setNewPrice('');
    setNewBrand('');
    setShowAddForm(false);
  };

  const handleChoose = (option: SaleChoiceOption) => {
    onUpdateOption(option.id, { is_chosen: !option.is_chosen });
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Opties</h4>

      {choice.options.length === 0 && !showAddForm ? (
        <p className="text-sm text-muted-foreground">Nog geen opties.</p>
      ) : (
        <div className="space-y-2">
          {choice.options.map(option => (
            <div
              key={option.id}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                option.is_chosen ? 'border-primary bg-primary/5' : ''
              }`}
            >
              {showImages && option.attachments.length > 0 && (
                <img
                  src={option.attachments[0].file_url}
                  alt={option.name}
                  className="w-16 h-16 rounded object-cover shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{option.name}</span>
                  {option.is_recommended && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200">
                      <Star className="h-2.5 w-2.5 mr-0.5" /> Aanbevolen
                    </Badge>
                  )}
                  {option.is_chosen && (
                    <Badge className="text-[10px] px-1.5 py-0 bg-primary text-primary-foreground">
                      Gekozen
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  {option.brand && <span>{option.brand}</span>}
                  {option.price != null && (
                    <span className="font-medium text-foreground">
                      €{option.price.toLocaleString('nl-NL')}
                    </span>
                  )}
                  {option.color_code && (
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: option.color_code }} />
                      {option.color_code}
                    </span>
                  )}
                </div>
                {showImages && onUploadImage && (
                  <div className="mt-2 flex gap-1">
                    {option.attachments.map(att => (
                      <div key={att.id} className="relative group">
                        <img src={att.file_url} alt="" className="w-10 h-10 rounded object-cover" />
                        {onDeleteImage && (
                          <button
                            onClick={() => onDeleteImage(att.id, att.file_path)}
                            className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <label className="w-10 h-10 rounded border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-muted/50">
                      <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) onUploadImage(option.id, file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant={option.is_chosen ? "default" : "outline"}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleChoose(option)}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => onDeleteOption(option.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddForm ? (
        <div className="flex items-end gap-2 p-3 rounded-lg border bg-muted/30">
          <div className="flex-1">
            <Label className="text-xs">Naam</Label>
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Optienaam" autoFocus />
          </div>
          <div className="w-24">
            <Label className="text-xs">Prijs</Label>
            <Input value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="€" type="number" />
          </div>
          {showImages && (
            <div className="w-24">
              <Label className="text-xs">Merk</Label>
              <Input value={newBrand} onChange={e => setNewBrand(e.target.value)} placeholder="Merk" />
            </div>
          )}
          <Button size="sm" onClick={handleAdd} disabled={!newName.trim()}>Toevoegen</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>Annuleren</Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Optie toevoegen
        </Button>
      )}
    </div>
  );
}
