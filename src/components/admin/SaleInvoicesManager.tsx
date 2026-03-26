import { useState, useMemo, useRef, useEffect } from "react";
import { 
  useSaleInvoices, 
  useCreateInvoice, 
  useUpdateInvoice, 
  useDeleteInvoice,
  useGenerateInvoicesFromPayments,
  useCreateDeveloperInvoiceWithPartners,
  SaleInvoice,
  CreateInvoiceInput 
} from "@/hooks/useSaleInvoices";
import { useSalePayments } from "@/hooks/useSalePayments";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Wand2,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
  Euro,
  Upload,
  Download,
  Paperclip,
  Calculator
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import { sanitizeFileName } from "@/lib/sanitizeFileName";

interface SaleInvoicesManagerProps {
  saleId: string;
  salePrice: number;
  tisCommission: number;
  giftTotal: number;
  expectedDeliveryDate?: string;
}

const statusConfig = {
  pending: { label: 'Nog niet gemaakt', color: 'bg-gray-500', icon: Clock },
  sent: { label: 'Verstuurd', color: 'bg-blue-500', icon: Send },
  paid: { label: 'Betaald', color: 'bg-green-500', icon: CheckCircle2 },
  overdue: { label: 'Achterstallig', color: 'bg-red-500', icon: AlertCircle },
};

