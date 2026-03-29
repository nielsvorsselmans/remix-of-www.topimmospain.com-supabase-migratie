// Google Analytics 4 tracking library

// Check if we're in preview/development environment
const isPreviewEnvironment = (): boolean => {
  if (typeof window === 'undefined') return true;
  const hostname = window.location.hostname;
  return (
    hostname === 'localhost' ||
    hostname.includes('127.0.0.1')
  );
};

// GA Measurement ID (public, safe to hardcode)
const GA_MEASUREMENT_ID = 'G-9QJT5T36N4';

const getGAMeasurementId = (): string => {
  return GA_MEASUREMENT_ID;
};

// Initialize Google Analytics
export const initGA = () => {
  if (isPreviewEnvironment()) {
    console.log('GA4: Skipping initialization in preview/dev environment');
    return;
  }

  const measurementId = getGAMeasurementId();
  if (!measurementId) {
    console.warn('GA4: No measurement ID found in environment variables');
    return;
  }

  // Check if gtag is already loaded
  if (window.gtag) {
    console.log('GA4: Already initialized');
    return;
  }

  // Load gtag.js script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  // Initialize dataLayer and gtag function
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: false, // We'll send page views manually
  });

  console.log('GA4: Initialized with ID:', measurementId);
};

// Track page view
export const trackPageView = (url: string, title?: string) => {
  if (isPreviewEnvironment() || !window.gtag) return;

  window.gtag('event', 'page_view', {
    page_path: url,
    page_title: title || document.title,
  });
};

// Track custom event
export const trackGAEvent = (
  action: string,
  category?: string,
  label?: string,
  value?: number
) => {
  if (isPreviewEnvironment() || !window.gtag) return;

  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};

// Track conversion event
export const trackConversion = (eventName: string, params?: Record<string, any>) => {
  if (isPreviewEnvironment() || !window.gtag) return;

  window.gtag('event', eventName, params);
};

// Set user ID (for logged-in users)
export const setGAUserId = (userId: string | null) => {
  if (isPreviewEnvironment() || !window.gtag) return;

  const measurementId = getGAMeasurementId();
  if (!measurementId) return;

  window.gtag('config', measurementId, {
    user_id: userId,
  });
};

// Declare gtag types for TypeScript
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}
