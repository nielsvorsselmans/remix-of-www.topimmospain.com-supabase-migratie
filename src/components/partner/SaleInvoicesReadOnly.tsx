import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertTriangle, 
  FileText, 
  Euro, 
  Download, 
  CheckCircle2, 
  Clock, 
  Gift,
  Info
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useSaleInvoices, SaleInvoice } from "@/hooks/useSaleInvoices";

interface PartnerInfo {
  commission_percentage: number;
  tis_commission_percentage: number;
  total_tis_commission: number;
  commission_amount: number;
  commission_paid_at?: string | null;
}

interface SaleInvoicesReadOnlyProps {
  saleId: string;
  partnerInfo: PartnerInfo;
  giftTotal: number;
  salePrice: number;
}

export function SaleInvoicesReadOnly({ 
  saleId, 
  partnerInfo, 
  giftTotal,
  salePrice 
}: SaleInvoicesReadOnlyProps) {
  const { data: invoices, isLoading } = useSaleInvoices(saleId);

  const formatPrice = (price: number | null | undefined) => {
    if (!price && price !== 0) return "€0";
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  // Filter developer invoices only (these are the TIS invoices)
  const developerInvoices = invoices?.filter(inv => inv.invoice_type === 'developer') || [];
  
  // Calculate netto TIS commission (bruto - gifts)
  const nettoTisCommission = partnerInfo.total_tis_commission - giftTotal;
  
  // Calculate totals
  const totalDeveloperAmount = developerInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const partnerPercentage = partnerInfo.commission_percentage / 100;
  
  // Total partner share based on netto commission
  const totalPartnerShare = nettoTisCommission * partnerPercentage;
  
  // Calculate partner's share per invoice (pro-rata based on invoice ratio to total, applied to netto commission)
  const getPartnerShare = (invoiceAmount: number) => {
    if (totalDeveloperAmount === 0) return 0;
    const invoiceRatio = invoiceAmount / totalDeveloperAmount;
    return invoiceRatio * totalPartnerShare;
  };

  // Calculate paid/pending amounts
  const paidInvoices = developerInvoices.filter(inv => inv.status === 'paid');
  const totalPaidPartnerShare = paidInvoices.reduce((sum, inv) => sum + getPartnerShare(inv.amount), 0);
  const pendingPartnerShare = totalPartnerShare - totalPaidPartnerShare;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500 text-white gap-1"><CheckCircle2 className="h-3 w-3" />Betaald</Badge>;
      case 'sent':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Verzonden</Badge>;
      case 'overdue':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Verlopen</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />In behandeling</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Disclaimer Alert */}
      <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800 dark:text-amber-200">
          Verrekening van cadeaus
        </AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-300 space-y-2">
          <p>
            De commissie die je kunt factureren wordt berekend op basis van de <strong>netto TIS-commissie</strong>. 
            Eventuele cadeaus die TIS aan de klant geeft (zoals gratis extra's of upgrades) worden eerst van de 
            bruto commissie afgetrokken. Je ontvangt jouw afgesproken percentage ({partnerInfo.commission_percentage}%) 
            over het resterende bedrag.
          </p>
          {giftTotal > 0 && (
            <p className="flex items-center gap-2 mt-2 font-medium">
              <Gift className="h-4 w-4" />
              Totaal geschonken aan klant: {formatPrice(giftTotal)}
            </p>
          )}
        </AlertDescription>
      </Alert>

      {/* Commission Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Euro className="h-5 w-5" />
            Commissie Overzicht
          </CardTitle>
          <CardDescription>
            Berekening van jouw commissie op basis van TIS facturen aan ontwikkelaar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Commission Calculation Table */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <Table>
              <TableBody>
                <TableRow className="border-0">
                  <TableCell className="font-medium py-2">TIS Commissie (bruto)</TableCell>
                  <TableCell className="text-right py-2">{formatPrice(partnerInfo.total_tis_commission)}</TableCell>
                </TableRow>
                <TableRow className="border-0">
                  <TableCell className="font-medium py-2 text-purple-600 flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    Cadeaus aan klant
                  </TableCell>
                  <TableCell className="text-right py-2 text-purple-600">
                    -{formatPrice(giftTotal)}
                  </TableCell>
                </TableRow>
                <TableRow className="border-t">
                  <TableCell className="font-semibold py-2">TIS Netto Commissie</TableCell>
                  <TableCell className="text-right py-2 font-semibold">
                    {formatPrice(partnerInfo.total_tis_commission - giftTotal)}
                  </TableCell>
                </TableRow>
                <TableRow className="border-0 bg-primary/5">
                  <TableCell className="font-bold py-3 text-primary">
                    Jouw aandeel ({partnerInfo.commission_percentage}%)
                  </TableCell>
                  <TableCell className="text-right py-3 font-bold text-primary text-lg">
                    {formatPrice((partnerInfo.total_tis_commission - giftTotal) * partnerPercentage)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Te factureren</p>
              <p className="text-xl font-bold text-amber-600">{formatPrice(pendingPartnerShare)}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Gefactureerd</p>
              <p className="text-xl font-bold text-blue-600">{formatPrice(0)}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Betaald</p>
              <p className="text-xl font-bold text-green-600">{formatPrice(totalPaidPartnerShare)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Developer Invoices List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            TIS Facturen aan Ontwikkelaar
          </CardTitle>
          <CardDescription>
            Per betaalde termijn kun je jouw pro-rata commissie factureren
          </CardDescription>
        </CardHeader>
        <CardContent>
          {developerInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Er zijn nog geen facturen aangemaakt voor deze verkoop.</p>
              <p className="text-sm mt-1">
                Facturen worden aangemaakt wanneer termijnen door de klant zijn betaald.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Termijn</TableHead>
                    <TableHead>TIS Factuur</TableHead>
                    <TableHead>Jouw commissie</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Bijlage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {developerInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {invoice.sale_payment?.title || 'Onbekende termijn'}
                          </p>
                          {invoice.invoice_date && (
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(invoice.invoice_date), 'd MMM yyyy', { locale: nl })}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{formatPrice(invoice.amount)}</p>
                          {invoice.invoice_number && (
                            <p className="text-xs text-muted-foreground">
                              #{invoice.invoice_number}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="bg-primary/10 text-primary font-semibold px-2 py-1 rounded inline-block">
                          {formatPrice(getPartnerShare(invoice.amount))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {partnerInfo.commission_percentage}% pro-rata
                        </p>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(invoice.status)}
                        {invoice.paid_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(invoice.paid_at), 'd MMM yyyy', { locale: nl })}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {invoice.file_url ? (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={invoice.file_url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info about invoicing */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Hoe factureren?</AlertTitle>
        <AlertDescription>
          Wanneer TIS een factuur betaald heeft gekregen van de ontwikkelaar, kun je jouw commissie factureren 
          aan TIS. Neem contact op met TIS voor de facturatiegegevens en stuur je factuur naar administratie.
        </AlertDescription>
      </Alert>
    </div>
  );
}