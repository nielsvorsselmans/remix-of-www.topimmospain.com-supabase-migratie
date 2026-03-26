import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePartner } from "@/contexts/PartnerContext";

import { useSaleTotalInvestment } from "@/hooks/useSaleTotalInvestment";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Home, 
  User, 
  Calendar,
  Euro,
  Clock,
  CheckCircle2,
  XCircle,
  Building,
  MapPin,
  Percent,
  FileText,
  Settings,
  CheckSquare,
  Key,
  ClipboardList,
  Users,
  ClipboardCheck,
  Gift,
  Copy,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { SaleChecklistReadOnly } from "@/components/partner/SaleChecklistReadOnly";
import { SaleCustomersReadOnly } from "@/components/partner/SaleCustomersReadOnly";
import { SaleDocumentsReadOnly } from "@/components/partner/SaleDocumentsReadOnly";
import { SaleFinancialReadOnly } from "@/components/partner/SaleFinancialReadOnly";
import { SaleSnappingReadOnly } from "@/components/partner/SaleSnappingReadOnly";
import { SaleInvoicesReadOnly } from "@/components/partner/SaleInvoicesReadOnly";
import { SaleProgressIndicator } from "@/components/partner/SaleProgressIndicator";
import { SaleRelevantProjects } from "@/components/partner/SaleRelevantProjects";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  reservatie: { label: "Reservatie", color: "bg-amber-500", icon: <Clock className="h-4 w-4" /> },
  koopcontract: { label: "Koopcontract", color: "bg-blue-500", icon: <FileText className="h-4 w-4" /> },
  voorbereiding: { label: "Voorbereiding", color: "bg-purple-500", icon: <Settings className="h-4 w-4" /> },
  akkoord: { label: "Akkoord", color: "bg-orange-500", icon: <CheckSquare className="h-4 w-4" /> },
  overdracht: { label: "Overdracht", color: "bg-teal-500", icon: <Key className="h-4 w-4" /> },
  afgerond: { label: "Afgerond", color: "bg-green-500", icon: <CheckCircle2 className="h-4 w-4" /> },
  geannuleerd: { label: "Geannuleerd", color: "bg-red-500", icon: <XCircle className="h-4 w-4" /> },
};

