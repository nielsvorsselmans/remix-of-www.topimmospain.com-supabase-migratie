import { ScoreBreakdown } from "@/hooks/useCRMLeads";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Eye, Clock, Heart, User, Calendar, TrendingUp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EngagementBreakdownProps {
  breakdown: ScoreBreakdown;
}

interface ScoreBarProps {
  label: string;
  icon: React.ElementType;
  score: number;
  max: number;
  details: string;
  color: string;
}

function ScoreBar({ label, icon: Icon, score, max, details, color }: ScoreBarProps) {
  const percentage = (score / max) * 100;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{label}</span>
              </div>
              <span className="text-muted-foreground">
                {score}/{max}
              </span>
            </div>
            <Progress 
              value={percentage} 
              className="h-2"
              style={{
                // @ts-ignore - Custom CSS variable for progress color
                '--progress-background': `hsl(var(${color}))`,
              }}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{details}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function getTemperatureConfig(temperature: string) {
  switch (temperature) {
    case 'hot':
      return {
        icon: '🔥',
        label: 'Hot Lead',
        description: 'Hoge betrokkenheid - Direct opvolgen',
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
      };
    case 'warm':
      return {
        icon: '🌡️',
        label: 'Warm Lead',
        description: 'Goede betrokkenheid - Nurturing campagne',
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
      };
    case 'cool':
      return {
        icon: '❄️',
        label: 'Cool Lead',
        description: 'Basis betrokkenheid - Passief monitoren',
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
      };
    case 'cold':
      return {
        icon: '🧊',
        label: 'Cold Lead',
        description: 'Weinig betrokkenheid - Geen directe actie',
        color: 'text-muted-foreground',
        bgColor: 'bg-muted/50',
      };
    default:
      return {
        icon: '📊',
        label: 'Lead',
        description: 'Onbekende status',
        color: 'text-muted-foreground',
        bgColor: 'bg-muted/50',
      };
  }
}

export function EngagementBreakdown({ breakdown }: EngagementBreakdownProps) {
  const tempConfig = getTemperatureConfig(breakdown.temperature);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Engagement Score
          </div>
          <Badge variant="outline" className="text-2xl font-bold">
            {breakdown.total}/100
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Temperature Badge */}
        <div className={`p-4 rounded-lg ${tempConfig.bgColor}`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{tempConfig.icon}</span>
            <div>
              <div className={`font-semibold ${tempConfig.color}`}>
                {tempConfig.label}
              </div>
              <div className="text-sm text-muted-foreground">
                {tempConfig.description}
              </div>
            </div>
          </div>
        </div>

        {/* Score Bars */}
        <div className="space-y-4">
          <ScoreBar
            label="Volume"
            icon={Eye}
            score={breakdown.volume.score}
            max={breakdown.volume.max}
            details={breakdown.volume.details}
            color="--primary"
          />
          
          <ScoreBar
            label="Diepte"
            icon={Clock}
            score={breakdown.depth.score}
            max={breakdown.depth.max}
            details={breakdown.depth.details}
            color="--chart-1"
          />
          
          <ScoreBar
            label="Intentie"
            icon={Heart}
            score={breakdown.intent.score}
            max={breakdown.intent.max}
            details={breakdown.intent.details}
            color="--chart-2"
          />
          
          <ScoreBar
            label="Contact"
            icon={User}
            score={breakdown.qualification.score}
            max={breakdown.qualification.max}
            details={breakdown.qualification.details}
            color="--chart-3"
          />
          
          <ScoreBar
            label="Recency"
            icon={Calendar}
            score={breakdown.recency.score}
            max={breakdown.recency.max}
            details={breakdown.recency.details}
            color="--chart-4"
          />
        </div>

        {/* Recommended Action */}
        <div className="pt-4 border-t">
          <div className="text-sm font-medium mb-2">Aanbevolen Actie:</div>
          <div className="text-sm text-muted-foreground">
            {breakdown.temperature === 'hot' && (
              '📞 Direct contact opnemen via telefoon of email. Deze lead toont sterke interesse.'
            )}
            {breakdown.temperature === 'warm' && (
              '📧 Stuur een gerichte follow-up email met relevante projecten en informatie.'
            )}
            {breakdown.temperature === 'cool' && (
              '📊 Blijf monitoren en voeg toe aan een nurturing campagne voor toekomstige betrokkenheid.'
            )}
            {breakdown.temperature === 'cold' && (
              '⏸️ Geen directe actie nodig. Deze lead toont momenteel weinig interesse.'
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}