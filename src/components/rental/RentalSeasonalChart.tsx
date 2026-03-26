import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface RentalSeasonalChartProps {
  monthlyDistributions: number[];
  annualRevenue: number;
  currency: string;
  compact?: boolean;
}

const MONTH_NAMES = ["Jan", "Feb", "Mrt", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

export function RentalSeasonalChart({
  monthlyDistributions,
  annualRevenue,
  currency,
  compact = false
}: RentalSeasonalChartProps) {
  const currencySymbol = currency === 'EUR' ? '€' : currency;

  // Defensive check for undefined data
  if (!monthlyDistributions || !Array.isArray(monthlyDistributions)) {
    return (
      <Card className="shadow-elegant">
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>Seizoensdata momenteel niet beschikbaar</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = monthlyDistributions.map((distribution, index) => ({
    month: MONTH_NAMES[index],
    revenue: Math.round(distribution * annualRevenue),
    percentage: distribution * 100
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-elegant p-4 animate-fade-in">
          <p className="text-sm font-semibold text-foreground mb-2">{data.month}</p>
          <p className="text-2xl font-bold text-primary mb-1">
            {currencySymbol}{data.revenue.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.percentage.toFixed(1)}% van jaaropbrengst
          </p>
        </div>
      );
    }
    return null;
  };

  if (compact) {
    return (
      <Card className="overflow-hidden h-full">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Seizoensverdeling
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="w-full h-36">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenueCompact" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenueCompact)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Seizoensverdeling Opbrengsten
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="month" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `${currencySymbol}${value.toLocaleString()}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-4">
          De grafiek toont de verwachte maandelijkse opbrengsten op basis van seizoenspatronen
        </p>
      </CardContent>
    </Card>
  );
}