export default function PartnerVerkoopDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { impersonatedPartner, isImpersonating } = usePartner();

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

  // Fetch sale with partner-specific info
  const { data: sale, isLoading } = useQuery({
    queryKey: ["partner-verkoop-detail", id, partner?.id],
    queryFn: async () => {
      // 1. Get partner-specific sale info
      const { data: partnerSale, error: spError } = await supabase
        .from("sale_partners")
        .select("role, commission_percentage, commission_amount, commission_paid_at")
        .eq("sale_id", id)
        .eq("partner_id", partner?.id)
        .single();
      
      if (spError) throw spError;

      // 2. Fetch full sale data
      const { data, error } = await supabase
        .from("sales")
        .select(`
          id, status, sale_price, reservation_date, contract_date, notary_date, 
          expected_delivery_date, created_at, property_description,
          tis_commission_percentage, tis_commission_type, tis_commission_fixed,
          project:projects(id, name, display_title, city, featured_image),
          sale_customers(id, role, crm_lead:crm_leads(
            id, first_name, last_name, email, phone, 
            personal_data_complete, referred_by_partner_id, journey_phase
          ))
        `)
        .eq("id", id)
        .single();
      
      if (error) throw error;

      // Calculate commission
      const partnerCommissionPct = parseFloat(String(partnerSale?.commission_percentage || 0));
      const tisCommissionPct = parseFloat(String(data.tis_commission_percentage || 0));
      
      let totalTisCommission = 0;
      
      if (data.tis_commission_type === 'fixed' && data.tis_commission_fixed) {
        totalTisCommission = data.tis_commission_fixed;
      } else if (tisCommissionPct > 0 && data.sale_price) {
        totalTisCommission = (tisCommissionPct / 100) * data.sale_price;
      }

      return {
        ...data,
        customers: data.sale_customers,
        partnerInfo: {
          ...partnerSale,
          commission_percentage: partnerCommissionPct,
          tis_commission_percentage: tisCommissionPct,
          total_tis_commission: totalTisCommission,
          // commission_amount will be calculated based on netto after giftTotal is known
          raw_commission_amount: partnerSale?.commission_amount || null
        }
      };
    },
    enabled: !!id && !!partner?.id,
  });

  // Get total investment data for gifts
  const { data: totalInvestment } = useSaleTotalInvestment(id, sale?.sale_price || 0);
  const giftTotal = totalInvestment?.extras.giftedValue || 0;

  const formatPriceLocal = (price: number | null | undefined) => {
    if (!price) return "€0";
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getCustomerNames = () => {
    if (!sale?.customers?.length) return null;
    return sale.customers
      .map((c: any) => {
        const firstName = c.crm_lead?.first_name || '';
        const lastName = c.crm_lead?.last_name || '';
        return `${firstName} ${lastName}`.trim();
      })
      .filter((name: string) => name)
      .join(' & ');
  };

  // Calculate TIS commission
  const calculateCommission = () => {
    if (!sale) return 0;
    if (sale.tis_commission_type === 'percentage' && sale.tis_commission_percentage && sale.sale_price) {
      return (sale.sale_price * sale.tis_commission_percentage) / 100;
    } else if (sale.tis_commission_type === 'fixed' && sale.tis_commission_fixed) {
      return sale.tis_commission_fixed;
    }
    return 0;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Verkoop niet gevonden of geen toegang</p>
        <Button asChild className="mt-4">
          <Link to="/partner/verkopen">Terug naar overzicht</Link>
        </Button>
      </div>
    );
  }

  const status = statusConfig[sale.status] || statusConfig.reservatie;
  const partnerInfo = sale.partnerInfo;
  
  // Calculate netto commission (after subtracting gifts)
  const nettoTisCommission = partnerInfo.total_tis_commission - giftTotal;
  const nettoPartnerCommission = (partnerInfo.commission_percentage / 100) * nettoTisCommission;
  const effectivePercentage = partnerInfo.commission_percentage * partnerInfo.tis_commission_percentage / 100;

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success("Link gekopieerd naar klembord");
  };

  const firstCustomer = sale.customers?.[0]?.crm_lead;

  return (
    <>
      <div className="space-y-6">
        {/* Header with Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" asChild className="shrink-0">
              <Link to="/partner/verkopen">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold">
                  {sale.project?.display_title || sale.project?.name || 'Verkoop'}
                </h1>
                <Badge className={`${status.color} text-white gap-1`}>
                  {status.icon}
                  {status.label}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {sale.project?.city}
                {sale.property_description && ` · ${sale.property_description}`}
              </p>
              {getCustomerNames() && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <User className="h-3.5 w-3.5" />
                  {getCustomerNames()}
                </p>
              )}
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center gap-2 sm:ml-0">
            <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1.5">
              <Copy className="h-4 w-4" />
              <span className="hidden sm:inline">Kopieer link</span>
            </Button>
            {firstCustomer && (
              <Button variant="outline" size="sm" asChild className="gap-1.5">
                <Link to={`/partner/leads`}>
                  <ExternalLink className="h-4 w-4" />
                  <span className="hidden sm:inline">Bekijk klant</span>
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Progress Indicator */}
        <Card className="p-4">
          <SaleProgressIndicator currentStatus={sale.status} />
        </Card>

        {/* Overview Cards - Same as admin */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Property Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building className="h-4 w-4" />
                Woning
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sale.project?.featured_image && (
                <img 
                  src={sale.project.featured_image} 
                  alt={sale.project.name}
                  className="w-full h-32 object-cover rounded-lg"
                />
              )}
              <div>
                <p className="font-medium">{sale.project?.display_title || sale.project?.name}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {sale.project?.city}
                </p>
              </div>
              {sale.property_description && (
                <p className="text-sm text-muted-foreground">{sale.property_description}</p>
              )}
              {sale.project && (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/project/${sale.project.id}`} target="_blank">
                    Bekijk Project
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Financial Info - Same structure as admin + Partner Commission */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Euro className="h-4 w-4" />
                Financieel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Verkoopprijs</p>
                <p className="text-2xl font-bold">
                  {sale.sale_price 
                    ? formatPriceLocal(sale.sale_price)
                    : '-'
                  }
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">TIS Commissie</p>
                  <p className="font-medium text-green-600">
                    {formatPriceLocal(calculateCommission())}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {sale.tis_commission_type === 'percentage' 
                      ? `${sale.tis_commission_percentage || 0}%`
                      : 'vast bedrag'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Gift className="h-3 w-3" />
                    Cadeaus
                  </p>
                  <p className="font-medium text-purple-600">
                    {formatPriceLocal(giftTotal)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Netto</p>
                  <p className="font-medium">
                    {formatPriceLocal(calculateCommission() - giftTotal)}
                  </p>
                </div>
              </div>
              
              {/* Partner Commission - Prominent */}
              <Separator />
              <div className="bg-primary/5 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Percent className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Jouw Commissie</span>
                </div>
              <p className="text-2xl font-bold text-primary">
                  {formatPriceLocal(nettoPartnerCommission)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {partnerInfo.commission_percentage}% van {formatPriceLocal(nettoTisCommission)} (netto)
                </p>
                {partnerInfo.commission_paid_at ? (
                  <Badge className="mt-2 bg-green-500 text-white">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Uitbetaald {format(new Date(partnerInfo.commission_paid_at), 'd MMM yyyy', { locale: nl })}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="mt-2">
                    <Clock className="h-3 w-3 mr-1" />
                    Openstaand
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Key Dates - Same as admin */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Planning
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Reservatie</p>
                  <p className="font-medium">
                    {sale.reservation_date 
                      ? format(new Date(sale.reservation_date), 'd MMM yyyy', { locale: nl })
                      : '-'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Contract</p>
                  <p className="font-medium">
                    {sale.contract_date 
                      ? format(new Date(sale.contract_date), 'd MMM yyyy', { locale: nl })
                      : '-'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Notaris</p>
                  <p className="font-medium">
                    {sale.notary_date 
                      ? format(new Date(sale.notary_date), 'd MMM yyyy', { locale: nl })
                      : '-'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Oplevering</p>
                  <p className="font-medium">
                    {sale.expected_delivery_date 
                      ? format(new Date(sale.expected_delivery_date), 'd MMM yyyy', { locale: nl })
                      : '-'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs - Same as admin but read-only */}
        <Tabs defaultValue="checklist" className="space-y-4">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="checklist" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Checklist</span>
              </TabsTrigger>
              <TabsTrigger value="customers" className="gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Klanten</span> ({sale.customers?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Documenten</span>
              </TabsTrigger>
              <TabsTrigger value="invoices" className="gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Facturen</span>
              </TabsTrigger>
              <TabsTrigger value="financial" className="gap-2">
                <Euro className="h-4 w-4" />
                <span className="hidden sm:inline">Financieel</span>
              </TabsTrigger>
              <TabsTrigger value="oplevering" className="gap-2">
                <ClipboardCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Oplevering</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="checklist">
            <SaleChecklistReadOnly saleId={sale.id} />
          </TabsContent>

          <TabsContent value="customers">
            <SaleCustomersReadOnly customers={sale.customers || []} partnerId={partner?.id} />
          </TabsContent>

          <TabsContent value="documents">
            <SaleDocumentsReadOnly saleId={sale.id} />
          </TabsContent>


          <TabsContent value="invoices">
            <SaleInvoicesReadOnly 
              saleId={sale.id} 
              partnerInfo={partnerInfo} 
              giftTotal={giftTotal}
              salePrice={sale.sale_price || 0}
            />
          </TabsContent>

          <TabsContent value="financial">
            <SaleFinancialReadOnly saleId={sale.id} salePrice={sale.sale_price || 0} />
          </TabsContent>

          <TabsContent value="oplevering">
            <SaleSnappingReadOnly saleId={sale.id} />
          </TabsContent>
        </Tabs>

        {/* Relevant Projects Section */}
        <SaleRelevantProjects currentProjectId={sale.project?.id} />
      </div>
    </>
  );
}
