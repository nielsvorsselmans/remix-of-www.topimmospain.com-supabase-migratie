import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectMessage {
  id: string;
  type: 'assistant' | 'user';
  text: string;
  options?: Array<{ value: string; label: string }>;
  inputType?: 'text';
}

interface UseProjectChatProps {
  projectId: string;
  projectName: string;
  projectPrice?: number;
}

const getVisitorId = () => {
  let visitorId = localStorage.getItem('viva_visitor_id');
  if (!visitorId) {
    visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('viva_visitor_id', visitorId);
  }
  return visitorId;
};

export const useProjectChat = ({ projectId, projectName }: UseProjectChatProps) => {
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [currentStep, setCurrentStep] = useState<string>('initial');
  const [isTyping, setIsTyping] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preferences, setPreferences] = useState<any>(null);
  const [isQualified, setIsQualified] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const addMessage = useCallback((text: string, type: 'assistant' | 'user', options?: Array<{ value: string; label: string }>, inputType?: 'text') => {
    const message: ProjectMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      type,
      text,
      options,
      inputType
    };
    setMessages(prev => [...prev, message]);
  }, []);

  const showTyping = useCallback(async (duration = 800) => {
    setIsTyping(true);
    await new Promise(resolve => setTimeout(resolve, duration));
    setIsTyping(false);
  }, []);

  const calculateEngagementBoost = useCallback((engagementData: any): number => {
    if (!engagementData) return 0;
    
    let boost = 0;
    if (engagementData.total_project_views >= 5) boost += 10;
    if (engagementData.total_page_views >= 10) boost += 5;
    if (engagementData.time_on_site_seconds >= 300) boost += 5;
    
    return boost;
  }, []);

  const calculateQualification = useCallback((prefs: any): boolean => {
    if (!prefs) return false;
    
    let score = 0;
    if (prefs.budget_min && prefs.budget_max) score += 25;
    if (prefs.preferred_regions?.length > 0) score += 25;
    if (prefs.investment_goal) score += 25;
    if (prefs.timeline) score += 25;
    
    const engagementBoost = calculateEngagementBoost(prefs.engagement_data);
    
    return (score + engagementBoost) >= 80;
  }, [calculateEngagementBoost]);

  useEffect(() => {
    const fetchPreferences = async () => {
      const visitorId = getVisitorId();
      const storedUserId = localStorage.getItem('viva_user_id');
      
      setIsLoggedIn(!!storedUserId);
      
      try {
        // Read from customer_profiles using visitor_id
        const { data: profile } = await supabase
          .from('customer_profiles')
          .select('explicit_preferences, engagement_data')
          .eq('visitor_id', visitorId)
          .maybeSingle();

        if (profile) {
          // Convert customer_profiles format to legacy format for compatibility
          const explicitPrefs = (profile.explicit_preferences || {}) as any;
          const prefs = {
            ...explicitPrefs,
            engagement_data: profile.engagement_data
          };
          setPreferences(prefs as any);
          setIsQualified(calculateQualification(prefs));
        }
      } catch (error) {
        console.error('Error fetching preferences:', error);
      }
    };
    fetchPreferences();
  }, [calculateQualification]);

  const saveFeedback = useCallback(async (rating: boolean, missingInfo?: string[], additionalComment?: string) => {
    try {
      const visitorId = getVisitorId();
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('project_feedback').insert({
        project_id: projectId,
        visitor_id: visitorId,
        user_id: user?.id || null,
        rating,
        missing_info: missingInfo || null,
        additional_comment: additionalComment || null
      });
    } catch (error) {
      console.error('Error saving project feedback:', error);
    }
  }, [projectId]);

  const startConversation = useCallback(async () => {
    if (isInitialized) return;
    setIsInitialized(true);

    await showTyping();
    
    addMessage(
      `Hoi! Ik help je graag met vragen over ${projectName}. Wat vind je van dit project?`,
      'assistant',
      [
        { value: 'interested', label: '😍 Super interessant!' },
        { value: 'doubt', label: '🤔 Ik twijfel nog' },
        { value: 'not_interested', label: '😕 Niet interessant voor mij' }
      ]
    );
    setCurrentStep('initial_feedback');
  }, [isInitialized, projectName, addMessage, showTyping]);

  const handleResponse = useCallback(async (value: string, inputValue?: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    try {
      const currentMessage = messages.find(m => m.options?.some(o => o.value === value));
      const selectedOption = currentMessage?.options?.find(o => o.value === value);
      
      if (selectedOption) {
        addMessage(selectedOption.label, 'user');
      }

      await showTyping();

    // INITIAL FEEDBACK
    if (currentStep === 'initial_feedback') {
      if (value === 'interested') {
        await saveFeedback(true);
        
        if (isQualified) {
          addMessage(
            "Geweldig! Je hebt je wensen al goed in kaart gebracht. Wil je vrijblijvend een videogesprek van 30 minuten plannen om je vragen te bespreken?",
            'assistant',
            [
              { value: 'schedule_call', label: '📞 Ja, plan een gesprek' },
              { value: 'later', label: '⏳ Misschien later' }
            ]
          );
          setCurrentStep('interested_qualified');
        } else if (isLoggedIn) {
          addMessage(
            "Fijn om te horen! Bewaar dit project en ontdek vergelijkbare projecten in je dashboard.",
            'assistant',
            [
              { value: 'view_similar', label: '👀 Bekijk vergelijkbare projecten' },
              { value: 'done', label: '✅ Bedankt, ik kijk zelf verder' }
            ]
          );
          setCurrentStep('interested_logged_in');
        } else {
          addMessage(
            "Fijn om te horen! Maak een gratis account aan om dit project te bewaren en vergelijkbare projecten te ontdekken.",
            'assistant',
            [
              { value: 'create_account', label: '✨ Gratis account aanmaken' },
              { value: 'browse', label: '👀 Eerst verder kijken' }
            ]
          );
          setCurrentStep('interested_not_qualified');
        }
      } else if (value === 'doubt') {
        addMessage(
          "Begrijpelijk! Wat houdt je nog tegen?",
          'assistant',
          [
            { value: 'doubt_price', label: '💰 Prijs of budget' },
            { value: 'doubt_location', label: '📍 De locatie' },
            { value: 'doubt_type', label: '🏠 Type woning' },
            { value: 'doubt_timing', label: '⏳ Het is nog niet het juiste moment' }
          ]
        );
        setCurrentStep('doubt_reason');
      } else if (value === 'not_interested') {
        addMessage(
          "Geen probleem! Wat miste je bij dit project?",
          'assistant',
          [
            { value: 'reason_price', label: '💰 Prijs te hoog' },
            { value: 'reason_region', label: '📍 Verkeerde regio' },
            { value: 'reason_size', label: '📏 Formaat past niet' },
            { value: 'reason_other', label: '✍️ Iets anders' }
          ]
        );
        setCurrentStep('not_interested_reason');
      }
    }

    // INTERESTED - QUALIFIED
    else if (currentStep === 'interested_qualified') {
      if (value === 'schedule_call') {
        addMessage(
          "Perfect! Scroll naar beneden naar het contactformulier om een afspraak in te plannen. Ik hoor graag van je!",
          'assistant'
        );
        setCurrentStep('completed');
      } else if (value === 'later') {
        addMessage(
          "Geen probleem! Neem gerust contact op wanneer je er klaar voor bent. Succes met je oriëntatie!",
          'assistant'
        );
        setCurrentStep('completed');
      }
    }

    // INTERESTED - NOT QUALIFIED
    else if (currentStep === 'interested_not_qualified') {
      if (value === 'create_account') {
        addMessage(
          "Super! Klik op de knop hieronder om je gratis account aan te maken.",
          'assistant'
        );
        setCurrentStep('trigger_signup');
      } else if (value === 'browse') {
        addMessage(
          "Veel plezier met verder kijken! Je kunt dit project opslaan wanneer je maar wilt door een account aan te maken.",
          'assistant'
        );
        setCurrentStep('completed');
      }
    }

    // INTERESTED - LOGGED IN
    else if (currentStep === 'interested_logged_in') {
      if (value === 'view_similar') {
        addMessage(
          "Bekijk vergelijkbare projecten via de hoofdpagina met filters op prijs en regio. Succes!",
          'assistant'
        );
        setCurrentStep('completed');
      } else if (value === 'done') {
        addMessage(
          "Prima! Veel plezier met verder kijken.",
          'assistant'
        );
        setCurrentStep('completed');
      }
    }

    // DOUBT REASON
    else if (currentStep === 'doubt_reason') {
      await saveFeedback(true, [value]);
      
      if (isQualified) {
        addMessage(
          "Bedankt voor je feedback. Wil je je twijfels bespreken in een vrijblijvend videogesprek? Dan kunnen we samen kijken naar alternatieven.",
          'assistant',
          [
            { value: 'schedule_call', label: '📞 Ja, plan een gesprek' },
            { value: 'no_call', label: '⏳ Nee, bedankt' }
          ]
        );
        setCurrentStep('doubt_qualified');
      } else if (isLoggedIn) {
        addMessage(
          "Bedankt voor je feedback. Bekijk gerust andere projecten die wellicht beter passen.",
          'assistant'
        );
        setCurrentStep('completed');
      } else {
        addMessage(
          "Bedankt voor je feedback. Maak een account aan om projecten te vergelijken die beter passen bij jouw wensen.",
          'assistant',
          [
            { value: 'create_account', label: '✨ Gratis account aanmaken' },
            { value: 'browse', label: '👀 Eerst verder kijken' }
          ]
        );
        setCurrentStep('doubt_not_qualified');
      }
    }

    // DOUBT QUALIFIED
    else if (currentStep === 'doubt_qualified') {
      if (value === 'schedule_call') {
        addMessage(
          "Perfect! Scroll naar beneden naar het contactformulier om een afspraak in te plannen.",
          'assistant'
        );
        setCurrentStep('completed');
      } else if (value === 'no_call') {
        addMessage(
          "Geen probleem! Neem gerust contact op als je vragen hebt. Succes met je zoektocht!",
          'assistant'
        );
        setCurrentStep('completed');
      }
    }

    // DOUBT NOT QUALIFIED
    else if (currentStep === 'doubt_not_qualified') {
      if (value === 'create_account') {
        addMessage(
          "Super! Klik op de knop hieronder om je gratis account aan te maken.",
          'assistant'
        );
        setCurrentStep('trigger_signup');
      } else if (value === 'browse') {
        addMessage(
          "Prima! Veel succes met je zoektocht.",
          'assistant'
        );
        setCurrentStep('completed');
      }
    }

    // NOT INTERESTED REASON
    else if (currentStep === 'not_interested_reason') {
      if (value === 'reason_other') {
        addMessage(
          "Wat miste je precies? Typ je antwoord hieronder.",
          'assistant',
          undefined,
          'text'
        );
        setCurrentStep('not_interested_text_input');
      } else {
        await saveFeedback(false, [value]);
        
        addMessage(
          "Bedankt voor je feedback! Dit helpt ons om betere projecten aan te bieden. Succes met je zoektocht naar de perfecte woning!",
          'assistant'
        );
        setCurrentStep('completed');
      }
    }

    // NOT INTERESTED TEXT INPUT
    else if (currentStep === 'not_interested_text_input') {
      if (inputValue) {
        addMessage(inputValue, 'user');
        
        await saveFeedback(false, ['reason_other'], inputValue);
        
        addMessage(
          "Bedankt voor je feedback! Dit helpt ons om betere projecten aan te bieden. Succes met je zoektocht naar de perfecte woning!",
          'assistant'
        );
        setCurrentStep('completed');
      }
    }
    } finally {
      setIsProcessing(false);
    }
  }, [addMessage, showTyping, saveFeedback, currentStep, messages, isQualified, isLoggedIn, isProcessing]);

  return {
    messages,
    currentStep,
    isTyping,
    isInitialized,
    isProcessing,
    startConversation,
    handleResponse
  };
};
