import { Timer } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getDeadlineRule } from "@/hooks/useChecklistDeadlines";

interface DeadlineTriggerBadgeProps {
  templateKey: string;
  checklistItems: Array<{ template_key: string | null; completed_at: string | null }>;
  contractUploaded: boolean;
}

export function DeadlineTriggerBadge({ templateKey, checklistItems, contractUploaded }: DeadlineTriggerBadgeProps) {
  const rule = getDeadlineRule(templateKey);
  if (!rule) return null;

  // Check of de trigger is voltooid
  let isTriggered = false;
  let triggerStatusText = '';

  if (rule.trigger === 'sale_created') {
    isTriggered = true;
    triggerStatusText = 'Verkoop aangemaakt';
  } else if (rule.trigger === 'contract_uploaded') {
    isTriggered = contractUploaded;
    triggerStatusText = contractUploaded ? 'Contract geüpload' : 'Wacht op contract upload';
  } else if (rule.trigger === 'expected_delivery') {
    isTriggered = true; // Delivery date is set at sale level
    triggerStatusText = 'Opleverdatum ingesteld';
  } else if (rule.triggerTemplateKey) {
    const triggerMilestone = checklistItems.find(item => item.template_key === rule.triggerTemplateKey);
    isTriggered = !!triggerMilestone?.completed_at;
    
    const statusMap: Record<string, { done: string; pending: string }> = {
      'res_aanbetaling': { done: 'Aanbetaling ontvangen', pending: 'Wacht op aanbetaling' },
      'res_klant_ondertekend': { done: 'Reservatie ondertekend', pending: 'Wacht op reservatie ondertekening' },
      'koop_klant_ondertekend': { done: 'Koopcontract ondertekend', pending: 'Wacht op koopcontract ondertekening' },
      'voorb_aanpassingen': { done: 'Aanpassingen doorgegeven', pending: 'Wacht op aanpassingen doorgegeven' },
    };
    
    const status = statusMap[rule.triggerTemplateKey];
    triggerStatusText = status ? (isTriggered ? status.done : status.pending) : '';
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
            isTriggered 
              ? 'text-amber-600 bg-amber-50 border border-amber-200' 
              : 'text-muted-foreground bg-muted/50'
          }`}>
            <Timer className="h-3 w-3" />
            <span className="hidden sm:inline">{rule.offsetLabel}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium text-xs">{rule.triggerLabel}</p>
            <p className="text-xs text-muted-foreground">Deadline: {rule.offsetLabel}</p>
            <p className={`text-xs ${isTriggered ? 'text-amber-600' : 'text-muted-foreground'}`}>
              {isTriggered ? '✓ ' : '⏳ '}{triggerStatusText}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
