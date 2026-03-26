import { useState } from "react";
import { MessageSquare, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentQuestionsBoard } from "./ContentQuestionsBoard";
import { InsightsTable } from "./InsightsTable";
import type { CreatePagePrefill } from "./CreatePage";

interface DiscoverPageProps {
  onNavigateToCreate?: (prefill: CreatePagePrefill) => void;
  onNavigateToBriefing?: (briefingId: string) => void;
}

export function DiscoverPage({ onNavigateToCreate, onNavigateToBriefing }: DiscoverPageProps) {
  const [view, setView] = useState<"klantvragen" | "inzichten">("klantvragen");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">
            {view === "klantvragen" ? "Content Radar" : "Inzichten"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {view === "klantvragen"
              ? "Klantvragen uit gesprekken — elke vraag kan direct een blog worden."
              : "Gevalideerde klantinzichten gegroepeerd per thema."}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-0.5">
          <Button
            size="sm"
            variant={view === "klantvragen" ? "default" : "ghost"}
            className="h-7 text-xs gap-1.5"
            onClick={() => setView("klantvragen")}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Klantvragen
          </Button>
          <Button
            size="sm"
            variant={view === "inzichten" ? "default" : "ghost"}
            className="h-7 text-xs gap-1.5"
            onClick={() => setView("inzichten")}
          >
            <Lightbulb className="h-3.5 w-3.5" />
            Inzichten
          </Button>
        </div>
      </div>

      {view === "klantvragen" ? (
        <ContentQuestionsBoard onNavigateToCreate={onNavigateToCreate} onNavigateToBriefing={onNavigateToBriefing} />
      ) : (
        <InsightsTable />
      )}
    </div>
  );
}
