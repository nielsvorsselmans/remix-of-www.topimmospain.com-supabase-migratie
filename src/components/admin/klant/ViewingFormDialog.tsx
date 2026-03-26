import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  UserPlus,
  Search,
  Building,
  Home,
} from "lucide-react";
import { ScheduledViewing } from "./TripDetailSheet";
import { KlantProject } from "@/hooks/useKlant";
import { useProjectContacts, useCreateProjectContact, useAllProjectContacts, ProjectContact } from "@/hooks/useProjectContacts";
import { parseGoogleMapsUrl, generateGoogleMapsUrl } from "@/lib/parseGoogleMapsUrl";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface NewContactForm {
  name: string;
  role: string;
  phone: string;
  email: string;
  saveToProject: boolean;
}

type LocationType = "project" | "showhouse" | "custom";

interface DayOption {
  date: Date;
  dateStr: string;
}

interface ViewingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (viewing: ScheduledViewing) => Promise<void> | void;
  assignedProjects: KlantProject[];
  dayOptions: DayOption[];
  editingViewing?: ScheduledViewing | null;
  prefillDate?: string;
}

export function ViewingFormDialog({
  open,
  onOpenChange,
  onSubmit,
  assignedProjects,
  dayOptions,
  editingViewing,
  prefillDate,
}: ViewingFormDialogProps) {
  const [newViewing, setNewViewing] = useState<Partial<ScheduledViewing>>({});
  const [useCustomContact, setUseCustomContact] = useState(false);
  const [addNewContact, setAddNewContact] = useState(false);
  const [showExistingContactSearch, setShowExistingContactSearch] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const [selectedExistingContact, setSelectedExistingContact] = useState<(ProjectContact & { projectCount: number; projectNames: string[] }) | null>(null);
  const [linkToProject, setLinkToProject] = useState(true);
  const [newContact, setNewContact] = useState<NewContactForm>({
    name: "", role: "", phone: "", email: "", saveToProject: true,
  });
  const [locationType, setLocationType] = useState<LocationType>("project");
  const [customLocation, setCustomLocation] = useState({ mapsUrl: "", address: "", notes: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: projectContacts } = useProjectContacts(newViewing.project_id);
  const { data: allContacts } = useAllProjectContacts();
  const createContact = useCreateProjectContact();

  // Show ALL assigned projects, sorted by visit-relevance
  const statusOrder: Record<string, number> = { to_visit: 1, interested: 2, suggested: 3, visited: 4, rejected: 5 };
  const sortedProjects = [...assignedProjects].sort((a, b) => 
    (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99)
  );

  // Init form when editing or opening with prefill
  useEffect(() => {
    if (!open) return;
    if (editingViewing) {
      setNewViewing({
        project_id: editingViewing.project_id,
        date: editingViewing.date,
        time: editingViewing.time,
        contact_person: editingViewing.contact_person,
        contact_id: editingViewing.contact_id,
        notes: editingViewing.notes,
      });
      if (editingViewing.showhouse_notes || editingViewing.showhouse_address?.includes("Showhouse")) {
        setLocationType("showhouse");
      } else if (editingViewing.showhouse_address === "Aangepaste locatie" ||
        (editingViewing.showhouse_maps_url && !editingViewing.showhouse_address?.includes("Project locatie"))) {
        setLocationType("custom");
        setCustomLocation({
          mapsUrl: editingViewing.showhouse_maps_url || "",
          address: editingViewing.showhouse_address || "",
          notes: editingViewing.showhouse_notes || "",
        });
      } else {
        setLocationType("project");
      }
    } else {
      setNewViewing(prefillDate ? { date: prefillDate } : {});
      setLocationType("project");
    }
  }, [open, editingViewing, prefillDate]);

  const filteredExistingContacts = useMemo(() => {
    if (!allContacts || !contactSearchQuery.trim()) return allContacts || [];
    const query = contactSearchQuery.toLowerCase();
    return allContacts.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.role?.toLowerCase().includes(query) ||
      c.phone?.includes(query) ||
      c.email?.toLowerCase().includes(query) ||
      c.projectNames.some(p => p.toLowerCase().includes(query))
    );
  }, [allContacts, contactSearchQuery]);

  const isContactLinkedToProject = useMemo(() => {
    if (!selectedExistingContact || !newViewing.project_id || !projectContacts) return false;
    return projectContacts.some(c =>
      c.name.toLowerCase() === selectedExistingContact.name.toLowerCase() &&
      (c.phone === selectedExistingContact.phone || c.email === selectedExistingContact.email)
    );
  }, [selectedExistingContact, newViewing.project_id, projectContacts]);

  const selectedProject = assignedProjects.find(p => p.project_id === newViewing.project_id);
  const hasShowhouse = !!selectedProject?.project?.showhouse_address;

  const resetForm = () => {
    setNewViewing({});
    setUseCustomContact(false);
    setAddNewContact(false);
    setShowExistingContactSearch(false);
    setContactSearchQuery("");
    setSelectedExistingContact(null);
    setLinkToProject(true);
    setNewContact({ name: "", role: "", phone: "", email: "", saveToProject: true });
    setLocationType("project");
    setCustomLocation({ mapsUrl: "", address: "", notes: "" });
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleProjectChange = (projectId: string) => {
    const project = assignedProjects.find(p => p.project_id === projectId);
    setNewViewing({ ...newViewing, project_id: projectId, contact_id: undefined, contact_person: "" });
    setUseCustomContact(false);
    setAddNewContact(false);
    setShowExistingContactSearch(false);
    setSelectedExistingContact(null);
    if (project?.project?.showhouse_address) {
      setLocationType("showhouse");
    } else {
      setLocationType("project");
    }
  };

  const handleContactChange = (contactId: string) => {
    if (contactId === "new") {
      setAddNewContact(true); setUseCustomContact(false); setShowExistingContactSearch(false); setSelectedExistingContact(null);
      setNewViewing({ ...newViewing, contact_id: undefined, contact_person: "" });
    } else if (contactId === "search") {
      setShowExistingContactSearch(true); setAddNewContact(false); setUseCustomContact(false); setSelectedExistingContact(null);
      setNewViewing({ ...newViewing, contact_id: undefined, contact_person: "" });
    } else if (contactId === "other") {
      setUseCustomContact(true); setAddNewContact(false); setShowExistingContactSearch(false); setSelectedExistingContact(null);
      setNewViewing({ ...newViewing, contact_id: undefined, contact_person: "" });
    } else {
      setUseCustomContact(false); setAddNewContact(false); setShowExistingContactSearch(false); setSelectedExistingContact(null);
      setNewViewing({ ...newViewing, contact_id: contactId });
    }
  };

  const handleSelectExistingContact = (contact: ProjectContact & { projectCount: number; projectNames: string[] }) => {
    setSelectedExistingContact(contact);
    setShowExistingContactSearch(false);
    setContactSearchQuery("");
  };

  const handleSubmit = async () => {
    if (!newViewing.project_id || !newViewing.date || !newViewing.time) return;
    setIsSubmitting(true);

    try {
      const project = assignedProjects.find(p => p.project_id === newViewing.project_id);
      const projectData = project?.project;

      // Resolve contact
      let contactName = "";
      let contactPhone: string | undefined;
      let contactEmail: string | undefined;
      let contactId: string | undefined;

      if (selectedExistingContact) {
        contactName = selectedExistingContact.name + (selectedExistingContact.role ? ` (${selectedExistingContact.role})` : "");
        contactPhone = selectedExistingContact.phone || undefined;
        contactEmail = selectedExistingContact.email || undefined;
        if (linkToProject && newViewing.project_id && !isContactLinkedToProject) {
          try {
            const created = await createContact.mutateAsync({
              project_id: newViewing.project_id, name: selectedExistingContact.name,
              role: selectedExistingContact.role || null, phone: selectedExistingContact.phone || null,
              whatsapp: null, email: selectedExistingContact.email || null, notes: null, is_primary: false, active: true,
            });
            contactId = created.id;
          } catch (e) { console.error("Error linking contact:", e); }
        }
      } else if (addNewContact && newContact.name) {
        if (newContact.saveToProject && newViewing.project_id) {
          try {
            const created = await createContact.mutateAsync({
              project_id: newViewing.project_id, name: newContact.name,
              role: newContact.role || null, phone: newContact.phone || null,
              whatsapp: null, email: newContact.email || null, notes: null, is_primary: false, active: true,
            });
            contactId = created.id;
          } catch (e) { console.error("Error saving contact:", e); }
        }
        contactName = newContact.name + (newContact.role ? ` (${newContact.role})` : "");
        contactPhone = newContact.phone || undefined;
        contactEmail = newContact.email || undefined;
      } else if (newViewing.contact_id && newViewing.contact_id !== "other" && projectContacts) {
        const sel = projectContacts.find(c => c.id === newViewing.contact_id);
        if (sel) {
          contactName = sel.name + (sel.role ? ` (${sel.role})` : "");
          contactPhone = sel.phone || undefined;
          contactEmail = sel.email || undefined;
          contactId = sel.id;
        }
      } else if (newViewing.contact_person) {
        contactName = newViewing.contact_person;
      }

      // Resolve location
      let showhouseAddress: string | undefined;
      let showhouseMapsUrl: string | undefined;
      let showhouseNotes: string | undefined;

      if (locationType === "showhouse" && projectData?.showhouse_address) {
        showhouseAddress = projectData.showhouse_address;
        showhouseMapsUrl = projectData.showhouse_maps_url || undefined;
        showhouseNotes = projectData.showhouse_notes || undefined;
      } else if (locationType === "custom" && customLocation.mapsUrl) {
        showhouseAddress = customLocation.address || "Aangepaste locatie";
        showhouseMapsUrl = customLocation.mapsUrl;
        showhouseNotes = customLocation.notes || undefined;
      } else {
        const lat = projectData?.latitude;
        const lng = projectData?.longitude;
        if (lat && lng) {
          showhouseMapsUrl = generateGoogleMapsUrl(lat, lng);
          showhouseAddress = projectData?.city ? `Project locatie - ${projectData.city}` : "Project locatie";
        }
      }

      const viewing: ScheduledViewing = {
        id: editingViewing?.id || crypto.randomUUID(),
        project_id: newViewing.project_id,
        project_name: projectData?.name || "Onbekend project",
        date: newViewing.date,
        time: newViewing.time,
        contact_person: contactName,
        contact_id: contactId,
        contact_phone: contactPhone,
        contact_email: contactEmail,
        notes: newViewing.notes || "",
        showhouse_address: showhouseAddress,
        showhouse_maps_url: showhouseMapsUrl,
        showhouse_notes: showhouseNotes,
      };

      await onSubmit(viewing);
      resetForm();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingViewing ? "Bezichtiging bewerken" : "Bezichtiging toevoegen"}
          </DialogTitle>
          <DialogDescription>
            {editingViewing ? "Pas de details van deze bezichtiging aan." : "Plan een nieuwe bezichtiging in."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Project */}
          <div className="space-y-2">
            <Label className="text-xs">Project *</Label>
            <Select value={newViewing.project_id ?? undefined} onValueChange={handleProjectChange}>
              <SelectTrigger className="h-auto min-h-10">
                <SelectValue placeholder="Selecteer project">
                  {newViewing.project_id && (() => {
                    const selected = sortedProjects.find(p => p.project_id === newViewing.project_id);
                    if (!selected?.project) return "Selecteer project";
                    return (
                      <div className="flex items-center gap-2">
                        {selected.project.featured_image && (
                          <img src={selected.project.featured_image} alt="" className="w-8 h-8 rounded object-cover" />
                        )}
                        <div className="text-left">
                          <div className="font-medium truncate max-w-[200px]">{selected.project.name}</div>
                          {selected.project.price_from && (
                            <div className="text-xs text-muted-foreground">
                              vanaf €{(selected.project.price_from / 1000).toFixed(0)}k
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[300px] z-[100]">
                {sortedProjects.map((p) => {
                  const statusLabels: Record<string, string> = { to_visit: "Wil bezoeken", interested: "Geïnteresseerd", suggested: "Te beoordelen", visited: "Bezocht", rejected: "Afgewezen" };
                  return (
                  <SelectItem key={p.project_id} value={p.project_id} className="py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-muted flex-shrink-0 overflow-hidden">
                        {p.project?.featured_image ? (
                          <img src={p.project.featured_image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{p.project?.name || "Onbekend"}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          {p.project?.city && <span>{p.project.city}</span>}
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">{statusLabels[p.status] || p.status}</Badge>
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Datum *</Label>
              <Select value={newViewing.date ?? undefined} onValueChange={(v) => setNewViewing({ ...newViewing, date: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Kies dag" />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  {dayOptions.map((day) => (
                    <SelectItem key={day.dateStr} value={day.dateStr}>
                      {format(day.date, "EEE d MMM", { locale: nl })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Tijd *</Label>
              <Input
                type="time"
                value={newViewing.time || ""}
                onChange={(e) => setNewViewing({ ...newViewing, time: e.target.value })}
              />
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-2">
            <Label className="text-xs">Contactpersoon</Label>

            {/* Selected existing contact */}
            {selectedExistingContact && (
              <div className="p-3 rounded-lg border bg-primary/5 border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium flex items-center gap-1 text-primary">
                    <Search className="h-3 w-3" /> Bestaand contact geselecteerd
                  </span>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedExistingContact(null)}>
                    Wijzigen
                  </Button>
                </div>
                <div className="space-y-1">
                  <div className="font-medium text-sm">{selectedExistingContact.name}</div>
                  {selectedExistingContact.role && <div className="text-xs text-muted-foreground">{selectedExistingContact.role}</div>}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {selectedExistingContact.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{selectedExistingContact.phone}</span>}
                    {selectedExistingContact.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{selectedExistingContact.email}</span>}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Building className="h-3 w-3" />
                    <span>{selectedExistingContact.projectCount} project{selectedExistingContact.projectCount !== 1 ? 'en' : ''}</span>
                  </div>
                </div>
                {!isContactLinkedToProject && (
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t">
                    <Checkbox id="linkToProjectDlg" checked={linkToProject} onCheckedChange={(c) => setLinkToProject(!!c)} />
                    <label htmlFor="linkToProjectDlg" className="text-xs text-muted-foreground">
                      Ook koppelen aan dit project
                    </label>
                  </div>
                )}
                {isContactLinkedToProject && (
                  <div className="text-xs text-green-600 mt-2 flex items-center gap-1">✓ Al gekoppeld aan dit project</div>
                )}
              </div>
            )}

            {/* Contact search */}
            {showExistingContactSearch && !selectedExistingContact && (
              <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium flex items-center gap-1"><Search className="h-3 w-3" /> Zoek bestaand contact</span>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setShowExistingContactSearch(false); setContactSearchQuery(""); }}>
                    Annuleren
                  </Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input placeholder="Zoek op naam, rol, telefoon..." value={contactSearchQuery} onChange={(e) => setContactSearchQuery(e.target.value)} className="pl-7 h-8" />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredExistingContacts.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">Geen contacten gevonden</p>
                  ) : (
                    filteredExistingContacts.slice(0, 10).map((contact) => (
                      <button
                        key={`${contact.id}-${contact.project_id}`}
                        type="button"
                        className="w-full text-left p-2 rounded hover:bg-muted/50 transition-colors"
                        onClick={() => handleSelectExistingContact(contact)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm">{contact.name}</div>
                          <Badge variant="secondary" className="text-xs">{contact.projectCount} project{contact.projectCount !== 1 ? 'en' : ''}</Badge>
                        </div>
                        {contact.role && <div className="text-xs text-muted-foreground">{contact.role}</div>}
                        <div className="text-xs text-muted-foreground truncate">
                          {contact.projectNames.slice(0, 2).join(', ')}
                          {contact.projectNames.length > 2 && ` +${contact.projectNames.length - 2}`}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Contact dropdown */}
            {newViewing.project_id && !addNewContact && !useCustomContact && !showExistingContactSearch && !selectedExistingContact && (
              <Select value={newViewing.contact_id || ""} onValueChange={handleContactChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer contactpersoon" />
                </SelectTrigger>
                <SelectContent>
                  {projectContacts && projectContacts.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs text-muted-foreground font-medium">Dit project</div>
                      {projectContacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          <div className="flex items-center gap-2">
                            {contact.name}
                            {contact.role && <span className="text-muted-foreground text-xs">({contact.role})</span>}
                            {contact.is_primary && <Badge variant="secondary" className="text-xs ml-1">Hoofd</Badge>}
                          </div>
                        </SelectItem>
                      ))}
                      <Separator className="my-1" />
                    </>
                  )}
                  <SelectItem value="search">
                    <div className="flex items-center gap-2 text-primary"><Search className="h-3 w-3" /> Zoek in bestaande contacten</div>
                  </SelectItem>
                  <SelectItem value="new">
                    <div className="flex items-center gap-2 text-primary"><UserPlus className="h-3 w-3" /> Nieuwe contact toevoegen</div>
                  </SelectItem>
                  <SelectItem value="other">
                    <span className="text-muted-foreground">Eenmalig contact (niet opslaan)</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* New contact form */}
            {addNewContact && (
              <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium flex items-center gap-1"><UserPlus className="h-3 w-3" /> Nieuwe contactpersoon</span>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setAddNewContact(false); setNewContact({ name: "", role: "", phone: "", email: "", saveToProject: true }); }}>
                    Annuleren
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Naam *" value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} />
                  <Input placeholder="Rol (optioneel)" value={newContact.role} onChange={(e) => setNewContact({ ...newContact, role: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Telefoon" value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} />
                  <Input type="email" placeholder="Email" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="saveToProjectDlg" checked={newContact.saveToProject} onCheckedChange={(c) => setNewContact({ ...newContact, saveToProject: !!c })} />
                  <label htmlFor="saveToProjectDlg" className="text-xs text-muted-foreground">Bewaar als projectcontact</label>
                </div>
              </div>
            )}

            {/* Custom contact */}
            {useCustomContact && (
              <div className="space-y-2">
                <Input placeholder="Naam van contact ter plaatse" value={newViewing.contact_person || ""} onChange={(e) => setNewViewing({ ...newViewing, contact_person: e.target.value })} />
                <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => setUseCustomContact(false)}>
                  Terug naar selectie
                </Button>
              </div>
            )}
          </div>

          {/* Location */}
          {newViewing.project_id && (
            <div className="space-y-2">
              <Label className="text-xs">Locatie bezichtiging</Label>
              <RadioGroup value={locationType} onValueChange={(v) => setLocationType(v as LocationType)} className="space-y-2">
                <div className="flex items-start gap-2 p-2 rounded border bg-background">
                  <RadioGroupItem value="project" id="dlg-loc-project" className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <label htmlFor="dlg-loc-project" className="text-sm font-medium cursor-pointer">Project locatie</label>
                    <p className="text-xs text-muted-foreground truncate">{selectedProject?.project?.city || "Locatie van het project"}</p>
                  </div>
                </div>

                {hasShowhouse && (
                  <div className="flex items-start gap-2 p-2 rounded border bg-background">
                    <RadioGroupItem value="showhouse" id="dlg-loc-showhouse" className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <label htmlFor="dlg-loc-showhouse" className="text-sm font-medium cursor-pointer flex items-center gap-1">
                        <Home className="h-3 w-3" /> Showhouse
                      </label>
                      <p className="text-xs text-muted-foreground truncate">{selectedProject?.project?.showhouse_address}</p>
                      {selectedProject?.project?.showhouse_notes && (
                        <p className="text-xs text-amber-600 mt-0.5">⚠️ {selectedProject.project.showhouse_notes}</p>
                      )}
                      {selectedProject?.project?.showhouse_maps_url && (
                        <a href={selectedProject.project.showhouse_maps_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                          <ExternalLink className="h-3 w-3" /> Open in Maps
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2 p-2 rounded border bg-background">
                  <RadioGroupItem value="custom" id="dlg-loc-custom" className="mt-0.5" />
                  <div className="flex-1">
                    <label htmlFor="dlg-loc-custom" className="text-sm font-medium cursor-pointer">Andere locatie</label>
                  </div>
                </div>
              </RadioGroup>

              {locationType === "custom" && (
                <div className="space-y-2 pl-6">
                  <Input placeholder="Google Maps link" value={customLocation.mapsUrl} onChange={(e) => setCustomLocation({ ...customLocation, mapsUrl: e.target.value })} />
                  {customLocation.mapsUrl && parseGoogleMapsUrl(customLocation.mapsUrl) && (
                    <p className="text-xs text-green-600">✓ Coördinaten gevonden</p>
                  )}
                  <Input placeholder="Adres (optioneel)" value={customLocation.address} onChange={(e) => setCustomLocation({ ...customLocation, address: e.target.value })} />
                  <Input placeholder="Notities (bijv. 'Bel aan bij receptie')" value={customLocation.notes} onChange={(e) => setCustomLocation({ ...customLocation, notes: e.target.value })} />
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-xs">Notities</Label>
            <Textarea placeholder="Extra informatie..." value={newViewing.notes || ""} onChange={(e) => setNewViewing({ ...newViewing, notes: e.target.value })} rows={2} />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={handleClose}>Annuleren</Button>
            <Button
              onClick={handleSubmit}
              disabled={!newViewing.project_id || !newViewing.date || !newViewing.time || isSubmitting || createContact.isPending}
            >
              {isSubmitting ? "Bezig..." : editingViewing ? "Opslaan" : "Toevoegen"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
