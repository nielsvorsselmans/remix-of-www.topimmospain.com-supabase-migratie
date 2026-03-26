import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Layers, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import JSZip from "jszip";
import { AD_FORMATS, AdFormat } from "./types";
import { useCreateExport, uploadExportToStorage } from "./hooks/useVisualExports";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { ProjectImagePicker } from "./ProjectImagePicker";

interface ProjectForAds {
  id: string;
  name: string;
  featured_image: string | null;
  images: string[] | null;
  city: string | null;
  price_from: number | null;
}

async function fetchProjectsForAds(): Promise<ProjectForAds[]> {
  const { data, error } = await supabase.from("projects" as never).select("id, name, featured_image, images, city, price_from" as never).eq("active" as never, true).order("name" as never);
  if (error) throw error;
  return (data || []) as ProjectForAds[];
}

export function AdFormatGenerator() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedBackgroundImage, setSelectedBackgroundImage] = useState<string>("");
  const [headline, setHeadline] = useState("Investeren in Spaans vastgoed");
  const [subtext, setSubtext] = useState("Ontdek unieke mogelijkheden");
  const [ctaText, setCtaText] = useState("Meer info →");
  const [selectedFormats, setSelectedFormats] = useState<string[]>(["Facebook Feed", "Instagram Feed"]);
  const [isExporting, setIsExporting] = useState(false);
  const adRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const createExport = useCreateExport();

  const { data: projects } = useQuery({
    queryKey: ["projects-for-ads"],
    queryFn: fetchProjectsForAds,
  });

  const selectedProject = projects?.find((p) => p.id === selectedProjectId);
  const backgroundImage = selectedBackgroundImage || selectedProject?.featured_image;

  const toggleFormat = (formatName: string) => {
    setSelectedFormats((prev) =>
      prev.includes(formatName)
        ? prev.filter((f) => f !== formatName)
        : [...prev, formatName]
    );
  };

  const handleExport = async () => {
    if (selectedFormats.length === 0) {
      toast.error("Selecteer minimaal één formaat");
      return;
    }

    setIsExporting(true);
    try {
      await document.fonts.ready;

      const zip = new JSZip();

      for (const formatName of selectedFormats) {
        const ref = adRefs.current.get(formatName);
        if (!ref) continue;

        const dataUrl = await toPng(ref, {
          quality: 1,
          pixelRatio: 2,
          backgroundColor: "#ffffff",
        });

        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const safeName = formatName.toLowerCase().replace(/\s+/g, "-");
        zip.file(`${safeName}.png`, blob);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const fileName = `ads-${Date.now()}.zip`;

      // Upload and save export
      try {
        const fileUrl = await uploadExportToStorage(zipBlob, fileName);
        await createExport.mutateAsync({
          project_id: selectedProjectId || undefined,
          export_type: "zip",
          file_url: fileUrl,
          file_name: fileName,
          metadata: {
            formats: selectedFormats,
            projectName: selectedProject?.name,
          },
        });
      } catch (uploadError) {
        console.warn("Could not save export to history:", uploadError);
      }

      // Download
      const link = document.createElement("a");
      link.href = URL.createObjectURL(zipBlob);
      link.download = fileName;
      link.click();

      toast.success(`${selectedFormats.length} formaten geëxporteerd!`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Fout bij exporteren");
    } finally {
      setIsExporting(false);
    }
  };

  const renderAd = (format: AdFormat) => {
    const aspectRatio = format.width / format.height;
    const isVertical = aspectRatio < 1;
    const isSquare = Math.abs(aspectRatio - 1) < 0.1;

    return (
      <div
        key={format.name}
        ref={(el) => {
          if (el) adRefs.current.set(format.name, el);
        }}
        className="relative overflow-hidden"
        style={{
          width: `${format.width}px`,
          height: `${format.height}px`,
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
            background: isVertical
              ? "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%)"
              : "linear-gradient(to right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 100%)",
          }}
        />

        {/* Content */}
        <div
          className={`absolute inset-0 flex ${
            isVertical ? "flex-col justify-end" : "flex-col justify-center"
          }`}
          style={{
            padding: isSquare ? "48px" : isVertical ? "64px" : "40px",
          }}
        >
          {/* Branding */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className="bg-white text-gray-900 rounded-full flex items-center justify-center font-bold"
              style={{
                width: isVertical ? "48px" : "36px",
                height: isVertical ? "48px" : "36px",
                fontSize: isVertical ? "20px" : "16px",
              }}
            >
              V
            </div>
            <span
              className="text-white font-medium"
              style={{ fontSize: isVertical ? "20px" : "14px" }}
            >
              Viva Vastgoed
            </span>
          </div>

          {/* Headline */}
          <h2
            className="text-white mb-3"
            style={{
              fontSize: isVertical ? "48px" : isSquare ? "42px" : "28px",
              fontWeight: 700,
              lineHeight: 1.1,
              fontFamily: "'Playfair Display', Georgia, serif",
              maxWidth: isVertical ? "100%" : "60%",
            }}
          >
            {headline}
          </h2>

          {/* Subtext */}
          <p
            className="text-white/90 mb-4"
            style={{
              fontSize: isVertical ? "24px" : isSquare ? "20px" : "16px",
              maxWidth: isVertical ? "100%" : "50%",
            }}
          >
            {subtext}
          </p>

          {/* Project Info */}
          {selectedProject && (
            <div className="flex gap-3 mb-4">
              {selectedProject.city && (
                <div
                  className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2"
                  style={{ fontSize: isVertical ? "18px" : "14px" }}
                >
                  <span className="text-white">📍 {selectedProject.city}</span>
                </div>
              )}
              {selectedProject.price_from && (
                <div
                  className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2"
                  style={{ fontSize: isVertical ? "18px" : "14px" }}
                >
                  <span className="text-white">Vanaf {formatCurrency(selectedProject.price_from, 0)}</span>
                </div>
              )}
            </div>
          )}

          {/* CTA */}
          <div
            className="bg-white text-gray-900 rounded-full px-6 py-3 font-bold inline-block w-fit"
            style={{ fontSize: isVertical ? "20px" : "14px" }}
          >
            {ctaText}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Advertorial Ad Builder
          </CardTitle>
          <CardDescription>
            Genereer één design in meerdere formaten tegelijk
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Project Selector */}
          <div>
            <label className="text-sm font-medium mb-2 block">Project</label>
            <Select 
              value={selectedProjectId} 
              onValueChange={(value) => {
                setSelectedProjectId(value);
                setSelectedBackgroundImage(""); // Reset on project change
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer een project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Geen project</SelectItem>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name} - {project.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Headline</label>
              <Input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Voer je headline in"
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
          <div>
            <label className="text-sm font-medium mb-2 block">Subtext</label>
            <Input
              value={subtext}
              onChange={(e) => setSubtext(e.target.value)}
              placeholder="Korte beschrijving"
            />
          </div>

          {/* Format Selection */}
          <div>
            <label className="text-sm font-medium mb-3 block">Formaten</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {AD_FORMATS.map((format) => (
                <div
                  key={format.name}
                  onClick={() => toggleFormat(format.name)}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedFormats.includes(format.name)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Checkbox
                    checked={selectedFormats.includes(format.name)}
                    onCheckedChange={() => toggleFormat(format.name)}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{format.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {format.width}x{format.height}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Export Button */}
          <Button onClick={handleExport} disabled={isExporting || selectedFormats.length === 0} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "Exporteren..." : `Download ${selectedFormats.length} formaten`}
          </Button>
        </CardContent>
      </Card>

      {/* Previews */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-primary" />
          Geselecteerde formaten preview
        </h3>
        <div className="grid gap-6">
          {selectedFormats.map((formatName) => {
            const format = AD_FORMATS.find((f) => f.name === formatName);
            if (!format) return null;

            const maxPreviewWidth = 500;
            const scale = Math.min(maxPreviewWidth / format.width, 0.5);

            return (
              <div key={format.name} className="space-y-2">
                <div className="text-sm font-medium flex items-center gap-2">
                  {format.name}
                  <span className="text-muted-foreground">
                    ({format.width}x{format.height})
                  </span>
                </div>
                <div className="overflow-auto bg-muted/30 rounded-lg p-4 inline-block">
                  <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
                    {renderAd(format)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hidden renders for export */}
      <div className="hidden">
        {AD_FORMATS.map((format) => renderAd(format))}
      </div>

      <p className="text-sm text-muted-foreground text-center">
        💡 Het design past zich automatisch aan per formaat. Alle geselecteerde formaten worden gebundeld in één ZIP.
      </p>
    </div>
  );
}
