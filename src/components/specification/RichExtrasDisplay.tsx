import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Gift, 
  Check, 
  ExternalLink, 
  FileText, 
  Building2, 
  ShoppingBag,
  Package,
  CircleDot
} from "lucide-react";
import type { SaleExtraCategory } from "@/hooks/useSaleExtras";

interface RichExtrasDisplayProps {
  categories: SaleExtraCategory[];
}

function formatPrice(price: number): string {
  return price.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function calculateTax(price: number, viaDeveloper: boolean) {
  if (viaDeveloper) {
    const btw = price * 0.10;
    const ajd = price * 0.015;
    return { btw, ajd, total: price + btw + ajd };
  } else {
    const btw = price * 0.21;
    return { btw, ajd: 0, total: price + btw };
  }
}

export function RichExtrasDisplay({ categories }: RichExtrasDisplayProps) {
  if (!categories || categories.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-4 text-center">
        Er zijn nog geen extra's geconfigureerd voor jouw woning.
      </p>
    );
  }

  // Calculate totals
  const totals = categories.reduce((acc, category) => {
    if (category.is_included) return acc;
    
    const selectedOption = category.options?.find(o => o.id === category.chosen_option_id);
    if (!selectedOption?.price) return acc;

    if (category.gifted_by_tis) {
      acc.giftedValue += selectedOption.price;
    } else {
      const tax = calculateTax(selectedOption.price, category.via_developer ?? true);
      if (category.via_developer) {
        acc.developerTotal += tax.total;
      } else {
        acc.externalTotal += tax.total;
      }
    }
    return acc;
  }, { developerTotal: 0, externalTotal: 0, giftedValue: 0 });

  return (
    <div className="space-y-4">
      <Accordion type="multiple" className="space-y-2">
        {categories.filter(c => c.customer_visible).map((category) => {
          const selectedOption = category.options?.find(o => o.id === category.chosen_option_id);
          const isIncluded = category.is_included;
          const isGifted = category.gifted_by_tis;
          const viaDeveloper = category.via_developer ?? true;

          return (
            <AccordionItem 
              key={category.id} 
              value={category.id}
              className="border rounded-lg px-4"
            >
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    {isGifted ? (
                      <Gift className="h-5 w-5 text-purple-600" />
                    ) : isIncluded ? (
                      <Check className="h-5 w-5 text-green-600" />
                    ) : viaDeveloper ? (
                      <Building2 className="h-5 w-5 text-blue-600" />
                    ) : (
                      <ShoppingBag className="h-5 w-5 text-orange-600" />
                    )}
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isIncluded ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Inbegrepen
                      </Badge>
                    ) : isGifted ? (
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                        <Gift className="h-3 w-3 mr-1" />
                        Cadeau TIS
                      </Badge>
                    ) : selectedOption ? (
                      <Badge variant="secondary" className={viaDeveloper ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800"}>
                        {viaDeveloper ? "Via ontwikkelaar" : "Extern"}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Geen selectie</Badge>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4">
                  {/* Category description */}
                  {category.description && (
                    <p className="text-sm text-muted-foreground">
                      {category.description}
                    </p>
                  )}

                  {/* All options */}
                  {category.options && category.options.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Beschikbare opties:</p>
                      {category.options.map((option) => {
                        const isSelected = option.id === category.chosen_option_id;
                        const tax = option.price ? calculateTax(option.price, viaDeveloper) : null;

                        return (
                          <div 
                            key={option.id}
                            className={`p-3 rounded-lg border ${
                              isSelected 
                                ? isGifted 
                                  ? 'border-purple-200 bg-purple-50/50' 
                                  : 'border-blue-200 bg-blue-50/50'
                                : 'border-muted'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-2">
                                {isSelected ? (
                                  <Check className={`h-4 w-4 mt-0.5 ${isGifted ? 'text-purple-600' : 'text-blue-600'}`} />
                                ) : (
                                  <CircleDot className="h-4 w-4 mt-0.5 text-muted-foreground/40" />
                                )}
                                <div>
                                  <p className={`font-medium ${isSelected ? '' : 'text-muted-foreground'}`}>
                                    {option.name}
                                  </p>
                                  {option.description && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {option.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Price display */}
                              {option.price && option.price > 0 && (
                                <div className="text-right shrink-0 ml-4">
                                  {isGifted && isSelected ? (
                                    <>
                                      <span className="line-through text-muted-foreground text-sm">
                                        €{formatPrice(option.price)}
                                      </span>
                                      <span className="ml-2 font-bold text-purple-600">€0</span>
                                    </>
                                  ) : (
                                    <>
                                      <p className="font-medium">€{formatPrice(option.price)}</p>
                                      {tax && !isIncluded && (
                                        <p className="text-xs text-muted-foreground">
                                          {viaDeveloper 
                                            ? `+ 10% BTW + 1,5% AJD = €${formatPrice(tax.total)}`
                                            : `+ 21% BTW = €${formatPrice(tax.total)}`
                                          }
                                        </p>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Attachments */}
                            {option.attachments && option.attachments.length > 0 && (
                              <div className="mt-3 pt-3 border-t space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Bijlagen:</p>
                                {option.attachments.map((attachment) => (
                                  <a
                                    key={attachment.id}
                                    href={attachment.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                    {attachment.file_name}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Admin notes for customer */}
                  {category.notes && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Opmerking:</span> {category.notes}
                      </p>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Totals summary */}
      {(totals.developerTotal > 0 || totals.externalTotal > 0 || totals.giftedValue > 0) && (
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Kostenoverzicht Extra's</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {totals.developerTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  Via ontwikkelaar (incl. 10% BTW + 1,5% AJD)
                </span>
                <span className="font-medium">€{formatPrice(totals.developerTotal)}</span>
              </div>
            )}
            {totals.externalTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-orange-600" />
                  Externe aankoop (incl. 21% BTW)
                </span>
                <span className="font-medium">€{formatPrice(totals.externalTotal)}</span>
              </div>
            )}
            {totals.giftedValue > 0 && (
              <div className="flex justify-between">
                <span className="text-purple-700 flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  Cadeau van Top Immo Spain
                </span>
                <span className="text-purple-700 font-medium">
                  <span className="line-through text-muted-foreground mr-2">€{formatPrice(totals.giftedValue)}</span>
                  €0
                </span>
              </div>
            )}
            <div className="pt-2 border-t flex justify-between font-semibold">
              <span>Totaal extra's</span>
              <span>€{formatPrice(totals.developerTotal + totals.externalTotal)}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
