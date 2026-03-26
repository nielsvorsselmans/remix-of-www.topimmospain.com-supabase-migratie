import { SaleChoice, CLOSED_STATUSES } from "@/hooks/useSaleChoices";
import { Gift, Clock, CheckCircle2 } from "lucide-react";

interface Props {
  choices: SaleChoice[];
}

export function ChoiceSummaryBar({ choices }: Props) {
  const open = choices.filter(c => !CLOSED_STATUSES.includes(c.status as any));
  const decided = choices.filter(c => CLOSED_STATUSES.includes(c.status as any));

  const totalPrice = choices.reduce((sum, c) => {
    if (c.status === 'not_wanted' || c.status === 'rejected') return sum;
    const p = c.price ?? c.quote_amount ?? 0;
    return sum + p;
  }, 0);

  const gifts = choices.filter(c => c.gifted_by_tis);
  const giftTotal = gifts.reduce((sum, c) => sum + (c.price ?? c.quote_amount ?? 0), 0);

  const fmt = (n: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">{open.length}</span> open
      </span>
      <span className="flex items-center gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">{decided.length}</span> beslist
      </span>
      {totalPrice > 0 && (
        <span className="font-medium text-foreground">{fmt(totalPrice)} totaal</span>
      )}
      {gifts.length > 0 && (
        <span className="flex items-center gap-1.5 text-purple-600">
          <Gift className="h-3.5 w-3.5" />
          {gifts.length} cadeau{gifts.length > 1 ? 's' : ''} ({fmt(giftTotal)})
        </span>
      )}
    </div>
  );
}
