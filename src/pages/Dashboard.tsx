import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";

import { DashboardWelcomeBack } from "@/components/DashboardWelcomeBack";
import { MapPin } from "lucide-react";
import { JourneyProgressOverview } from "@/components/JourneyProgressOverview";

import { useCustomerProfile } from "@/hooks/useCustomerProfile";
import { useOrientationProgress } from "@/hooks/useOrientationProgress";
import { useUserJourneyPhase } from "@/hooks/useUserJourneyPhase";
import { SelectieWelcomeHeader } from "@/components/SelectieWelcomeHeader";
import { useAssignedProjects } from "@/hooks/useAssignedProjects";
  import { useCustomerPreview } from "@/contexts/CustomerPreviewContext";
  import { useAdminPhasePreview } from "@/contexts/AdminPhasePreviewContext";
import { useCustomerSales } from "@/hooks/useCustomerSales";
import { PurchaseSalesGrid } from "@/components/PurchaseSalesGrid";
import { PurchaseDashboardSummary } from "@/components/PurchaseDashboardSummary";
import { PurchaseWelcomeHeader } from "@/components/PurchaseWelcomeHeader";
import { OnboardingQuestionnaire } from "@/components/onboarding/OnboardingQuestionnaire";
import { isOnboardingComplete } from "@/utils/profileCompleteness";
import { useBezichtigingWelcomeData } from "@/hooks/useBezichtigingWelcomeData";
import { KostenindicatiesCard } from "@/components/dashboard/KostenindicatiesCard";
import { 
  OrientationChecklist, 
  MobileOrientationJourney,
  LarsIntroduction,
  OrientationMeetingCTA,
  OrientationWelcomeCompact,
} from "@/components/orientation";
import { BezichtigingDashboardContent, BezichtigingWelcomeCompact } from "@/components/bezichtiging";
import { BeheerDashboardContent } from "@/components/beheer";
import { SelectieProjectPreview, SelectieHowItWorks, SelectieSidebar } from "@/components/selectie";
import { BudgetNudgeCard } from "@/components/dashboard/BudgetNudgeCard";
import { ProfileCompletenessBanner } from "@/components/dashboard/ProfileCompletenessBanner";

