import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useCustomerTotalInvestment, TotalInvestmentData, TimelineGroup, TimelineItem, PurchaseCostItem } from "@/hooks/useCustomerTotalInvestment";
import { useUpdatePurchaseCostAmount } from "@/hooks/useUpdatePurchaseCostAmount";
import { EditPurchaseCostDialog } from "@/components/EditPurchaseCostDialog";
import { 
  Euro, 
  CheckCircle2, 
  Clock, 
  Info, 
  Gift, 
  Home,
  FileText,
  Package,
  ChevronDown,
  ChevronRight,
  Upload,
  Target,
  Pencil,
  Building2,
  ShoppingBag,
  FileCheck,
  ExternalLink,
  Receipt
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useState, memo, useCallback } from "react";
import { Link } from "react-router-dom";

interface TimelineItemRowProps {
  item: TimelineItem;
  isActive: boolean;
  saleId: string;
  purchaseCosts: PurchaseCostItem[];
}

const formatCurrencyLocal = (amount: number) => formatCurrency(amount, 0);

// Find the first unpaid item across all timeline groups
function findNextAction(timeline: TimelineGroup[]): { group: TimelineGroup; item: TimelineItem } | null {
  for (const group of timeline) {
    const unpaidItem = group.items.find(item => !item.is_paid);
    if (unpaidItem) {
      return { group, item: unpaidItem };
    }
  }
  return null;
}

// Determine status of each timeline group
function getTimelineStatus(timeline: TimelineGroup[]): Map<string, 'completed' | 'active' | 'future'> {
  const statusMap = new Map<string, 'completed' | 'active' | 'future'>();
  let foundActive = false;

  for (const group of timeline) {
    const isPaid = group.paidSubtotal === group.subtotal && group.items.length > 0;
    
    if (isPaid) {
      statusMap.set(group.moment, 'completed');
    } else if (!foundActive) {
      statusMap.set(group.moment, 'active');
      foundActive = true;
    } else {
      statusMap.set(group.moment, 'future');
    }
  }

  return statusMap;
}

