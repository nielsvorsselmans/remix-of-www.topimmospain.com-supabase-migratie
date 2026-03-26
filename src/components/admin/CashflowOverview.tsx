import { useMemo, useRef, useState } from "react";
import { useAllInvoices, useUpdateInvoice } from "@/hooks/useSaleInvoices";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeFileName } from "@/lib/sanitizeFileName";
import { toast } from "sonner";
import { downloadFile } from "@/utils/downloadFile";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  TrendingUp,
  Clock,
  CheckCircle2,
  Send,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
  Upload,
  Download,
  Paperclip,
  Loader2
} from "lucide-react";
import { format, addMonths, startOfMonth } from "date-fns";
import { nl } from "date-fns/locale";
import { Link } from "react-router-dom";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface CashflowOverviewProps {
  dateFrom?: string;
  dateTo?: string;
}

const statusConfig = {
  pending: { label: 'Concept', color: 'bg-gray-500', icon: Clock },
  sent: { label: 'Verstuurd', color: 'bg-blue-500', icon: Send },
  paid: { label: 'Betaald', color: 'bg-green-500', icon: CheckCircle2 },
  overdue: { label: 'Achterstallig', color: 'bg-red-500', icon: AlertCircle },
  cancelled: { label: 'Geannuleerd', color: 'bg-gray-400', icon: X },
};

