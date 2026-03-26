import { useState, useMemo } from "react";
import { FileText, Loader2, Package, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useMaterialTemplates, useApplyTemplatesToSale, useAvailableSalesForCopy } from "@/hooks/useMaterialTemplates";
import { useOtherSaleExtras, useImportSaleExtras } from "@/hooks/useImportSaleExtras";
import { useSaleExtras } from "@/hooks/useSaleExtras";

interface ApplyTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  projectId: string | undefined;
}

export function ApplyTemplatesDialog({
  open,
  onOpenChange,
  saleId,
  projectId,
}: ApplyTemplatesDialogProps) {
  const [importExtras, setImportExtras] = useState(false);
  const [sourceSaleId, setSourceSaleId] = useState<string>("");

  const { data: templates } = useMaterialTemplates(projectId);
  const { data: availableSales } = useAvailableSalesForCopy(saleId, projectId);
  const { data: otherSaleExtras } = useOtherSaleExtras(projectId, saleId);
  const { data: existingExtras } = useSaleExtras(saleId);
  
  const applyTemplates = useApplyTemplatesToSale();
  const importSaleExtras = useImportSaleExtras();

  const activeTemplates = templates?.filter(t => t.is_active) || [];
  const isPending = applyTemplates.isPending || importSaleExtras.isPending;

  // Find sales that have extras
  const salesWithExtras = otherSaleExtras?.filter(s => s.categories.length > 0) || [];

  const handleApply = async () => {
    if (!projectId) return;

    // Apply material templates
    await applyTemplates.mutateAsync({
      projectId,
      saleId,
    });

    // Import extras if enabled and source selected
    if (importExtras && sourceSaleId) {
      const sourceExtras = otherSaleExtras?.find(s => s.saleId === sourceSaleId);
      if (sourceExtras && sourceExtras.categories.length > 0) {
        const existingCategoryNames = existingExtras?.map(c => c.name.toLowerCase()) || [];
        await importSaleExtras.mutateAsync({
          targetSaleId: saleId,
          categories: sourceExtras.categories,
          existingCategoryNames,
        });
      }
    }

    // Reset state and close
    setImportExtras(false);
    setSourceSaleId("");
    onOpenChange(false);
  };

  // Get customer name for a sale
  const getSaleName = (sale: any) => {
    const customers = sale.customers as any[] | undefined;
    if (customers && customers.length > 0) {
      const customer = customers[0]?.customer;
      if (customer) {
        return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || sale.property_description;
      }
    }
    return sale.property_description || 'Onbekend';
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Project templates toepassen
          </AlertDialogTitle>
          <AlertDialogDescription>
            {activeTemplates.length > 0 ? (
              <>
                Er worden <strong>{activeTemplates.length} templates</strong> toegepast op deze verkoop.
                Bestaande materiaalkeuzes blijven behouden.
              </>
            ) : (
              "Er zijn geen actieve templates voor dit project. Maak eerst templates aan in de projectinstellingen."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {activeTemplates.length > 0 && (
          <>
            {/* Warning for incomplete templates */}
            {(() => {
              const incompleteTemplates = activeTemplates.filter(
                t => !t.default_options || t.default_options.length === 0 ||
                     !t.default_options.some(opt => opt.images && opt.images.length > 0)
              );
              if (incompleteTemplates.length > 0) {
                return (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-amber-700 dark:text-amber-300">
                      <strong>{incompleteTemplates.length}</strong> template(s) hebben geen opties of afbeeldingen. 
                      Overweeg eerst te synchroniseren in projectinstellingen.
                    </p>
                  </div>
                );
              }
              return null;
            })()}

            <div className="max-h-48 overflow-y-auto border rounded-md p-3 bg-muted/50">
              <ul className="space-y-1 text-sm">
                {activeTemplates.map((template) => {
                  const optionsCount = template.default_options?.length || 0;
                  const hasImages = template.default_options?.some(opt => opt.images && opt.images.length > 0);
                  const isIncomplete = optionsCount === 0 || !hasImages;
                  
                  return (
                    <li key={template.id} className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isIncomplete ? 'bg-amber-500' : 'bg-primary'}`} />
                      <span className={isIncomplete ? 'text-muted-foreground' : ''}>{template.title}</span>
                      {template.room && (
                        <span className="text-muted-foreground">({template.room})</span>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {optionsCount > 0 ? `${optionsCount} opties` : 'leeg'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}

        {/* Extras import option */}
        {salesWithExtras.length > 0 && (
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="import-extras" 
                checked={importExtras} 
                onCheckedChange={(checked) => {
                  setImportExtras(checked === true);
                  if (!checked) setSourceSaleId("");
                }}
              />
              <Label htmlFor="import-extras" className="flex items-center gap-2 cursor-pointer">
                <Package className="h-4 w-4" />
                Ook extra's importeren van een andere verkoop
              </Label>
            </div>

            {importExtras && (
              <Select value={sourceSaleId} onValueChange={setSourceSaleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer bronverkoop voor extra's" />
                </SelectTrigger>
                <SelectContent>
                  {availableSales?.filter(sale => 
                    salesWithExtras.some(s => s.saleId === sale.id)
                  ).map((sale) => {
                    const extrasCount = salesWithExtras.find(s => s.saleId === sale.id)?.categories.length || 0;
                    return (
                      <SelectItem key={sale.id} value={sale.id}>
                        {getSaleName(sale)} ({extrasCount} categorie{extrasCount !== 1 ? 'ën' : ''})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annuleren</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleApply}
            disabled={activeTemplates.length === 0 || isPending || (importExtras && !sourceSaleId)}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Toepassen...
              </>
            ) : (
              "Templates toepassen"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
