import { useState, useEffect } from "react";
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
import { Loader2, Save } from "lucide-react";
import { useUpdateExternalListing, ExternalListing } from "@/hooks/useExternalListings";

interface EditExternalListingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: ExternalListing;
}

export function EditExternalListingDialog({
  open,
  onOpenChange,
  listing,
}: EditExternalListingDialogProps) {
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
  const [agentName, setAgentName] = useState("");
  const [agentPhone, setAgentPhone] = useState("");
  const [agentEmail, setAgentEmail] = useState("");
  const [agentWebsite, setAgentWebsite] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [constructionYear, setConstructionYear] = useState("");
  const [energyRating, setEnergyRating] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateListing = useUpdateExternalListing();

  useEffect(() => {
    if (listing && open) {
      setTitle(listing.title || "");
      setPrice(listing.price?.toString() || "");
      setCity(listing.city || "");
      setRegion(listing.region || "");
      setBedrooms(listing.bedrooms?.toString() || "");
      setBathrooms(listing.bathrooms?.toString() || "");
      setAreaSqm(listing.area_sqm?.toString() || "");
      setPlotSizeSqm(listing.plot_size_sqm?.toString() || "");
      setDescription(listing.description || "");
      setImageUrls((listing.images || []).join("\n"));
      const feat = (listing.features || {}) as Record<string, any>;
      setAgentName(feat.agent_name || "");
      setAgentPhone(feat.agent_phone || "");
      setAgentEmail(feat.agent_email || "");
      setAgentWebsite(feat.agent_website || "");
      setReferenceNumber(feat.reference_number || "");
      setConstructionYear(feat.construction_year?.toString() || "");
      setEnergyRating(feat.energy_rating || "");
      setErrors({});
    }
  }, [listing, open]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim() && !listing.source_url) {
      newErrors.title = "Titel is verplicht als er geen URL is";
    }
    if (price && (isNaN(Number(price)) || Number(price) <= 0)) {
      newErrors.price = "Voer een geldig bedrag in";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      const existingFeatures = (listing.features || {}) as Record<string, any>;
      const updatedFeatures = {
        ...existingFeatures,
        agent_name: agentName || existingFeatures.agent_name || null,
        agent_phone: agentPhone || existingFeatures.agent_phone || null,
        agent_email: agentEmail || existingFeatures.agent_email || null,
        agent_website: agentWebsite || existingFeatures.agent_website || null,
        reference_number: referenceNumber || existingFeatures.reference_number || null,
        construction_year: constructionYear ? parseInt(constructionYear) : existingFeatures.construction_year || null,
        energy_rating: energyRating || existingFeatures.energy_rating || null,
      };
      await updateListing.mutateAsync({
        listingId: listing.id,
        updates: {
          title: title || null,
          price: price ? parseFloat(price) : null,
          city: city || null,
          region: region || null,
          bedrooms: bedrooms ? parseInt(bedrooms) : null,
          bathrooms: bathrooms ? parseInt(bathrooms) : null,
          area_sqm: areaSqm ? parseFloat(areaSqm) : null,
          plot_size_sqm: plotSizeSqm ? parseFloat(plotSizeSqm) : null,
          description: description || null,
          images: imageUrls.split("\n").map(u => u.trim()).filter(Boolean),
          features: updatedFeatures,
        },
      });
      onOpenChange(false);
    } catch {
      // Handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Extern pand bewerken</DialogTitle>
          <DialogDescription>Pas de gegevens van dit pand aan.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image previews */}
          {imageUrls.trim() && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {imageUrls.split("\n").filter(Boolean).slice(0, 6).map((img, i) => (
                <img
                  key={i}
                  src={img.trim()}
                  alt=""
                  className="h-20 w-28 rounded-md object-cover flex-shrink-0 border"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Titel</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
            </div>
            <div>
              <Label>Prijs (€)</Label>
              <Input value={price} onChange={(e) => setPrice(e.target.value)} type="number" />
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

          {/* Extra metadata */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Makelaar</Label>
              <Input value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="Naam makelaarskantoor" />
            </div>
            <div>
              <Label>Telefoon makelaar</Label>
              <Input value={agentPhone} onChange={(e) => setAgentPhone(e.target.value)} placeholder="+34 ..." />
            </div>
            <div>
              <Label>E-mail makelaar</Label>
              <Input value={agentEmail} onChange={(e) => setAgentEmail(e.target.value)} placeholder="info@makelaar.es" />
            </div>
            <div>
              <Label>Website makelaar</Label>
              <Input value={agentWebsite} onChange={(e) => setAgentWebsite(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <Label>Referentienummer</Label>
              <Input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
            </div>
            <div>
              <Label>Bouwjaar</Label>
              <Input value={constructionYear} onChange={(e) => setConstructionYear(e.target.value)} type="number" />
            </div>
            <div>
              <Label>Energielabel</Label>
              <Input value={energyRating} onChange={(e) => setEnergyRating(e.target.value)} placeholder="A-G" maxLength={1} />
            </div>
          </div>

          <div>
            <Label>Foto-URLs (1 per regel)</Label>
            <Textarea
              value={imageUrls}
              onChange={(e) => setImageUrls(e.target.value)}
              rows={3}
              className="font-mono text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button onClick={handleSave} disabled={updateListing.isPending}>
              {updateListing.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Opslaan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
