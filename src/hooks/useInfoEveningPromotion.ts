import { useState, useEffect, useCallback } from 'react';

const EXPIRATION_DATE = new Date('2026-02-07');
const POPUP_KEY = 'viva_info_evening_popup_dismissed';
const POPUP_PERMANENT_KEY = 'viva_info_evening_popup_permanent_dismissed';

export function useInfoEveningPromotion() {
  const [showPopup, setShowPopup] = useState(false);

  const isPromotionActive = new Date() < EXPIRATION_DATE;
  const isPopupPermanentlyDismissed = typeof window !== 'undefined' 
    ? localStorage.getItem(POPUP_PERMANENT_KEY) === 'true' 
    : false;

  useEffect(() => {
    if (!isPromotionActive || isPopupPermanentlyDismissed) return;

    const isPopupDismissed = sessionStorage.getItem(POPUP_KEY) === 'true';

    if (!isPopupDismissed) {
      const timer = setTimeout(() => {
        setShowPopup(true);
      }, 10000); // 10 seconden

      return () => clearTimeout(timer);
    }
  }, [isPromotionActive, isPopupPermanentlyDismissed]);

  const dismissPopup = useCallback((dontShowAgain: boolean = false) => {
    if (dontShowAgain) {
      localStorage.setItem(POPUP_PERMANENT_KEY, 'true');
    } else {
      sessionStorage.setItem(POPUP_KEY, 'true');
    }
    setShowPopup(false);
  }, []);

  return {
    showBanner: isPromotionActive, // Banner altijd zichtbaar als promotie actief
    showPopup,
    dismissPopup,
    isPromotionActive
  };
}
