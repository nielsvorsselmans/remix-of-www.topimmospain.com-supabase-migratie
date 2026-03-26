import { Card } from "@/components/ui/card";
import { Users, UserCheck, TrendingUp, Euro } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PartnerStatsCardsProps {
  referrals: any[];
  leads: any[];
  isLoading: boolean;
}

export function PartnerStatsCards({ referrals, leads, isLoading }: PartnerStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-24" />
          </Card>
        ))}
      </div>
    );
  }

  const totalVisitors = referrals.length;
  const totalLeads = leads.length;
  const conversionRate = totalVisitors > 0 
    ? ((totalLeads / totalVisitors) * 100).toFixed(1)
    : "0.0";

  // Calculate total budget from leads with budget data
  const totalBudget = leads.reduce((sum, lead) => {
    const budget = lead.crm_lead?.inferred_budget_max || lead.inferred_budget_max;
    if (budget) {
      return sum + budget;
    }
    return sum;
  }, 0);

  const stats = [
    {
      label: "Totaal Bezoekers",
      value: totalVisitors,
      icon: Users,
      color: "text-blue-500",
    },
    {
      label: "Geconverteerde Leads",
      value: totalLeads,
      icon: UserCheck,
      color: "text-green-500",
    },
    {
      label: "Conversie Ratio",
      value: `${conversionRate}%`,
      icon: TrendingUp,
      color: "text-orange-500",
    },
    {
      label: "Totaal Budget",
      value: totalBudget > 0 ? `€${(totalBudget / 1000).toFixed(0)}k` : "€0",
      icon: Euro,
      color: "text-purple-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg bg-muted ${stat.color}`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
