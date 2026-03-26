import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MessageCircle, Sparkles, Target, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface OrientationContextualCtaProps {
  progressPercentage: number;
  completedArticles: number;
  totalArticles: number;
}

export function OrientationContextualCta({ 
  progressPercentage, 
  completedArticles,
  totalArticles 
}: OrientationContextualCtaProps) {
  const navigate = useNavigate();

  // Get contextual message and style based on progress
  const getCtaContent = () => {
    if (progressPercentage >= 100) {
      return null; // Handled by completion card
    }

    if (progressPercentage >= 75) {
      return {
        icon: Trophy,
        iconBg: "bg-primary/10",
        iconColor: "text-primary",
        title: "Je bent er bijna!",
        description: `Nog ${totalArticles - completedArticles} ${totalArticles - completedArticles === 1 ? 'artikel' : 'artikelen'} te gaan. Plan alvast een gesprek om alles door te nemen.`,
        buttonText: "Plan mijn oriënterend gesprek",
        buttonVariant: "default" as const,
        cardStyle: "border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5"
      };
    }

    if (progressPercentage >= 50) {
      return {
        icon: Target,
        iconBg: "bg-accent/10",
        iconColor: "text-accent",
        title: "Halverwege! Heb je al vragen?",
        description: "Je maakt goede voortgang. Wil je je eerste indrukken bespreken met een van onze adviseurs?",
        buttonText: "Bespreek je vragen",
        buttonVariant: "outline" as const,
        cardStyle: "border-accent/20 bg-gradient-to-r from-accent/5 to-transparent"
      };
    }

    if (progressPercentage >= 25) {
      return {
        icon: MessageCircle,
        iconBg: "bg-muted",
        iconColor: "text-muted-foreground",
        title: "Je bent goed op weg",
        description: "Lees rustig verder. Mocht je tussentijds vragen hebben, we helpen je graag.",
        buttonText: "Stel een vraag",
        buttonVariant: "ghost" as const,
        cardStyle: "border-muted"
      };
    }

    // 0-25%
    return {
      icon: Sparkles,
      iconBg: "bg-muted",
      iconColor: "text-muted-foreground",
      title: "Vragen over waar te beginnen?",
      description: "Onze adviseurs helpen je graag op weg met je oriëntatie.",
      buttonText: "Neem contact op",
      buttonVariant: "ghost" as const,
      cardStyle: "border-muted bg-muted/20"
    };
  };

  const content = getCtaContent();
  
  if (!content) return null;

  const IconComponent = content.icon;

  return (
    <Card className={cn("transition-all", content.cardStyle)}>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start gap-4">
          <div className={cn("p-2.5 rounded-xl flex-shrink-0", content.iconBg)}>
            <IconComponent className={cn("h-5 w-5", content.iconColor)} />
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold mb-1">{content.title}</h3>
            <p className="text-sm text-muted-foreground mb-3">
              {content.description}
            </p>
            
            <Button 
              variant={content.buttonVariant}
              size="sm"
              className="gap-2"
              onClick={() => window.open('/afspraak', '_blank')}
            >
              <Calendar className="h-4 w-4" />
              {content.buttonText}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
