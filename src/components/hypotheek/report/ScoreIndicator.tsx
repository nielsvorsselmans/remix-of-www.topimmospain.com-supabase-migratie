import { cn } from "@/lib/utils";

interface ScoreIndicatorProps {
  percentage: number;
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

const sizeMap = {
  sm: { container: "w-16 h-16", text: "text-lg", stroke: 4 },
  md: { container: "w-24 h-24", text: "text-2xl", stroke: 6 },
  lg: { container: "w-32 h-32", text: "text-3xl", stroke: 8 },
};

const ScoreIndicator = ({ percentage, size = "md", label, className }: ScoreIndicatorProps) => {
  const s = sizeMap[size];
  const radius = size === "sm" ? 24 : size === "md" ? 38 : 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = (pct: number) => {
    if (pct >= 80) return "text-green-500";
    if (pct >= 60) return "text-accent-foreground";
    if (pct >= 40) return "text-yellow-500";
    return "text-destructive";
  };

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className={cn("relative", s.container)}>
        <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${(radius + s.stroke) * 2} ${(radius + s.stroke) * 2}`}>
          <circle cx={radius + s.stroke} cy={radius + s.stroke} r={radius} fill="none" className="stroke-muted" strokeWidth={s.stroke} />
          <circle cx={radius + s.stroke} cy={radius + s.stroke} r={radius} fill="none" className={cn("transition-all duration-1000 ease-out", getColor(percentage))} stroke="currentColor" strokeWidth={s.stroke} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
        </svg>
        <div className={cn("absolute inset-0 flex items-center justify-center font-bold font-sans", s.text, getColor(percentage))}>
          {percentage}%
        </div>
      </div>
      {label && <span className="text-sm text-muted-foreground font-sans">{label}</span>}
    </div>
  );
};

export default ScoreIndicator;
