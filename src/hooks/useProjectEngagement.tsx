import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { trackEvent } from '@/lib/tracking';

interface EngagementData {
  tab_time: Record<string, number>;
  accordion_opens: string[];
  scroll_depth: number;
  return_visits: number;
  last_visited: string;
}

export const useProjectEngagement = (projectId: string) => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('kosten');
  const tabStartTime = useRef<number>(Date.now());
  
  // Use ref instead of state to prevent re-renders on every data update
  const engagementDataRef = useRef<EngagementData>({
    tab_time: {},
    accordion_opens: [],
    scroll_depth: 0,
    return_visits: 0,
    last_visited: new Date().toISOString(),
  });

  // Track tab changes
  const trackTabChange = (newTab: string) => {
    const timeSpent = Math.floor((Date.now() - tabStartTime.current) / 1000);
    
    engagementDataRef.current = {
      ...engagementDataRef.current,
      tab_time: {
        ...engagementDataRef.current.tab_time,
        [currentTab]: (engagementDataRef.current.tab_time[currentTab] || 0) + timeSpent,
      },
    };

    setCurrentTab(newTab);
    tabStartTime.current = Date.now();
  };

  // Track accordion opens
  const trackAccordionOpen = (accordionId: string) => {
    if (engagementDataRef.current.accordion_opens.includes(accordionId)) return;
    
    engagementDataRef.current = {
      ...engagementDataRef.current,
      accordion_opens: [...engagementDataRef.current.accordion_opens, accordionId],
    };
  };

  // Track scroll depth with throttling (max 1x per 2 seconds)
  useEffect(() => {
    let throttleTimeout: NodeJS.Timeout | null = null;
    
    const handleScroll = () => {
      if (throttleTimeout) return;
      
      throttleTimeout = setTimeout(() => {
        const scrollPercentage = Math.round(
          (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
        );
        engagementDataRef.current = {
          ...engagementDataRef.current,
          scroll_depth: Math.max(engagementDataRef.current.scroll_depth, scrollPercentage),
        };
        throttleTimeout = null;
      }, 2000);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, []);


  // Calculate engagement score
  const getEngagementScore = () => {
    const data = engagementDataRef.current;
    const totalTabTime = Object.values(data.tab_time).reduce((a, b) => a + b, 0);
    const accordionScore = data.accordion_opens.length * 10;
    const scrollScore = data.scroll_depth / 2;
    
    return Math.min(100, totalTabTime + accordionScore + scrollScore);
  };

  return {
    trackTabChange,
    trackAccordionOpen,
    engagementScore: getEngagementScore(),
    engagementData: engagementDataRef.current,
  };
};
