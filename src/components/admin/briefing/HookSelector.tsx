import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Zap, Lightbulb, ArrowLeft, Check, SkipForward } from "lucide-react";

export interface HookOptions {
  analysis: string;
  patternInterrupt: string;
  specificityHook: string;
  velvetRope: string;
  contrarian: string;
  imaginationOrBenefit: string;
}

export interface SelectedHooksState {
  variation1: string[];
  variation2: string[];
  skipVariation1: boolean;
  skipVariation2: boolean;
}

interface HookSelectorProps {
  hookOptionsVariation1: HookOptions;
  hookOptionsVariation2: HookOptions;
  selectedHooks: SelectedHooksState;
  onSelectHook: (variation: "variation1" | "variation2", hookKey: string) => void;
  onToggleSkip: (variation: "variation1" | "variation2") => void;
  onConfirm: () => void;
  onBack: () => void;
  projectName: string;
}

const HOOK_LABELS: Record<string, { label: string; description: string }> = {
  patternInterrupt: { label: "Pattern Interrupt", description: "Visueel/Gewaagd met emoji" },
  specificityHook: { label: "Specificity Hook", description: "Harde cijfers en feiten" },
  velvetRope: { label: "Velvet Rope", description: "Mysterie en schaarste" },
  contrarian: { label: "Contrarian", description: "Tegen de verwachting in" },
  imaginationOrBenefit: { label: "Imagination/Benefit", description: "Sfeer of directe voordeel" },
};

const hookKeys = ["patternInterrupt", "specificityHook", "velvetRope", "contrarian", "imaginationOrBenefit"] as const;

function HookCheckboxGroup({
  options,
  selectedHooks,
  onToggle,
  isSkipped,
  onToggleSkip,
  variationLabel,
}: {
  options: HookOptions;
  selectedHooks: string[];
  onToggle: (hookKey: string) => void;
  isSkipped: boolean;
  onToggleSkip: () => void;
  variationLabel: string;
}) {
  return (
    <div className="space-y-4">
      {/* Skip toggle */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <SkipForward className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor={`skip-${variationLabel}`} className="text-sm cursor-pointer">
            Sla deze variatie over
          </Label>
        </div>
        <Switch
          id={`skip-${variationLabel}`}
          checked={isSkipped}
          onCheckedChange={onToggleSkip}
        />
      </div>

      {isSkipped ? (
        <div className="text-center py-8 text-muted-foreground">
          <SkipForward className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Deze variatie wordt overgeslagen</p>
        </div>
      ) : (
        <>
          {/* Analysis insight */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Golden Nugget Analyse</p>
                <p className="text-sm">{options.analysis}</p>
              </div>
            </div>
          </div>

          {/* Selected count indicator */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Selecteer 1 of meerdere hooks:</span>
            <Badge variant={selectedHooks.length > 0 ? "default" : "secondary"}>
              {selectedHooks.length} geselecteerd
            </Badge>
          </div>

          {/* Hook options as checkboxes */}
          <div className="space-y-3">
            {hookKeys.map((key) => {
              const hookText = options[key];
              const { label, description } = HOOK_LABELS[key];
              const isSelected = selectedHooks.includes(key);

              return (
                <div
                  key={key}
                  className={`relative border rounded-lg p-4 transition-all cursor-pointer hover:border-primary/50 ${
                    isSelected ? "border-primary bg-primary/5" : "border-border"
                  }`}
                  onClick={() => onToggle(key)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggle(key)}
                      id={`${variationLabel}-${key}`}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <Label 
                        htmlFor={`${variationLabel}-${key}`} 
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{description}</span>
                        </div>
                        <p className="text-sm font-medium whitespace-pre-wrap">{hookText}</p>
                      </Label>
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function HookSelector({
  hookOptionsVariation1,
  hookOptionsVariation2,
  selectedHooks,
  onSelectHook,
  onToggleSkip,
  onConfirm,
  onBack,
  projectName,
}: HookSelectorProps) {
  // Calculate total selected posts
  const totalV1 = selectedHooks.skipVariation1 ? 0 : selectedHooks.variation1.length;
  const totalV2 = selectedHooks.skipVariation2 ? 0 : selectedHooks.variation2.length;
  const totalSelected = totalV1 + totalV2;

  // Require at least 1 hook to be selected (unless both variations are skipped)
  const canConfirm = totalSelected > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Hook Optimizer
            </CardTitle>
            <CardDescription>
              Selecteer hooks voor {projectName} - meerdere selecties mogelijk
            </CardDescription>
          </div>
          {totalSelected > 0 && (
            <Badge variant="default" className="text-sm">
              {totalSelected} post{totalSelected !== 1 ? "s" : ""} geselecteerd
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="variation1" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="variation1" className="flex items-center gap-2">
              Variatie 1
              {selectedHooks.skipVariation1 ? (
                <SkipForward className="h-3 w-3 text-muted-foreground" />
              ) : totalV1 > 0 ? (
                <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {totalV1}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="variation2" className="flex items-center gap-2">
              Variatie 2
              {selectedHooks.skipVariation2 ? (
                <SkipForward className="h-3 w-3 text-muted-foreground" />
              ) : totalV2 > 0 ? (
                <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {totalV2}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="variation1" className="mt-4">
            <HookCheckboxGroup
              options={hookOptionsVariation1}
              selectedHooks={selectedHooks.variation1}
              onToggle={(hookKey) => onSelectHook("variation1", hookKey)}
              isSkipped={selectedHooks.skipVariation1}
              onToggleSkip={() => onToggleSkip("variation1")}
              variationLabel="v1"
            />
          </TabsContent>
          
          <TabsContent value="variation2" className="mt-4">
            <HookCheckboxGroup
              options={hookOptionsVariation2}
              selectedHooks={selectedHooks.variation2}
              onToggle={(hookKey) => onSelectHook("variation2", hookKey)}
              isSkipped={selectedHooks.skipVariation2}
              onToggleSkip={() => onToggleSkip("variation2")}
              variationLabel="v2"
            />
          </TabsContent>
        </Tabs>

        {/* Summary */}
        {totalSelected > 0 && (
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <p className="font-medium mb-1">Samenvatting:</p>
            <ul className="text-muted-foreground space-y-1">
              {totalV1 > 0 && (
                <li>• Variatie 1: {totalV1} hook{totalV1 !== 1 ? "s" : ""} → {totalV1} post{totalV1 !== 1 ? "s" : ""}</li>
              )}
              {totalV2 > 0 && (
                <li>• Variatie 2: {totalV2} hook{totalV2 !== 1 ? "s" : ""} → {totalV2} post{totalV2 !== 1 ? "s" : ""}</li>
              )}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onBack} className="flex-1">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Terug naar Briefing
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={!canConfirm}
            className="flex-1"
          >
            <Check className="h-4 w-4 mr-2" />
            {canConfirm 
              ? `Polish ${totalSelected} Post${totalSelected !== 1 ? "s" : ""}`
              : "Selecteer minimaal 1 hook"
            }
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
