import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, X, Plus, RefreshCw, Loader2 } from "lucide-react";
import { GeneratedSummary } from "@/hooks/useGenerateSummary";
import ReactMarkdown from "react-markdown";

const SUMMARY_CATEGORIES = [
  { value: "orientatie", label: "Oriëntatie" },
  { value: "financiering", label: "Financiering" },
  { value: "regio", label: "Regio" },
  { value: "rendement", label: "Rendement" },
  { value: "proces", label: "Proces" },
  { value: "bezichtiging", label: "Bezichtiging" },
];

interface SummaryReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generatedSummary: GeneratedSummary | null;
  onSave: (summary: GeneratedSummary & { isPublished: boolean }) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

export function SummaryReviewDialog({
  open,
  onOpenChange,
  generatedSummary,
  onSave,
  onRegenerate,
  isRegenerating,
}: SummaryReviewDialogProps) {
  const [headline, setHeadline] = useState("");
  const [summaryShort, setSummaryShort] = useState("");
  const [summaryFull, setSummaryFull] = useState("");
  const [category, setCategory] = useState("");
  const [clientPseudonym, setClientPseudonym] = useState("");
  const [keyTopics, setKeyTopics] = useState<string[]>([]);
  const [newTopic, setNewTopic] = useState("");
  const [isPublished, setIsPublished] = useState(true);

  useEffect(() => {
    if (generatedSummary) {
      setHeadline(generatedSummary.headline || "");
      setSummaryShort(generatedSummary.summaryShort || "");
      setSummaryFull(generatedSummary.summaryFull || "");
      setCategory(generatedSummary.category || "orientatie");
      setClientPseudonym(generatedSummary.clientPseudonym || "");
      setKeyTopics(generatedSummary.keyTopics || []);
      setIsPublished(true);
    }
  }, [generatedSummary]);

  const handleAddTopic = () => {
    if (newTopic.trim() && !keyTopics.includes(newTopic.trim())) {
      setKeyTopics([...keyTopics, newTopic.trim()]);
      setNewTopic("");
    }
  };

  const handleRemoveTopic = (topic: string) => {
    setKeyTopics(keyTopics.filter((t) => t !== topic));
  };

  const handleSave = () => {
    onSave({
      headline,
      summaryShort,
      summaryFull,
      category,
      clientPseudonym,
      keyTopics,
      isPublished,
    });
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Samenvatting gegenereerd
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Headline */}
          <div className="space-y-2">
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Korte, pakkende titel..."
              maxLength={60}
            />
            <p className="text-xs text-muted-foreground text-right">
              {headline.length}/60 karakters
            </p>
          </div>

          {/* Full Summary Preview (read-only) */}
          {summaryFull && (
            <div className="space-y-2">
              <Label>Uitgebreide samenvatting (preview)</Label>
              <div className="bg-muted/50 rounded-lg p-4 prose prose-sm max-w-none max-h-[200px] overflow-y-auto prose-headings:font-semibold prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground">
                <ReactMarkdown>{summaryFull}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Short Summary */}
          <div className="space-y-2">
            <Label htmlFor="summaryShort">Korte preview</Label>
            <Textarea
              id="summaryShort"
              value={summaryShort}
              onChange={(e) => setSummaryShort(e.target.value)}
              placeholder="Korte samenvatting van het gesprek..."
              rows={3}
              maxLength={150}
            />
            <p className="text-xs text-muted-foreground text-right">
              {summaryShort.length}/150 karakters
            </p>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Categorie</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Selecteer categorie" />
              </SelectTrigger>
              <SelectContent>
                {SUMMARY_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client Pseudonym */}
          <div className="space-y-2">
            <Label htmlFor="clientPseudonym">Anonieme omschrijving</Label>
            <Input
              id="clientPseudonym"
              value={clientPseudonym}
              onChange={(e) => setClientPseudonym(e.target.value)}
              placeholder="Bijv. 'Een investeerder uit Nederland'"
            />
          </div>

          {/* Key Topics */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {keyTopics.map((topic) => (
                <Badge
                  key={topic}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {topic}
                  <button
                    type="button"
                    onClick={() => handleRemoveTopic(topic)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="Nieuwe tag..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTopic();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddTopic}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Publish Checkbox */}
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="publish"
              checked={isPublished}
              onCheckedChange={(checked) => setIsPublished(checked === true)}
            />
            <Label htmlFor="publish" className="text-sm cursor-pointer">
              Publiceren als inspiratie
            </Label>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="w-full sm:w-auto"
          >
            {isRegenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Regenereer
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              className="flex-1 sm:flex-none"
            >
              Annuleren
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-none"
            >
              {isPublished ? "Opslaan en Publiceren" : "Opslaan"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
