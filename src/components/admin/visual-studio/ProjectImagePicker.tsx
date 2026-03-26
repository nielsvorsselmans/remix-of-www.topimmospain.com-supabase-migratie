import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageIcon, Star } from "lucide-react";

interface ProjectImagePickerProps {
  featuredImage?: string | null;
  images?: string[] | null;
  selectedImage?: string;
  onSelectImage: (imageUrl: string) => void;
}

export function ProjectImagePicker({
  featuredImage,
  images,
  selectedImage,
  onSelectImage,
}: ProjectImagePickerProps) {
  // Combine featured + gallery, removing duplicates
  const allImages = [featuredImage, ...(images || [])]
    .filter((img): img is string => Boolean(img))
    .filter((img, index, arr) => arr.indexOf(img) === index);

  if (allImages.length === 0) return null;

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Projectafbeeldingen ({allImages.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {allImages.map((img, i) => {
            const isFeatured = img === featuredImage;
            const isSelected = selectedImage === img;
            
            return (
              <button
                key={i}
                onClick={() => onSelectImage(img)}
                className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden 
                  border-2 transition-all ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/20 scale-105"
                      : "border-border hover:border-primary/50"
                  }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
                {isFeatured && (
                  <div className="absolute top-1 left-1 bg-amber-500 text-white rounded-full p-0.5">
                    <Star className="h-3 w-3 fill-current" />
                  </div>
                )}
                {isSelected && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <div className="bg-primary text-primary-foreground rounded-full p-1">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Klik op een afbeelding om deze als achtergrond te gebruiken
        </p>
      </CardContent>
    </Card>
  );
}
