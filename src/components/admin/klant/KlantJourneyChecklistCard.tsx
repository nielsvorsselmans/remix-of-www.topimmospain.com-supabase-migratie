import { useState, useEffect, useMemo } from "react";
import { Check, Circle, Plus, Loader2, ChevronDown, ChevronUp, UserCircle, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { 
  useJourneyMilestones, 
  useToggleJourneyMilestone,
  useGenerateAllJourneyPhases,
  JourneyMilestone 
} from "@/hooks/useJourneyMilestones";
import { JOURNEY_PHASE_TEMPLATES, JourneyPhase } from "@/hooks/journeyChecklistTemplates";

interface KlantJourneyChecklistCardProps {
  crmLeadId: string;
  currentPhase?: string;
  hasAccount?: boolean;
}

const PHASE_ORDER: JourneyPhase[] = ['orientatie', 'selectie', 'bezichtiging', 'aankoop', 'overdracht', 'beheer'];

// Pre-account template keys for highlighting
const PRE_ACCOUNT_KEYS = ['ori_lead_binnenkomst', 'ori_call_gepland', 'ori_call_gevoerd', 'ori_uitnodiging_verstuurd'];

export function KlantJourneyChecklistCard({ crmLeadId, currentPhase, hasAccount }: KlantJourneyChecklistCardProps) {
  const { data: milestones, isLoading } = useJourneyMilestones(crmLeadId, { includeAdminOnly: true });
  const toggleMilestone = useToggleJourneyMilestone();
  const generateAll = useGenerateAllJourneyPhases();
  
  const [openPhases, setOpenPhases] = useState<Set<string>>(new Set([currentPhase || 'orientatie']));

  // Auto-open current phase
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

  const handleToggle = (milestone: JourneyMilestone) => {
    toggleMilestone.mutate({
      milestoneId: milestone.id,
      isCompleted: !milestone.completed_at,
      crmLeadId,
    });
  };

  const handleGenerateAll = () => {
    generateAll.mutate({ crmLeadId });
  };

  // Group milestones by phase
  const milestonesByPhase = milestones?.reduce((acc, m) => {
    if (!acc[m.phase]) acc[m.phase] = [];
    acc[m.phase].push(m);
    return acc;
  }, {} as Record<JourneyPhase, JourneyMilestone[]>) || {};

  // Calculate stats
  const totalMilestones = milestones?.length || 0;
  const completedMilestones = milestones?.filter(m => m.completed_at).length || 0;
  const progressPercentage = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;
  
  // Check account status from milestones
  const accountMilestone = milestones?.find(m => m.template_key === 'ori_account');
  const accountCreated = hasAccount || !!accountMilestone?.completed_at;
  
  // Get pre-account progress
  const preAccountMilestones = milestones?.filter(m => PRE_ACCOUNT_KEYS.includes(m.template_key)) || [];
  const preAccountCompleted = preAccountMilestones.filter(m => m.completed_at).length;
  const preAccountTotal = preAccountMilestones.length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Journey Checklist laden...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Journey Checklist</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {completedMilestones}/{totalMilestones}
            </span>
            {totalMilestones === 0 && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleGenerateAll}
                disabled={generateAll.isPending}
              >
                {generateAll.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Plus className="h-4 w-4 mr-1" />
                )}
                Genereer taken
              </Button>
            )}
          </div>
        </div>
        {totalMilestones > 0 && (
          <Progress value={progressPercentage} className="h-2 mt-2" />
        )}
        
        {/* Pre-account status banner */}
        {totalMilestones > 0 && !accountCreated && (
          <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-700">Nog geen account</span>
              <Badge variant="outline" className="ml-auto text-xs">
                Pre-account: {preAccountCompleted}/{preAccountTotal}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Volg de admin-stappen hieronder om deze klant naar accountcreatie te begeleiden.
            </p>
          </div>
        )}
        
        {totalMilestones > 0 && accountCreated && (
          <div className="mt-3 p-3 rounded-lg bg-primary/10 border border-primary/30">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Account actief</span>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-3">
        {totalMilestones === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Geen journey taken. Klik op "Genereer taken" om de checklist aan te maken.
          </p>
        ) : (
          PHASE_ORDER.map(phase => {
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
                          milestone.completed_at ? "opacity-60" : "hover:bg-muted/50",
                          // Highlight pre-account steps with special styling
                          PRE_ACCOUNT_KEYS.includes(milestone.template_key) && !accountCreated && !milestone.completed_at
                            ? "bg-amber-500/5 border border-amber-500/20"
                            : ""
                        )}
                      >
                        <button
                          onClick={() => handleToggle(milestone)}
                          disabled={toggleMilestone.isPending}
                          className={cn(
                            "flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
                            milestone.completed_at
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground/30 hover:border-primary"
                          )}
                        >
                          {milestone.completed_at && (
                            <Check className="h-3 w-3" />
                          )}
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-sm",
                              milestone.completed_at && "line-through"
                            )}>
                              {milestone.title}
                            </span>
                            {milestone.admin_only && (
                              <Badge variant="outline" className="text-xs">Admin</Badge>
                            )}
                            {PRE_ACCOUNT_KEYS.includes(milestone.template_key) && (
                              <Badge variant="secondary" className="text-xs">Pre-account</Badge>
                            )}
                            {milestone.priority === 'high' && !milestone.completed_at && (
                              <Badge variant="destructive" className="text-xs">Hoog</Badge>
                            )}
                          </div>
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
          })
        )}
      </CardContent>
    </Card>
  );
}
