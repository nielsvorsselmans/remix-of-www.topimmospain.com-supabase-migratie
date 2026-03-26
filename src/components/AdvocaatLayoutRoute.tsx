import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdvocaatSidebar } from "@/components/AdvocaatSidebar";
import { Navbar } from "@/components/Navbar";
import { Loader2 } from "lucide-react";
import { AdvocaatImpersonationBanner } from "@/components/advocaat/AdvocaatImpersonationBanner";
import { useAdvocaat } from "@/contexts/AdvocaatContext";

export function AdvocaatLayoutRoute() {
  const { user, isAdvocaat, isAdmin, loading, rolesLoaded } = useAuth();
  const { isImpersonating } = useAdvocaat();

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

  // Allow admins who are impersonating
  if (!isAdvocaat && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col w-full">
      <Navbar />
      <AdvocaatImpersonationBanner />
      <SidebarProvider>
        <div className="flex flex-1 w-full">
          <AdvocaatSidebar />
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
