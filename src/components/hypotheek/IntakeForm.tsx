import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, FileText, Zap } from "lucide-react";
import { initialHypotheekFormData, type HypotheekFormData } from "@/types/hypotheekForm";
import StepPersonal from "@/components/hypotheek/StepPersonal";
import StepIncome from "@/components/hypotheek/StepIncome";
import StepExpenses from "@/components/hypotheek/StepExpenses";
import StepProperty from "@/components/hypotheek/StepProperty";
import StepContact from "@/components/hypotheek/StepContact";
import StepReview from "@/components/hypotheek/StepReview";
import StepIndicator from "@/components/hypotheek/StepIndicator";
import BudgetPreviewBar from "@/components/hypotheek/BudgetPreviewBar";
import { generateHypotheekReport, type HypotheekReportResult } from "@/lib/hypotheekCalculations";
import { AnimatePresence, motion } from "framer-motion";

const STORAGE_KEY = "hypotheek_progress";

const ALL_STEPS = [
  { label: "Over jou", component: StepPersonal },
  { label: "Inkomen", component: StepIncome },
  { label: "Financiën", component: StepExpenses },
  { label: "Woning", component: StepProperty },
  { label: "Contact", component: StepContact },
];

const STEP_NAMES_NEXT: Record<string, string> = {
  "Over jou": "Inkomen",
  "Inkomen": "Financiën",
  "Financiën": "Woning",
  "Woning": "Contact",
};

interface Props {
  onComplete: (report: HypotheekReportResult, formData: HypotheekFormData) => void;
  initialData?: Partial<HypotheekFormData>;
  isLoggedIn?: boolean;
  hasExistingData?: boolean;
}

const REVIEW_STEP = -1;

