import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface GameCardProps {
  title: string;
  description: string;
  badge?: string;
  icon?: LucideIcon;
  isCompleted?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function GameCard({
  title,
  description,
  badge,
  icon: Icon,
  isCompleted,
  className,
  children,
}: GameCardProps) {
  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300",
      isCompleted 
        ? "border-primary/50 bg-primary/5" 
        : "border-2 border-dashed border-primary/30 hover:border-primary/50 hover:shadow-lg",
      className
    )}>
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
      
      <CardHeader className="relative pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
            )}
            <div>
              {badge && (
                <Badge variant="secondary" className="mb-1 text-xs">
                  {badge}
                </Badge>
              )}
              <CardTitle className="text-lg">{title}</CardTitle>
            </div>
          </div>
        </div>
        <CardDescription className="mt-2">{description}</CardDescription>
      </CardHeader>
      
      <CardContent className="relative pt-0">
        {children}
      </CardContent>
    </Card>
  );
}
