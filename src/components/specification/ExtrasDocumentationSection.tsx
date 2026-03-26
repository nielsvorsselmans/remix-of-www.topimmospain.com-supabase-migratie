import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Package, Gift, Clock, MessageSquare, Check, UserCheck, User, Building2, FileText, ExternalLink, CheckCircle2 } from "lucide-react";
import { SaleExtraCategory } from "@/hooks/useSaleExtras";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { SimplifiedExtraChoice } from "./SimplifiedExtraChoice";
import { GiftExtraChoice } from "./GiftExtraChoice";
import { formatCurrency } from "@/lib/utils";
interface ExtrasDocumentationSectionProps {
  categories: SaleExtraCategory[];
  saleId: string;
  userName?: string;
}

export function ExtrasDocumentationSection({ categories, saleId }: ExtrasDocumentationSectionProps) {
  // Filter categories that are visible to customer
  const visibleCategories = categories.filter(cat => cat.customer_visible);
  
  if (visibleCategories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">Extra's & Opties</CardTitle>
              <CardDescription>
                Kies en bekijk informatie over extra's en upgrades
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-6">
            Er zijn nog geen extra's of opties beschikbaar.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadges = (category: SaleExtraCategory) => {
    const badges: React.ReactNode[] = [];
    
    // Main status badge
    if (category.is_included) {
      badges.push(
        <Badge key="included" variant="outline" className="bg-green-50 text-green-700 border-green-200">Inbegrepen</Badge>
      );
    } else if (category.gifted_by_tis) {
      if (category.customer_choice_type === 'gift_accepted') {
        badges.push(
          <Badge key="gifted_accepted" variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Cadeau geaccepteerd
          </Badge>
        );
      } else {
        badges.push(
          <Badge key="gifted" variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <Gift className="h-3 w-3 mr-1" />
            Cadeau van TIS
          </Badge>
        );
      }
    } else if (category.customer_choice_type === 'via_tis') {
      badges.push(
        <Badge key="via_tis" variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <Check className="h-3 w-3 mr-1" />
          Via TIS
        </Badge>
      );
    } else if (category.customer_choice_type === 'self_arranged') {
      badges.push(
        <Badge key="self" variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Check className="h-3 w-3 mr-1" />
          Zelf regelen
        </Badge>
      );
    } else if (category.customer_choice_type === 'question_pending') {
      if (category.admin_answer) {
        badges.push(
          <Badge key="answer" variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <MessageSquare className="h-3 w-3 mr-1" />
            Antwoord ontvangen
          </Badge>
        );
      } else {
        badges.push(
          <Badge key="question" variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="h-3 w-3 mr-1" />
            Vraag gesteld
          </Badge>
        );
      }
    } else {
      badges.push(
        <Badge key="pending" variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          <Clock className="h-3 w-3 mr-1" />
          Te beslissen
        </Badge>
      );
    }

    // Via developer badge with tooltip
    if (category.via_developer && !category.is_included && !category.gifted_by_tis) {
      badges.push(
        <TooltipProvider key="via_dev">
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 cursor-help">
                <Building2 className="h-3 w-3 mr-1" />
                Via ontwikkelaar
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Loopt via de ontwikkelaar met 10% BTW en 1,5% AJD</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return badges;
  };

  // Helper to show who made the choice and when
  const getChoiceInfo = (category: SaleExtraCategory) => {
    if (!category.customer_choice_type) return null;
    
    const choiceTime = category.decided_at 
      ? format(new Date(category.decided_at), "d MMM yyyy 'om' HH:mm", { locale: nl })
      : null;

    if (category.customer_choice_type === 'via_tis') {
      return (
        <div className="flex items-center gap-2 text-xs text-green-600 mt-2">
          <UserCheck className="h-3 w-3" />
          <span>
            Gekozen: Via Top Immo Spain
            {choiceTime && <span className="text-muted-foreground ml-1">({choiceTime})</span>}
          </span>
        </div>
      );
    }
    if (category.customer_choice_type === 'self_arranged') {
      return (
        <div className="flex items-center gap-2 text-xs text-blue-600 mt-2">
          <User className="h-3 w-3" />
          <span>
            Gekozen: Zelf regelen
            {choiceTime && <span className="text-muted-foreground ml-1">({choiceTime})</span>}
          </span>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Extra's & Opties</CardTitle>
            <CardDescription>
              Vergelijk en kies extra's voor je woning
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full" defaultValue={visibleCategories.filter(c => !c.is_included && !c.gifted_by_tis && !c.customer_choice_type).map(c => c.id)}>
          {visibleCategories.map((category) => {
            const optionCount = category.options?.length || 0;
            
            return (
              <AccordionItem key={category.id} value={category.id}>
              <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <span className="font-medium">{category.name}</span>
                        {optionCount > 0 && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({optionCount} optie{optionCount !== 1 ? 's' : ''})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadges(category)}
                      {/* Show gift value with strikethrough in collapsed state */}
                      {category.gifted_by_tis && category.options && category.options.length > 0 && category.options[0].price > 0 && (
                        <span className="text-sm">
                          <span className="line-through text-muted-foreground">{formatCurrency(category.options[0].price, 0)}</span>
                          <span className="ml-1 font-medium text-purple-700">€0</span>
                        </span>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    {/* Description */}
                    {category.description && (
                      <p className="text-sm text-muted-foreground">
                        {category.description}
                      </p>
                    )}

                    {/* Admin notes if any */}
                    {category.notes && (
                      <div className="p-3 rounded-md bg-muted/50 border">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Opmerking van Top Immo Spain</p>
                        <p className="text-sm">{category.notes}</p>
                      </div>
                    )}

                    {/* Simplified choice component for non-included, non-gifted categories */}
                    {!category.is_included && !category.gifted_by_tis && (
                      <SimplifiedExtraChoice category={category} saleId={saleId} />
                    )}

                    {/* Gift choice component for gifted categories */}
                    {category.gifted_by_tis && (
                      <GiftExtraChoice category={category} saleId={saleId} />
                    )}

                    {/* Show choice info when decision has been made */}
                    {getChoiceInfo(category)}

                    {/* Message for included categories only */}
                    {category.is_included && (
                      <>
                        <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                          <p className="text-sm text-green-800">
                            Deze extra is standaard inbegrepen bij je woning.
                          </p>
                        </div>

                        {/* Attachments for included categories */}
                        {category.options && category.options.length > 0 && 
                         category.options[0].attachments && 
                         category.options[0].attachments.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Bijlagen:</p>
                            <div className="flex flex-wrap gap-2">
                              {category.options[0].attachments.map((att) => (
                                <a
                                  key={att.id}
                                  href={att.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-md bg-muted hover:bg-muted/80 transition-colors"
                                >
                                  <FileText className="h-4 w-4 text-red-500" />
                                  <span className="max-w-[150px] truncate">{att.title || att.file_name}</span>
                                  <ExternalLink className="h-3 w-3 opacity-50" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
