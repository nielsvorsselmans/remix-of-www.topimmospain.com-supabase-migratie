import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Star, Quote, MapPin, Calendar, CheckCircle2, ArrowRight, Play, Clock, ImageIcon, Share2, Linkedin, Mail } from "lucide-react";
import { RelatedStories } from "@/components/RelatedStories";
import { StoryProcessTimeline } from "@/components/StoryProcessTimeline";
import { BuildUpdateTimeline } from "@/components/BuildUpdateTimeline";
import { StoryTestimonials } from "@/components/StoryTestimonials";
import { CTASection } from "@/components/CTASection";
import { VideoLightbox } from "@/components/VideoLightbox";
import { extractYouTubeId, isYouTubeShorts } from "@/lib/youtube";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { useEffect, useRef, useState, useMemo } from "react";

/** Adaptive photo gallery: inline for 1-3, carousel for 4+ */
const PhotoGallery = ({ photos, customerName, onClickImage }: { photos: string[]; customerName: string; onClickImage: (url: string) => void }) => {
  if (photos.length === 0) return null;

  if (photos.length <= 3) {
    return (
      <div className={`grid gap-3 ${photos.length === 1 ? 'grid-cols-1' : photos.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {photos.map((url, i) => (
          <button
            key={i}
            onClick={() => onClickImage(url)}
            className="block w-full rounded-xl overflow-hidden border border-border shadow-soft group cursor-pointer"
          >
            <img
              src={url}
              alt={`Foto ${i + 1} van ${customerName}`}
              className={`w-full ${photos.length === 1 ? 'aspect-video' : 'aspect-square'} object-cover transition-transform duration-300 group-hover:scale-105`}
              loading="lazy"
            />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="relative px-12">
      <Carousel opts={{ align: "start", loop: true }} className="w-full">
        <CarouselContent className="-ml-3">
          {photos.map((url, i) => (
            <CarouselItem key={i} className="pl-3 basis-1/2 md:basis-1/3">
              <button
                onClick={() => onClickImage(url)}
                className="block w-full rounded-xl overflow-hidden border border-border shadow-soft group cursor-pointer"
              >
                <img
                  src={url}
                  alt={`Foto ${i + 1} van ${customerName}`}
                  className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </button>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
};

/** Simple social sharing buttons */
const SocialShareBar = ({ title, slug }: { title: string; slug: string }) => {
  const url = `https://www.topimmospain.com/klantverhalen/${slug}`;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground mr-1">Delen:</span>
      <button
        onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${title} - ${url}`)}`, '_blank')}
        className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Deel via WhatsApp"
      >
        <Share2 className="w-4 h-4" />
      </button>
      <button
        onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400')}
        className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Deel via LinkedIn"
      >
        <Linkedin className="w-4 h-4" />
      </button>
      <button
        onClick={() => { window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`; }}
        className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Deel via email"
      >
        <Mail className="w-4 h-4" />
      </button>
    </div>
  );
};

const KlantverhaalDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const contentRef = useRef<HTMLDivElement>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  const { data: story, isLoading, error } = useQuery({
    queryKey: ['customer-story', slug],
    queryFn: async () => {
      const params = new URLSearchParams({
        has_full_story: 'true',
        limit: '1',
      });
      if (slug) params.append('story_slug', slug);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-reviews?${params.toString()}`
      );
      if (!response.ok) throw new Error('Failed to fetch story');
      const data = await response.json();
      return (Array.isArray(data) ? data : [])[0] || null;
    },
  });

  // Customer type badge color
  const getCustomerTypeBadgeColor = (type: string) => {
    if (type?.toLowerCase().includes('genieter')) return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20';
    if (type?.toLowerCase().includes('rendementsgerichte')) return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
    return 'bg-secondary text-secondary-foreground';
  };

  const youtubeId = useMemo(() => story?.video_url ? extractYouTubeId(story.video_url) : null, [story?.video_url]);
  const isShorts = useMemo(() => story?.video_url ? isYouTubeShorts(story.video_url) : false, [story?.video_url]);

  const readingTime = useMemo(() => {
    if (!story) return 0;
    let wordCount = 0;
    if (story.story_intro) wordCount += story.story_intro.split(/\s+/).length;
    if (story.story_sections?.sections) {
      story.story_sections.sections.forEach((s: any) => {
        if (s.content) wordCount += s.content.split(/\s+/).length;
        if (s.title) wordCount += s.title.split(/\s+/).length;
      });
    }
    if (story.story_content_html || story.story_content) {
      const text = (story.story_content_html || story.story_content).replace(/<[^>]*>/g, '');
      wordCount += text.split(/\s+/).length;
    }
    return Math.max(1, Math.ceil(wordCount / 200));
  }, [story]);

  const tocItems = useMemo(() => {
    if (!story?.story_sections?.sections) return [];
    return story.story_sections.sections
      .filter((s: any) => s.type !== 'quote_highlight' && s.title && hasContent(s))
      .map((s: any, i: number) => ({ id: `section-${i}`, title: s.title }));
  }, [story?.story_sections]);

  // Find the first quote_highlight to display (only once, as a pull-quote)
  const pullQuote = useMemo(() => {
    if (!story?.story_sections?.sections) return null;
    const q = story.story_sections.sections.find((s: any) => s.type === 'quote_highlight');
    return q ? (q.content || q.title) : null;
  }, [story?.story_sections]);

  // Check if intro overlaps with first section
  const showIntro = useMemo(() => {
    if (!story?.story_intro) return false;
    const firstSection = story.story_sections?.sections?.[0];
    const introText = story.story_intro.toLowerCase().trim();
    const firstContent = (firstSection?.content || '').toLowerCase().trim();
    if (!firstContent) return true;
    
    // Quick check: compare first 100 normalized chars — if >80% similar, hide intro
    const normalize = (s: string) => s.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    const introStart = normalize(introText).slice(0, 100);
    const contentStart = normalize(firstContent).slice(0, 100);
    if (introStart.length > 20 && contentStart.length > 20) {
      const startWords = introStart.split(' ');
      const contentStartWords = contentStart.split(' ');
      const commonStart = startWords.filter(w => contentStartWords.includes(w));
      if (commonStart.length / startWords.length > 0.8) return false;
    }
    
    // Word overlap check with lower threshold
    const introWords = introText.split(/\s+/);
    const contentWords = firstContent.split(/\s+/);
    const commonWords = introWords.filter((w: string) => w.length > 3 && contentWords.includes(w));
    const overlapRatio = introWords.length > 0 ? commonWords.length / introWords.length : 0;
    return !(overlapRatio > 0.5 || firstContent.includes(introText) || introText.includes(firstContent));
  }, [story]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-grow">
          <div className="container mx-auto px-4 py-12">
            <Skeleton className="h-8 w-48 mb-8" />
            <Skeleton className="h-96 w-full mb-8" />
            <Skeleton className="h-12 w-3/4 mb-4" />
            <Skeleton className="h-32 w-full" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-grow">
          <div className="container mx-auto px-4 py-12 text-center">
            <h1 className="text-3xl font-bold mb-4">Klantverhaal niet gevonden</h1>
            <p className="text-muted-foreground mb-8">
              Het verhaal dat je zoekt bestaat niet of is niet meer beschikbaar.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const storyTitle = story.story_title || story.customer_name;
  const metaDescription = story.story_intro
    ? story.story_intro.slice(0, 155) + (story.story_intro.length > 155 ? '…' : '')
    : `Lees het verhaal van ${story.customer_name} over hun vastgoedervaring in ${story.location}.`;

  // JSON-LD Review structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Review",
    "author": { "@type": "Person", "name": story.customer_name },
    "reviewRating": { "@type": "Rating", "ratingValue": story.rating, "bestRating": 5 },
    "itemReviewed": { "@type": "Organization", "name": "Top Immo Spain", "url": "https://www.topimmospain.com" },
    "reviewBody": story.quote || story.story_intro || "",
    "datePublished": story.created_at?.slice(0, 10),
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{`${storyTitle} | Klantverhaal Top Immo Spain`}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={`https://www.topimmospain.com/klantverhalen/${slug}`} />
        <meta property="og:title" content={storyTitle} />
        <meta property="og:description" content={metaDescription} />
        {story.story_featured_image && <meta property="og:image" content={story.story_featured_image} />}
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <Navbar />
      
      <main className="flex-grow">
        {/* Breadcrumb */}
        <div className="bg-muted/30 py-4">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild><Link to="/klantverhalen">Klantverhalen</Link></BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{storyTitle}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>

        {/* Hero Section */}
        {story.story_featured_image ? (
          <section className="relative h-[60vh] min-h-[500px] overflow-hidden animate-fade-in">
            <div className="absolute inset-0">
              <img src={story.story_featured_image} alt={storyTitle} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
            </div>
            <div className="relative h-full flex items-end pb-12">
              <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <HeroBadges story={story} getColor={getCustomerTypeBadgeColor} />
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground drop-shadow-lg">{storyTitle}</h1>
                <HeroMeta story={story} />
              </div>
            </div>
          </section>
        ) : (
          /* Fallback hero: gradient with customer photo */
          <section className="relative py-16 overflow-hidden animate-fade-in bg-gradient-to-br from-primary/10 via-accent/5 to-muted/30">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl" />
            </div>
            <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center gap-8">
              {/* Customer photo or initials */}
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl border-2 border-primary/20 overflow-hidden flex-shrink-0 bg-muted shadow-lg">
                {story.image_url ? (
                  <img src={story.image_url} alt={story.customer_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-4xl font-bold">
                    {story.customer_name.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                )}
              </div>
              <div>
                <HeroBadges story={story} getColor={getCustomerTypeBadgeColor} />
                <h1 className="text-4xl md:text-5xl font-bold mb-4">{storyTitle}</h1>
                <HeroMeta story={story} />
              </div>
            </div>
          </section>
        )}

        {/* Story Content with Sticky Sidebar */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                {/* Main Content */}
                <div className="lg:col-span-8 space-y-10">
                  {/* Reading time + meta + sharing */}
                  <div className="flex flex-wrap items-center justify-between gap-4 animate-fade-in">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>{readingTime} min. leestijd</span>
                      </div>
                      {story.photo_urls?.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <ImageIcon className="w-4 h-4" />
                          <span>{story.photo_urls.length} foto's</span>
                        </div>
                      )}
                      {youtubeId && (
                        <div className="flex items-center gap-1.5">
                          <Play className="w-4 h-4" />
                          <span>Videoreview</span>
                        </div>
                      )}
                    </div>
                    <SocialShareBar title={storyTitle} slug={slug || ''} />
                  </div>

                  {/* Intro */}
                  {showIntro && (
                    <div className="prose prose-lg max-w-none animate-fade-in">
                      <p className="text-xl text-muted-foreground leading-relaxed">{story.story_intro}</p>
                    </div>
                  )}

                  {/* Video Review Section */}
                  {youtubeId && (
                    <div className="animate-fade-in">
                      <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Play className="w-5 h-5 text-primary" />
                        Bekijk de videoreview
                      </h3>
                      <button
                        onClick={() => setVideoOpen(true)}
                        className="relative w-full rounded-xl overflow-hidden group cursor-pointer border border-border shadow-soft"
                      >
                        <img
                          src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
                          alt={`Videoreview van ${story.customer_name}`}
                          className="w-full aspect-video object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Play className="w-7 h-7 text-primary-foreground ml-1" />
                          </div>
                        </div>
                      </button>
                      <VideoLightbox open={videoOpen} onOpenChange={setVideoOpen} youtubeId={youtubeId} title={`Videoreview ${story.customer_name}`} isShorts={isShorts} />
                    </div>
                  )}

                  {/* REMOVED: early CTA — per missie: niet pushen vóór de inhoud */}

                  {/* Structured Sections */}
                  {story.story_sections?.sections?.length > 0 ? (
                    <div className="space-y-8">
                      {story.story_sections.sections
                        .filter((section: any) => {
                          // Skip quote_highlights here — rendered separately as pull-quote
                          if (section.type === 'quote_highlight') return false;
                          // Skip empty sections (no content and no metrics)
                          if (!hasContent(section)) return false;
                          return true;
                        })
                        .map((section: any, contentIndex: number) => (
                          <div
                            key={contentIndex}
                            id={`section-${contentIndex}`}
                            className="relative pl-12 pb-10 opacity-0 animate-fade-in"
                            style={{ animationDelay: `${contentIndex * 100}ms`, animationFillMode: 'forwards' }}
                          >
                            <div className="absolute left-0 top-0 bottom-0 w-px bg-border">
                              <div className="absolute top-0 -left-4 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-sm">
                                {contentIndex + 1}
                              </div>
                            </div>
                            <div className="space-y-3">
                              <h2 className="text-2xl font-bold text-foreground">{section.title}</h2>
                              <div
                                className="prose prose-lg max-w-none prose-p:text-muted-foreground prose-p:leading-relaxed"
                                dangerouslySetInnerHTML={{
                                  __html: DOMPurify.sanitize(
                                    section.content
                                      .split('\n')
                                      .filter(Boolean)
                                      .map((p: string) => `<p>${p}</p>`)
                                      .join('')
                                  ),
                                }}
                              />
                              {section.metrics && Object.keys(section.metrics).some((k: string) => section.metrics[k]) && (
                                <div className="flex flex-wrap gap-3 mt-4">
                                  {Object.entries(section.metrics).filter(([, v]) => v).map(([key, value]) => (
                                    <div key={key} className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-2">
                                      <span className="text-xs text-muted-foreground capitalize">{key}</span>
                                      <p className="text-lg font-bold text-primary">{value as string}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (story.story_content_html || story.story_content) ? (
                    <article
                      ref={contentRef}
                      className="prose prose-lg max-w-none animate-fade-in prose-headings:font-bold prose-headings:text-foreground prose-p:text-muted-foreground prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-ul:text-muted-foreground prose-ol:text-muted-foreground"
                    >
                      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(story.story_content_html || story.story_content) }} />
                    </article>
                  ) : null}

                  {/* Pull quote — shown only once (not duplicated as big block below) */}
                  {pullQuote && (
                    <div className="relative my-8 py-6 px-8 border-l-4 border-primary bg-primary/5 rounded-r-xl animate-fade-in">
                      <Quote className="w-8 h-8 text-primary/30 mb-3" />
                      <blockquote className="text-xl sm:text-2xl font-medium italic text-foreground leading-relaxed">
                        "{pullQuote}"
                      </blockquote>
                    </div>
                  )}

                  {/* REMOVED: mid-content CTA — per missie: niet pushen halverwege het verhaal */}

                  {/* Photo Gallery — adaptive */}
                  {story.photo_urls?.length > 0 && (
                    <div className="animate-fade-in">
                      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-primary" />
                        Foto's van {story.customer_name}
                      </h3>
                      <PhotoGallery photos={story.photo_urls} customerName={story.customer_name} onClickImage={setLightboxImage} />
                    </div>
                  )}

                  {/* Build Updates Timeline */}
                  {story.build_updates?.length > 0 && (
                    <BuildUpdateTimeline updates={story.build_updates} />
                  )}

                  {/* Photo Lightbox */}
                  {lightboxImage && (
                    <div
                      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
                      onClick={() => setLightboxImage(null)}
                    >
                      <img src={lightboxImage} alt="Vergrote foto" className="max-w-full max-h-[90vh] rounded-xl object-contain" />
                    </div>
                  )}

                  {/* Enhanced Quote Section — only show if different from pull quote */}
                  {story.quote && story.quote !== pullQuote && (
                    <div className="relative bg-gradient-to-br from-primary/5 via-accent/5 to-background rounded-2xl p-8 lg:p-12 border border-primary/20 shadow-soft animate-fade-in overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
                      <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl" />
                      <div className="relative">
                        <Quote className="w-16 h-16 text-primary/20 mb-6" />
                        <blockquote className="text-2xl lg:text-3xl font-medium italic mb-8 text-foreground leading-relaxed">
                          "{story.quote}"
                        </blockquote>
                        <QuoteAuthor story={story} />
                      </div>
                    </div>
                  )}

                  {/* If there's no pull quote, always show the main quote */}
                  {story.quote && !pullQuote && (
                    <div className="relative bg-gradient-to-br from-primary/5 via-accent/5 to-background rounded-2xl p-8 lg:p-12 border border-primary/20 shadow-soft animate-fade-in overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
                      <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl" />
                      <div className="relative">
                        <Quote className="w-16 h-16 text-primary/20 mb-6" />
                        <blockquote className="text-2xl lg:text-3xl font-medium italic mb-8 text-foreground leading-relaxed">
                          "{story.quote}"
                        </blockquote>
                        <QuoteAuthor story={story} />
                      </div>
                    </div>
                  )}
                  {/* Contextual Project CTA */}
                  {story.project_name && story.project_slug && (
                    <div className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 rounded-2xl p-8 border border-primary/20 shadow-soft animate-fade-in">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        {story.project_image && (
                          <img
                            src={story.project_image}
                            alt={story.project_name}
                            className="w-20 h-20 rounded-xl object-cover border border-border flex-shrink-0"
                          />
                        )}
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground mb-1">Het project waar {story.customer_name} voor koos</p>
                          <h4 className="text-lg font-bold text-foreground">{story.project_name}</h4>
                          {(story.project_city || story.project_region) && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" />
                              {[story.project_city, story.project_region].filter(Boolean).join(' • ')}
                            </p>
                          )}
                        </div>
                        <Button asChild variant="outline" className="gap-2 flex-shrink-0">
                          <Link to={`/aanbod/${story.project_slug}`}>
                            Bekijk project <ArrowRight className="w-4 h-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <aside className="lg:col-span-4">
                  <div className="lg:sticky lg:top-24 space-y-6">
                    {/* Table of Contents */}
                    {tocItems.length > 0 && (
                      <nav className="bg-card rounded-2xl p-6 border border-border shadow-soft animate-scale-in">
                        <h3 className="font-bold text-sm text-foreground mb-3">Inhoud</h3>
                        <div className="space-y-1">
                          {tocItems.map((item: { id: string; title: string }) => (
                            <button
                              key={item.id}
                              onClick={() => {
                                const el = document.getElementById(item.id);
                                if (el) {
                                  const pos = el.getBoundingClientRect().top + window.pageYOffset - 100;
                                  window.scrollTo({ top: pos, behavior: 'smooth' });
                                }
                              }}
                              className="block w-full text-left text-sm py-1.5 px-2 rounded transition-colors hover:bg-muted hover:text-foreground text-muted-foreground"
                            >
                              {item.title}
                            </button>
                          ))}
                        </div>
                      </nav>
                    )}

                    {/* Customer Profile Card */}
                    <div className="bg-card rounded-2xl p-6 border border-border shadow-soft animate-scale-in">
                      <div className="flex flex-col items-center text-center gap-4 mb-6">
                        <div className="relative w-32 h-32 rounded-xl border-2 border-primary/20 overflow-hidden flex-shrink-0 bg-muted">
                          {story.image_url ? (
                            <img src={story.image_url} alt={story.customer_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-3xl font-bold">
                              {story.customer_name.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg mb-1">{story.customer_name}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 justify-center">
                            <MapPin className="w-3 h-3" />
                            {story.location}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-500 flex-shrink-0" />
                          <span className="text-muted-foreground">Geverifieerd verhaal</span>
                        </div>
                        {story.customer_type && (
                          <div className="flex items-center gap-2">
                            <Badge className={getCustomerTypeBadgeColor(story.customer_type)}>{story.customer_type}</Badge>
                          </div>
                        )}
                        {story.year && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>{story.year}</span>
                          </div>
                        )}
                        <div className="flex gap-1">
                          {Array.from({ length: story.rating }).map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                          ))}
                        </div>
                      </div>

                      {story.property_type && (
                        <div className="pt-4 border-t border-border space-y-2">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Type woning</p>
                          <p className="font-medium">{story.property_type}</p>
                        </div>
                      )}
                      {story.investment_type && (
                        <div className="pt-4 border-t border-border space-y-2 mt-4">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Type investering</p>
                          <p className="font-medium">{story.investment_type}</p>
                        </div>
                      )}
                    </div>

                    {/* Quick CTA Card — the only sidebar CTA */}
                    <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-6 border border-primary/20 animate-scale-in" style={{ animationDelay: '100ms' }}>
                      <h4 className="font-bold text-lg mb-3">Herken jij jezelf hierin?</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Start vandaag je eigen traject naar vastgoed in Spanje
                      </p>
                      <Button asChild className="w-full" size="lg">
                        <Link to="/portaal">Ontdek het Portaal</Link>
                      </Button>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </section>

        {/* Phase teaser for aankoop stories */}
        {story.story_phase && story.story_phase !== 'compleet' && (
          <section className="py-12 bg-gradient-to-r from-amber-50/50 to-primary/5 dark:from-amber-950/20 dark:to-primary/5">
            <div className="max-w-3xl mx-auto px-4 text-center space-y-4">
              <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                Wordt vervolgd
              </Badge>
              <h3 className="text-xl font-semibold text-foreground">
                Dit verhaal wordt aangevuld zodra {story.customer_name} de sleutel ontvangt
              </h3>
              <p className="text-muted-foreground">
                De woning is momenteel in aanbouw. Na oplevering wordt dit klantverhaal verrijkt met de ervaring van de sleuteloverdracht en het eindresultaat.
              </p>
            </div>
          </section>
        )}

        {/* Story Process Timeline */}
        <StoryProcessTimeline />

        {/* CTA Section — the only end-of-page CTA */}
        <CTASection />

        {/* Related Stories */}
        {story.customer_type && (
          <RelatedStories currentSlug={slug!} customerType={story.customer_type} />
        )}

        {/* Testimonials */}
        <StoryTestimonials />
      </main>

      <Footer />
    </div>
  );
};

/** Check if a section has meaningful content */
function hasContent(section: any): boolean {
  if (section.content && section.content.trim().length > 0) return true;
  if (section.metrics && Object.values(section.metrics).some((v: any) => v)) return true;
  return false;
}

/** Reusable hero badges */
function HeroBadges({ story, getColor }: { story: any; getColor: (t: string) => string }) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {story.customer_type && (
        <Badge className={getColor(story.customer_type)}>{story.customer_type}</Badge>
      )}
      {story.story_phase && story.story_phase !== 'compleet' && (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
          Aankoopverhaal
        </Badge>
      )}
      {story.story_phase === 'compleet' && (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
          Compleet verhaal
        </Badge>
      )}
      {story.property_type && <Badge variant="outline">{story.property_type}</Badge>}
      {story.investment_type && <Badge variant="outline">{story.investment_type}</Badge>}
    </div>
  );
}

/** Reusable hero meta (location, year, stars) */
function HeroMeta({ story }: { story: any }) {
  return (
    <div className="flex flex-wrap gap-4 text-muted-foreground">
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4" />
        <span>{story.location}</span>
      </div>
      {story.year && (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span>{story.year}</span>
        </div>
      )}
      <div className="flex gap-1">
        {Array.from({ length: story.rating }).map((_: any, i: number) => (
          <Star key={i} className="w-4 h-4 fill-primary text-primary" />
        ))}
      </div>
    </div>
  );
}

/** Reusable quote author block */
function QuoteAuthor({ story }: { story: any }) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-24 h-24 rounded-xl border-2 border-primary/20 overflow-hidden flex-shrink-0 bg-muted">
        {story.image_url ? (
          <img src={story.image_url} alt={story.customer_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-2xl font-bold">
            {story.customer_name.split(' ').map((n: string) => n[0]).join('')}
          </div>
        )}
      </div>
      <div>
        <p className="font-bold text-lg text-foreground">{story.customer_name}</p>
        <p className="text-muted-foreground">{story.location}</p>
      </div>
    </div>
  );
}

export default KlantverhaalDetail;
