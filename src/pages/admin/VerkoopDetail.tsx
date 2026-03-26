import { useState } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";

import { useSale, useSaleDocuments, useDeleteSale, Sale } from "@/hooks/useSales";
import { useSaleTotalInvestment } from "@/hooks/useSaleTotalInvestment";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Edit, 
  Home, 
  User, 
  Users, 
  Calendar,
  Euro,
  Receipt,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Building,
  MapPin,
  Trash2,
  Gift,
  Star,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { SaleFormDialog } from "@/components/admin/SaleFormDialog";
import { SaleDocumentsManager } from "@/components/admin/SaleDocumentsManager";
import { SaleStakeholdersManager } from "@/components/admin/SaleStakeholdersManager";
import { SaleCustomersManager } from "@/components/admin/SaleCustomersManager";
import { SaleInvoicesManager } from "@/components/admin/SaleInvoicesManager";
import { SaleChecklistManager } from "@/components/admin/SaleChecklistManager";
import { SaleSnappingManager } from "@/components/admin/SaleSnappingManager";
import { SaleFinancialTabs } from "@/components/admin/SaleFinancialTabs";
import { VoiceSnaggingManager } from "@/components/admin/voice-snagging/VoiceSnaggingManager";
import { VoiceSnaggingSummary } from "@/components/admin/voice-snagging/VoiceSnaggingSummary";
import { SaleSidebarReview } from "@/components/admin/SaleSidebarReview";
import { AftersalesCopilotChat } from "@/components/admin/aftersales/AftersalesCopilotChat";
import { ClipboardList, ClipboardCheck, Mic, Sparkles, Lock } from "lucide-react";
const statusConfig: Record<Sale['status'], { label: string; color: string; icon: React.ReactNode }> = {
  geblokkeerd: { label: 'Geblokkeerd', color: 'bg-slate-500', icon: <Lock className="h-4 w-4" /> },
  reservatie: { label: 'Reservatie', color: 'bg-yellow-500', icon: <Clock className="h-4 w-4" /> },
  koopcontract: { label: 'Koopcontract', color: 'bg-blue-500', icon: <FileText className="h-4 w-4" /> },
  voorbereiding: { label: 'Voorbereiding', color: 'bg-purple-500', icon: <Euro className="h-4 w-4" /> },
  akkoord: { label: 'Akkoord', color: 'bg-orange-500', icon: <Home className="h-4 w-4" /> },
  overdracht: { label: 'Overdracht', color: 'bg-teal-500', icon: <Home className="h-4 w-4" /> },
  nazorg: { label: 'Nazorg', color: 'bg-cyan-500', icon: <CheckCircle2 className="h-4 w-4" /> },
  afgerond: { label: 'Afgerond', color: 'bg-green-500', icon: <CheckCircle2 className="h-4 w-4" /> },
  geannuleerd: { label: 'Geannuleerd', color: 'bg-red-500', icon: <XCircle className="h-4 w-4" /> },
};

