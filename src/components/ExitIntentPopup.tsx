import { useState, useEffect } from "react";
import { X, ThumbsUp, ThumbsDown, Download, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { type JourneyPhase } from "@/hooks/useJourneyPhase";
import { Link } from "react-router-dom";

interface ExitIntentPopupProps {
  blogPostId: string;
  slug: string;
  journeyPhase: JourneyPhase;
  onClose: () => void;
}

export const ExitIntentPopup = ({ blogPostId, slug, journeyPhase, onClose }: ExitIntentPopupProps) => {
  const { user } = useAuth();
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const getVisitorId = () => {
    return localStorage.getItem('viva_visitor_id') || null;
  };

  const getCrmUserId = () => {
    return localStorage.getItem('viva_crm_user_id') || null;
  };

  const getJourneyContent = () => {
    switch (journeyPhase) {
      case 'orientation':
        return {
          icon: <Download className="w-8 h-8" />,
          title: "Download onze Gratis Investeerdergids",
          description: "Krijg direct toegang tot onze complete gids over investeren in Spanje",
          benefits: [
            "Stap-voor-stap uitleg van het aankoopproces",
            "Overzicht van alle kosten en belastingen",
            "Checklist voor succesvolle investering"
          ],
          ctaLabel: "Download Gratis Gids",
          ctaHref: "/portaal",
          secondaryCta: "Of blijf feedback geven"
        };
      
      case 'research':
        return {
          icon: <Users className="w-8 h-8" />,
          title: "Wil je projecten vergelijken?",
          description: "Krijg gratis toegang tot vergelijkingstools",
          benefits: [
            "Vergelijk alle projecten op rendement",
            "Sla favorieten op voor later",
            "Ontvang persoonlijke aanbevelingen"
          ],
          ctaLabel: "Krijg toegang",
          ctaHref: "/portaal",
          secondaryCta: "Of blijf feedback geven"
        };
      
      case 'decision':
      case 'action':
        return {
          icon: <Calendar className="w-8 h-8" />,
          title: "Klaar voor een persoonlijk gesprek?",
          description: "Plan direct een 30-minuten videocall met onze adviseurs",
          benefits: [
            "Bespreek jouw specifieke situatie",
            "Krijg antwoord op al je vragen",
            "Ontdek welke projecten bij je passen"
          ],
          ctaLabel: "Plan Gratis Gesprek",
          ctaHref: "https://calendly.com/viva-vastgoed/30min",
          external: true,
          secondaryCta: "Of blijf feedback geven"
        };
    }
  };

  const handleFeedback = async (wasHelpful: boolean) => {
    try {
      const { error } = await supabase
        .from('blog_feedback')
        .insert({
          blog_post_id: blogPostId,
          blog_post_slug: slug,
          was_helpful: wasHelpful,
          user_id: user?.id || null,
          visitor_id: getVisitorId(),
          crm_user_id: getCrmUserId(),
        });

      if (error) {
        console.error('Failed to submit exit intent feedback:', error);
        return;
      }

      setHasSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error submitting exit intent feedback:', error);
    }
  };

  const journeyContent = getJourneyContent();

  if (showFeedback) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
        <Card className="max-w-md w-full shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
          <CardHeader className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
            <CardTitle className="text-xl">
              {hasSubmitted ? "Bedankt!" : "Was dit artikel nuttig?"}
            </CardTitle>
            <CardDescription>
              {hasSubmitted 
                ? "Je feedback helpt ons onze content te verbeteren!" 
                : "We waarderen je mening"}
            </CardDescription>
          </CardHeader>
          {!hasSubmitted && (
            <CardContent>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => handleFeedback(true)}
                  className="flex-1 gap-2"
                  variant="default"
                >
                  <ThumbsUp className="w-5 h-5" />
                  Ja, nuttig
                </Button>
                <Button
                  onClick={() => handleFeedback(false)}
                  className="flex-1 gap-2"
                  variant="outline"
                >
                  <ThumbsDown className="w-5 h-5" />
                  Niet echt
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <Card className="max-w-lg w-full shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              {journeyContent.icon}
            </div>
            <div>
              <CardTitle className="text-xl mb-1">{journeyContent.title}</CardTitle>
              <CardDescription>{journeyContent.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {journeyContent.benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <span className="text-sm">{benefit}</span>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {journeyContent.external ? (
              <a 
                href={journeyContent.ctaHref}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button className="w-full" size="lg">
                  {journeyContent.ctaLabel}
                </Button>
              </a>
            ) : (
              <Link to={journeyContent.ctaHref}>
                <Button className="w-full" size="lg">
                  {journeyContent.ctaLabel}
                </Button>
              </Link>
            )}
            <Button 
              variant="ghost" 
              className="w-full" 
              size="sm"
              onClick={() => setShowFeedback(true)}
            >
              {journeyContent.secondaryCta}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
