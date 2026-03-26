import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageCircle, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnifiedChatContext } from "@/contexts/UnifiedChatContext";
import { useExitIntent } from "@/hooks/useExitIntent";

interface UnifiedChatbotProps {
  embedded?: boolean; // If true, always show open without floating behavior
}

export const UnifiedChatbot = ({ embedded = false }: UnifiedChatbotProps) => {
  const location = useLocation();
  const { id: projectId } = useParams<{ id: string }>();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [userClosedExplicitly, setUserClosedExplicitly] = useState(false);
  const [scrollFeedbackTriggered, setScrollFeedbackTriggered] = useState(false);

  const {
    messages,
    currentStep,
    isTyping,
    isInitialized,
    pageType,
    handleResponse,
    startConversation,
    resetChat,
    triggerExitIntentFlow,
    triggerScrollFeedbackFlow,
    chatData,
  } = useUnifiedChatContext();

  // Exit intent detection (only on project detail pages)
  const isProjectDetailPage = location.pathname.includes('/project/');
  
  // Hide UnifiedChatbot completely on project detail pages
  if (isProjectDetailPage) return null;
  
  const { hasTriggered } = useExitIntent({
    onExitIntent: () => {
      if (projectId && isProjectDetailPage) {
        setIsOpen(true);
        // Use project name from page or default
        triggerExitIntentFlow(projectId, 'dit project');
      }
    },
    enabled: isProjectDetailPage && !embedded
  });

  // Scroll-triggered feedback (only on project detail pages)
  useEffect(() => {
    if (!isProjectDetailPage || embedded || scrollFeedbackTriggered) return;
    
    const handleScroll = () => {
      // Trigger when user scrolls past hero images (~600px)
      if (window.scrollY > 600 && !scrollFeedbackTriggered) {
        setScrollFeedbackTriggered(true); // Prevent multiple triggers on SAME page
        setIsOpen(true);
        if (projectId) {
          triggerScrollFeedbackFlow(projectId, 'dit project');
        }
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isProjectDetailPage, embedded, projectId, triggerScrollFeedbackFlow, scrollFeedbackTriggered]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    // Only scroll when assistant adds a message, not on user input
    if (messages.length > 0 && messages[messages.length - 1].type === 'assistant') {
      scrollToBottom();
    }
  }, [messages]);

  // Scroll-based visibility logic
  useEffect(() => {
    const handleScroll = () => {
      const isHomepage = location.pathname === '/';
      const isPortaal = location.pathname === '/portaal';
      
      // Different scroll thresholds based on page
      // Homepage & Portaal: show after scrolling past hero section (~800px)
      // Other pages: show after minimal scroll (200px)
      const scrollThreshold = (isHomepage || isPortaal) ? window.scrollY > 800 : window.scrollY > 200;
      
      const hasActiveConversation = messages.length > 0 || isInitialized;
      
      // Visible if:
      // 1. On homepage/portaal: only after scrolling past hero section (800px)
      // 2. On other pages: after minimal scroll (200px) OR immediately if conversation exists
      // 3. Always show if there's an active conversation
      if (isHomepage || isPortaal) {
        setIsVisible(scrollThreshold);
      } else {
        setIsVisible(hasActiveConversation || scrollThreshold);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check immediately on mount
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [messages.length, isInitialized, location.pathname]);

  // Auto-open when conversation starts and chat becomes visible (only on homepage after scroll)
  useEffect(() => {
    const isHomepage = location.pathname === '/';
    if (isVisible && !isOpen && isHomepage && messages.length > 0 && !userClosedExplicitly) {
      setIsOpen(true);
    }
  }, [isVisible, isOpen, location.pathname, messages.length, userClosedExplicitly]);

  // Start conversation when opened for first time (or immediately if embedded)
  // EXCEPT on project detail pages - those use scroll-triggered feedback only
  useEffect(() => {
    // Skip standard conversation start on project detail pages
    // Those pages use the scroll-triggered feedback flow exclusively
    if (isProjectDetailPage) return;
    
    if ((isOpen || embedded) && !isInitialized) {
      startConversation();
    }
  }, [isOpen, embedded, isInitialized, startConversation, isProjectDetailPage]);

  // Reset explicit close when page changes
  useEffect(() => {
    setUserClosedExplicitly(false);
  }, [location.pathname]);

  const handleClose = () => {
    setIsOpen(false);
    setUserClosedExplicitly(true);
  };

  const handleReset = () => {
    resetChat();
    setIsOpen(false);
    setUserClosedExplicitly(true);
  };

  const getContextHeader = () => {
    return 'Viva Vastgoed Assistent';
  };

  const renderOptions = () => {
    if (!messages.length) return null;
    
    const lastMessage = messages[messages.length - 1];
    
    // If last message has input field, render it
    if (lastMessage.type === 'assistant' && lastMessage.inputType) {
      return (
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem('chatInput') as HTMLInputElement;
            if (input && input.value.trim()) {
              handleResponse('', input.value.trim());
              input.value = '';
            }
          }}
          className="space-y-2 p-4 border-t"
        >
          <input
            type={lastMessage.inputType}
            name="chatInput"
            placeholder={lastMessage.inputPlaceholder}
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
          <Button type="submit" size="sm" className="w-full">
            Verstuur
          </Button>
        </form>
      );
    }
    
    // Otherwise render options if available
    if (lastMessage.type === 'assistant' && lastMessage.options?.length) {
      return (
        <div className="space-y-2 p-4 border-t">
          {lastMessage.options.map((option) => (
            <Button
              key={option.value}
              onClick={() => handleResponse(option.value)}
              variant="outline"
              size="sm"
              className="w-full justify-start"
            >
              {option.label}
            </Button>
          ))}
        </div>
      );
    }
    
    return null;
  };

  // Embedded mode: always show open, no floating behavior
  if (embedded) {
    return (
      <div className="flex flex-col h-full bg-background">
        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.type === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-4 py-2 whitespace-pre-wrap",
                  message.type === 'user'
                    ? 'bg-primary text-primary-foreground ml-auto'
                    : 'bg-muted'
                )}
              >
                <p className="text-sm leading-relaxed">{message.text}</p>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {renderOptions()}
        </div>
      </div>
    );
  }

  // Floating mode: show bubble or floating card
  if (!isVisible) {
    return null;
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-4 shadow-lg transition-all hover:scale-110 z-50 animate-in slide-in-from-bottom-4"
        aria-label="Open chat"
      >
        <MessageCircle className="w-6 h-6" />
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs rounded-full flex items-center justify-center animate-pulse">
            {messages.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-[380px] h-[600px] flex flex-col shadow-2xl z-50 bg-background animate-in slide-in-from-bottom-8">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground rounded-t-lg">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <div>
            <h3 className="font-semibold">{getContextHeader()}</h3>
            <p className="text-xs opacity-90">Hoe kunnen we u helpen?</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="text-primary-foreground hover:bg-primary-foreground/10"
            title="Minimaliseer"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.type === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-4 py-2 whitespace-pre-wrap",
                message.type === 'user'
                  ? 'bg-primary text-primary-foreground ml-auto'
                  : 'bg-muted'
              )}
            >
              <p className="text-sm leading-relaxed">{message.text}</p>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {renderOptions()}
      </div>

      {/* Footer */}
      <div className="p-3 border-t bg-muted/30 text-center">
        <button
          onClick={handleReset}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Gesprek opnieuw starten
        </button>
      </div>
    </Card>
  );
};
