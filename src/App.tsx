import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { WherebyProvider } from "@whereby.com/browser-sdk/react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { trackPageView, finalizePageView } from "@/lib/tracking";
import { useClarity } from "@/hooks/useClarity";
import { useGoogleAnalytics } from "@/hooks/useGoogleAnalytics";
import { CookieBanner } from "@/components/CookieBanner";
import { UnifiedChatbot } from "@/components/UnifiedChatbot";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import IndexV2 from "./pages/IndexV2";
import Dashboard from "./pages/Dashboard";
import Ontdekken from "./pages/dashboard/Ontdekken";
import MijnSelectie from "./pages/dashboard/MijnSelectie";
import MijnWoning from "./pages/dashboard/MijnWoning";
import Profiel from "./pages/dashboard/Profiel";
import Instellingen from "./pages/dashboard/Instellingen";
import Calculators from "./pages/dashboard/Calculators";
import AankoopkostenCalculator from "./pages/dashboard/AankoopkostenCalculator";
import LeningCalculator from "./pages/dashboard/LeningCalculator";
import Box3Calculator from "./pages/dashboard/Box3Calculator";
import ROICalculator from "./pages/dashboard/ROICalculator";
import HypotheekSimulator from "./pages/dashboard/HypotheekSimulator";
import HypotheekLanding from "./pages/HypotheekLanding";
import Gidsen from "./pages/dashboard/Gidsen";

import PortalProjectDetail from "./pages/dashboard/PortalProjectDetail";
import ExternalListingDetail from "./pages/dashboard/ExternalListingDetail";
import Infoavond from "./pages/dashboard/Infoavond";
import OrientationArticle from "./pages/dashboard/OrientationArticle";
import Aanbod from "./pages/dashboard/Aanbod";
import Bezichtiging from "./pages/dashboard/Bezichtiging";
import Aankoop from "./pages/dashboard/Aankoop";
import SpecificatieAkkoord from "./pages/dashboard/SpecificatieAkkoord";
import Documenten from "./pages/dashboard/Documenten";
import Betalingen from "./pages/dashboard/Betalingen";
import Financiering from "./pages/dashboard/Financiering";
import ContactAankoop from "./pages/dashboard/ContactAankoop";
import Overdracht from "./pages/dashboard/Overdracht";
import Bouwupdates from "./pages/dashboard/Bouwupdates";
import Notaris from "./pages/dashboard/Notaris";
import Verhuur from "./pages/dashboard/Verhuur";
import Onderhoud from "./pages/dashboard/Onderhoud";
import InvesterenInSpanje from "./pages/InvesterenInSpanje";
import StappenPlan from "./pages/StappenPlan";
import OverOns from "./pages/OverOns";
import Klantverhalen from "./pages/Klantverhalen";
import KlantverhaalDetail from "./pages/KlantverhaalDetail";
import Contact from "./pages/Contact";

