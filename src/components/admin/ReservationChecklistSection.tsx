import { 
  useSaleChecklist, 
  useGenerateChecklistPhase,
  useToggleChecklistItem,
  RESERVATIE_CHECKLIST
} from "@/hooks/useSaleChecklist";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CheckCircle2, 
  ListChecks,
  Sparkles,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface ReservationChecklistSectionProps {
  saleId: string;
  koperDataComplete?: boolean;
}

export function ReservationChecklistSection({ 
  saleId, 
  koperDataComplete = false 
}: ReservationChecklistSectionProps) {
  const { data: checklist, isLoading } = useSaleChecklist(saleId);
  const generatePhase = useGenerateChecklistPhase();
  const toggleMutation = useToggleChecklistItem();

  const hasChecklist = checklist && checklist.length > 0;
  const completedCount = checklist?.filter(item => item.completed_at !== null).length || 0;
  const totalCount = checklist?.length || RESERVATIE_CHECKLIST.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleToggle = (itemId: string, isCurrentlyCompleted: boolean) => {
    toggleMutation.mutate({ itemId, isCompleted: !isCurrentlyCompleted, saleId });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Reservatie Checklist
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Reservatie Checklist
            {hasChecklist && (
              <Badge 
                variant={completedCount === totalCount ? "default" : "secondary"}
                className={completedCount === totalCount ? "bg-green-600" : ""}
              >
                {completedCount}/{totalCount}
              </Badge>
            )}
          </CardTitle>
          {hasChecklist && (
            <p className="text-sm text-muted-foreground mt-1">
              {completedCount === totalCount 
                ? "Alle taken voltooid!" 
                : `${totalCount - completedCount} taken nog te doen`
              }
            </p>
          )}
        </div>
        {!hasChecklist && (
          <Button
            onClick={() => generatePhase.mutate({ saleId, phase: 'reservatie' })}
            disabled={generatePhase.isPending}
            size="sm"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {generatePhase.isPending ? "Genereren..." : "Genereer Checklist"}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!hasChecklist ? (
          <div className="text-center py-8 text-muted-foreground">
            <ListChecks className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nog geen checklist voor deze verkoop.</p>
            <p className="text-sm">Klik op "Genereer Checklist" om de standaard taken toe te voegen.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Voortgang</span>
                <span className="font-medium">{Math.round(progressPercent)}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            {/* Checklist items */}
            <div className="space-y-2 mt-4">
              {checklist.map((item) => {
                const isCompleted = item.completed_at !== null;
                // Smart linking: auto-mark koperdata if reservation details are complete
                const isAutoCompleted = item.template_key === 'res_koperdata' && koperDataComplete && !isCompleted;
                
                return (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      isCompleted 
                        ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900" 
                        : isAutoCompleted
                        ? "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900"
                        : "bg-muted/30 hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      id={item.id}
                      checked={isCompleted || isAutoCompleted}
                      onCheckedChange={() => handleToggle(item.id, isCompleted)}
                      disabled={toggleMutation.isPending}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor={item.id}
                        className={`font-medium cursor-pointer ${
                          isCompleted ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {item.title}
                      </label>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {item.description}
                        </p>
                      )}
                      {isCompleted && item.completed_at && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Voltooid op {format(new Date(item.completed_at), "d MMM yyyy 'om' HH:mm", { locale: nl })}
                        </p>
                      )}
                      {isAutoCompleted && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Automatisch voltooid (alle koperdata compleet)
                        </p>
                      )}
                    </div>
                    {!isCompleted && item.target_date && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(item.target_date), "d MMM", { locale: nl })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
