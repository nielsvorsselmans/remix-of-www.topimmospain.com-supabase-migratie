import { useRef, useCallback } from "react";

interface UseSwipeTabsOptions {
  tabs: string[];
  currentTab: string;
  onTabChange: (tab: string) => void;
  threshold?: number;
}

export function useSwipeTabs({ tabs, currentTab, onTabChange, threshold = 50 }: UseSwipeTabsOptions) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const swiping = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.mapboxgl-map')) {
      touchStartX.current = null;
      return;
    }
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    swiping.current = false;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    // Only swipe if horizontal movement > vertical (prevent scroll hijack)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
      const currentIndex = tabs.indexOf(currentTab);
      if (deltaX < 0 && currentIndex < tabs.length - 1) {
        onTabChange(tabs[currentIndex + 1]);
      } else if (deltaX > 0 && currentIndex > 0) {
        onTabChange(tabs[currentIndex - 1]);
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  }, [tabs, currentTab, onTabChange, threshold]);

  return { onTouchStart, onTouchEnd };
}
