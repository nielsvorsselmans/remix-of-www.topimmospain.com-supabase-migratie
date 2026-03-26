import { useEffect } from "react";
import { useNavigate, Outlet } from "react-router-dom";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PortalSidebar } from "@/components/PortalSidebar";
import { Navbar } from "@/components/Navbar";
import { AdminPreviewBanner } from "@/components/dashboard/AdminPreviewBanner";
import { MobileAppHeader } from "@/components/MobileAppHeader";
import { useCustomerPreview } from "@/contexts/CustomerPreviewContext";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { OnboardingPreviewOverlay } from "@/components/admin/OnboardingPreviewOverlay";
import { useAuth } from "@/hooks/useAuth";

function DashboardOutlet() {
  const isMobile = useIsMobile();

  return (
    <div className={isMobile ? "px-4 pt-2 pb-24 overflow-x-hidden" : "container mx-auto p-6"}>
      {!isMobile && <SidebarTrigger className="mb-4" />}
      <Outlet />
    </div>
  );
}

export function DashboardLayoutRoute() {
  const { user, loading } = useAuth();
  const { isPreviewMode } = useCustomerPreview();
  const navigate = useNavigate();
  
  const isMobile = useIsMobile();



  useEffect(() => {
    if (!loading && !user && !isPreviewMode) {
      navigate("/auth?tab=login");
    }
  }, [user, loading, navigate, isPreviewMode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Laden...</p>
        </div>
      </div>
    );
  }

  if (!user && !isPreviewMode) {
    return null;
  }

  return (
    <>
      <OnboardingPreviewOverlay />
      <div className="min-h-screen flex flex-col w-full overflow-x-hidden">
        <AdminPreviewBanner />
        {isMobile ? <MobileAppHeader /> : <Navbar />}
        <SidebarProvider>
          <div className="flex flex-1 w-full min-w-0">
            {!isMobile && <PortalSidebar />}
            <main className="flex-1 min-w-0">
              <DashboardOutlet />
            </main>
          </div>
        </SidebarProvider>
        <MobileBottomNav />
      </div>
    </>
  );
}
