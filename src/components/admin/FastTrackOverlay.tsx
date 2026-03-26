import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, Check, Loader2, Circle, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export type FastTrackStep = "brainstorm" | "write" | "image";

interface FastTrackOverlayProps {
  currentStep: FastTrackStep;
  error?: string | null;
  onCancel: () => void;
}

const STEPS: { key: FastTrackStep; label: string }[] = [
  { key: "brainstorm", label: "Strategische briefing" },
  { key: "write", label: "Artikel schrijven" },
  { key: "image", label: "Afbeelding & SEO" },
];

function getStepState(stepKey: FastTrackStep, currentStep: FastTrackStep, error?: string | null) {
  const order = STEPS.map(s => s.key);
  const currentIdx = order.indexOf(currentStep);
  const stepIdx = order.indexOf(stepKey);

  if (error && stepIdx === currentIdx) return "error";
  if (stepIdx < currentIdx) return "done";
  if (stepIdx === currentIdx) return "active";
  return "pending";
}

export function FastTrackOverlay({ currentStep, error, onCancel }: FastTrackOverlayProps) {
  const currentIdx = STEPS.findIndex(s => s.key === currentStep);
  const progress = error ? (currentIdx / STEPS.length) * 100 : ((currentIdx) / STEPS.length) * 100;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-primary/20">
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-center gap-2 text-primary">
            <Zap className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Versneld genereren</h3>
          </div>

          <Progress value={progress} className="h-2" />

          <div className="space-y-3">
            {STEPS.map((step) => {
              const state = getStepState(step.key, currentStep, error);
              return (
                <div key={step.key} className="flex items-center gap-3">
                  {state === "done" && (
                    <Check className="h-5 w-5 text-green-600 shrink-0" />
                  )}
                  {state === "active" && (
                    <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
                  )}
                  {state === "error" && (
                    <X className="h-5 w-5 text-destructive shrink-0" />
                  )}
                  {state === "pending" && (
                    <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" />
                  )}
                  <span className={`text-sm ${
                    state === "done" ? "text-muted-foreground line-through" :
                    state === "active" ? "font-medium" :
                    state === "error" ? "text-destructive" :
                    "text-muted-foreground"
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <Button
            variant={error ? "default" : "outline"}
            size="sm"
            onClick={onCancel}
            className="w-full"
          >
            {error ? "Handmatig verdergaan" : "Annuleren"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
