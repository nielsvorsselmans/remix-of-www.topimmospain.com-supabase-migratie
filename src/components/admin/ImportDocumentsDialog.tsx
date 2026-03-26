import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileText, FolderOpen, ShoppingBag, Check } from "lucide-react";
import { useImportDocumentsToSale, SaleDocument } from "@/hooks/useSales";

interface ImportDocumentsDialogProps {
  saleId: string;
  projectId: string;
  existingDocuments: SaleDocument[];
  onClose: () => void;
}

interface ProjectDocument {
  id: string;
  title: string;
  document_type: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
}

interface OtherSaleDocument {
  id: string;
  sale_id: string;
  title: string;
  document_type: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  sale_info?: string;
}

// Map project document types to sale document types
const projectToSaleTypeMapping: Record<string, string> = {
  'grondplan': 'floor_plan',
  'floorplan': 'floor_plan',
  'masterplan': 'master_plan',
  'specificaties': 'specifications',
  'brochure': 'other',
  'prijslijst': 'other',
  'andere': 'other',
};

function mapProjectTypeToSaleType(projectType: string): string {
  return projectToSaleTypeMapping[projectType.toLowerCase()] || 'other';
}

function getDocumentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'floor_plan': 'Grondplan',
    'master_plan': 'Masterplan',
    'specifications': 'Specificatielijst',
    'bank_guarantee': 'Bankgarantie',
    'building_permit': 'Bouwvergunning',
    'cadastral_file': 'Kadastrale fiche',
    'ownership_extract': 'Uittreksel eigendom',
    'reservation_contract': 'Reservatiecontract',
    'purchase_contract': 'Koopcontract',
    'other': 'Overig',
    // Project document types
    'grondplan': 'Grondplan',
    'masterplan': 'Masterplan',
    'brochure': 'Brochure',
    'prijslijst': 'Prijslijst',
    'specificaties': 'Specificaties',
  };
  return labels[type.toLowerCase()] || type;
}

