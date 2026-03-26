import { useRef, useState, useCallback } from "react";
import { toPng } from "html-to-image";
import { Download, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface NewsCardVisualProps {
  initialTag?: string;
  initialHeadline?: string;
  initialSubtext?: string;
  projectImageUrl?: string | null;
  projectName?: string;
}

export function NewsCardVisual({
  initialTag = "EXPERTISE",
  initialHeadline = "Voer hier je kop in",
  initialSubtext = "Voer hier je lead-tekst in die onder de afbeelding komt te staan...",
  projectImageUrl,
  projectName,
}: NewsCardVisualProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Get today's date formatted
  const today = new Date().toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;

    setIsExporting(true);
    try {
      // Wait for fonts to load
      await document.fonts.ready;

      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2, // High resolution
        backgroundColor: "#ffffff",
        skipFonts: false,
      });

      // Create download link
      const link = document.createElement("a");
      link.download = `viva-nieuws-update-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      toast.success("Afbeelding gedownload!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Fout bij exporteren van afbeelding");
    } finally {
      setIsExporting(false);
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Download Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleDownload}
          disabled={isExporting}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          {isExporting ? "Exporteren..." : "Download als Afbeelding"}
        </Button>
      </div>

      {/* Scaled Preview Container */}
      <div className="overflow-auto bg-muted/30 rounded-lg p-4">
        <div className="origin-top-left" style={{ transform: "scale(0.5)", width: "200%" }}>
          {/* The actual card - 1080px x 1350px (4:5 ratio) */}
          <div
            ref={cardRef}
            className="bg-white relative"
            style={{
              width: "1080px",
              height: "1350px",
              padding: "40px",
              fontFamily: "'Playfair Display', Georgia, serif",
            }}
          >
            {/* Inner container with flex layout */}
            <div className="flex flex-col h-full">
              {/* Header Section */}
              <div className="space-y-4 mb-6">
                {/* Tag */}
                <div
                  contentEditable
                  suppressContentEditableWarning
                  className="inline-block bg-red-600 text-white text-sm font-bold uppercase tracking-wider px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 cursor-text"
                  style={{ fontSize: "14px" }}
                >
                  {initialTag}
                </div>

                {/* Headline - Editable */}
                <h1
                  contentEditable
                  suppressContentEditableWarning
                  className="text-black leading-tight focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-text"
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: "56px",
                    fontWeight: 700,
                    lineHeight: 1.1,
                  }}
                >
                  {initialHeadline}
                </h1>

                {/* Subline - Date */}
                <p
                  className="text-gray-500"
                  style={{ fontSize: "16px", fontFamily: "system-ui, sans-serif" }}
                >
                  Gepubliceerd op {today}
                </p>
              </div>

              {/* Image Section - Grows to fill available space */}
              <div
                className="flex-1 rounded-lg overflow-hidden relative bg-gray-100 mb-6"
                style={{ minHeight: "500px" }}
              >
                {projectImageUrl ? (
                  <img
                    src={projectImageUrl}
                    alt={projectName || "Project afbeelding"}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-4">
                    <ImageIcon style={{ width: "80px", height: "80px" }} />
                    <span style={{ fontSize: "20px", fontFamily: "system-ui, sans-serif" }}>
                      Geen afbeelding beschikbaar
                    </span>
                  </div>
                )}
              </div>

              {/* Lead Text / Footer - Editable */}
              <div
                contentEditable
                suppressContentEditableWarning
                className="text-black focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-text"
                style={{
                  fontSize: "24px",
                  fontFamily: "system-ui, sans-serif",
                  lineHeight: 1.5,
                }}
              >
                {initialSubtext}
              </div>
            </div>

            {/* Viva Vastgoed Branding - Bottom right */}
            <div
              className="absolute bottom-10 right-10 flex items-center gap-3"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl">
                V
              </div>
              <div>
                <div className="text-gray-800 font-semibold" style={{ fontSize: "18px" }}>
                  Viva Vastgoed
                </div>
                <div className="text-gray-500" style={{ fontSize: "14px" }}>
                  vivavastgoed.es
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <p className="text-sm text-muted-foreground text-center">
        💡 Klik op de tekst in de preview om direct te bewerken. Wijzigingen worden meegenomen in de download.
      </p>
    </div>
  );
}
