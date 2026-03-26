import { Heart, Video } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToggleFavorite, useIsFavorite } from "@/hooks/useFavorites";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { SignupDialog } from "@/components/SignupDialog";
import { cn } from "@/lib/utils";
import larsProfile from "@/assets/lars-profile.webp";

interface ProjectConsultationCTAProps {
  projectId: string;
  projectName: string;
}

export const ProjectConsultationCTA = ({ projectId, projectName }: ProjectConsultationCTAProps) => {
  const { user } = useAuth();
  const toggleFavorite = useToggleFavorite();
  const { data: isFavorite } = useIsFavorite(projectId);
  const [signupDialogOpen, setSignupDialogOpen] = useState(false);

  const handleFavoriteClick = () => {
    if (!user) {
      setSignupDialogOpen(true);
      return;
    }
    toggleFavorite.mutate(projectId);
  };

  return (
    <>
      <Card className="sticky top-24 border-primary/20 shadow-lg">
        <CardContent className="p-6 space-y-6">
          {/* Header met Lars' foto */}
          <div className="flex items-start gap-4">
            <Avatar className="w-24 h-24 border-2 border-primary/20">
              <AvatarImage 
                src={larsProfile} 
                alt="Lars van Viva Vastgoed"
                className="object-cover"
              />
              <AvatarFallback>LV</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-foreground">Vragen over dit project?</h3>
              <p className="text-sm text-muted-foreground">Lars helpt je graag verder</p>
            </div>
          </div>

          {/* Advisory tekst */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Het is niet eenvoudig om op basis van foto's, video's en gerenderde beelden te ontdekken of iets <span className="font-medium text-foreground">écht</span> bij jou past.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Daarom plannen we graag een videocall in om dieper in te gaan op wat je zoekt, zodat we gericht met je mee kunnen kijken en denken.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleFavoriteClick}
              variant={isFavorite ? "default" : "outline"}
              className="w-full"
              disabled={toggleFavorite.isPending}
            >
              <Heart className={cn("mr-2 h-4 w-4", isFavorite && "fill-current")} />
              {isFavorite ? "Opgeslagen" : "Bewaar dit project"}
            </Button>

            <Button
              asChild
              className="w-full"
              size="lg"
            >
              <Link to="/afspraak">
                <Video className="mr-2 h-4 w-4" />
                Plan een videocall
              </Link>
            </Button>
          </div>

          {/* Trust elementen */}
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span>30 minuten</span>
              <span>·</span>
              <span>Vrijblijvend</span>
              <span>·</span>
              <span>Persoonlijk advies</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <SignupDialog 
        open={signupDialogOpen}
        onOpenChange={setSignupDialogOpen}
      />
    </>
  );
};
