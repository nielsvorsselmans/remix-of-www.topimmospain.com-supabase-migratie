import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Calendar, Download, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface OrientationCompletionCardProps {
  totalArticles: number;
  onDownloadPdf?: () => void;
  isDownloading?: boolean;
}

export function OrientationCompletionCard({ 
  totalArticles, 
  onDownloadPdf,
  isDownloading 
}: OrientationCompletionCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-accent/5 to-card overflow-hidden relative">
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-accent/10 to-transparent rounded-tr-full" />
      
      <CardContent className="pt-8 pb-8 relative z-10">
        <div className="text-center max-w-lg mx-auto">
          {/* Trophy icon */}
          <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/10 mb-4">
            <Trophy className="h-8 w-8 text-primary" />
          </div>
          
          {/* Title */}
          <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Gefeliciteerd, je bent volledig voorbereid!
            <Sparkles className="h-5 w-5 text-accent" />
          </h2>
          
          {/* Description */}
          <p className="text-muted-foreground mb-6">
            Je hebt alle {totalArticles} artikelen van de Oriëntatiegids gelezen. 
            Je hebt nu een solide basis voor je Spanje-avontuur.
          </p>
          
          {/* CTA */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">
              De volgende stap? Plan een persoonlijk gesprek om je situatie te bespreken.
            </p>
            
            <Button 
              size="lg"
              className="gap-2"
              onClick={() => window.open('/afspraak', '_blank')}
            >
              <Calendar className="h-5 w-5" />
              Plan mijn oriënterend gesprek
            </Button>
            
            {onDownloadPdf && (
              <div className="pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={onDownloadPdf}
                  disabled={isDownloading}
                >
                  <Download className="h-4 w-4" />
                  {isDownloading ? 'Bezig met downloaden...' : 'Download mijn gids (PDF)'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
