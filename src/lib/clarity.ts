// Microsoft Clarity tracking integration
// Provides heatmaps, session recordings, and click tracking

declare global {
  interface Window {
    clarity: (action: string, ...args: any[]) => void;
  }
}

// Check if running in preview/development environment
function isPreviewEnvironment(): boolean {
  if (typeof window === 'undefined') return true;
  
  const hostname = window.location.hostname;
  
  // Skip tracking for preview/development environments
  const previewDomains = [
    'lovableproject.com',
    'localhost',
    '127.0.0.1',
  ];
  
  return previewDomains.some(domain => hostname.includes(domain));
}

export const initClarity = (projectId: string) => {
  if (typeof window === 'undefined') return;
  
  if (isPreviewEnvironment()) {
    console.log('[Clarity] Skipped initialization - preview environment detected');
    return;
  }
  
  // Check if Clarity is already loaded
  if (window.clarity) {
    console.log('Clarity already initialized');
    return;
  }

  // Inject Clarity script
  (function(c: any, l: any, a: string, r: string, i: string, t?: any, y?: any) {
    c[a] = c[a] || function() {
      (c[a].q = c[a].q || []).push(arguments);
    };
    t = l.createElement(r);
    t.async = 1;
    t.src = "https://www.clarity.ms/tag/" + i;
    y = l.getElementsByTagName(r)[0];
    y.parentNode.insertBefore(t, y);
  })(window, document, "clarity", "script", projectId);
  
  console.log('Clarity initialized with project ID:', projectId);
};

// Track custom events
export const trackClarityEvent = (eventName: string, properties?: Record<string, any>) => {
  if (isPreviewEnvironment()) return;
  
  if (typeof window !== 'undefined' && window.clarity) {
    window.clarity('event', eventName, properties);
  }
};

// Set custom tags for segmentation
export const setClarityTag = (key: string, value: string) => {
  if (typeof window !== 'undefined' && window.clarity) {
    window.clarity('set', key, value);
  }
};

// Identify user (useful for authenticated sessions)
export const identifyClarityUser = (userId: string, userProperties?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.clarity) {
    window.clarity('identify', userId, userProperties);
  }
};

// Upgrade session (marks important sessions)
export const upgradeClaritySession = () => {
  if (typeof window !== 'undefined' && window.clarity) {
    window.clarity('upgrade', 'important_session');
  }
};
