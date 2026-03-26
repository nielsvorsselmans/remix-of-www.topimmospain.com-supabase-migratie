import { useState, useCallback } from "react";
import { Upload, X, Trash2, Star, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  MaterialOption,
  useAddMaterialOptionImage,
  useDeleteMaterialOptionImage,
} from "@/hooks/useMaterialSelections";
import { cn } from "@/lib/utils";
import imageCompression from "browser-image-compression";

interface MaterialImageUploaderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  option: MaterialOption;
  saleId: string;
}

export function MaterialImageUploader({
  open,
  onOpenChange,
  option,
  saleId,
}: MaterialImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const addImage = useAddMaterialOptionImage();
  const deleteImage = useDeleteMaterialOptionImage();

  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setUploading(true);
      try {
        for (const file of Array.from(files)) {
          // Compress image
          const compressed = await imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          });

          // Generate unique filename
          const ext = file.name.split(".").pop();
          const fileName = `${option.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

          // Upload to storage
          const { data, error } = await supabase.storage
            .from("material-images")
            .upload(fileName, compressed, {
              cacheControl: "3600",
              upsert: false,
            });

          if (error) {
            // If bucket doesn't exist, try creating via public URL
            console.error("Upload error:", error);
            toast.error(`Upload mislukt voor ${file.name}`);
            continue;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from("material-images")
            .getPublicUrl(data.path);

          // Add to database
          await addImage.mutateAsync({
            saleId,
            option_id: option.id,
            image_url: publicUrl,
            title: file.name,
            is_primary: (option.images?.length ?? 0) === 0,
            order_index: option.images?.length ?? 0,
          });
        }
        toast.success("Afbeelding(en) geüpload");
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Fout bij uploaden");
      } finally {
        setUploading(false);
      }
    },
    [option.id, option.images?.length, saleId, addImage]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFileUpload(e.dataTransfer.files);
    },
    [handleFileUpload]
  );

  const handleDeleteImage = async (imageId: string) => {
    await deleteImage.mutateAsync({ id: imageId, saleId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Afbeeldingen beheren</DialogTitle>
          <DialogDescription>
            Upload afbeeldingen voor {option.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload area */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25",
              uploading && "opacity-50 pointer-events-none"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              id="material-image-upload"
              onChange={(e) => handleFileUpload(e.target.files)}
              disabled={uploading}
            />
            <label
              htmlFor="material-image-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {uploading ? "Bezig met uploaden..." : "Sleep afbeeldingen hierheen"}
                </p>
                <p className="text-sm text-muted-foreground">
                  of klik om bestanden te selecteren
                </p>
              </div>
            </label>
          </div>

          {/* Existing images */}
          {option.images && option.images.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {option.images.map((image) => (
                <div
                  key={image.id}
                  className="relative group aspect-square rounded-lg overflow-hidden bg-muted"
                >
                  <img
                    src={image.image_url}
                    alt={image.title || "Material image"}
                    className="w-full h-full object-cover"
                  />
                  
                  {image.is_primary && (
                    <div className="absolute top-1 left-1 p-1 bg-yellow-500 rounded text-white">
                      <Star className="h-3 w-3 fill-current" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8"
                      onClick={() => handleDeleteImage(image.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nog geen afbeeldingen</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Sluiten
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