export default function VerkoopDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'checklist';
  const { data: sale, isLoading } = useSale(id);
  const { data: documents } = useSaleDocuments(id);
  const { data: totalInvestment } = useSaleTotalInvestment(id, sale?.sale_price || 0);
  const giftTotal = totalInvestment?.extras.giftedValue || 0;
  const deleteSale = useDeleteSale();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [fullscreenToolOpen, setFullscreenToolOpen] = useState(false);
  const [initialInspectionId, setInitialInspectionId] = useState<string | undefined>();

  // Calculate TIS commission
  const calculateCommission = (sale: Sale) => {
    if (sale.tis_commission_type === 'percentage' && sale.tis_commission_percentage && sale.sale_price) {
      return (sale.sale_price * sale.tis_commission_percentage) / 100;
    } else if (sale.tis_commission_type === 'fixed' && sale.tis_commission_fixed) {
      return sale.tis_commission_fixed;
    }
    return 0;
  };

  // Format customer names
  const getCustomerNames = (sale: Sale) => {
    if (!sale.customers?.length) return null;
    return sale.customers
      .map(c => {
        const firstName = c.crm_lead?.first_name || '';
        const lastName = c.crm_lead?.last_name || '';
        return `${firstName} ${lastName}`.trim();
      })
      .filter(name => name)
      .join(' & ');
  };

  const handleDelete = () => {
    if (!id) return;
    deleteSale.mutate(id, {
      onSuccess: () => {
        navigate('/admin/verkopen');
      },
    });
  };

  if (isLoading) {
    return (
      <>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </>
    );
  }

  if (!sale) {
    return (
      <>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Verkoop niet gevonden</p>
          <Button asChild className="mt-4">
            <Link to="/admin/verkopen">Terug naar overzicht</Link>
          </Button>
        </div>
      </>
    );
  }

  const status = statusConfig[sale.status];

  if (fullscreenToolOpen) {
    return (
      <div className="fixed inset-0 z-[60] bg-background flex flex-col">
        <VoiceSnaggingManager
          saleId={sale.id}
          onClose={() => { setFullscreenToolOpen(false); setInitialInspectionId(undefined); }}
          initialInspectionId={initialInspectionId}
        />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <Button variant="ghost" size="icon" asChild className="shrink-0 mt-0.5">
              <Link to="/admin/verkopen">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold truncate">
                  {sale.project?.name || 'Verkoop'}
                </h1>
                <Badge className={`${status.color} text-white gap-1 shrink-0`}>
                  {status.icon}
                  {status.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {sale.project?.city}
                {sale.property_description && ` · ${sale.property_description}`}
              </p>
              {getCustomerNames(sale) && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <User className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{getCustomerNames(sale)}</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0 pl-10 sm:pl-0">
            <Button onClick={() => setShowEditDialog(true)} size="sm">
              <Edit className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Bewerken</span>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Verwijderen</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Verkoop verwijderen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Weet je zeker dat je deze verkoop wilt verwijderen? Dit verwijdert ook alle gekoppelde klanten, partners, documenten, betalingen en mijlpalen. Deze actie kan niet ongedaan worden gemaakt.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuleren</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteSale.isPending ? 'Verwijderen...' : 'Verwijderen'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Overview Cards */}
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
                <p className="font-medium">{sale.project?.name}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {sale.project?.city}
                </p>
              </div>
              {sale.property && (
                <p className="text-sm">
                  {sale.property.property_type} · {sale.property.bedrooms} slk · {sale.property.bathrooms} bdk
                </p>
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

          {/* Financial Info */}
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
                    ? `€${sale.sale_price.toLocaleString('nl-NL')}`
                    : '-'
                  }
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">TIS Commissie</p>
                  <p className="font-medium text-green-600">
                    €{calculateCommission(sale).toLocaleString('nl-NL')}
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
                    €{giftTotal.toLocaleString('nl-NL')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Netto</p>
                  <p className="font-medium">
                    €{(calculateCommission(sale) - giftTotal).toLocaleString('nl-NL')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Dates */}
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

        {/* Tabs */}
        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="checklist" className="gap-1.5">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Checklist</span>
            </TabsTrigger>
            <TabsTrigger value="customers" className="gap-1.5">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Klanten</span>
              <span className="sm:hidden">{sale.customers?.length || 0}</span>
              <span className="hidden sm:inline">({sale.customers?.length || 0})</span>
            </TabsTrigger>
            <TabsTrigger value="stakeholders" className="gap-1.5">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Partners & Advocaten</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Documenten ({documents?.length || 0})</span>
            </TabsTrigger>
            <TabsTrigger value="financial" className="gap-1.5">
              <Euro className="h-4 w-4" />
              <span className="hidden sm:inline">Financieel</span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-1.5">
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Facturen</span>
            </TabsTrigger>
            <TabsTrigger value="oplevering" className="gap-1.5">
              <ClipboardCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Oplevering</span>
            </TabsTrigger>
            <TabsTrigger value="plaatsbeschrijving" className="gap-1.5">
              <Mic className="h-4 w-4" />
              <span className="hidden sm:inline">Plaatsbeschrijving</span>
            </TabsTrigger>
            <TabsTrigger value="review" className="gap-1.5">
              <Star className="h-4 w-4" />
              <span className="hidden sm:inline">Review</span>
            </TabsTrigger>
            <TabsTrigger value="ai-copilot" className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Aftersales Copilot</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="checklist">
            <SaleChecklistManager saleId={sale.id} />
          </TabsContent>

          <TabsContent value="customers">
            <SaleCustomersManager sale={sale} />
          </TabsContent>

          <TabsContent value="stakeholders">
            <SaleStakeholdersManager sale={sale} />
          </TabsContent>

          <TabsContent value="documents">
            <SaleDocumentsManager 
              saleId={sale.id} 
              projectId={sale.project_id} 
              documents={documents || []} 
            />
          </TabsContent>

          <TabsContent value="financial">
            <SaleFinancialTabs 
              saleId={sale.id} 
              projectId={sale.project_id} 
              salePrice={sale.sale_price || 0} 
              expectedDeliveryDate={sale.expected_delivery_date}
            />
          </TabsContent>

          <TabsContent value="invoices">
            <SaleInvoicesManager 
              saleId={sale.id} 
              salePrice={sale.sale_price || 0}
              tisCommission={calculateCommission(sale)}
              giftTotal={giftTotal}
              expectedDeliveryDate={sale.expected_delivery_date}
            />
          </TabsContent>

          <TabsContent value="oplevering">
            <SaleSnappingManager saleId={sale.id} />
          </TabsContent>

          <TabsContent value="plaatsbeschrijving">
            <VoiceSnaggingSummary
              saleId={sale.id}
              onOpenTool={(inspId) => { setInitialInspectionId(inspId); setFullscreenToolOpen(true); }}
            />
          </TabsContent>

          <TabsContent value="review">
            <div className="max-w-md">
              <SaleSidebarReview saleId={sale.id} />
            </div>
          </TabsContent>

          <TabsContent value="ai-copilot">
            <div className="max-w-md">
              <AftersalesCopilotChat saleId={sale.id} />
            </div>
          </TabsContent>
        </Tabs>

        {/* Admin Notes */}
        {sale.admin_notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Interne Notities</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{sale.admin_notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <SaleFormDialog 
        open={showEditDialog} 
        onOpenChange={setShowEditDialog}
        sale={sale}
      />
    </>
  );
}