export default function Dashboard() {
  const { profile } = useAuth();
  const isMobile = useIsMobile();
  const { previewCustomer, isPreviewMode } = useCustomerPreview();
  const { isPhasePreviewMode } = useAdminPhasePreview();
  const { data: customerProfile, isLoading: profileLoading } = useCustomerProfile();
  const { phase: journeyPhase, hasSale, isReady: phaseReady } = useUserJourneyPhase();
  const { 
    projects: assignedProjects, 
    suggestedCount, 
    interestedCount, 
    rejectedCount,
    isLoading: projectsLoading 
  } = useAssignedProjects();
  const { data: customerSales, isLoading: salesLoading } = useCustomerSales();
  const orientationData = useOrientationProgress();
  const bezichtigingData = useBezichtigingWelcomeData();
  
  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activePhaseData, setActivePhaseData] = useState<{ phaseKey: string; phaseIndex: number } | null>(null);
  
  const explicitPrefs = customerProfile?.explicit_preferences || null;

  // Phase detection
  const isAankoopFase = journeyPhase === 'aankoop' || hasSale;
  const isOverdrachtFase = journeyPhase === 'overdracht';
  const isBezichtigingFase = journeyPhase === 'bezichtiging';
  const isBeheerFase = journeyPhase === 'beheer';
  const isOrientatieFase = journeyPhase === 'orientatie';
  const isSelectieFase = journeyPhase === 'selectie';

  const isLoading = !phaseReady || profileLoading || (isSelectieFase && projectsLoading) || ((isAankoopFase || isOverdrachtFase) && salesLoading);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Dashboard laden...</p>
        </div>
      </div>
    );
  }

  const totalProjects = assignedProjects.length;
  
  // In preview mode, use preview customer name; otherwise use logged-in user
  const displayFirstName = isPreviewMode 
    ? previewCustomer?.first_name 
    : (profile?.first_name || (isPhasePreviewMode ? "Thomas" : undefined));

  // Render purchase content based on number of sales
  const renderPurchaseContent = () => {
    if (!customerSales || customerSales.length === 0) {
      return null;
    }

    if (customerSales.length === 1) {
      return (
        <PurchaseDashboardSummary 
          saleSummary={customerSales[0]} 
          onActivePhaseChange={(phaseKey, phaseIndex) => setActivePhaseData({ phaseKey, phaseIndex })}
        />
      );
    }

    return <PurchaseSalesGrid sales={customerSales} />;
  };

  // Show onboarding questionnaire fullscreen
  if (showOnboarding) {
    return (
      <div className="py-8">
        <OnboardingQuestionnaire
          explicitPreferences={explicitPrefs}
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
        />
      </div>
    );
  }


  return (
    <>
      <div className="space-y-8">
        {/* Fase-specifieke welkom header */}
        {isAankoopFase ? (
          <PurchaseWelcomeHeader 
            firstName={displayFirstName}
            salesCount={customerSales?.length}
            activePhase={activePhaseData?.phaseKey}
            activePhaseIndex={activePhaseData?.phaseIndex}
          />
        ) : displayFirstName && isSelectieFase ? (
          <SelectieWelcomeHeader
            firstName={displayFirstName}
            suggestedCount={suggestedCount}
            interestedCount={interestedCount}
            rejectedCount={rejectedCount}
            totalProjects={totalProjects}
          />
        ) : displayFirstName && isOrientatieFase ? (
          <OrientationWelcomeCompact
            firstName={displayFirstName}
            completedCount={orientationData.completedCount}
            totalSteps={orientationData.totalSteps}
            progressPercentage={orientationData.progressPercentage}
          />
        ) : displayFirstName && isBezichtigingFase ? (
          <BezichtigingWelcomeCompact
            firstName={displayFirstName}
            daysUntilTrip={bezichtigingData.daysUntilTrip}
            completedTasks={bezichtigingData.completedTasks}
            totalTasks={bezichtigingData.totalTasks}
            hasTrip={bezichtigingData.hasTrip}
          />
        ) : displayFirstName && (
          <DashboardWelcomeBack 
            firstName={displayFirstName} 
            customerProfile={customerProfile}
            onStartOnboarding={() => setShowOnboarding(true)}
          />
        )}

        {/* Journey Progress Overview - hide in orientation, selectie, aankoop & overdracht */}
        {!isOrientatieFase && !isSelectieFase && !isAankoopFase && !isOverdrachtFase && (
          <JourneyProgressOverview />
        )}

        {/* Kostenindicaties - below phase content for non-orientation/selectie */}

        {/* Phase-specific Activities */}
        {isAankoopFase || isOverdrachtFase ? (
          renderPurchaseContent()
        ) : isBeheerFase ? (
          <BeheerDashboardContent />
        ) : isBezichtigingFase ? (
          <BezichtigingDashboardContent />
        ) : isSelectieFase ? (
          <>
            {/* Desktop: two-column layout / Mobile: single column */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Main column */}
              <div className="lg:col-span-2 space-y-4">
                <SelectieProjectPreview />

                {/* Mobile only: social proof + how it works inline */}
                <div className="lg:hidden space-y-3">
                  <div className="p-4 rounded-lg bg-primary/5 border-l-4 border-primary">
                    <p className="text-sm italic text-foreground">
                      "De meeste investeerders kiezen 2 tot 5 projecten om ter plaatse te bezichtigen. Hoe meer je beoordeelt, hoe beter je shortlist."
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">— Op basis van klantdata 2024</p>
                  </div>
                  <SelectieHowItWorks interestedCount={interestedCount} />
                </div>
              </div>

              {/* Desktop sidebar */}
              <aside className="hidden lg:block">
                <div className="sticky top-4">
                  <SelectieSidebar interestedCount={interestedCount} />
                </div>
              </aside>
            </div>

            {/* Mobile only: Lars + Bezichtiging CTA */}
            <div className="lg:hidden space-y-6">
              <div className="border-t border-border/30 pt-6 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Jouw adviseur</p>
                <h3 className="text-base font-semibold text-foreground">
                  Persoonlijk geselecteerd 🎯
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Ik heb deze projecten speciaal voor jou uitgekozen op basis van jouw wensen en budget. Neem rustig de tijd om ze te bekijken — en bel me gerust als je vragen hebt.
                </p>
                <div className="flex gap-2 pt-2">
                  <a
                    href="https://wa.me/32468122903?text=Hallo%20Lars%2C%20ik%20heb%20een%20vraag%20over%20mijn%20projectselectie"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#25D366]/10 px-3 py-2 text-xs font-medium text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
                  >
                    WhatsApp
                  </a>
                  <a
                    href="tel:+32468122903"
                    className="inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
                  >
                    Bel Lars
                  </a>
                </div>
              </div>

              <div className="rounded-xl bg-blue-50/50 border border-blue-100 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  <h3 className="text-base font-semibold text-foreground">Kom het zelf ervaren</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Contacteer ons om te bespreken wanneer een bezichtiging en een reis naar Spanje mogelijk is.
                </p>
                <a
                  href="/dashboard/bezichtiging"
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
                >
                  <MapPin className="h-4 w-4" />
                  Bespreek je bezichtiging
                </a>
              </div>
            </div>
          </>

        ) : isOrientatieFase ? (
          /* Orientation phase - streamlined flow: Checklist first, then Lars */
          <>
            {/* Profile completeness nudge */}
            <ProfileCompletenessBanner 
              explicitPreferences={explicitPrefs}
              onStartOnboarding={() => setShowOnboarding(true)}
            />

            {/* Budget nudge / summary */}
            <BudgetNudgeCard />

            {/* Main action: Checklist - direct na welkom */}
            {isMobile ? (
              <MobileOrientationJourney onStartOnboarding={() => setShowOnboarding(true)} />
            ) : (
              <OrientationChecklist onStartOnboarding={() => setShowOnboarding(true)} />
            )}

            {/* Lars + Meeting CTA */}
            {isMobile ? (
              <div className="border-t border-border/30 pt-6 space-y-4">
                {/* Compact Lars intro on mobile */}
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-foreground">
                    Hallo, ik ben Lars 👋
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Al meer dan 5 jaar help ik Nederlandse investeerders bij hun eerste stappen in Spanje. Geen verkooppraatjes, wel eerlijk advies.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">5+ jaar ervaring</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">250+ klanten</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">Costa Cálida</span>
                  </div>
                </div>
                <OrientationMeetingCTA />
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                <LarsIntroduction />
                <OrientationMeetingCTA />
              </div>
            )}

            {/* Zachte social proof afsluiting */}
            {isMobile && (
              <div className="mt-4 p-4 rounded-lg bg-primary/5 border-l-4 border-primary">
                <p className="text-sm italic text-foreground">
                  "Wist je dat 78% van onze klanten binnen 3 maanden na hun eerste gesprek een woning bezichtigt?"
                </p>
                <p className="text-xs text-muted-foreground mt-1">— Op basis van klantdata 2024</p>
              </div>
            )}
          </>
        ) : (
          /* Fallback for unknown phases */
          <DashboardWelcomeBack 
            firstName={displayFirstName} 
            customerProfile={customerProfile}
            onStartOnboarding={() => setShowOnboarding(true)}
          />
        )}

        {/* Kostenindicaties - verborgen in orientatie, selectie, aankoop & overdracht */}
        {!isOrientatieFase && !isSelectieFase && !isAankoopFase && !isOverdrachtFase && (
          <KostenindicatiesCard />
        )}
      </div>
    </>
  );
}