import Partners from "./pages/Partners";
import PartnerDetail from "./pages/PartnerDetail";
import VeelgesteldeVragen from "./pages/blog/VeelgesteldeVragen";
import Aankoopproces from "./pages/blog/Aankoopproces";
import QuickOnboardingPage from "./pages/QuickOnboardingPage";
import RegioInformatie from "./pages/blog/RegioInformatie";
import FinancieringHypotheek from "./pages/blog/FinancieringHypotheek";
import BlogOverzicht from "./pages/blog/BlogOverzicht";
import BlogPost from "./pages/blog/BlogPost";
import Privacy from "./pages/Privacy";
import AlgemeneVoorwaarden from "./pages/AlgemeneVoorwaarden";
import Cookies from "./pages/Cookies";
import NotFound from "./pages/NotFound";
import Projecten from "./pages/Projecten";
import ProjectDetail from "./pages/ProjectDetail";
import ProjectDetailV2 from "./pages/ProjectDetailV2";
import ProjectLandingPage from "./pages/ProjectLandingPage";
import ProjectTemplateV3 from "./pages/ProjectTemplateV3";
import Gemeenten from "./pages/Gemeenten";
import GemeenteDetail from "./pages/GemeenteDetail";
import ApiDocumentatie from "./pages/ApiDocumentatie";
import Investeerders from "./pages/Investeerders";
import Eigengebruik from "./pages/Eigengebruik";
import Rendement from "./pages/Rendement";
import Auth from "./pages/Auth";
import Portaal from "./pages/Portaal";
import Afspraak from "./pages/Afspraak";
import Meeting from "./pages/Meeting";
import Sitemap from "./pages/Sitemap";
import ExternalListingPublic from "./pages/ExternalListingPublic";
import Box3Rekentools from "./pages/rekentools/Box3Rekentools";
import Infoavonden from "./pages/Infoavonden";
import InfoavondBevestiging from "./pages/InfoavondBevestiging";
import Webinars from "./pages/Webinars";
import WebinarBevestiging from "./pages/WebinarBevestiging";
import DashboardWebinar from "./pages/dashboard/Webinar";
import KoperDataForm from "./pages/KoperDataForm";
import Box3LeadMagnet from "./pages/leadmagnets/Box3LeadMagnet";
import ChatAnalytics from "./pages/admin/ChatAnalytics";
import Projects from "./pages/admin/Projects";
import Properties from "./pages/admin/Properties";
import ProcessDocumentation from "./pages/admin/ProcessDocumentation";
import RedspImportProcess from "./pages/admin/RedspImportProcess";
import AIDescriptionProcess from "./pages/admin/AIDescriptionProcess";
import InvestorPageProcess from "./pages/admin/InvestorPageProcess";
import VerkoopProcesDocumentation from "./pages/admin/VerkoopProcesDocumentation";
import BlogPosts from "./pages/admin/BlogPosts";
import BlogInsights from "./pages/admin/BlogInsights";
import Reviews from "./pages/admin/Reviews";
import ChatbotSettings from "./pages/admin/ChatbotSettings";
import ChatbotInsights from "./pages/admin/ChatbotInsights";
import ChatbotTesting from "./pages/admin/ChatbotTesting";
import SiteManagement from "./pages/admin/SiteManagement";
import CRMLeads from "./pages/admin/CRMLeads";
import Meetings from "./pages/admin/Meetings";
import MeetingsHost from "./pages/admin/MeetingsHost";
import PartnersManagement from "./pages/admin/PartnersManagement";
import PartnerAnalytics from "./pages/admin/PartnerAnalytics";
import TrackingOverview from "./pages/admin/TrackingOverview";
import FAQManagement from "./pages/admin/FAQManagement";
import Klanten from "./pages/admin/Klanten";
import KlantDetail from "./pages/admin/KlantDetail";
import KlantTripDetail from "./pages/admin/KlantTripDetail";
import Videos from "./pages/admin/Videos";
import Verkopen from "./pages/admin/Verkopen";
import VerkoopDetail from "./pages/admin/VerkoopDetail";

import InfoAvonden from "./pages/admin/InfoAvonden";
import AdminWebinars from "./pages/admin/Webinars";
import Financien from "./pages/admin/Financien";
import Taken from "./pages/admin/Taken";
import Aftersales from "./pages/admin/Aftersales";
import TeamManagement from "./pages/admin/TeamManagement";
import OrientationGuideAdmin from "./pages/admin/OrientationGuideAdmin";
import Campagnes from "./pages/admin/Campagnes";

import Kostenindicatie from "./pages/admin/Kostenindicatie";
import ContentEngine from "./pages/admin/ContentEngine";
import ContentEngineBlog from "./pages/admin/ContentEngineBlog";
import ContentEngineLinkedIn from "./pages/admin/ContentEngineLinkedIn";
import ContentEngineCalendar from "./pages/admin/ContentEngineCalendar";
import ContentEnginePipeline from "./pages/admin/ContentEnginePipeline";
import StyleDna from "./pages/admin/StyleDna";
import ExternalListingsAdmin from "./pages/admin/ExternalListings";
import SyncTest from "./pages/admin/SyncTest";
import BezichtigingCompanion from "./pages/admin/BezichtigingCompanion";
import NurtureQueue from "./pages/admin/NurtureQueue";
import ProjectBriefing from "./pages/admin/ProjectBriefing";
import SocialPosts from "./pages/admin/SocialPosts";
import VisualStudio from "./pages/admin/VisualStudio";
import TravelGuide from "./pages/admin/TravelGuide";
import { TravelGuidesListPage } from "@/components/admin/travel-guide/TravelGuidesListPage";
import { TravelGuideBuilderPage } from "@/components/admin/travel-guide/TravelGuideBuilderPage";

