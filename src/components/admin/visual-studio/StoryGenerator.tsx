import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Download, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import { useCreateExport, uploadExportToStorage } from "./hooks/useVisualExports";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { ProjectImagePicker } from "./ProjectImagePicker";

interface StoryTemplate {
  id: string;
  name: string;
  theme: string;
}

const STORY_TEMPLATES: StoryTemplate[] = [
  { id: "project", name: "Nieuw Project", theme: "reveal" },
  { id: "testimonial", name: "Testimonial", theme: "quote" },
  { id: "tip", name: "Tip van de Week", theme: "tip" },
  { id: "bts", name: "Behind the Scenes", theme: "casual" },
  { id: "price", name: "Prijs Update", theme: "data" },
];

export function StoryGenerator() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("project");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedBackgroundImage, setSelectedBackgroundImage] = useState<string>("");
  const [headline, setHeadline] = useState("Nieuw project beschikbaar!");
  const [subtext, setSubtext] = useState("Ontdek dit unieke investeringsobject");
  const [ctaText, setCtaText] = useState("🔗 Link in bio");
  const [isExporting, setIsExporting] = useState(false);
  const storyRef = useRef<HTMLDivElement>(null);
  const createExport = useCreateExport();

  interface ProjectForStory {
    id: string;
    name: string;
    featured_image: string | null;
    images: string[] | null;
    city: string | null;
    price_from: number | null;
  }

  const { data: projects } = useQuery({
    queryKey: ["projects-for-story"],
    queryFn: async (): Promise<ProjectForStory[]> => {
      const { data, error } = await supabase
        .from("projects" as never)
        .select("id, name, featured_image, images, city, price_from" as never)
        .eq("active" as never, true)
        .order("name" as never);
      if (error) throw error;
      return (data || []) as ProjectForStory[];
    },
  });

  const selectedProject = projects?.find((p) => p.id === selectedProjectId);
  const template = STORY_TEMPLATES.find((t) => t.id === selectedTemplate);
  
  // Use selected background or fall back to featured image
  const backgroundImage = selectedBackgroundImage || selectedProject?.featured_image;

  const handleExport = async () => {
    if (!storyRef.current) return;

    setIsExporting(true);
    try {
      await document.fonts.ready;

      const dataUrl = await toPng(storyRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });

      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const fileName = `story-${Date.now()}.png`;

      // Upload and save export
      try {
        const fileUrl = await uploadExportToStorage(blob, fileName);
        await createExport.mutateAsync({
          project_id: selectedProjectId || undefined,
          export_type: "png",
          file_url: fileUrl,
          file_name: fileName,
          metadata: {
            template: selectedTemplate,
            projectName: selectedProject?.name,
          },
        });
      } catch (uploadError) {
        console.warn("Could not save export to history:", uploadError);
      }

      // Download
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = fileName;
      link.click();

      toast.success("Story geëxporteerd!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Fout bij exporteren");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Instagram Story Generator
          </CardTitle>
          <CardDescription>
            Maak verticale stories in 9:16 formaat voor Instagram
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Template Selector */}
            <div>
              <label className="text-sm font-medium mb-2 block">Template</label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STORY_TEMPLATES.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project Selector */}
            <div>
              <label className="text-sm font-medium mb-2 block">Project (optioneel)</label>
              <Select 
                value={selectedProjectId} 
                onValueChange={(value) => {
                  setSelectedProjectId(value);
                  setSelectedBackgroundImage(""); // Reset image on project change
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Geen project</SelectItem>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Project Image Picker */}
          {selectedProject && (
            <ProjectImagePicker
              featuredImage={selectedProject.featured_image}
              images={selectedProject.images}
              selectedImage={selectedBackgroundImage || selectedProject.featured_image || ""}
              onSelectImage={setSelectedBackgroundImage}
            />
          )}

          {/* Text Inputs */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Headline</label>
              <Input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Voer je headline in"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Subtext</label>
              <Textarea
                value={subtext}
                onChange={(e) => setSubtext(e.target.value)}
                placeholder="Voer je tekst in"
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">CTA</label>
              <Input
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                placeholder="Call to action"
              />
            </div>
          </div>

          {/* Export Button */}
          <Button onClick={handleExport} disabled={isExporting} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "Exporteren..." : "Download Story"}
          </Button>
        </CardContent>
      </Card>

      {/* Preview */}
      <div className="flex justify-center">
        <div className="overflow-auto bg-muted/30 rounded-lg p-4">
          <div className="origin-top" style={{ transform: "scale(0.35)" }}>
            {/* Story Canvas - 9:16 ratio */}
            <div
              ref={storyRef}
              className="relative"
              style={{
                width: "1080px",
                height: "1920px",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {/* Background */}
              {backgroundImage ? (
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${backgroundImage})` }}
                />
              ) : (
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.7) 100%)",
                  }}
                />
              )}

              {/* Gradient Overlay */}
              <div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.8) 100%)",
                }}
              />

              {/* Top Branding */}
              <div className="absolute top-16 left-0 right-0 flex justify-center">
                <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-full px-8 py-4">
                  <div className="bg-white text-gray-900 rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl">
                    V
                  </div>
                  <span className="text-white font-medium" style={{ fontSize: "24px" }}>
                    vivavastgoed.es
                  </span>
                </div>
              </div>

              {/* Main Content */}
              <div className="absolute bottom-0 left-0 right-0 p-16">
                {/* Tag */}
                {template && (
                  <div
                    className="inline-block bg-white text-gray-900 font-bold uppercase tracking-wider px-6 py-3 rounded-full mb-8"
                    style={{ fontSize: "18px" }}
                  >
                    {template.name}
                  </div>
                )}

                {/* Headline */}
                <h1
                  className="text-white mb-6"
                  style={{
                    fontSize: "72px",
                    fontWeight: 700,
                    lineHeight: 1.1,
                    fontFamily: "'Playfair Display', Georgia, serif",
                    textShadow: "0 4px 30px rgba(0,0,0,0.5)",
                  }}
                >
                  {headline}
                </h1>

                {/* Subtext */}
                <p
                  className="text-white/90 mb-8"
                  style={{
                    fontSize: "32px",
                    lineHeight: 1.4,
                  }}
                >
                  {subtext}
                </p>

                {/* Project Info */}
                {selectedProject && (
                  <div className="flex gap-4 mb-10">
                    <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-8 py-5">
                      <div className="text-white/70" style={{ fontSize: "20px" }}>
                        Locatie
                      </div>
                      <div className="text-white font-semibold" style={{ fontSize: "28px" }}>
                        {selectedProject.city}
                      </div>
                    </div>
                    {selectedProject.price_from && (
                      <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-8 py-5">
                        <div className="text-white/70" style={{ fontSize: "20px" }}>
                          Vanaf
                        </div>
                        <div className="text-white font-semibold" style={{ fontSize: "28px" }}>
                          {formatCurrency(selectedProject.price_from, 0)}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* CTA */}
                <div
                  className="bg-white text-gray-900 rounded-full px-12 py-6 font-bold inline-block"
                  style={{ fontSize: "28px" }}
                >
                  {ctaText}
                </div>

                {/* Swipe indicator */}
                <div className="mt-12 flex justify-center">
                  <div className="text-white/60 flex flex-col items-center gap-2">
                    <svg
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="animate-bounce"
                    >
                      <path d="M7 11l5 5 5-5" />
                    </svg>
                    <span style={{ fontSize: "20px" }}>Swipe up</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground text-center">
        💡 Selecteer een project om automatisch afbeelding en locatie in te vullen.
      </p>
    </div>
  );
}
