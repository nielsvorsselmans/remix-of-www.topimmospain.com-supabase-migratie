import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Copy, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function DailyBriefingCard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const generate = async () => {
    setLoading(true);
    setResult(null);
    setOpen(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-aftersales-action', {
        body: { mode: 'daily_briefing' },
      });

      if (error) throw error;
      setResult(data?.result);
    } catch (err: any) {
      console.error("Daily briefing error:", err);
      toast.error(err?.message || "Er ging iets mis bij het genereren");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const getDisplayText = (): string => {
    if (!result) return '';
    if (result.message) return result.message;
    if (result.actions) {
      return result.actions.map((a: any) =>
        `[${a.priority?.toUpperCase()}] ${a.sale_name || ''}\n→ ${a.action}\n  ${a.reason}`
      ).join('\n\n') + (result.summary ? `\n\n📋 ${result.summary}` : '');
    }
    return JSON.stringify(result, null, 2);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Gekopieerd naar klembord");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="text-xs"
        onClick={generate}
        disabled={loading}
      >
        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
        AI Dagbriefing
      </Button>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Dagbriefing
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => { setOpen(false); setResult(null); }}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Dagbriefing genereren...</span>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-2">
            <div className="bg-background rounded-md border p-3 text-sm whitespace-pre-wrap max-h-[400px] overflow-y-auto leading-relaxed">
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
                onClick={generate}
              >
                Opnieuw
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
