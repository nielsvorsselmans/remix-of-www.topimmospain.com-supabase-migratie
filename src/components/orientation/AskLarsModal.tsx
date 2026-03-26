import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Calendar, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface AskLarsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const POPULAR_QUESTIONS = [
  "Wat zijn de bijkomende kosten bij een aankoop?",
  "Hoe werkt financiering in Spanje?",
  "Welke regio past het beste bij mij?",
  "Is investeren in Spanje veilig?",
];

const MAX_QUESTIONS = 3;

export function AskLarsModal({ open, onOpenChange }: AskLarsModalProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      // Small delay to avoid visual glitch
      const timeout = setTimeout(() => {
        setMessages([]);
        setInput("");
        setQuestionCount(0);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (question: string) => {
    if (!question.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: question };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setQuestionCount((prev) => prev + 1);

    try {
      const { data, error } = await supabase.functions.invoke("chat-advisor", {
        body: {
          message: question,
          context: "ask-lars-quick-question",
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data?.response || data?.answer || "Ik heb je vraag ontvangen. Voor een persoonlijk antwoord kun je het beste een gesprek inplannen.",
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error calling chat-advisor:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Er ging iets mis. Probeer het later opnieuw of plan direct een gesprek in.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const handleScheduleMeeting = () => {
    onOpenChange(false);
    window.open("/afspraak", "_blank");
  };

  const showMeetingCTA = questionCount >= MAX_QUESTIONS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Vraag het Lars
          </DialogTitle>
        </DialogHeader>

        {messages.length === 0 ? (
          /* Initial state with popular questions */
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Populaire vragen:
            </p>
            <div className="space-y-2">
              {POPULAR_QUESTIONS.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSend(question)}
                  disabled={isLoading}
                  className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors text-sm"
                >
                  {question}
                </button>
              ))}
            </div>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-muted-foreground">
                  of stel je eigen vraag
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Typ je vraag..."
                disabled={isLoading}
              />
              <Button
                onClick={() => handleSend(input)}
                disabled={!input.trim() || isLoading}
                size="icon"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* Chat view */
          <>
            <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
              <div className="space-y-4 py-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-lg px-4 py-2.5 text-sm",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      )}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-2.5">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Meeting CTA after max questions */}
            {showMeetingCTA && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
                <p className="text-sm text-foreground mb-3">
                  💡 <strong>Tip:</strong> Voor persoonlijk advies afgestemd op jouw 
                  situatie kun je een gratis gesprek inplannen.
                </p>
                <Button onClick={handleScheduleMeeting} className="w-full gap-2">
                  <Calendar className="h-4 w-4" />
                  Plan een gesprek met Lars
                </Button>
              </div>
            )}

            {/* Input */}
            {!showMeetingCTA && (
              <div className="flex gap-2 pt-2 border-t border-border">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Stel nog een vraag..."
                  disabled={isLoading}
                />
                <Button
                  onClick={() => handleSend(input)}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}

            {/* Subtle meeting link when not at max */}
            {!showMeetingCTA && questionCount > 0 && (
              <p className="text-xs text-center text-muted-foreground pt-2">
                Liever persoonlijk advies?{" "}
                <button
                  onClick={handleScheduleMeeting}
                  className="text-primary hover:underline"
                >
                  Plan een gesprek
                </button>
              </p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
