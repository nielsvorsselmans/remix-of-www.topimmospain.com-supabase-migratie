import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileText, FileImage, ExternalLink, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { downloadFile } from "@/utils/downloadFile";
const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  beschikbaarheidslijst: "Beschikbaarheidslijst",
  brochure: "Brochure",
  grondplan: "Grondplannen",
  masterplan: "Masterplan",
  prijslijst: "Prijslijst",
  specificaties: "Specificaties",
  andere: "Overige Documenten",
};

const DOCUMENT_TYPE_ORDER = [
  "beschikbaarheidslijst",
  "prijslijst",
  "brochure",
  "grondplan",
  "masterplan",
  "specificaties",
  "andere",
];

interface ProjectDocument {
  id: string;
  title: string;
  document_type: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
}

interface ProjectDocumentsSectionProps {
  projectId: string;
  visibilityType: "public" | "portal";
}

export function ProjectDocumentsSection({
  projectId,
  visibilityType,
}: ProjectDocumentsSectionProps) {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [openTypes, setOpenTypes] = useState<string[]>([]);

  useEffect(() => {
    fetchDocuments();
  }, [projectId, visibilityType]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const visibilityColumn = visibilityType === "public" ? "visible_public" : "visible_portal";
      
      const { data, error } = await supabase
        .from("project_documents")
        .select("id, title, document_type, file_url, file_name, file_size")
        .eq("project_id", projectId)
        .eq(visibilityColumn, true)
        .order("order_index", { ascending: true });

      if (error) throw error;
      setDocuments(data || []);
      
      // Auto-open first type that has documents
      if (data && data.length > 0) {
        const firstType = data[0].document_type;
        setOpenTypes([firstType]);
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png"].includes(ext || "")) {
      return <FileImage className="h-4 w-4 text-blue-500" />;
    }
    return <FileText className="h-4 w-4 text-red-500" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const toggleType = (type: string) => {
    setOpenTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  // Group documents by type
  const groupedDocuments = documents.reduce((acc, doc) => {
    if (!acc[doc.document_type]) {
      acc[doc.document_type] = [];
    }
    acc[doc.document_type].push(doc);
    return acc;
  }, {} as Record<string, ProjectDocument[]>);

  // Sort types by predefined order
  const sortedTypes = Object.keys(groupedDocuments).sort(
    (a, b) => DOCUMENT_TYPE_ORDER.indexOf(a) - DOCUMENT_TYPE_ORDER.indexOf(b)
  );

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (documents.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <FileText className="h-5 w-5" />
        Documenten
      </h3>
      
      <div className="space-y-2">
        {sortedTypes.map((type) => (
          <Collapsible
            key={type}
            open={openTypes.includes(type)}
            onOpenChange={() => toggleType(type)}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between h-auto py-3 px-4 bg-muted/50 hover:bg-muted"
              >
                <span className="font-medium">
                  {DOCUMENT_TYPE_LABELS[type] || type}
                  <span className="ml-2 text-muted-foreground text-sm">
                    ({groupedDocuments[type].length})
                  </span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    openTypes.includes(type) ? "rotate-180" : ""
                  }`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="space-y-1 pl-2">
                {groupedDocuments[type].map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => downloadFile(doc.file_url, { filename: doc.file_name })}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors group w-full text-left"
                  >
                    {getFileIcon(doc.file_name)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(doc.file_size)}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  );
}
