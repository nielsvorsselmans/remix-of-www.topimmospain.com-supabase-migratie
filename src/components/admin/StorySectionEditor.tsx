import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";

export interface StorySection {
  type: string;
  title: string;
  content: string;
  metrics?: Record<string, string>;
}

export interface StorySections {
  sections: StorySection[];
}

const KNOWN_SECTION_TYPES = [
  { type: "achtergrond", label: "Achtergrond" },
  { type: "zoektocht", label: "Zoektocht" },
  { type: "uitdaging", label: "Uitdaging" },
  { type: "oplossing", label: "Oplossing" },
  { type: "resultaat", label: "Resultaat" },
  { type: "tip", label: "Tip" },
  { type: "quote_highlight", label: "Kernquote" },
];

const TYPE_COLORS: Record<string, string> = {
  achtergrond: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  zoektocht: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  uitdaging: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  oplossing: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  resultaat: "bg-primary/10 text-primary border-primary/20",
  tip: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
  quote_highlight: "bg-pink-500/10 text-pink-700 border-pink-500/20",
};

const FALLBACK_COLOR = "bg-muted text-muted-foreground border-border";

interface StorySectionEditorProps {
  value: StorySections | null;
  onChange: (value: StorySections) => void;
}

export function StorySectionEditor({ value, onChange }: StorySectionEditorProps) {
  const sections = value?.sections || [];
  const [customType, setCustomType] = useState("");

  const updateSection = (index: number, updates: Partial<StorySection>) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], ...updates };
    onChange({ sections: newSections });
  };

  const removeSection = (index: number) => {
    onChange({ sections: sections.filter((_, i) => i !== index) });
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    const newSections = [...sections];
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    onChange({ sections: newSections });
  };

  const addSection = (type: string, label?: string) => {
    const known = KNOWN_SECTION_TYPES.find(t => t.type === type);
    onChange({
      sections: [
        ...sections,
        {
          type,
          title: label || known?.label || type,
          content: "",
        },
      ],
    });
  };

  const addCustomSection = () => {
    const trimmed = customType.trim();
    if (!trimmed) return;
    const typeKey = trimmed.toLowerCase().replace(/\s+/g, "_");
    addSection(typeKey, trimmed);
    setCustomType("");
  };

  // Preset types not yet used
  const availablePresets = KNOWN_SECTION_TYPES.filter(
    t => !sections.some(s => s.type === t.type)
  );

  const getTypeColor = (type: string) => TYPE_COLORS[type] || FALLBACK_COLOR;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Verhaal secties</Label>
        <span className="text-xs text-muted-foreground">{sections.length} secties</span>
      </div>

      {sections.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nog geen secties. Voeg secties toe of genereer ze met AI.
        </div>
      )}

      {sections.map((section, index) => (
        <Card key={index} className="overflow-hidden">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Badge variant="outline" className={`text-[10px] ${getTypeColor(section.type)}`}>
                {section.type}
              </Badge>
              <Input
                value={section.title}
                onChange={e => updateSection(index, { title: e.target.value })}
                className="h-7 text-sm font-medium flex-1"
                placeholder="Sectie titel"
              />
              <div className="flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => moveSection(index, "up")}
                  disabled={index === 0}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => moveSection(index, "down")}
                  disabled={index === sections.length - 1}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => removeSection(index)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Textarea
              value={section.content}
              onChange={e => updateSection(index, { content: e.target.value })}
              placeholder="Inhoud van deze sectie..."
              className="min-h-[80px] text-sm"
            />
            {section.type === "resultaat" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">ROI</Label>
                  <Input
                    value={section.metrics?.roi || ""}
                    onChange={e => updateSection(index, { metrics: { ...section.metrics, roi: e.target.value } })}
                    placeholder="bijv. 8.2%"
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Tevredenheid</Label>
                  <Input
                    value={section.metrics?.tevredenheid || ""}
                    onChange={e => updateSection(index, { metrics: { ...section.metrics, tevredenheid: e.target.value } })}
                    placeholder="bijv. 9/10"
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Preset type buttons */}
      {availablePresets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {availablePresets.map(type => (
            <Button
              key={type.type}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => addSection(type.type)}
            >
              <Plus className="h-3 w-3" />
              {type.label}
            </Button>
          ))}
        </div>
      )}

      {/* Custom section type input */}
      <div className="flex gap-2">
        <Input
          value={customType}
          onChange={e => setCustomType(e.target.value)}
          placeholder="Eigen sectie-type toevoegen..."
          className="h-8 text-xs"
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomSection(); } }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1 whitespace-nowrap"
          onClick={addCustomSection}
          disabled={!customType.trim()}
        >
          <Plus className="h-3 w-3" />
          Toevoegen
        </Button>
      </div>
    </div>
  );
}