export function SaleInvoicesManager({ 
  saleId, 
  salePrice, 
  tisCommission, 
  giftTotal,
  expectedDeliveryDate,
}: SaleInvoicesManagerProps) {
  const { data: invoices, isLoading } = useSaleInvoices(saleId);
  const { data: payments } = useSalePayments(saleId);
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();
  const generateInvoices = useGenerateInvoicesFromPayments();
  const createDevWithPartners = useCreateDeveloperInvoiceWithPartners();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<SaleInvoice | null>(null);
  const [uploadingInvoiceId, setUploadingInvoiceId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  type FormData = Partial<CreateInvoiceInput> & { 
    status?: 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled'; 
    partner_id?: string;
    isLastInvoice?: boolean;
  };
  const [formData, setFormData] = useState<FormData>({});

  // Fetch partners for this sale
  const { data: salePartners } = useQuery({
    queryKey: ['sale-partners-for-invoices', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale_partners')
        .select('partner_id, commission_percentage, partner:partners(name)')
        .eq('sale_id', saleId);
      if (error) throw error;
      return data;
    },
  });

  // Separate invoices by type
  const developerInvoices = useMemo(() => 
    invoices?.filter(i => i.invoice_type === 'developer') || [], 
    [invoices]
  );
  const partnerInvoices = useMemo(() => 
    invoices?.filter(i => i.invoice_type === 'partner') || [],
    [invoices]
  );

  // Calculate remaining amount for last invoice (dynamic based on giftTotal)
  const { remainingAmount, previousInvoicesTotal } = useMemo(() => {
    const previousTotal = developerInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const remaining = tisCommission - giftTotal - previousTotal;
    return { 
      remainingAmount: Math.max(0, Math.round(remaining * 100) / 100),
      previousInvoicesTotal: previousTotal 
    };
  }, [developerInvoices, tisCommission, giftTotal]);

  // Calculate totals and counts
  const { totals, statusCounts } = useMemo(() => {
    if (!invoices) return { 
      totals: { incoming: 0, outgoing: 0, pendingIn: 0, pendingOut: 0 },
      statusCounts: { pending: 0, sent: 0, paid: 0 }
    };
    
    let incoming = 0, outgoing = 0, pendingIn = 0, pendingOut = 0;
    let pending = 0, sent = 0, paid = 0;
    
    invoices.forEach(inv => {
      if (inv.invoice_type === 'developer') {
        incoming += inv.amount;
        if (inv.status !== 'paid') pendingIn += inv.amount;
        
        if (inv.status === 'pending') pending++;
        else if (inv.status === 'sent') sent++;
        else if (inv.status === 'paid') paid++;
      } else {
        outgoing += inv.amount;
        if (inv.status !== 'paid') pendingOut += inv.amount;
      }
    });
    
    return { 
      totals: { incoming, outgoing, pendingIn, pendingOut },
      statusCounts: { pending, sent, paid }
    };
  }, [invoices]);

  // Update amount and date when isLastInvoice changes
  useEffect(() => {
    if (formData.invoice_type === 'developer' && formData.isLastInvoice && !editingInvoice) {
      setFormData(prev => ({ 
        ...prev, 
        amount: remainingAmount,
        invoice_date: expectedDeliveryDate || prev.invoice_date,
      }));
    }
  }, [formData.isLastInvoice, remainingAmount, formData.invoice_type, editingInvoice, expectedDeliveryDate]);

  const handleOpenAdd = (type: 'developer' | 'partner') => {
    setEditingInvoice(null);
    setFormData({
      sale_id: saleId,
      invoice_type: type,
      amount: 0,
      invoice_date: new Date().toISOString().split('T')[0],
      isLastInvoice: false,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (invoice: SaleInvoice) => {
    setEditingInvoice(invoice);
    setFormData({
      amount: invoice.amount,
      invoice_date: invoice.invoice_date || '',
      due_date: invoice.due_date || '',
      status: invoice.status,
      notes: invoice.notes || '',
      partner_id: invoice.partner_id || '',
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    // Extract isLastInvoice before cleaning (it's frontend-only, not a DB column)
    const { isLastInvoice, ...restFormData } = formData;
    
    // Clean up empty strings for date fields to prevent PostgreSQL errors
    const cleanedFormData = {
      ...restFormData,
      invoice_date: formData.invoice_date || undefined,
      due_date: formData.due_date || undefined,
    };

    if (editingInvoice) {
      updateInvoice.mutate({
        id: editingInvoice.id,
        ...cleanedFormData,
      } as any, {
        onSuccess: () => setDialogOpen(false),
      });
    } else if (formData.invoice_type === 'developer' && hasPartners) {
      // Create developer invoice with automatic partner invoices
      createDevWithPartners.mutate({
        saleId,
        amount: formData.amount || 0,
        notes: formData.notes,
        invoice_date: formData.invoice_date,
        isLastInvoice,
        partners: salePartners?.map(p => ({
          partner_id: p.partner_id,
          commission_percentage: p.commission_percentage || 0,
        })) || [],
      }, {
        onSuccess: () => setDialogOpen(false),
      });
    } else {
      // Voor verkopen zonder partners
      createInvoice.mutate(cleanedFormData as CreateInvoiceInput, {
        onSuccess: async () => {
          // Update completion_date if it's the last invoice
          if (isLastInvoice && formData.invoice_date) {
            await supabase
              .from('sales')
              .update({ completion_date: formData.invoice_date })
              .eq('id', saleId);
          }
          setDialogOpen(false);
        },
      });
    }
  };

  const handleGenerateInvoices = () => {
    generateInvoices.mutate({
      saleId,
      salePrice,
      tisCommission,
      giftTotal,
      partners: salePartners?.map(p => ({
        partner_id: p.partner_id,
        commission_percentage: p.commission_percentage || 0,
      })) || [],
    });
  };

  const handleMarkAsPaid = (invoice: SaleInvoice) => {
    updateInvoice.mutate({
      id: invoice.id,
      status: 'paid',
      paid_at: new Date().toISOString(),
    });
  };

  const handleMarkAsSent = (invoice: SaleInvoice) => {
    updateInvoice.mutate({
      id: invoice.id,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });
  };

  // File upload handling
  const handleFileUploadClick = (invoiceId: string) => {
    setUploadingInvoiceId(invoiceId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !uploadingInvoiceId) return;

    try {
      // Sanitize filename for storage
      const originalName = file.name;
      const sanitizedName = sanitizeFileName(originalName);
      const uploadFile = sanitizedName === originalName
        ? file
        : new File([file], sanitizedName, { type: file.type, lastModified: file.lastModified });

      const filePath = `${saleId}/${uploadingInvoiceId}-${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from('sale-invoices')
        .upload(filePath, uploadFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('sale-invoices')
        .getPublicUrl(filePath);

      // Update invoice with file URL
      updateInvoice.mutate({
        id: uploadingInvoiceId,
        file_url: publicUrl,
      });

      toast.success('Bijlage geüpload');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Fout bij uploaden');
    } finally {
      setUploadingInvoiceId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Check if this sale has partners

  // Check if this sale has partners
  const hasPartners = salePartners && salePartners.length > 0;

  // Check if there are paid payments without invoices
  const paidPaymentsCount = payments?.filter(p => p.status === 'paid').length || 0;
  const developerInvoicesCount = developerInvoices.length;
  const canGenerateInvoices = paidPaymentsCount > developerInvoicesCount;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
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

  return (
    <TooltipProvider>
    <div className="space-y-6">
      {/* Hidden file input for uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx"
        className="hidden"
      />

      {/* Summary Cards */}
      <div className={`grid gap-4 ${hasPartners ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-4'}`}>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <ArrowDownLeft className="h-4 w-4 text-green-600" />
              Te ontvangen
            </div>
            <p className="text-2xl font-bold text-green-600">
              €{totals.incoming.toLocaleString('nl-NL')}
            </p>
            {totals.pendingIn > 0 && (
              <p className="text-xs text-muted-foreground">
                €{totals.pendingIn.toLocaleString('nl-NL')} openstaand
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="h-4 w-4 text-gray-500" />
              Nog te maken
            </div>
            <p className="text-2xl font-bold text-gray-600">
              {statusCounts.pending}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Send className="h-4 w-4 text-blue-500" />
              Verstuurd
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {statusCounts.sent}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Betaald
            </div>
            <p className="text-2xl font-bold text-green-600">
              {statusCounts.paid}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Generate Invoices Button */}
      {canGenerateInvoices && (
        <Card className="border-dashed border-primary/50 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Facturen genereren</p>
                <p className="text-sm text-muted-foreground">
                  Er zijn {paidPaymentsCount - developerInvoicesCount} betaalde termijnen zonder factuur
                </p>
              </div>
              <Button onClick={handleGenerateInvoices} disabled={generateInvoices.isPending}>
                <Wand2 className="h-4 w-4 mr-2" />
                {generateInvoices.isPending ? 'Genereren...' : 'Genereer Facturen'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Developer Invoices (Incoming) */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <ArrowDownLeft className="h-5 w-5 text-green-600" />
                <span className="hidden sm:inline">Facturen naar Ontwikkelaar (Inkomend)</span>
                <span className="sm:hidden">Inkomend</span>
              </CardTitle>
              <CardDescription className="hidden sm:block">
                Commissie facturen te ontvangen van de projectontwikkelaar
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleOpenAdd('developer')}>
              <Plus className="h-4 w-4 mr-2" />
              Handmatig
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {developerInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nog geen facturen naar ontwikkelaar. 
              {paidPaymentsCount > 0 && ' Klik op "Genereer Facturen" hierboven.'}
            </p>
          ) : (
            <>
            {/* Desktop table */}
            <Table className="hidden md:table">
              <TableHeader>
                <TableRow>
                  <TableHead>Omschrijving</TableHead>
                  <TableHead className="text-right">Bedrag</TableHead>
                  <TableHead>Verwachte datum</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Bijlage</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {developerInvoices.map((invoice) => {
                  const status = statusConfig[invoice.status];
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <span className="font-medium">
                          {invoice.notes || invoice.sale_payment?.title || 'Commissie factuur'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        €{invoice.amount.toLocaleString('nl-NL')}
                      </TableCell>
                      <TableCell>
                        {invoice.invoice_date 
                          ? format(new Date(invoice.invoice_date), 'd MMM yyyy', { locale: nl })
                          : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${status.color} text-white gap-1`}>
                          <StatusIcon status={invoice.status} />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {invoice.file_url ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(invoice.file_url!, '_blank')}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Download bijlage</TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleFileUploadClick(invoice.id)}
                                disabled={uploadingInvoiceId === invoice.id}
                              >
                                <Upload className="h-4 w-4 mr-1" />
                                {uploadingInvoiceId === invoice.id ? 'Uploaden...' : 'Upload'}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Upload factuur PDF</TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {invoice.status === 'pending' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleMarkAsSent(invoice)}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Markeer als verstuurd</TooltipContent>
                            </Tooltip>
                          )}
                          {invoice.status === 'sent' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleMarkAsPaid(invoice)}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Markeer als betaald</TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleOpenEdit(invoice)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Bewerken</TooltipContent>
                          </Tooltip>
                          <AlertDialog>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                              </TooltipTrigger>
                              <TooltipContent>Verwijderen</TooltipContent>
                            </Tooltip>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Factuur verwijderen?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Deze actie kan niet ongedaan worden gemaakt.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuleren</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteInvoice.mutate({ id: invoice.id, saleId })}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Verwijderen
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {developerInvoices.map((invoice) => {
                const status = statusConfig[invoice.status];
                return (
                  <Card key={invoice.id} className="border">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-sm">
                          {invoice.notes || invoice.sale_payment?.title || 'Commissie factuur'}
                        </span>
                        <Badge className={`${status.color} text-white gap-1 shrink-0`}>
                          <StatusIcon status={invoice.status} />
                          {status.label}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {invoice.invoice_date 
                            ? format(new Date(invoice.invoice_date), 'd MMM yyyy', { locale: nl })
                            : '-'}
                        </span>
                        <span className="font-mono text-green-600 font-medium">
                          €{invoice.amount.toLocaleString('nl-NL')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 pt-1">
                        {invoice.file_url ? (
                          <Button variant="ghost" size="sm" onClick={() => window.open(invoice.file_url!, '_blank')}>
                            <Download className="h-4 w-4 mr-1" /> Download
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => handleFileUploadClick(invoice.id)}>
                            <Upload className="h-4 w-4 mr-1" /> Upload
                          </Button>
                        )}
                        {invoice.status === 'pending' && (
                          <Button variant="ghost" size="icon" onClick={() => handleMarkAsSent(invoice)}>
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                        {invoice.status === 'sent' && (
                          <Button variant="ghost" size="icon" onClick={() => handleMarkAsPaid(invoice)}>
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(invoice)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Factuur verwijderen?</AlertDialogTitle>
                              <AlertDialogDescription>Deze actie kan niet ongedaan worden gemaakt.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuleren</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteInvoice.mutate({ id: invoice.id, saleId })} className="bg-destructive text-destructive-foreground">Verwijderen</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Partner Invoices (Outgoing) - Only show if there are partners */}
      {hasPartners && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <ArrowUpRight className="h-5 w-5 text-orange-600" />
                  <span className="hidden sm:inline">Betalingen aan Partners (Uitgaand)</span>
                  <span className="sm:hidden">Uitgaand</span>
                </CardTitle>
                <CardDescription className="hidden sm:block">
                  Commissie betalingen verschuldigd aan partners
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleOpenAdd('partner')}>
                <Plus className="h-4 w-4 mr-2" />
                Handmatig
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {partnerInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nog geen partner betalingen.
                {paidPaymentsCount > 0 && 
                  ' Deze worden automatisch aangemaakt bij "Genereer Facturen".'
                }
              </p>
            ) : (
              <>
              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Partner</TableHead>
                    <TableHead>Omschrijving</TableHead>
                    <TableHead className="text-right">Bedrag</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bijlage</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partnerInvoices.map((invoice) => {
                    const status = statusConfig[invoice.status];
                    // Check if developer invoice for same payment is paid
                    const relatedDevInvoice = developerInvoices.find(
                      d => d.sale_payment_id === invoice.sale_payment_id
                    );
                    const canPay = relatedDevInvoice?.status === 'paid';

                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          {invoice.partner?.name || '-'}
                        </TableCell>
                        <TableCell>
                          {invoice.notes || invoice.sale_payment?.title || '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-orange-600">
                          €{invoice.amount.toLocaleString('nl-NL')}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${status.color} text-white gap-1`}>
                            <StatusIcon status={invoice.status} />
                            {status.label}
                          </Badge>
                          {!canPay && invoice.status !== 'paid' && (
                            <span className="text-xs text-muted-foreground block mt-1">
                              Wacht op ontwikkelaar
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {invoice.file_url ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(invoice.file_url!, '_blank')}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Download
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Download bijlage</TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleFileUploadClick(invoice.id)}
                                  disabled={uploadingInvoiceId === invoice.id}
                                >
                                  <Upload className="h-4 w-4 mr-1" />
                                  {uploadingInvoiceId === invoice.id ? 'Uploaden...' : 'Upload'}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Upload factuur PDF</TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {canPay && invoice.status !== 'paid' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleMarkAsPaid(invoice)}
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Markeer als betaald</TooltipContent>
                              </Tooltip>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleOpenEdit(invoice)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Bewerken</TooltipContent>
                            </Tooltip>
                            <AlertDialog>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>Verwijderen</TooltipContent>
                              </Tooltip>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Betaling verwijderen?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Deze actie kan niet ongedaan worden gemaakt.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuleren</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteInvoice.mutate({ id: invoice.id, saleId })}
                                    className="bg-destructive text-destructive-foreground"
                                  >
                                    Verwijderen
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Mobile cards for partner invoices */}
              <div className="space-y-3 md:hidden">
                {partnerInvoices.map((invoice) => {
                  const status = statusConfig[invoice.status];
                  const relatedDevInvoice = developerInvoices.find(
                    d => d.sale_payment_id === invoice.sale_payment_id
                  );
                  const canPay = relatedDevInvoice?.status === 'paid';

                  return (
                    <Card key={invoice.id} className="border">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-medium text-sm">{invoice.partner?.name || '-'}</span>
                            <div className="text-xs text-muted-foreground truncate">
                              {invoice.notes || invoice.sale_payment?.title || '-'}
                            </div>
                          </div>
                          <Badge className={`${status.color} text-white gap-1 shrink-0`}>
                            <StatusIcon status={invoice.status} />
                            {status.label}
                          </Badge>
                        </div>
                        <div className="text-sm font-mono text-orange-600 font-medium">
                          €{invoice.amount.toLocaleString('nl-NL')}
                        </div>
                        {!canPay && invoice.status !== 'paid' && (
                          <span className="text-xs text-muted-foreground">Wacht op ontwikkelaar</span>
                        )}
                        <div className="flex items-center gap-1 pt-1">
                          {invoice.file_url ? (
                            <Button variant="ghost" size="sm" onClick={() => window.open(invoice.file_url!, '_blank')}>
                              <Download className="h-4 w-4 mr-1" /> Download
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => handleFileUploadClick(invoice.id)}>
                              <Upload className="h-4 w-4 mr-1" /> Upload
                            </Button>
                          )}
                          {canPay && invoice.status !== 'paid' && (
                            <Button variant="ghost" size="icon" onClick={() => handleMarkAsPaid(invoice)}>
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(invoice)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Factuur verwijderen?</AlertDialogTitle>
                                <AlertDialogDescription>Deze actie kan niet ongedaan worden gemaakt.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuleren</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteInvoice.mutate({ id: invoice.id, saleId })} className="bg-destructive text-destructive-foreground">Verwijderen</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingInvoice 
                ? 'Factuur Bewerken' 
                : formData.invoice_type === 'developer' 
                  ? 'TIS Factuur Toevoegen' 
                  : 'Partner Factuur Toevoegen'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Checkbox voor laatste factuur - alleen bij nieuwe developer facturen */}
            {!editingInvoice && formData.invoice_type === 'developer' && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isLastInvoice"
                  checked={formData.isLastInvoice || false}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, isLastInvoice: checked as boolean })
                  }
                />
                <Label htmlFor="isLastInvoice" className="cursor-pointer">
                  Dit is de laatste factuur
                </Label>
              </div>
            )}

            {/* Berekeningsoverzicht - alleen bij developer facturen */}
            {formData.invoice_type === 'developer' && !editingInvoice && (
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 font-medium mb-2">
                  <Calculator className="h-4 w-4" />
                  Berekening
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Totale TIS commissie:</span>
                  <span className="font-mono">€{tisCommission.toLocaleString('nl-NL')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cadeau:</span>
                  <span className="font-mono text-orange-600">-€{giftTotal.toLocaleString('nl-NL')}</span>
                </div>
                {previousInvoicesTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vorige facturen:</span>
                    <span className="font-mono text-orange-600">-€{previousInvoicesTotal.toLocaleString('nl-NL')}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Resterend bedrag:</span>
                  <span className="font-mono text-green-600">€{remainingAmount.toLocaleString('nl-NL')}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Bedrag (€)</Label>
              <Input
                type="number"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                disabled={formData.isLastInvoice}
              />
              {formData.isLastInvoice && (
                <p className="text-xs text-muted-foreground">
                  Automatisch berekend op basis van resterend bedrag
                </p>
              )}
            </div>

            {/* Partner preview - bij nieuwe developer facturen met partners */}
            {!editingInvoice && formData.invoice_type === 'developer' && hasPartners && (formData.amount || 0) > 0 && (
              <div className="rounded-lg border bg-primary/5 p-4 space-y-2 text-sm">
                <div className="font-medium mb-2">Partner facturen die worden aangemaakt:</div>
                {salePartners?.map((sp) => (
                  <div key={sp.partner_id} className="flex justify-between">
                    <span>{sp.partner?.name} ({sp.commission_percentage}%):</span>
                    <span className="font-mono text-orange-600">
                      €{((formData.amount || 0) * ((sp.commission_percentage || 0) / 100)).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Verwachte datum</Label>
                <Input
                  type="date"
                  value={formData.invoice_date || ''}
                  onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Vervaldatum</Label>
                <Input
                  type="date"
                  value={formData.due_date || ''}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>
            {editingInvoice && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Nog niet gemaakt</SelectItem>
                    <SelectItem value="sent">Verstuurd</SelectItem>
                    <SelectItem value="paid">Betaald</SelectItem>
                    <SelectItem value="overdue">Achterstallig</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* Partner selectie - alleen voor partner facturen */}
            {(editingInvoice?.invoice_type === 'partner' || formData.invoice_type === 'partner') && hasPartners && (
              <div className="space-y-2">
                <Label>Partner</Label>
                <Select
                  value={formData.partner_id || ''}
                  onValueChange={(value) => setFormData({ ...formData, partner_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer partner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {salePartners?.map((sp) => (
                      <SelectItem key={sp.partner_id} value={sp.partner_id}>
                        {sp.partner?.name || 'Partner'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Omschrijving / Notities</Label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Bijv. Pro-rata commissie voor Reservatie..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuleren
            </Button>
            <Button 
              onClick={handleSave}
              disabled={createInvoice.isPending || updateInvoice.isPending || createDevWithPartners.isPending}
            >
              {createInvoice.isPending || updateInvoice.isPending || createDevWithPartners.isPending ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}
