import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useClassifyInsights } from "@/hooks/useClassifyInsights";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ClassifyInsightsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClassifyInsightsDialog({ open, onOpenChange }: ClassifyInsightsDialogProps) {
  const [unclassifiedCount, setUnclassifiedCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { mutateAsync: classifyInsights, isPending } = useClassifyInsights();
  const { toast } = useToast();
  const [result, setResult] = useState<{
    processed: number;
    total: number;
    distribution?: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    if (open) {
      setResult(null);
      setIsLoading(true);
      supabase
        .from('insights')
        .select('id', { count: 'exact', head: true })
        .is('suggested_archetype', null)
        .then(({ count }) => {
          setUnclassifiedCount(count ?? 0);
          setIsLoading(false);
        });
    }
  }, [open]);

  const handleClassify = async () => {
    try {
      const data = await classifyInsights();
      setResult({
        processed: data.processed,
        total: data.total,
        distribution: data.distribution,
      });
      toast({
        title: "Classificatie voltooid",
        description: `${data.processed} van ${data.total} inzichten geclassificeerd`,
      });
    } catch (error) {
      toast({
        title: "Classificatie mislukt",
        description: error instanceof Error ? error.message : "Onbekende fout",
        variant: "destructive",
      });
    }
  };

  const archetypeLabels: Record<string, { label: string; icon: string }> = {
    lead_magnet: { label: "Lead Magnet", icon: "🧲" },
    hot_take: { label: "Hot Take", icon: "🌶️" },
    authority: { label: "Authority", icon: "🧠" },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Inzichten Herclassificeren
          </DialogTitle>
          <DialogDescription>
            Classificeer alle inzichten zonder archetype automatisch met AI.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : result ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">
                  {result.processed} van {result.total} inzichten geclassificeerd
                </span>
              </div>
              
              {result.distribution && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Verdeling:</p>
                  <div className="grid gap-2">
                    {Object.entries(result.distribution).map(([key, count]) => (
                      <div key={key} className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
                        <span className="flex items-center gap-2">
                          <span>{archetypeLabels[key]?.icon || "📝"}</span>
                          <span className="text-sm">{archetypeLabels[key]?.label || key}</span>
                        </span>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : unclassifiedCount === 0 ? (
            <div className="flex items-center gap-2 text-green-600 py-4">
              <CheckCircle2 className="h-5 w-5" />
              <span>Alle inzichten zijn al geclassificeerd!</span>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm">
                Er zijn <span className="font-bold text-primary">{unclassifiedCount}</span> inzichten 
                zonder archetype classificatie.
              </p>
              <p className="text-sm text-muted-foreground">
                De AI zal elk inzicht analyseren en classificeren als Lead Magnet, Hot Take, of Authority 
                op basis van het thema en de inhoud.
              </p>
              
              {isPending && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Classificeren... dit kan even duren</span>
                  </div>
                  <Progress value={undefined} className="h-2" />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {result ? (
            <Button onClick={() => onOpenChange(false)}>
              Sluiten
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Annuleren
              </Button>
              <Button 
                onClick={handleClassify} 
                disabled={isPending || unclassifiedCount === 0}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Classificeren...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Start Classificatie
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
