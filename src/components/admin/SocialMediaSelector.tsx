import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeFileName } from "@/lib/sanitizeFileName";
import {
  Image,
  Upload,
  Sparkles,
  FolderOpen,
  Loader2,
  X,
  Check,
  ImageIcon,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SocialMediaSelectorProps {
  projectImage?: string;
  projectName?: string;
  postContent?: string;
  platform?: string;
  selectedImage: string | null;
  onImageSelect: (url: string | null) => void;
}

interface MediaLibraryItem {
  id: string;
  name: string;
  url: string;
  thumbnail_url: string | null;
  category: string | null;
  tags: string[] | null;
  source: string;
  usage_count: number;
  created_at: string;
}

export function SocialMediaSelector({
  projectImage,
  projectName,
  postContent,
  platform = "linkedin",
  selectedImage,
  onImageSelect,
}: SocialMediaSelectorProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>(projectImage ? "project" : "upload");
  const [isUploading, setIsUploading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [saveToLibrary, setSaveToLibrary] = useState(true);
  const [imageName, setImageName] = useState("");

  // Fetch media library
  const { data: mediaLibrary, isLoading: libraryLoading } = useQuery({
    queryKey: ["social-media-library"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_media_library")
        .select("*")
        .order("usage_count", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MediaLibraryItem[];
    },
  });

  // AI image generation
  const generateMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const { data, error } = await supabase.functions.invoke("generate-social-image", {
        body: {
          prompt,
          platform,
          postContent: postContent?.substring(0, 500),
          projectName,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      if (data?.imageUrl) {
        onImageSelect(data.imageUrl);
        
        // Save to library if enabled
        if (saveToLibrary) {
          await supabase.from("social_media_library").insert({
            name: imageName || `AI - ${new Date().toLocaleDateString("nl-NL")}`,
            url: data.imageUrl,
            source: "ai_generated",
            category: "custom",
          });
          queryClient.invalidateQueries({ queryKey: ["social-media-library"] });
        }
        
        toast.success("Afbeelding gegenereerd!");
      }
    },
    onError: (error: Error) => {
      console.error("Generation error:", error);
      toast.error("Fout bij genereren: " + error.message);
    },
  });

  // Upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Alleen afbeeldingen zijn toegestaan");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Maximale bestandsgrootte is 5MB");
      return;
    }

    setIsUploading(true);

    try {
      const sanitizedName = sanitizeFileName(file.name);
      const uploadFile = sanitizedName === file.name
        ? file
        : new File([file], sanitizedName, { type: file.type, lastModified: file.lastModified });

      const filePath = `social/${Date.now()}-${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from("social-media-images")
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("social-media-images")
        .getPublicUrl(filePath);

      onImageSelect(publicUrl);

      // Save to library if enabled
      if (saveToLibrary) {
        await supabase.from("social_media_library").insert({
          name: imageName || file.name.replace(/\.[^/.]+$/, ""),
          url: publicUrl,
          source: "upload",
          category: "custom",
        });
        queryClient.invalidateQueries({ queryKey: ["social-media-library"] });
      }

      toast.success("Afbeelding geüpload!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Fout bij uploaden");
    } finally {
      setIsUploading(false);
    }
  };

  // Select from library
  const handleLibrarySelect = async (item: MediaLibraryItem) => {
    onImageSelect(item.url);
    
    // Increment usage count
    await supabase
      .from("social_media_library")
      .update({ usage_count: item.usage_count + 1 })
      .eq("id", item.id);
    
    queryClient.invalidateQueries({ queryKey: ["social-media-library"] });
  };

  const handleRemoveImage = () => {
    onImageSelect(null);
  };

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Image className="h-4 w-4" />
          Afbeelding voor Post
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {/* Selected Image Preview */}
        {selectedImage && (
          <div className="relative">
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
              <img
                src={selectedImage}
                alt="Geselecteerde afbeelding"
                className="w-full h-full object-cover"
              />
              <button
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Afbeelding geselecteerd</span>
            </div>
          </div>
        )}

        {/* Tab Selection */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            {projectImage && (
              <TabsTrigger value="project" className="text-xs">
                <Building2 className="h-3 w-3 mr-1" />
                Project
              </TabsTrigger>
            )}
            <TabsTrigger value="upload" className="text-xs">
              <Upload className="h-3 w-3 mr-1" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="generate" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              AI
            </TabsTrigger>
            <TabsTrigger value="library" className="text-xs">
              <FolderOpen className="h-3 w-3 mr-1" />
              Bibliotheek
            </TabsTrigger>
          </TabsList>

          {/* Project Image Tab */}
          {projectImage && (
            <TabsContent value="project" className="mt-4">
              <div 
                className={cn(
                  "relative aspect-video rounded-lg overflow-hidden bg-muted cursor-pointer border-2 transition-all",
                  selectedImage === projectImage 
                    ? "border-primary ring-2 ring-primary/20" 
                    : "border-transparent hover:border-primary/50"
                )}
                onClick={() => onImageSelect(projectImage)}
              >
                <img
                  src={projectImage}
                  alt={projectName || "Project afbeelding"}
                  className="w-full h-full object-cover"
                />
                {selectedImage === projectImage && (
                  <div className="absolute top-2 right-2 p-1 bg-primary text-primary-foreground rounded-full">
                    <Check className="h-3 w-3" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <p className="text-white font-medium text-sm">{projectName}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full mt-3"
                onClick={() => onImageSelect(projectImage)}
              >
                Gebruik Project Afbeelding
              </Button>
            </TabsContent>
          )}

          {/* Upload Tab */}
          <TabsContent value="upload" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Naam (optioneel)</Label>
              <Input
                value={imageName}
                onChange={(e) => setImageName(e.target.value)}
                placeholder="Bv. Sunset terras Costa Cálida"
              />
            </div>

            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
                "hover:border-primary/50 border-muted-foreground/25"
              )}
              onClick={() => document.getElementById("social-image-upload")?.click()}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Uploaden...</p>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">
                    Klik om een afbeelding te selecteren
                  </p>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG, WebP - Max 5MB
                  </p>
                </>
              )}
              <input
                id="social-image-upload"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="save-to-library"
                checked={saveToLibrary}
                onChange={(e) => setSaveToLibrary(e.target.checked)}
                className="rounded border-muted-foreground/25"
              />
              <Label htmlFor="save-to-library" className="text-sm text-muted-foreground cursor-pointer">
                Opslaan in bibliotheek voor later hergebruik
              </Label>
            </div>
          </TabsContent>

          {/* AI Generation Tab */}
          <TabsContent value="generate" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Beschrijf de gewenste afbeelding</Label>
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Bv. Mediterraans terras met uitzicht op zee bij zonsondergang, moderne villa op de achtergrond..."
                className="min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">
                De AI genereert een afbeelding op basis van je beschrijving en de post content.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Naam voor bibliotheek (optioneel)</Label>
              <Input
                value={imageName}
                onChange={(e) => setImageName(e.target.value)}
                placeholder="Bv. AI Sunset Terrace"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="save-ai-to-library"
                checked={saveToLibrary}
                onChange={(e) => setSaveToLibrary(e.target.checked)}
                className="rounded border-muted-foreground/25"
              />
              <Label htmlFor="save-ai-to-library" className="text-sm text-muted-foreground cursor-pointer">
                Opslaan in bibliotheek
              </Label>
            </div>

            <Button
              onClick={() => generateMutation.mutate(aiPrompt || `Social media image for ${platform} about Spanish real estate investment. ${postContent?.substring(0, 200) || ""}`)}
              disabled={generateMutation.isPending}
              className="w-full"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Genereren...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Genereer met AI
                </>
              )}
            </Button>
          </TabsContent>

          {/* Library Tab */}
          <TabsContent value="library" className="mt-4">
            {libraryLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !mediaLibrary || mediaLibrary.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Nog geen afbeeldingen in je bibliotheek</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload of genereer afbeeldingen en sla ze op
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="grid grid-cols-3 gap-2">
                  {mediaLibrary.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all group",
                        selectedImage === item.url
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-transparent hover:border-primary/50"
                      )}
                      onClick={() => handleLibrarySelect(item)}
                    >
                      <img
                        src={item.thumbnail_url || item.url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      {selectedImage === item.url && (
                        <div className="absolute top-1 right-1 p-0.5 bg-primary text-primary-foreground rounded-full">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs truncate">{item.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {item.source === "ai_generated" && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0">
                              AI
                            </Badge>
                          )}
                          <span className="text-white/70 text-[9px]">
                            {item.usage_count}x gebruikt
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
