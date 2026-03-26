import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ExternalLink, Search, Save, ArrowLeft, PenLine, AlertCircle, RefreshCw, XCircle } from "lucide-react";
import { useScrapeIdealista, useCreateExternalListing, useCheckDuplicateUrl, ScrapeError, type ExternalListing } from "@/hooks/useExternalListings";
import { extractPlatform } from "@/constants/external-listings";
import { toast } from "sonner";

interface AddExternalListingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  crmLeadId: string;
}

export function AddExternalListingDialog({
  open,
  onOpenChange,
  crmLeadId,
}: AddExternalListingDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [url, setUrl] = useState("");
  const [scrapedData, setScrapedData] = useState<any>(null);
  const [scrapeProgress, setScrapeProgress] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateInfo, setDuplicateInfo] = useState<{ exists: boolean; assignedToLead: boolean; listingId: string | null } | null>(null);

  // Editable fields
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [areaSqm, setAreaSqm] = useState("");
  const [plotSizeSqm, setPlotSizeSqm] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrls, setImageUrls] = useState("");

  const scrape = useScrapeIdealista();
  const createListing = useCreateExternalListing();
  const checkDuplicate = useCheckDuplicateUrl();

  const resetForm = () => {
    setStep(1);
    setUrl("");
    setScrapedData(null);
    setScrapeProgress(0);
    setTitle("");
    setPrice("");
    setCity("");
    setRegion("");
    setBedrooms("");
    setBathrooms("");
    setAreaSqm("");
    setPlotSizeSqm("");
    setDescription("");
    setImageUrls("");
    setErrors({});
    setDuplicateInfo(null);
  };

  const handleScrape = async () => {
    if (!url.trim() || scrape.isActive) return;
    
    // Check for duplicates first
    try {
      const dup = await checkDuplicate.mutateAsync({ sourceUrl: url.trim(), crmLeadId });
      if (dup.assignedToLead) {
        toast.error("Dit pand is al toegewezen aan deze klant");
        return;
      }
      if (dup.exists) {
        setDuplicateInfo({ exists: dup.exists, assignedToLead: dup.assignedToLead, listingId: dup.listingId || null });
      }
    } catch {
      // Continue with scrape
    }

    setScrapeProgress(10);
    const progressInterval = setInterval(() => {
      setScrapeProgress((prev) => Math.min(prev + 2, 85));
    }, 2000);

    try {
      const data = await scrape.mutateAsync(url);
      clearInterval(progressInterval);
      setScrapeProgress(100);
      setScrapedData(data);
      setTitle(data.title || "");
      setPrice(data.price?.toString() || "");
      setCity(data.city || "");
      setRegion(data.region || "");
      setBedrooms(data.bedrooms?.toString() || "");
      setBathrooms(data.bathrooms?.toString() || "");
      setAreaSqm(data.area_sqm?.toString() || "");
      setPlotSizeSqm(data.plot_size_sqm?.toString() || "");
      setDescription(data.description || "");
      setImageUrls((data.images || []).join("\n"));
      setStep(2);
    } catch (err) {
      clearInterval(progressInterval);
      setScrapeProgress(0);
      const msg = err instanceof Error ? err.message : "Onbekende fout";
      const code = err instanceof ScrapeError ? err.code : "UNKNOWN";
      if (msg.includes("timed out") || msg.includes("timeout") || msg.includes("TIMEOUT") || msg.includes("blokkeert") || msg.includes("Kon de pagina niet ophalen") || msg.includes("422")) {
        toast.error("Idealista blokkeert het automatisch ophalen. U kunt het pand opslaan en later opnieuw proberen.", { duration: 8000 });
      } else if (msg.includes("404") || msg.includes("not found")) {
        toast.error("Pagina niet gevonden. Controleer de URL.");
      } else {
        toast.error(msg);
      }
      setScrapedData({ source_url: url.trim(), source_platform: extractPlatform(url), scrape_status: "failed", scrape_error: code });
    }
  };

  const handleCancel = async () => {
    setScrapeProgress(0);
    await scrape.cancel();
    toast.info("Scraping geannuleerd");
  };

  const handleManualEntry = () => {
    setScrapedData(null);
    setStep(2);
  };

  const getImages = (): string[] => {
    if (imageUrls.trim()) {
      return imageUrls.split("\n").map((u) => u.trim()).filter(Boolean);
    }
    return scrapedData?.images || [];
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim() && !url.trim()) {
      newErrors.title = "Vul een titel of URL in";
    }
    if (price && (isNaN(Number(price)) || Number(price) <= 0)) {
      newErrors.price = "Voer een geldig bedrag in";
    }
    if (url.trim() && !/^https?:\/\/.+/i.test(url.trim()) && !url.trim().startsWith("www.")) {
      newErrors.url = "Voer een geldige URL in";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      await createListing.mutateAsync({
        listing: {
          source_url: scrapedData?.source_url || url || "",
          source_platform: scrapedData?.source_platform || extractPlatform(url),
          title: title || null,
          price: price ? parseFloat(price) : null,
          currency: "EUR",
          city: city || null,
          region: region || null,
          bedrooms: bedrooms ? parseInt(bedrooms) : null,
          bathrooms: bathrooms ? parseInt(bathrooms) : null,
          area_sqm: areaSqm ? parseFloat(areaSqm) : null,
          plot_size_sqm: plotSizeSqm ? parseFloat(plotSizeSqm) : null,
          description: description || null,
          features: scrapedData?.features || {},
          images: getImages(),
          raw_scraped_data: scrapedData?.raw_scraped_data,
          scrape_status: scrapedData?.scrape_status || 'success',
          scrape_error: scrapedData?.scrape_error || null,
          last_scrape_attempt: scrapedData?.scrape_status === 'failed' ? new Date().toISOString() : null,
        },
        crmLeadId,
        existingListingId: duplicateInfo?.listingId || undefined,
      });
      resetForm();
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      if (scrape.isActive) scrape.cancel();
      resetForm();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "Extern pand toevoegen" : "Gegevens controleren"}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Plak een URL om automatisch op te halen, of voer handmatig in."
              : "Controleer en pas de gegevens aan."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>URL van het pand</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setDuplicateInfo(null); }}
                  placeholder="https://www.idealista.com/inmueble/..."
                  className={`flex-1 ${errors.url ? 'border-destructive' : ''}`}
                  disabled={scrape.isPending}
                />
                <Button
                  onClick={handleScrape}
                  disabled={!url.trim() || scrape.isPending || scrape.isActive}
                >
                  {scrape.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Search className="h-4 w-4 mr-1" />
                  )}
                  Ophalen
                </Button>
              </div>
              {errors.url && <p className="text-xs text-destructive mt-1">{errors.url}</p>}
            </div>

            {duplicateInfo?.exists && !duplicateInfo.assignedToLead && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Dit pand bestaat al in het systeem. Het wordt aan deze klant toegewezen zonder dubbel te scrapen.
                </AlertDescription>
              </Alert>
            )}

            {scrape.isPending && (
              <div className="space-y-2">
                <Progress value={scrapeProgress} className="h-2" />
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Pand wordt geanalyseerd… Dit kan 15-90 seconden duren.
                  </p>
                  {scrape.isActive && (
                    <Button variant="ghost" size="sm" onClick={handleCancel} className="text-destructive hover:text-destructive">
                      <XCircle className="h-4 w-4 mr-1" />
                      Annuleren
                    </Button>
                  )}
                </div>
              </div>
            )}

            {scrape.isError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 space-y-2">
                <p className="text-sm text-destructive">
                  {(scrape.error as Error)?.message || "Kon pagina niet ophalen"}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleScrape}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Opnieuw proberen
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleManualEntry}>
                    <PenLine className="h-4 w-4 mr-1" />
                    Handmatig invoeren
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setStep(2)}>
                    <Save className="h-4 w-4 mr-1" />
                    Opslaan als mislukt
                  </Button>
                </div>
              </div>
            )}

            <div className="relative flex items-center gap-3">
              <div className="flex-1 border-t" />
              <span className="text-xs text-muted-foreground">of</span>
              <div className="flex-1 border-t" />
            </div>

            <Button variant="outline" className="w-full" onClick={handleManualEntry}>
              <PenLine className="h-4 w-4 mr-1" />
              Handmatig invoeren
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Terug
            </Button>

            {/* Image previews */}
            {getImages().length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {getImages().slice(0, 6).map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt=""
                    className="h-20 w-28 rounded-md object-cover flex-shrink-0 border"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>URL</Label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div className="col-span-2">
                <Label>Titel *</Label>
                <Input 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  className={errors.title ? 'border-destructive' : ''}
                />
                {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
              </div>
              <div>
                <Label>Prijs (€)</Label>
                <Input 
                  value={price} 
                  onChange={(e) => setPrice(e.target.value)} 
                  type="number" 
                  className={errors.price ? 'border-destructive' : ''}
                />
                {errors.price && <p className="text-xs text-destructive mt-1">{errors.price}</p>}
              </div>
              <div>
                <Label>Stad</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div>
                <Label>Regio</Label>
                <Input value={region} onChange={(e) => setRegion(e.target.value)} />
              </div>
              <div>
                <Label>Slaapkamers</Label>
                <Input value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} type="number" />
              </div>
              <div>
                <Label>Badkamers</Label>
                <Input value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} type="number" />
              </div>
              <div>
                <Label>Oppervlakte (m²)</Label>
                <Input value={areaSqm} onChange={(e) => setAreaSqm(e.target.value)} type="number" />
              </div>
              <div>
                <Label>Perceel (m²)</Label>
                <Input value={plotSizeSqm} onChange={(e) => setPlotSizeSqm(e.target.value)} type="number" />
              </div>
            </div>

            <div>
              <Label>Beschrijving</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
            </div>

            <div>
              <Label>Foto-URLs (1 per regel)</Label>
              <Textarea
                value={imageUrls}
                onChange={(e) => setImageUrls(e.target.value)}
                rows={3}
                placeholder="https://img.idealista.com/..."
                className="font-mono text-xs"
              />
            </div>

            {url && (
              <a
                href={url.startsWith("http") ? url : `https://${url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                Bekijk originele listing
              </a>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Annuleren
              </Button>
              <Button onClick={handleSave} disabled={createListing.isPending}>
                {createListing.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Opslaan en toewijzen
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
