import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
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
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  Wallet, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Trash2,
  Edit,
  FileText,
  Sparkles,
  Euro,
  Loader2,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  useSalePayments,
  useCreatePayment,
  useUpdatePayment,
  useDeletePayment,
  useExtractPaymentsFromContract,
  useBulkCreatePayments,
  SalePayment,
  CreatePaymentInput,
} from '@/hooks/useSalePayments';
import { useSalePaymentProofsBatch } from '@/hooks/useSalePaymentProofs';
import { PaymentProofsSection } from './PaymentProofsSection';

interface SalePaymentsManagerProps {
  saleId: string;
  salePrice: number;
  expectedDeliveryDate?: string | null;
}

interface ExtractedPayment {
  title: string;
  amount: number;
  percentage: number | null;
  due_condition: string;
  order_index: number;
}

export function SalePaymentsManager({ saleId, salePrice, expectedDeliveryDate }: SalePaymentsManagerProps) {
  const { data: payments = [], isLoading } = useSalePayments(saleId);
  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();
  const deletePayment = useDeletePayment();
  const extractPayments = useExtractPaymentsFromContract();
  const bulkCreatePayments = useBulkCreatePayments();

  // Fetch all proofs for all payments in one batch
  const paymentIds = useMemo(() => payments.map(p => p.id), [payments]);
  const { data: proofsMap = {} } = useSalePaymentProofsBatch(paymentIds);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingPayment, setEditingPayment] = useState<SalePayment | null>(null);
  const [formData, setFormData] = useState<Partial<CreatePaymentInput>>({});

  // Extraction state
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [extractedPayments, setExtractedPayments] = useState<ExtractedPayment[]>([]);
  const [extractionNotes, setExtractionNotes] = useState<string | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  // Fetch sale documents to find purchase contract
  const { data: saleDocuments = [] } = useQuery({
    queryKey: ['sale-documents', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale_documents')
        .select('id, title, document_type, file_url, file_name')
        .eq('sale_id', saleId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!saleId,
  });

  const purchaseContract = saleDocuments.find(
    (doc) => doc.document_type === 'purchase_contract'
  );

  // VAT calculations
  const vatRate = 0.10; // 10% BTW
  const vatAmount = salePrice * vatRate;
  const totalRequired = salePrice + vatAmount; // Total incl. VAT

  // Calculate totals
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const paidAmount = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + (p.paid_amount || p.amount), 0);
  const pendingAmount = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);
  const overdueAmount = payments
    .filter(p => p.status === 'overdue')
    .reduce((sum, p) => sum + p.amount, 0);

  // Remaining amount to be assigned
  const remainingAmount = totalRequired - totalAmount;
  const isPaymentPlanComplete = Math.abs(remainingAmount) < 100;

  const nextPayment = payments.find(p => p.status === 'pending' || p.status === 'overdue');

  // Calculate remaining amount for new payment
  const calculateRemainingAmount = () => {
    return Math.round(totalRequired - totalAmount);
  };

  const handleOpenAdd = () => {
    setFormData({
      customer_visible: true,
      partner_visible: true,
      order_index: payments.length,
      includes_vat: true,
    });
    setEditingPayment(null);
    setShowAddDialog(true);
  };

  const handleOpenEdit = (payment: SalePayment) => {
    setFormData({
      title: payment.title,
      description: payment.description || '',
      amount: payment.amount,
      percentage: payment.percentage || undefined,
      due_date: payment.due_date || undefined,
      due_condition: payment.due_condition || undefined,
      customer_visible: payment.customer_visible,
      partner_visible: payment.partner_visible,
      admin_notes: payment.admin_notes || undefined,
      order_index: payment.order_index,
      includes_vat: payment.includes_vat ?? true,
    });
    setEditingPayment(payment);
    setShowAddDialog(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.amount) return;

    if (editingPayment) {
      await updatePayment.mutateAsync({
        id: editingPayment.id,
        ...formData,
      });
    } else {
      await createPayment.mutateAsync({
        sale_id: saleId,
        title: formData.title,
        amount: formData.amount,
        description: formData.description,
        percentage: formData.percentage,
        due_date: formData.due_date,
        due_condition: formData.due_condition,
        customer_visible: formData.customer_visible ?? true,
        partner_visible: formData.partner_visible ?? true,
        admin_notes: formData.admin_notes,
        order_index: formData.order_index ?? payments.length,
        includes_vat: formData.includes_vat ?? true,
      });
    }
    setShowAddDialog(false);
    setFormData({});
    setEditingPayment(null);
  };

  const handleMarkAsPaid = async (payment: SalePayment) => {
    await updatePayment.mutateAsync({
      id: payment.id,
      status: 'paid',
      paid_at: new Date().toISOString(),
      paid_amount: payment.amount,
    });
  };

  const handleExtractFromContract = async () => {
    if (!purchaseContract?.file_url) return;

    setExtractionError(null);
    setExtractedPayments([]);
    setExtractionNotes(null);

    const result = await extractPayments.mutateAsync({
      fileUrl: purchaseContract.file_url,
      salePrice,
    });

    if (result.success && result.payments && result.payments.length > 0) {
      setExtractedPayments(result.payments);
      setExtractionNotes(result.notes || null);
      setShowPreviewDialog(true);
    } else {
      setExtractionError(result.error || 'Geen betalingsschema gevonden in het contract');
    }
  };

  const handleConfirmExtraction = async () => {
    await bulkCreatePayments.mutateAsync({
      saleId,
      payments: extractedPayments.map((p, idx) => ({
        title: p.title,
        amount: p.amount,
        percentage: p.percentage,
        due_condition: p.due_condition,
        order_index: idx,
        customer_visible: true,
        partner_visible: true,
      })),
    });
    setShowPreviewDialog(false);
    setExtractedPayments([]);
  };

  const updateExtractedPayment = (index: number, field: keyof ExtractedPayment, value: any) => {
    setExtractedPayments(prev => 
      prev.map((p, i) => i === index ? { ...p, [field]: value } : p)
    );
  };

  const removeExtractedPayment = (index: number) => {
    setExtractedPayments(prev => prev.filter((_, i) => i !== index));
  };

  const extractedTotal = extractedPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalDifference = Math.abs(extractedTotal - salePrice);
  const totalMatches = totalDifference < 100; // Allow small rounding differences

  const getStatusBadge = (status: string, paymentId: string, paymentAmount: number) => {
    const proofs = proofsMap[paymentId] || [];
    const totalProofsAmount = proofs.reduce((sum, p) => sum + (p.amount || 0), 0);
    const hasPartialPayment = totalProofsAmount > 0 && totalProofsAmount < paymentAmount;
    
    // If there's partial payment and status is not already 'paid', show partial badge
    if (hasPartialPayment && status !== 'paid') {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
          <Clock className="h-3 w-3 mr-1" />
          Deels betaald
        </Badge>
      );
    }
    
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
  
  // Helper to check if payment has partial proof
  const hasPartialProof = (paymentId: string, paymentAmount: number) => {
    const proofs = proofsMap[paymentId] || [];
    const totalProofsAmount = proofs.reduce((sum, p) => sum + (p.amount || 0), 0);
    return totalProofsAmount > 0 && totalProofsAmount < paymentAmount;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Plan Overview - VAT Validation */}
      <Card className={`border-2 ${
        isPaymentPlanComplete 
          ? 'border-green-200 bg-green-50/50' 
          : remainingAmount > 0 
            ? 'border-yellow-200 bg-yellow-50/50' 
            : 'border-red-200 bg-red-50/50'
      }`}>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Aankoopprijs</div>
              <div className="text-lg font-semibold">€{salePrice.toLocaleString('nl-NL')}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">BTW (10%)</div>
              <div className="text-lg font-semibold">€{vatAmount.toLocaleString('nl-NL')}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground font-medium">Totaal te betalen</div>
              <div className="text-lg font-bold text-primary">€{totalRequired.toLocaleString('nl-NL')}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Som betalingen</div>
              <div className="text-lg font-semibold">€{totalAmount.toLocaleString('nl-NL')}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Nog toe te wijzen</div>
              <div className={`text-lg font-bold ${
                isPaymentPlanComplete 
                  ? 'text-green-600' 
                  : remainingAmount > 0 
                    ? 'text-yellow-600' 
                    : 'text-red-600'
              }`}>
                {isPaymentPlanComplete ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    Compleet
                  </span>
                ) : (
                  <>€{remainingAmount.toLocaleString('nl-NL')}</>
                )}
              </div>
            </div>
          </div>
          {!isPaymentPlanComplete && remainingAmount > 100 && (
            <Alert className="mt-3 border-yellow-300 bg-yellow-100/50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Het betaalplan is nog niet compleet. Voeg betalingen toe zodat de som gelijk is aan €{totalRequired.toLocaleString('nl-NL')} (aankoopprijs + BTW).
              </AlertDescription>
            </Alert>
          )}
          {remainingAmount < -100 && (
            <Alert variant="destructive" className="mt-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                De som van de betalingen (€{totalAmount.toLocaleString('nl-NL')}) overschrijdt het totaalbedrag (€{totalRequired.toLocaleString('nl-NL')}) met €{Math.abs(remainingAmount).toLocaleString('nl-NL')}.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Wallet className="h-4 w-4" />
              Totaal betalingen
            </div>
            <div className="text-2xl font-bold">€{totalAmount.toLocaleString('nl-NL')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Betaald
            </div>
            <div className="text-2xl font-bold text-green-600">
              €{paidAmount.toLocaleString('nl-NL')}
            </div>
            {totalAmount > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                {Math.round((paidAmount / totalRequired) * 100)}% van totaal
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Clock className="h-4 w-4 text-yellow-600" />
              Openstaand
            </div>
            <div className="text-2xl font-bold text-yellow-600">
              €{pendingAmount.toLocaleString('nl-NL')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Vervallen
            </div>
            <div className="text-2xl font-bold text-red-600">
              €{overdueAmount.toLocaleString('nl-NL')}
            </div>
          </CardContent>
        </Card>
      </div>

      {nextPayment && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-yellow-800 font-medium">Volgende betaling</div>
                <div className="text-lg font-bold text-yellow-900">
                  {nextPayment.title} - €{nextPayment.amount.toLocaleString('nl-NL')}
                </div>
                {nextPayment.due_date && (
                  <div className="text-sm text-yellow-700">
                    Deadline: {format(new Date(nextPayment.due_date), 'd MMMM yyyy', { locale: nl })}
                  </div>
                )}
                {nextPayment.due_condition && (
                  <div className="text-sm text-yellow-700">{nextPayment.due_condition}</div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMarkAsPaid(nextPayment)}
                className="border-yellow-400 text-yellow-800 hover:bg-yellow-100"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Markeer als betaald
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extraction Error */}
      {extractionError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{extractionError}</AlertDescription>
        </Alert>
      )}

      {/* Payment List */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Euro className="h-5 w-5" />
            Betaalplan
          </CardTitle>
          <div className="flex gap-2">
            {payments.length === 0 && (
              purchaseContract ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExtractFromContract}
                  disabled={extractPayments.isPending}
                >
                  {extractPayments.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1" />
                  )}
                  Uit Contract Halen
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  title="Upload eerst een koopcontract onder Documenten"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Geen koopcontract
                </Button>
              )
            )}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={handleOpenAdd}>
                  <Plus className="h-4 w-4 mr-1" />
                  Betaling toevoegen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingPayment ? 'Betaling bewerken' : 'Nieuwe betaling'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Titel *</Label>
                    <Input
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Bijv. Reservatie, Aanbetaling 30%"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Bedrag (€) *</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={formData.amount || ''}
                          onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                          placeholder="6000"
                          className="flex-1"
                        />
                        {!editingPayment && remainingAmount > 100 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setFormData({ 
                              ...formData, 
                              amount: calculateRemainingAmount(),
                              title: formData.title || 'Restbedrag',
                              due_date: expectedDeliveryDate || formData.due_date
                            })}
                            title="Vul automatisch het restbedrag en opleverdatum in"
                          >
                            <Sparkles className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {!editingPayment && remainingAmount > 100 && (
                        <p className="text-xs text-muted-foreground">
                          Nog €{calculateRemainingAmount().toLocaleString('nl-NL')} toe te wijzen
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Percentage (%)</Label>
                      <Input
                        type="number"
                        value={formData.percentage || ''}
                        onChange={(e) => setFormData({ ...formData, percentage: parseFloat(e.target.value) })}
                        placeholder="30"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Switch
                      checked={formData.includes_vat ?? true}
                      onCheckedChange={(checked) => setFormData({ ...formData, includes_vat: checked })}
                    />
                    <Label className="font-normal">
                      Bedrag is <span className="font-medium">{formData.includes_vat !== false ? 'inclusief' : 'exclusief'}</span> BTW
                    </Label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Deadline</Label>
                      <Input
                        type="date"
                        value={formData.due_date || ''}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Volgorde</Label>
                      <Input
                        type="number"
                        value={formData.order_index ?? payments.length}
                        onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Betalingsvoorwaarde</Label>
                    <Input
                      value={formData.due_condition || ''}
                      onChange={(e) => setFormData({ ...formData, due_condition: e.target.value })}
                      placeholder="Bijv. Bij ondertekening koopcontract"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Beschrijving</Label>
                    <Textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Optionele toelichting..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Admin notities</Label>
                    <Textarea
                      value={formData.admin_notes || ''}
                      onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
                      placeholder="Interne notities..."
                    />
                  </div>
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.customer_visible ?? true}
                        onCheckedChange={(checked) => setFormData({ ...formData, customer_visible: checked })}
                      />
                      <Label>Zichtbaar voor klant</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.partner_visible ?? true}
                        onCheckedChange={(checked) => setFormData({ ...formData, partner_visible: checked })}
                      />
                      <Label>Zichtbaar voor partner</Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Annuleren
                  </Button>
                  <Button 
                    onClick={handleSave}
                    disabled={!formData.title || !formData.amount || createPayment.isPending || updatePayment.isPending}
                  >
                    {editingPayment ? 'Opslaan' : 'Toevoegen'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nog geen betalingen toegevoegd</p>
              {purchaseContract ? (
                <p className="text-sm">Klik op "Uit Contract Halen" om betalingen te extraheren</p>
              ) : (
                <p className="text-sm">Upload eerst een koopcontract onder Documenten</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment, index) => {
                const isPartiallyPaid = hasPartialProof(payment.id, payment.amount);
                return (
                  <div
                    key={payment.id}
                    className={`border rounded-lg p-4 ${
                      payment.status === 'paid' 
                        ? 'bg-green-50 border-green-200' 
                        : payment.status === 'overdue'
                        ? 'bg-red-50 border-red-200'
                        : isPartiallyPaid
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-background'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{payment.title}</span>
                            {getStatusBadge(payment.status, payment.id, payment.amount)}
                            {payment.percentage && (
                              <Badge variant="outline">{payment.percentage}%</Badge>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {payment.includes_vat !== false ? 'incl. BTW' : 'excl. BTW'}
                            </Badge>
                          </div>
                          <div className="text-lg font-bold mt-1">
                            €{payment.amount.toLocaleString('nl-NL')}
                          </div>
                          {payment.description && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {payment.description}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                            {payment.due_date && (
                              <span>
                                Deadline: {format(new Date(payment.due_date), 'd MMM yyyy', { locale: nl })}
                              </span>
                            )}
                            {payment.due_condition && (
                              <span>{payment.due_condition}</span>
                            )}
                            {payment.paid_at && (
                              <span className="text-green-700">
                                Betaald op: {format(new Date(payment.paid_at), 'd MMM yyyy', { locale: nl })}
                              </span>
                            )}
                          </div>
                          
                          {/* Payment Proofs Section */}
                          <div className="mt-3">
                            <PaymentProofsSection
                              paymentId={payment.id}
                              saleId={saleId}
                              proofs={proofsMap[payment.id] || []}
                              paymentAmount={payment.amount}
                              paymentStatus={payment.status}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        {payment.status !== 'paid' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkAsPaid(payment)}
                          >
                            <CheckCircle2 className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Betaald</span>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(payment)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Betaling verwijderen?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Weet je zeker dat je "{payment.title}" wilt verwijderen?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuleren</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deletePayment.mutate({ id: payment.id, saleId })}
                              >
                                Verwijderen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extraction Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Geëxtraheerd Betaalplan
            </DialogTitle>
            <DialogDescription>
              Controleer en pas aan indien nodig voordat je opslaat.
            </DialogDescription>
          </DialogHeader>

          {extractionNotes && (
            <Alert>
              <AlertDescription>{extractionNotes}</AlertDescription>
            </Alert>
          )}

          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titel</TableHead>
                  <TableHead className="w-[140px]">Bedrag (€)</TableHead>
                  <TableHead className="w-[80px]">%</TableHead>
                  <TableHead>Conditie</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {extractedPayments.map((payment, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Input
                        value={payment.title}
                        onChange={(e) => updateExtractedPayment(idx, 'title', e.target.value)}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={payment.amount}
                        onChange={(e) => updateExtractedPayment(idx, 'amount', parseFloat(e.target.value) || 0)}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      {payment.percentage != null ? `${payment.percentage}%` : '-'}
                    </TableCell>
                    <TableCell>
                      <Input
                        value={payment.due_condition}
                        onChange={(e) => updateExtractedPayment(idx, 'due_condition', e.target.value)}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExtractedPayment(idx)}
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className={`flex items-center justify-between p-3 rounded-lg ${
            totalMatches ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <div>
              <span className="font-medium">Totaal geëxtraheerd:</span>{' '}
              <span className="font-bold">€{extractedTotal.toLocaleString('nl-NL')}</span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Verkoopprijs:</span>{' '}
              <span className="font-medium">€{salePrice.toLocaleString('nl-NL')}</span>
            </div>
            {totalMatches ? (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Komt overeen
              </Badge>
            ) : (
              <Badge className="bg-yellow-100 text-yellow-800">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Verschil: €{totalDifference.toLocaleString('nl-NL')}
              </Badge>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Annuleren
            </Button>
            <Button 
              onClick={handleConfirmExtraction}
              disabled={extractedPayments.length === 0 || bulkCreatePayments.isPending}
            >
              {bulkCreatePayments.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : null}
              Betaalplan Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
