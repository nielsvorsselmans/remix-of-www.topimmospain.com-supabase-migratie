import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, ArrowRight, LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { GuideItem } from "@/hooks/useOrientationGuide";
import { PillarConfig } from "@/constants/orientation";

interface OrientationContinueReadingProps {
  lastItem: GuideItem;
  pillar: PillarConfig;
  pillarColors: { text: string; bg: string };
  PillarIcon: LucideIcon;
  onContinue: () => void;
}

export function OrientationContinueReading({ 
  lastItem, 
  pillar, 
  pillarColors,
  PillarIcon,
  onContinue 
}: OrientationContinueReadingProps) {
  const title = lastItem.blog_post?.title || lastItem.custom_title || "Artikel";
  const readTime = lastItem.custom_read_time_minutes || 5;

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 overflow-hidden">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center gap-2 text-primary mb-3">
          <BookOpen className="h-4 w-4" />
          <span className="text-sm font-medium">Ga verder waar je gebleven was</span>
        </div>
        
        <button
          onClick={onContinue}
          className="w-full flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className={cn("p-2.5 rounded-xl", pillarColors.bg)}>
              <PillarIcon className={cn("h-5 w-5", pillarColors.text)} />
            </div>
            <div className="text-left">
              <p className="font-semibold group-hover:text-primary transition-colors line-clamp-1">
                {title}
              </p>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span>{pillar.title}</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{readTime} min</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-primary">
            <span className="text-sm font-medium hidden sm:block">Verder lezen</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </CardContent>
    </Card>
  );
}
