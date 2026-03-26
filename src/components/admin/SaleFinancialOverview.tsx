import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Euro, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Package,
  Calculator,
  Wallet,
  Gift
} from 'lucide-react';
import { useSaleTotalInvestment } from '@/hooks/useSaleTotalInvestment';
import { formatCurrency } from '@/lib/utils';

interface SaleFinancialOverviewProps {
  saleId: string;
  salePrice: number;
}

export function SaleFinancialOverview({ saleId, salePrice }: SaleFinancialOverviewProps) {
  const { data, isLoading } = useSaleTotalInvestment(saleId, salePrice);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Card - Grand Total */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Euro className="h-5 w-5" />
            Totale Investering
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl sm:text-4xl font-bold text-primary mb-4">
            {formatCurrency(data.totals.grandTotal)}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="space-y-1">
              <div className="text-muted-foreground">Aankoopprijs</div>
              <div className="font-semibold">{formatCurrency(data.salePrice)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-muted-foreground">BTW (10%)</div>
              <div className="font-semibold">{formatCurrency(data.vatOnSale)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-muted-foreground">Bijkomende kosten</div>
              <div className="font-semibold">{formatCurrency(data.purchaseCosts.total)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-muted-foreground">Extra's (incl. belasting)</div>
              <div className="font-semibold">{formatCurrency(data.extras.totalWithTax)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Betaald
            </div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data.totals.totalPaid)}
            </div>
            {data.totals.grandTotal > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                {Math.round((data.totals.totalPaid / data.totals.grandTotal) * 100)}% van totaal
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Clock className="h-4 w-4 text-yellow-600" />
              Nog te betalen
            </div>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(data.totals.totalRemaining)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Gift className="h-4 w-4 text-purple-600" />
              Cadeau TIS
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(data.extras.giftedValue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Wallet className="h-4 w-4" />
              Betaalplan
            </div>
            <div className="text-2xl font-bold">
              {data.payments.isComplete ? (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-5 w-5" />
                  Compleet
                </span>
              ) : (
                <span className="text-yellow-600">
                  {formatCurrency(data.payments.remaining)}
                </span>
              )}
            </div>
            {!data.payments.isComplete && (
              <div className="text-xs text-muted-foreground mt-1">nog toe te wijzen</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Woning Betalingen */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Woning Betalingen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Totaal (incl. BTW)</span>
              <span className="font-medium">{formatCurrency(data.totalWithVat)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-green-600">Betaald</span>
              <span className="font-medium text-green-600">{formatCurrency(data.payments.paid)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-yellow-600">Openstaand</span>
              <span className="font-medium text-yellow-600">{formatCurrency(data.payments.pending)}</span>
            </div>
            {data.payments.overdue > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-red-600">Vervallen</span>
                <span className="font-medium text-red-600">{formatCurrency(data.payments.overdue)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bijkomende Kosten */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Bijkomende Kosten
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Totaal geschat</span>
              <span className="font-medium">{formatCurrency(data.purchaseCosts.total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-green-600">Betaald</span>
              <span className="font-medium text-green-600">{formatCurrency(data.purchaseCosts.paid)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-yellow-600">Nog te betalen</span>
              <span className="font-medium text-yellow-600">{formatCurrency(data.purchaseCosts.remaining)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Extra's & Opties */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Extra's & Opties
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.extras.base > 0 ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotaal</span>
                  <span className="font-medium">{formatCurrency(data.extras.base)}</span>
                </div>
                {data.extras.developerBase > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground text-xs">Via ontwikkelaar: BTW (10%)</span>
                      <span>{formatCurrency(data.extras.developerBtw)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground text-xs">Via ontwikkelaar: AJD (1,5%)</span>
                      <span>{formatCurrency(data.extras.developerAjd)}</span>
                    </div>
                  </>
                )}
                {data.extras.externalBase > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground text-xs">Extern: BTW (21%)</span>
                    <span>{formatCurrency(data.extras.externalBtw)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="font-medium">Totaal</span>
                  <span className="font-bold">{formatCurrency(data.extras.totalWithTax)}</span>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                Geen extra's gekozen
              </div>
            )}
            {data.extras.giftedValue > 0 && (
              <div className="flex justify-between text-sm text-purple-600 border-t pt-2">
                <span className="flex items-center gap-1">
                  <Gift className="h-3 w-3" />
                  Cadeau TIS
                </span>
                <span className="font-medium">{formatCurrency(data.extras.giftedValue)}</span>
              </div>
            )}
            {data.extras.pendingDecision > 0 && (
              <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {data.extras.pendingDecision} nog te beslissen
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