const IntakeForm = ({ onComplete, initialData, isLoggedIn = false, hasExistingData = false }: Props) => {
  const expressMode = isLoggedIn && hasExistingData;
  const [step, setStep] = useState(expressMode ? REVIEW_STEP : 0);
  const [direction, setDirection] = useState(1);
  const [returnToReview, setReturnToReview] = useState(false);
  const [data, setData] = useState<HypotheekFormData>(() => {
    if (!isLoggedIn) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          return { ...initialHypotheekFormData, ...parsed, ...initialData };
        }
      } catch { /* ignore */ }
    }
    return {
      ...initialHypotheekFormData,
      ...initialData,
      ...(isLoggedIn ? { akkoordVoorwaarden: true } : {}),
    };
  });

  useEffect(() => {
    if (initialData) {
      setData((prev) => {
        const merged = { ...prev };
        for (const [key, value] of Object.entries(initialData)) {
          if (value !== undefined && value !== null && value !== "") {
            const defaultVal = (initialHypotheekFormData as any)[key];
            const currentVal = (prev as any)[key];
            if (currentVal === defaultVal || currentVal === "" || currentVal === null || currentVal === 0) {
              (merged as any)[key] = value;
            }
          }
        }
        return merged;
      });
    }
  }, [initialData]);

  useEffect(() => {
    if (!isLoggedIn) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch { /* ignore */ }
    }
  }, [data, isLoggedIn]);

  const STEPS = useMemo(() => {
    if (isLoggedIn) return ALL_STEPS.filter((_, i) => i !== 4);
    return ALL_STEPS;
  }, [isLoggedIn]);

  const handleChange = (partial: Partial<HypotheekFormData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  };

  const goToStep = (target: number) => {
    setDirection(target > step ? 1 : -1);
    setStep(target);
  };

  const handleEditFromReview = (stepIndex: number) => {
    setReturnToReview(true);
    goToStep(stepIndex);
  };

  const handleBackFromEdit = () => {
    if (returnToReview) {
      setReturnToReview(false);
      setDirection(-1);
      setStep(REVIEW_STEP);
    } else {
      goToStep(step - 1);
    }
  };

  const canProceed = () => {
    if (step === REVIEW_STEP) return true;
    const stepLabel = STEPS[step].label;
    switch (stepLabel) {
      case "Over jou": return data.voornaam.trim().length > 0 && data.achternaam.trim().length > 0 && data.geboortejaar > 0;
      case "Inkomen": {
        const basisOk = data.brutoJaarinkomen > 0;
        if (data.heeftCoAanvrager) return basisOk && data.partnerBrutoJaarinkomen > 0;
        return basisOk;
      }
      case "Financiën": return data.eigenVermogen >= 0;
      case "Woning": return true;
      case "Contact": return data.email.trim().length > 0 && data.email.includes("@") && data.akkoordVoorwaarden;
      default: return true;
    }
  };

  const handleSubmit = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    const report = generateHypotheekReport(data);
    onComplete(report, { ...data });
  };

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  };

  const isReviewStep = step === REVIEW_STEP;
  const isLastStep = !isReviewStep && step === STEPS.length - 1;
  const stepsRemaining = STEPS.length - step - 1;

  const nextStepLabel = step >= 0 && step < STEPS.length
    ? STEP_NAMES_NEXT[STEPS[step].label]
    : null;

  const stepProps: any = { data, onChange: handleChange };
  if (!isLoggedIn && step >= 0 && STEPS[step]?.label === "Contact") {
    stepProps.onEditStep = goToStep;
  }
  if (step >= 0 && STEPS[step]?.label === "Over jou" && isLoggedIn) {
    stepProps.isPreFilled = true;
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      {!isReviewStep && (
        <>
          <StepIndicator steps={STEPS} currentStep={step} onStepClick={goToStep} />
          {/* Desktop: budget bar above form. Mobile: BudgetPreviewBar renders as sticky-bottom */}
          <div className="hidden sm:block">
            <BudgetPreviewBar data={data} currentStep={step} totalSteps={STEPS.length} />
          </div>
        </>
      )}

      <Card className="border-0 shadow-lg">
        <CardContent className="p-5 sm:p-6 md:p-8">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={isReviewStep ? "review" : step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              {isReviewStep ? (
                <StepReview data={data} onEditStep={handleEditFromReview} />
              ) : (
                (() => {
                  const StepComponent = STEPS[step].component;
                  return <StepComponent {...stepProps} />;
                })()
              )}
            </motion.div>
          </AnimatePresence>

          {/* Footer buttons */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50 pb-[env(safe-area-inset-bottom)]">
            {isReviewStep ? (
              <>
                <div />
                <Button onClick={handleSubmit} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 text-base px-6 h-12 w-full sm:w-auto">
                  <Zap className="w-4 h-4" /> Bekijk mijn resultaat
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={returnToReview ? handleBackFromEdit : () => goToStep(step - 1)}
                  disabled={step === 0 && !returnToReview}
                  className="gap-1 h-12 px-4"
                >
                  <ChevronLeft className="w-4 h-4" /> {returnToReview ? "Overzicht" : "Vorige"}
                </Button>

                {returnToReview ? (
                  <Button onClick={handleBackFromEdit} disabled={!canProceed()} className="gap-1 bg-accent text-accent-foreground hover:bg-accent/90 h-12 px-5">
                    Opslaan <FileText className="w-4 h-4" />
                  </Button>
                ) : !isLastStep ? (
                  <Button onClick={() => goToStep(step + 1)} disabled={!canProceed()} className="gap-1 bg-accent text-accent-foreground hover:bg-accent/90 h-12 px-5">
                    {nextStepLabel ? `Volgende: ${nextStepLabel}` : "Volgende"} <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} disabled={!canProceed()} className="gap-1 bg-accent text-accent-foreground hover:bg-accent/90 text-base h-12 px-5">
                    Ontdek mijn budget <FileText className="w-4 h-4" />
                  </Button>
                )}
              </>
            )}
          </div>

          {!isReviewStep && !returnToReview && stepsRemaining > 0 && (
            <p className="text-[10px] text-muted-foreground text-right mt-1">
              Nog {stepsRemaining} {stepsRemaining === 1 ? "stap" : "stappen"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Mobile: sticky-bottom budget bar */}
      {!isReviewStep && (
        <div className="sm:hidden">
          <BudgetPreviewBar data={data} currentStep={step} totalSteps={STEPS.length} />
        </div>
      )}
    </div>
  );
};

export default IntakeForm;
