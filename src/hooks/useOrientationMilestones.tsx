import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

interface UseOrientationMilestonesProps {
  progressPercentage: number;
  completedCount: number;
}

export function useOrientationMilestones({ 
  progressPercentage, 
  completedCount 
}: UseOrientationMilestonesProps) {
  const lastMilestone = useRef<number>(0);
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Skip on initial load - only celebrate new milestones
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      // Set initial milestone based on current progress
      if (progressPercentage >= 100) {
        lastMilestone.current = 100;
      } else if (progressPercentage >= 50) {
        lastMilestone.current = 50;
      } else if (progressPercentage >= 25) {
        lastMilestone.current = 25;
      }
      return;
    }

    // Check for milestone achievements
    if (progressPercentage >= 100 && lastMilestone.current < 100) {
      // Full completion - big celebration!
      lastMilestone.current = 100;
      celebrateMilestone('complete');
    } else if (progressPercentage >= 50 && lastMilestone.current < 50) {
      // Halfway - medium celebration
      lastMilestone.current = 50;
      celebrateMilestone('halfway');
    } else if (progressPercentage >= 25 && lastMilestone.current < 25) {
      // Quarter way - small celebration
      lastMilestone.current = 25;
      celebrateMilestone('quarter');
    }
  }, [progressPercentage, completedCount]);

  const celebrateMilestone = (type: 'quarter' | 'halfway' | 'complete') => {
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    switch (type) {
      case 'quarter':
        // Small burst
        confetti({
          ...defaults,
          particleCount: 30,
          spread: 50,
          startVelocity: 25,
        });
        break;

      case 'halfway':
        // Medium celebration
        confetti({
          ...defaults,
          particleCount: 60,
          spread: 70,
          startVelocity: 30,
        });
        break;

      case 'complete':
        // Big celebration with multiple bursts
        const duration = 2000;
        const end = Date.now() + duration;

        const frame = () => {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.7 },
            colors: ['#1e5b5b', '#e2725b', '#f5a623'],
            zIndex: 9999,
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.7 },
            colors: ['#1e5b5b', '#e2725b', '#f5a623'],
            zIndex: 9999,
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };

        frame();
        break;
    }
  };

  return {
    triggerCelebration: celebrateMilestone,
  };
}
