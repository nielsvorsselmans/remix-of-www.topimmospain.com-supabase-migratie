import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Euro, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Package,
  Calculator,
  Wallet,
  Gift,
  Check,
  FileText,
  Wrench,
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useSaleTotalInvestment } from "@/hooks/useSaleTotalInvestment";
import { useSalePayments } from "@/hooks/useSalePayments";
import { useSalePurchaseCosts } from "@/hooks/useSalePurchaseCosts";
import { useSaleExtras } from "@/hooks/useSaleExtras";
import { useCustomizationRequests } from "@/hooks/useCustomizationRequests";
import { formatCurrency } from "@/lib/utils";

interface SaleFinancialReadOnlyProps {
  saleId: string;
  salePrice: number;
}

export function SaleFinancialReadOnly({ saleId, salePrice }: SaleFinancialReadOnlyProps) {
  const { data: totalInvestment, isLoading: loadingInvestment } = useSaleTotalInvestment(saleId, salePrice);
  const { data: payments = [], isLoading: loadingPayments } = useSalePayments(saleId);
  const { data: costs = [], isLoading: loadingCosts } = useSalePurchaseCosts(saleId);
  const { data: extraCategories = [], isLoading: loadingExtras } = useSaleExtras(saleId);
  const { data: customizationRequests = [], isLoading: loadingRequests } = useCustomizationRequests(saleId);

  const isLoading = loadingInvestment || loadingPayments || loadingCosts || loadingExtras || loadingRequests;

  // Filter relevant quotes (accepted or approved with amount)
  const relevantQuotes = customizationRequests.filter(req => 
    (req.customer_decision === 'accepted' || req.status === 'approved') && 
    (req.quote_amount || 0) > 0
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Betaald
          </Badge>
        );
      case 'overdue':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Vervallen
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Openstaand
          </Badge>
        );
    }
  };

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList>
        <TabsTrigger value="overview" className="gap-2">
          <Euro className="h-4 w-4" />
          Overzicht
        </TabsTrigger>
        <TabsTrigger value="payments" className="gap-2">
          <Wallet className="h-4 w-4" />
          Betaalplan
        </TabsTrigger>
        <TabsTrigger value="costs" className="gap-2">
          <Calculator className="h-4 w-4" />
          Kosten
        </TabsTrigger>
        <TabsTrigger value="extras" className="gap-2">
          <Package className="h-4 w-4" />
          Extra's
        </TabsTrigger>
      </TabsList>

      {/* Overview Tab */}
      <TabsContent value="overview">
        {totalInvestment && (
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
                <div className="text-4xl font-bold text-primary mb-4">
                  {formatCurrency(totalInvestment.totals.grandTotal)}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Aankoopprijs</div>
                    <div className="font-semibold">{formatCurrency(totalInvestment.salePrice)}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">BTW (10%)</div>
                    <div className="font-semibold">{formatCurrency(totalInvestment.vatOnSale)}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Bijkomende kosten</div>
                    <div className="font-semibold">{formatCurrency(totalInvestment.purchaseCosts.total)}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Extra's (incl. belasting)</div>
                    <div className="font-semibold">{formatCurrency(totalInvestment.extras.totalWithTax)}</div>
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
                    {formatCurrency(totalInvestment.totals.totalPaid)}
                  </div>
                  {totalInvestment.totals.grandTotal > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {Math.round((totalInvestment.totals.totalPaid / totalInvestment.totals.grandTotal) * 100)}% van totaal
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
                    {formatCurrency(totalInvestment.totals.totalRemaining)}
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
                    {formatCurrency(totalInvestment.extras.giftedValue)}
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
                    {totalInvestment.payments.isComplete ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-5 w-5" />
                        Compleet
                      </span>
                    ) : (
                      <span className="text-yellow-600">
                        {formatCurrency(totalInvestment.payments.remaining)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </TabsContent>

      {/* Payments Tab */}
      <TabsContent value="payments">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Betaalplan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nog geen betaalplan beschikbaar.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Omschrijving</TableHead>
                    <TableHead className="text-right">Bedrag</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="font-medium">{payment.title}</div>
                        {payment.due_condition && (
                          <div className="text-xs text-muted-foreground">{payment.due_condition}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(payment.amount)}
                        {payment.percentage && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({payment.percentage}%)
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {payment.due_date
                          ? format(new Date(payment.due_date), 'd MMM yyyy', { locale: nl })
                          : '-'}
                      </TableCell>
                      <TableCell>{getPaymentStatusBadge(payment.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Costs Tab */}
      <TabsContent value="costs">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Aankoopkosten
            </CardTitle>
          </CardHeader>
          <CardContent>
            {costs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nog geen aankoopkosten beschikbaar.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kostenpost</TableHead>
                    <TableHead className="text-right">Geschat</TableHead>
                    <TableHead className="text-right">Werkelijk</TableHead>
                    <TableHead className="text-center">Betaald</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costs.map((cost) => (
                    <TableRow key={cost.id} className={cost.is_finalized && cost.is_paid ? 'bg-green-50' : ''}>
                      <TableCell>
                        <div className="font-medium">{cost.label}</div>
                        {cost.tooltip && (
                          <div className="text-xs text-muted-foreground">{cost.tooltip}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(cost.estimated_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {cost.is_finalized && cost.actual_amount ? formatCurrency(cost.actual_amount) : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {cost.is_finalized && cost.is_paid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground mx-auto" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Extras Tab */}
      <TabsContent value="extras">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Extra's & Opties
            </CardTitle>
          </CardHeader>
          <CardContent>
            {extraCategories.length === 0 && relevantQuotes.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nog geen extra's beschikbaar.
              </p>
            ) : (
              <div className="space-y-4">
                {extraCategories.map((category) => {
                  const chosenOption = category.options?.find(o => o.id === category.chosen_option_id);
                  
                  return (
                    <div key={category.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{category.name}</span>
                            {category.is_included && (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                <Check className="h-3 w-3 mr-1" />
                                Inbegrepen
                              </Badge>
                            )}
                            {category.gifted_by_tis && (
                              <Badge className="bg-purple-100 text-purple-800">
                                <Gift className="h-3 w-3 mr-1" />
                                Cadeau
                              </Badge>
                            )}
                            {category.status === 'decided' && !category.is_included && !category.gifted_by_tis && (
                              <Badge className="bg-green-100 text-green-800">
                                <Check className="h-3 w-3 mr-1" />
                                Beslist
                              </Badge>
                            )}
                            {category.status === 'pending' && (
                              <Badge variant="outline" className="border-orange-500 text-orange-600">
                                <Clock className="h-3 w-3 mr-1" />
                                Open
                              </Badge>
                            )}
                          </div>
                          {category.description && (
                            <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                          )}
                        </div>
                        {chosenOption && (
                          <div className="text-right">
                            <div className="font-medium">{chosenOption.name}</div>
                            <div className="text-lg font-bold text-primary">
                              {formatCurrency(chosenOption.price || 0)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Goedgekeurde offertes */}
                {relevantQuotes.map((req) => (
                  <div key={req.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{req.request_title}</span>
                          {req.gifted_by_tis ? (
                            <Badge className="bg-purple-100 text-purple-800">
                              <Gift className="h-3 w-3 mr-1" />
                              Cadeau
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800">
                              <Check className="h-3 w-3 mr-1" />
                              Goedgekeurd
                            </Badge>
                          )}
                          {req.via_developer && (
                            <Badge variant="outline" className="text-xs">
                              <Wrench className="h-3 w-3 mr-1" />
                              Via ontwikkelaar
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Offerte</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">
                          {formatCurrency(req.quote_amount || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
