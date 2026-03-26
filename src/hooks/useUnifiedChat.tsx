import { useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type PageType = 'homepage' | 'projects' | 'project-detail' | 'blog' | 'blog-post' | 'portaal' | 'generic';

export interface Message {
  id: string;
  type: 'assistant' | 'user';
  text: string;
  timestamp: Date;
  options?: Array<{ value: string; label: string; }>;
  inputType?: 'text' | 'email' | 'password';
  inputPlaceholder?: string;
}

interface ChatData {
  persona?: string;
  region?: string;
  budget?: string;
  investmentGoal?: string;
  timeline?: string;
  intent?: string;
  projectFeedback?: string;
  blogCategory?: string;
  articleHelpful?: string;
  propertyType?: string;
  bedrooms?: string;
  exitIntentProjectId?: string;
  exitIntentProjectName?: string;
  scrollFeedbackProjectId?: string;
  scrollFeedbackProjectName?: string;
  scrollFeedbackMessageIndex?: number;
  scrollFeedbackAnswered?: boolean;
}

const SESSION_STORAGE_KEY = 'viva_unified_chat_state';

const loadChatState = () => {
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        messages: parsed.messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        })),
        currentStep: parsed.currentStep,
        chatData: parsed.chatData,
        isInitialized: parsed.isInitialized,
        pageType: parsed.pageType
      };
    }
  } catch (error) {
    console.error('Error loading chat state:', error);
  }
  return null;
};

const saveChatState = (state: any) => {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving chat state:', error);
  }
};