import ProjectAnalyse from "./pages/dashboard/ProjectAnalyse";
import PartnerDashboard from "./pages/partner/Dashboard";
import PartnerKlantDetail from "./pages/partner/KlantDetail";
import PartnerKlanten from "./pages/partner/Klanten";
import PartnerProjecten from "./pages/partner/Projecten";
import PartnerProjectDetail from "./pages/partner/ProjectDetail";
import PartnerVerkopen from "./pages/partner/Verkopen";
import PartnerVerkoopDetail from "./pages/partner/VerkoopDetail";
import PartnerAnalyticsPage from "./pages/partner/Analytics";
import PartnerInstellingen from "./pages/partner/Instellingen";
import PartnerCommissies from "./pages/partner/Commissies";
import PartnerContent from "./pages/partner/Content";

import AdvocaatDashboard from "./pages/advocaat/Dashboard";
import AdvocaatVerkopen from "./pages/advocaat/Verkopen";
import AdvocaatDossierDetail from "./pages/advocaat/DossierDetail";

import { AdminLayoutRoute } from "./components/AdminLayoutRoute";
import { DashboardLayoutRoute } from "./components/DashboardLayoutRoute";
import { PartnerLayoutRoute } from "./components/PartnerLayoutRoute";
import { AdvocaatLayoutRoute } from "./components/AdvocaatLayoutRoute";
import { PartnerProvider } from "./contexts/PartnerContext";
import { AdvocaatProvider } from "./contexts/AdvocaatContext";
import { UnifiedChatProvider } from "./contexts/UnifiedChatContext";
import { SyncManagerProvider } from "./contexts/SyncManagerContext";
import { CustomerPreviewProvider } from "./contexts/CustomerPreviewContext";
import { ActiveSaleProvider } from "./contexts/ActiveSaleContext";
import { AdminPhasePreviewProvider } from "./contexts/AdminPhasePreviewContext";
import { PartnerBanner } from "./components/PartnerBanner";
import { usePartnerTracking } from "./hooks/usePartnerTracking";



const TrackingWrapper = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { setTag } = useClarity();
  const { user } = useAuth();
  const previousPathRef = useRef<string | null>(null);
  usePartnerTracking(); // Track partner referrals
  useGoogleAnalytics(); // Track with Google Analytics

  useEffect(() => {
    const trackRoute = async () => {
      // Finalize previous page view BEFORE starting new one - AWAIT IT!
      if (previousPathRef.current !== null && previousPathRef.current !== location.pathname) {
        await finalizePageView();
      }
      
      // Track new page view - only after previous is finalized
      await trackPageView();
      previousPathRef.current = location.pathname;
    };
    
    trackRoute();
    
    // Track page in Clarity with tags
    setTag('page', location.pathname);
  }, [location.pathname, setTag]);

  return (
    <>
      {children}
      {/* Chatbot temporarily disabled - testing in admin section */}
    </>
  );
};

