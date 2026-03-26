import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Loader2, RotateCcw, Sparkles, ClipboardCheck, PenLine, Zap, Edit3 } from "lucide-react";
import { 
  useBrainstormerPrompt, 
  useFormalizerPrompt,
  useWriterPrompt,
  useHookOptimizerPrompt,
  useSeniorEditorPrompt,
  useUpdateBriefingPrompt,
  DEFAULT_BRAINSTORMER_PROMPT,
  DEFAULT_FORMALIZER_PROMPT,
  DEFAULT_WRITER_PROMPT,
  DEFAULT_HOOK_OPTIMIZER_PROMPT,
  DEFAULT_SENIOR_EDITOR_PROMPT,
  BRAINSTORMER_PROMPT_KEY,
  FORMALIZER_PROMPT_KEY,
  WRITER_PROMPT_KEY,
  HOOK_OPTIMIZER_PROMPT_KEY,
  SENIOR_EDITOR_PROMPT_KEY,
  AVAILABLE_MODELS,
  DEFAULT_MODELS
} from "@/hooks/useBriefingPrompt";

type TabType = "brainstormer" | "formalizer" | "writer" | "hookOptimizer" | "seniorEditor";

export function BriefingPromptDialog() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("brainstormer");
  
  // Prompt state
  const [editedBrainstormer, setEditedBrainstormer] = useState<string | null>(null);
  const [editedFormalizer, setEditedFormalizer] = useState<string | null>(null);
  const [editedWriter, setEditedWriter] = useState<string | null>(null);
  const [editedHookOptimizer, setEditedHookOptimizer] = useState<string | null>(null);
  const [editedSeniorEditor, setEditedSeniorEditor] = useState<string | null>(null);
  
  // Model state
  const [selectedBrainstormerModel, setSelectedBrainstormerModel] = useState<string | null>(null);
  const [selectedFormalizerModel, setSelectedFormalizerModel] = useState<string | null>(null);
  const [selectedWriterModel, setSelectedWriterModel] = useState<string | null>(null);
  const [selectedHookOptimizerModel, setSelectedHookOptimizerModel] = useState<string | null>(null);
  const [selectedSeniorEditorModel, setSelectedSeniorEditorModel] = useState<string | null>(null);
  
  const { data: brainstormerData, isLoading: brainstormerLoading } = useBrainstormerPrompt();
  const { data: formalizerData, isLoading: formalizerLoading } = useFormalizerPrompt();
  const { data: writerData, isLoading: writerLoading } = useWriterPrompt();
  const { data: hookOptimizerData, isLoading: hookOptimizerLoading } = useHookOptimizerPrompt();
  const { data: seniorEditorData, isLoading: seniorEditorLoading } = useSeniorEditorPrompt();
  const updatePrompt = useUpdateBriefingPrompt();

  // Current prompt values
  const currentBrainstormer = editedBrainstormer ?? brainstormerData?.prompt ?? DEFAULT_BRAINSTORMER_PROMPT;
  const currentFormalizer = editedFormalizer ?? formalizerData?.prompt ?? DEFAULT_FORMALIZER_PROMPT;
  const currentWriter = editedWriter ?? writerData?.prompt ?? DEFAULT_WRITER_PROMPT;
  const currentHookOptimizer = editedHookOptimizer ?? hookOptimizerData?.prompt ?? DEFAULT_HOOK_OPTIMIZER_PROMPT;
  const currentSeniorEditor = editedSeniorEditor ?? seniorEditorData?.prompt ?? DEFAULT_SENIOR_EDITOR_PROMPT;

  // Current model values
  const currentBrainstormerModel = selectedBrainstormerModel ?? brainstormerData?.model ?? DEFAULT_MODELS[BRAINSTORMER_PROMPT_KEY];
  const currentFormalizerModel = selectedFormalizerModel ?? formalizerData?.model ?? DEFAULT_MODELS[FORMALIZER_PROMPT_KEY];
  const currentWriterModel = selectedWriterModel ?? writerData?.model ?? DEFAULT_MODELS[WRITER_PROMPT_KEY];
  const currentHookOptimizerModel = selectedHookOptimizerModel ?? hookOptimizerData?.model ?? DEFAULT_MODELS[HOOK_OPTIMIZER_PROMPT_KEY];
  const currentSeniorEditorModel = selectedSeniorEditorModel ?? seniorEditorData?.model ?? DEFAULT_MODELS[SENIOR_EDITOR_PROMPT_KEY];

  // Check for prompt changes
  const brainstormerPromptChanged = editedBrainstormer !== null && editedBrainstormer !== (brainstormerData?.prompt ?? DEFAULT_BRAINSTORMER_PROMPT);
  const formalizerPromptChanged = editedFormalizer !== null && editedFormalizer !== (formalizerData?.prompt ?? DEFAULT_FORMALIZER_PROMPT);
  const writerPromptChanged = editedWriter !== null && editedWriter !== (writerData?.prompt ?? DEFAULT_WRITER_PROMPT);
  const hookOptimizerPromptChanged = editedHookOptimizer !== null && editedHookOptimizer !== (hookOptimizerData?.prompt ?? DEFAULT_HOOK_OPTIMIZER_PROMPT);
  const seniorEditorPromptChanged = editedSeniorEditor !== null && editedSeniorEditor !== (seniorEditorData?.prompt ?? DEFAULT_SENIOR_EDITOR_PROMPT);

  // Check for model changes
  const brainstormerModelChanged = selectedBrainstormerModel !== null && selectedBrainstormerModel !== (brainstormerData?.model ?? DEFAULT_MODELS[BRAINSTORMER_PROMPT_KEY]);
  const formalizerModelChanged = selectedFormalizerModel !== null && selectedFormalizerModel !== (formalizerData?.model ?? DEFAULT_MODELS[FORMALIZER_PROMPT_KEY]);
  const writerModelChanged = selectedWriterModel !== null && selectedWriterModel !== (writerData?.model ?? DEFAULT_MODELS[WRITER_PROMPT_KEY]);
  const hookOptimizerModelChanged = selectedHookOptimizerModel !== null && selectedHookOptimizerModel !== (hookOptimizerData?.model ?? DEFAULT_MODELS[HOOK_OPTIMIZER_PROMPT_KEY]);
  const seniorEditorModelChanged = selectedSeniorEditorModel !== null && selectedSeniorEditorModel !== (seniorEditorData?.model ?? DEFAULT_MODELS[SENIOR_EDITOR_PROMPT_KEY]);

  // Combined changes per stage
  const brainstormerChanged = brainstormerPromptChanged || brainstormerModelChanged;
  const formalizerChanged = formalizerPromptChanged || formalizerModelChanged;
  const writerChanged = writerPromptChanged || writerModelChanged;
  const hookOptimizerChanged = hookOptimizerPromptChanged || hookOptimizerModelChanged;
  const seniorEditorChanged = seniorEditorPromptChanged || seniorEditorModelChanged;
  
  const hasChanges = brainstormerChanged || formalizerChanged || writerChanged || hookOptimizerChanged || seniorEditorChanged;

  // Reset on close
  useEffect(() => {
    if (!open) {
      setEditedBrainstormer(null);
      setEditedFormalizer(null);
      setEditedWriter(null);
      setEditedHookOptimizer(null);
      setEditedSeniorEditor(null);
      setSelectedBrainstormerModel(null);
      setSelectedFormalizerModel(null);
      setSelectedWriterModel(null);
      setSelectedHookOptimizerModel(null);
      setSelectedSeniorEditorModel(null);
    }
  }, [open]);

  const handleSave = async () => {
    const promises: Promise<void>[] = [];
    
    if (brainstormerChanged) {
      promises.push(
        updatePrompt.mutateAsync({ 
          promptKey: BRAINSTORMER_PROMPT_KEY, 
          promptText: currentBrainstormer,
          modelId: currentBrainstormerModel
        })
      );
    }
    
    if (formalizerChanged) {
      promises.push(
        updatePrompt.mutateAsync({ 
          promptKey: FORMALIZER_PROMPT_KEY, 
          promptText: currentFormalizer,
          modelId: currentFormalizerModel
        })
      );
    }

    if (writerChanged) {
      promises.push(
        updatePrompt.mutateAsync({ 
          promptKey: WRITER_PROMPT_KEY, 
          promptText: currentWriter,
          modelId: currentWriterModel
        })
      );
    }

    if (hookOptimizerChanged) {
      promises.push(
        updatePrompt.mutateAsync({ 
          promptKey: HOOK_OPTIMIZER_PROMPT_KEY, 
          promptText: currentHookOptimizer,
          modelId: currentHookOptimizerModel
        })
      );
    }

    if (seniorEditorChanged) {
      promises.push(
        updatePrompt.mutateAsync({ 
          promptKey: SENIOR_EDITOR_PROMPT_KEY, 
          promptText: currentSeniorEditor,
          modelId: currentSeniorEditorModel
        })
      );
    }

    await Promise.all(promises);
    setOpen(false);
  };

  const handleResetBrainstormer = () => {
    if (window.confirm("Weet je zeker dat je wilt resetten naar de standaard prompt? Je huidige aanpassingen gaan verloren.")) {
      setEditedBrainstormer(DEFAULT_BRAINSTORMER_PROMPT);
      setSelectedBrainstormerModel(DEFAULT_MODELS[BRAINSTORMER_PROMPT_KEY]);
    }
  };
  const handleResetFormalizer = () => {
    if (window.confirm("Weet je zeker dat je wilt resetten naar de standaard prompt? Je huidige aanpassingen gaan verloren.")) {
      setEditedFormalizer(DEFAULT_FORMALIZER_PROMPT);
      setSelectedFormalizerModel(DEFAULT_MODELS[FORMALIZER_PROMPT_KEY]);
    }
  };
  const handleResetWriter = () => {
    if (window.confirm("Weet je zeker dat je wilt resetten naar de standaard prompt? Je huidige aanpassingen gaan verloren.")) {
      setEditedWriter(DEFAULT_WRITER_PROMPT);
      setSelectedWriterModel(DEFAULT_MODELS[WRITER_PROMPT_KEY]);
    }
  };
  const handleResetHookOptimizer = () => {
    if (window.confirm("Weet je zeker dat je wilt resetten naar de standaard prompt? Je huidige aanpassingen gaan verloren.")) {
      setEditedHookOptimizer(DEFAULT_HOOK_OPTIMIZER_PROMPT);
      setSelectedHookOptimizerModel(DEFAULT_MODELS[HOOK_OPTIMIZER_PROMPT_KEY]);
    }
  };
  const handleResetSeniorEditor = () => {
    if (window.confirm("Weet je zeker dat je wilt resetten naar de standaard prompt? Je huidige aanpassingen gaan verloren.")) {
      setEditedSeniorEditor(DEFAULT_SENIOR_EDITOR_PROMPT);
      setSelectedSeniorEditorModel(DEFAULT_MODELS[SENIOR_EDITOR_PROMPT_KEY]);
    }
  };

  const isLoading = brainstormerLoading || formalizerLoading || writerLoading || hookOptimizerLoading || seniorEditorLoading;

  // Context badges per tab
  const contextBadges: Record<TabType, string[]> = {
    brainstormer: [
      "project.name", "project.city", "project.description", 
      "project.price_from/to", "project.status", "project.highlights[]",
      "properties[].bedrooms", "properties[].living_area_m2", "properties[].features[]"
    ],
    formalizer: [
      "brainstormAnalysis", "project.name", "project.city", 
      "project.price_from/to", "project.status", "properties[]"
    ],
    writer: [
      "briefing.selectedAngle", "briefing.userContextNotes", 
      "briefing.selectedSpecs[]", "briefing.locationHint", 
      "briefing.ctaKeyword", "brainstormInsights"
    ],
    hookOptimizer: [
      "draftPost", "targetAudience", "projectName"
    ],
    seniorEditor: [
      "selectedHook", "draftBody", "draftCta", "targetAudience"
    ]
  };

  // Helper to get model label
  const getModelLabel = (modelId: string) => {
    return AVAILABLE_MODELS.find(m => m.id === modelId)?.label || modelId;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Prompts Configuratie
          </DialogTitle>
          <DialogDescription>
            Configureer de vijf AI agents: Brainstormer analyseert, Formalizer structureert, Writer schrijft, Hook optimaliseert, Editor polijst.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="flex w-full overflow-x-auto justify-start">
            <TabsTrigger value="brainstormer" className="shrink-0 flex items-center gap-1 text-xs">
              <Sparkles className="h-3 w-3" />
              <span className="hidden sm:inline">Brain</span>
              {brainstormerChanged && <span className="w-1.5 h-1.5 bg-primary rounded-full" />}
            </TabsTrigger>
            <TabsTrigger value="formalizer" className="shrink-0 flex items-center gap-1 text-xs">
              <ClipboardCheck className="h-3 w-3" />
              <span className="hidden sm:inline">Form</span>
              {formalizerChanged && <span className="w-1.5 h-1.5 bg-primary rounded-full" />}
            </TabsTrigger>
            <TabsTrigger value="writer" className="shrink-0 flex items-center gap-1 text-xs">
              <PenLine className="h-3 w-3" />
              <span className="hidden sm:inline">Write</span>
              {writerChanged && <span className="w-1.5 h-1.5 bg-primary rounded-full" />}
            </TabsTrigger>
            <TabsTrigger value="hookOptimizer" className="shrink-0 flex items-center gap-1 text-xs">
              <Zap className="h-3 w-3" />
              <span className="hidden sm:inline">Hook</span>
              {hookOptimizerChanged && <span className="w-1.5 h-1.5 bg-primary rounded-full" />}
            </TabsTrigger>
            <TabsTrigger value="seniorEditor" className="shrink-0 flex items-center gap-1 text-xs">
              <Edit3 className="h-3 w-3" />
              <span className="hidden sm:inline">Editor</span>
              {seniorEditorChanged && <span className="w-1.5 h-1.5 bg-primary rounded-full" />}
            </TabsTrigger>
          </TabsList>

          {/* Brainstormer Tab */}
          <TabsContent value="brainstormer" className="flex-1 flex flex-col min-h-0 mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Select value={currentBrainstormerModel} onValueChange={setSelectedBrainstormerModel}>
                  <SelectTrigger className="w-[180px] h-8">
                    <SelectValue>{getModelLabel(currentBrainstormerModel)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_MODELS.map(model => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex flex-col">
                          <span>{model.label}</span>
                          <span className="text-xs text-muted-foreground">{model.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant="outline">Creatief</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={handleResetBrainstormer} className="text-xs">
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            </div>
            {isLoading ? (
              <Skeleton className="flex-1 min-h-[300px]" />
            ) : (
              <Textarea
                value={currentBrainstormer}
                onChange={(e) => setEditedBrainstormer(e.target.value)}
                className="flex-1 min-h-[300px] font-mono text-sm resize-none"
                placeholder="Brainstormer prompt..."
              />
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Analyseert creatief en zoekt verborgen parels. Output is vrije tekst.
            </p>
          </TabsContent>

          {/* Formalizer Tab */}
          <TabsContent value="formalizer" className="flex-1 flex flex-col min-h-0 mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Select value={currentFormalizerModel} onValueChange={setSelectedFormalizerModel}>
                  <SelectTrigger className="w-[180px] h-8">
                    <SelectValue>{getModelLabel(currentFormalizerModel)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_MODELS.map(model => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex flex-col">
                          <span>{model.label}</span>
                          <span className="text-xs text-muted-foreground">{model.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant="outline">Strikt</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={handleResetFormalizer} className="text-xs">
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            </div>
            {isLoading ? (
              <Skeleton className="flex-1 min-h-[300px]" />
            ) : (
              <Textarea
                value={currentFormalizer}
                onChange={(e) => setEditedFormalizer(e.target.value)}
                className="flex-1 min-h-[300px] font-mono text-sm resize-none"
                placeholder="Formalizer prompt..."
              />
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Ontvangt brainstorm + data, genereert strikte JSON briefing.
            </p>
          </TabsContent>

          {/* Writer Tab */}
          <TabsContent value="writer" className="flex-1 flex flex-col min-h-0 mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Select value={currentWriterModel} onValueChange={setSelectedWriterModel}>
                  <SelectTrigger className="w-[180px] h-8">
                    <SelectValue>{getModelLabel(currentWriterModel)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_MODELS.map(model => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex flex-col">
                          <span>{model.label}</span>
                          <span className="text-xs text-muted-foreground">{model.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant="outline">Copywriting</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={handleResetWriter} className="text-xs">
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            </div>
            {isLoading ? (
              <Skeleton className="flex-1 min-h-[300px]" />
            ) : (
              <Textarea
                value={currentWriter}
                onChange={(e) => setEditedWriter(e.target.value)}
                className="flex-1 min-h-[300px] font-mono text-sm resize-none"
                placeholder="Writer prompt..."
              />
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Ontvangt strategische briefing, genereert LinkedIn posts met Smart CTA logica.
            </p>
          </TabsContent>

          {/* Hook Optimizer Tab */}
          <TabsContent value="hookOptimizer" className="flex-1 flex flex-col min-h-0 mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Select value={currentHookOptimizerModel} onValueChange={setSelectedHookOptimizerModel}>
                  <SelectTrigger className="w-[180px] h-8">
                    <SelectValue>{getModelLabel(currentHookOptimizerModel)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_MODELS.map(model => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex flex-col">
                          <span>{model.label}</span>
                          <span className="text-xs text-muted-foreground">{model.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant="outline">Viral Hooks</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={handleResetHookOptimizer} className="text-xs">
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            </div>
            {isLoading ? (
              <Skeleton className="flex-1 min-h-[300px]" />
            ) : (
              <Textarea
                value={currentHookOptimizer}
                onChange={(e) => setEditedHookOptimizer(e.target.value)}
                className="flex-1 min-h-[300px] font-mono text-sm resize-none"
                placeholder="Hook Optimizer prompt..."
              />
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Genereert 5 virale 'stop-the-scroll' openingszinnen per post variatie.
            </p>
          </TabsContent>

          {/* Senior Editor Tab */}
          <TabsContent value="seniorEditor" className="flex-1 flex flex-col min-h-0 mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Select value={currentSeniorEditorModel} onValueChange={setSelectedSeniorEditorModel}>
                  <SelectTrigger className="w-[180px] h-8">
                    <SelectValue>{getModelLabel(currentSeniorEditorModel)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_MODELS.map(model => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex flex-col">
                          <span>{model.label}</span>
                          <span className="text-xs text-muted-foreground">{model.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant="outline">Polish & Format</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={handleResetSeniorEditor} className="text-xs">
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            </div>
            {isLoading ? (
              <Skeleton className="flex-1 min-h-[300px]" />
            ) : (
              <Textarea
                value={currentSeniorEditor}
                onChange={(e) => setEditedSeniorEditor(e.target.value)}
                className="flex-1 min-h-[300px] font-mono text-sm resize-none"
                placeholder="Senior Editor prompt..."
              />
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Smedt hook + body samen tot perfecte LinkedIn opmaak met ritme en witruimte.
            </p>
          </TabsContent>
        </Tabs>

        {/* Context Info */}
        <div className="border-t pt-4 mt-4">
          <p className="text-xs text-muted-foreground mb-2">Beschikbare context voor {activeTab}:</p>
          <div className="flex flex-wrap gap-1">
            {contextBadges[activeTab].map((badge) => (
              <Badge key={badge} variant="outline" className="text-xs">
                {badge}
              </Badge>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuleren
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || updatePrompt.isPending}
          >
            {updatePrompt.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Opslaan...
              </>
            ) : (
              "Opslaan"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}