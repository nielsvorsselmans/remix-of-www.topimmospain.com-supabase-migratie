import { X, Building2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePartner } from '@/contexts/PartnerContext';

const BANNER_DISMISSED_KEY = 'viva_partner_banner_dismissed';

export function PartnerBanner() {
  const { currentPartner } = usePartner();
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem(BANNER_DISMISSED_KEY) === 'true';
  });

  // Auto-dismiss after first pageview: mark as shown so subsequent navigations hide it
  useEffect(() => {
    if (currentPartner && !dismissed) {
      const timer = setTimeout(() => {
        sessionStorage.setItem(BANNER_DISMISSED_KEY, 'true');
        setDismissed(true);
      }, 8000); // Show for 8 seconds then auto-hide
      return () => clearTimeout(timer);
    }
  }, [currentPartner, dismissed]);

  if (!currentPartner || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    sessionStorage.setItem(BANNER_DISMISSED_KEY, 'true');
    setDismissed(true);
  };

  return (
    <div className="fixed top-20 right-4 z-40 animate-fade-in">
      <div className="backdrop-blur-lg bg-card/95 border border-border/50 rounded-2xl shadow-elegant px-4 py-3 flex items-center gap-3 max-w-xs">
        {currentPartner.logo_url ? (
          <img 
            src={currentPartner.logo_url} 
            alt={`${currentPartner.company} logo`} 
            className="h-8 w-8 object-contain rounded-lg flex-shrink-0"
          />
        ) : (
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Via {currentPartner.name}</p>
          <p className="text-sm font-medium truncate">{currentPartner.company}</p>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-muted rounded-full transition-colors flex-shrink-0"
          aria-label="Sluit banner"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
