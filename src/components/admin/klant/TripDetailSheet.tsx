import { useState, useEffect, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plane,
  Home,
  Calendar,
  Clock,
  MapPin,
  Plus,
  Trash2,
  Edit,
  GripVertical,
  Phone,
  Mail,
  ExternalLink,
  UserPlus,
  Save,
  Search,
  Building,
  Eye,
} from "lucide-react";
import { TripCustomerPreviewDialog } from "./TripCustomerPreviewDialog";
import { format, differenceInDays, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { KlantTrip, KlantProject } from "@/hooks/useKlant";
import { useProjectContacts, useCreateProjectContact, useAllProjectContacts, ProjectContact } from "@/hooks/useProjectContacts";
import { parseGoogleMapsUrl, generateGoogleMapsUrl } from "@/lib/parseGoogleMapsUrl";

interface TripDetailSheetProps {
  trip: KlantTrip | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onUpdateViewings: (viewings: ScheduledViewing[]) => void;
  assignedProjects: KlantProject[];
  isUpdating?: boolean;
  crmLeadId: string;
  journeyPhase?: string;
}

export interface ScheduledViewing {
  id: string;
  project_id: string;
  project_name: string;
  date: string;
  time: string;
  contact_person: string;
  contact_id?: string;
  contact_phone?: string;
  contact_email?: string;
  notes: string;
  // Showhouse location (stored at creation time)
  showhouse_address?: string;
  showhouse_maps_url?: string;
  showhouse_notes?: string;
}

interface NewContactForm {
  name: string;
  role: string;
  phone: string;
  email: string;
  saveToProject: boolean;
}

type LocationType = "project" | "showhouse" | "custom";

function getStatusBadge(status: string | null) {
  switch (status) {
    case "confirmed":
      return <Badge className="bg-green-500">Bevestigd</Badge>;
    case "completed":
      return <Badge variant="secondary">Afgerond</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Geannuleerd</Badge>;
    default:
      return <Badge variant="outline">Gepland</Badge>;
  }
}

export function TripDetailSheet({
  trip,
  open,
  onOpenChange,
  onEdit,
  onUpdateViewings,
  assignedProjects,
  isUpdating,
  crmLeadId,
  journeyPhase = 'selection',
}: TripDetailSheetProps) {
  const [viewings, setViewings] = useState<ScheduledViewing[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingViewingId, setEditingViewingId] = useState<string | null>(null);
  const [newViewing, setNewViewing] = useState<Partial<ScheduledViewing>>({});
  const [useCustomContact, setUseCustomContact] = useState(false);
  const [addNewContact, setAddNewContact] = useState(false);
  const [showExistingContactSearch, setShowExistingContactSearch] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const [selectedExistingContact, setSelectedExistingContact] = useState<(ProjectContact & { projectCount: number; projectNames: string[] }) | null>(null);
  const [linkToProject, setLinkToProject] = useState(true);
  const [newContact, setNewContact] = useState<NewContactForm>({
    name: "",
    role: "",
    phone: "",
    email: "",
    saveToProject: true,
  });
  const [locationType, setLocationType] = useState<LocationType>("project");
  const [customLocation, setCustomLocation] = useState({
    mapsUrl: "",
    address: "",
    notes: "",
  });

  // Fetch contacts for selected project
  const { data: projectContacts } = useProjectContacts(newViewing.project_id);
  const { data: allContacts } = useAllProjectContacts();
  const createContact = useCreateProjectContact();

  // Filter existing contacts based on search query
  const filteredExistingContacts = useMemo(() => {
    if (!allContacts || !contactSearchQuery.trim()) return allContacts || [];
    const query = contactSearchQuery.toLowerCase();
    return allContacts.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.role?.toLowerCase().includes(query) ||
        c.phone?.includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.projectNames.some((p) => p.toLowerCase().includes(query))
    );
  }, [allContacts, contactSearchQuery]);

  // Check if selected existing contact is already linked to current project
  const isContactLinkedToProject = useMemo(() => {
    if (!selectedExistingContact || !newViewing.project_id || !projectContacts) return false;
    return projectContacts.some(
      (c) =>
        c.name.toLowerCase() === selectedExistingContact.name.toLowerCase() &&
        (c.phone === selectedExistingContact.phone || c.email === selectedExistingContact.email)
    );
  }, [selectedExistingContact, newViewing.project_id, projectContacts]);

  // Initialize viewings from trip data
  useEffect(() => {
    if (trip?.scheduled_viewings) {
      try {
        const parsed = typeof trip.scheduled_viewings === 'string' 
          ? JSON.parse(trip.scheduled_viewings) 
          : trip.scheduled_viewings;
        if (Array.isArray(parsed)) {
          setViewings(parsed);
        }
      } catch {
        setViewings([]);
      }
    } else {
      setViewings([]);
    }
  }, [trip?.scheduled_viewings]);

  if (!trip) return null;

  const startDate = new Date(trip.trip_start_date);
  const endDate = new Date(trip.trip_end_date);
  const tripDays = differenceInDays(endDate, startDate) + 1;

  // Generate day-by-day schedule
  const daySchedule = Array.from({ length: tripDays }, (_, i) => {
    const date = addDays(startDate, i);
    const dateStr = format(date, "yyyy-MM-dd");
    const dayViewings = viewings.filter(v => v.date === dateStr);
    return { date, dateStr, viewings: dayViewings };
  });

  const handleAddViewing = async () => {
    if (!newViewing.project_id || !newViewing.date || !newViewing.time) return;

    const project = assignedProjects.find(p => p.project_id === newViewing.project_id);
    const projectData = project?.project;
    
    // Get contact info
    let contactName = "";
    let contactPhone: string | undefined;
    let contactEmail: string | undefined;
    let contactId: string | undefined;
    
    if (selectedExistingContact) {
      // Using existing contact from another project
      contactName = selectedExistingContact.name + (selectedExistingContact.role ? ` (${selectedExistingContact.role})` : "");
      contactPhone = selectedExistingContact.phone || undefined;
      contactEmail = selectedExistingContact.email || undefined;
      
      // Link to current project if requested and not already linked
      if (linkToProject && newViewing.project_id && !isContactLinkedToProject) {
        try {
          const createdContact = await createContact.mutateAsync({
            project_id: newViewing.project_id,
            name: selectedExistingContact.name,
            role: selectedExistingContact.role || null,
            phone: selectedExistingContact.phone || null,
            whatsapp: null,
            email: selectedExistingContact.email || null,
            notes: null,
            is_primary: false,
            active: true,
          });
          contactId = createdContact.id;
        } catch (error) {
          console.error("Error linking contact to project:", error);
        }
      }
    } else if (addNewContact && newContact.name) {
      // Save new contact to project if requested
      if (newContact.saveToProject && newViewing.project_id) {
        try {
          const createdContact = await createContact.mutateAsync({
            project_id: newViewing.project_id,
            name: newContact.name,
            role: newContact.role || null,
            phone: newContact.phone || null,
            whatsapp: null,
            email: newContact.email || null,
            notes: null,
            is_primary: false,
            active: true,
          });
          contactId = createdContact.id;
        } catch (error) {
          console.error("Error saving contact:", error);
        }
      }
      contactName = newContact.name + (newContact.role ? ` (${newContact.role})` : "");
      contactPhone = newContact.phone || undefined;
      contactEmail = newContact.email || undefined;
    } else if (newViewing.contact_id && newViewing.contact_id !== "other" && projectContacts) {
      const selectedContact = projectContacts.find(c => c.id === newViewing.contact_id);
      if (selectedContact) {
        contactName = selectedContact.name + (selectedContact.role ? ` (${selectedContact.role})` : "");
        contactPhone = selectedContact.phone || undefined;
        contactEmail = selectedContact.email || undefined;
        contactId = selectedContact.id;
      }
    } else if (newViewing.contact_person) {
      contactName = newViewing.contact_person;
    }

    // Determine location based on selection
    let showhouseAddress: string | undefined;
    let showhouseMapsUrl: string | undefined;
    let showhouseNotes: string | undefined;

    if (locationType === "showhouse" && projectData?.showhouse_address) {
      showhouseAddress = projectData.showhouse_address;
      showhouseMapsUrl = projectData.showhouse_maps_url || undefined;
      showhouseNotes = projectData.showhouse_notes || undefined;
    } else if (locationType === "custom" && customLocation.mapsUrl) {
      const coords = parseGoogleMapsUrl(customLocation.mapsUrl);
      showhouseAddress = customLocation.address || "Aangepaste locatie";
      showhouseMapsUrl = customLocation.mapsUrl;
      showhouseNotes = customLocation.notes || undefined;
    } else {
      // Default to project location
      const lat = projectData?.latitude;
      const lng = projectData?.longitude;
      if (lat && lng) {
        showhouseMapsUrl = generateGoogleMapsUrl(lat, lng);
        showhouseAddress = projectData?.city ? `Project locatie - ${projectData.city}` : "Project locatie";
      }
    }
    
    const viewing: ScheduledViewing = {
      id: crypto.randomUUID(),
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

    const updated = [...viewings, viewing].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });

    setViewings(updated);
    onUpdateViewings(updated);
    resetForm();
  };

  const resetForm = () => {
    setNewViewing({});
    setShowAddForm(false);
    setEditingViewingId(null);
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

  const handleEditViewing = (viewing: ScheduledViewing) => {
    setEditingViewingId(viewing.id);
    setNewViewing({
      project_id: viewing.project_id,
      date: viewing.date,
      time: viewing.time,
      contact_person: viewing.contact_person,
      contact_id: viewing.contact_id,
      notes: viewing.notes,
    });
    // Determine location type from existing data
    if (viewing.showhouse_notes || viewing.showhouse_address?.includes("Showhouse")) {
      setLocationType("showhouse");
    } else if (viewing.showhouse_address === "Aangepaste locatie" || 
               (viewing.showhouse_maps_url && !viewing.showhouse_address?.includes("Project locatie"))) {
      setLocationType("custom");
      setCustomLocation({
        mapsUrl: viewing.showhouse_maps_url || "",
        address: viewing.showhouse_address || "",
        notes: viewing.showhouse_notes || "",
      });
    } else {
      setLocationType("project");
    }
    setShowAddForm(true);
  };

  const handleUpdateViewing = async () => {
    if (!editingViewingId || !newViewing.project_id || !newViewing.date || !newViewing.time) return;

    const project = assignedProjects.find(p => p.project_id === newViewing.project_id);
    const projectData = project?.project;
    
    // Get contact info (same logic as handleAddViewing)
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
          const createdContact = await createContact.mutateAsync({
            project_id: newViewing.project_id,
            name: selectedExistingContact.name,
            role: selectedExistingContact.role || null,
            phone: selectedExistingContact.phone || null,
            whatsapp: null,
            email: selectedExistingContact.email || null,
            notes: null,
            is_primary: false,
            active: true,
          });
          contactId = createdContact.id;
        } catch (error) {
          console.error("Error linking contact to project:", error);
        }
      }
    } else if (addNewContact && newContact.name) {
      if (newContact.saveToProject && newViewing.project_id) {
        try {
          const createdContact = await createContact.mutateAsync({
            project_id: newViewing.project_id,
            name: newContact.name,
            role: newContact.role || null,
            phone: newContact.phone || null,
            whatsapp: null,
            email: newContact.email || null,
            notes: null,
            is_primary: false,
            active: true,
          });
          contactId = createdContact.id;
        } catch (error) {
          console.error("Error saving contact:", error);
        }
      }
      contactName = newContact.name + (newContact.role ? ` (${newContact.role})` : "");
      contactPhone = newContact.phone || undefined;
      contactEmail = newContact.email || undefined;
    } else if (newViewing.contact_id && newViewing.contact_id !== "other" && projectContacts) {
      const selectedContact = projectContacts.find(c => c.id === newViewing.contact_id);
      if (selectedContact) {
        contactName = selectedContact.name + (selectedContact.role ? ` (${selectedContact.role})` : "");
        contactPhone = selectedContact.phone || undefined;
        contactEmail = selectedContact.email || undefined;
        contactId = selectedContact.id;
      }
    } else if (newViewing.contact_person) {
      contactName = newViewing.contact_person;
    }

    // Determine location based on selection
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

    const updated = viewings.map(v => {
      if (v.id === editingViewingId) {
        return {
          ...v,
          project_id: newViewing.project_id!,
          project_name: projectData?.name || "Onbekend project",
          date: newViewing.date!,
          time: newViewing.time!,
          contact_person: contactName,
          contact_id: contactId,
          contact_phone: contactPhone,
          contact_email: contactEmail,
          notes: newViewing.notes || "",
          showhouse_address: showhouseAddress,
          showhouse_maps_url: showhouseMapsUrl,
          showhouse_notes: showhouseNotes,
        };
      }
      return v;
    }).sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });

    setViewings(updated);
    onUpdateViewings(updated);
    resetForm();
  };

  const handleRemoveViewing = (id: string) => {
    const updated = viewings.filter(v => v.id !== id);
    setViewings(updated);
    onUpdateViewings(updated);
  };

  // Reset form when project changes
  const handleProjectChange = (projectId: string) => {
    const project = assignedProjects.find(p => p.project_id === projectId);
    setNewViewing({ ...newViewing, project_id: projectId, contact_id: undefined, contact_person: "" });
    setUseCustomContact(false);
    setAddNewContact(false);
    setShowExistingContactSearch(false);
    setSelectedExistingContact(null);
    // Auto-select showhouse if project has one
    if (project?.project?.showhouse_address) {
      setLocationType("showhouse");
    } else {
      setLocationType("project");
    }
  };

  // Handle contact selection
  const handleContactChange = (contactId: string) => {
    if (contactId === "new") {
      setAddNewContact(true);
      setUseCustomContact(false);
      setShowExistingContactSearch(false);
      setSelectedExistingContact(null);
      setNewViewing({ ...newViewing, contact_id: undefined, contact_person: "" });
    } else if (contactId === "search") {
      setShowExistingContactSearch(true);
      setAddNewContact(false);
      setUseCustomContact(false);
      setSelectedExistingContact(null);
      setNewViewing({ ...newViewing, contact_id: undefined, contact_person: "" });
    } else if (contactId === "other") {
      setUseCustomContact(true);
      setAddNewContact(false);
      setShowExistingContactSearch(false);
      setSelectedExistingContact(null);
      setNewViewing({ ...newViewing, contact_id: undefined, contact_person: "" });
    } else {
      setUseCustomContact(false);
      setAddNewContact(false);
      setShowExistingContactSearch(false);
      setSelectedExistingContact(null);
      setNewViewing({ ...newViewing, contact_id: contactId });
    }
  };

  // Handle selecting an existing contact from search
  const handleSelectExistingContact = (contact: (ProjectContact & { projectCount: number; projectNames: string[] })) => {
    setSelectedExistingContact(contact);
    setShowExistingContactSearch(false);
    setContactSearchQuery("");
  };

  // Get selected project data for location display
  const selectedProject = assignedProjects.find(p => p.project_id === newViewing.project_id);
  const hasShowhouse = !!selectedProject?.project?.showhouse_address;

  // Show ALL assigned projects, sorted by visit-relevance
  const statusOrder: Record<string, number> = { to_visit: 1, interested: 2, suggested: 3, visited: 4, rejected: 5 };
  const interestedProjects = [...assignedProjects].sort((a, b) => 
    (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99)
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              Bezichtigingsreis
            </SheetTitle>
            {getStatusBadge(trip.status)}
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Trip Overview */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(startDate, "d MMMM", { locale: nl })} -{" "}
                  {format(endDate, "d MMMM yyyy", { locale: nl })}
                  <span className="text-muted-foreground ml-2">
                    ({tripDays} dagen)
                  </span>
                </span>
              </div>

              {((trip as any).arrival_time || (trip as any).departure_time) && (
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {(trip as any).arrival_time && `Aankomst: ${(trip as any).arrival_time}`}
                    {(trip as any).arrival_time && (trip as any).departure_time && " · "}
                    {(trip as any).departure_time && `Vertrek: ${(trip as any).departure_time}`}
                  </span>
                </div>
              )}

              {((trip as any).airport || trip.flight_info) && (
                <div className="flex items-center gap-3">
                  <Plane className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {(trip as any).airport && `${(trip as any).airport}`}
                    {(trip as any).airport && trip.flight_info && " · "}
                    {trip.flight_info}
                  </span>
                </div>
              )}

              {trip.accommodation_info && (
                <div className="flex items-start gap-3">
                  <Home className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm">{trip.accommodation_info}</span>
                </div>
              )}

              <div className="pt-2 flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={onEdit}>
                  <Edit className="h-3 w-3 mr-1" />
                  Bewerken
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowPreview(true)}>
                  <Eye className="h-3 w-3 mr-1" />
                  Bekijk als klant
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Customer Preview Dialog */}
          <TripCustomerPreviewDialog
            trip={trip}
            open={showPreview}
            onOpenChange={setShowPreview}
            crmLeadId={crmLeadId}
            journeyPhase={journeyPhase}
          />

          <Separator />

          {/* Scheduled Viewings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Bezichtigingen ({viewings.length})</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddForm(true)}
                disabled={interestedProjects.length === 0}
              >
                <Plus className="h-3 w-3 mr-1" />
                Toevoegen
              </Button>
            </div>

            {/* Add/Edit Form */}
            {showAddForm && (
              <Card className="border-primary">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {editingViewingId ? "Bezichtiging bewerken" : "Nieuwe bezichtiging"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Project *</Label>
                    <Select
                      value={newViewing.project_id}
                      onValueChange={handleProjectChange}
                    >
                      <SelectTrigger className="h-auto min-h-10">
                        <SelectValue placeholder="Selecteer project">
                          {newViewing.project_id && (() => {
                            const selected = interestedProjects.find(p => p.project_id === newViewing.project_id);
                            if (!selected?.project) return "Selecteer project";
                            return (
                              <div className="flex items-center gap-2">
                                {selected.project.featured_image && (
                                  <img 
                                    src={selected.project.featured_image} 
                                    alt="" 
                                    className="w-8 h-8 rounded object-cover"
                                  />
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
                      <SelectContent className="max-h-[300px]">
                        {interestedProjects.map((p) => (
                          <SelectItem 
                            key={p.project_id} 
                            value={p.project_id}
                            className="py-2"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded bg-muted flex-shrink-0 overflow-hidden">
                                {p.project?.featured_image ? (
                                  <img 
                                    src={p.project.featured_image} 
                                    alt="" 
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium truncate">{p.project?.name || "Onbekend"}</div>
                                <div className="text-xs text-muted-foreground">
                                  {p.project?.city && <span>{p.project.city}</span>}
                                  {p.project?.price_from && (
                                    <span className="ml-2">
                                      vanaf €{(p.project.price_from / 1000).toFixed(0)}k
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label className="text-xs">Datum *</Label>
                      <Select
                        value={newViewing.date}
                        onValueChange={(v) => setNewViewing({ ...newViewing, date: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Kies dag" />
                        </SelectTrigger>
                        <SelectContent>
                          {daySchedule.map((day) => (
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

                  {/* Contact person section */}
                  <div className="space-y-2">
                    <Label className="text-xs">Contactpersoon</Label>
                    
                    {/* Selected existing contact display */}
                    {selectedExistingContact && (
                      <div className="p-3 rounded-lg border bg-primary/5 border-primary/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium flex items-center gap-1 text-primary">
                            <Search className="h-3 w-3" />
                            Bestaand contact geselecteerd
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => {
                              setSelectedExistingContact(null);
                            }}
                          >
                            Wijzigen
                          </Button>
                        </div>
                        <div className="space-y-1">
                          <div className="font-medium text-sm">{selectedExistingContact.name}</div>
                          {selectedExistingContact.role && (
                            <div className="text-xs text-muted-foreground">{selectedExistingContact.role}</div>
                          )}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {selectedExistingContact.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {selectedExistingContact.phone}
                              </span>
                            )}
                            {selectedExistingContact.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {selectedExistingContact.email}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Building className="h-3 w-3" />
                            <span>{selectedExistingContact.projectCount} project{selectedExistingContact.projectCount !== 1 ? 'en' : ''}</span>
                          </div>
                        </div>
                        {!isContactLinkedToProject && (
                          <div className="flex items-center gap-2 mt-3 pt-2 border-t">
                            <Checkbox
                              id="linkToProject"
                              checked={linkToProject}
                              onCheckedChange={(checked) => setLinkToProject(!!checked)}
                            />
                            <label htmlFor="linkToProject" className="text-xs text-muted-foreground">
                              Ook koppelen aan dit project (voor toekomstige bezichtigingen)
                            </label>
                          </div>
                        )}
                        {isContactLinkedToProject && (
                          <div className="text-xs text-green-600 mt-2 flex items-center gap-1">
                            ✓ Al gekoppeld aan dit project
                          </div>
                        )}
                      </div>
                    )}

                    {/* Existing contact search */}
                    {showExistingContactSearch && !selectedExistingContact && (
                      <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium flex items-center gap-1">
                            <Search className="h-3 w-3" />
                            Zoek bestaand contact
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => {
                              setShowExistingContactSearch(false);
                              setContactSearchQuery("");
                            }}
                          >
                            Annuleren
                          </Button>
                        </div>
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                          <Input
                            placeholder="Zoek op naam, rol, telefoon..."
                            value={contactSearchQuery}
                            onChange={(e) => setContactSearchQuery(e.target.value)}
                            className="pl-7 h-8"
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {filteredExistingContacts.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-2">
                              Geen contacten gevonden
                            </p>
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
                                  <Badge variant="secondary" className="text-xs">
                                    {contact.projectCount} project{contact.projectCount !== 1 ? 'en' : ''}
                                  </Badge>
                                </div>
                                {contact.role && (
                                  <div className="text-xs text-muted-foreground">{contact.role}</div>
                                )}
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
                      <Select
                        value={newViewing.contact_id || ""}
                        onValueChange={handleContactChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer contactpersoon" />
                        </SelectTrigger>
                        <SelectContent>
                          {projectContacts && projectContacts.length > 0 && (
                            <>
                              <div className="px-2 py-1 text-xs text-muted-foreground font-medium">
                                Dit project
                              </div>
                              {projectContacts.map((contact) => (
                                <SelectItem key={contact.id} value={contact.id}>
                                  <div className="flex items-center gap-2">
                                    {contact.name}
                                    {contact.role && (
                                      <span className="text-muted-foreground text-xs">
                                        ({contact.role})
                                      </span>
                                    )}
                                    {contact.is_primary && (
                                      <Badge variant="secondary" className="text-xs ml-1">
                                        Hoofd
                                      </Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                              <Separator className="my-1" />
                            </>
                          )}
                          <SelectItem value="search">
                            <div className="flex items-center gap-2 text-primary">
                              <Search className="h-3 w-3" />
                              Zoek in bestaande contacten
                            </div>
                          </SelectItem>
                          <SelectItem value="new">
                            <div className="flex items-center gap-2 text-primary">
                              <UserPlus className="h-3 w-3" />
                              Nieuwe contact toevoegen
                            </div>
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
                          <span className="text-xs font-medium flex items-center gap-1">
                            <UserPlus className="h-3 w-3" />
                            Nieuwe contactpersoon
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => {
                              setAddNewContact(false);
                              setNewContact({ name: "", role: "", phone: "", email: "", saveToProject: true });
                            }}
                          >
                            Annuleren
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Naam *"
                            value={newContact.name}
                            onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                          />
                          <Input
                            placeholder="Rol (optioneel)"
                            value={newContact.role}
                            onChange={(e) => setNewContact({ ...newContact, role: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Telefoon"
                            value={newContact.phone}
                            onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                          />
                          <Input
                            type="email"
                            placeholder="Email"
                            value={newContact.email}
                            onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="saveToProject"
                            checked={newContact.saveToProject}
                            onCheckedChange={(checked) => 
                              setNewContact({ ...newContact, saveToProject: !!checked })
                            }
                          />
                          <label htmlFor="saveToProject" className="text-xs text-muted-foreground">
                            Bewaar als projectcontact (voor toekomstige bezichtigingen)
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Custom contact (one-time) */}
                    {useCustomContact && (
                      <div className="space-y-2">
                        <Input
                          placeholder="Naam van contact ter plaatse"
                          value={newViewing.contact_person || ""}
                          onChange={(e) => setNewViewing({ ...newViewing, contact_person: e.target.value })}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => setUseCustomContact(false)}
                        >
                          Terug naar selectie
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Location section */}
                  {newViewing.project_id && (
                    <div className="space-y-2">
                      <Label className="text-xs">Locatie bezichtiging</Label>
                      <RadioGroup
                        value={locationType}
                        onValueChange={(v) => setLocationType(v as LocationType)}
                        className="space-y-2"
                      >
                        <div className="flex items-start gap-2 p-2 rounded border bg-background">
                          <RadioGroupItem value="project" id="loc-project" className="mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <label htmlFor="loc-project" className="text-sm font-medium cursor-pointer">
                              Project locatie
                            </label>
                            <p className="text-xs text-muted-foreground truncate">
                              {selectedProject?.project?.city || "Locatie van het project"}
                            </p>
                          </div>
                        </div>

                        {hasShowhouse && (
                          <div className="flex items-start gap-2 p-2 rounded border bg-background">
                            <RadioGroupItem value="showhouse" id="loc-showhouse" className="mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <label htmlFor="loc-showhouse" className="text-sm font-medium cursor-pointer flex items-center gap-1">
                                <Home className="h-3 w-3" />
                                Showhouse
                              </label>
                              <p className="text-xs text-muted-foreground truncate">
                                {selectedProject?.project?.showhouse_address}
                              </p>
                              {selectedProject?.project?.showhouse_notes && (
                                <p className="text-xs text-amber-600 mt-0.5">
                                  ⚠️ {selectedProject.project.showhouse_notes}
                                </p>
                              )}
                              {selectedProject?.project?.showhouse_maps_url && (
                                <a
                                  href={selectedProject.project.showhouse_maps_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Open in Maps
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex items-start gap-2 p-2 rounded border bg-background">
                          <RadioGroupItem value="custom" id="loc-custom" className="mt-0.5" />
                          <div className="flex-1">
                            <label htmlFor="loc-custom" className="text-sm font-medium cursor-pointer">
                              Andere locatie
                            </label>
                          </div>
                        </div>
                      </RadioGroup>

                      {locationType === "custom" && (
                        <div className="space-y-2 pl-6">
                          <Input
                            placeholder="Google Maps link"
                            value={customLocation.mapsUrl}
                            onChange={(e) => setCustomLocation({ ...customLocation, mapsUrl: e.target.value })}
                          />
                          {customLocation.mapsUrl && parseGoogleMapsUrl(customLocation.mapsUrl) && (
                            <p className="text-xs text-green-600">
                              ✓ Coördinaten gevonden
                            </p>
                          )}
                          <Input
                            placeholder="Adres (optioneel)"
                            value={customLocation.address}
                            onChange={(e) => setCustomLocation({ ...customLocation, address: e.target.value })}
                          />
                          <Input
                            placeholder="Notities (bijv. 'Bel aan bij receptie')"
                            value={customLocation.notes}
                            onChange={(e) => setCustomLocation({ ...customLocation, notes: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-xs">Notities</Label>
                    <Textarea
                      placeholder="Extra informatie..."
                      value={newViewing.notes || ""}
                      onChange={(e) => setNewViewing({ ...newViewing, notes: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={resetForm}
                    >
                      Annuleren
                    </Button>
                    <Button
                      size="sm"
                      onClick={editingViewingId ? handleUpdateViewing : handleAddViewing}
                      disabled={!newViewing.project_id || !newViewing.date || !newViewing.time || createContact.isPending}
                    >
                      {createContact.isPending ? "Bezig..." : editingViewingId ? "Opslaan" : "Toevoegen"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Day-by-day schedule */}
            {daySchedule.map((day) => (
              <div key={day.dateStr} className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  {format(day.date, "EEEE d MMMM", { locale: nl })}
                </h4>
                {day.viewings.length === 0 ? (
                  <p className="text-xs text-muted-foreground pl-4">
                    Geen bezichtigingen gepland
                  </p>
                ) : (
                  <div className="space-y-2">
                    {day.viewings.map((viewing) => (
                      <div
                        key={viewing.id}
                        className="flex items-start gap-2 p-3 rounded-lg border bg-card"
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 cursor-grab" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {viewing.time}
                            </span>
                            <span className="text-sm truncate">
                              {viewing.project_name}
                            </span>
                          </div>
                          {viewing.contact_person && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Contact: {viewing.contact_person}</span>
                              {viewing.contact_phone && (
                                <a
                                  href={`tel:${viewing.contact_phone}`}
                                  className="flex items-center gap-1 text-primary hover:underline"
                                >
                                  <Phone className="h-3 w-3" />
                                </a>
                              )}
                              {viewing.contact_email && (
                                <a
                                  href={`mailto:${viewing.contact_email}`}
                                  className="flex items-center gap-1 text-primary hover:underline"
                                >
                                  <Mail className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          )}
                          {/* Showhouse Location */}
                          {(viewing.showhouse_address || viewing.showhouse_maps_url) && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{viewing.showhouse_address || "Locatie"}</span>
                              {viewing.showhouse_maps_url && (
                                <a
                                  href={viewing.showhouse_maps_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-primary hover:underline flex-shrink-0"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  <span>Maps</span>
                                </a>
                              )}
                            </div>
                          )}
                          {viewing.showhouse_notes && (
                            <p className="text-xs text-amber-600 mt-1">
                              ⚠️ {viewing.showhouse_notes}
                            </p>
                          )}
                          {viewing.notes && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {viewing.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => handleEditViewing(viewing)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveViewing(viewing.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {interestedProjects.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Markeer eerst projecten als "interessant" om bezichtigingen te plannen
              </p>
            )}
          </div>

          {/* Admin Notes */}
          {trip.admin_notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Admin notities</h3>
                <p className="text-sm text-muted-foreground">{trip.admin_notes}</p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}