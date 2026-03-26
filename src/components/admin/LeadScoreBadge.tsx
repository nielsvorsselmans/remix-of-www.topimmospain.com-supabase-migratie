import { Badge } from "@/components/ui/badge";
import { Flame, Thermometer, Snowflake, Wind } from "lucide-react";

interface LeadScoreBadgeProps {
  score: number;
  temperature: 'hot' | 'warm' | 'cool' | 'cold';
}

export function LeadScoreBadge({ score, temperature }: LeadScoreBadgeProps) {
  const config = {
    hot: {
      icon: Flame,
      variant: "destructive" as const,
      className: "bg-destructive/10 text-destructive border-destructive",
    },
    warm: {
      icon: Thermometer,
      variant: "secondary" as const,
      className: "bg-orange-500/10 text-orange-500 border-orange-500",
    },
    cool: {
      icon: Wind,
      variant: "outline" as const,
      className: "bg-blue-500/10 text-blue-500 border-blue-500",
    },
    cold: {
      icon: Snowflake,
      variant: "outline" as const,
      className: "text-muted-foreground",
    },
  };

  const { icon: Icon, variant, className } = config[temperature];

  return (
    <Badge variant={variant} className={className}>
      <Icon className="h-3 w-3 mr-1" />
      {score}
    </Badge>
  );
}
