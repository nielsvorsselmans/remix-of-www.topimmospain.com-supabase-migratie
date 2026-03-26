import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Sparkles, Send, Loader2, Check, X, Calendar, AlertTriangle,
  Clock, ArrowUpCircle, CheckCircle2, ClipboardList, Mail, MessageSquare, Phone, RotateCcw, Maximize2, Minimize2, Bell, ListTodo, Settings
} from "lucide-react";
import { AftersalesCopilotSettingsDialog } from "./AftersalesCopilotSettingsDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  proposed_actions?: ProposedAction[];
  action_statuses?: Record<number, 'pending' | 'confirmed' | 'rejected'>;
}

interface ProposedAction {
  type: 'postpone_task' | 'set_reminder' | 'update_priority' | 'mark_waiting' | 'complete_task' | 'add_followup_task' | 'schedule_notary' | 'update_payment' | 'add_payment' | 'delete_payment';
  description: string;
  milestone_id?: string;
  new_date?: string;
  reminder_date?: string;
  note?: string;
  priority?: string;
  waiting_for?: string;
  title?: string;
  phase?: string;
  target_date?: string;
  notary_date?: string;
  notary_office?: string;
  notary_notes?: string;
  payment_id?: string;
  amount?: number;
  due_date?: string;
  due_condition?: string;
  percentage?: number;
  status?: string;
}

interface Reminder {
  id: string;
  reminder_date: string;
  note: string;
  status: string;
  milestone_id: string | null;
}

interface AftersalesCopilotChatProps {
  saleId: string;
  taskId?: string;
  compact?: boolean;
}

const QUICK_PROMPTS = [
  { label: "Briefing", icon: ClipboardList, prompt: "Geef me een briefing van deze verkoop: wat is de huidige status, wat zijn de prioriteiten, en welke acties moet ik vandaag ondernemen?" },
  { label: "Ontwikkelaar", icon: Mail, prompt: "Schrijf een opvolgbericht aan de ontwikkelaar over alle openstaande punten. Schrijf in het Spaans." },
  { label: "Klantupdate", icon: MessageSquare, prompt: "Schrijf een statusupdate voor de klant over de voortgang van hun aankoop." },
  { label: "Belnotities", icon: Phone, prompt: "Genereer gesprekspunten voor een telefoongesprek over deze verkoop." },
];

const ACTION_ICONS: Record<string, typeof Calendar> = {
  postpone_task: Calendar,
  set_reminder: Clock,
  update_priority: ArrowUpCircle,
  mark_waiting: AlertTriangle,
  complete_task: CheckCircle2,
  add_followup_task: ListTodo,
  schedule_notary: Calendar,
  update_payment: ArrowUpCircle,
  add_payment: ListTodo,
  delete_payment: X,
};

const ACTION_LABELS: Record<string, string> = {
  postpone_task: "Deadline wijzigen",
  set_reminder: "Herinnering",
  update_priority: "Prioriteit",
  mark_waiting: "Wachtstatus",
  complete_task: "Voltooien",
  add_followup_task: "Follow-up taak",
  schedule_notary: "Notaris inplannen",
  update_payment: "Betaling wijzigen",
  add_payment: "Betaling toevoegen",
  delete_payment: "Betaling verwijderen",
};

