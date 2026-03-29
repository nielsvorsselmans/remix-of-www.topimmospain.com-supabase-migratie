import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { Link } from "react-router-dom";
import { ArrowRight, Star, MapPin, Calendar, Quote } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { FeaturedStorySpotlight } from "@/components/FeaturedStorySpotlight";
import { CTASection } from "@/components/CTASection";
import { Helmet } from "react-helmet-async";

const RatingStars = ({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) => {
  const sizeClass = size === "md" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <div className="flex gap-0.5">
      {[...Array(Math.round(rating))].map((_, i) => (
        <Star key={i} className={`${sizeClass} fill-primary text-primary`} />
      ))}
    </div>
  );
};

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
};

const Klantverhalen = () => {
  const storiesRef = useRef<HTMLDivElement>(null);
  const [storiesInView, setStoriesInView] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setStoriesInView(true);
        }
      });
    }, { threshold: 0.1 });
    if (storiesRef.current) {
      observer.observe(storiesRef.current);
    }
    return () => {
      if (storiesRef.current) {
        observer.unobserve(storiesRef.current);
      }
    };
  }, []);

  const {
    data: stories,
    isLoading
  } = useQuery({
    queryKey: ['customer-stories', selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams({
        has_full_story: 'true',
        limit: '100'
      });
      if (selectedCategory !== 'all') {
        params.append('customer_type', selectedCategory);
      }
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-reviews?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch reviews');
      const data = await response.json();
      const reviews = Array.isArray(data) ? data : [];
      const getImage = (r: any) => r.story_featured_image || r.image_url || r.photo_urls?.[0];
      return reviews.sort((a: any, b: any) => {
        if (getImage(a) && !getImage(b)) return -1;
        if (!getImage(a) && getImage(b)) return 1;
        return 0;
      });
    }
  });

  const {
    data: testimonials
  } = useQuery({
    queryKey: ['testimonials'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-reviews?has_full_story=false&limit=6`);
      if (!response.ok) throw new Error('Failed to fetch testimonials');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    }
  });

  const categories = [
    { value: "all", label: "Alle verhalen" },
    { value: "Genieter-Investeerder", label: "Genieter-Investeerder" },
    { value: "Rendementsgerichte Investeerder", label: "Rendement" },
    { value: "Oriënterende ontdekker", label: "Oriëntatie" }
  ];

  // Compute social proof stats
  const allReviews = [...(stories || []), ...(testimonials || [])];
  const totalCount = allReviews.length;
  const avgRating = totalCount > 0
    ? allReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalCount
    : 0;

  // Build AggregateRating JSON-LD
  const aggregateRatingJsonLd = totalCount > 0 ? {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Top Immo Spain",
    "url": "https://topimmo.lovable.app",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": avgRating.toFixed(1),
      "bestRating": "5",
      "worstRating": "1",
      "ratingCount": totalCount.toString()
    }
  } : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Klantverhalen | Échte ervaringen van investeerders | Top Immo Spain</title>
        <meta name="description" content={`Lees ${totalCount}+ echte klantverhalen van investeerders in Spaans vastgoed. Gemiddelde beoordeling: ${avgRating.toFixed(1)}/5 sterren.`} />
        {aggregateRatingJsonLd && (
          <script type="application/ld+json">
            {JSON.stringify(aggregateRatingJsonLd)}
          </script>
        )}
      </Helmet>
      <Navbar />
      
      <main className="flex-grow">
        {/* Breadcrumb */}
        <div className="bg-muted/30 py-4">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/">Home</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Klantverhalen</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>

        {/* Social Proof Header */}
        <section className="py-12 border-b border-border/50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center space-y-5">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                Échte succesverhalen van onze klanten
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Ontdek hoe Top Immo Spain investeerders begeleidt bij hun investering in Spanje.
              </p>
              
              {/* Social proof stats */}
              {totalCount > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <RatingStars rating={Math.round(avgRating)} size="md" />
                    <span className="font-semibold text-foreground">{avgRating.toFixed(1)}</span>
                    <span>gemiddeld</span>
                  </div>
                  <div className="w-px h-5 bg-border" />
                  <span><strong className="text-foreground">{totalCount}</strong> klantverhalen</span>
                  <div className="w-px h-5 bg-border" />
                  <span>Geverifieerde ervaringen</span>
                </div>
              )}

              {/* Category filters */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {categories.map(cat => (
                  <Button
                    key={cat.value}
                    variant={selectedCategory === cat.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.value)}
                    className="rounded-full"
                  >
                    {cat.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Featured Story */}
        {!isLoading && stories && stories.length > 0 && (
          <FeaturedStorySpotlight story={stories[0]} />
        )}

        {/* Additional Stories */}
        <section ref={storiesRef} className="py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            {isLoading ? (
              <div className="grid md:grid-cols-2 gap-8">
                <Skeleton className="h-96" />
                <Skeleton className="h-96" />
              </div>
            ) : stories && stories.length > 1 ? (
              <div className="space-y-12">
                <div className="text-center">
                  <h2 className="text-2xl md:text-3xl font-bold mb-3">
                    Andere investeerders delen hun ervaring
                  </h2>
                  <p className="text-muted-foreground">
                    Ontdek meer succesverhalen van mensen die je voor gingen
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {stories.slice(1).map((story: any, index: number) => {
                    // First card: featured horizontal layout
                    if (index === 0) {
                      return (
                        <Card 
                          key={story.id} 
                          className={`md:col-span-2 overflow-hidden hover:shadow-xl transition-all duration-300 group ${
                            storiesInView ? 'animate-fade-in opacity-100' : 'opacity-0'
                          }`}
                        >
                          <div className="flex flex-col md:flex-row">
                            <div className="relative md:w-1/2 aspect-[4/3] md:aspect-auto overflow-hidden">
                              {(story.story_featured_image || story.image_url || story.photo_urls?.[0]) ? (
                                <img
                                  src={story.story_featured_image || story.image_url || story.photo_urls?.[0]}
                                  alt={story.customer_name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                              ) : (
                                <div className="w-full h-full min-h-[280px] bg-gradient-to-br from-primary/10 via-accent/5 to-muted flex items-center justify-center">
                                  <div className="text-center space-y-2">
                                    <MapPin className="w-8 h-8 text-primary/40 mx-auto" />
                                    <p className="text-sm text-muted-foreground font-medium">{story.location}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <CardContent className="md:w-1/2 p-8 flex flex-col justify-center space-y-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-lg font-semibold">{story.customer_name}</h3>
                                  {story.story_phase && story.story_phase !== 'compleet' && (
                                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                                      Aankoopverhaal
                                    </Badge>
                                  )}
                                  {story.story_phase === 'compleet' && (
                                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                                      Compleet
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{story.location}</p>
                                {story.rating && <RatingStars rating={story.rating} />}
                              </div>

                              {story.customer_type && (
                                <Badge variant="secondary" className="text-xs w-fit">
                                  {story.customer_type}
                                </Badge>
                              )}

                              <p className="text-xl text-foreground line-clamp-3 italic">
                                "{story.quote}"
                              </p>

                              {story.story_slug && (
                                <Button 
                                  asChild 
                                  variant="ghost" 
                                  className="w-fit group/btn"
                                >
                                  <Link to={`/klantverhalen/${story.story_slug}`}>
                                    Lees het volledige verhaal
                                    <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                                  </Link>
                                </Button>
                              )}
                            </CardContent>
                          </div>
                        </Card>
                      );
                    }

                    const card = (
                      <Card 
                        key={story.id} 
                        className={`overflow-hidden hover:shadow-xl transition-all duration-300 group ${
                          storiesInView ? 'animate-fade-in opacity-100' : 'opacity-0'
                        }`}
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="relative aspect-[4/3] overflow-hidden">
                          {(story.story_featured_image || story.image_url || story.photo_urls?.[0]) ? (
                            <img
                              src={story.story_featured_image || story.image_url || story.photo_urls?.[0]}
                              alt={story.customer_name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/10 via-accent/5 to-muted flex items-center justify-center">
                              <div className="text-center space-y-2">
                                <MapPin className="w-8 h-8 text-primary/40 mx-auto" />
                                <p className="text-sm text-muted-foreground font-medium">{story.location}</p>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <CardContent className="p-6 space-y-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-base font-semibold">{story.customer_name}</h3>
                              {story.story_phase && story.story_phase !== 'compleet' && (
                                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                                  Aankoopverhaal
                                </Badge>
                              )}
                              {story.story_phase === 'compleet' && (
                                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                                  Compleet
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{story.location}</p>
                            {story.rating && <RatingStars rating={story.rating} />}
                          </div>

                          {story.customer_type && (
                            <Badge variant="secondary" className="text-xs">
                              {story.customer_type}
                            </Badge>
                          )}

                          <p className="text-lg text-foreground line-clamp-2">
                            "{story.quote}"
                          </p>

                          {story.story_slug && (
                            <Button 
                              asChild 
                              variant="ghost" 
                              className="w-full group/btn"
                            >
                              <Link to={`/klantverhalen/${story.story_slug}`}>
                                Lees meer
                                <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                              </Link>
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );

                    // Insert organic social proof card after the 3rd card (index 2)
                    if (index === 2) {
                      return (
                        <>
                          {card}
                          <Card key="social-proof-inline" className="overflow-hidden bg-gradient-to-br from-primary/5 to-accent/5 border-primary/10">
                            <CardContent className="p-6 flex flex-col justify-center h-full space-y-5">
                              <Quote className="h-8 w-8 text-primary/30" />
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <RatingStars rating={Math.round(avgRating)} size="md" />
                                  <span className="font-semibold text-foreground">{avgRating.toFixed(1)}/5</span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Gebaseerd op {totalCount} geverifieerde klantverhalen
                                </p>
                              </div>
                              <p className="text-base text-foreground font-medium">
                                Benieuwd wat wij voor jou kunnen betekenen?
                              </p>
                              <Link 
                                to="/afspraak" 
                                className="text-sm text-primary hover:text-primary/80 font-medium inline-flex items-center gap-1.5 transition-colors"
                              >
                                <Calendar className="h-4 w-4" />
                                Plan een vrijblijvend gesprek
                                <ArrowRight className="h-3.5 w-3.5" />
                              </Link>
                            </CardContent>
                          </Card>
                        </>
                      );
                    }

                    return card;
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <CTASection />
      </main>

      <Footer />
    </div>
  );
};

export default Klantverhalen;
