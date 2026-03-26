import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initGA, trackPageView, setGAUserId } from '@/lib/gtag';
import { useAuth } from './useAuth';

/**
 * Hook to initialize and manage Google Analytics tracking
 */
export const useGoogleAnalytics = () => {
  const location = useLocation();
  const { user } = useAuth();

  // Initialize GA on mount
  useEffect(() => {
    initGA();
  }, []);

  // Set user ID when user logs in/out
  useEffect(() => {
    if (user?.id) {
      setGAUserId(user.id);
    } else {
      setGAUserId(null);
    }
  }, [user?.id]);

  // Track page views on route change
  useEffect(() => {
    const path = location.pathname + location.search;
    trackPageView(path);
  }, [location]);

  return {
    // Hook provides tracking functions via the gtag module
    // No need to return anything as tracking is automatic
  };
};
