import { useState, useEffect, useRef } from "react";
import { X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WherebyChatMessage {
  senderId: string;
  text: string;
  timestamp: string;
}

interface Participant {
  id: string;
  displayName?: string;
  stream?: MediaStream;
  isAudioEnabled?: boolean;
  isVideoEnabled?: boolean;
}

interface MeetingChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  displayName: string;
  chatMessages: WherebyChatMessage[];
  onSendMessage: (text: string) => void;
  localParticipant: Participant | null;
  remoteParticipants: Participant[];
}

export const MeetingChatSidebar = ({ 
  isOpen, 
  onClose, 
  displayName, 
  chatMessages, 
  onSendMessage,
  localParticipant,
  remoteParticipants
}: MeetingChatSidebarProps) => {
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Helper function to get display name from senderId
  const getDisplayName = (senderId: string): string => {
    // Check if it's the local participant
    if (localParticipant?.id === senderId) {
      return localParticipant.displayName || displayName || 'Jij';
    }
    
    // Check remote participants
    const remoteParticipant = remoteParticipants.find(p => p.id === senderId);
    if (remoteParticipant) {
      return remoteParticipant.displayName || 'Deelnemer';
    }
    
    return 'Deelnemer';
  };

  // Filter out special system messages (hand raises, emojis)
  const visibleMessages = chatMessages.filter(msg => 
    !msg.text?.startsWith('[HAND_') && 
    !msg.text?.startsWith('[EMOJI:')
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [visibleMessages]);

  const sendMessage = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-80 h-full bg-card border-l border-border flex flex-col transition-transform duration-300 ease-in-out">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-primary/5 to-accent/5">
        <h3 className="font-semibold text-foreground">Chat</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {visibleMessages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nog geen berichten. Start het gesprek!
            </p>
          ) : (
            visibleMessages.map((message, index) => {
              const isOwnMessage = localParticipant?.id === message.senderId;
              const senderName = getDisplayName(message.senderId);
              
              return (
                <div 
                  key={index} 
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}
                >
                  <div className={`max-w-[80%] rounded-lg p-3 ${
                    isOwnMessage 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted/50 text-foreground'
                  }`}>
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className={`text-xs font-semibold ${
                        isOwnMessage ? 'text-primary-foreground/90' : 'text-primary'
                      }`}>
                        {isOwnMessage ? 'Jij' : senderName}
                      </span>
                      <span className={`text-xs ${
                        isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {new Date(message.timestamp).toLocaleTimeString('nl-NL', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                    <p className="text-sm break-words">{message.text}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card/50">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Typ een bericht..."
            className="flex-1"
            onKeyPress={handleKeyPress}
          />
          <Button 
            onClick={sendMessage} 
            size="icon" 
            className="shrink-0" 
            disabled={!newMessage.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};