import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { calculateProfileCompleteness } from "@/utils/profileCompleteness";

interface ProfileCompletenessBannerProps {
  explicitPreferences: Record<string, any> | null;
  onStartOnboarding: () => void;
}

const DISMISS_KEY = "profile_banner_dismissed";

export function ProfileCompletenessBanner({ 
  explicitPreferences, 
  onStartOnboarding,
}: ProfileCompletenessBannerProps) {
  const [dismissed, setDismissed] = useState(() => 
    localStorage.getItem(DISMISS_KEY) === "true"
  );

  const completeness = calculateProfileCompleteness(explicitPreferences);

  if (dismissed || completeness >= 80) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-background to-primary/10 border-primary/20">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-semibold text-sm">Maak je profiel compleet</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Beantwoord een paar korte vragen zodat we je de beste projecten kunnen tonen.
              </p>
              <div className="flex items-center gap-2">
                <Progress value={completeness} className="h-1.5 w-24" />
                <span className="text-xs text-muted-foreground">{completeness}%</span>
              </div>
              <Button size="sm" onClick={onStartOnboarding} className="mt-1 h-8 text-xs">
                Vragen beantwoorden
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleDismiss} className="shrink-0 h-8 w-8">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
