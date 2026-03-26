import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shared back-navigation component for dashboard sub-pages.
 * Provides consistent "Terug naar Ontdekken" link for Gidsen, Webinar, Infoavond pages.
 */
export function DashboardBackToOntdekken() {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
      >
        <Link to="/dashboard/ontdekken">
          <ArrowLeft className="h-4 w-4" />
          <span>Terug naar Ontdekken</span>
        </Link>
      </Button>
    </div>
  );
}
