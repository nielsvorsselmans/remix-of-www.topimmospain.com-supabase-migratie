import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Euro, 
  TrendingUp, 
  Gift, 
  Users, 
  Calendar,
  ChevronDown,
  ChevronRight,
  Building2,
  ExternalLink
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subYears } from "date-fns";
import { nl } from "date-fns/locale";
import { Link } from "react-router-dom";
import { CashflowOverview } from "@/components/admin/CashflowOverview";

interface SaleFinancial {
  id: string;
  property_description: string | null;
  sale_price: number | null;
  reservation_date: string | null;
  tis_commission_percentage: number | null;
  tis_commission_type: string | null;
  tis_commission_fixed: number | null;
  project: {
    id: string;
    name: string;
  } | null;
  customers: {
    crm_lead: {
      first_name: string | null;
      last_name: string | null;
    } | null;
  }[];
  partners: {
    partner_id: string;
    commission_percentage: number | null;
    partner: {
      name: string;
    } | null;
  }[];
}

interface GiftData {
  sale_id: string;
  category_name: string;
  option_name: string;
  price: number;
}

export default function Financien() {
  const [dateFrom, setDateFrom] = useState(() => {
    const start = startOfYear(new Date());
    return format(start, 'yyyy-MM-dd');
  });
  const [dateTo, setDateTo] = useState(() => {
    const end = endOfYear(new Date());
    return format(end, 'yyyy-MM-dd');
  });
  const [giftSectionOpen, setGiftSectionOpen] = useState(false);
  const [partnerSectionOpen, setPartnerSectionOpen] = useState(false);
  const [cashflowSectionOpen, setCashflowSectionOpen] = useState(true);

  // Fetch sales with financial data
  const { data: sales, isLoading: salesLoading } = useQuery({
    queryKey: ['financial-sales', dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          id,
          property_description,
          sale_price,
          reservation_date,
          tis_commission_percentage,
          tis_commission_type,
          tis_commission_fixed,
          project:projects(id, name),
          customers:sale_customers(
            crm_lead:crm_leads(first_name, last_name)
          ),
          partners:sale_partners(
            partner_id,
            commission_percentage,
            partner:partners(name)
          )
        `)
        .gte('reservation_date', dateFrom)
        .lte('reservation_date', dateTo)
        .neq('status', 'geannuleerd')
        .order('reservation_date', { ascending: false });
      
      if (error) throw error;
      return data as unknown as SaleFinancial[];
    },
  });

  // Fetch gift data (extras marked as gifted)
  const { data: gifts, isLoading: giftsLoading } = useQuery({
    queryKey: ['financial-gifts', dateFrom, dateTo],
    queryFn: async () => {
      // Get sale IDs in date range first
      const { data: saleIds } = await supabase
        .from('sales')
        .select('id')
        .gte('reservation_date', dateFrom)
        .lte('reservation_date', dateTo)
        .neq('status', 'geannuleerd');
      
      if (!saleIds || saleIds.length === 0) return [];
      
      const ids = saleIds.map(s => s.id);
      
      // Get gifted extras
      const { data: categories, error } = await supabase
        .from('sale_extra_categories')
        .select(`
          sale_id,
          name,
          gifted_by_tis,
          chosen_option_id,
          options:sale_extra_options!sale_extra_options_category_id_fkey(id, name, price)
        `)
        .in('sale_id', ids)
        .eq('gifted_by_tis', true);
      
      if (error) throw error;
      
      // Map to gift data
      const giftData: GiftData[] = [];
      (categories as unknown as Array<{
        sale_id: string;
        name: string;
        gifted_by_tis: boolean;
        chosen_option_id: string | null;
        options: Array<{ id: string; name: string; price: number | null }> | null;
      }>)?.forEach(cat => {
        const giftedOption = cat.options?.find(o => o.id === cat.chosen_option_id);
        if (giftedOption) {
          giftData.push({
            sale_id: cat.sale_id,
            category_name: cat.name,
            option_name: giftedOption.name,
            price: giftedOption.price || 0,
          });
        }
      });
      
      return giftData;
    },
  });

  // Calculate financial metrics
  const metrics = useMemo(() => {
    if (!sales) return null;

    let totalRevenue = 0;
    let totalGrossCommission = 0;
    let totalGiftCosts = 0;
    let totalPartnerCommission = 0;
    const partnerTotals: Record<string, { name: string; amount: number; count: number }> = {};
    const giftTotals: Record<string, { count: number; amount: number }> = {};

    // Calculate gift costs per sale
    const giftsBySale: Record<string, number> = {};
    gifts?.forEach(gift => {
      giftsBySale[gift.sale_id] = (giftsBySale[gift.sale_id] || 0) + gift.price;
      totalGiftCosts += gift.price;
      
      // Track by category
      if (!giftTotals[gift.category_name]) {
        giftTotals[gift.category_name] = { count: 0, amount: 0 };
      }
      giftTotals[gift.category_name].count++;
      giftTotals[gift.category_name].amount += gift.price;
    });

    // Calculate per sale
    const saleDetails = sales.map(sale => {
      const salePrice = sale.sale_price || 0;
      
      // Bepaal bruto commissie op basis van type (fixed of percentage)
      const isFixedCommission = sale.tis_commission_type === 'fixed';
      const grossCommission = isFixedCommission
        ? (sale.tis_commission_fixed || 0)
        : salePrice * ((sale.tis_commission_percentage || 0) / 100);
      
      // Commissie weergave voor tabel
      const commissionDisplay = isFixedCommission
        ? `€${(sale.tis_commission_fixed || 0).toLocaleString('nl-NL')}`
        : `${sale.tis_commission_percentage || 0}%`;
      
      const saleGiftCosts = giftsBySale[sale.id] || 0;
      const netCommissionAfterGifts = grossCommission - saleGiftCosts;
      
      // Partner commission = 25% of (gross commission - gift costs)
      let partnerCommission = 0;
      sale.partners?.forEach(sp => {
        const pctOfNet = sp.commission_percentage || 0;
        const partnerAmt = netCommissionAfterGifts * (pctOfNet / 100);
        partnerCommission += partnerAmt;
        
        // Track partner totals
        const partnerName = sp.partner?.name || 'Onbekend';
        if (!partnerTotals[sp.partner_id]) {
          partnerTotals[sp.partner_id] = { name: partnerName, amount: 0, count: 0 };
        }
        partnerTotals[sp.partner_id].amount += partnerAmt;
        partnerTotals[sp.partner_id].count++;
      });
      
      const netResult = grossCommission - saleGiftCosts - partnerCommission;
      
      totalRevenue += salePrice;
      totalGrossCommission += grossCommission;
      totalPartnerCommission += partnerCommission;
      
      return {
        ...sale,
        salePrice,
        isFixedCommission,
        commissionDisplay,
        grossCommission,
        giftCosts: saleGiftCosts,
        partnerCommission,
        netResult,
        customerNames: sale.customers
          ?.map(c => `${c.crm_lead?.first_name || ''} ${c.crm_lead?.last_name || ''}`.trim())
          .filter(Boolean)
          .join(', ') || '-',
        partnerNames: sale.partners
          ?.map(p => p.partner?.name)
          .filter(Boolean)
          .join(', ') || '-',
      };
    });

    const netResult = totalGrossCommission - totalGiftCosts - totalPartnerCommission;

    return {
      totalRevenue,
      totalGrossCommission,
      totalGiftCosts,
      totalPartnerCommission,
      netResult,
      salesCount: sales.length,
      saleDetails,
      partnerTotals: Object.values(partnerTotals).sort((a, b) => b.amount - a.amount),
      giftTotals: Object.entries(giftTotals).sort((a, b) => b[1].amount - a[1].amount),
    };
  }, [sales, gifts]);

  const setQuickFilter = (type: 'month' | 'quarter' | 'year' | 'lastyear') => {
    const now = new Date();
    let start: Date, end: Date;
    
    switch (type) {
      case 'month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'quarter':
        start = startOfQuarter(now);
        end = endOfQuarter(now);
        break;
      case 'year':
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      case 'lastyear':
        const lastYear = subYears(now, 1);
        start = startOfYear(lastYear);
        end = endOfYear(lastYear);
        break;
    }
    
    setDateFrom(format(start, 'yyyy-MM-dd'));
    setDateTo(format(end, 'yyyy-MM-dd'));
  };

  const formatCurrencyLocal = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isLoading = salesLoading || giftsLoading;

  return (
    <>
      <div className="space-y-6">
        {/* Date Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Periode:</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-40"
                />
                <span className="text-muted-foreground">t/m</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setQuickFilter('month')}>
                  Deze maand
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickFilter('quarter')}>
                  Dit kwartaal
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickFilter('year')}>
                  Dit jaar
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickFilter('lastyear')}>
                  Vorig jaar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Totale Omzet
              </CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatCurrencyLocal(metrics?.totalRevenue || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metrics?.salesCount || 0} verkopen
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                TIS Bruto Commissie
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrencyLocal(metrics?.totalGrossCommission || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Commissie vóór aftrek
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Cadeau Kosten
              </CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-purple-600">
                    {formatCurrencyLocal(metrics?.totalGiftCosts || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cadeaus aan klanten
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Partner Commissies
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrencyLocal(metrics?.totalPartnerCommission || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Verschuldigd aan partners
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-primary">
                Netto Resultaat
              </CardTitle>
              <Euro className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrencyLocal(metrics?.netResult || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Na aftrek kosten
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cashflow Overview */}
        <CashflowOverview dateFrom={dateFrom} dateTo={dateTo} />

        {/* Detailed Sales Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Verkopen Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Klant</TableHead>
                      <TableHead className="text-right">Prijs</TableHead>
                      <TableHead className="text-right">TIS Commissie</TableHead>
                      <TableHead className="text-right">Bruto</TableHead>
                      <TableHead className="text-right">Cadeaus</TableHead>
                      <TableHead className="text-right">Partner</TableHead>
                      <TableHead className="text-right">Netto</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics?.saleDetails.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="whitespace-nowrap">
                          {sale.reservation_date 
                            ? format(new Date(sale.reservation_date), 'd MMM yyyy', { locale: nl })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium truncate max-w-[200px]">
                              {sale.project?.name || '-'}
                            </span>
                            {sale.property_description && (
                              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {sale.property_description}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {sale.customerNames}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrencyLocal(sale.salePrice)}
                        </TableCell>
                        <TableCell className="text-right">
                          {sale.grossCommission > 0 ? (
                            <Badge variant="outline">{sale.commissionDisplay}</Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">Ontbreekt</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-primary">
                          {formatCurrencyLocal(sale.grossCommission)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-purple-600">
                          {sale.giftCosts > 0 ? `-${formatCurrencyLocal(sale.giftCosts)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {sale.partnerCommission > 0 ? (
                            <div className="flex flex-col items-end">
                              <span className="font-mono text-orange-600">
                                -{formatCurrencyLocal(sale.partnerCommission)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {sale.partnerNames}
                              </span>
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatCurrencyLocal(sale.netResult)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" asChild>
                            <Link to={`/admin/verkopen/${sale.id}`}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {metrics?.saleDetails.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          Geen verkopen gevonden in deze periode
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Collapsible Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Gift Overview */}
          <Collapsible open={giftSectionOpen} onOpenChange={setGiftSectionOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gift className="h-5 w-5 text-purple-600" />
                      Cadeau Overzicht
                    </div>
                    {giftSectionOpen ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-20 w-full" />
                  ) : metrics?.giftTotals.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Geen cadeaus in deze periode
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Categorie</TableHead>
                          <TableHead className="text-right">Aantal</TableHead>
                          <TableHead className="text-right">Totaal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {metrics?.giftTotals.map(([category, data]) => (
                          <TableRow key={category}>
                            <TableCell className="font-medium">{category}</TableCell>
                            <TableCell className="text-right">{data.count}x</TableCell>
                            <TableCell className="text-right font-mono text-purple-600">
                              {formatCurrencyLocal(data.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/30">
                          <TableCell className="font-bold">Totaal</TableCell>
                          <TableCell className="text-right font-bold">
                            {metrics?.giftTotals.reduce((acc, [, d]) => acc + d.count, 0)}x
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-purple-600">
                            {formatCurrencyLocal(metrics?.totalGiftCosts || 0)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Partner Commissions */}
          <Collapsible open={partnerSectionOpen} onOpenChange={setPartnerSectionOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-orange-600" />
                      Partner Commissies
                    </div>
                    {partnerSectionOpen ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-20 w-full" />
                  ) : metrics?.partnerTotals.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Geen partner commissies in deze periode
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Partner</TableHead>
                          <TableHead className="text-right">Verkopen</TableHead>
                          <TableHead className="text-right">Verschuldigd</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {metrics?.partnerTotals.map((partner) => (
                          <TableRow key={partner.name}>
                            <TableCell className="font-medium">{partner.name}</TableCell>
                            <TableCell className="text-right">{partner.count}x</TableCell>
                            <TableCell className="text-right font-mono text-orange-600">
                              {formatCurrencyLocal(partner.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/30">
                          <TableCell className="font-bold">Totaal</TableCell>
                          <TableCell className="text-right font-bold">
                            {metrics?.partnerTotals.reduce((acc, p) => acc + p.count, 0)}x
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-orange-600">
                            {formatCurrencyLocal(metrics?.totalPartnerCommission || 0)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      </div>
    </>
  );
}