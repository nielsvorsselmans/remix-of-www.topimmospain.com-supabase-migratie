import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, Sparkles, ArrowRight, Save, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CompareResult {
  archetype: string;
  content: string;
  hashtags: string[];
  debug: any;
  duration: number | null;
  status: "loading" | "done" | "error";
  error?: string;
  usedHook?: string;
  savedPostId?: string | null;
}

interface LinkedInArchetypeCompareProps {
  results: CompareResult[];
  onSelect: (result: CompareResult) => void;
  onClose: () => void;
  onEdit?: (archetype: string, content: string) => void;
  onSaveDraft?: (result: CompareResult) => Promise<void>;
  onSaveAll?: () => Promise<void>;
  savingAll?: boolean;
}

const ARCHETYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  engagement: { label: "Engagement", icon: "🔥", color: "border-orange-300 bg-orange-50 dark:bg-orange-950/20" },
  authority: { label: "Authority", icon: "👑", color: "border-blue-300 bg-blue-50 dark:bg-blue-950/20" },
  educational: { label: "Educatief", icon: "📚", color: "border-green-300 bg-green-50 dark:bg-green-950/20" },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

export function LinkedInArchetypeCompare({ results, onSelect, onClose, onEdit, onSaveDraft, onSaveAll, savingAll }: LinkedInArchetypeCompareProps) {
  const doneCount = results.filter(r => r.status === "done").length;
  const totalCount = results.length;
  const allDone = doneCount === totalCount && totalCount > 0;
  const allSaved = results.every(r => r.status !== "done" || !!r.savedPostId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium">🔬 Archetype Vergelijking</h3>
          <Badge variant="outline" className="text-[10px]">
            {doneCount}/{totalCount} klaar
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {allDone && onSaveAll && !allSaved && (
            <Button variant="outline" size="sm" onClick={onSaveAll} disabled={savingAll}>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {savingAll ? "Opslaan..." : "Bewaar alle 3"}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            Sluiten
          </Button>
        </div>
      </div>

      {/* Desktop: 3 columns, Mobile: tabs */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-4">
        {results.map((result) => (
          <CompareCard key={result.archetype} result={result} onSelect={onSelect} onEdit={onEdit} onSaveDraft={onSaveDraft} />
        ))}
      </div>

      <div className="lg:hidden">
        <Tabs defaultValue={results[0]?.archetype}>
          <TabsList className="w-full grid grid-cols-3">
            {results.map((r) => {
              const meta = ARCHETYPE_META[r.archetype] || { label: r.archetype, icon: "📝" };
              return (
                <TabsTrigger key={r.archetype} value={r.archetype} className="text-xs">
                  {meta.icon} {meta.label}
                  {r.status === "loading" && <Sparkles className="h-3 w-3 ml-1 animate-pulse" />}
                </TabsTrigger>
              );
            })}
          </TabsList>
          {results.map((result) => (
            <TabsContent key={result.archetype} value={result.archetype}>
              <CompareCard result={result} onSelect={onSelect} onEdit={onEdit} onSaveDraft={onSaveDraft} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}

function CompareCard({ result, onSelect, onEdit, onSaveDraft }: { result: CompareResult; onSelect: (r: CompareResult) => void; onEdit?: (archetype: string, content: string) => void; onSaveDraft?: (result: CompareResult) => Promise<void> }) {
  const meta = ARCHETYPE_META[result.archetype] || { label: result.archetype, icon: "📝", color: "" };
  const [saving, setSaving] = useState(false);
  const isSaved = !!result.savedPostId;

  const handleSave = async () => {
    if (!onSaveDraft || isSaved) return;
    setSaving(true);
    try {
      await onSaveDraft(result);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className={cn("transition-all", result.status === "done" && "hover:shadow-md", isSaved && "border-green-300 dark:border-green-700")}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <span>{meta.icon}</span>
            {meta.label}
            {isSaved && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
          </CardTitle>
          <div className="flex items-center gap-1">
            {result.duration && (
              <Badge variant="outline" className="text-[10px]">{result.duration}ms</Badge>
            )}
            {result.status === "done" && <CopyButton text={result.content} />}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {result.status === "loading" && (
          <div className="flex items-center gap-2 py-12 justify-center text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 animate-pulse" />
            Wordt geschreven...
          </div>
        )}
        {result.status === "error" && (
          <div className="text-sm text-destructive py-4">
            ❌ {result.error || "Generatie mislukt"}
          </div>
        )}
        {result.status === "done" && (
          <>
            {result.usedHook && (
              <div className="text-[10px] text-muted-foreground italic bg-muted/40 rounded px-2 py-1 line-clamp-2">
                🪝 {result.usedHook}
              </div>
            )}
            <Textarea
              value={result.content}
              onChange={(e) => onEdit?.(result.archetype, e.target.value)}
              className="text-xs min-h-[300px] max-h-[400px] bg-muted/30 border resize-none"
              readOnly={!onEdit}
            />
            <div className="flex gap-2">
              {onSaveDraft && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleSave}
                  disabled={saving || isSaved}
                >
                  {isSaved ? (
                    <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-green-500" /> Opgeslagen</>
                  ) : saving ? (
                    "Opslaan..."
                  ) : (
                    <><Save className="h-3.5 w-3.5 mr-1.5" /> Bewaar als concept</>
                  )}
                </Button>
              )}
              <Button
                size="sm"
                className={onSaveDraft ? "flex-1" : "w-full"}
                onClick={() => onSelect(result)}
              >
                <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                Gebruik deze versie
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
