import { useMemo, useState, useEffect } from "react";
import { Check, ChevronDown, ChevronUp, UserCircle, UserCheck, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { PartnerKlant, PartnerKlantMilestone } from "@/hooks/usePartnerKlant";
import { JOURNEY_PHASE_TEMPLATES, JourneyPhase } from "@/hooks/journeyChecklistTemplates";

interface PartnerKlantJourneyChecklistCardProps {
  klant: PartnerKlant;
}

const PHASE_ORDER: JourneyPhase[] = ['orientatie', 'selectie', 'bezichtiging'];
const PRE_ACCOUNT_KEYS = ['ori_lead_binnenkomst', 'ori_call_gepland', 'ori_call_gevoerd', 'ori_uitnodiging_verstuurd'];

export function PartnerKlantJourneyChecklistCard({ klant }: PartnerKlantJourneyChecklistCardProps) {
  const milestones = klant.milestones || [];
  const currentPhase = klant.journey_phase || 'orientatie';
  const hasAccount = !!klant.user_id;
  
  const [openPhases, setOpenPhases] = useState<Set<string>>(new Set([currentPhase]));

  useEffect(() => {
    if (currentPhase) {
      setOpenPhases(prev => new Set([...prev, currentPhase]));
    }
  }, [currentPhase]);

  const togglePhase = (phase: string) => {
    setOpenPhases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(phase)) {
        newSet.delete(phase);
      } else {
        newSet.add(phase);
      }
      return newSet;
    });
  };

  // Group milestones by phase - only customer visible ones for partners
  const milestonesByPhase = useMemo(() => {
    return milestones
      .filter(m => m.customer_visible)
      .reduce((acc, m) => {
        if (!acc[m.phase]) acc[m.phase] = [];
        acc[m.phase].push(m);
        return acc;
      }, {} as Record<string, PartnerKlantMilestone[]>);
  }, [milestones]);

  // Calculate stats - only customer visible
  const visibleMilestones = milestones.filter(m => m.customer_visible);
  const totalMilestones = visibleMilestones.length;
  const completedMilestones = visibleMilestones.filter(m => m.completed_at).length;
  const progressPercentage = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;
  
  // Check account status
  const accountMilestone = milestones.find(m => m.template_key === 'ori_account');
  const accountCreated = hasAccount || !!accountMilestone?.completed_at;

  if (totalMilestones === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Journey Voortgang</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nog geen journey taken beschikbaar voor deze klant.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Journey Voortgang</CardTitle>
          <span className="text-sm text-muted-foreground">
            {completedMilestones}/{totalMilestones}
          </span>
        </div>
        <Progress value={progressPercentage} className="h-2 mt-2" />
        
        {/* Account status banner */}
        {!accountCreated && (
          <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Nog geen account</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Klant heeft nog geen portaalaccount aangemaakt.
            </p>
          </div>
        )}
        
        {accountCreated && (
          <div className="mt-3 p-3 rounded-lg bg-primary/10 border border-primary/30">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Account actief</span>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-3">
        {PHASE_ORDER.map(phase => {
          const phaseConfig = JOURNEY_PHASE_TEMPLATES[phase];
          const phaseMilestones = milestonesByPhase[phase] || [];
          const phaseCompleted = phaseMilestones.filter(m => m.completed_at).length;
          const phaseTotal = phaseMilestones.length;
          const isCurrentPhase = currentPhase === phase;
          const isOpen = openPhases.has(phase);

          if (phaseTotal === 0) return null;

          return (
            <Collapsible 
              key={phase} 
              open={isOpen}
              onOpenChange={() => togglePhase(phase)}
            >
              <CollapsibleTrigger asChild>
                <div 
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors",
                    isCurrentPhase 
                      ? "bg-primary/10 border border-primary/30" 
                      : "bg-muted/50 hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium">{phaseConfig.label}</span>
                    {isCurrentPhase && (
                      <Badge variant="secondary" className="text-xs">Huidige fase</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {phaseCompleted}/{phaseTotal}
                    </span>
                    {phaseCompleted === phaseTotal && phaseTotal > 0 && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="pt-2 pl-4 space-y-1">
                {phaseMilestones
                  .sort((a, b) => a.order_index - b.order_index)
                  .map(milestone => (
                    <div
                      key={milestone.id}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-md transition-colors",
                        milestone.completed_at ? "opacity-60" : ""
                      )}
                    >
                      {/* Read-only indicator */}
                      <div
                        className={cn(
                          "flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center",
                          milestone.completed_at
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {milestone.completed_at && (
                          <Check className="h-3 w-3" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <span className={cn(
                          "text-sm",
                          milestone.completed_at && "line-through"
                        )}>
                          {milestone.title}
                        </span>
                        {milestone.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {milestone.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
