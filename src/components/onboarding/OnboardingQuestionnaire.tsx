import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle2, ArrowRight, ArrowLeft, Euro, MapPin, Target, Calendar, User, Sparkles } from "lucide-react";
import { useUpdateCustomerProfile } from "@/hooks/useUpdateCustomerProfile";
import { isFieldComplete } from "@/utils/profileCompleteness";
import { cn } from "@/lib/utils";
import { 
  INVESTMENT_GOALS, 
  REGIONS, 
  TIMELINES, 
  PERSONA_TYPES 
} from "@/constants/onboardingOptions";

interface OnboardingQuestionnaireProps {
  explicitPreferences: Record<string, any> | null;
  onComplete: () => void;
  onSkip?: () => void;
}

// Question definitions using unified constants
const QUESTIONS = [
  {
    id: 'budget',
    title: 'Wat is je budget?',
    description: 'Dit helpt ons om passende projecten te tonen.',
    icon: Euro,
    fields: ['budget_min', 'budget_max'],
    type: 'budget',
  },
  {
    id: 'regions',
    title: "Welke regio's hebben je voorkeur?",
    description: 'Je kunt meerdere selecteren.',
    icon: MapPin,
    fields: ['preferred_regions'],
    type: 'regions',
  },
  {
    id: 'investment_goal',
    title: 'Wat is je investeringsdoel?',
    description: 'Dit bepaalt welk type projecten het beste bij je passen.',
    icon: Target,
    fields: ['investment_goal'],
    type: 'single_select',
    options: INVESTMENT_GOALS.map(goal => ({
      value: goal.id,
      label: goal.label,
      description: goal.description,
    })),
  },
  {
    id: 'timeline',
    title: 'Wanneer wil je kopen?',
    description: 'Zo kunnen we je op het juiste moment begeleiden.',
    icon: Calendar,
    fields: ['timeline'],
    type: 'single_select',
    options: TIMELINES.map(t => ({
      value: t.value,
      label: t.label,
      description: t.description,
    })),
  },
  {
    id: 'persona',
    title: 'Hoe zou je jezelf omschrijven?',
    description: 'Dit helpt ons om je beter te begrijpen.',
    icon: User,
    fields: ['persona_type'],
    type: 'single_select',
    options: PERSONA_TYPES.map(p => ({
      value: p.value,
      label: p.label,
      description: p.description,
    })),
  },
];

// Use unified REGIONS constant - extract labels
const REGION_LABELS = REGIONS.map(r => r.label);

export function OnboardingQuestionnaire({ 
  explicitPreferences, 
  onComplete,
  onSkip,
}: OnboardingQuestionnaireProps) {
  const updateProfile = useUpdateCustomerProfile();
  
  // Filter out questions that are already complete
  const remainingQuestions = QUESTIONS.filter(q => {
    return q.fields.some(field => !isFieldComplete(explicitPreferences?.[field]));
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  
  const currentQuestion = remainingQuestions[currentIndex];
  const totalQuestions = remainingQuestions.length;
  const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 100;

  // If no questions remain, call onComplete
  useEffect(() => {
    if (remainingQuestions.length === 0) {
      onComplete();
    }
  }, [remainingQuestions.length, onComplete]);

  if (remainingQuestions.length === 0) {
    return null;
  }

  const handleNext = async () => {
    // Save current answer if there are any
    if (Object.keys(answers).length > 0) {
      await updateProfile.mutateAsync(answers);
    }

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
      setAnswers({});
    } else {
      // Final question - answers already saved above, just complete
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setAnswers({});
    }
  };

  const canProceed = () => {
    if (!currentQuestion) return false;
    
    switch (currentQuestion.type) {
      case 'budget':
        return answers.budget_min || answers.budget_max;
      case 'regions':
        return answers.preferred_regions?.length > 0;
      case 'single_select':
        return !!answers[currentQuestion.fields[0]];
      default:
        return true;
    }
  };

  const Icon = currentQuestion?.icon || Sparkles;

  return (
    <Card className="max-w-lg mx-auto border-2">
      <CardHeader className="text-center pb-2">
        <div className="flex justify-between items-center mb-4">
          <Badge variant="outline" className="text-xs">
            Vraag {currentIndex + 1} van {totalQuestions}
          </Badge>
          {onSkip && (
            <Button variant="ghost" size="sm" onClick={onSkip}>
              Overslaan
            </Button>
          )}
        </div>
        <Progress value={progress} className="h-2 mb-4" />
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl">{currentQuestion?.title}</CardTitle>
        <CardDescription>{currentQuestion?.description}</CardDescription>
      </CardHeader>
      
      <CardContent className="pt-4">
        {currentQuestion?.type === 'budget' && (
          <div className="space-y-4">
            <div>
              <Label>Minimum budget</Label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="150.000"
                  className="pl-10"
                  value={answers.budget_min || ''}
                  onChange={(e) => setAnswers({ ...answers, budget_min: Number(e.target.value) || undefined })}
                />
              </div>
            </div>
            <div>
              <Label>Maximum budget</Label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="300.000"
                  className="pl-10"
                  value={answers.budget_max || ''}
                  onChange={(e) => setAnswers({ ...answers, budget_max: Number(e.target.value) || undefined })}
                />
              </div>
            </div>
          </div>
        )}

        {currentQuestion?.type === 'regions' && (
          <div className="flex flex-wrap gap-2">
            {REGION_LABELS.map((region) => {
              const isSelected = (answers.preferred_regions || []).includes(region);
              return (
                <Badge
                  key={region}
                  variant={isSelected ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer py-2 px-4 text-sm transition-all",
                    isSelected && "ring-2 ring-primary ring-offset-2"
                  )}
                  onClick={() => {
                    const current = answers.preferred_regions || [];
                    const updated = isSelected
                      ? current.filter((r: string) => r !== region)
                      : [...current, region];
                    setAnswers({ ...answers, preferred_regions: updated });
                  }}
                >
                  {isSelected && <CheckCircle2 className="h-3 w-3 mr-1" />}
                  {region}
                </Badge>
              );
            })}
          </div>
        )}

        {currentQuestion?.type === 'single_select' && (
          <RadioGroup
            value={answers[currentQuestion.fields[0]] || ''}
            onValueChange={(value) => setAnswers({ ...answers, [currentQuestion.fields[0]]: value })}
            className="space-y-3"
          >
            {currentQuestion.options?.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all",
                  answers[currentQuestion.fields[0]] === option.value
                    ? "border-primary bg-primary/5 ring-2 ring-primary"
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value={option.value} className="mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">{option.label}</p>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
              </label>
            ))}
          </RadioGroup>
        )}

        <div className="flex justify-between mt-8">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentIndex === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Vorige
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed() || updateProfile.isPending}
          >
            {currentIndex === totalQuestions - 1 ? 'Afronden' : 'Volgende'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
