import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  BookOpen,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrientationGuide, GuideItem } from "@/hooks/useOrientationGuide";
import { PILLARS, PILLAR_CONFIG, Pillar } from "@/constants/orientation";
import { cn } from "@/lib/utils";

interface OrientationGuideProps {
  compact?: boolean;
  showHeader?: boolean;
  className?: string;
}

export const OrientationGuide = ({ 
  compact = false, 
  showHeader = true,
  className 
}: OrientationGuideProps) => {
  const navigate = useNavigate();
  const {
    itemsByPillar,
    progressByPillar,
    overallProgress,
    isLoading,
    toggleItemCompletion,
    isItemCompleted,
    startItem
  } = useOrientationGuide();

  const [expandedPillars, setExpandedPillars] = useState<string[]>(
    compact ? [] : PILLARS.map(p => p.key)
  );

  const handleArticleClick = async (item: GuideItem) => {
    // Mark as started
    await startItem(item.id);
    
    // Navigate to in-portal reader
    navigate(`/dashboard/orientatie/artikel/${item.id}`);
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {showHeader && <Skeleton className="h-24 w-full" />}
        {PILLARS.map(pillar => (
          <Skeleton key={pillar.key} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const isAllComplete = overallProgress.percentage === 100;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with overall progress */}
      {showHeader && (
        <Card className={cn(
          "border-border/50 transition-all",
          isAllComplete && "border-green-500/30 bg-green-500/5"
        )}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Oriëntatiegids</CardTitle>
              </div>
              {isAllComplete && (
                <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Voltooid!
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Bereid je voor op de infoavond door de 4 pijlers te verkennen.
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Voortgang</span>
                <span className="font-medium">
                  {overallProgress.completed}/{overallProgress.total} artikelen
                </span>
              </div>
              <Progress value={overallProgress.percentage} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pillars */}
      <Accordion 
        type="multiple" 
        value={expandedPillars}
        onValueChange={setExpandedPillars}
        className="space-y-2"
      >
        {PILLARS.map(pillar => {
          const config = PILLAR_CONFIG[pillar.key];
          const Icon = config.icon;
          const items = itemsByPillar[pillar.key] || [];
          const progress = progressByPillar[pillar.key];
          const isPillarComplete = progress.completed === progress.total && progress.total > 0;

          return (
            <AccordionItem 
              key={pillar.key} 
              value={pillar.key}
              className={cn(
                "border rounded-lg overflow-hidden",
                isPillarComplete && "border-green-500/30"
              )}
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                <div className="flex items-center gap-3 flex-1">
                  <div className={cn(
                    "p-2 rounded-lg",
                    config.colors.iconBg
                  )}>
                    <Icon className={cn("h-4 w-4", config.colors.text)} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{pillar.title}</span>
                      {isPillarComplete && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    {!compact && (
                      <p className="text-xs text-muted-foreground">{pillar.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {progress.completed}/{progress.total}
                    </span>
                    <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all",
                          isPillarComplete ? "bg-green-500" : "bg-primary"
                        )}
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-2">
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Nog geen artikelen beschikbaar voor deze pijler.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {items.map(item => {
                      const isCompleted = isItemCompleted(item.id);
                      const title = item.blog_post?.title || item.custom_title || 'Artikel';
                      const description = item.custom_description || item.blog_post?.intro?.substring(0, 100) + '...';

                      return (
                        <div 
                          key={item.id}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                            isCompleted 
                              ? "bg-green-500/5 border-green-500/20" 
                              : "bg-muted/30 border-transparent hover:bg-muted/50"
                          )}
                          onClick={() => handleArticleClick(item)}
                        >
                          {/* Read-only completion indicator */}
                          <div className="mt-0.5 flex-shrink-0">
                            {isCompleted ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h4 className={cn(
                                  "text-sm font-medium",
                                  isCompleted && "text-muted-foreground line-through"
                                )}>
                                  {title}
                                </h4>
                                {!compact && description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                    {description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {item.custom_read_time_minutes || 5} min
                                  </span>
                                  {item.is_required && (
                                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                                      Aanbevolen
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {(item.blog_post?.slug || item.custom_title) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="flex-shrink-0 h-8"
                                  onClick={() => handleArticleClick(item)}
                                >
                                  Lezen
                                  <ChevronRight className="h-3 w-3 ml-1" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};
