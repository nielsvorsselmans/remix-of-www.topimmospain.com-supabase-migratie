import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { WhyInvestSection } from "@/components/WhyInvestSection";
import { PreparationSection } from "@/components/home-v2/PreparationSection";
import { ProcessSection } from "@/components/ProcessSection";
import { CalculatorsSection } from "@/components/CalculatorsSection";
import { RegioSpotlight } from "@/components/RegioSpotlight";
import { FeaturedProjects } from "@/components/FeaturedProjects";
import { ReviewsSection } from "@/components/ReviewsSection";
import { LatestBlogPosts } from "@/components/LatestBlogPosts";
import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";
import { JourneyPathsSection } from "@/components/home-v2/JourneyPathsSection";
import { useIsSectionActive } from "@/hooks/useActivePages";
import { useAuth } from "@/hooks/useAuth";
import { useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InfoEveningBanner } from "@/components/InfoEveningBanner";
import { InfoEveningPopup } from "@/components/InfoEveningPopup";
import { useInfoEveningPromotion } from "@/hooks/useInfoEveningPromotion";
import { LarsIntroSection } from "@/components/home-v2/LarsIntroSection";
import { PortalPreviewSection } from "@/components/home-v2/PortalPreviewSection";
import { SignupDialog } from "@/components/SignupDialog";

const IndexV2 = () => {
  const { user, isAdmin } = useAuth();
  const heroRef = useRef<HTMLElement>(null);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [forceAnonymousView, setForceAnonymousView] = useState(false);
  const effectiveUser = forceAnonymousView ? null : user;
  const { showBanner, showPopup, dismissPopup } = useInfoEveningPromotion();
  const isHeroActive = useIsSectionActive("/", "hero");
  const isWhyInvestActive = useIsSectionActive("/", "why_invest");
  const isProcessActive = useIsSectionActive("/", "process");
  const isRegioSpotlightActive = useIsSectionActive("/", "regio_spotlight");
  const isFeaturedProjectsActive = useIsSectionActive("/", "featured_projects");
  const isReviewsActive = useIsSectionActive("/", "reviews");
  const isBlogPostsActive = useIsSectionActive("/", "blog_posts");
  const isCalculatorsActive = useIsSectionActive("/", "calculators");
  const isCtaActive = useIsSectionActive("/", "cta");

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50">
        {showBanner && <InfoEveningBanner />}
        <Navbar />
      </div>
      {isAdmin && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            size="sm"
            variant={forceAnonymousView ? "default" : "outline"}
            onClick={() => setForceAnonymousView(!forceAnonymousView)}
            className="shadow-lg gap-2"
          >
            {forceAnonymousView ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {forceAnonymousView ? "Bezoekersweergave" : "Ingelogde weergave"}
          </Button>
        </div>
      )}
      {isHeroActive && <Hero ref={heroRef} forceAnonymous={forceAnonymousView} />}
      {!effectiveUser && <JourneyPathsSection />}
      {isWhyInvestActive && <WhyInvestSection />}
      {!effectiveUser && <LarsIntroSection />}
      <PreparationSection />
      {!effectiveUser && <PortalPreviewSection onSignupOpen={() => setIsSignupOpen(true)} />}
      {isReviewsActive && <ReviewsSection />}
      {isProcessActive && <ProcessSection />}
      {isRegioSpotlightActive && <RegioSpotlight />}
      {isFeaturedProjectsActive && <FeaturedProjects />}
      {isCalculatorsActive !== false && <CalculatorsSection />}
      {isBlogPostsActive && <LatestBlogPosts />}
      {isCtaActive && <CTASection />}
      <Footer />
      <InfoEveningPopup open={showPopup} onClose={dismissPopup} />
      {!effectiveUser && <SignupDialog open={isSignupOpen} onOpenChange={setIsSignupOpen} />}
    </div>
  );
};

export default IndexV2;
