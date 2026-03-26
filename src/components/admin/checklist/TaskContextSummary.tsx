import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { ChecklistKey } from "@/hooks/useSaleChecklist";
import type { SmartLinksData } from "@/hooks/useChecklistSmartLinks";

interface TaskContextSummaryProps {
  templateKey: ChecklistKey;
  smartLinks: SmartLinksData;
  isComplete: boolean;
}

function formatCurrency(amount: number): string {
  return `€${amount.toLocaleString('nl-NL')}`;
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'd MMM yyyy', { locale: nl });
  } catch {
    return dateStr;
  }
}

export function TaskContextSummary({ templateKey, smartLinks, isComplete }: TaskContextSummaryProps) {
  const content = getContextContent(templateKey, smartLinks, isComplete);
  if (!content) return null;

  return (
    <div className="mt-1.5 ml-0 text-xs bg-muted/50 rounded-md px-3 py-2 space-y-0.5">
      {content.map((line, i) => (
        <div key={i} className="flex items-center gap-1.5 text-muted-foreground">
          <span className="text-muted-foreground/60">›</span>
          <span>{line}</span>
        </div>
      ))}
    </div>
  );
}

function getContextContent(
  templateKey: ChecklistKey,
  smartLinks: SmartLinksData,
  isComplete: boolean
): string[] | null {
  const { paymentSummary, extrasSummary, invoicesSummary, choicesSummary } = smartLinks;

  switch (templateKey) {
    case 'res_betaalplan': {
      if (paymentSummary.totalTerms === 0) return null;
      const lines: string[] = [`${paymentSummary.totalTerms} termijnen`];
      if (paymentSummary.nextPayment) {
        lines.push(
          `Volgende: ${formatCurrency(paymentSummary.nextPayment.amount)} op ${formatDate(paymentSummary.nextPayment.date)}`
        );
      }
      if (paymentSummary.paidAmount > 0) {
        lines.push(
          `Betaald: ${formatCurrency(paymentSummary.paidAmount)} / ${formatCurrency(paymentSummary.totalAmount)} (${paymentSummary.paidPercentage}%)`
        );
      }
      if (paymentSummary.hasOverdue) {
        lines.push('⚠ Achterstallige betaling');
      }
      return lines;
    }

    case 'res_aanbetaling': {
      if (!smartLinks.paymentStatus.isPaid) return null;
      const lines: string[] = [];
      if (paymentSummary.firstPaidAmount) {
        lines.push(`${formatCurrency(paymentSummary.firstPaidAmount)} ontvangen`);
      }
      if (paymentSummary.firstPaidAt) {
        lines.push(`Op ${formatDate(paymentSummary.firstPaidAt)}`);
      }
      return lines.length > 0 ? lines : null;
    }

    case 'res_extras': {
      if (extrasSummary.totalCategories === 0) return null;
      const lines: string[] = [
        `${extrasSummary.decidedCount}/${extrasSummary.totalCategories} categorieën beslist`,
      ];
      if (extrasSummary.openCount > 0) {
        lines.push(`${extrasSummary.openCount} nog open`);
      }
      if (extrasSummary.giftedCount > 0) {
        lines.push(`${extrasSummary.giftedCount} cadeau 🎁`);
      }
      return lines;
    }

    case 'res_facturen': {
      if (invoicesSummary.total === 0) return null;
      const lines: string[] = [
        `${invoicesSummary.total} facturen · ${invoicesSummary.paid} betaald`,
      ];
      if (invoicesSummary.openAmount > 0) {
        lines.push(`${formatCurrency(invoicesSummary.openAmount)} openstaand`);
      }
      return lines;
    }

    case 'res_koperdata': {
      const { reservationStatus } = smartLinks;
      if (reservationStatus.total === 0) return null;
      return [
        `${reservationStatus.completed}/${reservationStatus.total} kopers compleet`,
      ];
    }

    // Offerte tracking context summaries
    case 'akk_offertes_aangevraagd':
    case 'akk_offertes_ontvangen':
    case 'akk_offertes_beslissing': {
      if (choicesSummary.total === 0) return null;
      const lines: string[] = [`${choicesSummary.total} offertes via ontwikkelaar`];
      if (choicesSummary.waitingForQuote.count > 0) {
        lines.push(`🟡 ${choicesSummary.waitingForQuote.count}× wacht op offerte`);
        if (choicesSummary.waitingForQuote.titles.length <= 3) {
          lines.push(`   ${choicesSummary.waitingForQuote.titles.join(', ')}`);
        }
      }
      if (choicesSummary.waitingForDecision.count > 0) {
        lines.push(`🟠 ${choicesSummary.waitingForDecision.count}× wacht op klantbeslissing`);
        if (choicesSummary.waitingForDecision.titles.length <= 3) {
          lines.push(`   ${choicesSummary.waitingForDecision.titles.join(', ')}`);
        }
      }
      if (choicesSummary.decided > 0) {
        lines.push(`✅ ${choicesSummary.decided}× afgehandeld`);
      }
      return lines;
    }

    default:
      return null;
  }
}
