import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, Users, HelpCircle, ExternalLink } from "lucide-react";
import { trackEvent } from "@/lib/tracking";

interface InfoEveningPopupProps {
  open: boolean;
  onClose: (dontShowAgain?: boolean) => void;
}

export function InfoEveningPopup({ open, onClose }: InfoEveningPopupProps) {
  const location = useLocation();

  useEffect(() => {
    if (open) {
      trackEvent('info_evening_popup_view', { page: location.pathname, time_on_page: 30 });
    }
  }, [open, location.pathname]);

  const handleClick = () => {
    trackEvent('info_evening_popup_click', { page: location.pathname });
    
    const utmParams = new URLSearchParams({
      utm_source: 'viva_portaal',
      utm_medium: 'popup',
      utm_campaign: 'infoavonden_feb2026',
      utm_content: location.pathname
    });
    
    window.location.href = `/infoavonden?${utmParams.toString()}`;
    onClose();
  };

  const handleClose = () => {
    trackEvent('info_evening_popup_dismiss', { page: location.pathname, action: 'close' });
    onClose(false);
  };

  const handleDontShowAgain = () => {
    trackEvent('info_evening_popup_dismiss', { page: location.pathname, action: 'dont_show_again' });
    onClose(true);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <CalendarDays className="h-7 w-7 text-amber-600" />
          </div>
          <DialogTitle className="text-2xl font-bold text-amber-900">
            Gratis Infoavonden in Februari
          </DialogTitle>
          <DialogDescription className="text-amber-800 text-base">
            Ontdek hoe investeren in Spanje werkt
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
              <MapPin className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-sm text-amber-900">
              Leer over het aankoopproces in Spanje
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
              <Users className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-sm text-amber-900">
              Ontdek de beste regio's en projecten
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
              <HelpCircle className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-sm text-amber-900">
              Stel al je vragen aan onze experts
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button 
            onClick={handleClick}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
          >
            Bekijk data en locaties
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            onClick={handleDontShowAgain}
            className="w-full text-amber-700 hover:text-amber-900 hover:bg-amber-100"
          >
            Niet meer tonen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
