import { useEffect, useState, useCallback } from 'react';

interface UseExitIntentOptions {
  onExitIntent: () => void;
  enabled?: boolean;
}

export const useExitIntent = ({ onExitIntent, enabled = true }: UseExitIntentOptions) => {
  const [hasTriggered, setHasTriggered] = useState(false);

  const handleMouseLeave = useCallback((e: MouseEvent) => {
    // Only trigger if mouse leaves from top (closing tab/window)
    // and exit intent hasn't been triggered yet
    if (e.clientY < 10 && !hasTriggered && enabled) {
      setHasTriggered(true);
      onExitIntent();
    }
  }, [hasTriggered, enabled, onExitIntent]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [handleMouseLeave, enabled]);

  const resetTrigger = useCallback(() => {
    setHasTriggered(false);
  }, []);

  return { hasTriggered, resetTrigger };
};
