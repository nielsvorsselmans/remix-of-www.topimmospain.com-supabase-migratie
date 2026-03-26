import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  useSalePurchaseCosts, 
  useGeneratePurchaseCosts, 
  useUpdatePurchaseCost,
  useRecalculatePurchaseCosts,
  useDeletePurchaseCost,
  SalePurchaseCost,
} from "@/hooks/useSalePurchaseCosts";
import { 
  RefreshCw, 
  Plus, 
  Info, 
  CheckCircle2, 
  Clock,
  Trash2,
  Euro,
  Calculator
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface SalePurchaseCostsManagerProps {
  saleId: string;
  salePrice: number;
}

const MOMENT_LABELS: Record<string, string> = {
  'vooraf': 'Vooraf',
  'bij_contract': 'Bij Contract',
  'bij_akte': 'Bij Akte',
  'bij_oplevering': 'Bij Oplevering',
  'na_akte': 'Na Akte',
  'na_oplevering': 'Na Oplevering',
};

const formatCurrencyLocal = (amount: number) => formatCurrency(amount, 0);

function MobileCostCard({ cost, onUpdate, onDelete }: {
  cost: SalePurchaseCost;
  onUpdate: (id: string, updates: Partial<SalePurchaseCost>) => void;
  onDelete: (id: string) => void;
}) {
  const [actualAmount, setActualAmount] = useState<string>(
    cost.actual_amount?.toString() || ''
  );

  const handleActualAmountBlur = () => {
    const parsed = parseFloat(actualAmount);
    if (!isNaN(parsed) && parsed !== cost.actual_amount) {
      onUpdate(cost.id, { actual_amount: parsed });
    }
  };

  const displayAmount = cost.is_finalized && cost.actual_amount 
    ? cost.actual_amount 
    : cost.estimated_amount;

  return (
    <Card className={cn(cost.is_optional && "opacity-70", cost.is_paid && "bg-green-50")}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{cost.label}</span>
              {cost.is_optional && <Badge variant="outline" className="text-xs">Optioneel</Badge>}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {MOMENT_LABELS[cost.due_moment] || cost.due_moment}
              {cost.percentage && ` • ${cost.percentage}%`}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => onDelete(cost.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Geschat</span>
            <div className={cn(cost.is_finalized && "line-through text-muted-foreground")}>
              {formatCurrencyLocal(cost.estimated_amount)}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Bedrag</span>
            <div className={cn("font-medium", cost.is_finalized ? "text-green-600" : "text-muted-foreground")}>
              {formatCurrencyLocal(displayAmount)}{!cost.is_finalized && ' *'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Input
            type="number"
            value={actualAmount}
            onChange={(e) => setActualAmount(e.target.value)}
            onBlur={handleActualAmountBlur}
            placeholder="Werkelijk"
            className="h-8 text-sm flex-1"
          />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs">
              <Checkbox checked={cost.is_finalized} onCheckedChange={(c) => onUpdate(cost.id, { is_finalized: !!c })} />
              Def.
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <Checkbox checked={cost.is_paid} onCheckedChange={(c) => onUpdate(cost.id, { is_paid: !!c, paid_at: c ? new Date().toISOString() : null })} />
              Betaald
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CostRow({ cost, onUpdate, onDelete }: {
  cost: SalePurchaseCost;
  onUpdate: (id: string, updates: Partial<SalePurchaseCost>) => void;
  onDelete: (id: string) => void;
}) {
  const [actualAmount, setActualAmount] = useState<string>(
    cost.actual_amount?.toString() || ''
  );

  const handleActualAmountBlur = () => {
    const parsed = parseFloat(actualAmount);
    if (!isNaN(parsed) && parsed !== cost.actual_amount) {
      onUpdate(cost.id, { actual_amount: parsed });
    }
  };

  const handleFinalizeToggle = (checked: boolean) => {
    onUpdate(cost.id, { 
      is_finalized: checked,
      actual_amount: checked && actualAmount ? parseFloat(actualAmount) : cost.actual_amount,
    });
  };

  const handlePaidToggle = (checked: boolean) => {
    onUpdate(cost.id, { 
      is_paid: checked,
      paid_at: checked ? new Date().toISOString() : null,
    });
  };

  const displayAmount = cost.is_finalized && cost.actual_amount 
    ? cost.actual_amount 
    : cost.estimated_amount;

  return (
    <TableRow className={cn(
      cost.is_optional && "opacity-70",
      cost.is_paid && "bg-green-50"
    )}>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="font-medium">{cost.label}</span>
          {cost.tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
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
        <div className="text-xs text-muted-foreground mt-1">
          {MOMENT_LABELS[cost.due_moment] || cost.due_moment}
          {cost.percentage && ` • ${cost.percentage}%`}
        </div>
      </TableCell>

      <TableCell className="text-right">
        <span className={cn(
          "text-sm",
          cost.is_finalized && "line-through text-muted-foreground"
        )}>
          {formatCurrencyLocal(cost.estimated_amount)}
        </span>
      </TableCell>

      <TableCell>
        <Input
          type="number"
          value={actualAmount}
          onChange={(e) => setActualAmount(e.target.value)}
          onBlur={handleActualAmountBlur}
          placeholder="Werkelijk"
          className="w-28 h-8 text-sm"
        />
      </TableCell>

      <TableCell className="text-center">
        <Checkbox
          checked={cost.is_finalized}
          onCheckedChange={handleFinalizeToggle}
        />
      </TableCell>

      <TableCell className="text-center">
        <Checkbox
          checked={cost.is_paid}
          onCheckedChange={handlePaidToggle}
        />
      </TableCell>

      <TableCell className="text-right font-medium">
        {cost.is_finalized ? (
          <span className="text-green-600">{formatCurrencyLocal(displayAmount)}</span>
        ) : (
          <span className="text-muted-foreground">{formatCurrencyLocal(displayAmount)} *</span>
        )}
      </TableCell>

      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(cost.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function SalePurchaseCostsManager({ saleId, salePrice }: SalePurchaseCostsManagerProps) {
  const { data: costs, isLoading } = useSalePurchaseCosts(saleId);
  const generateMutation = useGeneratePurchaseCosts();
  const updateMutation = useUpdatePurchaseCost();
  const recalculateMutation = useRecalculatePurchaseCosts();
  const deleteMutation = useDeletePurchaseCost();

  const hasCosts = costs && costs.length > 0;

  const handleGenerate = () => {
    generateMutation.mutate({ saleId, salePrice });
  };

  const handleRecalculate = () => {
    recalculateMutation.mutate({ saleId, salePrice });
  };

  const handleUpdate = (id: string, updates: Partial<SalePurchaseCost>) => {
    updateMutation.mutate({ id, updates });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  // Calculate totals - separate BTW from other costs (with fallback to 10% if no BTW cost exists)
  const btwCost = costs?.find(c => c.cost_type === 'btw');
  const btwAmount = btwCost 
    ? (btwCost.is_finalized ? (btwCost.actual_amount || btwCost.estimated_amount) : btwCost.estimated_amount)
    : salePrice * 0.10;
  
  const otherCosts = costs?.filter(c => c.cost_type !== 'btw') || [];
  const totalOtherCosts = otherCosts.reduce((sum, c) => 
    sum + (c.is_finalized ? (c.actual_amount || c.estimated_amount) : c.estimated_amount), 0);
  
  const totalDisplay = btwAmount + totalOtherCosts;
  const totalFinalized = costs?.filter(c => c.is_finalized)
    .reduce((sum, c) => sum + (c.actual_amount || c.estimated_amount), 0) || 0;
  const finalizedCount = costs?.filter(c => c.is_finalized).length || 0;
  const paidCount = costs?.filter(c => c.is_paid).length || 0;
  const percentageOfPrice = salePrice ? ((totalOtherCosts / salePrice) * 100).toFixed(1) : '0';

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Aankoopkosten
          </CardTitle>
          <CardDescription>
            Bijkomende kosten bij de aankoop van de woning
          </CardDescription>
        </div>

        <div className="flex gap-2">
          {hasCosts && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRecalculate}
              disabled={recalculateMutation.isPending}
            >
              <RefreshCw className={cn(
                "h-4 w-4 mr-1",
                recalculateMutation.isPending && "animate-spin"
              )} />
              Herbereken
            </Button>
          )}
          {!hasCosts && (
            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-1" />
              Genereer kosten
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {!hasCosts ? (
          <div className="text-center py-8">
            <Euro className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">Geen aankoopkosten geconfigureerd</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Klik op "Genereer kosten" om de standaard aankoopkosten toe te voegen<br />
              op basis van de aankoopprijs van {formatCurrencyLocal(salePrice)}.
            </p>
            <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              Genereer standaard kosten
            </Button>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Aankoopprijs</div>
                  <div className="text-xl font-bold">{formatCurrencyLocal(salePrice)}</div>
                </CardContent>
              </Card>
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">BTW (10%)</div>
                  <div className="text-xl font-bold">{formatCurrencyLocal(btwAmount)}</div>
                </CardContent>
              </Card>
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Bijkomende kosten</div>
                  <div className="text-xl font-bold">{formatCurrencyLocal(totalOtherCosts)}</div>
                  <div className="text-xs text-muted-foreground">{percentageOfPrice}% van prijs</div>
                </CardContent>
              </Card>
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    Definitief
                  </div>
                  <div className="text-xl font-bold text-green-600">{formatCurrencyLocal(totalFinalized)}</div>
                  <div className="text-xs text-muted-foreground">{finalizedCount} van {costs?.length} bevestigd</div>
                </CardContent>
              </Card>
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Status
                  </div>
                  <div className="text-xl font-bold">{paidCount} / {costs?.length}</div>
                  <div className="text-xs text-muted-foreground">betaald</div>
                </CardContent>
              </Card>
            </div>

            {/* Costs Table - Desktop */}
            <div className="border rounded-lg hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kostenpost</TableHead>
                    <TableHead className="text-right">Geschat</TableHead>
                    <TableHead>Werkelijk</TableHead>
                    <TableHead className="text-center">Definitief</TableHead>
                    <TableHead className="text-center">Betaald</TableHead>
                    <TableHead className="text-right">Bedrag</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costs?.map((cost) => (
                    <CostRow
                      key={cost.id}
                      cost={cost}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Costs Cards - Mobile */}
            <div className="space-y-3 md:hidden">
              {costs?.map((cost) => (
                <MobileCostCard
                  key={cost.id}
                  cost={cost}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
              <span>* = geschat bedrag</span>
              <span className="text-green-600">Groen = definitief bedrag</span>
            </div>

            {/* Total Investment */}
            <Card className="mt-6 bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Totale Investering</div>
                    <div className="text-xs text-muted-foreground">
                      Aankoopprijs + BTW + Bijkomende kosten
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {formatCurrencyLocal(salePrice + totalDisplay)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      excl. extra's
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </CardContent>
    </Card>
  );
}
