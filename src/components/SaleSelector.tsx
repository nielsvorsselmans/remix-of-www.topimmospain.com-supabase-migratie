import { useOptionalActiveSale } from "@/contexts/ActiveSaleContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";

export function SaleSelector() {
  const { sales, activeSaleId, setActiveSaleId, hasMultipleSales, isLoading } = useOptionalActiveSale();

  // Don't render if loading, no sales, or only one sale
  if (isLoading || !hasMultipleSales) return null;

  const activeSale = sales.find(s => s.id === activeSaleId);

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b border-border">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Aankoop:</span>
      <Select value={activeSaleId || undefined} onValueChange={setActiveSaleId}>
        <SelectTrigger className="w-auto min-w-[200px] h-8 text-sm">
          <SelectValue>
            {activeSale?.project?.name || activeSale?.property_description || 'Selecteer aankoop'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {sales.map(sale => (
            <SelectItem key={sale.id} value={sale.id}>
              <div className="flex flex-col">
                <span>{sale.project?.name || 'Onbekend project'}</span>
                {sale.property_description && (
                  <span className="text-xs text-muted-foreground">{sale.property_description}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
