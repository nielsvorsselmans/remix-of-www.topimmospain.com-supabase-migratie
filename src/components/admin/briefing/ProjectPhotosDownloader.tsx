import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, ImageIcon, Loader2, Star, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";

interface ProjectPhotosDownloaderProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  images: string[];
  featuredImage?: string;
}

export function ProjectPhotosDownloader({
  isOpen,
  onClose,
  projectName,
  images,
  featuredImage,
}: ProjectPhotosDownloaderProps) {
  // Combine featured image with other images, removing duplicates
  const allImages = featuredImage
    ? [featuredImage, ...images.filter((img) => img !== featuredImage)]
    : images;

  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set(allImages));
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Reset selection when images change
  useEffect(() => {
    setSelectedImages(new Set(allImages));
  }, [images, featuredImage]);

  const toggleImage = (imageUrl: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageUrl)) {
      newSelected.delete(imageUrl);
    } else {
      newSelected.add(imageUrl);
    }
    setSelectedImages(newSelected);
  };

  const selectAll = () => {
    setSelectedImages(new Set(allImages));
  };

  const deselectAll = () => {
    setSelectedImages(new Set());
  };

  const downloadSelectedPhotos = async () => {
    if (selectedImages.size === 0) {
      toast.error("Selecteer minimaal één foto");
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const zip = new JSZip();
      const folder = zip.folder(projectName.replace(/[^a-zA-Z0-9-_ ]/g, ""));
      
      const selectedArray = Array.from(selectedImages);
      let completed = 0;

      for (let i = 0; i < selectedArray.length; i++) {
        const url = selectedArray[i];
        try {
          const response = await fetch(url);
          if (!response.ok) {
            console.error(`Failed to fetch image: ${url}`);
            continue;
          }
          const blob = await response.blob();
          
          // Extract file extension from URL or default to jpg
          const urlPath = new URL(url).pathname;
          const extension = urlPath.split('.').pop()?.toLowerCase() || 'jpg';
          const validExtension = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension) ? extension : 'jpg';
          
          // Mark featured image with star in filename
          const isFeatured = url === featuredImage;
          const filename = isFeatured 
            ? `01-featured.${validExtension}`
            : `${String(i + 1).padStart(2, '0')}-foto.${validExtension}`;
          
          folder?.file(filename, blob);
          
          completed++;
          setDownloadProgress(Math.round((completed / selectedArray.length) * 100));
        } catch (error) {
          console.error(`Error fetching image ${url}:`, error);
        }
      }

      if (completed === 0) {
        toast.error("Kon geen foto's downloaden. Probeer het opnieuw.");
        return;
      }

      const content = await zip.generateAsync({ type: "blob" });
      
      // Create download link
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `${projectName.replace(/[^a-zA-Z0-9-_ ]/g, "")}-fotos.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast.success(`${completed} foto${completed !== 1 ? "'s" : ""} gedownload`);
      onClose();
    } catch (error) {
      console.error("ZIP creation error:", error);
      toast.error("Er ging iets mis bij het maken van het ZIP bestand");
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Foto's downloaden
          </SheetTitle>
          <SheetDescription>
            Download projectfoto's voor sociale media
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Selection controls */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                disabled={selectedImages.size === allImages.length}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Alles
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={deselectAll}
                disabled={selectedImages.size === 0}
              >
                <Square className="h-4 w-4 mr-2" />
                Geen
              </Button>
            </div>
            <span className="text-sm text-muted-foreground">
              {selectedImages.size} van {allImages.length} geselecteerd
            </span>
          </div>

          {/* Photo grid */}
          <ScrollArea className="h-[400px] pr-4">
            {allImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ImageIcon className="h-12 w-12 mb-4 opacity-20" />
                <p>Geen foto's beschikbaar</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {allImages.map((imageUrl, index) => {
                  const isSelected = selectedImages.has(imageUrl);
                  const isFeatured = imageUrl === featuredImage;
                  
                  return (
                    <div
                      key={`${imageUrl}-${index}`}
                      className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                        isSelected
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-transparent hover:border-muted-foreground/30"
                      }`}
                      onClick={() => toggleImage(imageUrl)}
                    >
                      <img
                        src={imageUrl}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      
                      {/* Selection checkbox overlay */}
                      <div className="absolute top-2 left-2">
                        <Checkbox
                          checked={isSelected}
                          className="h-5 w-5 bg-background/80 border-2"
                        />
                      </div>

                      {/* Featured badge */}
                      {isFeatured && (
                        <div className="absolute top-2 right-2 bg-yellow-500 text-white rounded-full p-1">
                          <Star className="h-3 w-3 fill-current" />
                        </div>
                      )}

                      {/* Dim overlay when not selected */}
                      {!isSelected && (
                        <div className="absolute inset-0 bg-background/40" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Download button */}
          <div className="pt-4 border-t">
            <Button
              className="w-full"
              onClick={downloadSelectedPhotos}
              disabled={isDownloading || selectedImages.size === 0}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Downloaden... {downloadProgress}%
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download {selectedImages.size} foto{selectedImages.size !== 1 ? "'s" : ""} als ZIP
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
