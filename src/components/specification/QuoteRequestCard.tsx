import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  MessageSquare
} from "lucide-react";
import { 
  CustomizationRequest, 
  CustomizationStatus,
  useCustomerQuoteDecision 
} from "@/hooks/useCustomizationRequests";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface QuoteRequestCardProps {
  request: CustomizationRequest;
  saleId: string;
}

const STATUS_CONFIG: Record<CustomizationStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  pending: { label: "In behandeling", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  discussed: { label: "Besproken", variant: "outline", icon: <MessageSquare className="h-3 w-3" /> },
  quote_requested: { label: "Offerte aangevraagd", variant: "default", icon: <Clock className="h-3 w-3" /> },
  quote_received: { label: "Offerte ontvangen", variant: "default", icon: <FileText className="h-3 w-3" /> },
  approved: { label: "Geaccepteerd", variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected: { label: "Afgewezen", variant: "secondary", icon: <XCircle className="h-3 w-3" /> },
};

const CATEGORY_LABELS: Record<string, string> = {
  floor_plan: "Grondplan",
  electrical: "Elektriciteit",
  extras: "Extra's",
  other: "Overig",
};

export function QuoteRequestCard({ request, saleId }: QuoteRequestCardProps) {
  const [decisionReason, setDecisionReason] = useState("");
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  
  const customerDecision = useCustomerQuoteDecision();
  
  const statusConfig = STATUS_CONFIG[request.status];
  const isQuoteReceived = request.status === 'quote_received' && !request.customer_decision;
  const isDecided = request.customer_decision !== null;
  
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount);
  
  const formatDate = (dateString: string) => 
    new Date(dateString).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });

  const handleAccept = () => {
    customerDecision.mutate({
      requestId: request.id,
      saleId,
      decision: 'accepted',
      reason: decisionReason || undefined,
    });
    setShowAcceptDialog(false);
    setDecisionReason("");
  };

  const handleReject = () => {
    customerDecision.mutate({
      requestId: request.id,
      saleId,
      decision: 'rejected',
      reason: decisionReason || undefined,
    });
    setShowRejectDialog(false);
    setDecisionReason("");
  };

  return (
    <>
      <Card className={isQuoteReceived ? "border-primary/50 bg-primary/5" : ""}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="text-base font-medium">{request.request_title}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {CATEGORY_LABELS[request.category]} • {formatDate(request.created_at)}
              </p>
            </div>
            <Badge 
              variant={statusConfig.variant}
              className={`flex items-center gap-1 ${
                request.status === 'approved' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                request.status === 'quote_received' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' :
                request.status === 'quote_requested' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                ''
              }`}
            >
              {statusConfig.icon}
              {statusConfig.label}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Original request */}
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground text-xs mb-1">Jouw verzoek:</p>
            <p className="text-sm">{request.request_description}</p>
          </div>

          {/* Waiting for quote */}
          {request.status === 'quote_requested' && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-blue-700 dark:text-blue-300 text-sm">
              <Clock className="h-4 w-4 shrink-0" />
              <span>We hebben een offerte aangevraagd. Je ontvangt bericht zodra deze binnen is.</span>
            </div>
          )}

          {/* Quote received - show details */}
          {(request.status === 'quote_received' || isDecided) && request.quote_amount && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4 text-primary" />
                <span>Offerte ontvangen</span>
              </div>
              
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{formatCurrency(request.quote_amount)}</span>
                <span className="text-sm text-muted-foreground">excl. BTW</span>
              </div>

              {request.quote_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={request.quote_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Bekijk offerte (PDF)
                  </a>
                </Button>
              )}

              {request.admin_response && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Reactie Top Immo Spain:</p>
                  <p className="text-sm">{request.admin_response}</p>
                </div>
              )}
            </div>
          )}

          {/* Decision already made */}
          {isDecided && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              request.customer_decision === 'accepted' 
                ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300'
                : 'bg-muted text-muted-foreground'
            }`}>
              {request.customer_decision === 'accepted' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>
                    Geaccepteerd op {formatDate(request.customer_decision_at!)}
                    {request.add_to_costs && " • Toegevoegd aan totale investering"}
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 shrink-0" />
                  <span>Afgewezen op {formatDate(request.customer_decision_at!)}</span>
                </>
              )}
            </div>
          )}

          {request.customer_decision_reason && (
            <p className="text-sm text-muted-foreground italic">
              "{request.customer_decision_reason}"
            </p>
          )}

          {/* Action buttons for quote_received */}
          {isQuoteReceived && (
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-amber-700 dark:text-amber-300 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Door te accepteren wordt {formatCurrency(request.quote_amount!)} toegevoegd aan je totale investering, 
                  te betalen {request.payment_due_moment === 'bij_oplevering' ? 'bij oplevering' : request.payment_due_moment}.
                </span>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowRejectDialog(true)}
                  disabled={customerDecision.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Afwijzen
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => setShowAcceptDialog(true)}
                  disabled={customerDecision.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Accepteren
                </Button>
              </div>
            </div>
          )}

          {/* Pending status */}
          {request.status === 'pending' && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-muted-foreground text-sm">
              <Clock className="h-4 w-4 shrink-0" />
              <span>Je aanvraag wordt beoordeeld door ons team.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accept confirmation dialog */}
      <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Offerte accepteren?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Je gaat de offerte van <strong>{formatCurrency(request.quote_amount!)}</strong> accepteren 
                voor "{request.request_title}".
              </p>
              <p>Dit bedrag wordt toegevoegd aan je totale investering.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Eventuele opmerkingen (optioneel)"
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              rows={2}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleAccept}>
              Accepteren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject confirmation dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Offerte afwijzen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je deze offerte wilt afwijzen? Je kunt later altijd een nieuwe aanvraag indienen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Reden voor afwijzing (optioneel, maar helpt ons)"
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              rows={2}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReject}
              className="bg-muted text-muted-foreground hover:bg-muted/80"
            >
              Afwijzen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}