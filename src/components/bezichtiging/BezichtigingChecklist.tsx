import { Check, Circle, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCustomer } from "@/hooks/useEffectiveCustomer";
import { BEZICHTIGING_TEMPLATES } from "@/hooks/journeyChecklistTemplates";
import { useIsMobile } from "@/hooks/use-mobile";

interface MilestoneStatus {
  key: string;
  completed: boolean;
}

export function BezichtigingChecklist() {
  const isMobile = useIsMobile();
  const { crmLeadId } = useEffectiveCustomer();

  const { data: milestones, isLoading } = useQuery({
    queryKey: ["bezichtiging-milestones", crmLeadId],
    queryFn: async () => {
      if (!crmLeadId) return [];
      
      const { data, error } = await supabase
        .from("journey_milestones")
        .select("template_key, completed_at")
        .eq("crm_lead_id", crmLeadId)
        .eq("phase", "bezichtiging");

      if (error) {
        console.error("Error fetching milestones:", error);
        return [];
      }

      return data.map(m => ({
        key: m.template_key,
        completed: !!m.completed_at,
      })) as MilestoneStatus[];
    },
    enabled: !!crmLeadId,
  });

  // Filter to only customer-visible templates
  const visibleTemplates = BEZICHTIGING_TEMPLATES.filter(t => t.customerVisible);
  
  // Map milestone status to templates
  const checklistItems = visibleTemplates.map(template => {
    const milestone = milestones?.find(m => m.key === template.key);
    return {
      ...template,
      completed: milestone?.completed || false,
    };
  });

  const completedCount = checklistItems.filter(item => item.completed).length;
  const totalCount = checklistItems.length;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-24 rounded-lg bg-muted animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const headerContent = (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold leading-none tracking-tight">Voortgang Bezichtiging</h3>
        <span className="text-sm text-muted-foreground">
          {completedCount} / {totalCount} afgerond
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2">
        <div 
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
        />
      </div>
    </>
  );

  const itemsContent = (
    <div className="space-y-3">
      {checklistItems.map((item, index) => {
        const isCompleted = item.completed;
        const isPreviousCompleted = index === 0 || checklistItems[index - 1].completed;
        const isLocked = !isCompleted && !isPreviousCompleted && index > 0;

        return (
          <div 
            key={item.key}
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
              isCompleted 
                ? 'bg-green-500/5 border border-green-500/20' 
                : isLocked 
                  ? 'bg-muted/30 opacity-60' 
                  : 'bg-muted/50'
            }`}
          >
            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
              isCompleted 
                ? 'bg-green-500 text-white' 
                : isLocked 
                  ? 'bg-muted text-muted-foreground' 
                  : 'border-2 border-primary/30'
            }`}>
              {isCompleted ? (
                <Check className="h-4 w-4" />
              ) : isLocked ? (
                <Lock className="h-3 w-3" />
              ) : (
                <Circle className="h-3 w-3 text-primary/50" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-medium text-sm ${isCompleted ? 'text-green-700 dark:text-green-400' : ''}`}>
                {item.title}
              </p>
              {item.description && (
                <p className="text-xs text-muted-foreground truncate">
                  {item.description}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {checklistItems.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Je bezichtigingschecklist wordt nog voorbereid.
        </p>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div className="space-y-3">
        {headerContent}
        {itemsContent}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        {headerContent}
      </CardHeader>
      <CardContent>
        {itemsContent}
      </CardContent>
    </Card>
  );
}
