import { useState, useEffect } from "react";
import { Settings, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAnalysisPrompt, useUpdateAnalysisPrompt } from "@/hooks/useConversations";

const DEFAULT_PROMPT = `Jij bent een Expert Consumentenpsycholoog en Senior Data Analist.

Je analyseert ruwe notities van oriëntatie- en salesgesprekken over vastgoed in Spanje.

HARD REQUIREMENTS:

1) PRIVACY/GDPR: vervang alle herleidbare persoonsgegevens (namen, adressen, telefoonnummers) door placeholders zoals [PERSOON], [ADRES].

2) EXTRACTIE: haal beslissingspsychologie en voice-of-customer taal uit de notities.

3) JSON-ONLY: geef uitsluitend een geldig JSON-object terug.

INPUT:
Rauwe notities van de gebruiker.

OUTPUT FORMAAT (JSON):
{
  "anonymized_notes": "De volledige samenvatting, maar 100% geanonimiseerd.",
  "sentiment": "Enthousiast" | "Twijfelend" | "Bezorgd",
  "insights": [
    {
      "label": "Korte titel (max 6 woorden)",
      "type": "Angst" | "Verlangen" | "Misvatting" | "Blokkade" | "Quote",
      "theme": "Zie lijst hieronder",
      "subtheme": "Kort kernwoord (hoofdletters)",
      "normalized_insight": "THEMA::SUBTHEME::KERN (Canonical format)",
      "raw_quote": "Letterlijke zin uit de mond van de klant",
      "impact_score": "High" | "Medium" | "Low"
    }
  ]
}

CANONICAL FORMAT REGELS:
- Gebruik voor 'theme' UITSLUITEND één van deze categorieën:
  [JURIDISCH, FINANCIEEL, LOCATIE, PROCES, EMOTIE, BOUWTECHNISCH, VERHUUR, BELASTING]

- 'normalized_insight' moet altijd de structuur THEMA::SUBTHEME::KERN hebben.
  Voorbeeld: "JURIDISCH::EIGENDOM::ANGST_KRAKERS"

EXTRACTIE RICHTLIJNEN:
- Vermijd corporate taal. Gebruik woorden die de klant gebruikt.
- Bij 'Quotes': behoud de emotie en ruwheid.
- 'Misvatting': iets dat de klant gelooft maar feitelijk onjuist is.
- 'Blokkade': de echte reden waarom ze vandaag niet beslissen.`;

interface AnalysisPromptDialogProps {
  trigger?: React.ReactNode;
}

export function AnalysisPromptDialog({ trigger }: AnalysisPromptDialogProps) {
  const [open, setOpen] = useState(false);
  const [promptText, setPromptText] = useState("");
  const { data: promptData, isLoading } = useAnalysisPrompt();
  const { updatePrompt, isUpdating } = useUpdateAnalysisPrompt();

  useEffect(() => {
    if (promptData?.prompt_text) {
      setPromptText(promptData.prompt_text);
    } else if (!isLoading) {
      setPromptText(DEFAULT_PROMPT);
    }
  }, [promptData, isLoading]);

  const handleSave = async () => {
    try {
      await updatePrompt(promptText);
      toast.success("Prompt opgeslagen");
      setOpen(false);
    } catch (error) {
      console.error('Save error:', error);
      toast.error("Fout bij het opslaan van de prompt");
    }
  };

  const handleReset = () => {
    setPromptText(DEFAULT_PROMPT);
    toast.info("Prompt gereset naar standaard (nog niet opgeslagen)");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Prompt Instellingen
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Analyse Prompt Instellingen</DialogTitle>
          <DialogDescription>
            Pas de AI prompt aan die gebruikt wordt om gesprekken te analyseren.
            De AI extraheert sentiment, anonimiseert notities en haalt insights eruit.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto py-4">
          <Textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            className="min-h-[400px] font-mono text-sm resize-none"
            placeholder="Laadt prompt..."
            disabled={isLoading}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={handleReset}
            disabled={isUpdating}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset naar standaard
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isUpdating || isLoading}
          >
            {isUpdating ? (
              "Opslaan..."
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Opslaan
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
