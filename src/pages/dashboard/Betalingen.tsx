import { Link } from "react-router-dom";
import { useCustomerPayments, CustomerPayment } from "@/hooks/useCustomerPayments";
import { useSalePaymentProofsBatch, SalePaymentProof } from "@/hooks/useSalePaymentProofs";
import { TotalInvestmentDashboard } from "@/components/TotalInvestmentDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, isPast, isToday, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { CheckCircle2, Clock, AlertCircle, Upload, Euro, Calendar, FileText, ExternalLink, PieChart, List, Info, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUploadPaymentProof } from "@/hooks/useSalePaymentProofs";
import { useOptionalActiveSale } from "@/contexts/ActiveSaleContext";

function PaymentStatusBadge({ status, dueDate }: { status: string; dueDate: string | null }) {
  if (status === 'paid') {
    return (
      <Badge variant="default" className="bg-green-600 hover:bg-green-700">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Betaald
      </Badge>
    );
  }

  if (dueDate) {
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) {
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          Te laat
        </Badge>
      );
    }
    if (isToday(date) || (isPast(addDays(new Date(), -7)) && !isPast(date))) {
      return (
        <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200">
          <Clock className="h-3 w-3 mr-1" />
          Binnenkort
        </Badge>
      );
    }
  }

  return (
    <Badge variant="outline">
      <Clock className="h-3 w-3 mr-1" />
      Openstaand
    </Badge>
  );
}

