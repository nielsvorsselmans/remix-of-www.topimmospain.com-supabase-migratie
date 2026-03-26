import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { compressImage } from "@/lib/imageCompression";
import { supabase } from "@/integrations/supabase/client";
import { useAddMaterialOptionImage } from "@/hooks/useMaterialSelections";
import { toast } from "sonner";

interface AddMaterialOptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    description?: string;
    color_code?: string;
    brand?: string;
    product_code?: string;
    price?: number | null;
    is_default?: boolean;
  }) => Promise<string | void>;
  isLoading: boolean;
  saleId?: string;
}

export function AddMaterialOptionDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  saleId,
}: AddMaterialOptionDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [colorCode, setColorCode] = useState("");
  const [brand, setBrand] = useState("");
  const [productCode, setProductCode] = useState("");
  const [price, setPrice] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  
  // Image upload states
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const addImage = useAddMaterialOptionImage();

  // Clean up preview URLs when component unmounts or dialog closes
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const newFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (newFiles.length === 0) return;
    
    // Create preview URLs
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    
    setPendingImages(prev => [...prev, ...newFiles]);
    setPreviewUrls(prev => [...prev, ...newPreviews]);
  };

  const handleRemoveImage = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setPendingImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const uploadImages = async (optionId: string) => {
    if (pendingImages.length === 0 || !saleId) return;
    
    setUploading(true);
    
    try {
      for (let i = 0; i < pendingImages.length; i++) {
        const file = pendingImages[i];
        
        // Compress the image
        const compressedFile = await compressImage(file);
        
        // Generate unique filename
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const ext = file.name.split('.').pop() || 'jpg';
        const fileName = `${optionId}/${timestamp}-${random}.${ext}`;
        
        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('material-images')
          .upload(fileName, compressedFile);
        
        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('material-images')
          .getPublicUrl(fileName);
        
        // Save to database
        await addImage.mutateAsync({
          saleId,
          option_id: optionId,
          image_url: urlData.publicUrl,
          is_primary: i === 0, // First image is primary
        });
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Sommige afbeeldingen konden niet worden geüpload');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setColorCode("");
    setBrand("");
    setProductCode("");
    setPrice("");
    setIsDefault(false);
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setPendingImages([]);
    setPreviewUrls([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const result = await onSubmit({
      name,
      description: description || undefined,
      color_code: colorCode || undefined,
      brand: brand || undefined,
      product_code: productCode || undefined,
      price: price ? parseFloat(price) : null,
      is_default: isDefault,
    });

    // If we got an option ID back and have pending images, upload them
    if (result && typeof result === 'string' && pendingImages.length > 0) {
      await uploadImages(result);
    }

    resetForm();
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Optie toevoegen</DialogTitle>
          <DialogDescription>
            Voeg een nieuwe materiaaloptie toe.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Naam *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bijv. Lakestone Beige"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Merk</Label>
              <Input
                id="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Bijv. Porcelanosa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productCode">Productcode</Label>
              <Input
                id="productCode"
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                placeholder="Bijv. BO04"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="colorCode">Kleurcode (HEX)</Label>
            <div className="flex gap-2">
              <Input
                id="colorCode"
                value={colorCode}
                onChange={(e) => setColorCode(e.target.value)}
                placeholder="#RRGGBB"
                className="flex-1"
              />
              {colorCode && (
                <div
                  className="w-10 h-10 rounded border flex-shrink-0"
                  style={{ backgroundColor: colorCode }}
                />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Meerprijs (optioneel)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="pl-7"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Laat leeg indien geen meerprijs
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschrijving</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Extra informatie over deze optie"
              rows={2}
            />
          </div>

          {/* Image Upload Section */}
          {saleId && (
            <div className="space-y-2">
              <Label>Afbeeldingen</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="h-8 w-8" />
                  <div className="text-sm text-center">
                    <span className="font-medium text-primary">Klik om te uploaden</span>
                    {" "}of sleep afbeeldingen hierheen
                  </div>
                  <p className="text-xs">PNG, JPG tot 20MB</p>
                </div>
              </div>

              {/* Preview Grid */}
              {previewUrls.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative group aspect-square">
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage(index);
                        }}
                        className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {index === 0 && (
                        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-[10px] rounded">
                          Hoofd
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="isDefault">Standaard optie</Label>
              <p className="text-xs text-muted-foreground">
                Dit is de standaard keuze van de ontwikkelaar
              </p>
            </div>
            <Switch
              id="isDefault"
              checked={isDefault}
              onCheckedChange={setIsDefault}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Annuleren
            </Button>
            <Button type="submit" disabled={isLoading || uploading || !name}>
              {isLoading || uploading ? "Bezig..." : "Toevoegen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
