import { useState, useRef } from "react";
import { usePhotoLibrary, useAddPhoto, useDeletePhoto, type LinkedInPhoto, type PhotoCategory } from "@/hooks/usePhotoLibrary";
import { useImageUpload } from "@/hooks/useImageUpload";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Sparkles, Zap, Crown, Check, Upload, Trash2, Save } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlinePhotoGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postContent?: string;
  onGenerated: (photo: { id: string; url: string }) => void;
}

const presetPrompts = [
  { label: "Professioneel portret", prompt: "Professional LinkedIn headshot in a modern office setting, confident pose, natural lighting" },
  { label: "Spreker op podium", prompt: "Speaking at a professional conference or event, on stage with audience, confident and engaging" },
  { label: "Casual zakelijk", prompt: "Casual business setting, relaxed but professional, modern workspace background" },
  { label: "Buiten / natuur", prompt: "Outdoor professional photo, natural background, warm sunlight, approachable and confident" },
];

const MAX_REFERENCES = 4;

export function InlinePhotoGenerator({ open, onOpenChange, postContent, onGenerated }: InlinePhotoGeneratorProps) {
  const [selectedPhotos, setSelectedPhotos] = useState<Map<string, string>>(new Map()); // id -> url
  const [prompt, setPrompt] = useState("");
  const [quality, setQuality] = useState<"fast" | "hd">("fast");
  const [isGenerating, setIsGenerating] = useState(false);
  const [filterCategory, setFilterCategory] = useState<PhotoCategory | "all">("all");

  // Preview state after generation
  const [previewResult, setPreviewResult] = useState<{ id: string; url: string; filePath: string } | null>(null);

  const { data: photos, isLoading: photosLoading } = usePhotoLibrary();
  const { upload, isUploading: isUploadingPhoto } = useImageUpload({ bucket: "linkedin-photos", pathPrefix: "photos" });
  const addPhoto = useAddPhoto();
  const deletePhoto = useDeletePhoto();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allPhotos = photos || [];
  const displayPhotos = filterCategory === "all" ? allPhotos : allPhotos.filter(p => p.category === filterCategory);

  const togglePhoto = (photo: LinkedInPhoto) => {
    setSelectedPhotos(prev => {
      const next = new Map(prev);
      if (next.has(photo.id)) {
        next.delete(photo.id);
      } else if (next.size < MAX_REFERENCES) {
        next.set(photo.id, photo.image_url);
      } else {
        toast.error(`Maximaal ${MAX_REFERENCES} referentiefoto's`);
      }
      return next;
    });
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const publicUrl = await upload(file);
    if (!publicUrl) return;

    try {
      const result = await addPhoto.mutateAsync({ image_url: publicUrl, category: "headshot", tags: ["referentie"] });
      setSelectedPhotos(prev => {
        const next = new Map(prev);
        if (next.size < MAX_REFERENCES) {
          next.set(result.id, result.image_url);
        }
        return next;
      });
      toast.success("Foto toegevoegd en geselecteerd als referentie");
    } catch {
      toast.error("Foto geüpload maar kon niet aan bibliotheek worden toegevoegd");
    }
  };

  const handleGenerate = async () => {
    if (selectedPhotos.size === 0) {
      toast.error("Selecteer minstens één referentiefoto");
      return;
    }
    if (!prompt.trim()) {
      toast.error("Vul een prompt in");
      return;
    }

    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Niet ingelogd");

      const referenceImageUrls = Array.from(selectedPhotos.values());

      const { data, error } = await supabase.functions.invoke("generate-avatar-photo", {
        body: {
          referenceImageUrls,
          prompt: prompt.trim(),
          category: "lifestyle",
          tags: ["inline-generated"],
          quality,
        },
      });

      if (error) throw new Error(error.message || "Generatie mislukt");
      if (!data?.success) throw new Error(data?.error || "Geen afbeelding gegenereerd");

      // Show preview instead of immediately accepting
      setPreviewResult({ id: data.photoId, url: data.imageUrl, filePath: data.filePath || "" });
      toast.success("Foto gegenereerd! Bekijk de preview.");
    } catch (err: any) {
      console.error("Photo generation error:", err);
      toast.error(err.message || "Fout bij genereren van foto");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = () => {
    if (!previewResult) return;
    onGenerated({ id: previewResult.id, url: previewResult.url });
    setPreviewResult(null);
    onOpenChange(false);
  };

  const handleDiscard = async () => {
    if (!previewResult) return;
    try {
      await deletePhoto.mutateAsync(previewResult.id);
      // Also remove from storage if filePath available
      if (previewResult.filePath) {
        await supabase.storage.from("linkedin-photos").remove([previewResult.filePath]);
      }
      toast.success("Foto verworpen");
    } catch {
      toast.error("Kon foto niet verwijderen");
    }
    setPreviewResult(null);
  };

  const selectPreset = (presetPrompt: string) => {
    setPrompt(presetPrompt);
  };

  // Selection order for badge numbers
  const selectionOrder = Array.from(selectedPhotos.keys());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Foto Genereren
          </DialogTitle>
          <DialogDescription>
            Genereer een professionele foto op basis van referentiefoto's en prompt.
          </DialogDescription>
        </DialogHeader>

        {/* Preview state after generation */}
        {previewResult ? (
          <div className="space-y-4">
            <div className="rounded-lg overflow-hidden border bg-muted/30">
              <img
                src={previewResult.url}
                alt="Gegenereerde foto"
                className="max-h-80 w-full object-contain"
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleAccept} className="flex-1" variant="default">
                <Save className="h-4 w-4 mr-2" />
                Bewaren & Selecteren
              </Button>
              <Button onClick={handleDiscard} variant="destructive" className="flex-1" disabled={deletePhoto.isPending}>
                {deletePhoto.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Verwerpen
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Reference Photo Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Referentiefoto's ({selectedPhotos.size}/{MAX_REFERENCES})
              </Label>
              {photosLoading ? (
                <p className="text-xs text-muted-foreground">Laden...</p>
              ) : (
                <>
                  <Tabs value={filterCategory} onValueChange={(v) => setFilterCategory(v as PhotoCategory | "all")}>
                    <TabsList className="h-7 mb-2">
                      <TabsTrigger value="all" className="text-[10px] px-2 py-0.5">Alle</TabsTrigger>
                      <TabsTrigger value="headshot" className="text-[10px] px-2 py-0.5">Headshot</TabsTrigger>
                      <TabsTrigger value="speaking" className="text-[10px] px-2 py-0.5">Speaking</TabsTrigger>
                      <TabsTrigger value="location" className="text-[10px] px-2 py-0.5">Locatie</TabsTrigger>
                      <TabsTrigger value="lifestyle" className="text-[10px] px-2 py-0.5">Lifestyle</TabsTrigger>
                      <TabsTrigger value="office" className="text-[10px] px-2 py-0.5">Kantoor</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <ScrollArea className="h-[160px]">
                    <div className="grid grid-cols-5 gap-2">
                      {displayPhotos.map((photo) => {
                        const isSelected = selectedPhotos.has(photo.id);
                        const orderIndex = selectionOrder.indexOf(photo.id);
                        return (
                          <button
                            key={photo.id}
                            onClick={() => togglePhoto(photo)}
                            className={cn(
                              "aspect-square rounded border-2 overflow-hidden relative",
                              isSelected
                                ? "border-primary ring-2 ring-primary/20"
                                : "border-transparent hover:border-muted-foreground/30"
                            )}
                          >
                            <img src={photo.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                            {isSelected && (
                              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                                  {orderIndex + 1}
                                </span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                      {/* Upload button */}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="aspect-square rounded border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-colors"
                      >
                        {isUploadingPhoto ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <>
                            <Upload className="h-4 w-4 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">Upload</span>
                          </>
                        )}
                      </button>
                    </div>
                  </ScrollArea>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUploadPhoto}
              />
            </div>

            {/* Preset Prompts */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Snelle keuzes</Label>
              <div className="grid grid-cols-2 gap-2">
                {presetPrompts.map((preset) => (
                  <Button
                    key={preset.label}
                    variant={prompt === preset.prompt ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-8 justify-start"
                    onClick={() => selectPreset(preset.prompt)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Prompt */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Prompt (beschrijf de gewenste setting)</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Bijv: Professional photo in a sunny Mediterranean office with sea view..."
                className="min-h-[60px] text-sm"
              />
            </div>

            {/* Quality Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Kwaliteit</Label>
              <RadioGroup value={quality} onValueChange={(v) => setQuality(v as "fast" | "hd")} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fast" id="q-fast" />
                  <Label htmlFor="q-fast" className="flex items-center gap-1.5 cursor-pointer text-sm">
                    <Zap className="h-3.5 w-3.5 text-yellow-500" /> Snel
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hd" id="q-hd" />
                  <Label htmlFor="q-hd" className="flex items-center gap-1.5 cursor-pointer text-sm">
                    <Crown className="h-3.5 w-3.5 text-purple-500" /> HD (langzamer)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || selectedPhotos.size === 0 || !prompt.trim()}
              className="w-full"
            >
              {isGenerating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Genereren...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" />Genereer Foto</>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
