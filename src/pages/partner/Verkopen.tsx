import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePartner } from "@/contexts/PartnerContext";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ShoppingBag, 
  Euro, 
  Home,
  TrendingUp,
  Search,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Clock,
  FileText,
  Settings,
  CheckSquare,
  Key,
  CheckCircle2,
  XCircle,
  Lock
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  geblokkeerd: { label: "Geblokkeerd", color: "bg-slate-500", icon: <Lock className="h-3 w-3" /> },
  reservatie: { label: "Reservatie", color: "bg-amber-500", icon: <Clock className="h-3 w-3" /> },
  koopcontract: { label: "Koopcontract", color: "bg-blue-500", icon: <FileText className="h-3 w-3" /> },
  voorbereiding: { label: "Voorbereiding", color: "bg-purple-500", icon: <Settings className="h-3 w-3" /> },
  akkoord: { label: "Akkoord", color: "bg-orange-500", icon: <CheckSquare className="h-3 w-3" /> },
  overdracht: { label: "Overdracht", color: "bg-teal-500", icon: <Key className="h-3 w-3" /> },
  nazorg: { label: "Nazorg", color: "bg-cyan-500", icon: <CheckSquare className="h-3 w-3" /> },
  afgerond: { label: "Afgerond", color: "bg-green-500", icon: <CheckCircle2 className="h-3 w-3" /> },
  geannuleerd: { label: "Geannuleerd", color: "bg-red-500", icon: <XCircle className="h-3 w-3" /> },
};

const statusOrder = ['geblokkeerd', 'reservatie', 'koopcontract', 'voorbereiding', 'akkoord', 'overdracht', 'nazorg', 'afgerond', 'geannuleerd'];

// Formatteert projectnaam: MIRADOR DEL CONDADO_APARTAMENTOS -> Mirador del Condado
const formatProjectName = (name: string | null | undefined): string => {
  if (!name) return 'Onbekend project';
  
  // Verwijder suffix zoals _APARTAMENTOS, _VILLAS, etc.
  let formatted = name.replace(/_[A-Z]+$/, '');
  
  // Converteer UPPERCASE naar Title Case
  formatted = formatted
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
  
  return formatted;
};

type SortColumn = 'status' | 'sale_price' | 'commission' | 'reservation_date';
type SortDirection = 'asc' | 'desc';

