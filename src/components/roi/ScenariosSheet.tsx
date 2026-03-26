import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, FolderOpen, TrendingUp, Calendar } from "lucide-react";
import { ROIScenario } from "@/hooks/useROIScenarios";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";

interface ScenariosSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenarios: ROIScenario[];
  onLoad: (scenario: ROIScenario) => void;
  onDelete: (scenarioId: string) => void;
  isLoading?: boolean;
}


export function ScenariosSheet({
  open,
  onOpenChange,
  scenarios,
  onLoad,
  onDelete,
  isLoading,
}: ScenariosSheetProps) {
  const handleLoad = (scenario: ROIScenario) => {
    onLoad(scenario);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Mijn Scenario's
          </SheetTitle>
          <SheetDescription>
            Klik op een scenario om het te laden in de calculator.
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-180px)] mt-6 pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : scenarios.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Je hebt nog geen scenario's opgeslagen.</p>
              <p className="text-sm mt-2">
                Gebruik de "Scenario Opslaan" knop om je eerste scenario op te slaan.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {scenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer group"
                  onClick={() => handleLoad(scenario)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{scenario.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatCurrency(scenario.purchase_price)} · {scenario.property_type === 'nieuwbouw' ? 'Nieuwbouw' : 'Bestaande bouw'}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(scenario.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-3 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span>
                        {scenario.annual_roi != null ? `${scenario.annual_roi.toFixed(1)}% ROI/jaar` : '-'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {format(new Date(scenario.updated_at), 'd MMM yyyy', { locale: nl })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
