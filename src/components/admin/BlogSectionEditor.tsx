import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  GripVertical, 
  Trash2, 
  Plus, 
  Heading2, 
  AlignLeft, 
  List,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ContentSection {
  id: string;
  type: 'paragraph' | 'heading' | 'list';
  content?: string;
  level?: number;
  items?: string[];
}

interface BlogSectionEditorProps {
  sections: ContentSection[];
  onChange: (sections: ContentSection[]) => void;
}

// Parse database JSON content to sections
export function parseContentFromDb(content: any): ContentSection[] {
  if (!content) return [];
  
  // If it's a string (old HTML format), create a single paragraph
  if (typeof content === 'string') {
    if (!content.trim()) return [];
    return [{
      id: crypto.randomUUID(),
      type: 'paragraph',
      content: content
    }];
  }
  
  // Zoek sections in beide mogelijke locaties
  let sections = null;
  
  // Nieuw formaat: content.sections
  if (content.sections && Array.isArray(content.sections)) {
    sections = content.sections;
  }
  // Oud formaat: content.html.sections
  else if (content.html?.sections && Array.isArray(content.html.sections)) {
    sections = content.html.sections;
  }
  
  if (sections) {
    return sections.map((section: any) => ({
      id: crypto.randomUUID(),
      type: section.type || 'paragraph',
      content: section.content || '',
      level: section.level,
      items: section.items || []
    }));
  }
  
  return [];
}

// Serialize sections back to database format
export function serializeContentToDb(sections: ContentSection[]): { sections: Array<{ type: string; level?: number; content?: string; items?: string[] }> } {
  return {
    sections: sections.map(section => {
      const base: { type: string; level?: number; content?: string; items?: string[] } = { type: section.type };
      if (section.type === 'heading') {
        base.level = section.level || 2;
        base.content = section.content || '';
      } else if (section.type === 'paragraph') {
        base.content = section.content || '';
      } else if (section.type === 'list') {
        base.items = section.items || [];
      }
      return base;
    })
  };
}

export function BlogSectionEditor({ sections, onChange }: BlogSectionEditorProps) {
  const addSection = (type: 'heading' | 'paragraph' | 'list') => {
    const newSection: ContentSection = {
      id: crypto.randomUUID(),
      type,
      content: type !== 'list' ? '' : undefined,
      level: type === 'heading' ? 2 : undefined,
      items: type === 'list' ? [''] : undefined
    };
    onChange([...sections, newSection]);
  };

  const updateSection = (id: string, updates: Partial<ContentSection>) => {
    onChange(sections.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeSection = (id: string) => {
    onChange(sections.filter(s => s.id !== id));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    onChange(newSections);
  };

  const addListItem = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (section && section.items) {
      updateSection(sectionId, { items: [...section.items, ''] });
    }
  };

  const updateListItem = (sectionId: string, itemIndex: number, value: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (section && section.items) {
      const newItems = [...section.items];
      newItems[itemIndex] = value;
      updateSection(sectionId, { items: newItems });
    }
  };

  const removeListItem = (sectionId: string, itemIndex: number) => {
    const section = sections.find(s => s.id === sectionId);
    if (section && section.items && section.items.length > 1) {
      const newItems = section.items.filter((_, i) => i !== itemIndex);
      updateSection(sectionId, { items: newItems });
    }
  };

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'heading': return <Heading2 className="h-4 w-4" />;
      case 'paragraph': return <AlignLeft className="h-4 w-4" />;
      case 'list': return <List className="h-4 w-4" />;
      default: return null;
    }
  };

  const getSectionLabel = (type: string) => {
    switch (type) {
      case 'heading': return 'Koptekst';
      case 'paragraph': return 'Paragraaf';
      case 'list': return 'Lijst';
      default: return type;
    }
  };

  return (
    <div className="space-y-3">
      {/* Add section button */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Sectie toevoegen
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => addSection('heading')}>
            <Heading2 className="h-4 w-4 mr-2" />
            Koptekst (H2/H3)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addSection('paragraph')}>
            <AlignLeft className="h-4 w-4 mr-2" />
            Paragraaf
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addSection('list')}>
            <List className="h-4 w-4 mr-2" />
            Opsommingslijst
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sections list */}
      {sections.length === 0 && (
        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
          <p className="text-sm">Nog geen content secties.</p>
          <p className="text-xs mt-1">Klik op "Sectie toevoegen" om te beginnen.</p>
        </div>
      )}

      {sections.map((section, index) => (
        <div 
          key={section.id} 
          className="border rounded-lg bg-card overflow-hidden"
        >
          {/* Section header */}
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              {getSectionIcon(section.type)}
              <span>{getSectionLabel(section.type)}</span>
            </div>
            
            {section.type === 'heading' && (
              <Select
                value={String(section.level || 2)}
                onValueChange={(v) => updateSection(section.id, { level: parseInt(v) })}
              >
                <SelectTrigger className="h-7 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">H2</SelectItem>
                  <SelectItem value="3">H3</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            <div className="ml-auto flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => moveSection(index, 'up')}
                disabled={index === 0}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => moveSection(index, 'down')}
                disabled={index === sections.length - 1}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => removeSection(section.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Section content */}
          <div className="p-3">
            {section.type === 'heading' && (
              <Input
                value={section.content || ''}
                onChange={(e) => updateSection(section.id, { content: e.target.value })}
                placeholder="Voer koptekst in..."
                className={cn(
                  "font-semibold",
                  section.level === 2 ? "text-lg" : "text-base"
                )}
              />
            )}

            {section.type === 'paragraph' && (
              <Textarea
                value={section.content || ''}
                onChange={(e) => updateSection(section.id, { content: e.target.value })}
                placeholder="Voer paragraaf tekst in..."
                rows={4}
                className="resize-y"
              />
            )}

            {section.type === 'list' && (
              <div className="space-y-2">
                {section.items?.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex items-start gap-2">
                    <span className="text-muted-foreground mt-2.5">•</span>
                    <Input
                      value={item}
                      onChange={(e) => updateListItem(section.id, itemIndex, e.target.value)}
                      placeholder="Lijst item..."
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      onClick={() => removeListItem(section.id, itemIndex)}
                      disabled={section.items?.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => addListItem(section.id)}
                  className="text-muted-foreground"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Item toevoegen
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
