import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Save, RotateCcw, Loader2, ArrowLeft, Lightbulb, PenLine, Edit3, Image as ImageIcon, MessageSquare, Linkedin } from "lucide-react";
import {
  BLOG_PIPELINE_STEPS,
  LINKEDIN_PIPELINE_STEPS,
  BLOG_DEFAULT_PROMPTS,
  BLOG_DEFAULT_MODELS,
  AVAILABLE_MODELS,
  useBlogBrainstormPrompt,
  useBlogWriterPrompt,
  useBlogRewriteSectionPrompt,
  useBlogImagePrompt,
  useLinkedInBrainstormPrompt,
  useLinkedInWriterPrompt,
  useUpdateBlogPrompt,
} from "@/hooks/useBlogPipelinePrompts";
import { AnalysisPromptDialog } from "./AnalysisPromptDialog";

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Lightbulb,
  PenLine,
  Edit3,
  ImageIcon,
};

interface BlogPipelineSettingsProps {
  onBack: () => void;
}

export function BlogPipelineSettings({ onBack }: BlogPipelineSettingsProps) {
  const brainstorm = useBlogBrainstormPrompt();
  const writer = useBlogWriterPrompt();
  const rewrite = useBlogRewriteSectionPrompt();
  const image = useBlogImagePrompt();
  const linkedinBrainstorm = useLinkedInBrainstormPrompt();
  const linkedinWriter = useLinkedInWriterPrompt();
  const updateMutation = useUpdateBlogPrompt();

  const promptQueries: Record<string, any> = {
    blog_brainstorm: brainstorm,
    blog_writer: writer,
    blog_rewrite_section: rewrite,
    blog_image: image,
    linkedin_brainstorm: linkedinBrainstorm,
    linkedin_writer: linkedinWriter,
  };

  const [localPrompts, setLocalPrompts] = useState<Record<string, string>>({});
  const [localModels, setLocalModels] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});

  const allSteps = [...BLOG_PIPELINE_STEPS, ...LINKEDIN_PIPELINE_STEPS];

  // Sync from queries
  useEffect(() => {
    const prompts: Record<string, string> = {};
    const models: Record<string, string> = {};
    for (const step of allSteps) {
      const q = promptQueries[step.key];
      if (q.data) {
        prompts[step.key] = q.data.prompt;
        models[step.key] = q.data.model;
      }
    }
    setLocalPrompts(prev => ({ ...prev, ...prompts }));
    setLocalModels(prev => ({ ...prev, ...models }));
  }, [brainstorm.data, writer.data, rewrite.data, image.data, linkedinBrainstorm.data, linkedinWriter.data]);

  const handleSave = (key: string) => {
    updateMutation.mutate({
      promptKey: key,
      promptText: localPrompts[key] || BLOG_DEFAULT_PROMPTS[key],
      modelId: localModels[key] || BLOG_DEFAULT_MODELS[key],
    }, {
      onSuccess: () => setDirty(prev => ({ ...prev, [key]: false })),
    });
  };

  const handleReset = (key: string) => {
    setLocalPrompts(prev => ({ ...prev, [key]: BLOG_DEFAULT_PROMPTS[key] }));
    setLocalModels(prev => ({ ...prev, [key]: BLOG_DEFAULT_MODELS[key] }));
    setDirty(prev => ({ ...prev, [key]: true }));
  };

  const updatePrompt = (key: string, value: string) => {
    setLocalPrompts(prev => ({ ...prev, [key]: value }));
    setDirty(prev => ({ ...prev, [key]: true }));
  };

  const updateModel = (key: string, value: string) => {
    setLocalModels(prev => ({ ...prev, [key]: value }));
    setDirty(prev => ({ ...prev, [key]: true }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Terug
        </Button>
        <div>
          <h2 className="text-lg font-semibold">Pipeline Instellingen</h2>
          <p className="text-sm text-muted-foreground">
            Pas de AI prompts en modellen aan voor de blog-pipeline en gespreksanalyse.
          </p>
        </div>
      </div>

      <Accordion type="multiple" className="space-y-2">
        {BLOG_PIPELINE_STEPS.map((step, idx) => {
          const Icon = ICON_MAP[step.icon] || Lightbulb;
          const isLoading = promptQueries[step.key]?.isLoading;
          const currentModel = localModels[step.key] || BLOG_DEFAULT_MODELS[step.key];
          const modelLabel = AVAILABLE_MODELS.find(m => m.id === currentModel)?.label || currentModel;

          return (
            <AccordionItem key={step.key} value={step.key} className="border rounded-lg px-0">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Stap {idx + 1}: {step.label}</span>
                      {dirty[step.key] && <Badge variant="outline" className="text-xs">Niet opgeslagen</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                  <Badge variant="secondary" className="ml-auto mr-4 text-xs">{modelLabel}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-4">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" /> Laden...
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>AI Model</Label>
                      <Select value={currentModel} onValueChange={(v) => updateModel(step.key, v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_MODELS.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              <span>{m.label}</span>
                              <span className="text-xs text-muted-foreground ml-2">— {m.description}</span>
                            </SelectItem>
                          ))}
                          {step.key === "blog_image" && (
                            <SelectItem value="google/gemini-3-pro-image-preview">
                              Gemini 3 Pro Image — Afbeelding generatie
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>
                        {step.key === "blog_image" ? "Prompt template (gebruik {title}, {intro}, {category})" : "System prompt"}
                      </Label>
                      <Textarea
                        value={localPrompts[step.key] || ""}
                        onChange={(e) => updatePrompt(step.key, e.target.value)}
                        className="min-h-[200px] font-mono text-xs"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSave(step.key)}
                        disabled={!dirty[step.key] || updateMutation.isPending}
                      >
                        {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                        Opslaan
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReset(step.key)}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" /> Reset naar standaard
                      </Button>
                    </div>
                  </>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <Separator className="my-6" />

      {/* LinkedIn Pipeline */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#0A66C2]/10 text-[#0A66C2]">
            <Linkedin className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-medium">LinkedIn Pipeline</h3>
            <p className="text-xs text-muted-foreground">Prompts voor de twee-staps LinkedIn post generatie</p>
          </div>
        </div>
      </div>

      <Accordion type="multiple" className="space-y-2">
        {LINKEDIN_PIPELINE_STEPS.map((step, idx) => {
          const Icon = ICON_MAP[step.icon] || Lightbulb;
          const isLoading = promptQueries[step.key]?.isLoading;
          const currentModel = localModels[step.key] || BLOG_DEFAULT_MODELS[step.key];
          const modelLabel = AVAILABLE_MODELS.find(m => m.id === currentModel)?.label || currentModel;

          return (
            <AccordionItem key={step.key} value={step.key} className="border rounded-lg px-0">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#0A66C2]/10 text-[#0A66C2]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Stap {idx + 1}: {step.label}</span>
                      {dirty[step.key] && <Badge variant="outline" className="text-xs">Niet opgeslagen</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                  <Badge variant="secondary" className="ml-auto mr-4 text-xs">{modelLabel}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-4">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" /> Laden...
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>AI Model</Label>
                      <Select value={currentModel} onValueChange={(v) => updateModel(step.key, v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_MODELS.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              <span>{m.label}</span>
                              <span className="text-xs text-muted-foreground ml-2">— {m.description}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>System prompt</Label>
                      <Textarea
                        value={localPrompts[step.key] || ""}
                        onChange={(e) => updatePrompt(step.key, e.target.value)}
                        className="min-h-[200px] font-mono text-xs"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSave(step.key)}
                        disabled={!dirty[step.key] || updateMutation.isPending}
                      >
                        {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                        Opslaan
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReset(step.key)}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" /> Reset naar standaard
                      </Button>
                    </div>
                  </>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <Separator className="my-6" />

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-medium">Gesprekken Analyse Prompt</h3>
            <p className="text-xs text-muted-foreground">De AI prompt waarmee klantgesprekken automatisch worden geanalyseerd.</p>
          </div>
        </div>
        <AnalysisPromptDialog
          trigger={
            <Button variant="outline" size="sm">
              <Edit3 className="h-4 w-4 mr-2" />
              Analyse Prompt Bewerken
            </Button>
          }
        />
      </div>
    </div>
  );
}
