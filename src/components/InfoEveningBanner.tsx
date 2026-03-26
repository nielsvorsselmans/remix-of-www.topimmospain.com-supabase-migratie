import { CalendarDays, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/tracking";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function InfoEveningBanner() {
  const location = useLocation();

  useEffect(() => {
    trackEvent('info_evening_banner_view', { page: location.pathname });
  }, [location.pathname]);

  const handleClick = () => {
    trackEvent('info_evening_banner_click', { page: location.pathname });
    
    const utmParams = new URLSearchParams({
      utm_source: 'viva_portaal',
      utm_medium: 'banner',
      utm_campaign: 'infoavonden_feb2026',
      utm_content: location.pathname
    });
    
    window.location.href = `/infoavonden?${utmParams.toString()}`;
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 py-3 px-4">
      <div className="container max-w-7xl mx-auto flex items-center justify-center gap-3 text-sm">
        <CalendarDays className="h-5 w-5 text-amber-600 flex-shrink-0" />
        <span className="text-amber-900 font-medium">
          Gratis Infoavonden in Februari
        </span>
        <span className="hidden sm:inline text-amber-800">
          — Ontdek hoe investeren in Spanje werkt
        </span>
        <Button
          variant="link"
          size="sm"
          className="text-amber-700 hover:text-amber-900 underline-offset-4 p-0 h-auto font-semibold"
          onClick={handleClick}
        >
          Ontdek de data en locaties
          <ExternalLink className="ml-1 h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
