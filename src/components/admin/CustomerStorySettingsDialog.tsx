import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, RotateCcw, Brain, Wand2 } from "lucide-react";
import {
  useBrainstormerConfig,
  useFormalizerConfig,
  useUpdateBrainstormerConfig,
  useUpdateFormalizerConfig,
  AVAILABLE_MODELS,
  DEFAULT_BRAINSTORMER_PROMPT,
  DEFAULT_BRAINSTORMER_MODEL,
  DEFAULT_FORMALIZER_PROMPT,
  DEFAULT_FORMALIZER_MODEL,
} from "@/hooks/useCustomerStoryConfig";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerStorySettingsDialog({ open, onOpenChange }: Props) {
  const { data: brainstormerConfig, isLoading: loadingBrainstormer } = useBrainstormerConfig();
  const { data: formalizerConfig, isLoading: loadingFormalizer } = useFormalizerConfig();
  const updateBrainstormer = useUpdateBrainstormerConfig();
  const updateFormalizer = useUpdateFormalizerConfig();

  const [brainstormPrompt, setBrainstormPrompt] = useState("");
  const [brainstormModel, setBrainstormModel] = useState(DEFAULT_BRAINSTORMER_MODEL);
  const [formalizerPrompt, setFormalizerPrompt] = useState("");
  const [formalizerModel, setFormalizerModel] = useState(DEFAULT_FORMALIZER_MODEL);

  useEffect(() => {
    if (brainstormerConfig && open) {
      setBrainstormPrompt(brainstormerConfig.prompt_text);
      setBrainstormModel(brainstormerConfig.model_id || DEFAULT_BRAINSTORMER_MODEL);
    }
  }, [brainstormerConfig, open]);

  useEffect(() => {
    if (formalizerConfig && open) {
      setFormalizerPrompt(formalizerConfig.prompt_text);
      setFormalizerModel(formalizerConfig.model_id || DEFAULT_FORMALIZER_MODEL);
    }
  }, [formalizerConfig, open]);

  const hasBrainstormChanges = brainstormerConfig && (
    brainstormPrompt !== brainstormerConfig.prompt_text ||
    brainstormModel !== (brainstormerConfig.model_id || DEFAULT_BRAINSTORMER_MODEL)
  );

  const hasFormalizerChanges = formalizerConfig && (
    formalizerPrompt !== formalizerConfig.prompt_text ||
    formalizerModel !== (formalizerConfig.model_id || DEFAULT_FORMALIZER_MODEL)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Klantverhaal AI Instellingen</DialogTitle>
          <DialogDescription>
            Configureer de AI prompts en modellen voor het genereren van klantverhalen.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="brainstorm" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="brainstorm" className="gap-2">
              <Brain className="h-4 w-4" />
              Brainstormer
            </TabsTrigger>
            <TabsTrigger value="formalizer" className="gap-2">
              <Wand2 className="h-4 w-4" />
              Formalizer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="brainstorm" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Stap 1: Genereert een vrije-tekst narratieve analyse op basis van het klantdossier.
            </p>

            <div className="space-y-2">
              <Label htmlFor="cs-brainstorm-model">Model</Label>
              <Select value={brainstormModel} onValueChange={setBrainstormModel}>
                <SelectTrigger id="cs-brainstorm-model" className="w-full">
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
              <Label htmlFor="cs-brainstorm-prompt">System Prompt</Label>
              <Textarea
                id="cs-brainstorm-prompt"
                value={brainstormPrompt}
                onChange={(e) => setBrainstormPrompt(e.target.value)}
                className="min-h-[350px] font-mono text-sm leading-relaxed"
                placeholder="De system prompt voor de brainstormer..."
                disabled={loadingBrainstormer}
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => { setBrainstormPrompt(DEFAULT_BRAINSTORMER_PROMPT); setBrainstormModel(DEFAULT_BRAINSTORMER_MODEL); }} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              <Button
                onClick={() => updateBrainstormer.mutateAsync({ promptText: brainstormPrompt, modelId: brainstormModel })}
                disabled={updateBrainstormer.isPending || !hasBrainstormChanges}
                className="gap-2"
              >
                {updateBrainstormer.isPending ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Opslaan...</>
                ) : "Opslaan Brainstormer"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="formalizer" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Stap 2: Structureert de brainstorm naar een JSON case study format.
            </p>

            <div className="space-y-2">
              <Label htmlFor="cs-formalizer-model">Model</Label>
              <Select value={formalizerModel} onValueChange={setFormalizerModel}>
                <SelectTrigger id="cs-formalizer-model" className="w-full">
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
              <Label htmlFor="cs-formalizer-prompt">System Prompt</Label>
              <Textarea
                id="cs-formalizer-prompt"
                value={formalizerPrompt}
                onChange={(e) => setFormalizerPrompt(e.target.value)}
                className="min-h-[350px] font-mono text-sm leading-relaxed"
                placeholder="De system prompt voor de formalizer..."
                disabled={loadingFormalizer}
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => { setFormalizerPrompt(DEFAULT_FORMALIZER_PROMPT); setFormalizerModel(DEFAULT_FORMALIZER_MODEL); }} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              <Button
                onClick={() => updateFormalizer.mutateAsync({ promptText: formalizerPrompt, modelId: formalizerModel })}
                disabled={updateFormalizer.isPending || !hasFormalizerChanges}
                className="gap-2"
              >
                {updateFormalizer.isPending ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Opslaan...</>
                ) : "Opslaan Formalizer"}
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
