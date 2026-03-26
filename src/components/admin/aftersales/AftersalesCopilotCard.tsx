import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Copy, Check, Mail, MessageSquare, Phone, ClipboardList, Globe, ChevronDown, ChevronRight, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useQuery } from "@tanstack/react-query";

type Mode = 'briefing' | 'developer_message' | 'customer_update' | 'call_points';
type Channel = 'email' | 'whatsapp';
type Language = 'nl' | 'es';

interface AftersalesCopilotCardProps {
  saleId: string;
  taskId?: string;
  compact?: boolean;
}

const MODE_CONFIG = {
  briefing: { label: "Briefing", icon: ClipboardList, description: "Prioriteiten & bottlenecks" },
  developer_message: { label: "Ontwikkelaar", icon: Mail, description: "Opvolgbericht schrijven" },
  customer_update: { label: "Klantupdate", icon: MessageSquare, description: "Statusupdate voor klant" },
  call_points: { label: "Belnotities", icon: Phone, description: "Gesprekspunten genereren" },
} as const;

export function AftersalesCopilotCard({ saleId, taskId, compact = false }: AftersalesCopilotCardProps) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [channel, setChannel] = useState<Channel>('email');
  const [language, setLanguage] = useState<Language>('es');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Fetch message history
  const { data: history } = useQuery({
    queryKey: ['aftersales-ai-history', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aftersales_ai_messages')
        .select('id, mode, channel, language, content, created_at')
        .eq('sale_id', saleId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  const generate = async () => {
    if (!mode) return;
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-aftersales-action', {
        body: { saleId, mode, taskId, channel, language },
      });

      if (error) throw error;
      setResult(data?.result);
    } catch (err: any) {
      console.error("Copilot error:", err);
      toast.error(err?.message || "Er ging iets mis bij het genereren");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Gekopieerd naar klembord");
    setTimeout(() => setCopied(false), 2000);
  };

  const getDisplayText = (): string => {
    if (!result) return '';
    // On track status
    if (result.status === 'on_track') {
      let text = `✅ Alles op schema\n\n${result.summary || 'Er zijn momenteel geen actiepunten.'}`;
      if (result.next_action_date) {
        text += `\n\n📅 Volgende actie verwacht: ${new Date(result.next_action_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}`;
      }
      return text;
    }
    if (result.message) return result.message;
    if (result.actions) {
      return result.actions.map((a: any) =>
        `[${a.priority?.toUpperCase()}] ${a.action}${a.sale_name ? ` (${a.sale_name})` : ''}\n→ ${a.reason}${a.suggestion ? `\n💡 ${a.suggestion}` : ''}`
      ).join('\n\n') + (result.summary ? `\n\n📋 ${result.summary}` : '');
    }
    if (result.subject && result.message) {
      return `Onderwerp: ${result.subject}\n\n${result.message}`;
    }
    if (result.points) {
      return `Gesprek met: ${result.call_with || 'Onbekend'}\n\n` +
        result.points.map((p: any) =>
          `• ${p.topic} [${p.priority}]\n  ${p.suggestion}`
        ).join('\n\n');
    }
    return JSON.stringify(result, null, 2);
  };

  const showChannelToggle = mode === 'developer_message' || mode === 'customer_update';
  const showLanguageToggle = mode === 'developer_message';
  const showGenerateButton = mode !== null && !loading && !result;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Aftersales Copilot
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Mode buttons - select only, don't generate */}
        <div className={compact ? "flex flex-wrap gap-1.5" : "grid grid-cols-2 gap-1.5"}>
          {(Object.entries(MODE_CONFIG) as [Mode, typeof MODE_CONFIG[Mode]][]).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <Button
                key={key}
                size="sm"
                variant={mode === key ? "default" : "outline"}
                className="text-xs h-auto py-1.5 px-2 justify-start"
                onClick={() => { setMode(key); setResult(null); }}
                disabled={loading}
              >
                <Icon className="h-3 w-3 mr-1 shrink-0" />
                {config.label}
              </Button>
            );
          })}
        </div>

        {/* Channel + Language toggles */}
        {showChannelToggle && !loading && !result && (
          <div className="flex gap-1.5 flex-wrap">
            <Button
              size="sm"
              variant={channel === 'email' ? "secondary" : "ghost"}
              className="text-xs h-7"
              onClick={() => setChannel('email')}
            >
              <Mail className="h-3 w-3 mr-1" /> Email
            </Button>
            <Button
              size="sm"
              variant={channel === 'whatsapp' ? "secondary" : "ghost"}
              className="text-xs h-7"
              onClick={() => setChannel('whatsapp')}
            >
              <MessageSquare className="h-3 w-3 mr-1" /> WhatsApp
            </Button>

            {showLanguageToggle && (
              <>
                <div className="w-px bg-border mx-1" />
                <Button
                  size="sm"
                  variant={language === 'es' ? "secondary" : "ghost"}
                  className="text-xs h-7"
                  onClick={() => setLanguage('es')}
                >
                  <Globe className="h-3 w-3 mr-1" /> ES
                </Button>
                <Button
                  size="sm"
                  variant={language === 'nl' ? "secondary" : "ghost"}
                  className="text-xs h-7"
                  onClick={() => setLanguage('nl')}
                >
                  <Globe className="h-3 w-3 mr-1" /> NL
                </Button>
              </>
            )}
          </div>
        )}

        {/* Generate button */}
        {showGenerateButton && (
          <Button
            size="sm"
            className="w-full text-xs"
            onClick={generate}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Genereer {MODE_CONFIG[mode].label.toLowerCase()}
          </Button>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>AI genereert...</span>
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div className="space-y-2">
            {mode && (
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary" className="text-xs">
                  {MODE_CONFIG[mode].label}
                </Badge>
                {showLanguageToggle && (
                  <Badge variant="outline" className="text-xs">
                    {language === 'es' ? '🇪🇸 Spaans' : '🇳🇱 Nederlands'}
                  </Badge>
                )}
              </div>
            )}
            <div className={`bg-background rounded-md border p-3 text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto leading-relaxed ${result.status === 'on_track' ? 'border-green-200 bg-green-50/50' : ''}`}>
              {getDisplayText()}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs flex-1"
                onClick={() => copyToClipboard(getDisplayText())}
              >
                {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                {copied ? "Gekopieerd" : "Kopiëren"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs"
                onClick={() => { setResult(null); }}
              >
                Opnieuw
              </Button>
            </div>
          </div>
        )}

        {/* Message history */}
        {history && history.length > 0 && !loading && !result && (
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground h-7 justify-start">
                {historyOpen ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                <History className="h-3 w-3 mr-1" />
                Eerdere berichten ({history.length})
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1.5 mt-1.5">
              {history.map((msg: any) => (
                <div
                  key={msg.id}
                  className="bg-background rounded border p-2 text-xs cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => copyToClipboard(msg.content)}
                  title="Klik om te kopiëren"
                >
                  <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                      {msg.mode}
                    </Badge>
                    {msg.language && msg.language !== 'nl' && (
                      <span className="text-[10px]">🇪🇸</span>
                    )}
                    <span className="text-[10px] ml-auto">
                      {new Date(msg.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-foreground">{msg.content}</p>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
