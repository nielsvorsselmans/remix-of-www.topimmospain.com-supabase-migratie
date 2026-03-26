import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { AdminSidebar } from "@/components/AdminSidebar";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViewModeSwitcherCompact } from "@/components/admin/ViewModeSwitcher";
function AdminOutlet() {
  return <Outlet />;
}

export function AdminLayoutRoute() {
  const { user, isAdmin, loading, rolesLoaded } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [loading, user, navigate]);

  if (loading || !rolesLoaded) {
    return (
      <div className="min-h-screen flex flex-col w-full bg-background">
        <div className="container mx-auto p-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col w-full bg-background">
        <div className="container mx-auto p-6">
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <AlertCircle className="h-16 w-16 text-destructive" />
            <h1 className="text-2xl font-bold">Geen toegang</h1>
            <p className="text-muted-foreground text-center max-w-md">
              Je hebt geen admin rechten om deze pagina te bekijken.
            </p>
            <Button onClick={() => navigate("/")}>
              Terug naar home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <main className="flex-1 overflow-auto">
          {/* Mobile admin header */}
          <header className="sticky top-0 z-40 h-11 flex items-center justify-between px-4 bg-background/80 backdrop-blur-md border-b border-border/50 md:hidden">
            <SidebarTrigger />
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-foreground">Admin</span>
            </div>
            <ViewModeSwitcherCompact />
          </header>
          {/* Desktop header */}
          <header className="h-14 border-b hidden md:flex items-center px-4 sticky top-0 bg-background z-10">
            <SidebarTrigger />
          </header>
          <div className="p-4 md:p-6 max-w-[1600px]">
            <AdminOutlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
