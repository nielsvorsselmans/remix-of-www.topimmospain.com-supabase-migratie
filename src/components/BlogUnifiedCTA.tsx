import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Star, Calendar, Search, Lightbulb } from "lucide-react";
import { trackEvent } from "@/lib/tracking";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { JourneyPhase } from "@/hooks/useJourneyPhase";

interface BlogUnifiedCTAProps {
  journeyPhase: JourneyPhase;
  category: string;
  articleTitle: string;
  articleId: string;
}

interface CTAOption {
  id: string;
  icon: typeof Search;
  label: string;
  description: string;
  link: string;
}

export function BlogUnifiedCTA({ 
  journeyPhase, 
  category, 
  articleTitle,
  articleId 
}: BlogUnifiedCTAProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState<number | null>(null);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  const handleRating = async (stars: number) => {
    setRating(stars);
    setShowOptions(true);

    // Track rating
    trackEvent('blog_article_rating', {
      article_id: articleId,
      article_title: articleTitle,
      rating: stars,
      journey_phase: journeyPhase
    });

    // Save to database
    try {
      const visitorId = localStorage.getItem('viva_visitor_id');
      const crmUserId = localStorage.getItem('viva_crm_id');

      await supabase.from('blog_feedback').insert({
        blog_post_id: articleId,
        blog_post_slug: window.location.pathname.split('/').pop() || '',
        rating: stars,
        user_id: user?.id,
        visitor_id: visitorId,
        crm_user_id: crmUserId
      });
    } catch (error) {
      console.error('Error saving rating:', error);
    }
  };

  const handleOptionClick = (option: CTAOption) => {
    trackEvent('blog_unified_cta_click', {
      article_id: articleId,
      selected_option: option.id,
      category,
      journey_phase: journeyPhase,
      rating
    });

    // Save to user_preferences if logged in
    if (user) {
      const key = `blog_cta_${articleId}_${option.id}`;
      localStorage.setItem(key, new Date().toISOString());
    }
  };

  const getOptions = (): CTAOption[] => {
    const baseOptions: Record<string, CTAOption> = {
      learn_more: {
        id: 'learn_more',
        icon: Lightbulb,
        label: 'Meer leren',
        description: getCategoryDescription('learn_more'),
        link: `/blog?category=${category}`
      },
      projects: {
        id: 'projects',
        icon: Search,
        label: 'Projecten bekijken',
        description: getCategoryDescription('projects'),
        link: '/projecten'
      },
      conversation: {
        id: 'conversation',
        icon: Calendar,
        label: 'Gesprek plannen',
        description: 'Bespreek jouw situatie met een specialist',
        link: 'https://calendly.com/viva-vastgoed/30min'
      }
    };

    // Order based on journey phase
    const phaseOrder: Record<JourneyPhase, string[]> = {
      orientation: ['learn_more', 'projects', 'conversation'],
      research: ['projects', 'conversation', 'learn_more'],
      decision: ['conversation', 'projects', 'learn_more'],
      action: ['conversation', 'projects', 'learn_more']
    };

    return phaseOrder[journeyPhase].map(key => baseOptions[key]);
  };

  const getCategoryDescription = (optionId: string): string => {
    if (optionId === 'learn_more') {
      const categoryDescriptions: Record<string, string> = {
        'Financiering': 'Verdiep je in financieringsmogelijkheden',
        'Belastingen': 'Lees meer over belastingaspecten',
        'Verhuur': 'Ontdek alles over verhuurrendementen',
        'Juridisch': 'Meer juridische informatie'
      };
      return categoryDescriptions[category] || 'Bekijk meer artikelen over dit onderwerp';
    }

    if (optionId === 'projects') {
      const categoryDescriptions: Record<string, string> = {
        'Financiering': 'Bereken wat projecten voor jou kosten',
        'Belastingen': 'Zie belastingimplicaties per project',
        'Verhuur': 'Vergelijk verhuurrendementen',
        'Juridisch': 'Bekijk juridisch veilige projecten'
      };
      return categoryDescriptions[category] || 'Ontdek beschikbare projecten';
    }

    return '';
  };

  const options = getOptions();

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardContent className="p-8">
        {!showOptions ? (
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-2">Hoe nuttig was dit artikel?</h3>
            <p className="text-muted-foreground mb-6">
              Jouw feedback helpt ons betere content te maken
            </p>
            
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRating(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(null)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 ${
                      (hoveredStar !== null && star <= hoveredStar) || 
                      (rating !== null && star <= rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
            </div>

            <p className="text-sm text-muted-foreground">
              Klik op de sterren om te beoordelen
            </p>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold mb-2">
                Bedankt voor je feedback! 🎉
              </h3>
              <p className="text-muted-foreground">
                Wat wil je nu doen?
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {options.map((option) => {
                const Icon = option.icon;
                const isExternal = option.link.startsWith('http');
                
                return (
                  <Card 
                    key={option.id}
                    className="group cursor-pointer hover:border-primary transition-all hover:shadow-lg"
                  >
                    <CardContent className="p-6">
                      {isExternal ? (
                        <a
                          href={option.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => handleOptionClick(option)}
                          className="block"
                        >
                          <div className="text-center">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                              <Icon className="w-6 h-6 text-primary" />
                            </div>
                            <h4 className="font-bold mb-2">{option.label}</h4>
                            <p className="text-sm text-muted-foreground mb-3">
                              {option.description}
                            </p>
                            <div className="flex items-center justify-center text-primary text-sm font-medium">
                              Ga verder
                              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        </a>
                      ) : (
                        <Link
                          to={option.link}
                          onClick={() => handleOptionClick(option)}
                        >
                          <div className="text-center">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                              <Icon className="w-6 h-6 text-primary" />
                            </div>
                            <h4 className="font-bold mb-2">{option.label}</h4>
                            <p className="text-sm text-muted-foreground mb-3">
                              {option.description}
                            </p>
                            <div className="flex items-center justify-center text-primary text-sm font-medium">
                              Ga verder
                              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
