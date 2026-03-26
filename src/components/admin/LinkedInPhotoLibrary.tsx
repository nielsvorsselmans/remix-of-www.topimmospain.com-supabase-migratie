import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePhotoLibrary, useAddPhoto, useUpdatePhoto, useDeletePhoto, type PhotoCategory } from "@/hooks/usePhotoLibrary";
import { useImageUpload } from "@/hooks/useImageUpload";
import { Star, Archive, Trash2, Upload, Plus, Image, Sparkles, Loader2, Zap, X, Check, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const CATEGORIES: { value: PhotoCategory; label: string }[] = [
  { value: "headshot", label: "Headshot" },
  { value: "speaking", label: "Speaking" },
  { value: "location", label: "Locatie" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "office", label: "Kantoor" },
];

const AI_PRESETS = [
  { label: "Professionele headshot", prompt: "Professional headshot with a clean, neutral background. Well-lit, confident expression, business casual attire." },
  { label: "Op een podium", prompt: "Standing on a stage giving a presentation to an audience. Professional conference setting with stage lighting." },
  { label: "Modern kantoor", prompt: "In a modern, bright office environment. Sitting at a desk or standing near a window with city views." },
  { label: "Casual lifestyle", prompt: "Casual outdoor setting, relaxed and approachable. Natural lighting, perhaps walking in a park or sitting at a café terrace." },
  { label: "Vastgoed locatie Spanje", prompt: "At a luxury real estate location in coastal Spain. Mediterranean architecture, blue sky, palm trees, terrace with sea view in the background." },
  { label: "Netwerk event", prompt: "At a professional networking event. Engaged in conversation, holding a coffee cup, warm ambient lighting." },
];

interface PendingPhoto {
  url: string;
  suggestedCategory: PhotoCategory;
  suggestedTags: string[];
  isClassifying: boolean;
  tagInput: string;
}

export function LinkedInPhotoLibrary() {
  const [filterCategory, setFilterCategory] = useState<PhotoCategory | undefined>();

  // Bulk upload state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Generation state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiCategory, setAiCategory] = useState<PhotoCategory>("headshot");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiReferenceUrl, setAiReferenceUrl] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPreview, setAiPreview] = useState<string | null>(null);
  const [aiQuality, setAiQuality] = useState<"fast" | "hd">("fast");

  const queryClient = useQueryClient();
  const { data: photos, isLoading } = usePhotoLibrary(filterCategory);
  const addPhoto = useAddPhoto();
  const updatePhoto = useUpdatePhoto();
  const deletePhoto = useDeletePhoto();
  const { upload } = useImageUpload({ bucket: "linkedin-photos", pathPrefix: "photos" });
  const { upload: uploadRef, isUploading: isUploadingRef } = useImageUpload({ bucket: "linkedin-photos", pathPrefix: "references" });

  // Bulk upload handlers
  const handleBulkFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setIsUploading(true);
    setBulkOpen(true);

    // Upload all files in parallel
    const uploadPromises = files.map(async (file) => {
      const url = await upload(file);
      return url;
    });

    const urls = await Promise.all(uploadPromises);
    const validUrls = urls.filter((u): u is string => u !== null);

    if (validUrls.length === 0) {
      toast.error("Geen foto's geüpload");
      setIsUploading(false);
      return;
    }

    // Create pending photos and start classifying
    const newPending: PendingPhoto[] = validUrls.map((url) => ({
      url,
      suggestedCategory: "headshot" as PhotoCategory,
      suggestedTags: [],
      isClassifying: true,
      tagInput: "",
    }));

    setPendingPhotos(newPending);
    setIsUploading(false);

    // Classify each photo in parallel
    validUrls.forEach((url, index) => {
      classifyPhoto(url, index);
    });

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const classifyPhoto = async (imageUrl: string, index: number) => {
    try {
      const { data, error } = await supabase.functions.invoke("classify-photo", {
        body: { imageUrl },
      });

      if (error) throw error;

      setPendingPhotos((prev) =>
        prev.map((p, i) =>
          i === index
            ? {
                ...p,
                suggestedCategory: data.category || "headshot",
                suggestedTags: data.tags || [],
                tagInput: (data.tags || []).join(", "),
                isClassifying: false,
              }
            : p
        )
      );
    } catch (err) {
      console.error("Classification error:", err);
      setPendingPhotos((prev) =>
        prev.map((p, i) =>
          i === index ? { ...p, isClassifying: false } : p
        )
      );
    }
  };

  const removePendingPhoto = (index: number) => {
    setPendingPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePendingCategory = (index: number, category: PhotoCategory) => {
    setPendingPhotos((prev) =>
      prev.map((p, i) => (i === index ? { ...p, suggestedCategory: category } : p))
    );
  };

  const updatePendingTags = (index: number, tagInput: string) => {
    setPendingPhotos((prev) =>
      prev.map((p, i) => (i === index ? { ...p, tagInput } : p))
    );
  };

  const handleSaveAll = async () => {
    if (!pendingPhotos.length) return;
    setIsSaving(true);

    try {
      const promises = pendingPhotos.map((p) =>
        addPhoto.mutateAsync({
          image_url: p.url,
          category: p.suggestedCategory,
          tags: p.tagInput
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        })
      );

      await Promise.all(promises);
      toast.success(`${pendingPhotos.length} foto('s) opgeslagen!`);
      setPendingPhotos([]);
      setBulkOpen(false);
    } catch {
      toast.error("Opslaan mislukt");
    } finally {
      setIsSaving(false);
    }
  };

  const closeBulkDialog = () => {
    setBulkOpen(false);
    setPendingPhotos([]);
  };

  // AI generation handlers
  const handleRefUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadRef(file);
    if (url) setAiReferenceUrl(url);
  };

  const handleSelectExistingAsRef = (url: string) => {
    setAiReferenceUrl(url);
    toast.success("Referentiefoto geselecteerd");
  };

  const handleAiGenerate = async () => {
    if (!aiReferenceUrl || !aiPrompt) {
      toast.error("Upload een referentiefoto en beschrijf de gewenste setting");
      return;
    }

    setAiGenerating(true);
    setAiPreview(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Niet ingelogd");

      const response = await supabase.functions.invoke("generate-avatar-photo", {
        body: {
          referenceImageUrl: aiReferenceUrl,
          prompt: aiPrompt,
          category: aiCategory,
          tags: [],
          quality: aiQuality,
        },
      });

      if (response.error) throw new Error(response.error.message || "Generatie mislukt");

      const result = response.data;
      if (!result?.success) throw new Error(result?.error || "Generatie mislukt");

      setAiPreview(result.imageUrl);
      queryClient.invalidateQueries({ queryKey: ["linkedin-photo-library"] });
      toast.success("AI-foto gegenereerd en opgeslagen!");
    } catch (error) {
      console.error("AI generation error:", error);
      toast.error(error instanceof Error ? error.message : "AI-generatie mislukt");
    } finally {
      setAiGenerating(false);
    }
  };

  const resetAiDialog = () => {
    setAiOpen(false);
    setAiPrompt("");
    setAiReferenceUrl("");
    setAiPreview(null);
    setAiCategory("headshot");
    setAiQuality("fast");
  };

  const anyClassifying = pendingPhotos.some((p) => p.isClassifying);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Image className="h-5 w-5" />
          LinkedIn Foto-bibliotheek
        </h3>
        <div className="flex gap-2">
          <Button onClick={() => setAiOpen(true)} size="sm" variant="outline">
            <Sparkles className="h-4 w-4 mr-1" />
            AI Genereren
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Foto's uploaden
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleBulkFileSelect}
          />
        </div>
      </div>

      <Tabs value={filterCategory || "all"} onValueChange={(v) => setFilterCategory(v === "all" ? undefined : v as PhotoCategory)}>
        <TabsList>
          <TabsTrigger value="all">Alle</TabsTrigger>
          {CATEGORIES.map(c => (
            <TabsTrigger key={c.value} value={c.value}>{c.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Laden...</p>
      ) : !photos?.length ? (
        <p className="text-sm text-muted-foreground">Nog geen foto's. Upload je eerste foto!</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <Card key={photo.id} className="overflow-hidden group relative">
              <div className="aspect-square relative">
                <img
                  src={photo.image_url}
                  alt={`LinkedIn foto - ${photo.category}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-1 p-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={() => updatePhoto.mutate({ id: photo.id, updates: { is_favorite: !photo.is_favorite } })}
                    >
                      <Star className={`h-4 w-4 ${photo.is_favorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={() => updatePhoto.mutate({ id: photo.id, updates: { is_archived: true } })}
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8"
                      onClick={() => { if (confirm("Foto verwijderen?")) deletePhoto.mutate(photo.id); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {photo.tags?.includes("ai-generated") && (
                  <span className="absolute top-2 left-2 bg-primary/80 text-primary-foreground text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5" /> AI
                  </span>
                )}
              </div>
              <CardContent className="p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium capitalize bg-muted px-2 py-0.5 rounded">
                    {photo.category}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {photo.times_used}× gebruikt
                  </span>
                </div>
                {photo.is_favorite && (
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 absolute top-2 right-2" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Bulk Upload Review Dialog */}
      <Dialog open={bulkOpen} onOpenChange={(open) => { if (!open) closeBulkDialog(); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Foto's beoordelen
              {anyClassifying && (
                <span className="text-sm font-normal text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> AI classificeert...
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {isUploading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Foto's uploaden...</span>
            </div>
          ) : pendingPhotos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Geen foto's om te beoordelen.</p>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Preview</TableHead>
                    <TableHead>Categorie</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPhotos.map((photo, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="w-16 h-16 rounded overflow-hidden border">
                          <img src={photo.url} alt="" className="w-full h-full object-cover" />
                        </div>
                      </TableCell>
                      <TableCell>
                        {photo.isClassifying ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" /> Analyseren...
                          </div>
                        ) : (
                          <Select
                            value={photo.suggestedCategory}
                            onValueChange={(v) => updatePendingCategory(index, v as PhotoCategory)}
                          >
                            <SelectTrigger className="w-[130px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map((c) => (
                                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        {photo.isClassifying ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />
                          </div>
                        ) : (
                          <Input
                            value={photo.tagInput}
                            onChange={(e) => updatePendingTags(index, e.target.value)}
                            placeholder="tag1, tag2, ..."
                            className="h-8 text-xs"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => removePendingPhoto(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex justify-between items-center pt-2">
                <p className="text-xs text-muted-foreground">
                  {pendingPhotos.length} foto('s) klaar om op te slaan
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={closeBulkDialog}>
                    Annuleren
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveAll}
                    disabled={isSaving || anyClassifying}
                  >
                    {isSaving ? (
                      <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Opslaan...</>
                    ) : (
                      <><CheckCheck className="h-4 w-4 mr-1" /> Alles opslaan</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Generation Dialog */}
      <Dialog open={aiOpen} onOpenChange={(open) => { if (!open) resetAiDialog(); else setAiOpen(true); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Avatar Genereren
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Reference photo */}
            <div>
              <label className="text-sm font-medium">1. Referentiefoto</label>
              <p className="text-xs text-muted-foreground mb-2">Upload een duidelijke foto van jezelf als basis</p>
              {aiReferenceUrl ? (
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border">
                  <img src={aiReferenceUrl} alt="Referentie" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setAiReferenceUrl("")}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {isUploadingRef ? "Uploaden..." : "Upload foto"}
                    </span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleRefUpload} disabled={isUploadingRef} />
                  </label>
                  {photos && photos.length > 0 && (
                    <div className="flex gap-1 overflow-x-auto max-w-[200px]">
                      {photos.filter(p => p.category === "headshot").slice(0, 3).map(p => (
                        <button
                          key={p.id}
                          onClick={() => handleSelectExistingAsRef(p.image_url)}
                          className="w-12 h-12 rounded border overflow-hidden flex-shrink-0 hover:ring-2 ring-primary transition-all"
                        >
                          <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="text-sm font-medium">2. Categorie</label>
              <Select value={aiCategory} onValueChange={(v) => setAiCategory(v as PhotoCategory)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quality selection */}
            <div>
              <label className="text-sm font-medium">3. Kwaliteit</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  onClick={() => setAiQuality("fast")}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                    aiQuality === "fast"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <Zap className="h-5 w-5 text-amber-500" />
                  <span className="text-sm font-medium">Snel</span>
                  <span className="text-[10px] text-muted-foreground">~15 sec</span>
                </button>
                <button
                  onClick={() => setAiQuality("hd")}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                    aiQuality === "hd"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <Sparkles className="h-5 w-5 text-violet-500" />
                  <span className="text-sm font-medium">HD Kwaliteit</span>
                  <span className="text-[10px] text-muted-foreground">~30-60 sec</span>
                </button>
              </div>
            </div>

            {/* Prompt presets + custom */}
            <div>
              <label className="text-sm font-medium">4. Setting beschrijven</label>
              <div className="flex flex-wrap gap-1.5 mt-2 mb-2">
                {AI_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setAiPrompt(preset.prompt)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      aiPrompt === preset.prompt
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted hover:bg-muted/80 border-border"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <Input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Of beschrijf zelf de gewenste setting..."
                className="mt-1"
              />
            </div>

            {/* Preview */}
            {aiPreview && (
              <div>
                <label className="text-sm font-medium">Resultaat</label>
                <div className="mt-1 rounded-lg overflow-hidden border">
                  <img src={aiPreview} alt="AI gegenereerd" className="w-full h-auto" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">✅ Automatisch opgeslagen in je bibliotheek</p>
              </div>
            )}

            {/* Generate button */}
            <Button
              onClick={handleAiGenerate}
              disabled={aiGenerating || !aiReferenceUrl || !aiPrompt}
              className="w-full"
            >
              {aiGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {aiQuality === "hd" ? "HD genereren... (30-60 sec)" : "Genereren... (15-30 sec)"}
                </>
              ) : aiPreview ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Opnieuw genereren
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Genereer AI-foto
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
