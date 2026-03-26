import { SaleChoiceAttachment } from "@/hooks/useSaleChoices";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Image, Trash2 } from "lucide-react";

interface Props {
  attachments: SaleChoiceAttachment[];
  onUpload: (file: File) => void;
  onDelete: (id: string, filePath: string) => void;
}

export function ChoiceAttachments({ attachments, onUpload, onDelete }: Props) {
  const docs = attachments.filter(a => a.file_type !== 'quote');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Bijlagen</Label>
        <label>
          <Button variant="outline" size="sm" asChild>
            <span className="cursor-pointer">
              <Upload className="h-3.5 w-3.5 mr-1" /> Upload
            </span>
          </Button>
          <input
            type="file"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = '';
            }}
          />
        </label>
      </div>

      {docs.length === 0 ? (
        <p className="text-xs text-muted-foreground">Geen bijlagen.</p>
      ) : (
        <div className="space-y-1">
          {docs.map(att => (
            <div key={att.id} className="flex items-center gap-2 p-2 rounded border text-sm">
              {att.file_type === 'image' ? (
                <Image className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <a href={att.file_url} target="_blank" rel="noopener" className="flex-1 truncate text-primary underline">
                {att.file_name}
              </a>
              {att.file_size && (
                <span className="text-xs text-muted-foreground">{(att.file_size / 1024).toFixed(0)}KB</span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive"
                onClick={() => onDelete(att.id, att.file_path)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
