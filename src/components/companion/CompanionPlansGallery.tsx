import { useState } from "react";
import { X, FileText, Download } from "lucide-react";
import type { ProjectDocument } from "@/hooks/useEnrichedTrips";

const PLAN_TYPES = ["masterplan", "grondplan", "floorplan"];
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i;

interface CompanionPlansGalleryProps {
  documents: ProjectDocument[];
}

export function CompanionPlansGallery({ documents }: CompanionPlansGalleryProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const planDocs = documents.filter((d) =>
    PLAN_TYPES.includes(d.document_type?.toLowerCase() || "")
  );

  if (planDocs.length === 0) return null;

  const masterplans = planDocs.filter((d) => d.document_type?.toLowerCase() === "masterplan");
  const floorplans = planDocs.filter((d) => d.document_type?.toLowerCase() !== "masterplan");

  const isImage = (url: string) => IMAGE_EXTENSIONS.test(url);

  const labelForType = (type: string) => {
    switch (type.toLowerCase()) {
      case "masterplan": return "Masterplan";
      case "grondplan": return "Grondplan";
      case "floorplan": return "Plattegrond";
      default: return type;
    }
  };

  return (
    <>
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          📐 Plannen
          <span className="text-muted-foreground/60">({planDocs.length})</span>
        </p>

        {/* Masterplans — full width */}
        {masterplans.map((doc) => (
          <div key={doc.id} className="rounded-lg border overflow-hidden">
            {isImage(doc.file_url) ? (
              <button
                onClick={() => setLightboxUrl(doc.file_url)}
                className="w-full block"
              >
                <img
                  src={doc.file_url}
                  alt={doc.title || "Masterplan"}
                  className="w-full object-contain max-h-[400px] bg-muted/30"
                />
              </button>
            ) : (
              <a
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
              >
                <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{doc.title || "Masterplan"}</p>
                  <p className="text-xs text-muted-foreground">PDF · Tik om te openen</p>
                </div>
                <Download className="h-4 w-4 text-muted-foreground shrink-0" />
              </a>
            )}
            <div className="px-3 py-1.5 bg-muted/30 border-t">
              <p className="text-xs text-muted-foreground font-medium">{doc.title || "Masterplan"}</p>
            </div>
          </div>
        ))}

        {/* Floorplans — 2-column grid */}
        {floorplans.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {floorplans.map((doc) => (
              <div key={doc.id} className="rounded-lg border overflow-hidden">
                {isImage(doc.file_url) ? (
                  <button
                    onClick={() => setLightboxUrl(doc.file_url)}
                    className="w-full block"
                  >
                    <img
                      src={doc.file_url}
                      alt={doc.title || labelForType(doc.document_type)}
                      className="w-full aspect-square object-contain bg-muted/30"
                    />
                  </button>
                ) : (
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center gap-2 p-4 aspect-square hover:bg-muted/50 transition-colors"
                  >
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground text-center">PDF</p>
                  </a>
                )}
                <div className="px-2 py-1.5 bg-muted/30 border-t">
                  <p className="text-xs text-muted-foreground font-medium truncate">
                    {doc.title || labelForType(doc.document_type)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightboxUrl}
            alt="Plan detail"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

/** Utility: split documents into plan docs and other docs */
export function splitPlanDocuments(documents: ProjectDocument[]) {
  const planDocs = documents.filter((d) =>
    PLAN_TYPES.includes(d.document_type?.toLowerCase() || "")
  );
  const otherDocs = documents.filter(
    (d) => !PLAN_TYPES.includes(d.document_type?.toLowerCase() || "")
  );
  return { planDocs, otherDocs };
}
