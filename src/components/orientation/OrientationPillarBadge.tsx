import { cn } from "@/lib/utils";
import { PILLAR_CONFIG, Pillar } from "@/constants/orientation";

interface OrientationPillarBadgeProps {
  pillar: Pillar;
  isComplete: boolean;
  className?: string;
}

export function OrientationPillarBadge({ 
  pillar, 
  isComplete,
  className 
}: OrientationPillarBadgeProps) {
  if (!isComplete) return null;

  const badge = PILLAR_CONFIG[pillar].badge;
  const IconComponent = badge.icon;

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
      "bg-primary/10 text-primary text-xs font-medium",
      "animate-in fade-in zoom-in duration-300",
      className
    )}>
      <IconComponent className="h-3.5 w-3.5" />
      <span>{badge.title}</span>
    </div>
  );
}
