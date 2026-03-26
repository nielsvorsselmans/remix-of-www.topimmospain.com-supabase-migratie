import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { WhyInvestSection } from "@/components/WhyInvestSection";
import { ProcessSection } from "@/components/ProcessSection";
import { FeaturedProjects } from "@/components/FeaturedProjects";
import { RegioSpotlight } from "@/components/RegioSpotlight";
import { ReviewsSection } from "@/components/ReviewsSection";
import { LatestBlogPosts } from "@/components/LatestBlogPosts";
import { CalculatorsSection } from "@/components/CalculatorsSection";
import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";
import { useIsSectionActive } from "@/hooks/useActivePages";
import { useAuth } from "@/hooks/useAuth";
import { useRef } from "react";
import { InfoEveningBanner } from "@/components/InfoEveningBanner";
import { InfoEveningPopup } from "@/components/InfoEveningPopup";
import { useInfoEveningPromotion } from "@/hooks/useInfoEveningPromotion";

const Index = () => {
  const { user } = useAuth();
  const heroRef = useRef<HTMLElement>(null);
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
      {isHeroActive && <Hero ref={heroRef} />}
      {isWhyInvestActive && <WhyInvestSection />}
      {isProcessActive && <ProcessSection />}
      {isRegioSpotlightActive && <RegioSpotlight />}
      {isFeaturedProjectsActive && <FeaturedProjects />}
      {isReviewsActive && <ReviewsSection />}
      {isBlogPostsActive && <LatestBlogPosts />}
      {isCalculatorsActive !== false && <CalculatorsSection />}
      {isCtaActive && <CTASection />}
      <Footer />
      <InfoEveningPopup open={showPopup} onClose={dismissPopup} />
    </div>
  );
};

export default Index;