const App = () => (
  <AuthProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <UnifiedChatProvider>
          <PartnerProvider>
            <AdvocaatProvider>
            <SyncManagerProvider>
            <CustomerPreviewProvider>
              <AdminPhasePreviewProvider>
                <ActiveSaleProvider>
                  <TrackingWrapper>
              <PartnerBanner />
              <Routes>
                {/* Publieke routes */}
                <Route path="/" element={<Index />} />
                <Route path="/v2" element={<IndexV2 />} />
                <Route path="/projecten" element={<Projecten />} />
                <Route path="/projecten/gemeenten" element={<Gemeenten />} />
                <Route path="/projecten/gemeente/:city" element={<GemeenteDetail />} />
                <Route path="/project/:id" element={<ProjectDetail />} />
                <Route path="/nieuwbouw-spanje/:slug" element={<ProjectDetail />} />
                <Route path="/project-preview/:id" element={<ProjectDetailV2 />} />
                <Route path="/lp/project/:id" element={<ProjectLandingPage />} />
                <Route path="/project-template-v3/:id" element={<ProjectTemplateV3 />} />
                <Route path="/investeren-in-spanje" element={<InvesterenInSpanje />} />
                <Route path="/6-stappen-plan" element={<StappenPlan />} />
                <Route path="/over-ons" element={<OverOns />} />
                <Route path="/klantverhalen" element={<Klantverhalen />} />
                <Route path="/klantverhalen/:slug" element={<KlantverhaalDetail />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/referenties" element={<Navigate to="/klantverhalen" replace />} />
                <Route path="/partners" element={<Partners />} />
                <Route path="/partners/:slug" element={<PartnerDetail />} />
                <Route path="/blog/veelgestelde-vragen" element={<VeelgesteldeVragen />} />
                <Route path="/blog/aankoopproces" element={<Aankoopproces />} />
                <Route path="/blog/regio-informatie" element={<RegioInformatie />} />
                <Route path="/blog/financiering-hypotheek" element={<FinancieringHypotheek />} />
                <Route path="/blog" element={<BlogOverzicht />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/algemene-voorwaarden" element={<AlgemeneVoorwaarden />} />
                <Route path="/cookies" element={<Cookies />} />
                <Route path="/api-documentatie" element={<ApiDocumentatie />} />
                <Route path="/investeerders" element={<Investeerders />} />
                <Route path="/eigengebruik" element={<Eigengebruik />} />
                <Route path="/rendement" element={<Rendement />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/portaal" element={<Portaal />} />
                <Route path="/onboarding" element={<QuickOnboardingPage />} />
                <Route path="/afspraak" element={<Afspraak />} />
                <Route path="/meeting" element={
                  <WherebyProvider>
                    <Meeting />
                  </WherebyProvider>
                } />
                <Route path="/sitemap.xml" element={<Sitemap />} />
                
                {/* Hypotheek Landing */}
                <Route path="/hypotheek-simulator" element={<HypotheekLanding />} />
                
                {/* Rekentools Routes */}
                <Route path="/rekentools/box3" element={<Box3Rekentools />} />
                
                {/* Lead Magnets */}
                <Route path="/lp/box3-calculator" element={<Box3LeadMagnet />} />
                
                {/* Infoavonden */}
                <Route path="/infoavonden" element={<Infoavonden />} />
                <Route path="/infoavonden/bevestiging" element={<InfoavondBevestiging />} />
                
                {/* Webinars */}
                <Route path="/webinars" element={<Webinars />} />
                <Route path="/webinars/bevestiging" element={<WebinarBevestiging />} />
                
                {/* Public Buyer Data Form */}
                <Route path="/koperdata/:token" element={<KoperDataForm />} />
                
                {/* Public External Listing */}
                <Route path="/extern/:id" element={<ExternalListingPublic />} />

                {/* ============================================ */}
                {/* Dashboard layout groep (nested routes)       */}
                {/* ============================================ */}
                <Route path="/dashboard" element={<DashboardLayoutRoute key="dashboard" />}>
                  <Route index element={<Dashboard />} />
                  <Route path="profiel" element={<Profiel />} />
                  <Route path="instellingen" element={<Instellingen />} />
                  <Route path="ontdekken" element={<Ontdekken />} />
                  <Route path="projecten" element={<MijnSelectie />} />
                  <Route path="mijn-woning" element={<MijnWoning />} />
                  <Route path="calculators" element={<Calculators />} />
                  <Route path="calculators/aankoopkosten" element={<AankoopkostenCalculator />} />
                  <Route path="calculators/lening" element={<LeningCalculator />} />
                  <Route path="calculators/box3" element={<Box3Calculator />} />
                  <Route path="calculators/roi" element={<ROICalculator />} />
                  <Route path="calculators/hypotheek" element={<HypotheekSimulator />} />
                  <Route path="gidsen" element={<Gidsen />} />
                  <Route path="infoavond" element={<Infoavond />} />
                  <Route path="webinar" element={<DashboardWebinar />} />
                  <Route path="orientatie/artikel/:itemId" element={<OrientationArticle />} />
                  
                  {/* Fase 2: Selectie */}
                  <Route path="selectie" element={<Navigate to="/dashboard/projecten" replace />} />
                  <Route path="favorieten" element={<Navigate to="/dashboard/projecten" replace />} />
                  <Route path="aanbod" element={<Aanbod />} />
                  <Route path="project/:id" element={<PortalProjectDetail />} />
                  <Route path="extern/:id" element={<ExternalListingDetail />} />
                  <Route path="bezichtiging" element={<Bezichtiging />} />
                  
                  {/* Fase 4: Aankoop */}
                  <Route path="aankoop" element={<Aankoop />} />
                  <Route path="betalingen" element={<Betalingen />} />
                  <Route path="specificaties" element={<SpecificatieAkkoord />} />
                  <Route path="documenten" element={<Documenten />} />
                  <Route path="financiering" element={<Financiering />} />
                  <Route path="contact-aankoop" element={<ContactAankoop />} />
                  <Route path="bouwupdates" element={<Bouwupdates />} />
                  
                  {/* Fase 5: Overdracht */}
                  <Route path="overdracht" element={<Overdracht />} />
                  <Route path="notaris" element={<Notaris />} />
                  
                  {/* Fase 6: Beheer & Verhuur */}
                  <Route path="verhuur" element={<Verhuur />} />
                  <Route path="onderhoud" element={<Onderhoud />} />
                  
                  {/* Project Analyse */}
                  <Route path="project-analyse" element={<ProjectAnalyse />} />
                </Route>

                {/* ============================================ */}
                {/* Admin layout groep (nested routes)           */}
                {/* ============================================ */}
                <Route path="/admin" element={<AdminLayoutRoute key="admin" />}>
                  <Route index element={<Navigate to="/admin/customers" replace />} />
                  <Route path="chat-analytics" element={<ChatAnalytics />} />
                  
                  <Route path="crm-leads" element={<CRMLeads />} />
                  <Route path="customers" element={<Klanten />} />
                  <Route path="klanten/:id" element={<KlantDetail />} />
                  <Route path="klanten/:id/reis/:tripId" element={<KlantTripDetail />} />
                  <Route path="site-management" element={<SiteManagement />} />
                  <Route path="chatbot-settings" element={<ChatbotSettings />} />
                  <Route path="chatbot-insights" element={<ChatbotInsights />} />
                  <Route path="chatbot-testing" element={<ChatbotTesting />} />
                  <Route path="projects" element={<Projects />} />
                  <Route path="properties" element={<Properties />} />
                  <Route path="blog" element={<BlogPosts />} />
                  <Route path="blog-insights" element={<BlogInsights />} />
                  <Route path="orientation-guide" element={<OrientationGuideAdmin />} />
                  <Route path="kostenindicatie" element={<Kostenindicatie />} />
                  <Route path="reviews" element={<Reviews />} />
                  <Route path="process-documentation" element={<ProcessDocumentation />} />
                  <Route path="process-documentation/verkoop-proces" element={<VerkoopProcesDocumentation />} />
                  <Route path="process-documentation/redsp-import" element={<RedspImportProcess />} />
                  <Route path="process-documentation/ai-description" element={<AIDescriptionProcess />} />
                  <Route path="process-documentation/investor-page" element={<InvestorPageProcess />} />
                  <Route path="meetings" element={<Meetings />} />
                  <Route path="meetings/host" element={
                    <WherebyProvider>
                      <MeetingsHost />
                    </WherebyProvider>
                  } />
                  <Route path="partners" element={<PartnersManagement />} />
                  <Route path="partner-analytics" element={<PartnerAnalytics />} />
                  <Route path="tracking" element={<TrackingOverview />} />
                  <Route path="faq" element={<FAQManagement />} />
                  <Route path="videos" element={<Videos />} />
                  <Route path="verkopen" element={<Verkopen />} />
                  <Route path="verkopen/:id" element={<VerkoopDetail />} />
                  
                  <Route path="financien" element={<Financien />} />
                  <Route path="taken" element={<Taken />} />
                  <Route path="aftersales" element={<Aftersales />} />
                  <Route path="externe-panden" element={<ExternalListingsAdmin />} />
                  <Route path="infoavonden" element={<InfoAvonden />} />
                  <Route path="webinars" element={<AdminWebinars />} />
                  
                  <Route path="social-posts" element={<SocialPosts />} />
                  <Route path="visual-studio" element={<VisualStudio />} />
                  <Route path="team" element={<TeamManagement />} />
                  <Route path="campagnes" element={<Campagnes />} />
                  <Route path="content-engine" element={<ContentEngine />}>
                    <Route path="blog" element={<ContentEngineBlog />} />
                    <Route path="linkedin" element={<ContentEngineLinkedIn />} />
                    <Route path="kalender" element={<ContentEngineCalendar />} />
                    <Route path="pipeline" element={<ContentEnginePipeline />} />
                  </Route>
                  <Route path="style-dna" element={<StyleDna />} />
                  <Route path="project-briefing" element={<ProjectBriefing />} />
                  <Route path="reisgids" element={<TravelGuidesListPage />} />
                  <Route path="reisgids/:id" element={<TravelGuideBuilderPage />} />
                  <Route path="reisgids-pois" element={<TravelGuide />} />
                  <Route path="sync-test" element={<SyncTest />} />
                  <Route path="bezichtiging-companion/:tripId" element={<BezichtigingCompanion />} />
                  <Route path="nurture-queue" element={<NurtureQueue />} />
                </Route>

                {/* ============================================ */}
                {/* Partner layout groep (nested routes)         */}
                {/* ============================================ */}
                <Route path="/partner" element={<PartnerLayoutRoute key="partner" />}>
                  <Route path="dashboard" element={<PartnerDashboard />} />
                  <Route path="klanten" element={<PartnerKlanten />} />
                  <Route path="klant/:id" element={<PartnerKlantDetail />} />
                  <Route path="projecten" element={<PartnerProjecten />} />
                  <Route path="projecten/:id" element={<PartnerProjectDetail />} />
                  <Route path="project/:id" element={<PartnerProjectDetail />} />
                  <Route path="verkopen" element={<PartnerVerkopen />} />
                  <Route path="verkopen/:id" element={<PartnerVerkoopDetail />} />
                  <Route path="analytics" element={<PartnerAnalyticsPage />} />
                  <Route path="commissies" element={<PartnerCommissies />} />
                  <Route path="instellingen" element={<PartnerInstellingen />} />
                  <Route path="content" element={<PartnerContent />} />
                </Route>

                {/* ============================================ */}
                {/* Advocaat layout groep (nested routes)        */}
                {/* ============================================ */}
                <Route path="/advocaat" element={<AdvocaatLayoutRoute key="advocaat" />}>
                  <Route path="dashboard" element={<AdvocaatDashboard />} />
                  <Route path="verkopen" element={<AdvocaatVerkopen />} />
                  <Route path="dossier/:saleId" element={<AdvocaatDossierDetail />} />
                </Route>
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <CookieBanner />
            </TrackingWrapper>
                </ActiveSaleProvider>
              </AdminPhasePreviewProvider>
            </CustomerPreviewProvider>
            </SyncManagerProvider>
            </AdvocaatProvider>
          </PartnerProvider>
        </UnifiedChatProvider>
      </BrowserRouter>
    </TooltipProvider>
  </AuthProvider>
);

export default App;
