import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Check, Clock, ChevronRight, Lightbulb, ArrowLeft, Calendar } from "lucide-react";
import { useOrientationGuide } from "@/hooks/useOrientationGuide";
import { useNavigate, Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useState, useMemo, useRef } from "react";
import {
  OrientationCompletionCard,
  OrientationContextualCta,
  OrientationPdfDownload,
  OrientationContinueReading,
  OrientationPillarBadge,
  OrientationHero,
  OrientationPillarNav,
  OrientationFloatingNext,
} from "@/components/orientation";
import { useOrientationMilestones } from "@/hooks/useOrientationMilestones";
import { useAuth } from "@/hooks/useAuth";
import { useCustomerProfile } from "@/hooks/useCustomerProfile";
import { getRecommendedPillar, ExplicitPreferences } from "@/utils/orientationPersonalization";
import { PILLARS, PILLAR_CONFIG, Pillar } from "@/constants/orientation";

// Use centralized pillar colors from constants

export default function Gidsen() {
  const navigate = useNavigate();
  const accordionRef = useRef<HTMLDivElement>(null);
  
  // User data for personalization
  const { profile } = useAuth();
  const { data: customerProfile } = useCustomerProfile();
  const firstName = profile?.first_name;
  const preferences = customerProfile?.explicit_preferences as ExplicitPreferences | undefined;
  
  const {
    itemsByPillar,
    progressByPillar,
    overallProgress,
    isLoading,
    isItemCompleted,
    isItemStarted,
    startItem,
  } = useOrientationGuide();

  // Milestone celebrations
  useOrientationMilestones({
    progressPercentage: overallProgress.percentage,
    completedCount: overallProgress.completed,
  });

  // Get recommended pillar based on investment goal
  const recommendedPillar = useMemo(() => {
    return getRecommendedPillar(preferences?.investment_goal);
  }, [preferences?.investment_goal]);

  // Find the first unread article - prioritize recommended pillar
  const firstUnreadArticle = useMemo(() => {
    // Try recommended pillar first if it exists
    if (recommendedPillar) {
      const items = itemsByPillar[recommendedPillar] || [];
      const unreadItem = items.find(item => !isItemCompleted(item.id));
      if (unreadItem) {
        const pillarInfo = PILLARS.find(p => p.key === recommendedPillar)!;
        return {
          item: unreadItem,
          pillar: pillarInfo,
          isPersonalized: true,
        };
      }
    }
    
    // Fall back to first unread across all pillars
    for (const pillar of PILLARS) {
      const items = itemsByPillar[pillar.key] || [];
      const unreadItem = items.find(item => !isItemCompleted(item.id));
      if (unreadItem) {
        return {
          item: unreadItem,
          pillar: pillar,
          isPersonalized: false,
        };
      }
    }
    return null;
  }, [itemsByPillar, isItemCompleted, recommendedPillar]);

  // Find the last started but not completed article (for "continue reading")
  const lastStartedItem = useMemo(() => {
    for (const pillar of PILLARS) {
      const items = itemsByPillar[pillar.key] || [];
      const startedItem = items.find(item => isItemStarted(item.id) && !isItemCompleted(item.id));
      if (startedItem) {
        return {
          item: startedItem,
          pillar: pillar,
        };
      }
    }
    return null;
  }, [itemsByPillar, isItemStarted, isItemCompleted]);

  // Calculate remaining reading time
  const remainingReadTime = useMemo(() => {
    let totalMinutes = 0;
    for (const pillar of PILLARS) {
      const items = itemsByPillar[pillar.key] || [];
      items.forEach(item => {
        if (!isItemCompleted(item.id)) {
          totalMinutes += item.custom_read_time_minutes || 5;
        }
      });
    }
    return totalMinutes;
  }, [itemsByPillar, isItemCompleted]);

  // Default open the pillar with the first unread article
  const [openPillars, setOpenPillars] = useState<string[]>(
    firstUnreadArticle ? [firstUnreadArticle.pillar.key] : []
  );

  const handleArticleClick = async (itemId: string) => {
    await startItem(itemId);
    navigate(`/dashboard/orientatie/artikel/${itemId}`);
  };

  const handlePillarClick = (pillarKey: Pillar) => {
    // Open the pillar and scroll to it
    if (!openPillars.includes(pillarKey)) {
      setOpenPillars([...openPillars, pillarKey]);
    }
    
    // Scroll to the accordion section
    setTimeout(() => {
      const element = document.getElementById(`pillar-${pillarKey}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleStartReading = () => {
    if (lastStartedItem) {
      handleArticleClick(lastStartedItem.item.id);
    } else if (firstUnreadArticle) {
      handleArticleClick(firstUnreadArticle.item.id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  const hasStarted = overallProgress.completed > 0;
  const isComplete = overallProgress.percentage >= 100;

  return (
    <>
      <div className="space-y-8">
        {/* Back navigation to Ontdekken */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
          >
            <Link to="/dashboard/ontdekken">
              <ArrowLeft className="h-4 w-4" />
              <span>Terug naar Ontdekken</span>
            </Link>
          </Button>
        </div>
        {/* Completion Card (when 100% done) */}
        {isComplete ? (
          <OrientationCompletionCard totalArticles={overallProgress.total} />
        ) : (
          <>
            {/* Hero Section */}
            <OrientationHero
              firstName={firstName}
              progressPercentage={overallProgress.percentage}
              completedCount={overallProgress.completed}
              totalCount={overallProgress.total}
              remainingReadTime={remainingReadTime}
              onStartReading={handleStartReading}
              hasStarted={hasStarted}
              investmentGoal={preferences?.investment_goal}
            />

            {/* Visual Pillar Navigator */}
            <OrientationPillarNav
              pillars={PILLARS}
              progressByPillar={progressByPillar}
              recommendedPillar={recommendedPillar}
              onPillarClick={handlePillarClick}
              activePillar={openPillars[0] as Pillar}
            />
          </>
        )}

        {/* Continue Reading (when started but not last article started) */}
        {hasStarted && lastStartedItem && !isComplete && (
          <OrientationContinueReading
            lastItem={lastStartedItem.item}
            pillar={lastStartedItem.pillar}
            pillarColors={PILLAR_CONFIG[lastStartedItem.pillar.key].colors}
            PillarIcon={PILLAR_CONFIG[lastStartedItem.pillar.key].icon}
            onContinue={() => handleArticleClick(lastStartedItem.item.id)}
          />
        )}

        {/* Contextual CTA based on progress */}
        {hasStarted && !isComplete && overallProgress.percentage >= 40 && (
          <OrientationContextualCta 
            progressPercentage={overallProgress.percentage}
            completedArticles={overallProgress.completed}
            totalArticles={overallProgress.total}
          />
        )}

        {/* Pillar Accordion */}
        <div className="space-y-4" ref={accordionRef}>
          <h2 className="text-xl font-semibold">Alle artikelen per thema</h2>
          
          <Accordion 
            type="multiple" 
            value={openPillars}
            onValueChange={setOpenPillars}
            className="space-y-4"
          >
            {PILLARS.map((pillar) => {
              const items = itemsByPillar[pillar.key] || [];
              const pillarProgress = progressByPillar[pillar.key] || { total: 0, completed: 0, percentage: 0 };
              const IconComponent = pillar.icon;
              const colors = pillar.colors;
              const isPillarComplete = pillarProgress.percentage === 100;

              return (
                <AccordionItem 
                  key={pillar.key} 
                  value={pillar.key}
                  id={`pillar-${pillar.key}`}
                  className={cn(
                    "border-2 rounded-xl overflow-hidden transition-all",
                    colors.border,
                    openPillars.includes(pillar.key) && "shadow-sm"
                  )}
                >
                  <AccordionTrigger className={cn(
                    "px-5 py-4 hover:no-underline transition-colors [&[data-state=open]]:bg-muted/20",
                    "data-[state=open]:border-b",
                    colors.border,
                    `hover:bg-gradient-to-r ${colors.gradient}`
                  )}>
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "p-2.5 rounded-xl transition-colors",
                          colors.bg,
                          isPillarComplete && "bg-primary/20"
                        )}>
                          {isPillarComplete ? (
                            <Check className="h-5 w-5 text-primary" />
                          ) : (
                            <IconComponent className={cn("h-5 w-5", colors.text)} />
                          )}
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground">{pillar.title}</p>
                            <OrientationPillarBadge pillar={pillar.key} isComplete={isPillarComplete} />
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {pillarProgress.completed} van {pillarProgress.total} gelezen
                          </p>
                        </div>
                      </div>
                      
                      {/* Progress indicator */}
                      <div className="flex items-center gap-3">
                        <div className="hidden sm:block w-24">
                          <Progress value={pillarProgress.percentage} className="h-1.5" />
                        </div>
                        <span className={cn(
                          "text-sm font-medium min-w-[3rem] text-right",
                          isPillarComplete ? "text-primary" : "text-muted-foreground"
                        )}>
                          {pillarProgress.percentage}%
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  
                  <AccordionContent className="px-5 pb-4 pt-2">
                    <p className="text-sm text-muted-foreground mb-4">
                      {pillar.description}
                    </p>
                    
                    <div className="space-y-2">
                      {items.map((item, index) => {
                        const isCompleted = isItemCompleted(item.id);
                        const title = item.blog_post?.title || item.custom_title || "Artikel";
                        const teaser = item.blog_post?.intro?.substring(0, 120);
                        const readTime = item.custom_read_time_minutes || 5;
                        const isNextToRead = !isCompleted && items.slice(0, index).every(i => isItemCompleted(i.id));

                        return (
                          <button
                            key={item.id}
                            onClick={() => handleArticleClick(item.id)}
                            className={cn(
                              "w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all",
                              "border border-transparent hover:border-primary/20 hover:shadow-sm",
                              isCompleted 
                                ? "bg-muted/30 hover:bg-muted/50" 
                                : "bg-card hover:bg-card",
                              isNextToRead && !hasStarted && "ring-2 ring-primary/20 bg-primary/5"
                            )}
                          >
                            {/* Completion indicator */}
                            <div className={cn(
                              "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                              isCompleted 
                                ? "bg-primary border-primary" 
                                : "border-muted-foreground/30 hover:border-primary/50"
                            )}>
                              {isCompleted && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                            </div>

                            {/* Article info with teaser */}
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "font-medium line-clamp-1",
                                isCompleted ? "text-muted-foreground" : "text-foreground"
                              )}>
                                {title}
                              </p>
                              {/* "Wat leer ik?" teaser */}
                              {teaser && !isCompleted && (
                                <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                                  → {teaser}...
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">{readTime} min lezen</span>
                              </div>
                            </div>

                            {/* Arrow / Action */}
                            <div className="flex items-center gap-2">
                              {isNextToRead && !hasStarted && (
                                <span className="text-xs font-medium text-primary hidden sm:block">
                                  Volgende
                                </span>
                              )}
                              <ChevronRight className={cn(
                                "h-5 w-5 transition-colors",
                                isCompleted ? "text-muted-foreground/50" : "text-muted-foreground"
                              )} />
                            </div>
                          </button>
                        );
                      })}

                      {items.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          Nog geen artikelen beschikbaar in dit thema
                        </p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>

        {/* PDF Download */}
        <OrientationPdfDownload className="border-muted" />

        {/* Tips Section */}
        <Card className="border-muted bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-accent/10 flex-shrink-0">
                <Lightbulb className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Tips voor je oriëntatie</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Neem de tijd — je hoeft niet alles in één keer te lezen</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Maak aantekeningen en schrijf je vragen op</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Bespreek je bevindingen met ons in een persoonlijk gesprek</span>
                  </li>
                </ul>
                
                <Button 
                  variant="outline" 
                  className="mt-4 gap-2"
                  onClick={() => window.open('/afspraak', '_blank')}
                >
                  <Calendar className="h-4 w-4" />
                  Plan een oriënterend gesprek
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating Next Article Widget - Only show when no continue reading card is displayed */}
      {firstUnreadArticle && hasStarted && !isComplete && !lastStartedItem && (
        <OrientationFloatingNext
          nextArticleTitle={firstUnreadArticle.item.blog_post?.title || firstUnreadArticle.item.custom_title || "Artikel"}
          pillarTitle={firstUnreadArticle.pillar.title}
          readTimeMinutes={firstUnreadArticle.item.custom_read_time_minutes || 5}
          onContinue={() => handleArticleClick(firstUnreadArticle.item.id)}
          show={true}
        />
      )}
    </>
  );
}
