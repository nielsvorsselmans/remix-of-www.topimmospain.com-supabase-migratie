import { FileText, Download, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ProjectDocument } from "@/hooks/useEnrichedTrips";

interface DocumentsPreviewProps {
  documents: ProjectDocument[];
}

// Document type to icon mapping
const getDocumentIcon = (type: string) => {
  return FileText;
};

export function DocumentsPreview({ documents }: DocumentsPreviewProps) {
  // Show max 4 documents
  const previewDocs = documents.slice(0, 4);
  const remainingCount = documents.length - previewDocs.length;

  if (previewDocs.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Belangrijke documenten
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {previewDocs.map((doc) => {
          const Icon = getDocumentIcon(doc.document_type);
          return (
            <a
              key={doc.id}
              href={doc.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors group"
            >
              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.title}</p>
                <p className="text-xs text-muted-foreground capitalize">{doc.document_type}</p>
              </div>
              <Download className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </a>
          );
        })}

        {remainingCount > 0 && (
          <Button variant="ghost" asChild className="w-full mt-2">
            <Link to="/dashboard/documenten">
              + {remainingCount} meer documenten
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
