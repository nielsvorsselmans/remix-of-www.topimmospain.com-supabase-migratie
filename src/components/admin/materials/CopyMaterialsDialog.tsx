import { useState } from "react";
import { Copy, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCopyMaterialsFromSale, useAvailableSalesForCopy } from "@/hooks/useMaterialTemplates";

interface CopyMaterialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  projectId: string | undefined;
}

export function CopyMaterialsDialog({
  open,
  onOpenChange,
  saleId,
  projectId,
}: CopyMaterialsDialogProps) {
  const [selectedSaleId, setSelectedSaleId] = useState<string>("");
  const [includeChoices, setIncludeChoices] = useState(false);

  const { data: availableSales, isLoading: loadingSales } = useAvailableSalesForCopy(saleId, projectId);
  const copyMaterials = useCopyMaterialsFromSale();

  const handleCopy = async () => {
    if (!selectedSaleId) return;

    await copyMaterials.mutateAsync({
      sourceSaleId: selectedSaleId,
      targetSaleId: saleId,
      includeChoices,
    });

    onOpenChange(false);
    setSelectedSaleId("");
    setIncludeChoices(false);
  };

  const getCustomerName = (sale: any) => {
    const customer = sale.customers?.[0]?.customer;
    if (customer) {
      return `${customer.first_name || ""} ${customer.last_name || ""}`.trim();
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Materialen kopiëren
          </DialogTitle>
          <DialogDescription>
            Kopieer materiaalkeuzes van een andere woning binnen hetzelfde project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="source-sale">Kopieer van woning</Label>
            {loadingSales ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Laden...
              </div>
            ) : availableSales && availableSales.length > 0 ? (
              <Select value={selectedSaleId} onValueChange={setSelectedSaleId}>
                <SelectTrigger id="source-sale">
                  <SelectValue placeholder="Selecteer een woning" />
                </SelectTrigger>
                <SelectContent>
              {availableSales.map((sale: any) => {
                    const customerName = getCustomerName(sale);
                    return (
                      <SelectItem key={sale.id} value={sale.id}>
                        {sale.property_description || sale.id.slice(0, 8)}
                        {customerName && ` - ${customerName}`}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">
                Geen andere woningen beschikbaar in dit project.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="include-choices">Inclusief gemaakte keuzes</Label>
              <p className="text-xs text-muted-foreground">
                Kopieer ook welke opties als gekozen zijn gemarkeerd
              </p>
            </div>
            <Switch
              id="include-choices"
              checked={includeChoices}
              onCheckedChange={setIncludeChoices}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button
            onClick={handleCopy}
            disabled={!selectedSaleId || copyMaterials.isPending}
          >
            {copyMaterials.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Kopiëren...
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Kopiëren
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
