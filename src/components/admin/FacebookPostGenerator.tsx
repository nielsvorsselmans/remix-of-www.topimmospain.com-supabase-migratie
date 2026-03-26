import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Facebook, Instagram, Linkedin, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProjectData {
  id: string;
  name: string;
  display_title?: string | null;
  city?: string | null;
  region?: string | null;
  price_from?: number | null;
  featured_image?: string | null;
}

interface FacebookPostGeneratorProps {
  project: ProjectData;
  triggerWord: string;
  campaignType: string;
  utmCampaign: string;
  onTemplateChange?: (template: string) => void;
  initialTemplate?: string;
}

const PURCHASE_COSTS_PERCENT = 12; // Approximate purchase costs
const RENTAL_YIELD_PERCENT = 5.5; // Estimated rental yield
const APPRECIATION_PERCENT = 4; // Estimated appreciation

export const FacebookPostGenerator = ({
  project,
  triggerWord,
  campaignType,
  utmCampaign,
  onTemplateChange,
  initialTemplate,
}: FacebookPostGeneratorProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [template, setTemplate] = useState("");

  const projectName = project.display_title || project.name;
  const baseUrl = window.location.origin;
  
  const campaignLink = `${baseUrl}/lp/project/${project.id}?utm_source=${campaignType}&utm_medium=social&utm_campaign=${utmCampaign}`;

  const formatPriceLocal = (price: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const generateTemplate = () => {
    const priceText = project.price_from 
      ? `vanaf ${formatPriceLocal(project.price_from)}` 
      : "prijzen op aanvraag";

    const defaultTemplate = `🏠 Nieuwbouw in ${project.city || "Spanje"} ${priceText}

📊 Wat kun je verwachten?
• Aankoopkosten: ~${PURCHASE_COSTS_PERCENT}%
• Geschat huurrendement: ~${RENTAL_YIELD_PERCENT}%
• Waardestijging: ~${APPRECIATION_PERCENT}% per jaar

💡 Wil je de volledige analyse met kosten en opbrengsten?

Reageer "${triggerWord}" en ontvang toegang tot je persoonlijke rendementssimulatie.

👉 Direct bekijken: ${campaignLink}

#investereninspanje #vastgoedinspanje #rendement #${project.city?.toLowerCase().replace(/\s/g, "") || "spanje"}`;

    return defaultTemplate;
  };

  useEffect(() => {
    if (initialTemplate) {
      setTemplate(initialTemplate);
    } else {
      setTemplate(generateTemplate());
    }
  }, [project.id, triggerWord, campaignType, utmCampaign]);

  useEffect(() => {
    if (onTemplateChange) {
      onTemplateChange(template);
    }
  }, [template, onTemplateChange]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(template);
      setCopied(true);
      toast({
        title: "Gekopieerd!",
        description: "Post template is naar klembord gekopieerd.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Fout",
        description: "Kon niet kopiëren naar klembord.",
        variant: "destructive",
      });
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(campaignLink);
      toast({
        title: "Link gekopieerd!",
        description: "Campagne link is naar klembord gekopieerd.",
      });
    } catch (err) {
      toast({
        title: "Fout",
        description: "Kon link niet kopiëren.",
        variant: "destructive",
      });
    }
  };

  const handleRegenerate = () => {
    setTemplate(generateTemplate());
  };

  const getPlatformIcon = () => {
    switch (campaignType) {
      case "facebook":
        return <Facebook className="h-4 w-4" />;
      case "instagram":
        return <Instagram className="h-4 w-4" />;
      case "linkedin":
        return <Linkedin className="h-4 w-4" />;
      default:
        return <Facebook className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getPlatformIcon()}
            <CardTitle className="text-lg">Post Template</CardTitle>
          </div>
          <Badge variant="outline" className="capitalize">
            {campaignType}
          </Badge>
        </div>
        <CardDescription>
          Pas de post aan en kopieer naar {campaignType}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preview Image */}
        {project.featured_image && (
          <div className="rounded-lg overflow-hidden border">
            <img
              src={project.featured_image}
              alt={projectName}
              className="w-full h-48 object-cover"
            />
          </div>
        )}

        {/* Campaign Link */}
        <div className="space-y-2">
          <Label>Campagne Link (UTM getagd)</Label>
          <div className="flex gap-2">
            <Input
              value={campaignLink}
              readOnly
              className="font-mono text-xs"
            />
            <Button variant="outline" size="icon" onClick={handleCopyLink}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Trigger Word Display */}
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">Trigger woord:</span>
          <Badge variant="secondary" className="font-mono text-lg">
            {triggerWord}
          </Badge>
        </div>

        {/* Post Template */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Post Tekst</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRegenerate}
              className="h-8"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Regenereer
            </Button>
          </div>
          <Textarea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="min-h-[300px] font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            {template.length} karakters
          </p>
        </div>

        {/* Copy Button */}
        <Button onClick={handleCopy} className="w-full" size="lg">
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Gekopieerd!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Kopieer Post
            </>
          )}
        </Button>

        {/* Instructions */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <p className="text-sm font-medium">Instructies:</p>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Kopieer de post tekst hierboven</li>
            <li>Plak in {campaignType} met de projectfoto</li>
            <li>Wanneer iemand "{triggerWord}" reageert, stuur de link</li>
            <li>Na login krijgen ze hun persoonlijke analyse</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};
