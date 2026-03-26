import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Check, Star, FileText, ExternalLink, Loader2, ImageIcon } from "lucide-react";
import { SaleExtraCategory, SaleExtraOption, useSelectExtraOption, customerCanSelectOption } from "@/hooks/useSaleExtras";

interface OptionComparisonCardsProps {
  category: SaleExtraCategory;
  saleId: string;
}

export function OptionComparisonCards({ category, saleId }: OptionComparisonCardsProps) {
  const selectOption = useSelectExtraOption();
  const [pendingOption, setPendingOption] = useState<SaleExtraOption | null>(null);
  
  const options = category.options || [];
  const canSelect = customerCanSelectOption(category);
  
  if (options.length === 0) {
    return null;
  }

  const calculateTotalPrice = (price: number | null) => {
    if (!price) return null;
    if (category.via_developer) {
      // 10% BTW + 1.5% AJD
      return price * 1.115;
    }
    // 21% BTW
    return price * 1.21;
  };

  const formatPrice = (price: number | null) => {
    if (!price) return "Prijs op aanvraag";
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price);
  };

  const handleSelectOption = async () => {
    if (!pendingOption) return;
    await selectOption.mutateAsync({
      category_id: category.id,
      sale_id: saleId,
      option_id: pendingOption.id,
    });
    setPendingOption(null);
  };

  const getHighlights = (option: SaleExtraOption): string[] => {
    if (Array.isArray(option.highlights) && option.highlights.length > 0) {
      return option.highlights as string[];
    }
    return [];
  };

  return (
    <>
      <div className="space-y-4">
        {canSelect && (
          <p className="text-sm text-muted-foreground">
            Kies één van de volgende opties:
          </p>
        )}
        
        <div className={`grid gap-4 ${options.length === 1 ? 'grid-cols-1' : options.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
          {options.map((option) => {
            const isChosen = category.chosen_option_id === option.id;
            const isRecommended = option.is_recommended;
            const highlights = getHighlights(option);
            const totalPrice = calculateTotalPrice(option.price);
            
            // Find primary PDF attachment for image fallback
            const primaryPdfAttachment = option.attachments?.find(att => 
              att.file_name?.toLowerCase().endsWith('.pdf')
            );
            const otherAttachments = option.attachments?.filter(att => 
              primaryPdfAttachment ? att.id !== primaryPdfAttachment.id : true
            ) || [];
            const attachmentCount = otherAttachments.length;
            
            return (
              <Card 
                key={option.id} 
                className={`relative transition-all ${
                  isChosen 
                    ? 'ring-2 ring-primary border-primary bg-primary/5' 
                    : 'hover:border-muted-foreground/30'
                }`}
              >
                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                  {isRecommended && (
                    <Badge className="bg-amber-500 text-white border-0 shadow-sm">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      Aanbevolen
                    </Badge>
                  )}
                  {isChosen && (
                    <Badge className="bg-primary text-primary-foreground border-0 shadow-sm">
                      <Check className="h-3 w-3 mr-1" />
                      Jouw keuze
                    </Badge>
                  )}
                </div>

                {/* Image or PDF Preview */}
                {option.image_url ? (
                  <div className="aspect-video bg-muted rounded-t-lg overflow-hidden">
                    <img 
                      src={option.image_url} 
                      alt={option.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : primaryPdfAttachment ? (
                  <a 
                    href={primaryPdfAttachment.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-video bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 rounded-t-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:from-red-100 hover:to-red-200 dark:hover:from-red-900/40 dark:hover:to-red-800/30 transition-colors group"
                  >
                    <FileText className="h-12 w-12 text-red-500 group-hover:scale-110 transition-transform" />
                    <div className="text-center px-4">
                      <p className="text-sm font-medium text-red-700 dark:text-red-400 truncate max-w-[180px]">
                        {primaryPdfAttachment.title || primaryPdfAttachment.file_name}
                      </p>
                      <p className="text-xs text-red-500/70 dark:text-red-400/60">Klik om te openen</p>
                    </div>
                  </a>
                ) : (
                  <div className="aspect-video bg-muted/50 rounded-t-lg flex items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
                  </div>
                )}

                <CardHeader className="pb-2 pt-4">
                  <h4 className="font-semibold text-base">{option.name}</h4>
                  {option.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {option.description}
                    </p>
                  )}
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  {/* Highlights */}
                  {highlights.length > 0 && (
                    <ul className="space-y-1.5">
                      {highlights.map((highlight, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Detailed specs */}
                  {option.detailed_specs && (
                    <p className="text-xs text-muted-foreground border-t pt-3">
                      {option.detailed_specs}
                    </p>
                  )}

                  {/* Other Attachments (excluding primary PDF shown as image) */}
                  {attachmentCount > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {otherAttachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 transition-colors"
                        >
                          <FileText className="h-3 w-3" />
                          <span className="max-w-[100px] truncate">{att.title || att.file_name}</span>
                          <ExternalLink className="h-2.5 w-2.5 opacity-50" />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Price */}
                  <div className="pt-2 border-t">
                    <div className="text-lg font-bold">{formatPrice(option.price)}</div>
                    {option.price && totalPrice && (
                      <p className="text-xs text-muted-foreground">
                        {category.via_developer 
                          ? `+ 10% BTW + 1,5% AJD = ${formatPrice(totalPrice)}`
                          : `+ 21% BTW = ${formatPrice(totalPrice)}`
                        }
                      </p>
                    )}
                  </div>

                  {/* Select button */}
                  {canSelect && !isChosen && (
                    <Button
                      onClick={() => setPendingOption(option)}
                      variant="outline"
                      className="w-full"
                    >
                      Deze optie kiezen
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {canSelect && (
          <p className="text-xs text-muted-foreground">
            ⚠️ Na het kiezen van een optie kun je nog apart akkoord geven.
          </p>
        )}
      </div>

      {/* Selection confirmation dialog */}
      <AlertDialog open={!!pendingOption} onOpenChange={(open) => !open && setPendingOption(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bevestig je keuze</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Je staat op het punt de volgende optie te kiezen voor <strong>{category.name}</strong>:
              </p>
              {pendingOption && (
                <div className="p-3 rounded-lg bg-muted border">
                  <p className="font-medium">{pendingOption.name}</p>
                  {pendingOption.price && (
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(pendingOption.price)} + belastingen = {formatPrice(calculateTotalPrice(pendingOption.price))}
                    </p>
                  )}
                </div>
              )}
              <p className="text-sm">
                Na het kiezen kun je nog apart akkoord geven op je keuze.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={selectOption.isPending}>Annuleren</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSelectOption}
              disabled={selectOption.isPending}
            >
              {selectOption.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Ja, deze kiezen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}