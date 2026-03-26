import { useState } from "react";
import { Plus, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { CostExtra, STANDARD_EXTRAS, formatCurrency } from "@/hooks/useCostEstimator";

interface CostEstimatorExtrasProps {
  extras: CostExtra[];
  onAddExtra: (extra: Omit<CostExtra, "id">) => void;
  onUpdateExtra: (extraId: string, updates: Partial<Omit<CostExtra, "id">>) => void;
  onRemoveExtra: (extraId: string) => void;
}

export function CostEstimatorExtras({
  extras,
  onAddExtra,
  onUpdateExtra,
  onRemoveExtra,
}: CostEstimatorExtrasProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  // Get existing standard extras by key
  const getStandardExtra = (key: string) => {
    return extras.find((e) => e.notes === key);
  };

  // Initialize standard extras if they don't exist
  const handleStandardExtraChange = (
    key: string,
    name: string,
    field: "price" | "isIncluded",
    value: number | boolean
  ) => {
    const existing = getStandardExtra(key);

    if (existing) {
      onUpdateExtra(existing.id, { [field]: value });
    } else {
      // Create new standard extra
      onAddExtra({
        name,
        price: field === "price" ? (value as number) : 0,
        isIncluded: field === "isIncluded" ? (value as boolean) : false,
        viaDeveloper: true,
        notes: key, // Use notes to store the key for identification
      });
    }
  };

  const handleAddCustomExtra = () => {
    if (!customName.trim()) return;

    onAddExtra({
      name: customName.trim(),
      price: parseFloat(customPrice) || 0,
      isIncluded: false,
      viaDeveloper: false,
      notes: "custom",
    });

    setCustomName("");
    setCustomPrice("");
    setIsDialogOpen(false);
  };

  // Get custom extras (not standard ones)
  const customExtras = extras.filter((e) => e.notes === "custom");

  // Calculate totals
  const includedItems = extras.filter((e) => e.isIncluded && e.price > 0);
  const extraItems = extras.filter((e) => !e.isIncluded && e.price > 0);
  const totalExtras = extraItems.reduce((sum, e) => sum + e.price, 0);

  return (
    <div className="space-y-4">
      <Label className="text-sm font-semibold">Extra's & Meerwerk</Label>
      
      {/* Standard Extras - Always visible */}
      <div className="space-y-3">
        {STANDARD_EXTRAS.map(({ name, key }) => {
          const extra = getStandardExtra(key);
          const price = extra?.price || 0;
          const isIncluded = extra?.isIncluded || false;

          return (
            <div
              key={key}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card"
            >
              <div className="flex-1 min-w-0">
                <Label className="text-sm font-medium">{name}</Label>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">€</span>
                <Input
                  type="number"
                  value={price || ""}
                  onChange={(e) =>
                    handleStandardExtraChange(
                      key,
                      name,
                      "price",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  placeholder="0"
                  className="w-24 h-8 text-right"
                  disabled={isIncluded}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={isIncluded}
                  onCheckedChange={(checked) =>
                    handleStandardExtraChange(key, name, "isIncluded", checked)
                  }
                />
                <span className="text-xs text-muted-foreground w-16">
                  {isIncluded ? "Inclusief" : "Extra"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Extras */}
      {customExtras.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Handmatig toegevoegd
          </Label>
          {customExtras.map((extra) => (
            <div
              key={extra.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card"
            >
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{extra.name}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">€</span>
                <Input
                  type="number"
                  value={extra.price || ""}
                  onChange={(e) =>
                    onUpdateExtra(extra.id, {
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                  className="w-24 h-8 text-right"
                  disabled={extra.isIncluded}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={extra.isIncluded}
                  onCheckedChange={(checked) =>
                    onUpdateExtra(extra.id, { isIncluded: checked })
                  }
                />
                <span className="text-xs text-muted-foreground w-16">
                  {extra.isIncluded ? "Inclusief" : "Extra"}
                </span>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => onRemoveExtra(extra.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add Custom Extra Button */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Handmatig toevoegen
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extra toevoegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Naam</Label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Bijv. Zwembadverwarming"
              />
            </div>
            <div className="space-y-2">
              <Label>Bedrag (optioneel)</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">€</span>
                <Input
                  type="number"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleAddCustomExtra} disabled={!customName.trim()}>
              Toevoegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Summary */}
      {(includedItems.length > 0 || extraItems.length > 0) && (
        <div className="pt-3 border-t space-y-2">
          {includedItems.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-green-600" />
              <span>
                {includedItems.length} item(s) inclusief in prijs
              </span>
            </div>
          )}
          {extraItems.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Extra's ({extraItems.length} items):
              </span>
              <span className="font-medium">{formatCurrency(totalExtras)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
