import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, User, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerSearchProps {
  onSelect: (customerId: string | null) => void;
  selectedId: string | null;
}

interface CrmLead {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

export function CustomerSearch({ onSelect, selectedId }: CustomerSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: customers, isLoading } = useQuery({
    queryKey: ['crm-leads-search', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('crm_leads')
        .select('id, first_name, last_name, email')
        .order('last_name', { ascending: true })
        .limit(50);

      if (searchQuery) {
        query = query.or(
          `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CrmLead[];
    },
  });

  const selectedCustomer = customers?.find(c => c.id === selectedId);

  const getCustomerName = (customer: CrmLead) => {
    const name = [customer.first_name, customer.last_name].filter(Boolean).join(' ');
    return name || customer.email || 'Onbekend';
  };

  return (
    <div className="space-y-2">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Zoek op naam of e-mail..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Selected Customer Display */}
      {selectedCustomer && (
        <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md text-sm">
          <Check className="h-4 w-4 text-primary" />
          <span className="font-medium">{getCustomerName(selectedCustomer)}</span>
          <button 
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onSelect(null)}
          >
            Wijzigen
          </button>
        </div>
      )}

      {/* Customer List */}
      {!selectedId && (
        <ScrollArea className="h-48 border rounded-lg">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : customers?.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Geen klanten gevonden
            </div>
          ) : (
            <div className="divide-y">
              {customers?.map((customer) => (
                <button
                  key={customer.id}
                  className={cn(
                    "w-full p-3 text-left hover:bg-muted/50 flex items-center gap-3",
                    selectedId === customer.id && "bg-primary/10"
                  )}
                  onClick={() => onSelect(customer.id)}
                >
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      {getCustomerName(customer)}
                    </p>
                    {customer.email && (
                      <p className="text-xs text-muted-foreground truncate">
                        {customer.email}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      )}
    </div>
  );
}
