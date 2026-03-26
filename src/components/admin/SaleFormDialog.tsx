import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useCreateSale, useUpdateSale, useCancelSale, useReactivateSale, Sale } from "@/hooks/useSales";
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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProjectsList } from "@/hooks/useProjectsList";
import { Loader2, Check, Home, MapPin, Search, X, Plus, User, Ban, RefreshCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const customerSchema = z.object({
  id: z.string(),
  role: z.enum(['buyer', 'co_buyer']),
});

const formSchema = z.object({
  project_id: z.string().optional(),
  property_id: z.string().optional(),
  property_description: z.string().optional(),
  sale_price: z.coerce.number().optional(),
  deposit_amount: z.coerce.number().optional(),
  tis_commission_type: z.enum(['percentage', 'fixed']).default('percentage'),
  tis_commission_percentage: z.coerce.number().optional(),
  tis_commission_fixed: z.coerce.number().optional(),
  status: z.enum(['geblokkeerd', 'reservatie', 'koopcontract', 'voorbereiding', 'akkoord', 'overdracht', 'nazorg', 'afgerond', 'geannuleerd']),
  reservation_date: z.string().optional(),
  expected_delivery_date: z.string().optional(),
  notary_date: z.string().optional(),
  admin_notes: z.string().optional(),
  customers: z.array(customerSchema).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SaleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale?: Sale;
  defaultCustomerId?: string;
  defaultProjectId?: string;
}

export function SaleFormDialog({ 
  open, 
  onOpenChange, 
  sale,
  defaultCustomerId,
  defaultProjectId,
}: SaleFormDialogProps) {
  const navigate = useNavigate();
  const createSale = useCreateSale();
  const updateSale = useUpdateSale();
  const cancelSale = useCancelSale();
  const reactivateSale = useReactivateSale();
  const [cancelReason, setCancelReason] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(sale?.project_id || defaultProjectId || undefined);
  const [projectSearch, setProjectSearch] = useState("");

  // Use cached project list for display; fetch commission data on-demand per selected project
  const { data: cachedProjects } = useProjectsList(false);
  
  // Fetch commission data for the selected project only
  const { data: commissionData } = useQuery({
    queryKey: ['project-commission', selectedProjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('default_commission_type, default_commission_percentage, default_commission_fixed')
        .eq('id', selectedProjectId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProjectId,
  });

  // Merge cached projects with commission data for the selected project
  const projects = useMemo(() => {
    if (!cachedProjects) return [];
    return cachedProjects.map(p => ({
      ...p,
      active: p.status !== 'inactive',
      source: null as string | null,
      default_commission_type: p.id === selectedProjectId ? commissionData?.default_commission_type : null,
      default_commission_percentage: p.id === selectedProjectId ? commissionData?.default_commission_percentage : null,
      default_commission_fixed: p.id === selectedProjectId ? commissionData?.default_commission_fixed : null,
    }));
  }, [cachedProjects, selectedProjectId, commissionData]);

  // Filter projects based on search
  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    if (!projectSearch.trim()) return projects;
    
    const searchLower = projectSearch.toLowerCase();
    return projects.filter(p => 
      p.name.toLowerCase().includes(searchLower) ||
      p.city?.toLowerCase().includes(searchLower) ||
      p.id.toLowerCase().includes(searchLower)
    );
  }, [projects, projectSearch]);

  // Fetch customers (CRM leads)
  const { data: customers } = useQuery({
    queryKey: ['customers-for-sale'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('id, first_name, last_name, email')
        .order('first_name');
      if (error) throw error;
      return data;
    },
  });

  const [customerSearch, setCustomerSearch] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      project_id: sale?.project_id || defaultProjectId || undefined,
      property_id: sale?.property_id || undefined,
      property_description: sale?.property_description || '',
      sale_price: sale?.sale_price || undefined,
      deposit_amount: sale?.deposit_amount || undefined,
      tis_commission_type: (sale?.tis_commission_type as 'percentage' | 'fixed') || 'percentage',
      tis_commission_percentage: sale?.tis_commission_percentage || undefined,
      tis_commission_fixed: sale?.tis_commission_fixed || undefined,
      status: sale?.status || 'reservatie',
      reservation_date: sale?.reservation_date || new Date().toISOString().split('T')[0],
      expected_delivery_date: sale?.expected_delivery_date || '',
      notary_date: (sale as any)?.notary_date || '',
      admin_notes: sale?.admin_notes || '',
      customers: defaultCustomerId ? [{ id: defaultCustomerId, role: 'buyer' as const }] : [],
    },
  });

  // Set project when defaultProjectId changes (e.g., from viewing selection)
  useEffect(() => {
    if (open && defaultProjectId && !sale) {
      form.setValue('project_id', defaultProjectId);
      setSelectedProjectId(defaultProjectId);
    }
  }, [open, defaultProjectId, sale, form]);

  // Load existing customers when editing a sale
  useEffect(() => {
    if (open) {
      if (sale?.customers && sale.customers.length > 0) {
        // Map existing sale customers to form format
        const existingCustomers = sale.customers.map(sc => ({
          id: sc.crm_lead_id,
          role: sc.role as 'buyer' | 'co_buyer',
        }));
        form.setValue('customers', existingCustomers);
      } else if (defaultCustomerId) {
        form.setValue('customers', [{ id: defaultCustomerId, role: 'buyer' as const }]);
      }
    }
  }, [open, sale?.customers, defaultCustomerId, form]);

  // Track if commission was auto-filled from project
  const [commissionFromProject, setCommissionFromProject] = useState(false);

  // Auto-fill commission when project is selected (only for new sales)
  useEffect(() => {
    if (!sale && selectedProjectId && projects) {
      const selectedProject = projects.find(p => p.id === selectedProjectId);
      if (selectedProject) {
        const hasCommission = selectedProject.default_commission_percentage || selectedProject.default_commission_fixed;
        if (hasCommission) {
          const currentPercentage = form.getValues('tis_commission_percentage');
          const currentFixed = form.getValues('tis_commission_fixed');
          // Only auto-fill if both fields are empty or was previously auto-filled
          if ((!currentPercentage && !currentFixed) || commissionFromProject) {
            form.setValue('tis_commission_type', (selectedProject.default_commission_type as 'percentage' | 'fixed') || 'percentage');
            form.setValue('tis_commission_percentage', selectedProject.default_commission_percentage || undefined);
            form.setValue('tis_commission_fixed', selectedProject.default_commission_fixed || undefined);
            setCommissionFromProject(true);
          }
        }
      }
    }
  }, [selectedProjectId, projects, sale, form, commissionFromProject]);

  const selectedCustomers = form.watch('customers') || [];

  // Filter customers based on search, excluding already selected
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    const selectedIds = selectedCustomers.map(c => c.id);
    let filtered = customers.filter(c => !selectedIds.includes(c.id));
    
    if (customerSearch.trim()) {
      const searchLower = customerSearch.toLowerCase();
      filtered = filtered.filter(c => 
        c.first_name?.toLowerCase().includes(searchLower) ||
        c.last_name?.toLowerCase().includes(searchLower) ||
        c.email?.toLowerCase().includes(searchLower)
      );
    }
    return filtered;
  }, [customers, customerSearch, selectedCustomers]);

  const addCustomer = (customerId: string) => {
    const current = form.getValues('customers') || [];
    form.setValue('customers', [...current, { id: customerId, role: 'buyer' as const }]);
    setCustomerSearch("");
  };

  const removeCustomer = (customerId: string) => {
    const current = form.getValues('customers') || [];
    form.setValue('customers', current.filter(c => c.id !== customerId));
  };

  const getCustomerById = (id: string) => customers?.find(c => c.id === id);

  const onSubmit = async (data: FormValues) => {
    const { customers: formCustomers, ...saleData } = data;
    // Map customers to required format
    const customersWithRoles = formCustomers?.map(c => ({
      id: c.id!,
      role: c.role!,
    }));

    if (sale) {
      // Update existing sale including customers
      await updateSale.mutateAsync({ 
        id: sale.id, 
        ...saleData,
        customers: customersWithRoles,
      });
      
      // Sync notary date milestone completion status
      if (saleData.notary_date) {
        await supabase
          .from('sale_milestones')
          .update({ 
            target_date: saleData.notary_date,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString() 
          })
          .eq('sale_id', sale.id)
          .eq('template_key', 'overd_notaris_datum');
      } else {
        await supabase
          .from('sale_milestones')
          .update({ 
            target_date: null,
            completed_at: null,
            updated_at: new Date().toISOString() 
          })
          .eq('sale_id', sale.id)
          .eq('template_key', 'overd_notaris_datum');
      }
    } else {
      const newSale = await createSale.mutateAsync({
        ...saleData,
        customers: customersWithRoles,
      });
      if (newSale) {
        navigate(`/admin/verkopen/${newSale.id}`);
      }
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {sale ? 'Verkoop Bewerken' : 'Nieuwe Verkoop'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Project Selection - ScrollArea based */}
            <FormField
              control={form.control}
              name="project_id"
              render={({ field }) => {
                const selectedProject = projects?.find(p => p.id === field.value);
                
                return (
                  <FormItem className="col-span-2">
                    <FormLabel>Project</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        {/* Selected project display */}
                        {selectedProject && (
                          <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                            {selectedProject.featured_image ? (
                              <img 
                                src={selectedProject.featured_image} 
                                alt={selectedProject.name}
                                className="w-12 h-12 rounded object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                <Home className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">{selectedProject.name}</p>
                                <Badge variant="outline" className="text-[10px] font-mono">
                                  #{selectedProject.id.slice(-4)}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span>{selectedProject.city}</span>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                field.onChange(undefined);
                                setSelectedProjectId(undefined);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        
                        {/* Search input */}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Zoek op naam, stad of ID..."
                            value={projectSearch}
                            onChange={(e) => setProjectSearch(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                        
                        {/* Projects list with ScrollArea */}
                        <ScrollArea className="h-[280px] border rounded-lg">
                          <div className="p-2 space-y-1">
                            {filteredProjects.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-8">
                                Geen projecten gevonden
                              </p>
                            ) : (
                              filteredProjects.map((project) => (
                                <div
                                  key={project.id}
                                  onClick={() => {
                                    field.onChange(project.id);
                                    setSelectedProjectId(project.id);
                                    setProjectSearch("");
                                  }}
                                  className={cn(
                                    "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                                    field.value === project.id 
                                      ? "bg-primary/10 border border-primary/20" 
                                      : "hover:bg-muted"
                                  )}
                                >
                                  {project.featured_image ? (
                                    <img 
                                      src={project.featured_image} 
                                      alt={project.name}
                                      className="w-14 h-10 rounded object-cover flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-14 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                      <Home className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-medium truncate text-sm">{project.name}</p>
                                      {(project.status === 'sold_out' || project.status === 'sold') && (
                                        <Badge variant="destructive" className="text-[10px] flex-shrink-0">Uitverkocht</Badge>
                                      )}
                                      {!project.active && project.status !== 'sold_out' && project.status !== 'sold' && (
                                        <Badge variant="secondary" className="text-[10px] flex-shrink-0">Inactief</Badge>
                                      )}
                                      {project.source === 'manual' && (
                                        <Badge variant="outline" className="text-[10px] flex-shrink-0 text-blue-600 border-blue-600">Handmatig</Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span>{project.city}</span>
                                      {project.price_from && (
                                        <span className="text-primary">
                                          €{project.price_from.toLocaleString('nl-NL')}
                                          {project.price_to && project.price_to !== project.price_from && (
                                            <> - €{project.price_to.toLocaleString('nl-NL')}</>
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {field.value === project.id && (
                                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="property_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Omschrijving woning</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Bijv. Appartement Type A, 2e verdieping" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Customer Selection - Multi-select with roles */}
            <div className="space-y-3">
              <FormLabel>Klant(en)</FormLabel>
              
              {/* Selected customers */}
              {selectedCustomers.length > 0 && (
                <div className="space-y-2">
                  {selectedCustomers.map((sc) => {
                    const customer = getCustomerById(sc.id);
                    if (!customer) return null;
                    return (
                      <div key={sc.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {customer.first_name} {customer.last_name}
                          </p>
                          {customer.email && (
                            <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs">Koper</Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => removeCustomer(sc.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Search and add customers */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek klant om toe te voegen..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              {/* Available customers list */}
              <ScrollArea className="h-[160px] border rounded-lg">
                <div className="p-2 space-y-1">
                  {filteredCustomers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {customerSearch ? 'Geen klanten gevonden' : 'Geen beschikbare klanten'}
                    </p>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => addCustomer(customer.id)}
                        className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {customer.first_name} {customer.last_name}
                          </p>
                          {customer.email && (
                            <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                          )}
                        </div>
                        <Plus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Financial */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sale_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verkoopprijs (€)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="250000"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tis_commission_type"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormLabel>Commissie Type</FormLabel>
                      {commissionFromProject && !sale && (
                        <Badge variant="secondary" className="text-xs">
                          Overgenomen van project
                        </Badge>
                      )}
                    </div>
                    <Select 
                      value={field.value} 
                      onValueChange={(value) => {
                        field.onChange(value);
                        setCommissionFromProject(false);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Vast bedrag (€)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('tis_commission_type') === 'percentage' ? (
                <FormField
                  control={form.control}
                  name="tis_commission_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TIS Commissie</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type="number" 
                            step="0.1"
                            placeholder="3.5"
                            {...field}
                            className="pr-8"
                            onChange={(e) => {
                              field.onChange(e);
                              setCommissionFromProject(false);
                            }}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="tis_commission_fixed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TIS Commissie</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                          <Input 
                            type="number" 
                            step="100"
                            placeholder="3500"
                            {...field}
                            className="pl-8"
                            onChange={(e) => {
                              field.onChange(e);
                              setCommissionFromProject(false);
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Status & Dates */}
            <div className="grid grid-cols-2 gap-4">
              {/* Status - Read-only badge (calculated from checklist) */}
              <div className="space-y-2">
                <FormLabel>Status</FormLabel>
                <div className="flex items-center h-10">
                  <Badge variant={sale?.status === 'geannuleerd' ? 'destructive' : 'secondary'} className="text-xs">
                    {sale?.status ? {
                      reservatie: 'Reservatie',
                      koopcontract: 'Koopcontract',
                      voorbereiding: 'Voorbereiding',
                      akkoord: 'Akkoord',
                      overdracht: 'Overdracht',
                      nazorg: 'Nazorg',
                      afgerond: 'Afgerond',
                      geannuleerd: 'Geannuleerd',
                    }[sale.status] : 'Reservatie'}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-2">Automatisch</span>
                </div>
              </div>

              <FormField
                control={form.control}
                name="reservation_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reservatiedatum</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expected_delivery_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verwachte Oplevering</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notary_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notarisdatum</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="admin_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Interne notities</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Notities voor intern gebruik..."
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cancel/Reactivate sale section */}
            {sale && sale.status === 'geannuleerd' && (
              <div className="border-t pt-4 mt-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:text-primary hover:bg-primary/10 gap-2"
                    >
                      <RefreshCcw className="h-4 w-4" />
                      Verkoop heractiveren
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Verkoop heractiveren?</AlertDialogTitle>
                      <AlertDialogDescription>
                        De verkoop wordt opnieuw actief. Geannuleerde facturen en betalingen worden hersteld naar "openstaand".
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Terug</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          reactivateSale.mutate(sale.id, {
                            onSuccess: () => onOpenChange(false),
                          });
                        }}
                      >
                        {reactivateSale.isPending ? 'Heractiveren...' : 'Verkoop heractiveren'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}

            {sale && sale.status !== 'geannuleerd' && (
              <div className="border-t pt-4 mt-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                    >
                      <Ban className="h-4 w-4" />
                      Verkoop annuleren
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Verkoop annuleren?</AlertDialogTitle>
                      <AlertDialogDescription>
                        De status wordt op "Geannuleerd" gezet. Alle openstaande facturen en betalingen worden ook geannuleerd.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2">
                      <textarea
                        className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="Reden van annulering (optioneel)..."
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setCancelReason("")}>Terug</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          cancelSale.mutate(
                            { saleId: sale.id, reason: cancelReason || undefined },
                            { onSuccess: () => onOpenChange(false) }
                          );
                          setCancelReason("");
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {cancelSale.isPending ? 'Annuleren...' : 'Verkoop annuleren'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Annuleren
              </Button>
              <Button 
                type="submit" 
                disabled={createSale.isPending || updateSale.isPending}
              >
                {(createSale.isPending || updateSale.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {sale ? 'Opslaan' : 'Aanmaken'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
