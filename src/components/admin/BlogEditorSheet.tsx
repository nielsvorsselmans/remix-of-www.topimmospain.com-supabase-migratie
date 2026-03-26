import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Save, Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface BlogSection {
  heading?: string;
  body?: string;
  text?: string;
  items?: string[];
  type?: string;
}

interface BlogContent {
  sections?: BlogSection[];
}

interface BlogDraft {
  id: string;
  title: string;
  slug: string;
  intro: string;
  category: string;
  content: BlogContent;
  meta_description?: string | null;
  featured_image?: string | null;
  summary?: string | null;
}

interface BlogEditorSheetProps {
  draft: BlogDraft | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BlogEditorSheet({ draft, open, onOpenChange }: BlogEditorSheetProps) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [rewritingIdx, setRewritingIdx] = useState<number | null>(null);
  const [rewriteInstruction, setRewriteInstruction] = useState("");
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  // Editable state
  const [title, setTitle] = useState("");
  const [intro, setIntro] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [sections, setSections] = useState<BlogSection[]>([]);

  useEffect(() => {
    if (draft) {
      setTitle(draft.title);
      setIntro(draft.intro || "");
      setMetaDescription(draft.meta_description || "");
      setSections((draft.content as BlogContent)?.sections || []);
      setExpandedSection(null);
      setRewriteInstruction("");
    }
  }, [draft]);

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("blog_posts")
        .update({
          title,
          intro,
          meta_description: metaDescription || null,
          content: { sections } as any,
          updated_at: new Date().toISOString(),
        })
        .eq("id", draft.id);
      if (error) throw error;
      toast.success("Wijzigingen opgeslagen");
      queryClient.invalidateQueries({ queryKey: ["blog-drafts"] });
      onOpenChange(false);
    } catch {
      toast.error("Kon wijzigingen niet opslaan");
    } finally {
      setSaving(false);
    }
  };

  const handleRewriteSection = async (idx: number) => {
    if (!rewriteInstruction.trim()) {
      toast.error("Geef een instructie voor herschrijving");
      return;
    }
    setRewritingIdx(idx);
    try {
      const { data, error } = await supabase.functions.invoke("generate-blog-content", {
        body: {
          step: "rewrite-section",
          section_index: idx,
          section_instruction: rewriteInstruction,
          full_content: { sections },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const newSections = [...sections];
      newSections.splice(idx, 1, ...data.sections);
      setSections(newSections);
      setRewriteInstruction("");
      toast.success("Sectie herschreven!");
    } catch (err: any) {
      console.error("Rewrite error:", err);
      toast.error("Kon sectie niet herschrijven");
    } finally {
      setRewritingIdx(null);
    }
  };

  const updateSectionField = (idx: number, field: keyof BlogSection, value: string) => {
    const newSections = [...sections];
    newSections[idx] = { ...newSections[idx], [field]: value };
    setSections(newSections);
  };

  if (!draft) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Blog bewerken</SheetTitle>
          <SheetDescription>
            Bewerk titel, intro en secties. Gebruik AI om secties te herschrijven.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Titel</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          {/* Intro */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Intro</label>
            <Textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={3} />
          </div>

          {/* Meta description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Meta beschrijving</label>
            <Textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} rows={2} />
            <p className="text-xs text-muted-foreground">{metaDescription.length}/160 tekens</p>
          </div>

          <Separator />

          {/* Sections */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              Secties ({sections.length})
            </h3>
            {sections.map((section, idx) => {
              const isExpanded = expandedSection === idx;
              return (
                <div key={idx} className="border rounded-lg">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedSection(isExpanded ? null : idx)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {idx + 1}
                      </Badge>
                      <span className="text-sm font-medium truncate">
                        {section.heading || `Sectie ${idx + 1}`}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-3">
                      <Input
                        placeholder="Heading"
                        value={section.heading || ""}
                        onChange={(e) => updateSectionField(idx, "heading", e.target.value)}
                      />
                      <Textarea
                        placeholder="Inhoud"
                        value={section.body || section.text || ""}
                        onChange={(e) => {
                          const newSections = [...sections];
                          newSections[idx] = { ...newSections[idx], body: e.target.value, text: e.target.value };
                          setSections(newSections);
                        }}
                        rows={6}
                      />
                      {section.items && section.items.length > 0 && (
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Bullet items</label>
                          <Textarea
                            placeholder="Eén item per regel"
                            value={section.items.join("\n")}
                            onChange={(e) => {
                              const newSections = [...sections];
                              newSections[idx] = { ...newSections[idx], items: e.target.value.split("\n") };
                              setSections(newSections);
                            }}
                            rows={4}
                          />
                        </div>
                      )}

                      {/* AI Rewrite */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Instructie voor AI herschrijving..."
                          value={expandedSection === idx ? rewriteInstruction : ""}
                          onChange={(e) => setRewriteInstruction(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRewriteSection(idx)}
                          disabled={rewritingIdx !== null}
                        >
                          {rewritingIdx === idx ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Separator />

          {/* Save */}
          <div className="flex justify-end gap-2 pb-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Opslaan
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
