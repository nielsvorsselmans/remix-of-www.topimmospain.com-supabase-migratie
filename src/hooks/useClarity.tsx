import { useEffect } from 'react';
import { initClarity, trackClarityEvent, setClarityTag, identifyClarityUser } from '@/lib/clarity';
import { useAuth } from './useAuth';

// Microsoft Clarity Project ID
const CLARITY_PROJECT_ID = 'uaal597yfg';

export const useClarity = () => {
  const { session } = useAuth();

  useEffect(() => {
    // Initialize Clarity on mount
    initClarity(CLARITY_PROJECT_ID);
  }, []);

  useEffect(() => {
    // Identify user when authenticated
    if (session?.user) {
      identifyClarityUser(session.user.id, {
        email: session.user.email,
      });
      setClarityTag('user_status', 'authenticated');
    } else {
      setClarityTag('user_status', 'anonymous');
    }
  }, [session]);

  return {
    trackEvent: trackClarityEvent,
    setTag: setClarityTag,
    identifyUser: identifyClarityUser,
  };
};
