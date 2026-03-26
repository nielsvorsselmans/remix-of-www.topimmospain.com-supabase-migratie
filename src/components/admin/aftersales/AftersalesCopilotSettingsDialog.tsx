import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, RotateCcw, MessageSquare, ClipboardList } from "lucide-react";
import {
  useChatConfig,
  useBriefingConfig,
  useUpdateChatConfig,
  useUpdateBriefingConfig,
  AVAILABLE_MODELS,
  DEFAULT_CHAT_PROMPT,
  DEFAULT_CHAT_MODEL,
  DEFAULT_BRIEFING_PROMPT,
  DEFAULT_BRIEFING_MODEL,
} from "@/hooks/useAftersalesCopilotConfig";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AftersalesCopilotSettingsDialog({ open, onOpenChange }: Props) {
  const { data: chatConfig, isLoading: loadingChat } = useChatConfig();
  const { data: briefingConfig, isLoading: loadingBriefing } = useBriefingConfig();
  const updateChat = useUpdateChatConfig();
  const updateBriefing = useUpdateBriefingConfig();

  const [chatPrompt, setChatPrompt] = useState("");
  const [chatModel, setChatModel] = useState(DEFAULT_CHAT_MODEL);
  const [briefingPrompt, setBriefingPrompt] = useState("");
  const [briefingModel, setBriefingModel] = useState(DEFAULT_BRIEFING_MODEL);

  useEffect(() => {
    if (chatConfig && open) {
      setChatPrompt(chatConfig.prompt_text);
      setChatModel(chatConfig.model_id || DEFAULT_CHAT_MODEL);
    }
  }, [chatConfig, open]);

  useEffect(() => {
    if (briefingConfig && open) {
      setBriefingPrompt(briefingConfig.prompt_text);
      setBriefingModel(briefingConfig.model_id || DEFAULT_BRIEFING_MODEL);
    }
  }, [briefingConfig, open]);

  const hasChatChanges = chatConfig && (
    chatPrompt !== chatConfig.prompt_text ||
    chatModel !== (chatConfig.model_id || DEFAULT_CHAT_MODEL)
  );

  const hasBriefingChanges = briefingConfig && (
    briefingPrompt !== briefingConfig.prompt_text ||
    briefingModel !== (briefingConfig.model_id || DEFAULT_BRIEFING_MODEL)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Copilot AI Instellingen</DialogTitle>
          <DialogDescription>
            Configureer de AI prompts en modellen voor de Aftersales Copilot chat en briefings.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat Copilot
            </TabsTrigger>
            <TabsTrigger value="briefing" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Briefing Copilot
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              De interactieve chat-assistent. De dynamische verkoopcontext (taken, fases, betalingen) wordt automatisch toegevoegd.
            </p>

            <div className="space-y-2">
              <Label htmlFor="copilot-chat-model">Model</Label>
              <Select value={chatModel} onValueChange={setChatModel}>
                <SelectTrigger id="copilot-chat-model" className="w-full">
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
              <Label htmlFor="copilot-chat-prompt">System Prompt</Label>
              <Textarea
                id="copilot-chat-prompt"
                value={chatPrompt}
                onChange={(e) => setChatPrompt(e.target.value)}
                className="min-h-[350px] font-mono text-sm leading-relaxed"
                placeholder="De system prompt voor de chat copilot..."
                disabled={loadingChat}
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => { setChatPrompt(DEFAULT_CHAT_PROMPT); setChatModel(DEFAULT_CHAT_MODEL); }} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              <Button
                onClick={() => updateChat.mutateAsync({ promptText: chatPrompt, modelId: chatModel })}
                disabled={updateChat.isPending || !hasChatChanges}
                className="gap-2"
              >
                {updateChat.isPending ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Opslaan...</>
                ) : "Opslaan Chat"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="briefing" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              De one-shot briefing generator. Produceert een geprioriteerde actielijst per verkoop.
            </p>

            <div className="space-y-2">
              <Label htmlFor="copilot-briefing-model">Model</Label>
              <Select value={briefingModel} onValueChange={setBriefingModel}>
                <SelectTrigger id="copilot-briefing-model" className="w-full">
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
              <Label htmlFor="copilot-briefing-prompt">System Prompt</Label>
              <Textarea
                id="copilot-briefing-prompt"
                value={briefingPrompt}
                onChange={(e) => setBriefingPrompt(e.target.value)}
                className="min-h-[350px] font-mono text-sm leading-relaxed"
                placeholder="De system prompt voor de briefing copilot..."
                disabled={loadingBriefing}
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => { setBriefingPrompt(DEFAULT_BRIEFING_PROMPT); setBriefingModel(DEFAULT_BRIEFING_MODEL); }} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              <Button
                onClick={() => updateBriefing.mutateAsync({ promptText: briefingPrompt, modelId: briefingModel })}
                disabled={updateBriefing.isPending || !hasBriefingChanges}
                className="gap-2"
              >
                {updateBriefing.isPending ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Opslaan...</>
                ) : "Opslaan Briefing"}
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