function PaymentCard({ payment, saleId, proofs, onUploadComplete }: { 
  payment: CustomerPayment; 
  saleId: string;
  proofs: SalePaymentProof[];
  onUploadComplete: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadProof = useUploadPaymentProof();
  const isUploading = uploadProof.isPending;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await uploadProof.mutateAsync({
        paymentId: payment.id,
        saleId,
        file,
      });
      onUploadComplete();
    } catch {
      // Error handling is done in the hook
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Card className={cn(
      "transition-all",
      payment.status === 'paid' && "border-green-200 bg-green-50/50"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-foreground">{payment.title}</h4>
              <PaymentStatusBadge status={payment.status} dueDate={payment.due_date} />
            </div>
            
            {payment.description && (
              <p className="text-sm text-muted-foreground mb-2">{payment.description}</p>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Euro className="h-4 w-4" />
                <span className="font-medium text-foreground">
                  €{payment.amount.toLocaleString('nl-NL')}
                </span>
                {payment.percentage && (
                  <span className="text-xs">({payment.percentage}%)</span>
                )}
              </div>

              {payment.due_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(payment.due_date), 'd MMMM yyyy', { locale: nl })}</span>
                </div>
              )}

              {payment.due_condition && !payment.due_date && (
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>{payment.due_condition}</span>
                </div>
              )}
            </div>

            {payment.status === 'paid' && payment.paid_at && (
              <p className="text-xs text-green-600 mt-2">
                Betaald op {format(new Date(payment.paid_at), 'd MMMM yyyy', { locale: nl })}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            {payment.status !== 'paid' && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  {isUploading ? 'Uploaden...' : 'Bewijs uploaden'}
                </Button>
              </>
            )}

            {/* Show all proofs: legacy proof_file_url + admin-uploaded proofs */}
            {(payment.proof_file_url || proofs.length > 0) && (
              <div className="flex flex-col gap-1">
                {payment.proof_file_url && (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={payment.proof_file_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Bekijk bewijs
                    </a>
                  </Button>
                )}
                {proofs.map((proof) => (
                  <Button key={proof.id} variant="ghost" size="sm" asChild>
                    <a href={proof.file_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      {proof.file_name || 'Bekijk bewijs'}
                    </a>
                  </Button>
                ))}
              </div>
            )}

            {payment.proof_uploaded_at && payment.status !== 'paid' && (
              <span className="text-xs text-amber-600">
                In afwachting van verificatie
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  );
}

export default function Betalingen() {
  const queryClient = useQueryClient();
  const { activeSaleId } = useOptionalActiveSale();
  const { data: paymentsData, isLoading, error } = useCustomerPayments();
  
  // Fetch all payment proofs in batch
  const paymentIds = paymentsData?.payments.map(p => p.id) || [];
  const { data: proofsMap } = useSalePaymentProofsBatch(paymentIds);

  const handleUploadComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['customer-payments'] });
    queryClient.invalidateQueries({ queryKey: ['sale-payment-proofs-batch'] });
  };

  const progressPercentage = paymentsData?.totalAmount
    ? (paymentsData.paidAmount / paymentsData.totalAmount) * 100 
    : 0;

  return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Mobile back button */}
        <div className="md:hidden mb-4">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
            <Link to="/dashboard/mijn-woning">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Terug naar Mijn Woning
            </Link>
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Financieel Overzicht</h1>
          <p className="text-muted-foreground">
            Bekijk je totale investering, betaalschema en upload betaalbewijzen
          </p>
        </div>

        {isLoading ? (
          <PaymentsSkeleton />
        ) : error ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                Er ging iets mis bij het laden van je betalingen.
              </p>
            </CardContent>
          </Card>
        ) : !paymentsData?.payments.length ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Euro className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">Nog geen betalingen</h3>
              <p className="text-muted-foreground">
                Je betaalschema wordt hier zichtbaar zodra je aankoop geregistreerd is.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="payments" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="payments" className="gap-2">
                <List className="h-4 w-4" />
                Betaaltermijnen
              </TabsTrigger>
              <TabsTrigger value="overview" className="gap-2">
                <PieChart className="h-4 w-4" />
                Totale Investering
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <TotalInvestmentDashboard />
            </TabsContent>

            <TabsContent value="payments">
              <div className="space-y-6">
                {/* Disclaimer */}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Deze betalingen gaan rechtstreeks naar de projectontwikkelaar volgens het betaalschema in je koopcontract. 
                    Extra aankoopkosten (notaris, belastingen, advocaat) en bestelde extra's zijn hier niet inbegrepen. 
                    Bekijk het tabblad <span className="font-medium">"Totale Investering"</span> voor een volledig overzicht.
                  </AlertDescription>
                </Alert>

                {/* Price Breakdown Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Aankoopprijs</CardDescription>
                      <CardTitle className="text-2xl">
                        €{paymentsData.salePrice?.toLocaleString('nl-NL') || '-'}
                      </CardTitle>
                    </CardHeader>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>BTW (10%)</CardDescription>
                      <CardTitle className="text-2xl">
                        €{paymentsData.vatAmount?.toLocaleString('nl-NL') || '-'}
                      </CardTitle>
                    </CardHeader>
                  </Card>

                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-2">
                      <CardDescription>Totaal aan ontwikkelaar</CardDescription>
                      <CardTitle className="text-2xl">
                        €{paymentsData.totalAmount.toLocaleString('nl-NL')}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                {/* Payment Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-green-200 bg-green-50/50">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-green-700">Betaald</CardDescription>
                      <CardTitle className="text-2xl text-green-700">
                        €{paymentsData.paidAmount.toLocaleString('nl-NL')}
                      </CardTitle>
                    </CardHeader>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Openstaand</CardDescription>
                      <CardTitle className="text-2xl">
                        €{paymentsData.pendingAmount.toLocaleString('nl-NL')}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                {/* Progress Bar */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Betalingsvoortgang</span>
                      <span className="text-sm text-muted-foreground">
                        {paymentsData.paidCount} van {paymentsData.payments.length} termijnen
                      </span>
                    </div>
                    <Progress value={progressPercentage} className="h-3" />
                    <p className="text-xs text-muted-foreground mt-2">
                      {progressPercentage.toFixed(0)}% van totaalbedrag voldaan
                    </p>
                  </CardContent>
                </Card>

                {/* Payment Timeline */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Betaaltermijnen</h3>
                  {paymentsData.payments.map((payment) => (
                    <PaymentCard 
                      key={payment.id} 
                      payment={payment} 
                      saleId={paymentsData.saleId!}
                      proofs={proofsMap?.[payment.id] || []}
                      onUploadComplete={handleUploadComplete}
                    />
                  ))}
                </div>

                {/* Info Card */}
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">Hoe werkt het?</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Upload je betaalbewijs (PDF of afbeelding) per termijn</li>
                      <li>• Wij controleren je bewijs en bevestigen de betaling</li>
                      <li>• Je ziet direct de status van elke betaling</li>
                      <li>• Bij vragen kun je altijd contact opnemen met je contactpersoon</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
  );
}