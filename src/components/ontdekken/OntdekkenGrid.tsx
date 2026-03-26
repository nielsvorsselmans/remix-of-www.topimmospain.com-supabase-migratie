import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { 
  BookOpen, 
  Calculator, 
  CalendarDays,
  ChevronRight
} from "lucide-react";
import { useOntdekkenProgress } from "@/hooks/useOntdekkenProgress";
import { cn } from "@/lib/utils";
import { CALCULATOR_CONFIG } from "@/constants/calculators";
import { BudgetCheckCard } from "./BudgetCheckCard";

interface GridCardProps {
  title: string;
  description: string;
  progress?: string;
  link: string;
  icon: React.ElementType;
  iconColor: string;
}

function GridCard({ title, description, progress, link, icon: Icon, iconColor }: GridCardProps) {
  return (
    <Link to={link}>
      <Card className={cn(
        "h-full group cursor-pointer",
        "hover:shadow-md hover:border-primary/20",
        "transition-all duration-200"
      )}>
        <CardContent className="p-5">
          <div className="flex flex-col h-full">
            {/* Icon */}
            <div className={cn(
              "p-3 rounded-xl w-fit mb-4",
              "group-hover:scale-105 transition-transform",
              iconColor
            )}>
              <Icon className="h-5 w-5" />
            </div>
            
            {/* Content */}
            <div className="flex-1">
              <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                {title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>
            
            {/* Progress / Meta */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t">
              <span className="text-xs text-muted-foreground">
                {progress}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function OntdekkenGrid() {
  const { completedItems, isLoading } = useOntdekkenProgress();
  
  const calculatorsCount = CALCULATOR_CONFIG.length;
  
  const cards: GridCardProps[] = [
    {
      title: "Oriëntatiegids",
      description: "Stap voor stap door alle belangrijke thema's",
      progress: isLoading 
        ? "Laden..." 
        : `${completedItems.guideCompleted} van ${completedItems.guideTotal} gelezen`,
      link: "/dashboard/gidsen",
      icon: BookOpen,
      iconColor: "bg-primary/10 text-primary",
    },
    {
      title: "Rekentools",
      description: "Bereken kosten, rendement en financiering",
      progress: `${calculatorsCount} tools beschikbaar`,
      link: "/dashboard/calculators",
      icon: Calculator,
      iconColor: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400",
    },
    {
      title: "Events & Webinars",
      description: "Ontmoet ons team en stel je vragen",
      progress: "Webinar & Infoavond",
      link: "/dashboard/webinar",
      icon: CalendarDays,
      iconColor: "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400",
    },
  ];
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Ontdek op jouw tempo</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5">
                <div className="w-11 h-11 rounded-xl bg-muted mb-4" />
                <div className="h-5 w-32 bg-muted rounded mb-2" />
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-24 bg-muted rounded mt-4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Ontdek op jouw tempo</h2>
      <BudgetCheckCard />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card) => (
          <GridCard key={card.link} {...card} />
        ))}
      </div>
    </div>
  );
}
