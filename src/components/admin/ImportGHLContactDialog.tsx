import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Download, Check, Loader2, User, Mail, Phone, Tag, Users, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useGHLTagSearch, useGHLBulkImport, GHLContact } from '@/hooks/useGHLBulkImport';

interface ImportGHLContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportGHLContactDialog({ open, onOpenChange }: ImportGHLContactDialogProps) {
  const [activeTab, setActiveTab] = useState<string>('search');
  
  // Search tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<GHLContact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Tag import tab state
  const [tagInput, setTagInput] = useState('orientatiegesprek');
  const [syncData, setSyncData] = useState(true);
  const { searchByTag, isSearching: isSearchingTag, result: tagResult, reset: resetTagSearch } = useGHLTagSearch();
  const { bulkImport, isImporting: isBulkImporting, progress } = useGHLBulkImport();
  
  const queryClient = useQueryClient();

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) {
      toast.error('Voer minimaal 2 karakters in');
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      const { data, error } = await supabase.functions.invoke('search-ghl-contacts', {
        body: { query: searchQuery.trim(), limit: 30 },
      });

      if (error) throw error;

      setContacts(data.contacts || []);
      setSelectedIds(new Set());

      if (data.contacts?.length === 0) {
        toast.info('Geen contacten gevonden');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Zoeken mislukt');
    } finally {
      setIsSearching(false);
    }
  };

  const handleImport = async () => {
    const toImport = contacts.filter(c => selectedIds.has(c.id) && !c.isImported);
    
    if (toImport.length === 0) {
      toast.error('Selecteer contacten om te importeren');
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const contact of toImport) {
      try {
        const { data, error } = await supabase.functions.invoke('import-ghl-contact', {
          body: { ghl_contact_id: contact.id },
        });

        if (error) throw error;
        
        if (data.success) {
          successCount++;
          setContacts(prev => prev.map(c => 
            c.id === contact.id ? { ...c, isImported: true } : c
          ));
        }
      } catch (error) {
        console.error('Import error for', contact.id, error);
        errorCount++;
      }
    }

    setIsImporting(false);
    setSelectedIds(new Set());
    
    if (successCount > 0) {
      toast.success(`${successCount} contact(en) geïmporteerd`);
      queryClient.invalidateQueries({ queryKey: ['klanten'] });
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} contact(en) niet geïmporteerd`);
    }
  };

  const handleTagSearch = async () => {
    await searchByTag(tagInput);
  };

  const handleBulkImport = async () => {
    const result = await bulkImport(tagInput, syncData);
    if (result?.success) {
      // Refresh tag search to update counts
      await searchByTag(tagInput);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectableCount = contacts.filter(c => !c.isImported).length;
  const selectedCount = Array.from(selectedIds).filter(id => 
    contacts.find(c => c.id === id && !c.isImported)
  ).length;

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Import uit GoHighLevel
          </DialogTitle>
          <DialogDescription>
            Zoek contacten of importeer alle contacten met een specifieke tag
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Zoeken
            </TabsTrigger>
            <TabsTrigger value="tag" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Import op Tag
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="flex-1 flex flex-col min-h-0 mt-4">
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Zoek op naam, email of telefoon..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 border rounded-md">
              {!hasSearched ? (
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                  Voer een zoekterm in om te beginnen
                </div>
              ) : contacts.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                  Geen contacten gevonden
                </div>
              ) : (
                <div className="divide-y">
                  {contacts.map((contact) => (
                    <ContactRow
                      key={contact.id}
                      contact={contact}
                      isSelected={selectedIds.has(contact.id)}
                      onToggle={() => toggleSelect(contact.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {contacts.length > 0 && (
              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <span className="text-sm text-muted-foreground">
                  {selectedCount} van {selectableCount} geselecteerd
                </span>
                <Button
                  onClick={handleImport}
                  disabled={selectedCount === 0 || isImporting}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importeren...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Importeer ({selectedCount})
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="tag" className="flex-1 flex flex-col min-h-0 mt-4">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Tag naam (bijv. orientatiegesprek)"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTagSearch()}
                  className="flex-1"
                />
                <Button onClick={handleTagSearch} disabled={isSearchingTag}>
                  {isSearchingTag ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {tagResult && (
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{tagResult.total}</div>
                      <div className="text-sm text-muted-foreground">Gevonden</div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{tagResult.imported}</div>
                      <div className="text-sm text-muted-foreground">Al geïmporteerd</div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary">{tagResult.toImport}</div>
                      <div className="text-sm text-muted-foreground">Te importeren</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                    <Checkbox
                      id="sync-data"
                      checked={syncData}
                      onCheckedChange={(checked) => setSyncData(checked === true)}
                    />
                    <label
                      htmlFor="sync-data"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Synchroniseer afspraken en notities automatisch
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Haalt alle GHL afspraken en notities op voor geïmporteerde contacten
                      </p>
                    </label>
                  </div>

                  {tagResult.toImport > 0 ? (
                    <Button
                      onClick={handleBulkImport}
                      disabled={isBulkImporting}
                      className="w-full"
                      size="lg"
                    >
                      {isBulkImporting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {progress || 'Bezig...'}
                        </>
                      ) : (
                        <>
                          <Users className="h-4 w-4 mr-2" />
                          Importeer {tagResult.toImport} contacten
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <Check className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <p>Alle contacten met deze tag zijn al geïmporteerd!</p>
                    </div>
                  )}

                  {tagResult.contacts.length > 0 && (
                    <div className="border rounded-md max-h-48 overflow-y-auto">
                      <div className="divide-y">
                        {tagResult.contacts.slice(0, 10).map((contact) => (
                          <div
                            key={contact.id}
                            className={`p-2 text-sm ${contact.isImported ? 'opacity-60 bg-muted/30' : ''}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {contact.firstName} {contact.lastName}
                              </span>
                              {contact.isImported && (
                                <Badge variant="secondary" className="text-xs">
                                  <Check className="h-3 w-3 mr-1" />
                                  Geïmporteerd
                                </Badge>
                              )}
                            </div>
                            <div className="text-muted-foreground">{contact.email}</div>
                          </div>
                        ))}
                        {tagResult.contacts.length > 10 && (
                          <div className="p-2 text-sm text-center text-muted-foreground">
                            +{tagResult.contacts.length - 10} meer...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!tagResult && (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground border rounded-md">
                  <Tag className="h-12 w-12 mb-3 opacity-50" />
                  <p>Voer een tag in en klik op zoeken</p>
                  <p className="text-sm">Bijvoorbeeld: "orientatiegesprek"</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Extracted contact row component for reusability
function ContactRow({ 
  contact, 
  isSelected, 
  onToggle 
}: { 
  contact: GHLContact; 
  isSelected: boolean; 
  onToggle: () => void;
}) {
  return (
    <div className={`p-3 hover:bg-muted/50 ${contact.isImported ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          disabled={contact.isImported}
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {contact.firstName} {contact.lastName}
            </span>
            {contact.isImported && (
              <Badge variant="secondary" className="text-xs">
                <Check className="h-3 w-3 mr-1" />
                Al geïmporteerd
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-muted-foreground">
            {contact.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {contact.email}
              </span>
            )}
            {contact.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {contact.phone}
              </span>
            )}
          </div>
          {contact.tags?.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <Tag className="h-3 w-3 text-muted-foreground" />
              <div className="flex flex-wrap gap-1">
                {contact.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {contact.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{contact.tags.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
