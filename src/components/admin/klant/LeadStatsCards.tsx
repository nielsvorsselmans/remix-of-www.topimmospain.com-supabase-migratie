import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Phone, Target, Mail, CalendarClock } from "lucide-react";
import type { LeadStats } from "@/hooks/useLeadsToFollow";

interface LeadStatsCardsProps {
  stats: LeadStats;
  onFilterClick?: (filter: string) => void;
  activeFilter?: string;
}

export function LeadStatsCards({ stats, onFilterClick, activeFilter }: LeadStatsCardsProps) {
  const cards = [
    {
      key: "needsAction",
      label: "Actie nodig",
      value: stats.needsAction,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-100 dark:bg-red-900/30",
    },
    {
      key: "appointmentSoon",
      label: "Afspraak binnenkort",
      value: stats.appointmentSoon,
      icon: CalendarClock,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    },
    {
      key: "callPlanned",
      label: "Call gepland",
      value: stats.callPlanned,
      icon: Phone,
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
    },
    {
      key: "postOrientatie",
      label: "Na oriëntatie",
      value: stats.postOrientatie,
      icon: Target,
      color: "text-violet-600",
      bgColor: "bg-violet-100 dark:bg-violet-900/30",
    },
    {
      key: "invitationSent",
      label: "Uitnodiging verstuurd",
      value: stats.invitationSent,
      icon: Mail,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeFilter === card.key;

        return (
          <Card
            key={card.key}
            className={`cursor-pointer transition-all hover:shadow-md ${isActive ? "ring-2 ring-primary" : ""}`}
            onClick={() => onFilterClick?.(isActive ? "" : card.key)}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground truncate">{card.label}</p>
                  <p className="text-xl font-bold">{card.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
