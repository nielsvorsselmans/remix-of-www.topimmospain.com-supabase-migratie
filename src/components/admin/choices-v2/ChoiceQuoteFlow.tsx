import { SaleChoice, CHOICE_STATUS_CONFIG, ChoiceStatus } from "@/hooks/useSaleChoices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle, XCircle, Clock, Send, ArrowRight } from "lucide-react";
import { useState } from "react";

interface Props {
  choice: SaleChoice;
  saleId: string;
  onUpdate: (updates: Record<string, any>) => void;
  onUpload: (file: File) => void;
}

export function ChoiceQuoteFlow({ choice, saleId, onUpdate, onUpload }: Props) {
  const [quoteAmount, setQuoteAmount] = useState(choice.quote_amount?.toString() || '');
  const statusCfg = CHOICE_STATUS_CONFIG[choice.status as ChoiceStatus] ?? CHOICE_STATUS_CONFIG.open;

  const handlePropose = () => {
    onUpdate({ status: 'proposed_to_customer' });
  };

  const handleSendToDeveloper = () => {
    onUpdate({ status: 'sent_to_developer', quote_requested_at: new Date().toISOString() });
  };

  const handleInfoReceived = () => {
    const amt = quoteAmount ? parseFloat(quoteAmount) : null;
    onUpdate({
      status: 'info_received',
      quote_amount: amt,
      quote_uploaded_at: new Date().toISOString(),
    });
  };

  const handleSendToCustomer = () => {
    onUpdate({ status: 'sent_to_customer' });
  };

  const handleConfirm = () => {
    onUpdate({
      status: 'confirmed',
      customer_decision: 'accepted',
      customer_decision_at: new Date().toISOString(),
    });
  };

  const handleDecide = () => {
    onUpdate({
      status: 'decided',
      decided_at: new Date().toISOString(),
      price: choice.quote_amount,
    });
  };

  const handleReject = () => {
    onUpdate({
      status: 'rejected',
      customer_decision: 'rejected',
      customer_decision_at: new Date().toISOString(),
    });
  };

  const handleNotWanted = () => {
    onUpdate({ status: 'not_wanted' });
  };

  const isOpen = choice.status === 'open';
  const isProposed = choice.status === 'proposed_to_customer';
  const isWaitingCustomer = choice.status === 'waiting_customer';
  const isSentToDev = choice.status === 'sent_to_developer' || choice.status === 'waiting_developer';
  const isInfoReceived = choice.status === 'info_received' || choice.status === 'quote_received';
  const isSentToCustomer = choice.status === 'sent_to_customer' || choice.status === 'waiting_confirmation';
  const isConfirmed = choice.status === 'confirmed';
  const isClosed = ['decided', 'rejected', 'not_wanted'].includes(choice.status);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium">Workflow</h4>
        <Badge variant="outline" className={`text-xs ${statusCfg.color} border-0`}>
          {statusCfg.label}
        </Badge>
      </div>

      {/* Step 1: Open — propose to customer or send to developer */}
      {isOpen && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Wat wil je doen met dit verzoek?</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={handlePropose}>
              <Send className="h-3.5 w-3.5 mr-1" /> Voorstellen aan klant
            </Button>
            <Button size="sm" variant="outline" onClick={handleSendToDeveloper}>
              <ArrowRight className="h-3.5 w-3.5 mr-1" /> Naar ontwikkelaar
            </Button>
            <Button size="sm" variant="ghost" onClick={handleNotWanted}>
              Niet gewenst
            </Button>
          </div>
        </div>
      )}

      {/* Proposed to customer — waiting for their reaction */}
      {(isProposed || isWaitingCustomer) && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Voorgesteld aan klant. Wacht op reactie.</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={handleSendToDeveloper}>
              <ArrowRight className="h-3.5 w-3.5 mr-1" /> Klant akkoord → naar ontwikkelaar
            </Button>
            <Button size="sm" variant="ghost" onClick={handleNotWanted}>
              Niet gewenst
            </Button>
          </div>
        </div>
      )}

      {/* Sent to developer — waiting for info/quote */}
      {isSentToDev && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Doorgestuurd naar ontwikkelaar{choice.quote_requested_at && ` op ${new Date(choice.quote_requested_at).toLocaleDateString('nl-NL')}`}
          </p>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label className="text-xs">Offertebedrag</Label>
              <Input
                value={quoteAmount}
                onChange={e => setQuoteAmount(e.target.value)}
                placeholder="€"
                type="number"
              />
            </div>
            <Button size="sm" onClick={handleInfoReceived}>
              Info ontvangen
            </Button>
          </div>
          <div>
            <Label className="text-xs">Offerte PDF uploaden</Label>
            <label className="flex items-center gap-2 p-3 rounded-lg border-2 border-dashed cursor-pointer hover:bg-muted/50 mt-1">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Klik om offerte te uploaden</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) onUpload(file);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        </div>
      )}

      {/* Info received from developer — send to customer */}
      {isInfoReceived && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                Offerte: €{(choice.quote_amount || 0).toLocaleString('nl-NL')}
              </p>
            </div>
          </div>
          <Button size="sm" onClick={handleSendToCustomer} className="w-full">
            <Send className="h-3.5 w-3.5 mr-1" /> Doorsturen naar klant
          </Button>
        </div>
      )}

      {/* Sent to customer — waiting for confirmation */}
      {isSentToCustomer && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                Offerte: €{(choice.quote_amount || 0).toLocaleString('nl-NL')}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Wacht op bevestiging van de klant.</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleConfirm} className="flex-1">
              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Klant bevestigd
            </Button>
            <Button size="sm" variant="destructive" onClick={handleReject} className="flex-1">
              <XCircle className="h-3.5 w-3.5 mr-1" /> Afgewezen
            </Button>
          </div>
        </div>
      )}

      {/* Confirmed — finalize with developer */}
      {isConfirmed && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Klant heeft bevestigd. Bevestig aan ontwikkelaar om af te ronden.</p>
          <Button size="sm" onClick={handleDecide} className="w-full">
            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Afgerond
          </Button>
        </div>
      )}

      {/* Closed state */}
      {isClosed && (
        <div className="p-3 rounded-lg border bg-muted/30">
          <p className="text-sm">
            {choice.status === 'decided' ? '✅ Afgerond' : choice.status === 'rejected' ? '❌ Afgewezen' : '⊘ Niet gewenst'}
            {choice.customer_decision_at && ` op ${new Date(choice.customer_decision_at).toLocaleDateString('nl-NL')}`}
          </p>
          {choice.price != null && (
            <p className="text-sm font-medium mt-1">Bedrag: €{choice.price.toLocaleString('nl-NL')}</p>
          )}
        </div>
      )}

      {/* Quote attachments */}
      {choice.attachments.filter(a => a.file_type === 'quote').length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs">Offerte documenten</Label>
          {choice.attachments.filter(a => a.file_type === 'quote').map(att => (
            <a
              key={att.id}
              href={att.file_url}
              target="_blank"
              rel="noopener"
              className="flex items-center gap-2 text-sm text-primary underline"
            >
              <FileText className="h-3.5 w-3.5" />
              {att.file_name}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