export function AftersalesCopilotChat({ saleId, taskId, compact = false }: AftersalesCopilotChatProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [executingAction, setExecutingAction] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [rejectingAction, setRejectingAction] = useState<{ msgIdx: number; actionIdx: number } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Load pending reminders
  const loadReminders = useCallback(async () => {
    try {
      setRemindersLoading(true);
      const { data, error } = await supabase
        .from('aftersales_reminders')
        .select('id, reminder_date, note, status, milestone_id')
        .eq('sale_id', saleId)
        .eq('status', 'pending')
        .order('reminder_date', { ascending: true });
      if (error) throw error;
      setReminders((data || []) as Reminder[]);
    } catch (err) {
      console.error("Failed to load reminders:", err);
    } finally {
      setRemindersLoading(false);
    }
  }, [saleId]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const completeReminder = async (reminderId: string) => {
    try {
      const { error } = await supabase
        .from('aftersales_reminders')
        .update({ status: 'completed' })
        .eq('id', reminderId);
      if (error) throw error;
      toast.success("Herinnering afgehandeld");
      setReminders(prev => prev.filter(r => r.id !== reminderId));
    } catch (err) {
      toast.error("Fout bij afhandelen herinnering");
    }
  };

  // Load conversation history on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const { data, error } = await supabase
          .from('aftersales_copilot_conversations')
          .select('id, messages')
          .eq('sale_id', saleId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (data?.messages && Array.isArray(data.messages) && data.messages.length > 0) {
          setConversationId(data.id);
          setMessages(data.messages as unknown as ChatMessage[]);
        }
      } catch (err) {
        console.error("Failed to load conversation history:", err);
      } finally {
        setInitialLoading(false);
      }
    }
    loadHistory();
  }, [saleId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-aftersales-copilot', {
        body: {
          saleId,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        },
      });

      if (error) throw error;

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message || '',
        proposed_actions: data.proposed_actions?.length > 0 ? data.proposed_actions : undefined,
        action_statuses: data.proposed_actions?.length > 0
          ? Object.fromEntries(data.proposed_actions.map((_: any, i: number) => [i, 'pending']))
          : undefined,
      };

      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);

      // Persist conversation
      persistConversation(updatedMessages);
    } catch (err: any) {
      console.error("Chat error:", err);
      const errorMsg = err?.message || "Er ging iets mis";
      toast.error(errorMsg);
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Fout: ${errorMsg}` }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, saleId]);

  const persistConversation = async (msgs: ChatMessage[]) => {
    try {
      const serializable = msgs.map(m => ({ role: m.role, content: m.content, proposed_actions: m.proposed_actions, action_statuses: m.action_statuses }));
      if (conversationId) {
        await supabase.from('aftersales_copilot_conversations').update({ messages: serializable as any, updated_at: new Date().toISOString() }).eq('id', conversationId);
      } else {
        const { data } = await supabase.from('aftersales_copilot_conversations').insert({ sale_id: saleId, messages: serializable as any }).select('id').single();
        if (data) setConversationId(data.id);
      }
    } catch (err) {
      console.error("Failed to persist conversation:", err);
    }
  };

  const executeAction = async (msgIndex: number, actionIndex: number, action: ProposedAction) => {
    setExecutingAction(actionIndex);
    try {
      const { data, error } = await supabase.functions.invoke('execute-copilot-action', {
        body: { saleId, action },
      });

      if (error) throw error;
      toast.success(data?.message || "Actie uitgevoerd ✅");

      setMessages(prev => {
        const updated = prev.map((m, i) => {
          if (i === msgIndex && m.action_statuses) {
            return { ...m, action_statuses: { ...m.action_statuses, [actionIndex]: 'confirmed' as const } };
          }
          return m;
        });
        persistConversation(updated);
        return updated;
      });

      queryClient.invalidateQueries({ queryKey: ["sale-checklist"] });
      queryClient.invalidateQueries({ queryKey: ["all-open-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["sale", saleId] });
      queryClient.invalidateQueries({ queryKey: ["aftersales"] });
      // Reload reminders if a reminder or followup was created
      if (action.type === 'set_reminder' || action.type === 'add_followup_task') {
        loadReminders();
      }
    } catch (err: any) {
      console.error("Action error:", err);
      toast.error(err?.message || "Actie mislukt");
    } finally {
      setExecutingAction(null);
    }
  };

  const rejectAction = (msgIndex: number, actionIndex: number) => {
    setRejectingAction({ msgIdx: msgIndex, actionIdx: actionIndex });
    setRejectReason('');
  };

  const submitRejection = (msgIndex: number, actionIndex: number, action: ProposedAction) => {
    // Mark action as rejected
    setMessages(prev => {
      const updated = prev.map((m, i) => {
        if (i === msgIndex && m.action_statuses) {
          return { ...m, action_statuses: { ...m.action_statuses, [actionIndex]: 'rejected' as const } };
        }
        return m;
      });
      persistConversation(updated);
      return updated;
    });
    setRejectingAction(null);

    // Auto-send rejection reason as chat message
    const reason = rejectReason.trim();
    const feedbackText = reason
      ? `Ik wijs de actie "${action.description}" af omdat: ${reason}`
      : `Ik wijs de actie "${action.description}" af.`;
    setRejectReason('');
    sendMessage(feedbackText);
  };

  const resetChat = () => {
    setMessages([]);
    setInput('');
    setConversationId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const chatContent = (isExpanded: boolean) => (
    <>
      {/* Quick prompts - shown when no messages */}
      {messages.length === 0 && !initialLoading && (
        <div className={compact && !isExpanded ? "flex flex-wrap gap-1.5" : "grid grid-cols-2 gap-1.5"}>
          {QUICK_PROMPTS.map((qp) => {
            const Icon = qp.icon;
            return (
              <Button
                key={qp.label}
                size="sm"
                variant="outline"
                className="text-xs h-auto py-1.5 px-2 justify-start"
                onClick={() => sendMessage(qp.prompt)}
                disabled={loading}
              >
                <Icon className="h-3 w-3 mr-1 shrink-0" />
                {qp.label}
              </Button>
            );
          })}
        </div>
      )}

      {initialLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Gesprek laden...</span>
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1">
          {messages.map((msg, msgIdx) => (
            <div key={msgIdx} className={`text-sm ${msg.role === 'user' ? 'ml-6' : ''}`}>
              {msg.role === 'user' ? (
                <div className="bg-primary/10 rounded-lg p-2.5 text-foreground">
                  {msg.content}
                </div>
              ) : (
                <div className="space-y-2">
                  {msg.content && (
                    <div className="bg-background rounded-lg border p-2.5 prose prose-sm max-w-none dark:prose-invert [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}

                  {/* Proposed actions */}
                  {msg.proposed_actions?.map((action, actionIdx) => {
                    const status = msg.action_statuses?.[actionIdx] || 'pending';
                    const Icon = ACTION_ICONS[action.type] || Sparkles;
                    const isExecuting = executingAction === actionIdx;
                    const isRejecting = rejectingAction?.msgIdx === msgIdx && rejectingAction?.actionIdx === actionIdx;

                    return (
                      <div
                        key={actionIdx}
                        className={`rounded-lg border p-2.5 text-xs space-y-1.5 ${
                          status === 'confirmed'
                            ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800'
                            : status === 'rejected'
                            ? 'bg-muted/50 border-muted opacity-60'
                            : 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                          <div className="flex-1">
                            <Badge variant="outline" className="text-[10px] h-4 px-1 mb-1">
                              {ACTION_LABELS[action.type] || action.type}
                            </Badge>
                            <p className="text-foreground">{action.description}</p>
                            
                            {/* Action-specific detail fields */}
                            {(() => {
                              const dateFields = [action.new_date, action.reminder_date, action.target_date, action.notary_date, action.due_date].filter(Boolean);
                              const hasPastDate = dateFields.some(d => d && new Date(d) < new Date(new Date().toISOString().split('T')[0]));
                              return (
                                <div className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground">
                              {hasPastDate && (
                                    <p className={`font-medium flex items-center gap-1 ${action.type === 'schedule_notary' ? 'text-warning' : 'text-destructive'}`}>
                                      <AlertTriangle className="h-3 w-3" />
                                      {action.type === 'schedule_notary' 
                                        ? '⚠️ Notarisdatum ligt in het verleden — bevestig dat de akte al gepasseerd is'
                                        : '⚠️ Voorgestelde datum ligt in het verleden'}
                                    </p>
                                  )}
                                  {action.type === 'mark_waiting' && action.waiting_for && (
                                    <p>👤 <span className="font-medium">Wacht op:</span> {action.waiting_for}</p>
                                  )}
                                  {action.type === 'postpone_task' && action.new_date && (
                                    <p>📅 <span className="font-medium">Nieuwe datum:</span> {action.new_date}</p>
                                  )}
                                  {action.type === 'set_reminder' && (
                                    <>
                                      {action.reminder_date && <p>📅 <span className="font-medium">Datum:</span> {action.reminder_date}</p>}
                                      {action.note && <p>📝 <span className="font-medium">Notitie:</span> {action.note}</p>}
                                    </>
                                  )}
                                  {action.type === 'update_priority' && action.priority && (
                                    <p>⬆️ <span className="font-medium">Prioriteit:</span> {action.priority}</p>
                                  )}
                                  {action.type === 'add_followup_task' && (
                                    <>
                                      {action.title && <p>📝 <span className="font-medium">Taak:</span> {action.title}</p>}
                                      {action.phase && <p>📁 <span className="font-medium">Fase:</span> {action.phase}</p>}
                                      {action.target_date && <p>📅 <span className="font-medium">Deadline:</span> {action.target_date}</p>}
                                    </>
                                  )}
                                  {action.type === 'schedule_notary' && (
                                    <>
                                      {action.notary_date && <p>📅 <span className="font-medium">Notarisdatum:</span> {action.notary_date}</p>}
                                      {action.notary_office && <p>🏢 <span className="font-medium">Kantoor:</span> {action.notary_office}</p>}
                                    </>
                                  )}
                                  {(action.type === 'update_payment' || action.type === 'add_payment') && (
                                    <>
                                      {action.amount != null && <p>💰 <span className="font-medium">Bedrag:</span> €{action.amount.toLocaleString()}</p>}
                                      {action.due_date && <p>📅 <span className="font-medium">Vervaldatum:</span> {action.due_date}</p>}
                                    </>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {status === 'pending' && !isRejecting && (() => {
                          const actionDateFields = [action.new_date, action.reminder_date, action.target_date, action.notary_date, action.due_date].filter(Boolean);
                          const actionHasPastDate = actionDateFields.some(d => d && new Date(d) < new Date(new Date().toISOString().split('T')[0]));
                          return (
                          <div className="flex gap-1.5 ml-5">
                            <Button
                              size="sm"
                              variant="default"
                              className="h-6 text-[11px] px-2"
                              onClick={() => executeAction(msgIdx, actionIdx, action)}
                              disabled={isExecuting || (actionHasPastDate && action.type !== 'schedule_notary')}
                              title={actionHasPastDate ? "Kan niet bevestigen: datum ligt in het verleden" : undefined}
                            >
                              {isExecuting ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <Check className="h-3 w-3 mr-1" />
                              )}
                              Bevestig
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[11px] px-2"
                              onClick={() => rejectAction(msgIdx, actionIdx)}
                              disabled={isExecuting}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Afwijzen
                            </Button>
                          </div>
                          );
                        })()}

                        {status === 'pending' && isRejecting && (
                          <div className="ml-5 space-y-1.5">
                            <Input
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Waarom wijs je af? (optioneel)"
                              className="h-7 text-xs"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  submitRejection(msgIdx, actionIdx, action);
                                }
                                if (e.key === 'Escape') {
                                  setRejectingAction(null);
                                }
                              }}
                            />
                            <div className="flex gap-1.5">
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-6 text-[11px] px-2"
                                onClick={() => submitRejection(msgIdx, actionIdx, action)}
                              >
                                Afwijzen
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-[11px] px-2"
                                onClick={() => setRejectingAction(null)}
                              >
                                Annuleer
                              </Button>
                            </div>
                          </div>
                        )}

                        {status === 'confirmed' && (
                          <p className="text-[11px] text-green-700 dark:text-green-400 ml-5 flex items-center gap-1">
                            <Check className="h-3 w-3" /> Uitgevoerd
                          </p>
                        )}
                        {status === 'rejected' && (
                          <p className="text-[11px] text-muted-foreground ml-5 flex items-center gap-1">
                            <X className="h-3 w-3" /> Afgewezen
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Denkt na...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input */}
      <div className="flex gap-1.5 flex-shrink-0">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Stel een vraag of geef een opdracht..."
          className="min-h-[36px] max-h-[80px] text-xs resize-none"
          disabled={loading}
          rows={1}
        />
        <Button
          size="sm"
          className="h-9 w-9 shrink-0 p-0"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </>
  );

  return (
    <>
      <Card className="border-primary/20 bg-primary/5 flex flex-col" style={{ maxHeight: compact ? '400px' : '600px' }}>
        <CardHeader className="pb-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Copilot Chat
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => setSettingsOpen(true)} title="AI Instellingen">
                <Settings className="h-3.5 w-3.5" />
              </Button>
              {reminders.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs relative">
                      <Bell className="h-3 w-3 mr-1" />
                      {reminders.length}
                      {reminders.some(r => new Date(r.reminder_date) < new Date()) && (
                        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-2" align="end">
                    <p className="text-xs font-medium mb-2 text-muted-foreground">Geplande follow-ups</p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {reminders.map((r) => {
                        const isOverdue = new Date(r.reminder_date) < new Date();
                        return (
                          <div key={r.id} className={`flex items-start gap-2 rounded p-1.5 text-xs ${isOverdue ? 'bg-destructive/10' : 'bg-muted/50'}`}>
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium ${isOverdue ? 'text-destructive' : ''}`}>
                                {r.reminder_date}{isOverdue ? ' ⚠️' : ''}
                              </p>
                              <p className="text-muted-foreground truncate">{r.note || 'Geen notitie'}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 shrink-0"
                              onClick={() => completeReminder(r.id)}
                            >
                              <Check className="h-3 w-3 text-green-600" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground" onClick={resetChat}>
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Nieuw
                </Button>
              )}
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => setExpanded(true)}>
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-2 flex-1 min-h-0 pb-3">
          {chatContent(false)}
        </CardContent>
      </Card>

      {/* Expanded dialog */}
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Copilot Chat
              </DialogTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => setSettingsOpen(true)} title="AI Instellingen">
                  <Settings className="h-4 w-4" />
                </Button>
                {messages.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={resetChat}>
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Nieuw gesprek
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => setExpanded(false)}>
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex flex-col gap-2 flex-1 min-h-0 px-6 pb-6">
            {chatContent(true)}
          </div>
        </DialogContent>
      </Dialog>

      <AftersalesCopilotSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
