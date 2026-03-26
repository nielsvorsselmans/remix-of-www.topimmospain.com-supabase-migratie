import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Plus,
  Edit,
  Trash2,
  Phone,
  Mail,
  Star,
  User,
  MessageCircle,
  Loader2,
} from "lucide-react";
import {
  useProjectContacts,
  useCreateProjectContact,
  useUpdateProjectContact,
  useDeleteProjectContact,
  ProjectContact,
} from "@/hooks/useProjectContacts";

interface ProjectContactsManagerProps {
  projectId: string;
}

interface ContactFormData {
  name: string;
  role: string;
  phone: string;
  email: string;
  whatsapp: string;
  notes: string;
  is_primary: boolean;
}

const emptyForm: ContactFormData = {
  name: "",
  role: "",
  phone: "",
  email: "",
  whatsapp: "",
  notes: "",
  is_primary: false,
};

export function ProjectContactsManager({ projectId }: ProjectContactsManagerProps) {
  const { data: contacts, isLoading } = useProjectContacts(projectId);
  const createMutation = useCreateProjectContact();
  const updateMutation = useUpdateProjectContact();
  const deleteMutation = useDeleteProjectContact();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ProjectContact | null>(null);
  const [formData, setFormData] = useState<ContactFormData>(emptyForm);

  const handleOpenCreate = () => {
    setEditingContact(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (contact: ProjectContact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      role: contact.role || "",
      phone: contact.phone || "",
      email: contact.email || "",
      whatsapp: contact.whatsapp || "",
      notes: contact.notes || "",
      is_primary: contact.is_primary,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    if (editingContact) {
      await updateMutation.mutateAsync({
        id: editingContact.id,
        projectId,
        updates: {
          name: formData.name,
          role: formData.role || null,
          phone: formData.phone || null,
          email: formData.email || null,
          whatsapp: formData.whatsapp || null,
          notes: formData.notes || null,
          is_primary: formData.is_primary,
        },
      });
    } else {
      await createMutation.mutateAsync({
        project_id: projectId,
        name: formData.name,
        role: formData.role || null,
        phone: formData.phone || null,
        email: formData.email || null,
        whatsapp: formData.whatsapp || null,
        notes: formData.notes || null,
        is_primary: formData.is_primary,
        active: true,
      });
    }

    setDialogOpen(false);
    setFormData(emptyForm);
    setEditingContact(null);
  };

  const handleDelete = async (contact: ProjectContact) => {
    if (confirm(`Weet je zeker dat je ${contact.name} wilt verwijderen?`)) {
      await deleteMutation.mutateAsync({ id: contact.id, projectId });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Beheer contactpersonen voor bezichtigingen
        </p>
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Toevoegen
        </Button>
      </div>

      {contacts?.length === 0 ? (
        <div className="text-center py-8 border rounded-lg">
          <User className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">
            Nog geen contactpersonen toegevoegd
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {contacts?.map((contact) => (
            <Card key={contact.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{contact.name}</span>
                      {contact.is_primary && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          Hoofdcontact
                        </Badge>
                      )}
                    </div>
                    {contact.role && (
                      <p className="text-sm text-muted-foreground">{contact.role}</p>
                    )}
                    <div className="flex flex-wrap gap-3 text-sm">
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Phone className="h-3 w-3" />
                          {contact.phone}
                        </a>
                      )}
                      {contact.whatsapp && (
                        <a
                          href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-green-600 hover:underline"
                        >
                          <MessageCircle className="h-3 w-3" />
                          WhatsApp
                        </a>
                      )}
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </a>
                      )}
                    </div>
                    {contact.notes && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {contact.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => handleOpenEdit(contact)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(contact)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Sheet */}
      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {editingContact ? "Contactpersoon bewerken" : "Nieuwe contactpersoon"}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Naam *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Naam van contactpersoon"
              />
            </div>

            <div className="space-y-2">
              <Label>Rol / Functie</Label>
              <Input
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="Bijv. Sales Manager, Makelaar"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefoonnummer</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+34 612 345 678"
                />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="+34 612 345 678"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@voorbeeld.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Notities</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Interne notities over deze contactpersoon"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm">Hoofdcontact</Label>
                <p className="text-xs text-muted-foreground">
                  Wordt automatisch geselecteerd bij bezichtigingen
                </p>
              </div>
              <Switch
                checked={formData.is_primary}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_primary: checked })
                }
              />
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuleren
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name.trim() || isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingContact ? "Opslaan" : "Toevoegen"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
