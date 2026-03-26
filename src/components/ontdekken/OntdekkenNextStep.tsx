import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Calculator, 
  BookOpen, 
  Video, 
  CalendarDays,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { useOntdekkenProgress, NextStep } from "@/hooks/useOntdekkenProgress";
import { cn } from "@/lib/utils";

const iconMap = {
  user: User,
  calculator: Calculator,
  book: BookOpen,
  video: Video,
  calendar: CalendarDays,
};

const iconColorMap = {
  user: "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400",
  calculator: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400",
  book: "bg-primary/10 text-primary",
  video: "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400",
  calendar: "bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400",
};

interface NextStepCardProps {
  step: NextStep;
}

function NextStepCard({ step }: NextStepCardProps) {
  const Icon = iconMap[step.icon];
  const iconColor = iconColorMap[step.icon];
  
  return (
    <Card className={cn(
      "group relative overflow-hidden",
      "border-2 border-dashed border-primary/30",
      "hover:border-primary/50 hover:shadow-lg",
      "transition-all duration-300"
    )}>
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
      
      <CardContent className="relative p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={cn(
            "p-3 rounded-xl shrink-0",
            iconColor
          )}>
            <Icon className="h-6 w-6" />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-primary uppercase tracking-wide">
                Aanbevolen voor jou
              </span>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold leading-tight mb-1">
                {step.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {step.description}
              </p>
            </div>
            
            {/* Social proof */}
            {step.socialProof && (
              <p className="text-xs text-muted-foreground/80 italic">
                "{step.socialProof}"
              </p>
            )}
            
            {/* CTA Button */}
            <Button asChild className="mt-2">
              <Link to={step.link}>
                {step.type === 'meeting' ? 'Plan gesprek' : 'Start nu'}
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function OntdekkenNextStep() {
  const { nextStep, isLoading } = useOntdekkenProgress();
  
  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-muted" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-6 w-48 bg-muted rounded" />
              <div className="h-4 w-full bg-muted rounded" />
              <div className="h-10 w-28 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return <NextStepCard step={nextStep} />;
}