export function CashflowOverview({ dateFrom, dateTo }: CashflowOverviewProps) {
  const { data: invoices, isLoading } = useAllInvoices({ dateFrom, dateTo });
  const updateInvoice = useUpdateInvoice();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingInvoiceId, setUploadingInvoiceId] = useState<string | null>(null);
  const [pendingUploadInvoice, setPendingUploadInvoice] = useState<{ id: string; saleId: string } | null>(null);

  const handleStatusChange = (invoiceId: string, newStatus: 'pending' | 'sent' | 'paid' | 'overdue') => {
    updateInvoice.mutate({ id: invoiceId, status: newStatus });
  };

  const triggerFileUpload = (invoiceId: string, saleId: string) => {
    setPendingUploadInvoice({ id: invoiceId, saleId });
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingUploadInvoice) return;

    const { id: invoiceId, saleId } = pendingUploadInvoice;
    setUploadingInvoiceId(invoiceId);

    try {
      const sanitized = sanitizeFileName(file.name);
      const filePath = `invoices/${saleId}/${Date.now()}-${sanitized}`;
      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('project-documents')
        .getPublicUrl(filePath);

      updateInvoice.mutate({
        id: invoiceId,
        file_url: urlData.publicUrl,
      });
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Fout bij uploaden van factuur');
    } finally {
      setUploadingInvoiceId(null);
      setPendingUploadInvoice(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Calculate cashflow metrics
  const metrics = useMemo(() => {
    if (!invoices) return null;

    let totalIncoming = 0;
    let totalOutgoing = 0;
    let pendingIncoming = 0;
    let pendingOutgoing = 0;
    let paidIncoming = 0;
    let paidOutgoing = 0;

    invoices.forEach(inv => {
      if (inv.invoice_type === 'developer') {
        totalIncoming += inv.amount;
        if (inv.status === 'paid') {
          paidIncoming += inv.amount;
        } else {
          pendingIncoming += inv.amount;
        }
      } else {
        totalOutgoing += inv.amount;
        if (inv.status === 'paid') {
          paidOutgoing += inv.amount;
        } else {
          pendingOutgoing += inv.amount;
        }
      }
    });

    // Group by month for chart - dynamic range
    const monthlyData: Record<string, { incoming: number; outgoing: number }> = {};
    const now = new Date();
    const currentMonthKey = format(startOfMonth(now), 'yyyy-MM');
    
    // Find the latest invoice month among unpaid invoices
    let latestMonth = addMonths(startOfMonth(now), 5); // minimum 6 months
    invoices.forEach(inv => {
      if (!inv.invoice_date || inv.status === 'paid') return;
      const invDate = new Date(inv.invoice_date);
      if (invDate > latestMonth) latestMonth = invDate;
    });

    // Initialize all months from now to latestMonth
    let cursor = startOfMonth(now);
    const end = startOfMonth(latestMonth);
    while (cursor <= end) {
      const key = format(cursor, 'yyyy-MM');
      monthlyData[key] = { incoming: 0, outgoing: 0 };
      cursor = addMonths(cursor, 1);
    }

    // Aggregate by invoice date + calculate overdue
    const overdue = { incoming: 0, outgoing: 0 };
    invoices.forEach(inv => {
      if (!inv.invoice_date || inv.status === 'paid') return;
      const monthKey = format(new Date(inv.invoice_date), 'yyyy-MM');
      if (monthKey < currentMonthKey) {
        // Overdue: invoice_date is before the current month
        if (inv.invoice_type === 'developer') {
          overdue.incoming += inv.amount;
        } else {
          overdue.outgoing += inv.amount;
        }
      } else if (monthlyData[monthKey]) {
        if (inv.invoice_type === 'developer') {
          monthlyData[monthKey].incoming += inv.amount;
        } else {
          monthlyData[monthKey].outgoing += inv.amount;
        }
      }
    });

    return {
      totalIncoming,
      totalOutgoing,
      pendingIncoming,
      pendingOutgoing,
      paidIncoming,
      paidOutgoing,
      netPosition: totalIncoming - totalOutgoing,
      overdue,
      monthlyData: Object.entries(monthlyData).map(([month, data]) => ({
        month,
        ...data,
        net: data.incoming - data.outgoing,
      })),
    };
  }, [invoices]);

  // Separate invoices
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentMonthKey = format(startOfMonth(new Date()), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const toggleMonth = (month: string) => {
    setSelectedMonth(prev => prev === month ? null : month);
  };

  const scrollForecast = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 300;
    scrollRef.current.scrollBy({ 
      left: direction === 'left' ? -scrollAmount : scrollAmount, 
      behavior: 'smooth' 
    });
  };

  const developerInvoices = useMemo(() => {
    const base = invoices?.filter(i => i.invoice_type === 'developer' && i.status !== 'paid') || [];
    if (!selectedMonth) return base;
    if (selectedMonth === 'overdue') return base.filter(i => i.invoice_date && format(new Date(i.invoice_date), 'yyyy-MM') < currentMonthKey);
    return base.filter(i => i.invoice_date && format(new Date(i.invoice_date), 'yyyy-MM') === selectedMonth);
  }, [invoices, selectedMonth, currentMonthKey]);

  const partnerInvoices = useMemo(() => {
    const base = invoices?.filter(i => i.invoice_type === 'partner' && i.status !== 'paid') || [];
    if (!selectedMonth) return base;
    if (selectedMonth === 'overdue') return base.filter(i => i.invoice_date && format(new Date(i.invoice_date), 'yyyy-MM') < currentMonthKey);
    return base.filter(i => i.invoice_date && format(new Date(i.invoice_date), 'yyyy-MM') === selectedMonth);
  }, [invoices, selectedMonth, currentMonthKey]);

  const paidInvoices = useMemo(() => {
    const base = invoices?.filter(i => i.status === 'paid') || [];
    if (!selectedMonth) return base;
    if (selectedMonth === 'overdue') return [];
    return base.filter(i => i.paid_at && format(new Date(i.paid_at), 'yyyy-MM') === selectedMonth);
  }, [invoices, selectedMonth]);

  const selectedMonthLabel = useMemo(() => {
    if (!selectedMonth) return '';
    if (selectedMonth === 'overdue') return 'Achterstallig';
    return format(new Date(selectedMonth + '-01'), 'MMMM yyyy', { locale: nl });
  }, [selectedMonth]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const StatusIcon = ({ status }: { status: string }) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;
    const Icon = config.icon;
    return <Icon className="h-3.5 w-3.5" />;
  };

  const formatCurrencyLocal = (amount: number) => 
    `€${amount.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Cashflow Overzicht
        </CardTitle>
        <CardDescription>
          Overzicht van openstaande en verwachte betalingen
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-green-700 mb-1">
                <ArrowDownLeft className="h-4 w-4" />
                Te ontvangen
              </div>
              <p className="text-2xl font-bold text-green-700">
                {formatCurrencyLocal(metrics?.pendingIncoming || 0)}
              </p>
              <p className="text-xs text-green-600">
                {formatCurrencyLocal(metrics?.paidIncoming || 0)} al ontvangen
              </p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-orange-700 mb-1">
                <ArrowUpRight className="h-4 w-4" />
                Te betalen
              </div>
              <p className="text-2xl font-bold text-orange-700">
                {formatCurrencyLocal(metrics?.pendingOutgoing || 0)}
              </p>
              <p className="text-xs text-orange-600">
                {formatCurrencyLocal(metrics?.paidOutgoing || 0)} al betaald
              </p>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-primary mb-1">
                <TrendingUp className="h-4 w-4" />
                Verwachte Cashflow
              </div>
              <p className="text-2xl font-bold text-primary">
                {formatCurrencyLocal((metrics?.pendingIncoming || 0) - (metrics?.pendingOutgoing || 0))}
              </p>
              <p className="text-xs text-muted-foreground">
                Openstaand netto
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                Totaal Facturen
              </div>
              <p className="text-2xl font-bold">
                {invoices?.length || 0}
              </p>
              <p className="text-xs text-muted-foreground">
                {developerInvoices.length + partnerInvoices.length} openstaand
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Forecast - Scrollable */}
        {metrics && metrics.monthlyData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Maandelijkse Prognose (Openstaand)</h4>
            <div className="relative flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="shrink-0 hidden md:flex" 
                onClick={() => scrollForecast('left')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div 
                ref={scrollRef} 
                className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 snap-x"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {(metrics.overdue.incoming > 0 || metrics.overdue.outgoing > 0) && (
                  <Card 
                    className={`p-3 min-w-[140px] shrink-0 snap-start border-amber-500/50 bg-amber-50 cursor-pointer transition-all ${
                      selectedMonth === 'overdue' ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-sm'
                    }`}
                    onClick={() => toggleMonth('overdue')}
                  >
                    <p className="text-xs font-semibold text-amber-700 mb-2">Achterstallig</p>
                    <div className="space-y-1">
                      {metrics.overdue.incoming > 0 && (
                        <p className="text-xs text-green-600 font-medium">
                          +{formatCurrencyLocal(metrics.overdue.incoming)}
                        </p>
                      )}
                      {metrics.overdue.outgoing > 0 && (
                        <p className="text-xs text-orange-600 font-medium">
                          -{formatCurrencyLocal(metrics.overdue.outgoing)}
                        </p>
                      )}
                    </div>
                  </Card>
                )}
                {metrics.monthlyData.map((month) => (
                  <Card 
                    key={month.month} 
                    className={`p-3 min-w-[140px] shrink-0 snap-start cursor-pointer transition-all ${
                      selectedMonth === month.month ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-sm'
                    } ${
                      month.month === currentMonthKey && selectedMonth !== month.month ? 'border-primary/50 bg-primary/5' : ''
                    }`}
                    onClick={() => toggleMonth(month.month)}
                  >
                    <p className="text-xs text-muted-foreground mb-2">
                      {format(new Date(month.month + '-01'), 'MMM yyyy', { locale: nl })}
                    </p>
                    <div className="space-y-1">
                      {month.incoming > 0 && (
                        <p className="text-xs text-green-600 font-medium">
                          +{formatCurrencyLocal(month.incoming)}
                        </p>
                      )}
                      {month.outgoing > 0 && (
                        <p className="text-xs text-orange-600 font-medium">
                          -{formatCurrencyLocal(month.outgoing)}
                        </p>
                      )}
                      {month.incoming === 0 && month.outgoing === 0 && (
                        <p className="text-xs text-muted-foreground">-</p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="shrink-0 hidden md:flex" 
                onClick={() => scrollForecast('right')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Filter indicator */}
        {selectedMonth && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1.5 px-3 py-1">
              Gefilterd op: {selectedMonthLabel}
              <button onClick={() => setSelectedMonth(null)} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          </div>
        )}

        {/* Detailed Tables */}
        <Tabs defaultValue="incoming">
          <TabsList className="flex w-full overflow-x-auto justify-start">
            <TabsTrigger value="incoming" className="gap-2">
              <ArrowDownLeft className="h-4 w-4 text-green-600" />
              Te Ontvangen ({developerInvoices.length})
            </TabsTrigger>
            <TabsTrigger value="outgoing" className="gap-2">
              <ArrowUpRight className="h-4 w-4 text-orange-600" />
              Te Betalen ({partnerInvoices.length})
            </TabsTrigger>
            <TabsTrigger value="paid" className="gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Betaald ({paidInvoices.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="incoming" className="mt-4">
            {developerInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Geen openstaande facturen naar ontwikkelaars
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Verkoop</TableHead>
                    <TableHead>Factuurdatum</TableHead>
                    <TableHead>Termijn</TableHead>
                    <TableHead className="text-right">Bedrag</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bijlage</TableHead>
                    <TableHead>Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {developerInvoices.map((invoice: any) => {
                    const status = statusConfig[invoice.status as keyof typeof statusConfig];
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium truncate max-w-[200px]">
                              {invoice.sale?.project?.name || '-'}
                            </span>
                            {invoice.sale?.property_description && (
                              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {invoice.sale.property_description}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {invoice.invoice_date 
                            ? format(new Date(invoice.invoice_date), 'd MMM yyyy', { locale: nl })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {invoice.sale_payment?.title || '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-600">
                          {formatCurrencyLocal(invoice.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${status?.color} text-white gap-1`}>
                            <StatusIcon status={invoice.status} />
                            {status?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            {invoice.file_url ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => downloadFile(invoice.file_url)}>
                                    <Download className="h-4 w-4 text-green-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Download factuur</TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => triggerFileUpload(invoice.id, invoice.sale_id)}
                                    disabled={uploadingInvoiceId === invoice.id}
                                  >
                                    {uploadingInvoiceId === invoice.id 
                                      ? <Loader2 className="h-4 w-4 animate-spin" />
                                      : <Upload className="h-4 w-4 text-muted-foreground" />
                                    }
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Upload factuur PDF</TooltipContent>
                              </Tooltip>
                            )}
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <TooltipProvider>
                              {invoice.status === 'pending' && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => handleStatusChange(invoice.id, 'sent')}>
                                      <Send className="h-4 w-4 text-blue-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Markeer als verstuurd</TooltipContent>
                                </Tooltip>
                              )}
                              {invoice.status === 'sent' && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => handleStatusChange(invoice.id, 'paid')}>
                                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Markeer als betaald</TooltipContent>
                                </Tooltip>
                              )}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" asChild>
                                    <Link to={`/admin/verkopen/${invoice.sale_id}?tab=invoices`}>
                                      <ExternalLink className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Ga naar verkoop</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="outgoing" className="mt-4">
            {partnerInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Geen openstaande betalingen aan partners
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partner</TableHead>
                    <TableHead>Verkoop</TableHead>
                    <TableHead>Factuurdatum</TableHead>
                    <TableHead className="text-right">Bedrag</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bijlage</TableHead>
                    <TableHead>Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partnerInvoices.map((invoice: any) => {
                    const status = statusConfig[invoice.status as keyof typeof statusConfig];
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          {invoice.partner?.name || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="truncate max-w-[150px]">
                              {invoice.sale?.project?.name || '-'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {invoice.invoice_date 
                            ? format(new Date(invoice.invoice_date), 'd MMM yyyy', { locale: nl })
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-orange-600">
                          {formatCurrencyLocal(invoice.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${status?.color} text-white gap-1`}>
                            <StatusIcon status={invoice.status} />
                            {status?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            {invoice.file_url ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => downloadFile(invoice.file_url)}>
                                    <Download className="h-4 w-4 text-green-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Download factuur</TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => triggerFileUpload(invoice.id, invoice.sale_id)}
                                    disabled={uploadingInvoiceId === invoice.id}
                                  >
                                    {uploadingInvoiceId === invoice.id 
                                      ? <Loader2 className="h-4 w-4 animate-spin" />
                                      : <Upload className="h-4 w-4 text-muted-foreground" />
                                    }
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Upload factuur PDF</TooltipContent>
                              </Tooltip>
                            )}
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <TooltipProvider>
                              {invoice.status === 'pending' && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => handleStatusChange(invoice.id, 'sent')}>
                                      <Send className="h-4 w-4 text-blue-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Markeer als verstuurd</TooltipContent>
                                </Tooltip>
                              )}
                              {invoice.status === 'sent' && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => handleStatusChange(invoice.id, 'paid')}>
                                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Markeer als betaald</TooltipContent>
                                </Tooltip>
                              )}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" asChild>
                                    <Link to={`/admin/verkopen/${invoice.sale_id}?tab=invoices`}>
                                      <ExternalLink className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Ga naar verkoop</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="paid" className="mt-4">
            {paidInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Geen betaalde facturen gevonden
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Verkoop</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Factuurdatum</TableHead>
                    <TableHead>Betaald op</TableHead>
                    <TableHead className="text-right">Bedrag</TableHead>
                    <TableHead>Bijlage</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...paidInvoices]
                    .sort((a, b) => {
                      if (!a.paid_at) return 1;
                      if (!b.paid_at) return -1;
                      return new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime();
                    })
                    .map((invoice: any) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium truncate max-w-[200px]">
                              {invoice.sale?.project?.name || '-'}
                            </span>
                            {invoice.sale?.property_description && (
                              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {invoice.sale.property_description}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {invoice.invoice_type === 'developer' ? (
                            <Badge className="bg-green-500 text-white">Ontvangen</Badge>
                          ) : (
                            <Badge className="bg-orange-500 text-white">Betaald</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {invoice.invoice_date
                            ? format(new Date(invoice.invoice_date), 'd MMM yyyy', { locale: nl })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {invoice.paid_at
                            ? format(new Date(invoice.paid_at), 'd MMM yyyy', { locale: nl })
                            : '-'}
                        </TableCell>
                        <TableCell className={`text-right font-mono ${invoice.invoice_type === 'developer' ? 'text-green-600' : 'text-orange-600'}`}>
                          {formatCurrencyLocal(invoice.amount)}
                        </TableCell>
                        <TableCell>
                          {invoice.file_url && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => downloadFile(invoice.file_url)}>
                                    <Download className="h-4 w-4 text-green-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Download factuur</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" asChild>
                                  <Link to={`/admin/verkopen/${invoice.sale_id}?tab=invoices`}>
                                    <ExternalLink className="h-4 w-4" />
                                  </Link>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ga naar verkoop</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        onChange={handleFileUpload}
        className="hidden"
      />
    </Card>
  );
}
