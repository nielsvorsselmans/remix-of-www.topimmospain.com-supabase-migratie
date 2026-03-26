import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Heart, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StrategicAngle {
  id: string;
  title: string;
  description: string;
  targetAudienceFit: "INVESTOR" | "LIFESTYLE" | "BOTH";
  suggestedHook?: string;
}

interface StrategicAngleCardProps {
  angle: StrategicAngle;
  isSelected: boolean;
  onSelect: () => void;
}

const audienceIcons = {
  INVESTOR: Target,
  LIFESTYLE: Heart,
  BOTH: Users,
};

const audienceLabels = {
  INVESTOR: "Investeerder",
  LIFESTYLE: "Genieter",
  BOTH: "Beide doelgroepen",
};

export function StrategicAngleCard({ angle, isSelected, onSelect }: StrategicAngleCardProps) {
  const Icon = audienceIcons[angle.targetAudienceFit];

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        isSelected 
          ? "ring-2 ring-primary border-primary bg-primary/5" 
          : "hover:border-primary/50"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-base leading-tight">{angle.title}</h3>
          <div className={cn(
            "w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors",
            isSelected 
              ? "border-primary bg-primary" 
              : "border-muted-foreground/30"
          )}>
            {isSelected && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
            )}
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground leading-relaxed">
          {angle.description}
        </p>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs flex items-center gap-1">
            <Icon className="h-3 w-3" />
            {audienceLabels[angle.targetAudienceFit]}
          </Badge>
        </div>

        {angle.suggestedHook && (
          <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">
            "{angle.suggestedHook}"
          </p>
        )}
      </CardContent>
    </Card>
  );
}
