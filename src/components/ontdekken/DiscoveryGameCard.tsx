import { useState, useMemo } from "react";
import { Palette, Sliders, Building2, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useCustomerProfile } from "@/hooks/useCustomerProfile";
import { useUpdateCustomerProfile } from "@/hooks/useUpdateCustomerProfile";
import { 
  StyleMatcher, 
  InvestmentBlendSlider, 
  BudgetBuilder 
} from "@/components/gamified-onboarding";
import { 
  GameType, 
  GamesCompleted, 
  GAME_METADATA,
  StyleMatcherResult,
  BudgetBuilderResult,
} from "@/constants/gamifiedOnboarding";
import { logOnboardingEvent } from "@/lib/analytics/onboardingEvents";
import confetti from "canvas-confetti";

const GAME_ICONS: Record<GameType, React.ComponentType<{ className?: string }>> = {
  style_matcher: Palette,
  investment_slider: Sliders,
  budget_builder: Building2,
};

const GAME_ORDER: GameType[] = ["style_matcher", "investment_slider", "budget_builder"];

export function DiscoveryGameCard() {
  const { data: customerProfile, isLoading } = useCustomerProfile();
  const updateProfile = useUpdateCustomerProfile();
  const [activeGame, setActiveGame] = useState<GameType | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const preferences = customerProfile?.explicit_preferences as Record<string, any> | undefined;
  const gamesCompleted = (preferences?.games_completed || {}) as GamesCompleted;

  // Find next incomplete game
  const nextGame = useMemo(() => {
    return GAME_ORDER.find(game => !gamesCompleted[game]) || null;
  }, [gamesCompleted]);

  const completedCount = GAME_ORDER.filter(g => gamesCompleted[g]).length;
  const allComplete = completedCount === GAME_ORDER.length;

  const handleStartGame = (game: GameType) => {
    setActiveGame(game);
    setIsDialogOpen(true);
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#3b82f6', '#f59e0b'],
    });
  };

  const handleStyleMatcherComplete = async (result: StyleMatcherResult) => {
    logOnboardingEvent("game_style_completed", { choices: result });
    
    await updateProfile.mutateAsync({
      style_preferences: result,
      games_completed: { ...gamesCompleted, style_matcher: true },
    } as any);
    // No confetti on first mission - save for final
    setIsDialogOpen(false);
  };

  const handleInvestmentSliderComplete = async (blend: number, investmentGoal: string) => {
    logOnboardingEvent("game_blend_completed", { blend, investmentGoal });
    
    // Get existing goal source to respect user authority
    const existingGoalSource = preferences?.investment_goal_source;
    
    await updateProfile.mutateAsync({
      investment_blend: blend,
      // Only override goal if user didn't explicitly set one in QuickWizard
      ...(existingGoalSource !== "user_explicit" && {
        investment_goal: investmentGoal,
        investment_goal_source: "slider_inferred",
      }),
      games_completed: { ...gamesCompleted, investment_slider: true },
    } as any);
    // No confetti on second mission
    setIsDialogOpen(false);
  };

  const handleBudgetBuilderComplete = async (result: BudgetBuilderResult) => {
    logOnboardingEvent("game_budget_completed", { result });
    
    await updateProfile.mutateAsync({
      budget_min: result.budget_min,
      budget_max: result.budget_max,
      bedrooms_min: result.bedrooms_min,
      amenity_preferences: {
        pool: result.pool,
        sea_distance: result.sea_distance,
      },
      games_completed: { ...gamesCompleted, budget_builder: true },
    } as any);
    
    // Confetti only on final mission!
    triggerConfetti();
    logOnboardingEvent("all_games_completed");
    setIsDialogOpen(false);
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-48 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  // All games completed - show serious completion state with CTAs
  if (allComplete) {
    return (
      <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">Profiel compleet</h3>
              <p className="text-sm text-muted-foreground">
                We hebben nu voldoende informatie voor een match op maat.
              </p>
            </div>
          </div>
          
          {/* Primary CTA */}
          <Button className="w-full" asChild>
            <a href="/afspraak">
              Plan een oriëntatiegesprek
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
          
          {/* Secondary CTA */}
          <Button variant="outline" className="w-full" asChild>
            <a href="/dashboard/selectie">
              Bekijk jouw projectmatches
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show next game
  if (nextGame) {
    const gameInfo = GAME_METADATA[nextGame];
    const Icon = GAME_ICONS[nextGame];
    const missionNumber = GAME_ORDER.indexOf(nextGame) + 1;

    return (
      <>
        <Card className={cn(
          "group relative overflow-hidden",
          "border-2 border-dashed border-primary/30",
          "hover:border-primary/50 hover:shadow-lg",
          "transition-all duration-300 cursor-pointer"
        )}
        onClick={() => handleStartGame(nextGame)}
        >
          {/* Background pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
          
          <CardHeader className="relative pb-2">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                Missie {missionNumber} van {GAME_ORDER.length}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {gameInfo.duration}
              </Badge>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl">{gameInfo.title}</CardTitle>
                <CardDescription className="mt-1">
                  {gameInfo.description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="relative pt-4">
            <Button className="w-full group-hover:bg-primary/90">
              Start nu
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardContent>
        </Card>

        {/* Game Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary" />
                {gameInfo.title}
              </DialogTitle>
            </DialogHeader>
            
            {activeGame === "style_matcher" && (
              <StyleMatcher 
                onComplete={handleStyleMatcherComplete}
                initialValues={preferences?.style_preferences}
              />
            )}
            
            {activeGame === "investment_slider" && (
              <InvestmentBlendSlider
                onComplete={handleInvestmentSliderComplete}
                initialValue={preferences?.investment_blend}
              />
            )}
            
            {activeGame === "budget_builder" && (
              <BudgetBuilder
                onComplete={handleBudgetBuilderComplete}
              />
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return null;
}
