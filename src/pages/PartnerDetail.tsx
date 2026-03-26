import { useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Loader2, TrendingUp, Home, HelpCircle, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FeaturedProjects } from '@/components/FeaturedProjects';
import { InvestmentFAQ } from '@/components/InvestmentFAQ';
import { Helmet } from 'react-helmet-async';
import { useEffect } from 'react';
import { usePartner } from '@/contexts/PartnerContext';
import heroImage from "@/assets/hero-property.jpg";

export default function PartnerDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { setCurrentPartner } = usePartner();

  const { data: partner, isLoading, error } = useQuery({
    queryKey: ['partner', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('slug', slug)
        .eq('active', true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  useEffect(() => {
    if (partner) {
      setCurrentPartner(partner);
    }
  }, [partner, setCurrentPartner]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !partner) {
    return <Navigate to="/partners" replace />;
  }

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const currentUrl = `${window.location.origin}/partner/${partner.slug}`;
  const ogImage = partner.logo_url || partner.image_url;
  const ogTitle = partner.landing_page_title || `Investeren via ${partner.name}`;
  const ogDescription = partner.landing_page_intro || partner.description;

  return (
    <>
      <Helmet>
        {/* Basis meta tags */}
        <title>{partner.landing_page_title || `Welkom via ${partner.name}`} | Viva Vastgoed</title>
        <meta 
          name="description" 
          content={ogDescription} 
        />

        {/* Open Graph - Facebook, LinkedIn, WhatsApp */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta property="og:url" content={currentUrl} />
        <meta property="og:site_name" content={partner.company} />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDescription} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />

        {/* Hero Section - Split Screen with Persona Segmentation */}
        <section className="relative min-h-[600px] overflow-hidden">
          {/* Background with Gradient Overlay */}
          <div className="absolute inset-0">
            {(partner as any).hero_video_url ? (
              <video
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
              >
                <source src={(partner as any).hero_video_url} type="video/mp4" />
              </video>
            ) : (
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ 
                  backgroundImage: `url('${(partner as any).hero_image_url || partner.image_url || heroImage}')` 
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent" />
          </div>

          {/* Floating Shapes */}
          <div className="absolute top-20 left-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />

          {/* Hero Content - Split Screen Layout */}
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[600px] py-20">
              {/* Left: Welcome Text */}
              <div className="space-y-6 animate-fade-in">
                <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
                  {partner.landing_page_title || `Welkom via ${partner.name}`}
                </h1>
                
                <p className="text-xl md:text-2xl text-white/90 leading-relaxed">
                  {partner.landing_page_intro || `Ontdek hoe u slim kunt investeren in Spaans vastgoed`}
                </p>
              </div>

              {/* Right: Persona Segmentation Buttons */}
              <div 
                className="backdrop-blur-lg bg-white/10 border rounded-3xl p-8 shadow-elegant animate-fade-in space-y-4"
                style={{ animationDelay: "0.2s" }}
              >
                <h3 className="text-2xl font-bold text-white mb-6 text-center">
                  Wat is uw belangrijkste doel?
                </h3>

                <Button 
                  className="w-full h-auto py-6 backdrop-blur-sm bg-white/10 hover:bg-white/20 text-white border border-white/20 flex flex-col items-start gap-2"
                  onClick={() => window.location.href = '/rendement'}
                >
                  <div className="flex items-center gap-3 w-full">
                    <TrendingUp className="h-6 w-6" />
                    <span className="text-lg font-semibold">Ik zoek rendement</span>
                  </div>
                  <span className="text-sm text-white/70 text-left ml-9">
                    Ontdek hoe u 5-8% huurrendement kunt behalen
                  </span>
                </Button>

                <Button 
                  className="w-full h-auto py-6 backdrop-blur-sm bg-white/10 hover:bg-white/20 text-white border border-white/20 flex flex-col items-start gap-2"
                  onClick={() => window.location.href = '/eigengebruik'}
                >
                  <div className="flex items-center gap-3 w-full">
                    <Home className="h-6 w-6" />
                    <span className="text-lg font-semibold">Ik wil ook zelf genieten</span>
                  </div>
                  <span className="text-sm text-white/70 text-left ml-9">
                    Investeren én genieten van zon en zee
                  </span>
                </Button>

                <Button 
                  className="w-full h-auto py-6 backdrop-blur-sm bg-white/10 hover:bg-white/20 text-white border border-white/20 flex flex-col items-start gap-2"
                  onClick={() => scrollToSection('faq')}
                >
                  <div className="flex items-center gap-3 w-full">
                    <HelpCircle className="h-6 w-6" />
                    <span className="text-lg font-semibold">Ik wil eerst oriënteren</span>
                  </div>
                  <span className="text-sm text-white/70 text-left ml-9">
                    Begin met antwoorden op veelgestelde vragen
                  </span>
                </Button>

                <Button 
                  className="w-full h-auto py-6 backdrop-blur-sm bg-white/10 hover:bg-white/20 text-white border border-white/20 flex flex-col items-start gap-2"
                  onClick={() => scrollToSection('projecten')}
                >
                  <div className="flex items-center gap-3 w-full">
                    <Building2 className="h-6 w-6" />
                    <span className="text-lg font-semibold">Bekijk beschikbare projecten</span>
                  </div>
                  <span className="text-sm text-white/70 text-left ml-9">
                    Direct naar ons actuele aanbod
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Why Invest in Spain - Brief Overview */}
        <section className="py-16 bg-gradient-to-b from-background to-muted/20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
              <h2 className="text-3xl md:text-4xl font-bold">
                Waarom investeren in Spanje?
              </h2>
              <div className="grid md:grid-cols-3 gap-8 mt-12">
                <div className="space-y-3">
                  <div className="text-4xl font-bold text-primary">5-8%</div>
                  <h3 className="font-semibold text-lg">Huurrendement</h3>
                  <p className="text-muted-foreground text-sm">
                    Stabiele huuropbrengsten door toeristische verhuur
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="text-4xl font-bold text-primary">300+</div>
                  <h3 className="font-semibold text-lg">Dagen Zon</h3>
                  <p className="text-muted-foreground text-sm">
                    Aantrekkelijke klimaat voor toeristen én eigenaren
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="text-4xl font-bold text-primary">€150k+</div>
                  <h3 className="font-semibold text-lg">Vanaf Budget</h3>
                  <p className="text-muted-foreground text-sm">
                    Toegankelijke instap voor Nederlandse investeerders
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Projects */}
        <section id="projecten" className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 animate-fade-in">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Beschikbare Projecten
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Ontdek ons actuele aanbod aan investeringsprojecten in Costa Cálida en Costa Blanca Zuid
              </p>
            </div>
            <FeaturedProjects />
          </div>
        </section>

        {/* Investment FAQ */}
        <section id="faq" className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12 animate-fade-in">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Veelgestelde Vragen
                </h2>
                <p className="text-xl text-muted-foreground">
                  Antwoorden op de belangrijkste vragen over investeren in Spaans vastgoed
                </p>
              </div>
              <InvestmentFAQ />
            </div>
          </div>
        </section>

        {/* CTA to Portal */}
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-background" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center space-y-8 animate-fade-in">
              <h2 className="text-3xl md:text-5xl font-bold">
                Klaar om te beginnen?
              </h2>
              <p className="text-xl text-muted-foreground">
                Creëer een gratis account en krijg direct toegang tot gedetailleerde projectanalyses, verhuurdata en exclusieve investeringsmogelijkheden.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="text-lg px-8 py-6"
                  onClick={() => window.location.href = '/portaal'}
                >
                  Ontdek het Viva Portaal
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="text-lg px-8 py-6"
                  onClick={() => scrollToSection('projecten')}
                >
                  Bekijk Projecten
                </Button>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
