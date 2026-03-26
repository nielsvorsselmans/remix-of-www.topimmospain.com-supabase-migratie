import { Lightbulb, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";

const TIPS = [
  "Download de app van je luchtvaartmaatschappij voor gemakkelijk inchecken",
  "Neem comfortabele schoenen mee voor bouwplaatsbezoeken",
  "Print je bezichtigingsplanning of sla deze offline op",
  "Bereid vragen per project voor zodat je niets vergeet",
  "Neem een notitieboekje of gebruik je telefoon voor aantekeningen",
];

export function BezichtigingTips() {
  const isMobile = useIsMobile();

  const content = (
    <>
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <h3 className="text-base font-semibold leading-none tracking-tight">Tips voor je bezichtigingsreis</h3>
      </div>
      <div className="space-y-2">
        {TIPS.map((tip, index) => (
          <div key={index} className="flex items-start gap-2 text-sm min-w-0">
            <Check className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <span className="text-muted-foreground">{tip}</span>
          </div>
        ))}
      </div>
    </>
  );

  if (isMobile) {
    return (
      <div className="rounded-lg bg-amber-50/30 dark:bg-amber-950/20 p-4">
        {content}
      </div>
    );
  }

  return (
    <Card className="border-amber-200/50 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-950/20">
      <CardContent className="p-6">
        {content}
      </CardContent>
    </Card>
  );
}
