import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, UserCog, UserX, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type TriageDecision = "hot" | "nurture" | "dropped";

interface PostCallTriageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDecision: (decision: TriageDecision) => void;
  isProcessing?: boolean;
  appointmentTitle?: string;
}

const TRIAGE_OPTIONS = [
  {
    id: "hot" as TriageDecision,
    icon: Flame,
    title: "Hot — Plan volgende stap",
    description: "Klant is geïnteresseerd en komt binnenkort naar Spanje. Plan een vervolgafspraak en/of bezichtigingsreis.",
    color: "text-orange-500",
    bgColor: "border-orange-200 bg-orange-50 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-950/30 dark:hover:bg-orange-950/50",
    selectedColor: "border-orange-500 bg-orange-100 dark:bg-orange-950/50",
  },
  {
    id: "nurture" as TriageDecision,
    icon: UserCog,
    title: "Nurture — AI SDR opvolging",
    description: "Nog early stage. AI genereert opvolgacties om deze lead warm te houden.",
    color: "text-blue-500",
    bgColor: "border-blue-200 bg-blue-50 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/30 dark:hover:bg-blue-950/50",
    selectedColor: "border-blue-500 bg-blue-100 dark:bg-blue-950/50",
  },
  {
    id: "dropped" as TriageDecision,
    icon: UserX,
    title: "Afgehaakt — Niet interessant",
    description: "Dit gesprek leidt niet tot een samenwerking. Markeer als afgehaakt.",
    color: "text-destructive",
    bgColor: "border-red-200 bg-red-50 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:hover:bg-red-950/50",
    selectedColor: "border-red-500 bg-red-100 dark:bg-red-950/50",
  },
] as const;

export function PostCallTriageDialog({
  open,
  onOpenChange,
  onDecision,
  isProcessing = false,
  appointmentTitle,
}: PostCallTriageDialogProps) {
  const [selected, setSelected] = useState<TriageDecision | null>(null);

  const handleConfirm = () => {
    if (selected) {
      onDecision(selected);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelected(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Wat is de volgende stap?</DialogTitle>
          <DialogDescription>
            Notities voor "{appointmentTitle || 'Gesprek'}" zijn opgeslagen. Hoe wil je verder met deze lead?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {TRIAGE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = selected === option.id;

            return (
              <Card
                key={option.id}
                className={cn(
                  "cursor-pointer transition-all border-2",
                  isSelected ? option.selectedColor : option.bgColor
                )}
                onClick={() => setSelected(option.id)}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <Icon className={cn("h-6 w-6 mt-0.5 shrink-0", option.color)} />
                  <div>
                    <p className="font-medium text-sm">{option.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => handleOpenChange(false)}
          >
            Later beslissen
          </Button>
          <Button
            className="flex-1"
            onClick={handleConfirm}
            disabled={!selected || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Bezig...
              </>
            ) : (
              <>
                Bevestigen
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
