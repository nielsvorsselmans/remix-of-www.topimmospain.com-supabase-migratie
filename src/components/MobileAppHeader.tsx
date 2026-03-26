import { Link, useLocation } from "react-router-dom";
import logo from "@/assets/logo.png";
import { Settings, ChevronLeft } from "lucide-react";
import { PartnerViewSwitcherCompact } from "@/components/partner/PartnerViewSwitcher";

export function MobileAppHeader() {
  const location = useLocation();
  const isProjectDetail = location.pathname.startsWith("/dashboard/project/");

  return (
    <header className="sticky top-0 z-40 h-11 flex items-center justify-between px-4 bg-background/80 backdrop-blur-md border-b border-border/50 safe-area-top md:hidden">
      {isProjectDetail ? (
        <Link to="/dashboard/aanbod" className="flex items-center gap-1 text-foreground">
          <ChevronLeft className="h-5 w-5" />
          <span className="text-sm font-medium">Aanbod</span>
        </Link>
      ) : (
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src={logo} alt="Top Immo Spain" className="h-6 w-6 object-contain" />
          <span className="text-sm font-semibold text-foreground">Top Immo Spain</span>
        </Link>
      )}
      <div className="flex items-center gap-1">
        <PartnerViewSwitcherCompact />
        <Link to="/dashboard/profiel" className="p-1 text-muted-foreground hover:text-foreground transition-colors">
          <Settings className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}
