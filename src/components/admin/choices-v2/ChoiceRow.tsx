import { SaleChoice, CHOICE_STATUS_CONFIG, ChoiceStatus } from "@/hooks/useSaleChoices";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Gift, Palette, Lightbulb, ClipboardList, CheckCircle2 } from "lucide-react";

interface Props {
  choice: SaleChoice;
  compact?: boolean;
  onClick: () => void;
}

const typeConfig = {
  extra: { icon: Lightbulb, label: 'Extra', color: 'bg-amber-100 text-amber-800' },
  request: { icon: ClipboardList, label: 'Aanvraag', color: 'bg-blue-100 text-blue-800' },
  material: { icon: Palette, label: 'Materiaal', color: 'bg-emerald-100 text-emerald-800' },
};

function formatPrice(n: number | null) {
  if (n == null) return null;
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

export function ChoiceRow({ choice, compact, onClick }: Props) {
  const cfg = typeConfig[choice.type] || typeConfig.extra;
  const Icon = cfg.icon;
  const statusCfg = CHOICE_STATUS_CONFIG[choice.status as ChoiceStatus] ?? CHOICE_STATUS_CONFIG.open;

  if (compact) {
    const chosenName = choice.options?.find(o => o.is_chosen)?.name;
    const displayPrice = formatPrice(choice.price ?? choice.quote_amount);

    return (
      <button
        onClick={onClick}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-muted/50 rounded transition-colors"
      >
        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
        <span className="font-medium truncate">{choice.title}</span>
        {chosenName && <span className="text-muted-foreground truncate">· {chosenName}</span>}
        {displayPrice && <span className="text-muted-foreground">{displayPrice}</span>}
        {choice.gifted_by_tis && <Gift className="h-3.5 w-3.5 text-purple-500 shrink-0" />}
        {choice.status === 'not_wanted' && <span className="text-muted-foreground italic">Niet gewenst</span>}
      </button>
    );
  }

  const optionCount = choice.options?.length ?? 0;

  const priceRange = optionCount > 0
    ? (() => {
        const prices = (choice.options ?? []).map(o => o.price).filter((p): p is number => p != null);
        if (prices.length === 0) return null;
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        return min === max ? formatPrice(min) : `${formatPrice(min)} – ${formatPrice(max)}`;
      })()
    : formatPrice(choice.quote_amount ?? choice.price);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 px-3 py-3 text-left hover:bg-muted/50 rounded-lg border border-transparent hover:border-border transition-colors"
    >
      <Icon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{choice.title}</span>
          {choice.gifted_by_tis && <Gift className="h-3.5 w-3.5 text-purple-500 shrink-0" />}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cfg.color} border-0`}>
            {cfg.label}
          </Badge>
          {optionCount > 0 && <span>{optionCount} opties</span>}
          {priceRange && <span>{priceRange}</span>}
          {choice.room && <span>{choice.room}</span>}
          {choice.via_developer && <span>Via ontwikkelaar</span>}
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border-0 ${statusCfg.color}`}>
            {statusCfg.label}
          </Badge>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
    </button>
  );
}
