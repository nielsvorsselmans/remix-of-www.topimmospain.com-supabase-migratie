import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Download, FileDown, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import JSZip from "jszip";
import { jsPDF } from "jspdf";
import { SlideContent } from "./types";
import { CoverSlide } from "./slides/CoverSlide";
import { ContentSlide } from "./slides/ContentSlide";
import { CtaSlide } from "./slides/CtaSlide";
import { useCreateExport, uploadExportToStorage } from "./hooks/useVisualExports";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const SLIDE_TEMPLATES = [
  { id: "cover", name: "Cover Slide", type: "cover" as const },
  { id: "content", name: "Content Slide", type: "content" as const },
  { id: "tip", name: "Tip Slide", type: "tip" as const },
  { id: "stat", name: "Stats Slide", type: "stat" as const },
  { id: "cta", name: "CTA Slide", type: "cta" as const },
];

interface ProjectForCarousel {
  id: string;
  name: string;
  featured_image: string | null;
  images: string[] | null;
  city: string | null;
}

async function fetchProjectsForCarousel(): Promise<ProjectForCarousel[]> {
  const { data, error } = await supabase.from("projects" as never).select("id, name, featured_image, images, city" as never).eq("active" as never, true).order("name" as never);
  if (error) throw error;
  return (data || []) as ProjectForCarousel[];
}