// Next Action Card - prominent card showing the next payment/action
function NextActionCard({ nextAction }: { nextAction: { group: TimelineGroup; item: TimelineItem } }) {
  const { group, item } = nextAction;

  return (
    <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10 shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="default" className="bg-primary text-xs">Nu te betalen</Badge>
              <span className="text-xs text-muted-foreground">{group.momentLabel}</span>
            </div>
            <h3 className="font-semibold text-lg mb-1">{item.label}</h3>
            {item.due_date && (
              <p className="text-sm text-muted-foreground mb-3">
                Deadline: {format(new Date(item.due_date), 'd MMMM yyyy', { locale: nl })}
              </p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-primary">{formatCurrencyLocal(item.amount)}</span>
              <Button asChild size="sm" className="gap-2">
                <Link to="/dashboard/betalingen?tab=payments">
                  <Upload className="h-4 w-4" />
                  Upload betaalbewijs
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Completed moment - compact display
const CompletedMomentCard = memo(function CompletedMomentCard({ group, saleId, purchaseCosts }: { group: TimelineGroup; saleId: string; purchaseCosts: PurchaseCostItem[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full p-4 rounded-lg border border-green-200 bg-green-50/50 flex items-center justify-between hover:bg-green-100/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-green-500 rounded-full">
              <CheckCircle2 className="h-4 w-4 text-white" />
            </div>
            <span className="font-medium text-green-800">{group.momentLabel}</span>
            <Badge variant="default" className="bg-green-600 text-xs">Betaald</Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-green-700">{formatCurrencyLocal(group.subtotal)}</span>
            {isOpen ? <ChevronDown className="h-4 w-4 text-green-600" /> : <ChevronRight className="h-4 w-4 text-green-600" />}
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pt-2 pb-4">
        <div className="space-y-1 ml-8">
          {group.items.map((item, idx) => (
            <TimelineItemRow key={idx} item={item} isActive={false} saleId={saleId} purchaseCosts={purchaseCosts} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});

// Active moment - fully expanded and prominent
const ActiveMomentCard = memo(function ActiveMomentCard({ group, saleId, purchaseCosts }: { group: TimelineGroup; saleId: string; purchaseCosts: PurchaseCostItem[] }) {
  return (
    <Card className="border-primary/30 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-primary/20 rounded-full">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base">{group.momentLabel}</CardTitle>
            <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">Actief</Badge>
          </div>
          <span className="font-bold text-foreground">{formatCurrencyLocal(group.subtotal)}</span>
        </div>
        {group.paidSubtotal > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground ml-9">
            <CheckCircle2 className="h-3 w-3 text-green-600" />
            {formatCurrencyLocal(group.paidSubtotal)} betaald • {formatCurrencyLocal(group.subtotal - group.paidSubtotal)} openstaand
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {group.items.map((item, idx) => (
            <TimelineItemRow key={idx} item={item} isActive={true} saleId={saleId} purchaseCosts={purchaseCosts} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

// Future moment - collapsed by default
const FutureMomentCard = memo(function FutureMomentCard({ group, saleId, purchaseCosts }: { group: TimelineGroup; saleId: string; purchaseCosts: PurchaseCostItem[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full p-4 rounded-lg border border-border bg-muted/30 flex items-center justify-between hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-muted rounded-full">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="font-medium text-muted-foreground">{group.momentLabel}</span>
            <Badge variant="outline" className="text-xs">Straks</Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-muted-foreground">{formatCurrencyLocal(group.subtotal)}</span>
            {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pt-2 pb-4">
        <div className="space-y-1 ml-8">
          {group.items.map((item, idx) => (
            <TimelineItemRow key={idx} item={item} isActive={false} saleId={saleId} purchaseCosts={purchaseCosts} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});


// Individual timeline item row with edit dialog for purchase costs
const TimelineItemRow = memo(function TimelineItemRow({ item, isActive, saleId, purchaseCosts }: TimelineItemRowProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const updatePurchaseCost = useUpdatePurchaseCostAmount();

  // Find the full purchase cost data for this item
  const fullCostData = item.type === 'cost' && item.id 
    ? purchaseCosts.find(c => c.id === item.id) 
    : null;

  // Show badges only for purchase costs (not extras)
  const showEstimateBadge = item.type === 'cost' && !item.is_finalized;
  const showFinalizedBadge = false; // Never show - finalized costs should look like normal costs

  // Extra with tax display
  if (item.type === 'extra' && item.basePrice !== undefined) {
    const isGifted = item.isGifted;
    const viaDev = item.viaDeveloper;
    
    return (
      <div 
        className={cn(
          "text-sm py-2 px-3 rounded",
          isGifted && "bg-purple-50",
          !isGifted && item.is_paid && "bg-green-50",
          !isGifted && !item.is_paid && isActive && "bg-primary/5"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isGifted ? (
              <Gift className="h-4 w-4 text-purple-600" />
            ) : viaDev ? (
              <Building2 className="h-4 w-4 text-blue-600" />
            ) : (
              <ShoppingBag className="h-4 w-4 text-orange-600" />
            )}
            <span className={cn(
              isGifted && "text-purple-700",
              !isGifted && item.is_paid && "text-green-700"
            )}>
              {item.label}
              {isGifted && <span className="ml-1 text-xs">(cadeau)</span>}
            </span>
            {isGifted && (
              <Badge className="bg-purple-100 text-purple-700 text-xs py-0 h-4">
                Cadeau TIS
              </Badge>
            )}
          </div>
          <div className="text-right">
            {isGifted ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground line-through">
                  {formatCurrencyLocal(item.basePrice)}
                </span>
                <span className="font-medium text-green-600">€ 0</span>
              </div>
            ) : (
              <span className={cn(
                "font-medium",
                item.is_paid ? "text-green-600" : "text-foreground"
              )}>
                {formatCurrencyLocal(item.amount)}
              </span>
            )}
          </div>
        </div>
        {/* Tax breakdown for non-gifted extras */}
        {!isGifted && (item.btwAmount || item.ajdAmount) && (
          <div className="ml-6 mt-1 text-xs text-muted-foreground flex items-center gap-1">
            <span className="text-muted-foreground/60">└</span>
            <span>{formatCurrencyLocal(item.basePrice || 0)}</span>
            {item.btwAmount && item.btwAmount > 0 && (
              <span>+ {viaDev ? '10%' : '21%'} BTW {formatCurrencyLocal(item.btwAmount)}</span>
            )}
            {item.ajdAmount && item.ajdAmount > 0 && (
              <span>+ 1,5% AJD {formatCurrencyLocal(item.ajdAmount)}</span>
            )}
          </div>
        )}
      </div>
    );
  }

  // Quote item with tax display
  if (item.type === 'quote' && item.basePrice !== undefined) {
    const viaDev = item.viaDeveloper;
    
    return (
      <div 
        className={cn(
          "text-sm py-2 px-3 rounded",
          item.is_paid && "bg-green-50",
          !item.is_paid && isActive && "bg-amber-50/50"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-amber-600" />
            <span className={cn(
              item.is_paid && "text-green-700"
            )}>
              {item.label}
            </span>
            <Badge className="bg-amber-100 text-amber-700 text-xs py-0 h-4">
              Goedgekeurde offerte
            </Badge>
            {item.quoteUrl && (
              <a 
                href={item.quoteUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          <div className="text-right">
            <span className={cn(
              "font-medium",
              item.is_paid ? "text-green-600" : "text-foreground"
            )}>
              {formatCurrencyLocal(item.amount)}
            </span>
          </div>
        </div>
        {/* Tax breakdown for quotes */}
        {(item.btwAmount || item.ajdAmount) && (
          <div className="ml-6 mt-1 text-xs text-muted-foreground flex items-center gap-1">
            <span className="text-muted-foreground/60">└</span>
            <span>{formatCurrencyLocal(item.basePrice || 0)}</span>
            {item.btwAmount && item.btwAmount > 0 && (
              <span>+ {viaDev ? '10%' : '21%'} BTW {formatCurrencyLocal(item.btwAmount)}</span>
            )}
            {item.ajdAmount && item.ajdAmount > 0 && (
              <span>+ 1,5% AJD {formatCurrencyLocal(item.ajdAmount)}</span>
            )}
          </div>
        )}
      </div>
    );
  }

  // Default rendering for payments and costs
  return (
    <div 
      className={cn(
        "flex items-center justify-between text-sm py-2 px-3 rounded",
        item.is_paid && "bg-green-50",
        !item.is_paid && isActive && "bg-primary/5"
      )}
    >
      <div className="flex items-center gap-2">
        {item.is_paid ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : (
          <>
            {item.type === 'payment' && <Euro className="h-4 w-4 text-muted-foreground" />}
            {item.type === 'cost' && <FileText className="h-4 w-4 text-muted-foreground" />}
            {item.type === 'extra' && <Package className="h-4 w-4 text-muted-foreground" />}
            {item.type === 'quote' && <FileCheck className="h-4 w-4 text-amber-600" />}
          </>
        )}
        <span className={cn(
          item.is_paid && "text-green-700"
        )}>
          {item.label}
        </span>
        {item.due_date && (
          <span className={cn(
            "text-xs",
            item.is_paid ? "text-green-600" : "text-muted-foreground"
          )}>
            {format(new Date(item.due_date), 'd MMM yyyy', { locale: nl })}
          </span>
        )}
        {showEstimateBadge && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="text-xs py-0 h-4 border-amber-300 text-amber-700">Geschat</Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Dit bedrag is een schatting. Vul het werkelijke bedrag in na betaling.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {showFinalizedBadge && (
          <Badge variant="outline" className="text-xs py-0 h-4 border-green-300 text-green-700">Definitief</Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        {item.paymentProofUrl && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <a href={item.paymentProofUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                  <Receipt className="h-4 w-4" />
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>Bekijk betaalbewijs</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <span className={cn(
          "font-medium",
          item.is_paid ? "text-green-600" : "text-foreground"
        )}>
          {formatCurrencyLocal(item.amount)}
        </span>
        {item.is_editable && item.type === 'cost' && fullCostData && (
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-7 w-7 ml-1" 
                    onClick={() => setIsDialogOpen(true)}
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Bedrag en betaalbewijs bewerken</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <EditPurchaseCostDialog
              cost={{
                id: fullCostData.id,
                label: fullCostData.label,
                estimated_amount: fullCostData.estimated_amount,
                actual_amount: fullCostData.actual_amount,
                is_finalized: fullCostData.is_finalized,
                payment_proof_url: fullCostData.payment_proof_url,
              }}
              saleId={saleId}
              isOpen={isDialogOpen}
              onClose={() => setIsDialogOpen(false)}
              onUpdate={(data) => updatePurchaseCost.mutate(data)}
            />
          </>
        )}
      </div>
    </div>
  );
});

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-32" />
      <Skeleton className="h-64" />
    </div>
  );
}

export function TotalInvestmentDashboard() {
  const { data, isLoading, error } = useCustomerTotalInvestment();

  // Toon skeleton tijdens laden of als data nog niet beschikbaar is
  if (isLoading || (!error && !data)) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">
            Er ging iets mis bij het laden van je totale investering.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return <DashboardSkeleton />;
  }

  const progressPercentage = data.totals.grandTotal 
    ? (data.totals.totalPaid / data.totals.grandTotal) * 100 
    : 0;

  const hasEstimatedCosts = data.purchaseCosts.finalizedCount < data.purchaseCosts.totalCount;
  const nextAction = findNextAction(data.timeline);
  const timelineStatus = getTimelineStatus(data.timeline);

  return (
    <div className="space-y-6">
      {/* Property Header */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Home className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg">{data.projectName}</h2>
              {data.propertyDescription && (
                <p className="text-sm text-muted-foreground">{data.propertyDescription}</p>
              )}
            </div>
          </div>

          {/* Main Summary Cards - Row 1 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-background rounded-lg p-4 shadow-sm">
              <div className="text-xs text-muted-foreground mb-1">Aankoopprijs</div>
              <div className="text-xl font-bold">{formatCurrencyLocal(data.salePrice)}</div>
              <div className="text-xs text-muted-foreground">+ BTW {formatCurrencyLocal(data.vatOnSale)}</div>
            </div>

            <div className="bg-background rounded-lg p-4 shadow-sm">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                Bijkomende kosten
                {hasEstimatedCosts && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Inclusief geschatte bedragen die nog kunnen wijzigen</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <div className="text-xl font-bold">
                {formatCurrencyLocal(data.totals.purchaseCosts)}
                {hasEstimatedCosts && <span className="text-xs font-normal text-muted-foreground ml-1">*</span>}
              </div>
            </div>

            <div className="bg-background rounded-lg p-4 shadow-sm">
              <div className="text-xs text-muted-foreground mb-1">Extra's & Offertes</div>
              <div className="text-xl font-bold">{formatCurrencyLocal(data.extras.combinedTotalWithTax)}</div>
              {data.extras.quotesTotalWithTax > 0 ? (
                <div className="text-xs text-muted-foreground flex flex-col gap-0.5">
                  <span>Extra's: {formatCurrencyLocal(data.extras.totalWithTax)}</span>
                  <Link to="/dashboard/specificatie-akkoord" className="flex items-center gap-1 text-primary hover:underline">
                    <span>Offertes: {formatCurrencyLocal(data.extras.quotesTotalWithTax)}</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">incl. belastingen</div>
              )}
            </div>

            <div className="bg-primary text-primary-foreground rounded-lg p-4 shadow-sm">
              <div className="text-xs opacity-80 mb-1">Totale Investering</div>
              <div className="text-xl font-bold">{formatCurrencyLocal(data.totals.grandTotal)}</div>
            </div>
          </div>

          {/* Extra's Breakdown Cards - Row 2 */}
          {(data.extras.developerTotal > 0 || data.extras.externalTotal > 0 || data.extras.totalGifted > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Via Ontwikkelaar */}
              {data.extras.developerTotal > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Via ontwikkelaar</span>
                  </div>
                  <div className="text-lg font-bold text-blue-900">
                    {formatCurrencyLocal(data.extras.developerTotalWithTax)}
                  </div>
                  <div className="text-xs text-blue-700 space-y-0.5 mt-1">
                    <div>Basis: {formatCurrencyLocal(data.extras.developerTotal)}</div>
                    <div>+ 10% BTW: {formatCurrencyLocal(data.extras.developerBtw)}</div>
                    <div>+ 1,5% AJD: {formatCurrencyLocal(data.extras.developerAjd)}</div>
                  </div>
                </div>
              )}

              {/* Externe Extra's */}
              {data.extras.externalTotal > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingBag className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-900">Externe extra's</span>
                  </div>
                  <div className="text-lg font-bold text-orange-900">
                    {formatCurrencyLocal(data.extras.externalTotalWithTax)}
                  </div>
                  <div className="text-xs text-orange-700 space-y-0.5 mt-1">
                    <div>Basis: {formatCurrencyLocal(data.extras.externalTotal)}</div>
                    <div>+ 21% BTW: {formatCurrencyLocal(data.extras.externalBtw)}</div>
                  </div>
                </div>
              )}

              {/* Cadeau van TIS */}
              {data.extras.totalGifted > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">Cadeau van TIS</span>
                  </div>
                  <div className="text-lg font-bold text-purple-900">
                    {formatCurrencyLocal(data.extras.totalGifted)}
                  </div>
                  <div className="text-xs text-purple-700 mt-1">
                    Gratis voor jou
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Voortgang</span>
            <span className="text-sm text-muted-foreground">
              {formatCurrencyLocal(data.totals.totalPaid)} van {formatCurrencyLocal(data.totals.grandTotal)}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Betaald: {formatCurrencyLocal(data.totals.totalPaid)}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Openstaand: {formatCurrencyLocal(data.totals.totalRemaining)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Next Action Card - Only show if there's something to pay */}
      {nextAction && (
        <NextActionCard nextAction={nextAction} />
      )}

      {/* Focus-First Payment Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Wanneer betaal ik wat?</CardTitle>
          <CardDescription>
            Overzicht van alle kosten per betaalmoment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.timeline.map((group) => {
            const status = timelineStatus.get(group.moment);
            
            if (status === 'completed') {
              return <CompletedMomentCard key={group.moment} group={group} saleId={data.saleId} purchaseCosts={data.purchaseCosts.items} />;
            } else if (status === 'active') {
              return <ActiveMomentCard key={group.moment} group={group} saleId={data.saleId} purchaseCosts={data.purchaseCosts.items} />;
            } else {
              return <FutureMomentCard key={group.moment} group={group} saleId={data.saleId} purchaseCosts={data.purchaseCosts.items} />;
            }
          })}

          {hasEstimatedCosts && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Sommige kosten zijn nog schattingen en kunnen wijzigen.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Costs Breakdown */}
      <Accordion type="single" collapsible>
        <AccordionItem value="costs">
          <AccordionTrigger className="text-sm font-medium">
            Gedetailleerde kostenspecificatie bekijken
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              {/* Purchase Costs */}
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Bijkomende kosten ({data.purchaseCosts.totalCount} posten)
                </h4>
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  {data.purchaseCosts.items.map((cost) => (
                    <div key={cost.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span>{cost.label}</span>
                        {cost.tooltip && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-3 w-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>{cost.tooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {cost.is_optional && (
                          <Badge variant="outline" className="text-xs">Optioneel</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {cost.is_finalized ? (
                          <span className="font-medium text-green-600">
                            {formatCurrencyLocal(cost.actual_amount || cost.estimated_amount)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {formatCurrencyLocal(cost.estimated_amount)} *
                          </span>
                        )}
                        {cost.is_paid && (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2 flex justify-between font-medium">
                    <span>Totaal bijkomende kosten</span>
                    <span>{formatCurrencyLocal(data.totals.purchaseCosts)}</span>
                  </div>
                </div>
              </div>

              {/* Extras */}
              {data.extras.items.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Extra's
                  </h4>
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    {data.extras.items.map((extra) => (
                      <div key={extra.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span>{extra.name}</span>
                          {extra.isGifted && (
                            <Badge className="bg-purple-100 text-purple-700 text-xs">
                              <Gift className="h-2.5 w-2.5 mr-0.5" />
                              Cadeau
                            </Badge>
                          )}
                          {extra.isIncluded && (
                            <Badge variant="secondary" className="text-xs">Inbegrepen</Badge>
                          )}
                        </div>
                        <span className={cn(
                          "font-medium",
                          extra.isGifted && "text-purple-600 line-through",
                          extra.isIncluded && "text-green-600"
                        )}>
                          {extra.isIncluded ? 'Inbegrepen' : formatCurrencyLocal(extra.price)}
                        </span>
                      </div>
                    ))}
                    {data.extras.totalToPay > 0 && (
                      <>
                        <div className="border-t pt-2 mt-2 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Subtotaal extra's</span>
                            <span>{formatCurrencyLocal(data.extras.totalToPay)}</span>
                          </div>
                          {data.extras.developerTotal > 0 && (
                            <>
                              <div className="flex justify-between text-sm text-muted-foreground">
                                <span className="text-xs">Via ontwikkelaar: BTW (10%)</span>
                                <span>{formatCurrencyLocal(data.extras.developerBtw)}</span>
                              </div>
                              <div className="flex justify-between text-sm text-muted-foreground">
                                <span className="text-xs">Via ontwikkelaar: AJD (1,5%)</span>
                                <span>{formatCurrencyLocal(data.extras.developerAjd)}</span>
                              </div>
                            </>
                          )}
                          {data.extras.externalTotal > 0 && (
                            <div className="flex justify-between text-sm text-muted-foreground">
                              <span className="text-xs">Extern: BTW (21%)</span>
                              <span>{formatCurrencyLocal(data.extras.externalBtw)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-medium border-t pt-1">
                            <span>Totaal extra's incl. belastingen</span>
                            <span>{formatCurrencyLocal(data.extras.totalWithTax)}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Legend */}
              <div className="text-xs text-muted-foreground flex items-center gap-4">
                <span>* = geschat bedrag</span>
                <span className="text-green-600">Groen = definitief/betaald</span>
                <span className="text-purple-600">Paars = cadeau van Top Immo Spain</span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
