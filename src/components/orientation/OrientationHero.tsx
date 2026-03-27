import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Download, Users, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OrientationHeroProps {
  firstName?: string;
  progressPercentage: number;
  completedCount: number;
  totalCount: number;
  remainingReadTime: number;
  onStartReading: () => void;
  hasStarted: boolean;
  investmentGoal?: string;
}

// Personalized intro based on investment goal
const getPersonalizedIntro = (goal?: string): string | null => {
  switch (goal) {
    case 'rendement':
      return "Omdat je interesse hebt in rendement, raden we aan te beginnen met Financiering. Hier leer je precies welke hypotheekopties er zijn.";
    case 'eigen_gebruik':
      return "Omdat je zoekt naar een plek voor eigen gebruik, raden we aan te beginnen met Regio's. Ontdek welke streek bij jouw wensen past.";
    case 'combinatie':
      return "Met een combinatie van rendement én genieten, is het slim om te starten met de Vastgoedmarkt. Leer waar de beste kansen liggen.";
    default:
      return null;
  }
};

export function OrientationHero({
  firstName,
  progressPercentage,
  completedCount,
  totalCount,
  remainingReadTime,
  onStartReading,
  hasStarted,
  investmentGoal,
}: OrientationHeroProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const personalizedIntro = getPersonalizedIntro(investmentGoal);

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-orientation-pdf', {
        method: 'POST',
      });

      if (error) {
        throw error;
      }

      if (data?.htmlBase64) {
        const htmlContent = decodeURIComponent(escape(atob(data.htmlBase64)));
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          toast.success('Gids geopend! Gebruik Ctrl+P om als PDF op te slaan.');
        }
      } else {
        throw new Error('Geen content ontvangen');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Er ging iets mis bij het downloaden. Probeer het later opnieuw.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/20 border border-primary/10">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-accent/10 to-transparent rounded-full blur-2xl translate-y-1/4 -translate-x-1/4" />

      {/* Content */}
      <div className="relative z-10 p-6 md:p-8 lg:p-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Left side - Welcome & Progress */}
          <div className="space-y-4 flex-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-primary">Oriëntatiegids</span>
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
                {firstName ? (
                  <>Welkom terug, <span className="text-primary">{firstName}</span>!</>
                ) : (
                  <>Je persoonlijke <span className="text-primary">gids</span></>
                )}
              </h1>
              <p className="text-muted-foreground mt-2 text-base md:text-lg max-w-xl">
                {hasStarted
                  ? `Je bent goed op weg! Nog ${totalCount - completedCount} artikelen te gaan.`
                  : personalizedIntro || "Ontdek alles wat je moet weten over investeren in Spaans vastgoed."
                }
              </p>
            </div>

            {/* Social proof strip */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4 text-primary" />
              <span>Deze maand al 200+ mensen begonnen met lezen</span>
            </div>

            {/* Progress section */}
            <div className="space-y-2 max-w-md">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {completedCount} van {totalCount} artikelen
                </span>
                <span className={cn(
                  "font-semibold",
                  hasStarted ? "text-primary" : "text-muted-foreground"
                )}>
                  {progressPercentage}%
                </span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
              <p className="text-xs text-muted-foreground">
                ±{remainingReadTime} minuten leestijd resterend
              </p>
            </div>
          </div>

          {/* Right side - CTA buttons */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 flex-shrink-0">
            <Button
              size="lg"
              onClick={onStartReading}
              className="group h-12 px-6 text-base shadow-lg hover:shadow-xl transition-all"
            >
              {hasStarted ? "Ga verder met lezen" : "Begin met lezen"}
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="h-12 px-6 text-base gap-2"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Bezig met genereren...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
