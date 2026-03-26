import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Sparkles, Target, Home, ChevronUp, ChevronDown } from "lucide-react";
import { generateHypotheekReport, type HypotheekReportResult } from "@/lib/hypotheekCalculations";
import { initialHypotheekFormData, type HypotheekFormData } from "@/types/hypotheekForm";
import { cn } from "@/lib/utils";

interface Props {
  data: HypotheekFormData;
  currentStep: number;
  totalSteps: number;
}

interface AccuracyField {
  filled: boolean;
  weight: number;
}

const NUDGES: Record<number, { icon: typeof TrendingUp; text: string }> = {
  0: { icon: TrendingUp, text: "Vul je gegevens in om je budget te ontdekken" },
  1: { icon: Sparkles, text: "Vul je inkomen in om te zien hoeveel je kunt lenen" },
  2: { icon: Target, text: "Vul je financiën in voor een nauwkeuriger beeld" },
  3: { icon: Home, text: "Kies een regio voor het exacte kostenplaatje" },
};

function calculateAccuracy(data: HypotheekFormData): number {
  const fields: AccuracyField[] = [
    { filled: data.geboortejaar > 0, weight: 15 },
    { filled: data.brutoJaarinkomen > 0, weight: 35 },
    { filled: data.eigenVermogen > 0 || data.woonlasten > 0 || data.overigeSchulden > 0, weight: 25 },
    { filled: data.heeftWoning && data.aankoopsom > 0, weight: 25 },
  ];
  return fields.reduce((sum, f) => sum + (f.filled ? f.weight : 0), 0);
}

function fillDefaults(data: HypotheekFormData): HypotheekFormData {
  return {
    ...initialHypotheekFormData,
    ...data,
    brutoJaarinkomen: data.brutoJaarinkomen || 45000,
    geboortejaar: data.geboortejaar || 1985,
    heeftWoning: data.heeftWoning || true,
    aankoopsom: data.aankoopsom || 250000,
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 85) return "text-green-600";
  if (accuracy >= 50) return "text-accent-foreground";
  return "text-muted-foreground";
}

function getProgressColor(accuracy: number): string {
  if (accuracy >= 85) return "bg-green-500";
  if (accuracy >= 50) return "bg-accent";
  return "bg-muted-foreground/40";
}

const BudgetPreviewBar = ({ data, currentStep, totalSteps }: Props) => {
  const [collapsed, setCollapsed] = useState(false);
  const accuracy = useMemo(() => calculateAccuracy(data), [data]);

  const preview = useMemo<HypotheekReportResult | null>(() => {
    if (currentStep < 1) return null;
    try {
      const filledData = fillDefaults(data);
      return generateHypotheekReport(filledData);
    } catch {
      return null;
    }
  }, [data, currentStep]);

  const nudge = NUDGES[currentStep] || NUDGES[3];
  const NudgeIcon = nudge.icon;

  const budgetRange = useMemo(() => {
    if (!preview) return null;
    const max = preview.hypotheek.maxHypotheekbedrag;
    if (max <= 0) return null;

    const spreadFactor = Math.max(0.05, (100 - accuracy) / 200);
    const low = Math.round(max * (1 - spreadFactor));
    const high = Math.round(max * (1 + spreadFactor));

    return { low, high, exact: max };
  }, [preview, accuracy]);

  if (currentStep < 1 || !budgetRange) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, height: 0 }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        exit={{ opacity: 0, y: -10, height: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={cn(
          "mb-4",
          "sm:relative",
          "fixed bottom-0 left-0 right-0 z-40 sm:static sm:z-auto"
        )}
      >
        <div className="rounded-xl border border-border bg-card p-3 sm:p-4 shadow-sm sm:shadow-sm shadow-lg">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center gap-2 sm:cursor-default"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Geschat leenbudget</p>
              <AnimatePresence mode="wait">
                <motion.p
                  key={`${budgetRange.low}-${budgetRange.high}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-base sm:text-lg font-bold text-foreground truncate"
                >
                  {accuracy >= 85
                    ? formatCurrency(budgetRange.exact)
                    : `${formatCurrency(budgetRange.low)} – ${formatCurrency(budgetRange.high)}`}
                </motion.p>
              </AnimatePresence>
            </div>
            <span className={cn("text-xs font-semibold tabular-nums", getAccuracyColor(accuracy))}>
              {accuracy}%
            </span>
            <span className="sm:hidden text-muted-foreground">
              {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          </button>

          <div className={cn(
            "overflow-hidden transition-all",
            collapsed ? "max-h-0 sm:max-h-none" : "max-h-20"
          )}>
            <div className="mt-2 sm:mt-2">
              <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className={cn("absolute inset-y-0 left-0 rounded-full", getProgressColor(accuracy))}
                  initial={{ width: 0 }}
                  animate={{ width: `${accuracy}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
            </div>

            {accuracy < 100 && (
              <motion.div
                key={currentStep}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2"
              >
                <NudgeIcon className="w-3 h-3 shrink-0" />
                <span>{nudge.text}</span>
              </motion.div>
            )}

            {accuracy >= 100 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-1.5 text-xs text-green-600 font-medium mt-2"
              >
                <Sparkles className="w-3 h-3" />
                <span>Alle gegevens ingevuld — maximale nauwkeurigheid!</span>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BudgetPreviewBar;