export default function PartnerVerkopen() {
  const { user } = useAuth();
  const { impersonatedPartner, isImpersonating } = usePartner();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortColumn, setSortColumn] = useState<SortColumn>('reservation_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Fetch partner ID - use impersonated partner if available
  const { data: partner } = useQuery({
    queryKey: ["partner-profile", user?.id, impersonatedPartner?.id],
    queryFn: async () => {
      // If impersonating, use the impersonated partner's ID
      if (isImpersonating && impersonatedPartner) {
        return { id: impersonatedPartner.id };
      }
      
      const { data, error } = await supabase
        .from("partners")
        .select("id")
        .eq("user_id", user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id || isImpersonating,
  });

  // Fetch partner's sales via sale_partners junction table
  const { data: sales, isLoading, error: salesError } = useQuery<any[]>({
    queryKey: ["partner-verkopen", partner?.id],
    queryFn: async () => {
      // 1. First get sale_ids from sale_partners
      const { data: partnerSales, error: spError } = await supabase
        .from("sale_partners")
        .select("sale_id, role, commission_percentage, commission_amount, commission_paid_at")
        .eq("partner_id", partner?.id);
      
      if (spError) throw spError;
      if (!partnerSales?.length) return [];
      
      const saleIds = partnerSales.map(sp => sp.sale_id);
      
      // 2. Fetch full sales data including TIS commission
      const { data, error } = await supabase
        .from("sales")
        .select(`
          id, status, sale_price, reservation_date, notary_date, created_at,
          property_description,
          tis_commission_percentage, tis_commission_type, tis_commission_fixed,
          project:projects(id, name, display_title, city, featured_image),
          sale_customers(role, crm_lead:crm_leads(first_name, last_name))
        `)
        .in("id", saleIds)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // 3. Fetch partner invoices for commission payment tracking
      const { data: partnerInvoices, error: invError } = await supabase
        .from("sale_invoices")
        .select("sale_id, amount, status, paid_at")
        .eq("partner_id", partner?.id)
        .eq("invoice_type", "partner")
        .in("sale_id", saleIds);
      
      if (invError) console.error("Error fetching partner invoices:", invError);
      
      // 4. Combine sales with partner-specific info and calculate correct commission
      return data?.map(sale => {
        const partnerInfo = partnerSales.find(sp => sp.sale_id === sale.id);
        const partnerCommissionPct = parseFloat(String(partnerInfo?.commission_percentage || 0));
        const tisCommissionPct = parseFloat(String(sale.tis_commission_percentage || 0));
        
        // Calculate commission correctly: partner gets X% of the total TIS commission
        let commissionAmount = partnerInfo?.commission_amount;
        
        if (commissionAmount == null && sale.sale_price && partnerCommissionPct > 0) {
          if (sale.tis_commission_type === 'fixed' && sale.tis_commission_fixed) {
            // Fixed commission: partner % × fixed commission amount
            const totalCommission = sale.tis_commission_fixed;
            commissionAmount = (partnerCommissionPct / 100) * totalCommission;
          } else if (tisCommissionPct > 0) {
            // Percentage commission: partner % × (TIS % × sale_price)
            const totalCommission = (tisCommissionPct / 100) * sale.sale_price;
            commissionAmount = (partnerCommissionPct / 100) * totalCommission;
          }
        }
        
        // Calculate paid and pending amounts from invoices
        const saleInvoices = partnerInvoices?.filter(inv => inv.sale_id === sale.id) || [];
        const paidAmount = saleInvoices
          .filter(inv => inv.status === 'paid')
          .reduce((sum, inv) => sum + (inv.amount || 0), 0);
        const pendingAmount = saleInvoices
          .filter(inv => inv.status !== 'paid')
          .reduce((sum, inv) => sum + (inv.amount || 0), 0);
        
        // Determine payment status
        let paymentStatus: 'paid' | 'partial' | 'pending' = 'pending';
        if (paidAmount > 0 && pendingAmount > 0) {
          paymentStatus = 'partial';
        } else if (paidAmount > 0 && pendingAmount === 0) {
          // Check if fully paid (paid amount matches commission amount)
          paymentStatus = partnerInfo?.commission_paid_at ? 'paid' : (paidAmount >= (commissionAmount || 0) ? 'paid' : 'partial');
        } else if (partnerInfo?.commission_paid_at) {
          paymentStatus = 'paid';
        }
        
        return {
          ...sale,
          partnerInfo: partnerInfo ? {
            ...partnerInfo,
            commission_percentage: partnerCommissionPct,
            tis_commission_percentage: tisCommissionPct,
            commission_amount: commissionAmount || 0,
            paid_amount: paidAmount,
            pending_amount: pendingAmount,
            payment_status: paymentStatus
          } : null
        };
      }) || [];
    },
    enabled: !!partner?.id,
  });

  // Filter sales
  const filteredSales = sales?.filter(sale => {
    const matchesSearch = !searchQuery || 
      sale.project?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.project?.display_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.project?.city?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || sale.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  // Sort sales
  const sortedSales = [...filteredSales].sort((a, b) => {
    let comparison = 0;
    
    switch (sortColumn) {
      case 'status':
        comparison = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
        break;
      case 'sale_price':
        comparison = (a.sale_price || 0) - (b.sale_price || 0);
        break;
      case 'commission':
        comparison = (a.partnerInfo?.commission_amount || 0) - (b.partnerInfo?.commission_amount || 0);
        break;
      case 'reservation_date':
        comparison = new Date(a.reservation_date || 0).getTime() - new Date(b.reservation_date || 0).getTime();
        break;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const SortableHeader = ({ column, label }: { column: SortColumn; label: string }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 select-none transition-colors"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortColumn === column ? (
          sortDirection === 'asc' 
            ? <ChevronUp className="h-4 w-4" /> 
            : <ChevronDown className="h-4 w-4" />
        ) : (
          <ArrowUpDown className="h-4 w-4 text-muted-foreground/40" />
        )}
      </div>
    </TableHead>
  );

  // Calculate totals based on actual invoice payments
  const totalSales = sales?.length || 0;
  const activeSales = sales?.filter((s: any) => !['afgerond', 'geannuleerd'].includes(s.status)).length || 0;
  const completedSales = sales?.filter((s: any) => s.status === "afgerond").length || 0;
  const totalCommission = sales?.reduce((sum: number, s: any) => sum + (s.partnerInfo?.commission_amount || 0), 0) || 0;
  // Sum up actually paid amounts from invoices
  const paidCommission = sales?.reduce((sum: number, s: any) => sum + (s.partnerInfo?.paid_amount || 0), 0) || 0;
  const outstandingCommission = totalCommission - paidCommission;

  const formatPriceLocal = (price: number | null) => {
    if (!price) return "€0";
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getCustomerName = (sale: any) => {
    const primaryCustomer = sale.sale_customers?.find((c: any) => c.role === 'buyer') 
      || sale.sale_customers?.[0];
    return primaryCustomer?.crm_lead 
      ? `${primaryCustomer.crm_lead.first_name} ${primaryCustomer.crm_lead.last_name}`
      : null;
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Verkopen & Commissies</h1>
          <p className="text-muted-foreground">
            Overzicht van alle verkopen waarbij jij betrokken bent
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Totaal Verkopen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSales}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Actieve Trajecten
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{activeSales}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Afgerond
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedSales}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Totale Commissie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatPriceLocal(totalCommission)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatPriceLocal(paidCommission)} uitbetaald
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Openstaand
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{formatPriceLocal(outstandingCommission)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op project of stad..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter op status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statussen</SelectItem>
              {Object.entries(statusConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sales Table */}
        <Card>
          <CardContent className="p-0">
            {salesError ? (
              <div className="p-12 text-center">
                <ShoppingBag className="h-12 w-12 mx-auto text-destructive mb-4" />
                <h3 className="text-lg font-medium mb-2">Verkopen konden niet geladen worden</h3>
                <p className="text-muted-foreground">
                  Probeer de pagina te vernieuwen of neem contact op met support
                </p>
              </div>
            ) : isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredSales.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-medium mb-2">Nog geen verkopen</h3>
                <p>Wanneer je klanten een aankoop doen, verschijnen ze hier</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project / Woning</TableHead>
                        <SortableHeader column="status" label="Status" />
                        <SortableHeader column="sale_price" label="Verkoopprijs" />
                        <SortableHeader column="commission" label="Jouw Commissie" />
                        <SortableHeader column="reservation_date" label="Reservatie" />
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedSales.map((sale) => {
                        const status = statusConfig[sale.status] || statusConfig.reservatie;
                        const customerName = getCustomerName(sale);
                        const partnerInfo = sale.partnerInfo;

                        return (
                          <TableRow key={sale.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {sale.project?.featured_image ? (
                                  <img 
                                    src={sale.project.featured_image} 
                                    alt={sale.project.name}
                                    className="h-10 w-10 rounded object-cover"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                    <Home className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                )}
                                <div>
                                  <div className="font-medium">
                                    {sale.property_description 
                                      ? `${formatProjectName(sale.project?.name)} - ${sale.property_description}`
                                      : formatProjectName(sale.project?.name)}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {customerName || sale.project?.city || 'Geen kopers toegewezen'}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="secondary" 
                                className={`${status.color} text-white gap-1`}
                              >
                                {status.icon}
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {sale.sale_price 
                                ? formatPriceLocal(sale.sale_price)
                                : '-'
                              }
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium text-primary">
                                  {formatPriceLocal(partnerInfo?.commission_amount)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {partnerInfo?.commission_percentage}% van {partnerInfo?.tis_commission_percentage}%
                                </div>
                                {partnerInfo?.payment_status === 'paid' ? (
                                  <Badge variant="outline" className="mt-1 text-green-600 border-green-600 text-xs">
                                    Uitbetaald
                                  </Badge>
                                ) : partnerInfo?.payment_status === 'partial' ? (
                                  <div className="mt-1 space-y-0.5">
                                    <Badge variant="outline" className="text-amber-600 border-amber-600 text-xs">
                                      Deels betaald
                                    </Badge>
                                    <div className="text-xs text-green-600">
                                      Betaald: {formatPriceLocal(partnerInfo.paid_amount)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Openstaand: {formatPriceLocal(partnerInfo.pending_amount)}
                                    </div>
                                  </div>
                                ) : (
                                  <Badge variant="outline" className="mt-1 text-xs">
                                    Openstaand
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {sale.reservation_date 
                                ? format(new Date(sale.reservation_date), 'd MMM yyyy', { locale: nl })
                                : '-'
                              }
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" asChild>
                                <Link to={`/partner/verkopen/${sale.id}`}>
                                  Bekijk
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3 p-4">
                  {sortedSales.map((sale) => {
                    const status = statusConfig[sale.status] || statusConfig.reservatie;
                    const customerName = getCustomerName(sale);
                    const partnerInfo = sale.partnerInfo;

                    return (
                      <Link 
                        key={sale.id} 
                        to={`/partner/verkopen/${sale.id}`}
                        className="block border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="font-medium text-sm">
                            {sale.property_description 
                              ? `${formatProjectName(sale.project?.name)} - ${sale.property_description}`
                              : formatProjectName(sale.project?.name)}
                          </div>
                          <Badge 
                            variant="secondary" 
                            className={`${status.color} text-white gap-1 shrink-0 text-xs`}
                          >
                            {status.icon}
                            {status.label}
                          </Badge>
                        </div>
                        {customerName && (
                          <p className="text-xs text-muted-foreground mb-2">{customerName}</p>
                        )}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {sale.sale_price ? formatPriceLocal(sale.sale_price) : '-'}
                          </span>
                          <span className="font-medium text-primary">
                            {formatPriceLocal(partnerInfo?.commission_amount)}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
