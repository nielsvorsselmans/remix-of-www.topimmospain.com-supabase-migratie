import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Clock, Heart } from "lucide-react";
import larsProfile from "@/assets/lars-profile.webp";

interface SelectieWelcomeHeaderProps {
  firstName: string;
  suggestedCount: number;
  interestedCount: number;
  rejectedCount: number;
  totalProjects: number;
}

export function SelectieWelcomeHeader({
  firstName,
  suggestedCount,
  interestedCount,
  rejectedCount,
  totalProjects,
}: SelectieWelcomeHeaderProps) {
  const reviewedCount = interestedCount + rejectedCount;
  const progressPercent = totalProjects > 0 ? Math.round((reviewedCount / totalProjects) * 100) : 0;
  
  const getMessage = () => {
    if (interestedCount >= 2 && suggestedCount === 0) {
      return `Je hebt al ${interestedCount} favorieten! Klaar om ze in het echt te zien?`;
    }
    if (interestedCount >= 2) {
      return `Je hebt al ${interestedCount} favorieten! Bekijk de rest of plan je bezichtiging.`;
    }
    if (suggestedCount === 0) {
      return "Je hebt alle projecten bekeken. Markeer minstens 2 als interessant voor een bezichtigingsreis.";
    }
    if (reviewedCount === 0) {
      return `Er staan ${suggestedCount} projecten klaar voor jouw beoordeling.`;
    }
    return `Nog ${suggestedCount} ${suggestedCount === 1 ? 'project' : 'projecten'} wachten op jouw beoordeling.`;
  };

  const showBezichtigingCTA = interestedCount >= 2;

  return (
    <Card className="-mx-4 rounded-none border-x-0 border-primary/20 bg-gradient-to-br from-background to-muted/20 sm:mx-0 sm:rounded-lg sm:border-x">
      <CardContent className="p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Left: Avatar + Message */}
          <div className="flex gap-3 lg:gap-4 items-start flex-1">
            <Avatar className="h-10 w-10 lg:h-16 lg:w-16 border-2 border-primary/20 shrink-0">
              <AvatarImage src={larsProfile} alt="Lars" className="object-cover" />
              <AvatarFallback>LV</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <h2 className="text-lg lg:text-xl font-semibold mb-0.5">
                Welkom, {firstName}!
              </h2>
              <p className="text-muted-foreground text-sm mb-3">
                {getMessage()}
              </p>
              
              {/* Progress Section */}
              <div className="space-y-1.5 mb-3">
                <div className="flex items-center justify-between text-xs lg:text-sm">
                  <span className="text-muted-foreground">Voortgang</span>
                  <span className="font-medium">{reviewedCount}/{totalProjects} beoordeeld</span>
                </div>
                <Progress value={progressPercent} className="h-1.5 lg:h-2" />
              </div>

              {/* Stats Row - compact pills */}
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600">
                  <Clock className="h-3 w-3" />
                  {suggestedCount} te beoordelen
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[11px] font-medium text-green-600">
                  <Heart className="h-3 w-3" />
                  {interestedCount} interessant
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3" />
                  {rejectedCount} afgewezen
                </span>
              </div>
            </div>
          </div>

          {/* Right: CTAs */}
          <div className="flex flex-col gap-2 lg:gap-3 lg:w-64 shrink-0">
            {showBezichtigingCTA ? (
              <Button asChild className="w-full">
                <Link to="/dashboard/bezichtiging">
                  Plan je bezichtiging
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="outline" size="sm" className="w-full lg:hidden">
                  <Link to="/dashboard/projecten">
                    Bekijk alle projecten
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild className="w-full hidden lg:inline-flex">
                  <Link to="/dashboard/projecten">
                    Bekijk projecten
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </>
            )}
            
            {interestedCount >= 2 && (
              <Button asChild variant="outline" className="w-full">
                <Link to="/dashboard/bezichtiging">
                  Plan bezichtigingsreis
                </Link>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
