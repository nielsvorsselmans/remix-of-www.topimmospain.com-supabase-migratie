import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, RotateCcw, Brain, Wand2 } from "lucide-react";
import { useDeepAnalysisConfig, useUpdateDeepAnalysisConfig, AVAILABLE_MODELS, DEFAULT_PROMPT, DEFAULT_MODEL } from "@/hooks/useDeepAnalysisConfig";
import { useStructurerConfig, useUpdateStructurerConfig, DEFAULT_STRUCTURER_PROMPT } from "@/hooks/useStructurerConfig";

interface DeepAnalysisSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeepAnalysisSettingsDialog({ open, onOpenChange }: DeepAnalysisSettingsDialogProps) {
  // Brainstormer config
  const { data: brainstormerConfig, isLoading: loadingBrainstormer } = useDeepAnalysisConfig();
  const updateBrainstormer = useUpdateDeepAnalysisConfig();
  
  // Structurer config
  const { data: structurerConfig, isLoading: loadingStructurer } = useStructurerConfig();
  const updateStructurer = useUpdateStructurerConfig();
  
  // Brainstormer state
  const [brainstormPrompt, setBrainstormPrompt] = useState("");
  const [brainstormModel, setBrainstormModel] = useState(DEFAULT_MODEL);
  
  // Structurer state
  const [structurerPrompt, setStructurerPrompt] = useState("");
  const [structurerModel, setStructurerModel] = useState("google/gemini-2.5-flash");

  // Sync brainstormer state
  useEffect(() => {
    if (brainstormerConfig && open) {
      setBrainstormPrompt(brainstormerConfig.prompt_text);
      setBrainstormModel(brainstormerConfig.model_id || DEFAULT_MODEL);
    }
  }, [brainstormerConfig, open]);

  // Sync structurer state
  useEffect(() => {
    if (structurerConfig && open) {
      setStructurerPrompt(structurerConfig.prompt_text);
      setStructurerModel(structurerConfig.model_id || "google/gemini-2.5-flash");
    }
  }, [structurerConfig, open]);

  const hasBrainstormChanges = brainstormerConfig && (
    brainstormPrompt !== brainstormerConfig.prompt_text || 
    brainstormModel !== (brainstormerConfig.model_id || DEFAULT_MODEL)
  );

  const hasStructurerChanges = structurerConfig && (
    structurerPrompt !== structurerConfig.prompt_text || 
    structurerModel !== (structurerConfig.model_id || "google/gemini-2.5-flash")
  );

  const handleSaveBrainstorm = async () => {
    await updateBrainstormer.mutateAsync({ promptText: brainstormPrompt, modelId: brainstormModel });
  };

  const handleSaveStructurer = async () => {
    await updateStructurer.mutateAsync({ promptText: structurerPrompt, modelId: structurerModel });
  };

  const handleResetBrainstorm = () => {
    setBrainstormPrompt(DEFAULT_PROMPT);
    setBrainstormModel(DEFAULT_MODEL);
  };

  const handleResetStructurer = () => {
    setStructurerPrompt(DEFAULT_STRUCTURER_PROMPT);
    setStructurerModel("google/gemini-2.5-flash");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Deep Analysis Instellingen</DialogTitle>
          <DialogDescription>
            Configureer de AI prompts voor de twee stappen van Deep Analysis.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="brainstorm" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="brainstorm" className="gap-2">
              <Brain className="h-4 w-4" />
              Brainstormer
            </TabsTrigger>
            <TabsTrigger value="structurer" className="gap-2">
              <Wand2 className="h-4 w-4" />
              Structureerder
            </TabsTrigger>
          </TabsList>

          {/* Brainstormer Tab */}
          <TabsContent value="brainstorm" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Stap 1: Genereert een vrije-tekst strategische analyse op basis van alle project data.
            </p>

            <div className="space-y-2">
              <Label htmlFor="brainstorm-model">Model</Label>
              <Select value={brainstormModel} onValueChange={setBrainstormModel}>
                <SelectTrigger id="brainstorm-model" className="w-full">
                  <SelectValue placeholder="Selecteer een model" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_MODELS.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{model.label}</span>
                        <span className="text-xs text-muted-foreground">{model.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brainstorm-prompt">System Prompt</Label>
              <Textarea
                id="brainstorm-prompt"
                value={brainstormPrompt}
                onChange={(e) => setBrainstormPrompt(e.target.value)}
                className="min-h-[350px] font-mono text-sm leading-relaxed"
                placeholder="De system prompt voor de brainstormer..."
                disabled={loadingBrainstormer}
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleResetBrainstorm} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              <Button
                onClick={handleSaveBrainstorm}
                disabled={updateBrainstormer.isPending || !hasBrainstormChanges}
                className="gap-2"
              >
                {updateBrainstormer.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Opslaan...
                  </>
                ) : (
                  "Opslaan Brainstormer"
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Structurer Tab */}
          <TabsContent value="structurer" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Stap 2: Parseert de brainstorm naar gestructureerde JSON voor de detailpagina.
            </p>

            <div className="space-y-2">
              <Label htmlFor="structurer-model">Model</Label>
              <Select value={structurerModel} onValueChange={setStructurerModel}>
                <SelectTrigger id="structurer-model" className="w-full">
                  <SelectValue placeholder="Selecteer een model" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_MODELS.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{model.label}</span>
                        <span className="text-xs text-muted-foreground">{model.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="structurer-prompt">System Prompt</Label>
              <Textarea
                id="structurer-prompt"
                value={structurerPrompt}
                onChange={(e) => setStructurerPrompt(e.target.value)}
                className="min-h-[350px] font-mono text-sm leading-relaxed"
                placeholder="De system prompt voor de structureerder..."
                disabled={loadingStructurer}
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleResetStructurer} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              <Button
                onClick={handleSaveStructurer}
                disabled={updateStructurer.isPending || !hasStructurerChanges}
                className="gap-2"
              >
                {updateStructurer.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Opslaan...
                  </>
                ) : (
                  "Opslaan Structureerder"
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Sluiten
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
