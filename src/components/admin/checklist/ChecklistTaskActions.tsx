import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Upload, 
  Euro,
  Package,
  MessageSquare,
  ClipboardCheck,
  User,
  Gift,
  Calendar,
  Check,
  Pencil
} from "lucide-react";
import { type ChecklistKey } from "@/hooks/useSaleChecklist";
import { type SmartLinksData } from "@/hooks/useChecklistSmartLinks";
import { CHECKLIST_DOCUMENT_MAPPING } from "./utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ChecklistTaskActionsProps {
  templateKey: ChecklistKey;
  smartLinks: SmartLinksData;
  saleId?: string;
  onShowKoperdataSheet: () => void;
  onOpenUploadDialog: (templateKey: string) => void;
}

function NotaryDateInlinePicker({ 
  currentDate, 
  saleId 
}: { 
  currentDate: string | null; 
  saleId: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [dateValue, setDateValue] = useState(currentDate || '');
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  const handleSave = async () => {
    if (!dateValue) return;
    setIsSaving(true);
    try {
      // Update sales.notary_date
      const { error: saleError } = await supabase
        .from('sales')
        .update({ notary_date: dateValue })
        .eq('id', saleId);
      if (saleError) throw saleError;

      // Also update the milestone target_date and mark as completed
      const { error: milestoneError } = await supabase
        .from('sale_milestones')
        .update({ 
          target_date: dateValue, 
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq('sale_id', saleId)
        .eq('template_key', 'overd_notaris_datum');
      if (milestoneError) throw milestoneError;

      queryClient.invalidateQueries({ queryKey: ["sale-checklist"] });
      queryClient.invalidateQueries({ queryKey: ["checklist-notary-date", saleId] });
      queryClient.invalidateQueries({ queryKey: ["sale", saleId] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Notarisdatum opgeslagen");
      setIsEditing(false);
    } catch {
      toast.error("Fout bij opslaan notarisdatum");
    } finally {
      setIsSaving(false);
    }
  };

  if (currentDate && !isEditing) {
    return (
      <div className="flex items-center gap-1.5">
        <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
          <ClipboardCheck className="h-3 w-3" />
          {new Date(currentDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Badge>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditing(true)}>
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="date"
        value={dateValue}
        onChange={(e) => setDateValue(e.target.value)}
        className="h-8 w-[140px] text-xs"
      />
      <Button 
        variant="outline" 
        size="icon" 
        className="h-8 w-8"
        onClick={handleSave}
        disabled={!dateValue || isSaving}
      >
        <Check className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function ChecklistTaskActions({
  templateKey,
  smartLinks,
  saleId,
  onShowKoperdataSheet,
  onOpenUploadDialog,
}: ChecklistTaskActionsProps) {
  switch (templateKey) {
    case 'res_koperdata':
      if (smartLinks.reservationStatus.complete) {
        return (
          <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
            <User className="h-3 w-3" />
            Compleet
          </Badge>
        );
      }
      return (
        <Button variant="outline" size="sm" onClick={onShowKoperdataSheet}>
          <User className="h-3.5 w-3.5 mr-1.5" />
          Bekijk
        </Button>
      );
    case 'res_betaalplan':
      if (smartLinks.paymentStatus.exists) {
        return (
          <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
            <Euro className="h-3 w-3" />
            Toegevoegd
          </Badge>
        );
      }
      return (
        <Badge variant="secondary" className="text-muted-foreground">
          Beheer via Betaalplan tab
        </Badge>
      );
    case 'res_facturen':
      if (smartLinks.invoicesStatus.exists) {
        return (
          <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
            <FileText className="h-3 w-3" />
            Toegevoegd
          </Badge>
        );
      }
      return (
        <Badge variant="secondary" className="text-muted-foreground">
          Via Betaalplan tab
        </Badge>
      );
    case 'res_extras':
      if (smartLinks.extrasStatus.hasDecisions) {
        return (
          <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
            <Gift className="h-3 w-3" />
            Toegevoegd
          </Badge>
        );
      }
      return (
        <Badge variant="secondary" className="text-muted-foreground">
          Beheer via Extra's tab
        </Badge>
      );
    case 'res_aanbetaling':
      if (smartLinks.paymentStatus.isPaid) {
        return (
          <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
            <Euro className="h-3 w-3" />
            Ontvangen
          </Badge>
        );
      }
      return (
        <Badge variant="secondary" className="text-muted-foreground">
          Beheer via Betaalplan tab
        </Badge>
      );
    case 'voorb_extras_docs':
      if (smartLinks.extrasDocsStatus.complete) {
        return (
          <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
            <Package className="h-3 w-3" />
            Compleet
          </Badge>
        );
      }
      if (smartLinks.extrasDocsStatus.hasDocuments) {
        return (
          <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200 bg-amber-50">
            <Package className="h-3 w-3" />
            {smartLinks.extrasDocsStatus.completedCategories}/{smartLinks.extrasDocsStatus.totalCategories}
          </Badge>
        );
      }
      return (
        <Badge variant="secondary" className="text-muted-foreground">
          Beheer via Extra's tab
        </Badge>
      );
    case 'voorb_gesprek':
      return (
        <Badge variant="secondary" className="text-muted-foreground">
          <MessageSquare className="h-3 w-3 mr-1" />
          Handmatig
        </Badge>
      );
    case 'overd_notaris_datum':
      if (saleId) {
        return (
          <NotaryDateInlinePicker 
            currentDate={smartLinks.notaryDateValue || null}
            saleId={saleId}
          />
        );
      }
      if (smartLinks.notaryDateSet) {
        return (
          <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
            <ClipboardCheck className="h-3 w-3" />
            Datum gepland
          </Badge>
        );
      }
      return (
        <Badge variant="secondary" className="text-muted-foreground">
          Stel in via Planning
        </Badge>
      );
    case 'overd_snagging':
      if (smartLinks.snaggingStatus?.hasCompletedInspection) {
        return (
          <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
            <ClipboardCheck className="h-3 w-3" />
            Voltooid
          </Badge>
        );
      }
      return (
        <Badge variant="secondary" className="text-muted-foreground">
          Beheer via Oplevering tab
        </Badge>
      );
    default:
      break;
  }

  // Document upload actions
  const docMapping = CHECKLIST_DOCUMENT_MAPPING[templateKey];
  if (docMapping) {
    let docExists = false;
    if (docMapping.documentType === 'reservation_contract') {
      docExists = smartLinks.contractStatus.exists;
    } else {
      const koopDocStatus = smartLinks.koopcontractDocsStatus[docMapping.documentType];
      const voorbDocStatus = smartLinks.voorbereidingDocsStatus[docMapping.documentType];
      const overdDocStatus = smartLinks.overdrachtDocsStatus[docMapping.documentType];
      docExists = koopDocStatus?.exists || voorbDocStatus?.exists || overdDocStatus?.exists;
    }
    
    if (docExists) {
      return (
        <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
          <FileText className="h-3 w-3" />
          Geüpload
        </Badge>
      );
    }
    return (
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => onOpenUploadDialog(templateKey)}
      >
        <Upload className="h-3.5 w-3.5 mr-1.5" />
        Uploaden
      </Button>
    );
  }

  // Signature tasks
  if (templateKey === 'koop_klant_ondertekend' || templateKey === 'koop_developer_ondertekend') {
    const purchaseContract = smartLinks.koopcontractDocsStatus['purchase_contract'];
    if (!purchaseContract?.exists) {
      return (
        <span className="text-xs text-muted-foreground">
          Koopcontract nog niet geüpload
        </span>
      );
    }
  }

  return null;
}
