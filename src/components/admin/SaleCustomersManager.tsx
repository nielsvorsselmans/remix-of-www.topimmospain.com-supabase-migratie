import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sale } from "@/hooks/useSales";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, User, UserCheck, CheckCircle2, AlertCircle, Eye } from "lucide-react";
import { toast } from "sonner";
import { AddCustomerDialog } from "./AddCustomerDialog";
import { CustomerDetailSheet } from "./CustomerDetailSheet";
import { ViewAsCustomerButton } from "./klant/ViewAsCustomerButton";

interface SaleCustomersManagerProps {
  sale: Sale;
}

const roleLabels: Record<string, string> = {
  buyer: "Koper",
  co_buyer: "Mede-koper",
};

export function SaleCustomersManager({ sale }: SaleCustomersManagerProps) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const existingCustomerIds = sale.customers?.map(sc => sc.crm_lead_id) || [];

  const deleteMutation = useMutation({
    mutationFn: async (saleCustomerId: string) => {
      const { error } = await supabase
        .from("sale_customers")
        .delete()
        .eq("id", saleCustomerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sale", sale.id] });
      toast.success("Klant verwijderd van verkoop");
    },
    onError: () => {
      toast.error("Fout bij verwijderen klant");
    },
  });

  // Find selected customer for the detail sheet
  const selectedCustomer = sale.customers?.find(c => c.id === selectedCustomerId);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Klanten ({sale.customers?.length || 0})</CardTitle>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Klant Toevoegen
              </Button>
            </DialogTrigger>
            <AddCustomerDialog
              saleId={sale.id}
              existingCustomerIds={existingCustomerIds}
              onClose={() => setShowAddDialog(false)}
            />
          </Dialog>
        </CardHeader>
        <CardContent>
          {sale.customers && sale.customers.length > 0 ? (
            <div className="space-y-3">
              {sale.customers.map((customer) => {
                // Use personal_data_complete from crm_lead directly
                const isDataComplete = customer.crm_lead?.personal_data_complete;

                return (
                  <div
                    key={customer.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedCustomerId(customer.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback>
                            {customer.role === "buyer" ? (
                              <UserCheck className="h-5 w-5" />
                            ) : (
                              <User className="h-5 w-5" />
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">
                              {customer.crm_lead?.first_name} {customer.crm_lead?.last_name}
                            </span>
                            {isDataComplete ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-orange-500 shrink-0" />
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline">{roleLabels[customer.role] || customer.role}</Badge>
                            {customer.crm_lead?.email && (
                              <span className="truncate">{customer.crm_lead.email}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {customer.crm_lead?.id && (
                          <ViewAsCustomerButton
                            firstName={customer.crm_lead?.first_name}
                            lastName={customer.crm_lead?.last_name}
                            crmLeadId={customer.crm_lead.id}
                          />
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Klant verwijderen?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Weet je zeker dat je {customer.crm_lead?.first_name} wilt verwijderen van deze verkoop?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuleren</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(customer.id)}
                              >
                                Verwijderen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Nog geen klanten gekoppeld aan deze verkoop.
            </p>
          )}
        </CardContent>
      </Card>

      <CustomerDetailSheet
        open={!!selectedCustomerId}
        onOpenChange={(open) => !open && setSelectedCustomerId(null)}
        customer={selectedCustomer ? {
          id: selectedCustomer.id,
          role: selectedCustomer.role,
          crm_lead: selectedCustomer.crm_lead ? {
            id: selectedCustomer.crm_lead.id,
            first_name: selectedCustomer.crm_lead.first_name,
            last_name: selectedCustomer.crm_lead.last_name,
            email: selectedCustomer.crm_lead.email,
            phone: selectedCustomer.crm_lead.phone,
            ghl_contact_id: selectedCustomer.crm_lead.ghl_contact_id,
          } : null,
        } : null}
      />
    </>
  );
}