export function ImportDocumentsDialog({ 
  saleId, 
  projectId, 
  existingDocuments,
  onClose 
}: ImportDocumentsDialogProps) {
  const [selectedProjectDocs, setSelectedProjectDocs] = useState<string[]>([]);
  const [selectedSaleDocs, setSelectedSaleDocs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("project");

  const importDocuments = useImportDocumentsToSale();

  // Fetch project documents
  const { data: projectDocuments = [], isLoading: loadingProjectDocs } = useQuery({
    queryKey: ['project-documents-for-import', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_documents')
        .select('id, title, document_type, file_url, file_name, file_size')
        .eq('project_id', projectId)
        .order('document_type');

      if (error) throw error;
      return data as ProjectDocument[];
    },
  });

  // Fetch documents from other sales in same project
  const { data: otherSaleDocuments = [], isLoading: loadingOtherDocs } = useQuery({
    queryKey: ['other-sale-documents-for-import', projectId, saleId],
    queryFn: async () => {
      // First get all sales for this project except current sale
      const { data: otherSales, error: salesError } = await supabase
        .from('sales')
        .select('id, property_description')
        .eq('project_id', projectId)
        .neq('id', saleId);

      if (salesError) throw salesError;
      if (!otherSales?.length) return [];

      const saleIds = otherSales.map(s => s.id);

      // Get documents from these sales
      const { data: docs, error: docsError } = await supabase
        .from('sale_documents')
        .select('id, sale_id, title, document_type, file_url, file_name, file_size')
        .in('sale_id', saleIds)
        .order('document_type');

      if (docsError) throw docsError;

      // Add sale info to each document
      return (docs || []).map(doc => ({
        ...doc,
        sale_info: otherSales.find(s => s.id === doc.sale_id)?.property_description || 'Andere verkoop',
      })) as OtherSaleDocument[];
    },
  });

  // Filter out documents that already exist (by file_url)
  const existingFileUrls = useMemo(() => 
    new Set(existingDocuments.map(d => d.file_url)),
    [existingDocuments]
  );

  const availableProjectDocs = useMemo(() => 
    projectDocuments.filter(doc => !existingFileUrls.has(doc.file_url)),
    [projectDocuments, existingFileUrls]
  );

  // Create set of existing file names for deduplication
  const existingFileNames = useMemo(() => 
    new Set(existingDocuments.map(d => d.file_name)),
    [existingDocuments]
  );

  const availableOtherSaleDocs = useMemo(() => {
    // First filter out docs already in current sale (by file_name)
    const filtered = otherSaleDocuments.filter(doc => !existingFileNames.has(doc.file_name));
    
    // Then deduplicate by file_name (keep first occurrence)
    const seen = new Map<string, OtherSaleDocument>();
    filtered.forEach(doc => {
      if (!seen.has(doc.file_name)) {
        seen.set(doc.file_name, doc);
      }
    });
    
    return Array.from(seen.values());
  }, [otherSaleDocuments, existingFileNames]);

  // Group documents for better display
  const groupedProjectDocs = useMemo(() => {
    const groups: Record<string, ProjectDocument[]> = {};
    availableProjectDocs.forEach(doc => {
      const type = doc.document_type || 'other';
      if (!groups[type]) groups[type] = [];
      groups[type].push(doc);
    });
    return groups;
  }, [availableProjectDocs]);

  const groupedOtherSaleDocs = useMemo(() => {
    const groups: Record<string, OtherSaleDocument[]> = {};
    availableOtherSaleDocs.forEach(doc => {
      const type = doc.document_type || 'other';
      if (!groups[type]) groups[type] = [];
      groups[type].push(doc);
    });
    return groups;
  }, [availableOtherSaleDocs]);

  const handleImport = async () => {
    const documentsToImport: Array<{
      source: 'project' | 'sale';
      file_url: string;
      file_name: string;
      file_size: number | null;
      title: string;
      document_type: string;
    }> = [];

    // Add selected project documents
    selectedProjectDocs.forEach(id => {
      const doc = projectDocuments.find(d => d.id === id);
      if (doc) {
        documentsToImport.push({
          source: 'project',
          file_url: doc.file_url,
          file_name: doc.file_name,
          file_size: doc.file_size,
          title: doc.title,
          document_type: mapProjectTypeToSaleType(doc.document_type),
        });
      }
    });

    // Add selected other sale documents
    selectedSaleDocs.forEach(id => {
      const doc = otherSaleDocuments.find(d => d.id === id);
      if (doc) {
        documentsToImport.push({
          source: 'sale',
          file_url: doc.file_url,
          file_name: doc.file_name,
          file_size: doc.file_size,
          title: doc.title,
          document_type: doc.document_type,
        });
      }
    });

    if (documentsToImport.length === 0) return;

    await importDocuments.mutateAsync({
      saleId,
      documents: documentsToImport,
    });

    onClose();
  };

  const toggleProjectDoc = (id: string) => {
    setSelectedProjectDocs(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSaleDoc = (id: string) => {
    setSelectedSaleDocs(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const totalSelected = selectedProjectDocs.length + selectedSaleDocs.length;
  const isLoading = loadingProjectDocs || loadingOtherDocs;

  return (
    <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>Documenten Importeren</DialogTitle>
        <DialogDescription>
          Importeer documenten van het project of andere verkopen binnen dit project.
        </DialogDescription>
      </DialogHeader>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="project" className="gap-2">
                <FolderOpen className="h-4 w-4" />
                Van Project
                {availableProjectDocs.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {availableProjectDocs.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="sales" className="gap-2">
                <ShoppingBag className="h-4 w-4" />
                Van Andere Verkopen
                {availableOtherSaleDocs.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {availableOtherSaleDocs.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="project" className="flex-1 min-h-0 mt-4">
              <ScrollArea className="h-[350px] pr-4">
                {availableProjectDocs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Geen project documenten beschikbaar om te importeren.</p>
                    <p className="text-sm">Documenten die al geïmporteerd zijn worden niet getoond.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(groupedProjectDocs).map(([type, docs]) => (
                      <div key={type}>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">
                          {getDocumentTypeLabel(type)}
                        </h4>
                        <div className="space-y-2">
                          {docs.map(doc => (
                            <DocumentCheckboxRow
                              key={doc.id}
                              id={doc.id}
                              title={doc.title}
                              fileName={doc.file_name}
                              fileSize={doc.file_size}
                              badge="📁 Project"
                              selected={selectedProjectDocs.includes(doc.id)}
                              onToggle={() => toggleProjectDoc(doc.id)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="sales" className="flex-1 min-h-0 mt-4">
              <ScrollArea className="h-[350px] pr-4">
                {availableOtherSaleDocs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingBag className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Geen documenten van andere verkopen beschikbaar.</p>
                    <p className="text-sm">Upload eerst documenten bij een andere verkoop in dit project.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(groupedOtherSaleDocs).map(([type, docs]) => (
                      <div key={type}>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">
                          {getDocumentTypeLabel(type)}
                        </h4>
                        <div className="space-y-2">
                          {docs.map(doc => (
                            <DocumentCheckboxRow
                              key={doc.id}
                              id={doc.id}
                              title={doc.title}
                              fileName={doc.file_name}
                              fileSize={doc.file_size}
                              badge={`📋 ${doc.sale_info}`}
                              selected={selectedSaleDocs.includes(doc.id)}
                              onToggle={() => toggleSaleDoc(doc.id)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-between pt-4 border-t mt-4">
            <p className="text-sm text-muted-foreground">
              {totalSelected > 0 ? (
                <span className="flex items-center gap-1">
                  <Check className="h-4 w-4 text-green-600" />
                  {totalSelected} document{totalSelected !== 1 ? 'en' : ''} geselecteerd
                </span>
              ) : (
                'Selecteer documenten om te importeren'
              )}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Annuleren
              </Button>
              <Button 
                onClick={handleImport}
                disabled={totalSelected === 0 || importDocuments.isPending}
              >
                {importDocuments.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importeren...
                  </>
                ) : (
                  `Importeer ${totalSelected > 0 ? `(${totalSelected})` : ''}`
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </DialogContent>
  );
}

interface DocumentCheckboxRowProps {
  id: string;
  title: string;
  fileName: string;
  fileSize: number | null;
  badge: string;
  selected: boolean;
  onToggle: () => void;
}

function DocumentCheckboxRow({ 
  id, 
  title, 
  fileName, 
  fileSize, 
  badge, 
  selected, 
  onToggle 
}: DocumentCheckboxRowProps) {
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div 
      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
        selected ? 'bg-primary/5 border-primary' : 'bg-background hover:bg-muted/50'
      }`}
      onClick={onToggle}
    >
      <Checkbox 
        checked={selected} 
        onCheckedChange={onToggle}
        onClick={(e) => e.stopPropagation()}
      />
      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{title}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate">{fileName}</span>
          {fileSize && (
            <>
              <span>·</span>
              <span>{formatFileSize(fileSize)}</span>
            </>
          )}
        </div>
      </div>
      <Badge variant="outline" className="text-xs shrink-0">
        {badge}
      </Badge>
    </div>
  );
}
