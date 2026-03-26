import React, { createContext, useContext, ReactNode } from 'react';
import { useUnifiedChat } from '@/hooks/useUnifiedChat';
import type { Message, PageType } from '@/hooks/useUnifiedChat';

interface ChatContextType {
  messages: Message[];
  currentStep: string;
  isTyping: boolean;
  chatData: any;
  isInitialized: boolean;
  pageType: PageType;
  qualificationProgress: number;
  startConversation: () => Promise<void>;
  handleResponse: (value: string, inputValue?: string) => Promise<void>;
  resetChat: () => void;
  triggerExitIntentFlow: (projectId: string, projectName: string) => Promise<void>;
  triggerScrollFeedbackFlow: (projectId: string, projectName: string) => Promise<void>;
}

const UnifiedChatContext = createContext<ChatContextType | null>(null);

export const UnifiedChatProvider = ({ children }: { children: ReactNode }) => {
  const chatState = useUnifiedChat();
  
  return (
    <UnifiedChatContext.Provider value={chatState}>
      {children}
    </UnifiedChatContext.Provider>
  );
};

export const useUnifiedChatContext = () => {
  const context = useContext(UnifiedChatContext);
  if (!context) {
    throw new Error('useUnifiedChatContext must be used within UnifiedChatProvider');
  }
  return context;
};
