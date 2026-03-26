import { FileText, ExternalLink, FileImage, List, BookOpen, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import type { ProjectDocument } from "@/hooks/useEnrichedTrips";
import { downloadFile } from "@/utils/downloadFile";

interface ViewingDocumentsGridProps {
  documents: ProjectDocument[];
  projectName: string;
}

function getDocumentIcon(type: string) {
  switch (type) {
    case "floorplan":
    case "grondplan":
      return <FileImage className="h-4 w-4 text-primary" />;
    case "pricelist":
    case "prijslijst":
      return <List className="h-4 w-4 text-primary" />;
    case "brochure":
      return <BookOpen className="h-4 w-4 text-primary" />;
    case "availability":
    case "beschikbaarheid":
      return <List className="h-4 w-4 text-primary" />;
    default:
      return <FileText className="h-4 w-4 text-primary" />;
  }
}

function getGroupLabel(type: string) {
  switch (type) {
    case "floorplan":
    case "grondplan":
      return "Grondplannen";
    case "pricelist":
    case "prijslijst":
      return "Prijslijsten";
    case "brochure":
      return "Brochures";
    case "availability":
    case "beschikbaarheid":
      return "Beschikbaarheid";
    default:
      return "Overige documenten";
  }
}

function groupDocumentsByType(documents: ProjectDocument[]) {
  const groups: Record<string, ProjectDocument[]> = {};
  
  // Define preferred order
  const typeOrder = ["grondplan", "floorplan", "brochure", "availability", "beschikbaarheid", "pricelist", "prijslijst", "andere"];
  
  documents.forEach(doc => {
    const type = doc.document_type || "andere";
    if (!groups[type]) groups[type] = [];
    groups[type].push(doc);
  });

  // Sort groups by preferred order
  const sortedGroups: Record<string, ProjectDocument[]> = {};
  typeOrder.forEach(type => {
    if (groups[type]) {
      sortedGroups[type] = groups[type];
    }
  });
  // Add any remaining types not in the order
  Object.keys(groups).forEach(type => {
    if (!sortedGroups[type]) {
      sortedGroups[type] = groups[type];
    }
  });

  return sortedGroups;
}

interface DocumentGroupProps {
  type: string;
  documents: ProjectDocument[];
  defaultOpen?: boolean;
}

function DocumentGroup({ type, documents, defaultOpen = true }: DocumentGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const label = getGroupLabel(type);
  const icon = getDocumentIcon(type);

  if (documents.length === 1) {
    const doc = documents[0];
    return (
      <button
        onClick={() => downloadFile(doc.file_url, { filename: doc.file_name })}
        className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:bg-accent transition-colors group w-full text-left"
      >
        {icon}
        <span className="flex-1 text-sm font-medium truncate">{doc.title}</span>
        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </button>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg bg-card">
      <CollapsibleTrigger className="flex items-center gap-3 w-full p-3 hover:bg-accent transition-colors rounded-lg">
        {icon}
        <span className="flex-1 text-left text-sm font-medium">
          {label} ({documents.length})
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t">
          {documents.map((doc, idx) => (
            <button
              key={doc.id}
              onClick={() => downloadFile(doc.file_url, { filename: doc.file_name })}
              className={`flex items-center gap-3 px-3 py-2.5 hover:bg-accent transition-colors group w-full text-left ${
                idx !== documents.length - 1 ? 'border-b' : ''
              }`}
            >
              <div className="w-4" /> {/* Spacer for alignment */}
              <span className="flex-1 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                {doc.title}
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ViewingDocumentsGrid({ documents, projectName }: ViewingDocumentsGridProps) {
  if (documents.length === 0) return null;

  const groupedDocs = groupDocumentsByType(documents);
  const groupKeys = Object.keys(groupedDocs);

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Documenten ({documents.length})
      </p>
      <div className="space-y-2">
        {groupKeys.map(type => (
          <DocumentGroup
            key={type}
            type={type}
            documents={groupedDocs[type]}
            defaultOpen={groupedDocs[type].length <= 3}
          />
        ))}
      </div>
    </div>
  );
}
