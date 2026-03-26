import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";

export type JourneyPhase = 'orientation' | 'research' | 'decision' | 'action';

interface JourneyPhaseResult {
  phase: JourneyPhase;
  confidence: number;
  signals: string[];
}

export const useJourneyPhase = (currentCategory?: string): JourneyPhaseResult => {
  const { user } = useAuth();
  const [result, setResult] = useState<JourneyPhaseResult>({
    phase: 'orientation',
    confidence: 0.5,
    signals: []
  });

  useEffect(() => {
    const detectPhase = () => {
      const signals: string[] = [];
      let score = {
        orientation: 0,
        research: 0,
        decision: 0,
        action: 0
      };

      // Check if user is logged in
      if (user) {
        signals.push('Ingelogde gebruiker');
        score.research += 20;
        score.decision += 10;
      }

      // Check viewed projects from localStorage (for anonymous users)
      const viewedProjectsStr = localStorage.getItem('viewed_projects');
      const viewedProjects = viewedProjectsStr ? JSON.parse(viewedProjectsStr) : [];
      
      if (viewedProjects.length > 10) {
        signals.push(`${viewedProjects.length} projecten bekeken`);
        score.decision += 30;
        score.action += 20;
      } else if (viewedProjects.length > 5) {
        signals.push(`${viewedProjects.length} projecten bekeken`);
        score.research += 30;
        score.decision += 10;
      } else if (viewedProjects.length > 0) {
        signals.push(`${viewedProjects.length} projecten bekeken`);
        score.orientation += 10;
        score.research += 20;
      }

      // Check blog reading history
      const blogHistoryStr = localStorage.getItem('blog_reading_history');
      const blogHistory = blogHistoryStr ? JSON.parse(blogHistoryStr) : [];
      
      if (blogHistory.length > 5) {
        signals.push(`${blogHistory.length} blog artikelen gelezen`);
        score.research += 20;
        score.decision += 10;
      }

      // Category-based signals
      if (currentCategory) {
        const category = currentCategory.toLowerCase();
        
        if (['belastingen', 'juridisch'].includes(category)) {
          signals.push(`Leest ${category} artikel (specifieke vragen)`);
          score.research += 25;
          score.decision += 15;
        } else if (category === 'financiering') {
          signals.push(`Leest ${category} artikel (vergelijkt opties)`);
          score.research += 20;
          score.decision += 10;
        } else if (category === 'verhuur') {
          signals.push(`Leest ${category} artikel (rendement focus)`);
          score.research += 15;
          score.decision += 20;
        }
      }

      // Check time on site (session storage)
      const sessionStartStr = sessionStorage.getItem('session_start');
      if (sessionStartStr) {
        const sessionStart = parseInt(sessionStartStr);
        const minutesOnSite = (Date.now() - sessionStart) / 1000 / 60;
        
        if (minutesOnSite > 20) {
          signals.push(`${Math.round(minutesOnSite)} minuten op site`);
          score.decision += 20;
          score.action += 10;
        } else if (minutesOnSite > 10) {
          signals.push(`${Math.round(minutesOnSite)} minuten op site`);
          score.research += 15;
        }
      } else {
        sessionStorage.setItem('session_start', Date.now().toString());
      }

      // Check if user has started chatbot conversation
      const chatStarted = localStorage.getItem('chat_started');
      if (chatStarted) {
        signals.push('Chatbot gesprek gestart');
        score.research += 15;
        score.decision += 25;
        score.action += 10;
      }

      // Default orientation boost for new visitors
      if (signals.length === 0) {
        score.orientation = 50;
        signals.push('Nieuwe bezoeker');
      }

      // Determine phase based on highest score
      const phases = Object.entries(score) as [JourneyPhase, number][];
      const sorted = phases.sort((a, b) => b[1] - a[1]);
      const topPhase = sorted[0];
      const confidence = topPhase[1] / 100; // Normalize to 0-1

      setResult({
        phase: topPhase[0],
        confidence: Math.min(confidence, 1),
        signals
      });
    };

    detectPhase();
  }, [user, currentCategory]);

  return result;
};
