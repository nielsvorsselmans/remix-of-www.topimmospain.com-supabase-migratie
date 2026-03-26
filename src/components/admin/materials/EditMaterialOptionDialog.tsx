import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { MaterialOption, useUpdateMaterialOption } from "@/hooks/useMaterialSelections";

interface EditMaterialOptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  option: MaterialOption;
  saleId: string;
}

export function EditMaterialOptionDialog({
  open,
  onOpenChange,
  option,
  saleId,
}: EditMaterialOptionDialogProps) {
  const [name, setName] = useState(option.name);
  const [description, setDescription] = useState(option.description || "");
  const [colorCode, setColorCode] = useState(option.color_code || "");
  const [brand, setBrand] = useState(option.brand || "");
  const [productCode, setProductCode] = useState(option.product_code || "");
  const [price, setPrice] = useState(option.price?.toString() || "");
  const [isDefault, setIsDefault] = useState(option.is_default);

  const updateOption = useUpdateMaterialOption();

  // Reset form when option changes
  useEffect(() => {
    setName(option.name);
    setDescription(option.description || "");
    setColorCode(option.color_code || "");
    setBrand(option.brand || "");
    setProductCode(option.product_code || "");
    setPrice(option.price?.toString() || "");
    setIsDefault(option.is_default);
  }, [option]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    await updateOption.mutateAsync({
      id: option.id,
      saleId,
      name,
      description: description || null,
      color_code: colorCode || null,
      brand: brand || null,
      product_code: productCode || null,
      price: price ? parseFloat(price) : null,
      is_default: isDefault,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Optie bewerken</DialogTitle>
          <DialogDescription>
            Pas de gegevens van deze optie aan.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Naam *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bijv. Lakestone Beige"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Merk</Label>
              <Input
                id="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Bijv. Porcelanosa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productCode">Productcode</Label>
              <Input
                id="productCode"
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                placeholder="Bijv. BO04"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="colorCode">Kleurcode (HEX)</Label>
            <div className="flex gap-2">
              <Input
                id="colorCode"
                value={colorCode}
                onChange={(e) => setColorCode(e.target.value)}
                placeholder="#RRGGBB"
                className="flex-1"
              />
              {colorCode && (
                <div
                  className="w-10 h-10 rounded border flex-shrink-0"
                  style={{ backgroundColor: colorCode }}
                />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Meerprijs (optioneel)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="pl-7"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Laat leeg indien geen meerprijs
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschrijving</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Extra informatie over deze optie"
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="isDefault">Standaard optie</Label>
              <p className="text-xs text-muted-foreground">
                Dit is de standaard keuze van de ontwikkelaar
              </p>
            </div>
            <Switch
              id="isDefault"
              checked={isDefault}
              onCheckedChange={setIsDefault}
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
              disabled={updateOption.isPending || !name}
            >
              {updateOption.isPending ? "Opslaan..." : "Opslaan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
