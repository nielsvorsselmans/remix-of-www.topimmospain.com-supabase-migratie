import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CheckSquare, Star, Heart, Compass, Globe } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface SelectionStatsProps {
  totalProjects: number;
  adminCount: number;
  interestedCount: number;
  pendingCount: number;
  externalCount?: number;
}

export function SelectionStats({
  totalProjects,
  adminCount,
  interestedCount,
  pendingCount,
  externalCount = 0,
}: SelectionStatsProps) {
  const isMobile = useIsMobile();

  const stats = [
    { icon: Compass, value: pendingCount, label: "Te beoordelen", color: "text-amber-500", priority: 1 },
    { icon: Heart, value: interestedCount, label: "Interessant", color: "text-green-500", priority: 2 },
    ...(externalCount > 0 ? [{ icon: Globe, value: externalCount, label: "Extern", color: "text-blue-500", priority: 3 }] : []),
    { icon: Star, value: adminCount, label: "Van adviseur", color: "text-primary", priority: 4 },
    { icon: CheckSquare, value: totalProjects, label: "Totaal", color: "text-primary", priority: 5 },
  ];

  // On mobile, show only the 2 most important stats prominently
  const mobilePriorityStats = isMobile 
    ? stats.filter(s => s.priority <= 2)
    : stats;

  return (
    <TooltipProvider>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide md:grid md:grid-cols-4 md:gap-4 md:overflow-visible md:pb-0">
        {mobilePriorityStats.map((stat) => (
          <Tooltip key={stat.label}>
            <TooltipTrigger asChild>
              <Card className="flex-shrink-0 min-w-[100px] md:min-w-0 cursor-help">
                <CardContent className="p-3 md:p-4 text-center">
                  <div className="flex items-center justify-center mb-1 md:mb-2">
                    <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.color}`} />
                  </div>
                  <p className="text-xl md:text-2xl font-bold">{stat.value}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {stat.label === "Totaal" && "Totaal aantal projecten in je selectie"}
                {stat.label === "Van adviseur" && "Projecten speciaal voor jou geselecteerd door je adviseur"}
                {stat.label === "Interessant" && "Projecten die je als interessant hebt gemarkeerd"}
                {stat.label === "Te beoordelen" && "Projecten die nog beoordeeld moeten worden"}
                {stat.label === "Extern" && "Externe panden buiten ons portfolio, door je adviseur voorgesteld"}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
        
        {/* Show remaining stats as smaller badges on mobile */}
        {isMobile && (
          <div className="flex items-center gap-2 flex-shrink-0 pl-1">
            {stats.filter(s => s.priority > 2).map((stat) => (
              <div 
                key={stat.label}
                className="flex items-center gap-1 bg-muted rounded-full px-2 py-1"
              >
                <stat.icon className={`h-3 w-3 ${stat.color}`} />
                <span className="text-xs font-medium">{stat.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
