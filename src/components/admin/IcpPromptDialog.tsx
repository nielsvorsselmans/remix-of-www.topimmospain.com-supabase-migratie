import { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useIcpPrompt, useUpdateIcpPrompt, DEFAULT_ICP_PROMPT } from "@/hooks/useIcpPrompt";

export function IcpPromptDialog() {
  const [open, setOpen] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState<string | null>(null);

  const { data: promptData, isLoading } = useIcpPrompt();
  const updatePrompt = useUpdateIcpPrompt();

  const currentPrompt = editedPrompt ?? promptData?.prompt_text ?? DEFAULT_ICP_PROMPT;
  const hasChanges = editedPrompt !== null && editedPrompt !== (promptData?.prompt_text ?? DEFAULT_ICP_PROMPT);

  // Reset edited state when dialog closes
  useEffect(() => {
    if (!open) {
      setEditedPrompt(null);
    }
  }, [open]);

  const handleSave = async () => {
    await updatePrompt.mutateAsync(currentPrompt);
    setEditedPrompt(null);
  };

  const handleReset = () => {
    setEditedPrompt(DEFAULT_ICP_PROMPT);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          ICP Prompt
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ICP Validatie Prompt
            <Badge variant="secondary" className="font-normal">
              google/gemini-2.5-flash
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Pas de AI prompt aan voor ICP-validatie van inzichten. Beschikbare variabelen:{" "}
            <code className="mx-1 px-1 py-0.5 bg-muted rounded text-xs">{"{label}"}</code>
            <code className="mx-1 px-1 py-0.5 bg-muted rounded text-xs">{"{normalized_insight}"}</code>
            <code className="mx-1 px-1 py-0.5 bg-muted rounded text-xs">{"{theme}"}</code>
            <code className="mx-1 px-1 py-0.5 bg-muted rounded text-xs">{"{impact}"}</code>
            <code className="mx-1 px-1 py-0.5 bg-muted rounded text-xs">{"{frequency}"}</code>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 mt-4">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              <Textarea
                value={currentPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                className="flex-1 min-h-[400px] font-mono text-sm resize-none"
                placeholder="Voer de prompt in..."
              />
              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                >
                  Reset naar standaard
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updatePrompt.isPending || !hasChanges}
                  size="sm"
                >
                  {updatePrompt.isPending ? "Opslaan..." : "Opslaan"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
