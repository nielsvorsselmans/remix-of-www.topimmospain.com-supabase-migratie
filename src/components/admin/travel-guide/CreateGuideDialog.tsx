import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useCreateTravelGuide } from "@/hooks/useCustomerTravelGuides";
import { CustomerSearch } from "./CustomerSearch";
import { MUNICIPALITY_COORDS, getMunicipalitiesByRegion } from "@/lib/municipalityCoordinates";

interface CreateGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateGuideDialog({ open, onOpenChange }: CreateGuideDialogProps) {
  const navigate = useNavigate();
  const createGuide = useCreateTravelGuide();
  
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [title, setTitle] = useState("Jouw Persoonlijke Reisgids");
  const [region, setRegion] = useState<"Costa Cálida" | "Costa Blanca Zuid" | "">("");
  const [municipality, setMunicipality] = useState("");

  const regions = ['Costa Cálida', 'Costa Blanca Zuid'] as const;
  const municipalities = region && (region === 'Costa Cálida' || region === 'Costa Blanca Zuid')
    ? getMunicipalitiesByRegion(region)
    : Object.keys(MUNICIPALITY_COORDS);

  const handleCreate = () => {
    if (!selectedCustomerId) return;
    
    createGuide.mutate(
      {
        crm_lead_id: selectedCustomerId,
        title,
        region: region || undefined,
        municipality: municipality || undefined,
      },
      {
        onSuccess: (data) => {
          onOpenChange(false);
          navigate(`/admin/reisgids/${data.id}`);
        },
      }
    );
  };

  const handleClose = () => {
    setSelectedCustomerId(null);
    setTitle("Jouw Persoonlijke Reisgids");
    setRegion("");
    setMunicipality("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nieuwe reisgids aanmaken</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Customer Selection */}
          <div className="space-y-2">
            <Label>Klant *</Label>
            <CustomerSearch 
              onSelect={setSelectedCustomerId}
              selectedId={selectedCustomerId}
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="guide-title">Titel</Label>
            <Input
              id="guide-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Jouw Persoonlijke Reisgids"
            />
          </div>

          {/* Region */}
          <div className="space-y-2">
            <Label>Regio (optioneel)</Label>
            <Select 
              value={region || "__none__"} 
              onValueChange={(v) => { 
                setRegion(v === "__none__" ? "" : v as "Costa Cálida" | "Costa Blanca Zuid"); 
                setMunicipality(""); 
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer regio..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Geen specifieke regio</SelectItem>
                {regions.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Municipality */}
          <div className="space-y-2">
            <Label>Gemeente (optioneel)</Label>
            <Select 
              value={municipality || "__none__"} 
              onValueChange={(v) => setMunicipality(v === "__none__" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer gemeente..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Geen specifieke gemeente</SelectItem>
                {municipalities.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Annuleren
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={!selectedCustomerId || createGuide.isPending}
          >
            {createGuide.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Aanmaken
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
