import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PartnerSidebar } from "@/components/PartnerSidebar";
import { Navbar } from "@/components/Navbar";
import { PartnerImpersonationBanner } from "@/components/partner/PartnerImpersonationBanner";
import { Loader2 } from "lucide-react";

export function PartnerLayoutRoute() {
  const { user, isPartner, isAdmin, loading, rolesLoaded } = useAuth();

  if (loading || !rolesLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isPartner && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col w-full">
      <Navbar />
      <PartnerImpersonationBanner />
      <SidebarProvider>
        <div className="flex flex-1 w-full">
          <PartnerSidebar />
          <main className="flex-1 overflow-auto">
            <div className="p-4 md:hidden">
              <SidebarTrigger />
            </div>
            <Outlet />
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
}