export function CarouselBuilder() {
  const [slides, setSlides] = useState<SlideContent[]>([
    {
      id: "1",
      type: "cover",
      headline: "5 Tips voor Investeren in Spaans Vastgoed",
      subtext: "Swipe voor meer →",
    },
  ]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const createExport = useCreateExport();

  // Fetch projects for image selection
  const { data: projects } = useQuery({
    queryKey: ["projects-for-carousel"],
    queryFn: fetchProjectsForCarousel,
  });

  const selectedProject = projects?.find((p) => p.id === selectedProjectId);

  const addSlide = (type: SlideContent["type"]) => {
    const newSlide: SlideContent = {
      id: Date.now().toString(),
      type,
      headline: type === "tip" ? `Tip ${slides.length}` : "",
      subtext: "",
      tipNumber: type === "tip" ? slides.length : undefined,
    };
    setSlides([...slides, newSlide]);
    setCurrentSlideIndex(slides.length);
  };

  const removeSlide = (index: number) => {
    if (slides.length <= 1) {
      toast.error("Je hebt minimaal 1 slide nodig");
      return;
    }
    const newSlides = slides.filter((_, i) => i !== index);
    setSlides(newSlides);
    if (currentSlideIndex >= newSlides.length) {
      setCurrentSlideIndex(newSlides.length - 1);
    }
  };

  const updateSlide = (index: number, updates: Partial<SlideContent>) => {
    setSlides(slides.map((slide, i) => (i === index ? { ...slide, ...updates } : slide)));
  };

  const setSlideRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
    slideRefs.current[index] = el;
  }, []);

  const exportSlides = async (format: "pdf" | "zip") => {
    setIsExporting(true);
    try {
      await document.fonts.ready;

      const images: { dataUrl: string; index: number }[] = [];

      // Render all slides
      for (let i = 0; i < slides.length; i++) {
        const slideEl = slideRefs.current[i];
        if (!slideEl) continue;

        const dataUrl = await toPng(slideEl, {
          quality: 1,
          pixelRatio: 2,
          backgroundColor: "#ffffff",
        });
        images.push({ dataUrl, index: i });
      }

      const timestamp = Date.now();
      let blob: Blob;
      let fileName: string;

      if (format === "pdf") {
        // Create PDF
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "px",
          format: [1080, 1350],
        });

        for (let i = 0; i < images.length; i++) {
          if (i > 0) pdf.addPage([1080, 1350]);
          pdf.addImage(images[i].dataUrl, "PNG", 0, 0, 1080, 1350);
        }

        blob = pdf.output("blob");
        fileName = `carousel-${timestamp}.pdf`;
      } else {
        // Create ZIP
        const zip = new JSZip();
        for (const img of images) {
          const response = await fetch(img.dataUrl);
          const imgBlob = await response.blob();
          zip.file(`slide-${String(img.index + 1).padStart(2, "0")}.png`, imgBlob);
        }
        blob = await zip.generateAsync({ type: "blob" });
        fileName = `carousel-${timestamp}.zip`;
      }

      // Upload and save export
      try {
        const fileUrl = await uploadExportToStorage(blob, fileName);
        await createExport.mutateAsync({
          project_id: selectedProjectId || undefined,
          export_type: format,
          file_url: fileUrl,
          file_name: fileName,
          metadata: {
            slideCount: slides.length,
            projectName: selectedProject?.name,
          },
        });
      } catch (uploadError) {
        console.warn("Could not save export to history:", uploadError);
      }

      // Download
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();

      toast.success(`Carrousel geëxporteerd als ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Fout bij exporteren");
    } finally {
      setIsExporting(false);
    }
  };

  const currentSlide = slides[currentSlideIndex];

  const renderSlide = (slide: SlideContent, index: number) => {
    const commonProps = {
      slide,
      onUpdate: (updates: Partial<SlideContent>) => updateSlide(index, updates),
    };

    switch (slide.type) {
      case "cover":
        return (
          <CoverSlide
            key={slide.id}
            ref={setSlideRef(index)}
            projectName={selectedProject?.name}
            {...commonProps}
          />
        );
      case "cta":
        return (
          <CtaSlide
            key={slide.id}
            ref={setSlideRef(index)}
            slideNumber={index + 1}
            totalSlides={slides.length}
            {...commonProps}
          />
        );
      default:
        return (
          <ContentSlide
            key={slide.id}
            ref={setSlideRef(index)}
            slideNumber={index + 1}
            totalSlides={slides.length}
            {...commonProps}
          />
        );
    }
  };

  // Get all project images
  const allProjectImages: string[] = selectedProject
    ? [selectedProject.featured_image, ...(selectedProject.images || [])].filter((img): img is string => Boolean(img))
    : [];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            LinkedIn Carrousel Builder
          </CardTitle>
          <CardDescription>
            Maak professionele carrousels in 4:5 formaat voor LinkedIn
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Project Selector */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Project (optioneel)</label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer een project voor afbeeldingen" />
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
          </div>

          {/* Slide Management */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Slide toevoegen</label>
              <div className="flex gap-2 flex-wrap">
                {SLIDE_TEMPLATES.map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    size="sm"
                    onClick={() => addSlide(template.type)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {template.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Slide Navigation */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                disabled={currentSlideIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[80px] text-center">
                Slide {currentSlideIndex + 1} / {slides.length}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))}
                disabled={currentSlideIndex === slides.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeSlide(currentSlideIndex)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => exportSlides("zip")}
                disabled={isExporting}
              >
                <Download className="h-4 w-4 mr-2" />
                ZIP (PNG's)
              </Button>
              <Button onClick={() => exportSlides("pdf")} disabled={isExporting}>
                <FileDown className="h-4 w-4 mr-2" />
                {isExporting ? "Exporteren..." : "Download PDF"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Slide Thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            onClick={() => setCurrentSlideIndex(index)}
            className={`flex-shrink-0 w-20 h-25 rounded-lg border-2 overflow-hidden transition-all ${
              index === currentSlideIndex
                ? "border-primary ring-2 ring-primary/20"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
              {index + 1}
            </div>
          </button>
        ))}
      </div>

      {/* Project Images Selector */}
      {selectedProject && allProjectImages.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Projectafbeeldingen
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="flex gap-2 overflow-x-auto">
              {allProjectImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => updateSlide(currentSlideIndex, { imageUrl: img })}
                  className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-colors"
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Slide Preview */}
      <div className="overflow-auto bg-muted/30 rounded-lg p-4">
        <div className="origin-top-left" style={{ transform: "scale(0.4)", width: "250%" }}>
          {renderSlide(currentSlide, currentSlideIndex)}
        </div>
      </div>

      {/* Hidden renders for all slides (needed for export) */}
      <div className="hidden">
        {slides.map((slide, index) => renderSlide(slide, index))}
      </div>

      <p className="text-sm text-muted-foreground text-center">
        💡 Klik op tekst om te bewerken. Selecteer afbeeldingen uit het project hierboven.
      </p>
    </div>
  );
}
