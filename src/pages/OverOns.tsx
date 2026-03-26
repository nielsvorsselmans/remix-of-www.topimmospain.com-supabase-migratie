import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowRight, Heart, Shield, Users, Target, MapPin, FileText, Home, CheckCircle, Sparkles, Quote, MessageCircle, Clock, Compass, BookOpen, Handshake, Video } from "lucide-react";
import { trackEvent } from "@/lib/tracking";
import { Footer } from "@/components/Footer";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useActiveReviews } from "@/hooks/useActiveReviews";
import { useActivePartners } from "@/hooks/useActivePartners";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useIsSectionActive } from "@/hooks/useActivePages";
import { ProcessGuidanceSection } from "@/components/ProcessGuidanceSection";

const OverOns = () => {
  const principlesRef = useRef<HTMLDivElement>(null);
  const [principlesInView, setPrinciplesInView] = useState(false);

  // Section visibility checks
  const isHeroIntroActive = useIsSectionActive("over-ons", "hero_intro");
  const isVisionMissionActive = useIsSectionActive("over-ons", "vision_mission");
  const isPrinciplesActive = useIsSectionActive("over-ons", "principles");
  const isTeamActive = useIsSectionActive("over-ons", "team");
  const isJourneyActive = useIsSectionActive("over-ons", "journey");
  const isTestimonialsActive = useIsSectionActive("over-ons", "testimonials");
  const isCtaActive = useIsSectionActive("over-ons", "cta");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setPrinciplesInView(true);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (principlesRef.current) {
      observer.observe(principlesRef.current);
    }

    return () => {
      if (principlesRef.current) {
        observer.unobserve(principlesRef.current);
      }
    };
  }, []);
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  // Fetch team members from database
  const { data: teamMembers } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const { data } = await supabase
        .from('team_members')
        .select('*')
        .eq('active', true)
        .eq('show_on_about_page', true)
        .order('order_index');
      return data || [];
    }
  });

  const [selectedPartner, setSelectedPartner] = useState<any>(null);

  const { data: partners } = useActivePartners();

  const { data: allActiveReviews } = useActiveReviews();
  const reviews = useMemo(() => {
    if (!allActiveReviews) return [];
    return allActiveReviews.slice(0, 3);
  }, [allActiveReviews]);

  const principles = [
    {
      icon: Shield,
      title: "We zeggen gewoon wat het is",
      description: "Geen verborgen kosten, geen mooie praatjes. Je weet precies waar je aan toe bent."
    },
    {
      icon: Users,
      title: "Eén vast aanspreekpunt",
      description: "Van eerste gesprek tot sleuteloverdracht—en ook daarna. Jij hoeft niet steeds opnieuw je verhaal te doen."
    },
    {
      icon: Handshake,
      title: "We blijven ook na de aankoop",
      description: "Beheer, verhuur, onderhoud: we regelen het samen. Geen makelaar die verdwijnt na de handtekening."
    },
    {
      icon: MapPin,
      title: "Elk project kennen we persoonlijk",
      description: "Alles wat we aanbieden hebben we zelf bezocht en gecontroleerd. Geen catalogus, maar eigen ervaring."
    },
    {
      icon: FileText,
      title: "Juridisch waterdicht",
      description: "We werken uitsluitend met gecertificeerde Spaanse advocaten en notarissen. Geen risico's."
    },
    {
      icon: MessageCircle,
      title: "Stel gerust je vragen",
      description: "Er zijn geen domme vragen. We zijn er om je te helpen, niet om je iets te verkopen."
    }
  ];

  const journey = [
    {
      phase: "1. Kennismaken",
      description: "Je ontdekt wat bij jou past via ons Portaal of een vrijblijvend gesprek.",
      help: "We delen kennis via blogs, gidsen en webinars om je eerste vragen te beantwoorden."
    },
    {
      phase: "2. Verdiepen",
      description: "We helpen je vergelijken: projecten, regio's, kosten en rendementen.",
      help: "We luisteren naar jouw wensen en vertellen hoe wij je kunnen helpen."
    },
    {
      phase: "3. Kiezen",
      description: "Je kiest een pand en wij coördineren de bezichtigingsreis.",
      help: "We geven je toegang tot alle informatie die je nodig hebt om voorbereid te starten."
    },
    {
      phase: "4. Financieren",
      description: "Onze hypotheekpartners regelen de financiering voor jou.",
      help: "We begeleiden je persoonlijk en laten je zien wat bij jou past."
    },
    {
      phase: "5. Regelen",
      description: "Een gespecialiseerde advocaat controleert alles en begeleidt de notaris.",
      help: "We zorgen voor een veilig en transparant aankoopproces van begin tot eind."
    },
    {
      phase: "6. Genieten",
      description: "Je ontvangt de sleutels en we zorgen dat alles in orde is.",
      help: "We blijven beschikbaar voor beheer, onderhoud en advies."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Breadcrumbs */}
      <div className="py-8 bg-gradient-subtle">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Over Ons</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* 1. Hero-intro: Wie wij zijn en waarom wij dit doen */}
      {isHeroIntroActive && (
        <section className="pb-20 bg-gradient-subtle">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Villa Photo */}
              <div className="order-2 lg:order-1">
                <div className="relative rounded-2xl overflow-hidden shadow-elegant">
                  <img 
                    src="/lovable-uploads/8ff5b591-1b66-439a-8f4f-879be0808f3a.jpg" 
                    alt="Moderne villa in Spanje met zwembad"
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
                </div>
              </div>
              
              {/* Tekst */}
              <div className="order-1 lg:order-2">
                <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
                  Ontmoet Top Immo Spain
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed mb-6">
                  We helpen mensen zoals jij slim investeren in Spaans vastgoed. Geen verkooppraatjes, 
                  maar eerlijke begeleiding van A tot Z.
                </p>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Of je nu zoekt naar rendement, een tweede huis of een combinatie: wij nemen de tijd 
                  om je rustig door elk detail te begeleiden. Van de eerste vraag tot de sleuteloverdracht.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. Onze visie & missie */}
      {isVisionMissionActive && (
        <section className="py-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-card border border-border rounded-2xl p-8 md:p-12">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="h-8 w-8 text-primary" />
              <h2 className="text-3xl font-bold text-foreground">Wat ons drijft</h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed mb-6">
              Investeren in Spanje is een grote stap. Daarom begeleiden wij je niet alleen bij de aankoop, maar blijven we ook daarna jouw vaste partner. Van het zoeken naar de juiste woning tot het sleutelbeheer en de verhuur—wij staan aan jouw kant.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Veel mensen die overwegen om in Spanje te investeren, voelen zich verloren in een zee van informatie. Wij zijn er om dat anders te maken. Geen verkooppraatjes, geen druk, maar wel duidelijke antwoorden en begeleiding die bij jou past. Want uiteindelijk draait het om jouw doelen, jouw rust, en jouw vertrouwen in de stappen die je zet.
            </p>
          </div>
        </section>
      )}

      {/* 3. Waar wij voor staan */}
      {isPrinciplesActive && (
        <section className="py-16 bg-secondary/30" ref={principlesRef}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-bold text-foreground mb-4 text-center">
              Waar wij voor staan
            </h2>
            <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              Dit zijn de beloftes die we aan onze klanten doen. Niet omdat het goed klinkt, maar omdat we écht zo werken.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {principles.map((principle, index) => (
                <Card 
                  key={index} 
                  className={`border-border hover:border-primary/50 transition-all ${
                    principlesInView ? 'animate-fade-in' : 'opacity-0'
                  }`}
                  style={{
                    animationDelay: principlesInView ? `${index * 0.1}s` : '0s'
                  }}
                >
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4">
                      <principle.icon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-3">{principle.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{principle.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. Ons team */}
      {isTeamActive && (
        <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-foreground mb-4 text-center">
            Ons team
          </h2>
          <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Top Immo Spain is een familiebedrijf. Wij drieën staan samen aan het roer en kennen elke klant persoonlijk.
          </p>

          {/* Core Team */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            {teamMembers?.map((member) => (
              <Card key={member.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="mb-6 flex justify-center">
                    <Avatar className="w-32 h-32">
                      <AvatarImage 
                        src={member.image_url || undefined} 
                        alt={member.name} 
                        className={`object-cover ${member.name === 'Filip' ? 'object-[center_20%]' : ''}`}
                      />
                      <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                        {member.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <h3 className="text-2xl font-semibold mb-4">{member.name}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {member.bio}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Partners Network */}
          {partners && partners.length > 0 && (
            <div className="border-t pt-16">
              <h3 className="text-3xl font-bold text-center mb-4">
                Ons netwerk
              </h3>
              <p className="text-lg text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
                We werken samen met betrouwbare lokale partners die onze klanten ondersteunen.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {partners.map((partner) => (
                  <Card 
                    key={partner.id}
                    className="overflow-hidden hover:shadow-lg transition-shadow h-full cursor-pointer"
                    onClick={() => setSelectedPartner(partner)}
                  >
                    <CardContent className="p-6 flex flex-col items-center text-center h-full">
                      <div className="mb-4 flex justify-center">
                        <Avatar className="w-20 h-20">
                          <AvatarImage 
                            src={partner.image_url} 
                            alt={partner.name}
                            className="object-cover"
                          />
                          <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                            {partner.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <h4 className="font-semibold text-lg mb-1">{partner.name}</h4>
                      <p className="text-sm text-muted-foreground mb-1">{partner.company}</p>
                      <p className="text-sm text-primary">{partner.role}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Partner Detail Dialog */}
              <Dialog open={!!selectedPartner} onOpenChange={() => setSelectedPartner(null)}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">
                      {selectedPartner?.name}
                    </DialogTitle>
                  </DialogHeader>
                  {selectedPartner && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-24 h-24">
                          <AvatarImage 
                            src={selectedPartner.image_url} 
                            alt={selectedPartner.name}
                            className="object-cover"
                          />
                          <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                            {selectedPartner.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-xl">{selectedPartner.company}</h3>
                          <p className="text-primary">{selectedPartner.role}</p>
                        </div>
                      </div>
                      
                      {selectedPartner.description && (
                        <div>
                          <h4 className="font-semibold mb-2">Over</h4>
                          <p className="text-muted-foreground">{selectedPartner.description}</p>
                        </div>
                      )}
                      
                      {selectedPartner.bio && (
                        <div>
                          <h4 className="font-semibold mb-2">Profiel</h4>
                          <p className="text-muted-foreground">{selectedPartner.bio}</p>
                        </div>
                      )}
                      
                      {/* Contact Information */}
                      {(selectedPartner.email || selectedPartner.phone || selectedPartner.website) && (
                        <div>
                          <h4 className="font-semibold mb-2">Contact</h4>
                          <div className="space-y-1 text-muted-foreground">
                            {selectedPartner.email && (
                              <p>
                                <a href={`mailto:${selectedPartner.email}`} className="hover:text-primary transition-colors">
                                  {selectedPartner.email}
                                </a>
                              </p>
                            )}
                            {selectedPartner.phone && (
                              <p>
                                <a href={`tel:${selectedPartner.phone}`} className="hover:text-primary transition-colors">
                                  {selectedPartner.phone}
                                </a>
                              </p>
                            )}
                            {selectedPartner.website && (
                              <p>
                                <a 
                                  href={selectedPartner.website} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="hover:text-primary transition-colors"
                                >
                                  {selectedPartner.website.replace(/^https?:\/\//, '')}
                                </a>
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Office Locations */}
                      {selectedPartner.office_locations && selectedPartner.office_locations.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">Adres</h4>
                          <div className="space-y-2">
                            {selectedPartner.office_locations.map((location: any, idx: number) => (
                              <div key={idx} className="text-muted-foreground">
                                {location.address && <p>{location.address}</p>}
                                {(location.city || location.postal_code) && (
                                  <p>{location.postal_code} {location.city}</p>
                                )}
                                {location.country && <p>{location.country}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          )}
        </section>
      )}

      {/* 5. Onze aanpak - 6-stappen journey */}
      {isJourneyActive && <ProcessGuidanceSection />}

      {/* 6. Waarom mensen graag met ons werken */}
      {isTestimonialsActive && (
        <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-foreground mb-4 text-center">
            Waarom mensen graag met ons werken
          </h2>
          <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Vertrouwen, duidelijkheid en persoonlijke aandacht. Dat is wat onze klanten het meest waarderen.
          </p>

          {reviews && reviews.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                {reviews.map((review, index) => (
                  <Card key={index} className="border-border bg-card hover:shadow-lg transition-shadow">
                    <CardContent className="p-6 flex flex-col h-full">
                      {/* Customer Photo */}
                      <div className="flex items-center gap-4 mb-4">
                        <Avatar className="w-20 h-20">
                          <AvatarImage 
                            src={review.image_url || ''} 
                            alt={review.customer_name}
                            className="object-cover"
                          />
                          <AvatarFallback className="text-xl bg-primary/10 text-primary">
                            {review.customer_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{review.customer_name}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {review.location}
                          </p>
                        </div>
                      </div>

                      {/* Rating */}
                      <div className="flex gap-1 mb-4">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className="text-yellow-500">★</span>
                        ))}
                      </div>

                      {/* Quote */}
                      <div className="flex-1 mb-4">
                        <Quote className="h-6 w-6 text-primary/40 mb-2" />
                        <p className="text-muted-foreground leading-relaxed italic">
                          "{review.quote}"
                        </p>
                      </div>

                      {/* Customer Type Badge */}
                      {review.customer_type && (
                        <div className="mb-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {review.customer_type}
                          </span>
                        </div>
                      )}

                      {/* Link to Full Story */}
                      {review.has_full_story && review.story_slug && (
                        <Link 
                          to={`/klantverhalen/${review.story_slug}`}
                          className="text-primary hover:underline text-sm font-medium flex items-center gap-1"
                        >
                          Lees het volledige verhaal
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Link to All Stories */}
              <div className="text-center">
                <Link 
                  to="/klantverhalen"
                  className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                >
                  Bekijk alle klantverhalen
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center text-muted-foreground">
              Er zijn momenteel geen reviews beschikbaar.
            </div>
          )}
        </section>
      )}

      {/* 7. CTA-blok */}
      {isCtaActive && (
        <section className="py-20 bg-gradient-to-br from-background via-background to-primary/5">
          <div className="container">
            <div className="max-w-5xl mx-auto">
              <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center bg-card rounded-2xl p-8 md:p-12 shadow-elegant">
                {/* Photo Section */}
                <div className="relative">
                  <div className="relative aspect-square rounded-2xl overflow-hidden">
                    <img
                      src="/assets/lars-profile.webp"
                      alt="Lars van Top Immo Spain"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-4 left-4 right-4 bg-background/95 backdrop-blur-sm rounded-lg px-4 py-2 border border-border/50">
                      <p className="text-sm font-medium text-foreground">Lars van Top Immo Spain</p>
                    </div>
                  </div>
                </div>

                {/* Content Section */}
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                      Laten we kennismaken
                    </h2>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                      Je hebt gelezen wie we zijn en hoe we werken. Benieuwd of we bij jouw situatie kunnen helpen? Plan een vrijblijvend gesprek of start zelf met oriënteren.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                    <Button
                      size="lg"
                      onClick={() => {
                        trackEvent('cta_clicked', {
                          cta_type: 'appointment',
                          cta_location: 'over_ons_closing_cta',
                          destination: '/afspraak'
                        });
                        window.location.href = '/afspraak';
                      }}
                      className="gap-2 whitespace-nowrap"
                    >
                      <Video className="w-5 h-5" />
                      Plan een kennismakingsgesprek
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => {
                        trackEvent('cta_clicked', {
                          cta_type: 'portal',
                          cta_location: 'over_ons_closing_cta',
                          destination: '/portaal'
                        });
                        window.location.href = '/portaal';
                      }}
                      className="gap-2 whitespace-nowrap"
                    >
                      <Compass className="w-5 h-5" />
                      Ontdek het Portaal
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground pt-2">
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      <span className="text-primary">✓</span>
                      30 minuten
                    </span>
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      <span className="text-primary">✓</span>
                      Vrijblijvend
                    </span>
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      <span className="text-primary">✓</span>
                      Persoonlijk advies
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
};

export default OverOns;
