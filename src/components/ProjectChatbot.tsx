import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectChat } from "@/hooks/useProjectChat";
import { SignupDialog } from "@/components/SignupDialog";

interface ProjectChatbotProps {
  projectId: string;
  projectName: string;
  projectPrice?: number;
}

export const ProjectChatbot = ({
  projectId,
  projectName,
  projectPrice,
}: ProjectChatbotProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [signupDialogOpen, setSignupDialogOpen] = useState(false);
  const [textInput, setTextInput] = useState("");
  
  const {
    messages,
    currentStep,
    isTyping,
    isInitialized,
    isProcessing,
    startConversation,
    handleResponse
  } = useProjectChat({ projectId, projectName, projectPrice });

  useEffect(() => {
    startConversation();
  }, [startConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (currentStep === 'trigger_signup') {
      setSignupDialogOpen(true);
    }
  }, [currentStep]);

  const handleOptionClick = (value: string) => {
    if (value === 'schedule_call') {
      const contactSection = document.getElementById('contact-section');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
    handleResponse(value);
  };

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      handleResponse('text_submitted', textInput);
      setTextInput("");
    }
  };

  if (!isInitialized) {
    return (
      <Card className="bg-card border-border p-6 flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border p-6 flex flex-col max-h-[600px]">
      <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
        🏠 Project Assistent
      </h3>
      
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.type === 'assistant' ? "justify-start" : "justify-end"
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-lg p-3 animate-fade-in",
                message.type === 'assistant'
                  ? "bg-muted text-foreground"
                  : "bg-primary text-primary-foreground"
              )}
            >
              <p className="text-sm leading-relaxed whitespace-pre-line">{message.text}</p>
              
              {message.options && message.options.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.options.map((option) => (
                    <Button
                      key={option.value}
                      onClick={() => handleOptionClick(option.value)}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-left hover:bg-accent"
                      disabled={currentStep === 'completed' || isProcessing}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-muted text-foreground rounded-lg p-3 flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {currentStep === 'not_interested_text_input' && (
        <div className="flex gap-2 mt-2">
          <Textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Typ je antwoord hier..."
            className="flex-1 min-h-[80px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleTextSubmit();
              }
            }}
          />
          <Button
            onClick={handleTextSubmit}
            disabled={!textInput.trim() || isProcessing}
            size="icon"
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="mt-2">
        <SignupDialog 
          open={signupDialogOpen} 
          onOpenChange={setSignupDialogOpen}
          onSuccess={() => {
            setSignupDialogOpen(false);
          }}
        />
      </div>
    </Card>
  );
};
