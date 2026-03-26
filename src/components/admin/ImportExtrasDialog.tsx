import { useState, useMemo } from "react";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Loader2, 
  Package, 
  ChevronDown, 
  Check, 
  FileText,
  Euro,
  Paperclip
} from "lucide-react";
import { useOtherSaleExtras, useImportSaleExtras } from "@/hooks/useImportSaleExtras";
import { SaleExtraCategory } from "@/hooks/useSaleExtras";

interface ImportExtrasDialogProps {
  saleId: string;
  projectId: string;
  existingCategories: SaleExtraCategory[];
  onClose: () => void;
}

export function ImportExtrasDialog({ 
  saleId, 
  projectId, 
  existingCategories,
  onClose 
}: ImportExtrasDialogProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [expandedSales, setExpandedSales] = useState<string[]>([]);

  const { data: otherSaleExtras = [], isLoading } = useOtherSaleExtras(projectId, saleId);
  const importExtras = useImportSaleExtras();

  // Get existing category names for deduplication
  const existingCategoryNames = useMemo(() => 
    existingCategories.map(c => c.name.toLowerCase()),
    [existingCategories]
  );

  // Flatten all categories for selection mapping
  const allCategories = useMemo(() => {
    const categories: Array<SaleExtraCategory & { saleInfo: string }> = [];
    otherSaleExtras.forEach(sale => {
      sale.categories.forEach(cat => {
        categories.push({
          ...cat,
          saleInfo: sale.propertyDescription,
        });
      });
    });
    return categories;
  }, [otherSaleExtras]);

  // Filter out categories that already exist
  const availableCategories = useMemo(() => 
    allCategories.filter(cat => !existingCategoryNames.includes(cat.name.toLowerCase())),
    [allCategories, existingCategoryNames]
  );

  const handleToggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId) 
        : [...prev, categoryId]
    );
  };

  const handleToggleSaleExpanded = (saleId: string) => {
    setExpandedSales(prev => 
      prev.includes(saleId) 
        ? prev.filter(id => id !== saleId) 
        : [...prev, saleId]
    );
  };

  const handleSelectAllFromSale = (saleCategoryIds: string[]) => {
    const availableIds = saleCategoryIds.filter(id => 
      availableCategories.some(c => c.id === id)
    );
    
    const allSelected = availableIds.every(id => selectedCategories.includes(id));
    
    if (allSelected) {
      setSelectedCategories(prev => prev.filter(id => !availableIds.includes(id)));
    } else {
      setSelectedCategories(prev => [...new Set([...prev, ...availableIds])]);
    }
  };

  const handleImport = async () => {
    const categoriesToImport = allCategories.filter(c => selectedCategories.includes(c.id));
    
    if (categoriesToImport.length === 0) return;

    await importExtras.mutateAsync({
      targetSaleId: saleId,
      categories: categoriesToImport,
      existingCategoryNames,
    });

    onClose();
  };

  const totalSelected = selectedCategories.length;

  return (
    <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>Extra's Importeren</DialogTitle>
        <DialogDescription>
          Importeer extra categorieën, opties en bijlagen van andere verkopen binnen dit project.
        </DialogDescription>
      </DialogHeader>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : otherSaleExtras.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Geen extra's beschikbaar om te importeren.</p>
          <p className="text-sm">Voeg eerst extra's toe bij een andere verkoop in dit project.</p>
        </div>
      ) : availableCategories.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Check className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Alle beschikbare categorieën zijn al geïmporteerd.</p>
          <p className="text-sm">Categorieën met dezelfde naam worden niet dubbel geïmporteerd.</p>
        </div>
      ) : (
        <>
          <ScrollArea className="flex-1 min-h-0 pr-4">
            <div className="space-y-4 py-2">
              {otherSaleExtras.map(sale => {
                const saleCategories = sale.categories.filter(c => 
                  availableCategories.some(ac => ac.id === c.id)
                );
                
                if (saleCategories.length === 0) return null;

                const saleCategoryIds = saleCategories.map(c => c.id);
                const selectedInSale = saleCategoryIds.filter(id => selectedCategories.includes(id)).length;
                const isExpanded = expandedSales.includes(sale.saleId);

                return (
                  <Collapsible 
                    key={sale.saleId} 
                    open={isExpanded}
                    onOpenChange={() => handleToggleSaleExpanded(sale.saleId)}
                  >
                    <div className="border rounded-lg overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left">
                          <div className="flex items-center gap-3">
                            <Package className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{sale.propertyDescription}</p>
                              <p className="text-sm text-muted-foreground">
                                {saleCategories.length} categorie{saleCategories.length !== 1 ? 'ën' : ''} beschikbaar
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedInSale > 0 && (
                              <Badge variant="secondary">
                                {selectedInSale} geselecteerd
                              </Badge>
                            )}
                            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                        </button>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="border-t p-4 space-y-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectAllFromSale(saleCategoryIds);
                            }}
                          >
                            {saleCategoryIds.every(id => selectedCategories.includes(id)) 
                              ? 'Deselecteer alles' 
                              : 'Selecteer alles'}
                          </Button>
                          
                          <div className="space-y-2">
                            {saleCategories.map(category => (
                              <CategoryCheckboxRow
                                key={category.id}
                                category={category}
                                selected={selectedCategories.includes(category.id)}
                                onToggle={() => handleToggleCategory(category.id)}
                              />
                            ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between pt-4 border-t mt-4">
            <p className="text-sm text-muted-foreground">
              {totalSelected > 0 ? (
                <span className="flex items-center gap-1">
                  <Check className="h-4 w-4 text-green-600" />
                  {totalSelected} categorie{totalSelected !== 1 ? 'ën' : ''} geselecteerd
                </span>
              ) : (
                'Selecteer categorieën om te importeren'
              )}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Annuleren
              </Button>
              <Button 
                onClick={handleImport}
                disabled={totalSelected === 0 || importExtras.isPending}
              >
                {importExtras.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importeren...
                  </>
                ) : (
                  `Importeer ${totalSelected > 0 ? `(${totalSelected})` : ''}`
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </DialogContent>
  );
}

interface CategoryCheckboxRowProps {
  category: SaleExtraCategory;
  selected: boolean;
  onToggle: () => void;
}

function CategoryCheckboxRow({ 
  category, 
  selected, 
  onToggle 
}: CategoryCheckboxRowProps) {
  const optionCount = category.options?.length || 0;
  const attachmentCount = category.options?.reduce(
    (sum, opt) => sum + (opt.attachments?.length || 0), 
    0
  ) || 0;

  const totalPrice = category.options?.reduce(
    (sum, opt) => sum + (opt.price || 0), 
    0
  ) || 0;

  return (
    <div 
      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
        selected ? 'bg-primary/5 border-primary' : 'bg-background hover:bg-muted/50'
      }`}
      onClick={onToggle}
    >
      <Checkbox 
        checked={selected} 
        onCheckedChange={onToggle}
        onClick={(e) => e.stopPropagation()}
      />
      <Package className="h-5 w-5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{category.name}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {optionCount} optie{optionCount !== 1 ? 's' : ''}
          </span>
          {attachmentCount > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              {attachmentCount} bijlage{attachmentCount !== 1 ? 'n' : ''}
            </span>
          )}
          {totalPrice > 0 && (
            <span className="flex items-center gap-1">
              <Euro className="h-3 w-3" />
              tot €{totalPrice.toLocaleString('nl-NL')}
            </span>
          )}
        </div>
      </div>
      {category.is_optional_category && (
        <Badge variant="outline" className="shrink-0 text-xs">
          Optioneel
        </Badge>
      )}
    </div>
  );
}