export const useUnifiedChat = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Use lazy initialization for useState to avoid calling loadChatState during every render
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = loadChatState();
    return saved?.messages || [];
  });
  const [currentStep, setCurrentStep] = useState<string>(() => {
    const saved = loadChatState();
    return saved?.currentStep || 'initial';
  });
  const [isTyping, setIsTyping] = useState(false);
  const [chatData, setChatData] = useState<ChatData>(() => {
    const saved = loadChatState();
    return saved?.chatData || {};
  });
  const [isInitialized, setIsInitialized] = useState(() => {
    const saved = loadChatState();
    return saved?.isInitialized || false;
  });
  const [pageType, setPageType] = useState<PageType>(() => {
    const saved = loadChatState();
    return saved?.pageType || 'homepage';
  });
  const [qualificationProgress, setQualificationProgress] = useState(0);

  const visitorId = (() => {
    const storageKey = 'viva_visitor_id';
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(stored)) {
        return stored;
      }
    }
    
    const newId = crypto.randomUUID();
    localStorage.setItem(storageKey, newId);
    return newId;
  })();

  // Detect page type from location
  const getPageType = useCallback((pathname: string): PageType => {
    if (pathname === '/') return 'homepage';
    if (pathname === '/portaal') return 'portaal';
    if (pathname === '/projecten') return 'projects';
    if (pathname.startsWith('/project/')) return 'project-detail';
    if (pathname === '/blog' || pathname.match(/^\/blog\/(aankoopproces|financiering|regio-informatie|veelgestelde-vragen)$/)) return 'blog';
    if (pathname.startsWith('/blog/')) return 'blog-post';
    return 'generic';
  }, []);

  // Update page type when location changes
  useEffect(() => {
    const newPageType = getPageType(location.pathname);
    setPageType(newPageType);

    // If initial flow is completed and we're on a new page, offer context-specific follow-up
    if (currentStep === 'completed' && newPageType !== pageType && messages.length > 0) {
      offerContextFollowup(newPageType);
    }
  }, [location.pathname]);

  // Clean up unanswered scroll feedback when navigating to different project
  useEffect(() => {
    const currentPageType = getPageType(location.pathname);
    const isProjectDetailPage = currentPageType === 'project-detail';
    
    if (!isProjectDetailPage) return;
    
    // Extract current project ID from URL
    const projectIdMatch = location.pathname.match(/\/project\/([^/]+)/);
    const currentProjectId = projectIdMatch ? projectIdMatch[1] : null;
    
    if (!currentProjectId) return;
    
    const previousProjectId = chatData?.scrollFeedbackProjectId;
    const wasAnswered = chatData?.scrollFeedbackAnswered;
    const messageIndex = chatData?.scrollFeedbackMessageIndex;
    
    // If navigating to a DIFFERENT project
    if (previousProjectId && previousProjectId !== currentProjectId) {
      // If previous scroll feedback was NOT answered, remove it from messages
      if (!wasAnswered && messageIndex !== undefined) {
        setMessages(prev => prev.filter((_, index) => index !== messageIndex));
      }
      
      // Reset scroll feedback state for new project
      setChatData(prev => ({
        ...prev,
        scrollFeedbackProjectId: null,
        scrollFeedbackAnswered: false,
        scrollFeedbackMessageIndex: undefined
      }));
    }
  }, [location.pathname, chatData]);

  const showMessage = useCallback(async (text: string, options?: Array<{ value: string; label: string }>, skipTyping = false) => {
    if (!skipTyping) {
      setIsTyping(true);
      await new Promise(resolve => setTimeout(resolve, 800));
    }
    
    const message: Message = {
      id: crypto.randomUUID(),
      type: 'assistant',
      text,
      timestamp: new Date(),
      options
    };
    
    setMessages(prev => [...prev, message]);
    setIsTyping(false);
  }, []);

  const addUserMessage = useCallback(async (text: string) => {
    const message: Message = {
      id: crypto.randomUUID(),
      type: 'user',
      text,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, message]);
  }, []);

  const calculateQualificationProgress = useCallback((data: ChatData): number => {
    let completed = 0;
    const total = 4; // budget, region, investmentGoal, timeline

    if (data.budget && data.budget !== 'weet-niet') completed++;
    if (data.region && data.region !== 'geen-voorkeur') completed++;
    if (data.investmentGoal) completed++;
    if (data.timeline) completed++;

    return Math.round((completed / total) * 100);
  }, []);

  const saveToPreferences = useCallback(async (data: Partial<ChatData>) => {
    if (!visitorId) return;

    try {
      const storedUserId = localStorage.getItem('viva_user_id');
      
      // Get existing explicit_preferences
      const { data: existingProfile } = await supabase
        .from('customer_profiles')
        .select('explicit_preferences')
        .eq('visitor_id', visitorId)
        .maybeSingle();

      const currentPreferences = (existingProfile?.explicit_preferences || {}) as any;
      const updates: any = { ...currentPreferences };

      if (data.region && data.region !== 'geen-voorkeur') {
        updates.preferred_regions = [data.region];
      }

      if (data.budget && data.budget !== 'weet-niet') {
        const budgetMap: Record<string, [number, number]> = {
          '150-250': [150000, 250000],
          '250-400': [250000, 400000],
          '400+': [400000, 999999],
        };
        const [min, max] = budgetMap[data.budget] || [null, null];
        if (min) updates.budget_min = min;
        if (max) updates.budget_max = max;
      }

      if (data.investmentGoal) {
        updates.investment_goal = data.investmentGoal;
      }

      if (data.timeline) {
        updates.timeline = data.timeline;
      }

      // Calculate and store qualification progress
      const progress = calculateQualificationProgress(data as ChatData);
      setQualificationProgress(progress);

      // Unified write to customer_profiles
      await supabase
        .from('customer_profiles')
        .upsert({
          visitor_id: visitorId,
          user_id: storedUserId || null,
          explicit_preferences: updates,
          data_completeness_score: progress,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'visitor_id'
        });

    } catch (error) {
      console.error('Error saving to preferences:', error);
    }
  }, [visitorId, location.pathname, calculateQualificationProgress]);

  const routeToDestination = useCallback(async (data: ChatData) => {
    await saveToPreferences(data);

    if (data.intent === 'aanbod') {
      const params = new URLSearchParams();
      
      if (data.budget === '150-250') {
        params.set('minPrice', '150000');
        params.set('maxPrice', '250000');
      } else if (data.budget === '250-400') {
        params.set('minPrice', '250000');
        params.set('maxPrice', '400000');
      } else if (data.budget === '400+') {
        params.set('minPrice', '400000');
      }

      if (data.region && data.region !== 'geen-voorkeur') {
        params.set('region', data.region);
      }

      navigate(`/projecten?${params.toString()}`);
    } else if (data.intent === 'leren') {
      if (data.persona === 'rendement') {
        navigate('/blog?category=verhuur');
      } else if (data.persona === 'genieten') {
        navigate('/blog?category=aankoopproces');
      } else {
        navigate('/blog');
      }
    } else if (data.intent === 'verhalen') {
      if (data.persona === 'rendement') {
        navigate('/klantverhalen?type=rendement');
      } else if (data.persona === 'genieten') {
        navigate('/klantverhalen?type=eigengebruik');
      } else {
        navigate('/klantverhalen');
      }
    } else if (data.intent === 'proces') {
      navigate('/stappenplan');
    }
  }, [navigate, saveToPreferences]);

  // Context-specific follow-up questions
  const offerContextFollowup = useCallback(async (type: PageType) => {
    if (type === 'projects') {
      await showMessage(
        "Wil je de filters nog verder verfijnen?",
        [
          { value: 'yes-refine', label: '✅ Ja graag' },
          { value: 'no-refine', label: '❌ Nee, ik kijk zelf verder' },
        ]
      );
      setCurrentStep('ask_refine_filters');
    } else if (type === 'project-detail') {
      await showMessage(
        "Wat vind je van dit project?",
        [
          { value: 'interesting', label: '😍 Interessant!' },
          { value: 'doubting', label: '🤔 Te beoordelen' },
          { value: 'not-matching', label: '❌ Niet wat ik zoek' },
        ]
      );
      setCurrentStep('ask_project_feedback');
    } else if (type === 'blog') {
      await showMessage(
        "Zoek je specifieke informatie?",
        [
          { value: 'financiering', label: '💰 Financiering & Hypotheek' },
          { value: 'belastingen', label: '💶 Kosten & Belastingen' },
          { value: 'verhuur', label: '📈 Verhuur & Rendement' },
          { value: 'no-filter', label: '👀 Ik kijk zelf rond' },
        ]
      );
      setCurrentStep('ask_blog_category');
    } else if (type === 'blog-post') {
      await showMessage(
        "Was dit artikel nuttig?",
        [
          { value: 'very-helpful', label: '⭐ Ja, zeer!' },
          { value: 'somewhat', label: '👍 Deels' },
          { value: 'not-helpful', label: '👎 Niet echt' },
        ]
      );
      setCurrentStep('ask_article_helpful');
    }
  }, [showMessage]);

  const startConversation = useCallback(async () => {
    if (isInitialized) return;
    
    await showMessage(
      "Hoi! 👋 Leuk dat je hier bent. Ik help je graag verder. Wat brengt jou hier?",
      [
        { value: 'rendement', label: '💰 Ik zoek rendement' },
        { value: 'genieten', label: '☀️ Ik wil ook zelf genieten' },
        { value: 'orienteren', label: '🧭 Ik wil eerst oriënteren' },
      ],
      true
    );
    setCurrentStep('ask_persona');
    setIsInitialized(true);
  }, [isInitialized, showMessage]);

  // Main flow handlers
  const handlePersona = useCallback(async (persona: string) => {
    const labels = {
      'rendement': '💰 Ik zoek rendement',
      'genieten': '☀️ Ik wil ook zelf genieten',
      'orienteren': '🧭 Ik wil eerst oriënteren',
    };
    
    await addUserMessage(labels[persona as keyof typeof labels]);
    setChatData(prev => ({ ...prev, persona }));

    await showMessage(
      "Perfect! En heb je al een voorkeur voor een bepaalde regio?",
      [
        { value: 'costa-calida', label: 'Costa Cálida' },
        { value: 'costa-blanca-zuid', label: 'Costa Blanca Zuid' },
        { value: 'geen-voorkeur', label: 'Nog geen voorkeur' },
      ]
    );
    setCurrentStep('ask_region');
  }, [addUserMessage, showMessage]);

  const handleRegion = useCallback(async (region: string) => {
    const labels = {
      'costa-calida': 'Costa Cálida',
      'costa-blanca-zuid': 'Costa Blanca Zuid',
      'geen-voorkeur': 'Nog geen voorkeur',
    };
    
    await addUserMessage(labels[region as keyof typeof labels]);
    setChatData(prev => ({ ...prev, region }));

    await showMessage(
      "Mooi! En in welke prijsklasse ben je ongeveer aan het rondkijken?",
      [
        { value: '150-250', label: '€150k - €250k' },
        { value: '250-400', label: '€250k - €400k' },
        { value: '400+', label: 'Boven €400k' },
        { value: 'weet-niet', label: 'Weet ik nog niet' },
      ]
    );
    setCurrentStep('ask_budget');
  }, [addUserMessage, showMessage]);

  const handleBudget = useCallback(async (budget: string) => {
    const labels = {
      '150-250': '€150k - €250k',
      '250-400': '€250k - €400k',
      '400+': 'Boven €400k',
      'weet-niet': 'Weet ik nog niet',
    };
    
    await addUserMessage(labels[budget as keyof typeof labels]);
    setChatData(prev => ({ ...prev, budget }));

    await showMessage(
      "Wat is je belangrijkste doel met deze investering?",
      [
        { value: 'rendement', label: '💰 Puur rendement (verhuur)' },
        { value: 'combinatie', label: '☀️ Eigen gebruik + verhuur' },
        { value: 'eigen-gebruik', label: '🏠 Volledig eigen gebruik' },
        { value: 'vermogensgroei', label: '📈 Vermogensgroei (waardestijging)' },
      ]
    );
    setCurrentStep('ask_investment_goal');
  }, [addUserMessage, showMessage]);

  const handleInvestmentGoal = useCallback(async (goal: string) => {
    const labels = {
      'rendement': '💰 Puur rendement (verhuur)',
      'combinatie': '☀️ Eigen gebruik + verhuur',
      'eigen-gebruik': '🏠 Volledig eigen gebruik',
      'vermogensgroei': '📈 Vermogensgroei (waardestijging)',
    };
    
    await addUserMessage(labels[goal as keyof typeof labels]);
    setChatData(prev => ({ ...prev, investmentGoal: goal }));

    await showMessage(
      "En wanneer zou je het liefst deze stap zetten?",
      [
        { value: 'binnen-3-maanden', label: '⚡ Binnen 3 maanden' },
        { value: '3-6-maanden', label: '📅  3-6 maanden' },
        { value: '6-12-maanden', label: '🗓️ 6-12 maanden' },
        { value: 'geen-concrete-plannen', label: '🔮 Nog geen concrete plannen' },
      ]
    );
    setCurrentStep('ask_timeline');
  }, [addUserMessage, showMessage]);

  const generateSummary = useCallback((data: ChatData): string => {
    // Investment goal label
    const goalLabels: Record<string, string> = {
      'rendement': 'puur rendement via verhuur',
      'combinatie': 'een combinatie van eigen gebruik en verhuur',
      'eigen-gebruik': 'een plek om zelf van te genieten',
      'vermogensgroei': 'vermogensgroei via waardestijging',
    };
    
    // Region label
    const regionLabels: Record<string, string> = {
      'costa-calida': 'Costa Cálida',
      'costa-blanca-zuid': 'Costa Blanca Zuid',
      'costa-blanca-noord': 'Costa Blanca Noord',
      'andere': 'een andere regio',
      'geen-voorkeur': 'Spanje',
    };
    
    // Budget label  
    const budgetLabels: Record<string, string> = {
      '150-250': '€150.000 - €250.000',
      '250-400': '€250.000 - €400.000',
      '400+': 'meer dan €400.000',
      'weet-niet': 'een nog te bepalen budget',
    };
    
    // Timeline label
    const timelineLabels: Record<string, string> = {
      'binnen-3-maanden': 'binnen 3 maanden',
      '3-6-maanden': 'over 3 tot 6 maanden',
      '6-12-maanden': 'over 6 tot 12 maanden',
      'geen-concrete-plannen': 'wanneer het juiste moment daar is',
    };

    const goal = goalLabels[data.investmentGoal || ''] || 'een investering';
    const region = regionLabels[data.region || ''] || 'Spanje';
    const budget = budgetLabels[data.budget || ''] || 'een flexibel budget';
    const timeline = timelineLabels[data.timeline || ''] || 'op jouw tempo';

    return `Bedankt voor je antwoorden! Je zoekt ${goal} aan de ${region} met een budget van ${budget}, en je wilt dit ${timeline} realiseren.\n\nDit zijn mijn aanbevelingen voor jou:`;
  }, []);

  const handleTimeline = useCallback(async (timeline: string) => {
    const labels = {
      'binnen-3-maanden': '⚡ Binnen 3 maanden',
      '3-6-maanden': '📅 3-6 maanden',
      '6-12-maanden': '🗓️ 6-12 maanden',
      'geen-concrete-plannen': '🔮 Nog geen concrete plannen',
    };
    
    await addUserMessage(labels[timeline as keyof typeof labels]);
    const updatedData = { ...chatData, timeline };
    setChatData(updatedData);

    // Calculate and save qualification progress
    await saveToPreferences(updatedData);

    // Generate personalized summary
    const summary = generateSummary(updatedData);
    
    await showMessage(
      summary,
      [
        { value: 'projects', label: '🏘️ Bekijk passende projecten' },
        { value: 'blog', label: '📚 Lees meer in onze kennisbank' },
        { value: 'portal', label: '✨ Open het oriëntatie portaal' },
      ]
    );
    setCurrentStep('show_recommendations');
  }, [addUserMessage, showMessage, chatData, saveToPreferences, generateSummary]);

  const handleRecommendationChoice = useCallback(async (choice: string) => {
    const labels: Record<string, string> = {
      'projects': '🏘️ Bekijk passende projecten',
      'blog': '📚 Lees meer in onze kennisbank',
      'portal': '✨ Open het oriëntatie portaal',
    };
    
    await addUserMessage(labels[choice] || choice);
    
    // Build URL parameters for pre-filtering
    const buildProjectsUrl = () => {
      const params = new URLSearchParams();
      
      // Budget mapping
      if (chatData.budget === '150-250') {
        params.set('minPrice', '150000');
        params.set('maxPrice', '250000');
      } else if (chatData.budget === '250-400') {
        params.set('minPrice', '250000');
        params.set('maxPrice', '400000');
      } else if (chatData.budget === '400+') {
        params.set('minPrice', '400000');
      }
      
      // Region mapping
      if (chatData.region && chatData.region !== 'andere' && chatData.region !== 'geen-voorkeur') {
        params.set('region', chatData.region);
      }
      
      return `/projecten${params.toString() ? '?' + params.toString() : ''}`;
    };
    
    // Blog category mapping based on investment goal
    const buildBlogUrl = () => {
      const categoryMap: Record<string, string> = {
        'rendement': 'verhuur',
        'combinatie': 'financiering',
        'eigen-gebruik': 'regio-informatie',
        'vermogensgroei': 'financiering',
      };
      const category = categoryMap[chatData.investmentGoal || ''];
      return category ? `/blog?category=${category}` : '/blog';
    };

    const destinations: Record<string, string> = {
      'projects': buildProjectsUrl(),
      'blog': buildBlogUrl(),
      'portal': '/portaal',
    };

    const destination = destinations[choice] || '/projecten';
    
    await showMessage(
      "Prima keuze! Ik stuur je door... ✨",
      undefined,
      false
    );

    setTimeout(() => {
      navigate(destination);
    }, 1200);

    setCurrentStep('completed');
  }, [chatData, addUserMessage, showMessage, navigate]);

  // Context-specific follow-up handlers
  const handleFollowupResponse = useCallback(async (value: string) => {
    await addUserMessage(value);
    
    const updatedData = { ...chatData, [currentStep.replace('ask_', '')]: value };
    setChatData(updatedData);
    await saveToPreferences(updatedData);

    if (currentStep === 'ask_project_feedback') {
      if (value === 'interesting') {
        await showMessage("Fantastisch! Je kunt meer info vinden in de tabs hieronder, of direct contact opnemen via de knop rechts.");
      } else if (value === 'not-matching') {
        await showMessage("Geen probleem! Ik kan je helpen andere projecten te vinden die beter passen.");
      } else {
        await showMessage("Begrijpelijk! Neem gerust de tijd om alle info door te nemen.");
      }
    } else if (currentStep === 'ask_blog_category') {
      if (value !== 'no-filter') {
        navigate(`/blog?category=${value}`);
      }
    } else if (currentStep === 'ask_article_helpful') {
      await showMessage("Bedankt voor je feedback! Dit helpt ons om betere content te maken.");
    }
  }, [chatData, currentStep, addUserMessage, showMessage, saveToPreferences, navigate]);

  const resetChat = useCallback(() => {
    setMessages([]);
    setCurrentStep('initial');
    setChatData({});
    setIsInitialized(false);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }, []);

  // Exit Intent Flow Handler
  const triggerExitIntentFlow = useCallback(async (projectId: string, projectName: string) => {
    // Store project context
    setChatData(prev => ({ ...prev, exitIntentProjectId: projectId, exitIntentProjectName: projectName }));
    
    // Start exit intent conversation
    await showMessage(
      `Wacht even! 👋\n\nIk zie dat je ${projectName} hebt bekeken. Heb je alle informatie gevonden die je zocht?`,
      [
        { value: 'exit_yes', label: '✅ Ja, ik kom later terug' },
        { value: 'exit_no', label: '❌ Nee, ik mis nog iets' }
      ]
    );
    setCurrentStep('exit_intent_rating');
  }, [showMessage]);

  // Scroll-triggered feedback flow
  const triggerScrollFeedbackFlow = useCallback(async (projectId: string, projectName: string) => {
    // Don't trigger if already showing scroll feedback for this project
    if (chatData?.scrollFeedbackProjectId === projectId) {
      return;
    }
    
    // Store project context and message index
    setChatData(prev => ({ 
      ...prev, 
      scrollFeedbackProjectId: projectId, 
      scrollFeedbackProjectName: projectName,
      scrollFeedbackMessageIndex: messages.length,
      scrollFeedbackAnswered: false
    }));
    
    // Start scroll feedback conversation with simple question
    await showMessage(
      `Wat vind je van ${projectName}? 🏠`,
      [
        { value: 'scroll_interested', label: '👍 Dit project spreekt me aan' },
        { value: 'scroll_not_interested', label: '👎 Dit is niet wat ik zoek' }
      ]
    );
    setCurrentStep('scroll_feedback_rating');
  }, [showMessage, messages.length, chatData]);

  // Handle exit intent responses
  const handleExitIntentResponse = useCallback(async (value: string) => {
    const projectId = chatData.exitIntentProjectId;
    const projectName = chatData.exitIntentProjectName;

    if (currentStep === 'exit_intent_rating') {
      if (value === 'exit_yes') {
        await addUserMessage('✅ Ja, ik kom later terug');
        await showMessage(
          "Fijn! Wil je dit project bewaren zodat je het later makkelijk terugvindt? 💾",
          [
            { value: 'save_project', label: '💾 Ja, bewaar dit project' },
            { value: 'no_thanks', label: '❌ Nee bedankt' }
          ]
        );
        setCurrentStep('exit_intent_save');
      } else if (value === 'exit_no') {
        await addUserMessage('❌ Nee, ik mis nog iets');
        await showMessage(
          "Wat miste je nog? Kies gerust meerdere opties! 👇",
          [
            { value: 'missing_kosten', label: '💰 Kosten & Belastingen' },
            { value: 'missing_verhuur', label: '🏖️ Verhuurpotentie' },
            { value: 'missing_locatie', label: '📍 Locatie informatie' },
            { value: 'missing_financiering', label: '🏦 Financieringsopties' },
            { value: 'missing_andere', label: '❓ Iets anders' }
          ]
        );
        setCurrentStep('exit_intent_missing');
      }
    } else if (currentStep === 'exit_intent_save') {
      await addUserMessage(value === 'save_project' ? '💾 Ja, bewaar dit project' : '❌ Nee bedankt');
      
      if (value === 'save_project') {
        navigate('/auth');
      }
      
      await showMessage("Bedankt! Je kunt altijd terugkomen. Tot snel! 👋");
      setCurrentStep('completed');
    } else if (currentStep === 'exit_intent_missing') {
      const missingLabels: Record<string, string> = {
        'missing_kosten': '💰 Kosten & Belastingen',
        'missing_verhuur': '🏖️ Verhuurpotentie',
        'missing_locatie': '📍 Locatie informatie',
        'missing_financiering': '🏦 Financieringsopties',
        'missing_andere': '❓ Iets anders'
      };
      
      await addUserMessage(missingLabels[value] || value);
      
      // Store feedback
      const missingInfo = value.replace('missing_', '');
      try {
        await supabase.from('project_feedback').insert({
          project_id: projectId,
          user_id: user?.id || null,
          visitor_id: !user ? visitorId : null,
          rating: false,
          missing_info: [missingInfo],
          additional_comment: `Exit intent feedback - missing: ${missingInfo}`
        });
      } catch (error) {
        console.error('Error saving exit intent feedback:', error);
      }

      // Provide personalized actions based on missing info
      const actionMap: Record<string, { text: string; link: string }> = {
        'kosten': { 
          text: '📖 Lees meer over aankoopkosten in Spanje', 
          link: '/blog/aankoopproces-spanje' 
        },
        'verhuur': { 
          text: '📊 Ontdek hoe verhuur werkt', 
          link: '/rendement' 
        },
        'locatie': { 
          text: '🗺️ Bekijk gemeente informatie', 
          link: '/projecten/gemeenten' 
        },
        'financiering': { 
          text: '💳 Lees over hypotheekmogelijkheden', 
          link: '/blog/financiering-hypotheek' 
        },
        'andere': { 
          text: '💬 Plan een gesprek met ons team', 
          link: '/contact' 
        }
      };

      const action = actionMap[missingInfo] || actionMap['andere'];
      
      await showMessage(
        `Bedankt voor je feedback! 🙏\n\nDit helpt ons om onze informatie te verbeteren.\n\nKan ik je verder helpen?`,
        [
          { value: 'action_' + missingInfo, label: action.text },
          { value: 'exit_portal', label: '✨ Open het oriëntatie portaal' },
          { value: 'no_thanks', label: '❌ Nee bedankt' }
        ]
      );
      setCurrentStep('exit_intent_actions');
    } else if (currentStep === 'exit_intent_actions') {
      if (value.startsWith('action_')) {
        const missingInfo = value.replace('action_', '');
        const actionMap: Record<string, string> = {
          'kosten': '/blog/aankoopproces-spanje',
          'verhuur': '/rendement',
          'locatie': '/projecten/gemeenten',
          'financiering': '/blog/financiering-hypotheek',
          'andere': '/contact'
        };
        
        const destination = actionMap[missingInfo] || '/contact';
        await showMessage("Prima keuze! Ik stuur je door... ✨");
        setTimeout(() => navigate(destination), 1200);
      } else if (value === 'exit_portal') {
        await showMessage("Geweldige keuze! Ik stuur je door naar het portaal... ✨");
        setTimeout(() => navigate('/portaal'), 1200);
      } else {
        await showMessage("Geen probleem! Tot snel! 👋");
      }
      setCurrentStep('completed');
    }
  }, [chatData, currentStep, addUserMessage, showMessage, navigate, user, visitorId]);

  // Handle scroll feedback responses
  const handleScrollFeedbackResponse = useCallback(async (value: string, inputValue?: string) => {
    const projectId = chatData.scrollFeedbackProjectId;

    if (currentStep === 'scroll_feedback_rating') {
      // Mark as answered when user responds
      setChatData(prev => ({
        ...prev,
        scrollFeedbackAnswered: true
      }));
      
      if (value === 'scroll_interested') {
        await addUserMessage('👍 Dit project spreekt me aan');
        await showMessage(
          `Mooi! Wat wil je nu doen? 🎯`,
          [
            { value: 'save_project', label: '💾 Project opslaan voor later' },
            { value: 'schedule_call', label: '📹 Videocall inplannen' }
          ]
        );
        setCurrentStep('scroll_feedback_actions');
      } else if (value === 'scroll_not_interested') {
        await addUserMessage('👎 Dit is niet wat ik zoek');
        await showMessage(
          "Kun je me vertellen waarom dit project niet past bij wat je zoekt? Dit helpt ons je beter te adviseren. 📝"
        );
        
        const inputMessage: Message = {
          id: crypto.randomUUID(),
          type: 'assistant',
          text: '',
          timestamp: new Date(),
          inputType: 'text',
          inputPlaceholder: 'Vertel waarom dit project niet voor jou is...'
        };
        setMessages(prev => [...prev, inputMessage]);
        setCurrentStep('scroll_feedback_reason');
      }
    } else if (currentStep === 'scroll_feedback_actions') {
      if (value === 'save_project') {
        await addUserMessage('💾 Project opslaan voor later');
        if (user) {
          // User is logged in - add to favorites via user_favorites table
          try {
            const { data: existing } = await supabase
              .from('user_favorites')
              .select('id')
              .eq('user_id', user.id)
              .eq('project_id', projectId)
              .maybeSingle();

            if (!existing) {
              await supabase
                .from('user_favorites')
                .insert({ user_id: user.id, project_id: projectId });
              await showMessage("✅ Project opgeslagen! Je vindt het terug in je favorieten.");
            } else {
              await showMessage("Dit project staat al in je favorieten! 💫");
            }
          } catch (error) {
            console.error('Error saving favorite:', error);
            await showMessage("Er ging iets mis. Probeer het later nog eens.");
          }
        } else {
          // User not logged in - prompt signup
          await showMessage(
            "Om projecten op te slaan heb je gratis toegang nodig. Wil je die nu krijgen? 🔐",
            [
              { value: 'signup_now', label: '✅ Ja, krijg toegang' },
              { value: 'no_thanks', label: '❌ Nee bedankt' }
            ]
          );
          setCurrentStep('scroll_feedback_signup');
        }
      } else if (value === 'schedule_call') {
        await addUserMessage('📹 Videocall inplannen');
        await showMessage("Geweldig! We plannen graag een gesprek in om dit project en andere mogelijkheden te bespreken. 📞");
        setTimeout(() => navigate('/contact'), 1200);
      }
      
      // Store positive feedback
      try {
        await supabase.from('project_feedback').insert({
          project_id: projectId,
          user_id: user?.id || null,
          visitor_id: !user ? visitorId : null,
          rating: true,
          additional_comment: `Scroll feedback - interested, action: ${value}`
        });
      } catch (error) {
        console.error('Error saving scroll feedback:', error);
      }
      
      if (value !== 'save_project' || user) {
        setCurrentStep('completed');
      }
    } else if (currentStep === 'scroll_feedback_reason') {
      if (inputValue && inputValue.trim()) {
        await addUserMessage(inputValue);
        
        // Store negative feedback with reason
        try {
          await supabase.from('project_feedback').insert({
            project_id: projectId,
            user_id: user?.id || null,
            visitor_id: !user ? visitorId : null,
            rating: false,
            additional_comment: `Scroll feedback - not interested: ${inputValue}`
          });
        } catch (error) {
          console.error('Error saving scroll feedback:', error);
        }

        await showMessage(
          "Bedankt voor je eerlijke feedback! 🙏\n\nDit helpt ons om je beter te helpen. Wil je dat ik andere projecten voor je zoek die beter passen?",
          [
            { value: 'find_alternatives', label: '✅ Ja, toon betere opties' },
            { value: 'browse_myself', label: '🔍 Nee, ik zoek zelf verder' }
          ]
        );
        setCurrentStep('scroll_feedback_alternatives');
      }
    } else if (currentStep === 'scroll_feedback_alternatives') {
      if (value === 'find_alternatives') {
        await addUserMessage('✅ Ja, toon betere opties');
        await showMessage("Prima! Ik stuur je naar ons projectenoverzicht waar je kunt filteren op jouw wensen. 🔍");
        setTimeout(() => navigate('/projecten'), 1200);
      } else {
        await addUserMessage('🔍 Nee, ik zoek zelf verder');
        await showMessage("Geen probleem! Veel succes met zoeken. 👋");
      }
      setCurrentStep('completed');
    } else if (currentStep === 'scroll_feedback_signup') {
      if (value === 'signup_now') {
        await addUserMessage('✅ Ja, krijg toegang');
        await showMessage("Geweldig! Ik stuur je door... ✨");
        setTimeout(() => navigate('/auth'), 1200);
      } else {
        await addUserMessage('❌ Nee bedankt');
        await showMessage("Geen probleem! Je kunt altijd later toegang krijgen. 👋");
      }
      setCurrentStep('completed');
    }
  }, [chatData, currentStep, addUserMessage, showMessage, navigate, user, visitorId]);

  // Main response handler
  const handleResponseWithExitIntent = useCallback(async (value: string, inputValue?: string) => {
    // Check if this is a scroll feedback flow step
    if (currentStep.startsWith('scroll_feedback_')) {
      await handleScrollFeedbackResponse(value, inputValue);
      return;
    }
    
    // Check if this is an exit intent flow step
    if (currentStep.startsWith('exit_intent_')) {
      await handleExitIntentResponse(value);
      return;
    }

    // Main flow handlers
    if (currentStep === 'ask_persona') {
      await handlePersona(value);
    } else if (currentStep === 'ask_region') {
      await handleRegion(value);
    } else if (currentStep === 'ask_budget') {
      await handleBudget(value);
    } else if (currentStep === 'ask_investment_goal') {
      await handleInvestmentGoal(value);
    } else if (currentStep === 'ask_timeline') {
      await handleTimeline(value);
    } else if (currentStep === 'show_recommendations') {
      await handleRecommendationChoice(value);
    } else {
      await handleFollowupResponse(value);
    }
  }, [
    currentStep, 
    handleScrollFeedbackResponse,
    handleExitIntentResponse,
    handlePersona, 
    handleRegion, 
    handleBudget, 
    handleInvestmentGoal, 
    handleTimeline, 
    handleRecommendationChoice, 
    handleFollowupResponse
  ]);

  // Persist chat state to sessionStorage
  useEffect(() => {
    if (isInitialized) {
      saveChatState({
        messages,
        currentStep,
        chatData,
        isInitialized,
        pageType
      });
    }
  }, [messages, currentStep, chatData, isInitialized, pageType]);

  return {
    messages,
    currentStep,
    isTyping,
    chatData,
    isInitialized,
    pageType,
    qualificationProgress,
    startConversation,
    handleResponse: handleResponseWithExitIntent,
    resetChat,
    triggerExitIntentFlow,
    triggerScrollFeedbackFlow,
  };
};
