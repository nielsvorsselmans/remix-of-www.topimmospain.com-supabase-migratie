import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User, UserPlus, Search, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

// Simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export interface AddCustomerDialogProps {
  saleId: string;
  existingCustomerIds: string[];
  onClose: () => void;
}

interface GHLContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isImported: boolean;
}

export function AddCustomerDialog({ saleId, existingCustomerIds, onClose }: AddCustomerDialogProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"existing" | "ghl" | "new">("existing");
  
  // Existing customer state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<"buyer" | "co_buyer">("buyer");

  // GHL search state
  const [ghlSearchQuery, setGhlSearchQuery] = useState("");
  const [ghlSelectedRole, setGhlSelectedRole] = useState<"buyer" | "co_buyer">("buyer");
  const debouncedGhlQuery = useDebounce(ghlSearchQuery, 300);

  // New customer state
  const [newCustomer, setNewCustomer] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });
  const [newCustomerRole, setNewCustomerRole] = useState<"buyer" | "co_buyer">("buyer");

  // Query for existing CRM leads with personal_data_complete status
  const { data: customers } = useQuery({
    queryKey: ["crm-leads-for-sale-with-data"],
    queryFn: async () => {
      const { data: leads, error } = await supabase
        .from("crm_leads")
        .select("id, first_name, last_name, email, personal_data_complete")
        .order("first_name");
      if (error) throw error;
      
      return leads?.map(lead => ({
        ...lead,
        hasCompleteData: lead.personal_data_complete || false
      })) || [];
    },
  });

  // Query for GHL contacts
  const { data: ghlContacts, isLoading: isSearchingGhl } = useQuery({
    queryKey: ["ghl-search", debouncedGhlQuery],
    queryFn: async () => {
      if (debouncedGhlQuery.length < 2) return [];
      const { data, error } = await supabase.functions.invoke("search-ghl-contacts", {
        body: { query: debouncedGhlQuery, limit: 10 },
      });
      if (error) throw error;
      return data.contacts as GHLContact[];
    },
    enabled: debouncedGhlQuery.length >= 2,
  });

  const availableCustomers = customers?.filter(
    (c) => !existingCustomerIds.includes(c.id)
  );

  // Mutation: Add existing CRM lead (no more reservation_details creation needed)
  const addExistingMutation = useMutation({
    mutationFn: async () => {
      const { data: saleCustomer, error } = await supabase
        .from("sale_customers")
        .insert([{
          sale_id: saleId,
          crm_lead_id: selectedCustomerId,
          role: selectedRole,
        }])
        .select("id")
        .single();
      if (error) throw error;
      return { saleCustomer };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sale", saleId] });
      toast.success("Klant toegevoegd aan verkoop");
      onClose();
    },
    onError: () => {
      toast.error("Fout bij toevoegen klant");
    },
  });

  // Mutation: Import GHL contact and add to sale
  const importGhlMutation = useMutation({
    mutationFn: async (ghlContactId: string) => {
      // 1. Import GHL contact to crm_leads
      const { data: importResult, error: importError } = await supabase.functions.invoke("import-ghl-contact", {
        body: { ghl_contact_id: ghlContactId },
      });
      if (importError) throw importError;

      const crmLeadId = importResult.lead.id;

      // 2. Link to sale (no reservation_details needed)
      const { error: saleError } = await supabase
        .from("sale_customers")
        .insert([{
          sale_id: saleId,
          crm_lead_id: crmLeadId,
          role: ghlSelectedRole,
        }]);
      
      if (saleError) throw saleError;

      return { importResult };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sale", saleId] });
      queryClient.invalidateQueries({ queryKey: ["crm-leads-for-sale-with-data"] });
      queryClient.invalidateQueries({ queryKey: ["ghl-search"] });
      toast.success("GHL contact geïmporteerd en toegevoegd aan verkoop");
      onClose();
    },
    onError: (error) => {
      console.error("Error importing GHL contact:", error);
      toast.error("Fout bij importeren GHL contact");
    },
  });

  // Mutation: Add existing CRM lead that was already imported from GHL
  const addExistingGhlMutation = useMutation({
    mutationFn: async (ghlContactId: string) => {
      // Find the CRM lead with this GHL contact ID
      const { data: existingLead, error: findError } = await supabase
        .from("crm_leads")
        .select("id")
        .eq("ghl_contact_id", ghlContactId)
        .single();
      
      if (findError) throw findError;

      // Link to sale (no reservation_details needed)
      const { error: saleError } = await supabase
        .from("sale_customers")
        .insert([{
          sale_id: saleId,
          crm_lead_id: existingLead.id,
          role: ghlSelectedRole,
        }]);
      
      if (saleError) throw saleError;

      return {};
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sale", saleId] });
      toast.success("Klant toegevoegd aan verkoop");
      onClose();
    },
    onError: () => {
      toast.error("Fout bij toevoegen klant");
    },
  });

  // Mutation: Create new customer using central edge function
  const addNewMutation = useMutation({
    mutationFn: async () => {
      // 1. Use create-lead-with-ghl-sync (handles everything: lead, GHL, auth, profile)
      const { data, error } = await supabase.functions.invoke("create-lead-with-ghl-sync", {
        body: {
          first_name: newCustomer.first_name.trim(),
          last_name: newCustomer.last_name.trim(),
          email: newCustomer.email.trim(),
          phone: newCustomer.phone.trim() || undefined,
          journey_phase: "aankoop",
          source_campaign: "sale_co_buyer",
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to create lead");

      const crmLeadId = data.crm_lead.id;

      // 2. Link to sale
      const { error: saleError } = await supabase
        .from("sale_customers")
        .insert([{
          sale_id: saleId,
          crm_lead_id: crmLeadId,
          role: newCustomerRole,
        }]);
      
      if (saleError) throw saleError;

      return data.crm_lead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sale", saleId] });
      queryClient.invalidateQueries({ queryKey: ["crm-leads-for-sale-with-data"] });
      toast.success("Nieuwe klant aangemaakt en toegevoegd");
      onClose();
    },
    onError: (error) => {
      console.error("Error creating new customer:", error);
      toast.error("Fout bij aanmaken nieuwe klant");
    },
  });

  const handleAddExisting = () => {
    addExistingMutation.mutate();
  };

  const handleAddNew = () => {
    if (!newCustomer.first_name.trim() || !newCustomer.last_name.trim()) {
      toast.error("Voornaam en achternaam zijn verplicht");
      return;
    }
    
    const emailTrimmed = newCustomer.email.trim();
    if (!emailTrimmed) {
      toast.error("E-mailadres is verplicht");
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      toast.error("Voer een geldig e-mailadres in");
      return;
    }
    
    addNewMutation.mutate();
  };

  const handleGhlContactSelect = (contact: GHLContact) => {
    if (contact.isImported) {
      addExistingGhlMutation.mutate(contact.id);
    } else {
      importGhlMutation.mutate(contact.id);
    }
  };

  const isAddingExisting = addExistingMutation.isPending;
  const isAddingNew = addNewMutation.isPending;
  const isImportingGhl = importGhlMutation.isPending || addExistingGhlMutation.isPending;

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Klant Toevoegen</DialogTitle>
      </DialogHeader>
      
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "existing" | "ghl" | "new")}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="existing" className="flex items-center gap-1 text-xs">
            <User className="h-3.5 w-3.5" />
            Bestaand
          </TabsTrigger>
          <TabsTrigger value="ghl" className="flex items-center gap-1 text-xs">
            <Search className="h-3.5 w-3.5" />
            GHL Zoeken
          </TabsTrigger>
          <TabsTrigger value="new" className="flex items-center gap-1 text-xs">
            <UserPlus className="h-3.5 w-3.5" />
            Nieuw
          </TabsTrigger>
        </TabsList>

        {/* Tab: Bestaande klant */}
        <TabsContent value="existing" className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Klant</Label>
            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecteer een klant" />
              </SelectTrigger>
              <SelectContent>
                {availableCustomers?.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    <span className="flex items-center gap-2">
                      {customer.first_name} {customer.last_name}
                      {customer.email && <span className="text-muted-foreground">({customer.email})</span>}
                      {customer.hasCompleteData && (
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCustomerId && availableCustomers?.find(c => c.id === selectedCustomerId)?.hasCompleteData && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Persoonlijke gegevens zijn al ingevuld
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as "buyer" | "co_buyer")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buyer">Koper</SelectItem>
                <SelectItem value="co_buyer">Mede-koper</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Annuleren
            </Button>
            <Button
              onClick={handleAddExisting}
              disabled={!selectedCustomerId || isAddingExisting}
            >
              {isAddingExisting ? "Toevoegen..." : "Toevoegen"}
            </Button>
          </div>
        </TabsContent>

        {/* Tab: GHL Zoeken */}
        <TabsContent value="ghl" className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Zoek in GoHighLevel</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={ghlSearchQuery}
                onChange={(e) => setGhlSearchQuery(e.target.value)}
                placeholder="Zoek op naam, email of telefoon..."
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={ghlSelectedRole} onValueChange={(v) => setGhlSelectedRole(v as "buyer" | "co_buyer")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buyer">Koper</SelectItem>
                <SelectItem value="co_buyer">Mede-koper</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-h-[180px] max-h-[240px] overflow-y-auto border rounded-lg">
            {isSearchingGhl ? (
              <div className="flex items-center justify-center h-[180px]">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : ghlSearchQuery.length < 2 ? (
              <div className="flex items-center justify-center h-[180px] text-sm text-muted-foreground">
                Typ minimaal 2 karakters om te zoeken
              </div>
            ) : ghlContacts && ghlContacts.length > 0 ? (
              <div className="divide-y">
                {ghlContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-3 hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {contact.firstName} {contact.lastName}
                        </span>
                        {contact.isImported && (
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Geïmporteerd
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {contact.email || contact.phone || "Geen contactgegevens"}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={contact.isImported ? "outline" : "default"}
                      onClick={() => handleGhlContactSelect(contact)}
                      disabled={isImportingGhl}
                    >
                      {isImportingGhl ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : contact.isImported ? (
                        "Toevoegen"
                      ) : (
                        "Importeren"
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[180px] text-sm text-muted-foreground">
                Geen resultaten gevonden
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={onClose}>
              Annuleren
            </Button>
          </div>
        </TabsContent>

        {/* Tab: Nieuwe klant */}
        <TabsContent value="new" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Voornaam *</Label>
              <Input
                value={newCustomer.first_name}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, first_name: e.target.value }))}
                placeholder="Jan"
              />
            </div>
            <div className="space-y-2">
              <Label>Achternaam *</Label>
              <Input
                value={newCustomer.last_name}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, last_name: e.target.value }))}
                placeholder="Jansen"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>E-mail <span className="text-destructive">*</span></Label>
            <Input
              type="email"
              value={newCustomer.email}
              onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
              placeholder="jan@voorbeeld.nl"
            />
          </div>
          <div className="space-y-2">
            <Label>Telefoon</Label>
            <Input
              type="tel"
              value={newCustomer.phone}
              onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+31 6 12345678"
            />
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={newCustomerRole} onValueChange={(v) => setNewCustomerRole(v as "buyer" | "co_buyer")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buyer">Koper</SelectItem>
                <SelectItem value="co_buyer">Mede-koper</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground">
            Nieuwe klanten worden automatisch gesynchroniseerd naar GoHighLevel.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Annuleren
            </Button>
            <Button
              onClick={handleAddNew}
              disabled={!newCustomer.first_name.trim() || !newCustomer.last_name.trim() || isAddingNew}
            >
              {isAddingNew ? "Aanmaken..." : "Aanmaken & Toevoegen"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </DialogContent>
  );
}
