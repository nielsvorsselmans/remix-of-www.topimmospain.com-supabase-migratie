import { AlertCircle, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWorkflowCounts } from "@/hooks/useContentWorkflow";

interface ActionCardsProps {
  onNavigate: (tab: string) => void;
}

export function ActionCards({ onNavigate }: ActionCardsProps) {
  const { data: counts } = useWorkflowCounts();

  const gaps = counts?.questions ?? 0;
  const drafts = counts?.blogDrafts ?? 0;

  const cards = [
    {
      icon: AlertCircle,
      count: gaps,
      label: "klantvragen gevonden",
      action: "Bekijk",
      tab: "ontdekken",
      empty: "Nog geen vragen",
      accent: gaps > 0 ? "border-l-primary" : "border-l-muted",
    },
    {
      icon: Send,
      count: drafts,
      label: "klaar om te publiceren",
      action: "Publiceer",
      tab: "publiceren",
      empty: "Geen concepten",
      accent: drafts > 0 ? "border-l-green-600" : "border-l-muted",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {cards.map((card) => (
        <Card
          key={card.tab}
          className={`border-l-4 ${card.accent} cursor-pointer transition-shadow hover:shadow-md`}
          onClick={() => onNavigate(card.tab)}
        >
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <card.icon className="h-5 w-5 text-muted-foreground" />
              <div>
                {card.count > 0 ? (
                  <>
                    <span className="text-xl font-bold text-foreground">{card.count}</span>
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">{card.empty}</p>
                )}
              </div>
            </div>
            {card.count > 0 && (
              <Button size="sm" variant="ghost" className="shrink-0 text-xs">
                {card.action} →
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
