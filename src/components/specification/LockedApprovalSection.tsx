import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Lock, AlertCircle } from "lucide-react";
import { PhaseProgress } from "@/components/AankoopPhaseProgress";
import { SaleMilestone } from "@/hooks/useSales";

interface LockedApprovalSectionProps {
  voorbereidingProgress: PhaseProgress | undefined;
  voorbereidingMilestones: SaleMilestone[] | undefined;
}

export function LockedApprovalSection({ 
  voorbereidingProgress, 
  voorbereidingMilestones 
}: LockedApprovalSectionProps) {
  const progress = voorbereidingProgress || { total: 0, completed: 0, isComplete: false };
  const progressPercent = progress.total > 0 
    ? (progress.completed / progress.total) * 100 
    : 0;

  // Find incomplete milestones
  const incompleteTasks = (voorbereidingMilestones || []).filter(m => !m.completed_at);

  return (
    <Card className="border-dashed border-muted-foreground/30 bg-muted/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <CardTitle className="text-lg text-muted-foreground">Akkoord Geven</CardTitle>
            <CardDescription>
              Deze sectie wordt ontgrendeld zodra de Voorbereiding fase is afgerond
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-lg bg-background border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Voortgang Voorbereiding</span>
            <span className="text-sm text-muted-foreground">
              {progress.completed} van {progress.total} taken
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {incompleteTasks.length > 0 && (
          <div className="p-4 rounded-lg bg-amber-50/50 border border-amber-100">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Nog openstaande taken:</p>
                <ul className="mt-2 space-y-1">
                  {incompleteTasks.slice(0, 5).map((task) => (
                    <li key={task.id} className="text-sm text-amber-700 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      {task.title}
                    </li>
                  ))}
                  {incompleteTasks.length > 5 && (
                    <li className="text-sm text-amber-600 italic">
                      + {incompleteTasks.length - 5} andere taken
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        <p className="text-sm text-muted-foreground text-center">
          Zodra alle technische plannen en documentatie compleet zijn, kun je hier je akkoord geven 
          op de specificaties van je woning.
        </p>
      </CardContent>
    </Card>
  );
}
