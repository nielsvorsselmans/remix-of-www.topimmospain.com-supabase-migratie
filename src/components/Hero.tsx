import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, MapPin, TrendingUp, Sparkles, Sun, Compass, MessageCircle, LayoutDashboard, Users, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useMemo, forwardRef } from "react";
import { useClarity } from "@/hooks/useClarity";
import { Card } from "@/components/ui/card";
import { useProjectsList } from "@/hooks/useProjectsList";
import heroImage from "@/assets/hero-property.jpg";
interface JourneyPath {
  id: string;
  icon: any;
  label: string;
  description: string;
  link: string;
}
interface HeroProps {
  forceAnonymous?: boolean;
}

export const Hero = forwardRef<HTMLElement, HeroProps>(({ forceAnonymous }, ref) => {
  const {
    trackEvent
  } = useClarity();
  const {
    user,
    profile
  } = useAuth();
  const [preferredRegions, setPreferredRegions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { data: allProjects } = useProjectsList();

  useEffect(() => {
    const fetchUserPreferences = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      try {
        const visitorId = localStorage.getItem('viva_visitor_id');
        if (!visitorId) {
          setIsLoading(false);
          return;
        }

        const { data: profileData } = await supabase
          .from('customer_profiles')
          .select('explicit_preferences')
          .eq('visitor_id', visitorId)
          .single();

        const explicitPreferences = profileData?.explicit_preferences as any;
        const regions = explicitPreferences?.preferred_regions;
        
        if (regions && Array.isArray(regions)) {
          setPreferredRegions(regions);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserPreferences();
  }, [user]);

  // Derive project count from cached project list instead of separate COUNT(*) query
  const newProjectsCount = useMemo(() => {
    if (!allProjects || preferredRegions.length === 0) return 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return allProjects.filter(p =>
      p.region && preferredRegions.includes(p.region) &&
      p.created_at && new Date(p.created_at) >= thirtyDaysAgo
    ).length;
  }, [allProjects, preferredRegions]);
  const journeyPaths: JourneyPath[] = [{
    id: 'rendement',
    icon: TrendingUp,
    label: "Ik zoek rendement",
    description: "Ontdek huurinkomsten en waardestijging",
    link: "/rendement"
  }, {
    id: 'genieten',
    icon: Sun,
    label: "Ik wil ook zelf genieten",
    description: "Combineer investering met vakantie",
    link: "/eigengebruik"
  }, {
    id: 'orienteren',
    icon: Compass,
    label: "Ik wil eerst oriënteren",
    description: "Leer hoe investeren in Spanje werkt",
    link: "/portaal"
  }, {
    id: 'gezien',
    icon: MessageCircle,
    label: "Ik heb al een pand gezien",
    description: "Plan een gesprek over volgende stappen",
    link: "/contact"
  }];
  const handlePathClick = (pathId: string, pathLabel: string, pathLink: string) => {
    trackEvent("hero_path_selected", {
      path_id: pathId,
      path_label: pathLabel,
      destination: pathLink
    });
  };
  const handleQuickActionClick = (actionType: string, actionLabel: string) => {
    trackEvent("hero_quick_action", {
      action_type: actionType,
      action_label: actionLabel,
      user_id: user?.id
    });
  };
  return <section ref={ref} className="relative min-h-[85vh] sm:h-[600px] md:h-[700px] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-muted">
        <img alt="Mediterrane villa aan de Costa Cálida" fetchPriority="high" src="/lovable-uploads/8ff5b591-1b66-439a-8f4f-879be0808f3a.jpg" className="w-full h-full object-cover object-[center_25%] opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-black/40" />
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-8 sm:py-0">
        {user && profile && !forceAnonymous ?
      // Logged-in users: Grid with Quick Actions
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-4 animate-fade-in">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-white">Welkom terug</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 animate-fade-in leading-tight">
                Hallo, {profile.first_name}!
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-white/90 mb-6 animate-fade-in leading-relaxed" style={{
            animationDelay: "0.2s"
          }}>
                {newProjectsCount > 0 ? `${newProjectsCount} nieuwe project${newProjectsCount === 1 ? '' : 'en'} in uw favoriete regio${preferredRegions.length === 1 ? '' : "'s"}` : "Bekijk uw persoonlijke dashboard voor updates en aanbevelingen"}
              </p>
            </div>

            <div className="animate-fade-in" style={{
          animationDelay: "0.4s"
        }}>
              <Card className="backdrop-blur-lg bg-white/10 border-white/20 p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Snelle acties</h3>
                <div className="space-y-3">
                  <Link to="/dashboard" onClick={() => handleQuickActionClick('dashboard', 'Naar Dashboard')}>
                    <Button variant="secondary" className="w-full justify-start bg-white/20 hover:bg-white/30 border-white/30 text-white">
                      <LayoutDashboard className="h-5 w-5 mr-2" />
                      Naar uw Dashboard
                    </Button>
                  </Link>
                  <Link to="/dashboard/favorieten" onClick={() => handleQuickActionClick('favorites', 'Bekijk Favorieten')}>
                    <Button variant="secondary" className="w-full justify-start bg-white/20 hover:bg-white/30 border-white/30 text-white">
                      <Heart className="h-5 w-5 mr-2" />
                      Uw favorieten
                    </Button>
                  </Link>
                  <Link to="/projecten" onClick={() => handleQuickActionClick('new_projects', 'Nieuwe Projecten')}>
                    <Button variant="secondary" className="w-full justify-start bg-white/20 hover:bg-white/30 border-white/30 text-white">
                      <Sparkles className="h-5 w-5 mr-2" />
                      Nieuwe projecten
                      {newProjectsCount > 0 && <span className="ml-auto bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-semibold">
                          {newProjectsCount}
                        </span>}
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>
          </div> :
      // Anonymous users: Left-aligned with self-selection journey paths
      <div className="max-w-2xl">
            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 animate-fade-in leading-tight [text-shadow:_0_2px_12px_rgb(0_0_0_/_60%)]">
              Overweeg je vastgoed in Spanje?
              <span className="block text-primary">Begin hier.</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white/90 mb-8 sm:mb-10 animate-fade-in leading-relaxed" style={{
          animationDelay: "0.2s"
        }}>
              Ontdek stap voor stap of investeren in Spanje bij je past — zonder verplichtingen, zonder druk.
            </p>
            
            <div className="flex flex-col items-start gap-3 animate-fade-in w-full sm:max-w-md mb-6 sm:mb-8" style={{
          animationDelay: "0.3s"
        }}>
              <Link to="/portaal" className="w-full sm:w-auto">
                <Button onClick={() => handleQuickActionClick('explore_portal', 'Ontdek wat bij jou past')} size="lg" className="w-full sm:w-auto gap-2 h-auto py-3.5 px-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl text-base">
                  <Compass className="h-5 w-5" />
                  <span className="font-medium">Ontdek wat bij jou past</span>
                </Button>
              </Link>
              
              <Link 
                to="/projecten" 
                onClick={() => handleQuickActionClick('view_projects', 'Bekijk woningen in de regio')}
                className="text-sm text-white/60 hover:text-white/90 transition-colors underline underline-offset-4 decoration-white/30 hover:decoration-white/60"
              >
                Of bekijk direct ons aanbod →
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-1.5 sm:gap-y-2 text-xs sm:text-sm text-white/50 animate-fade-in" style={{ animationDelay: "0.5s" }}>
              <span className="flex items-center gap-1.5"><Users className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Begeleiding van A tot Z</span>
              <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Aanwezig in België, Nederland & Spanje</span>
              <span className="flex items-center gap-1.5"><Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Persoonlijke aanpak</span>
            </div>
          </div>}
      </div>
    </section>;
});