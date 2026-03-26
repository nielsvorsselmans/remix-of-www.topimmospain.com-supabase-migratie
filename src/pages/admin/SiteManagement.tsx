import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Eye, Search, CheckCircle2, XCircle, Home, FolderKanban, BookOpen, FileCode, Users, Globe, Handshake } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface Page {
  id: string;
  page_slug: string;
  display_name: string;
  description?: string;
  category: string;
  active: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

interface PageSection {
  id: string;
  page_slug: string;
  section_key: string;
  title?: string;
  content: string;
  active: boolean;
  order_index: number;
}

export default function SiteManagement() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: pages, isLoading: pagesLoading } = useQuery({
    queryKey: ["pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data as Page[];
    },
  });

  const { data: sections, isLoading: sectionsLoading } = useQuery({
    queryKey: ["page_sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_sections")
        .select("*")
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data as PageSection[];
    },
  });

  const togglePageMutation = useMutation({
    mutationFn: async (id: string) => {
      const page = pages?.find(p => p.id === id);
      if (!page) return;

      const { error } = await supabase
        .from("pages")
        .update({ active: !page.active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      toast.success("Pagina status bijgewerkt");
    },
    onError: () => {
      toast.error("Kon pagina status niet bijwerken");
    },
  });

  const toggleSectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const section = sections?.find(s => s.id === id);
      if (!section) return;

      const { error } = await supabase
        .from("page_sections")
        .update({ active: !section.active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page_sections"] });
      toast.success("Sectie status bijgewerkt");
    },
    onError: () => {
      toast.error("Kon sectie status niet bijwerken");
    },
  });

  // Filter pages
  const filteredPages = useMemo(() => {
    if (!pages) return [];

    return pages.filter(page => {
      const matchesSearch = page.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           page.page_slug.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || 
                           (statusFilter === "active" && page.active) ||
                           (statusFilter === "inactive" && !page.active);
      const matchesCategory = categoryFilter === "all" || page.category === categoryFilter;
      
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [pages, searchQuery, statusFilter, categoryFilter]);

  // Icon mapping per category
  const categoryIcons: Record<string, any> = {
    main: Home,
    projects: FolderKanban,
    blog: BookOpen,
    legal: FileCode,
    dashboard: Users,
    partners: Handshake,
    other: Globe,
  };

  // Category labels
  const categoryLabels: Record<string, string> = {
    main: 'Hoofdpagina\'s',
    projects: 'Projecten',
    blog: 'Blog',
    legal: 'Juridisch',
    dashboard: 'Dashboard',
    partners: 'Partners',
    other: 'Overige',
  };

  // Group pages by category
  const groupedPages = useMemo(() => {
    if (!filteredPages) return {};

    const grouped: Record<string, typeof filteredPages> = {};
    
    filteredPages.forEach((page) => {
      const category = page.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(page);
    });

    return grouped;
  }, [filteredPages]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalPages = pages?.length || 0;
    const activePages = pages?.filter(p => p.active).length || 0;
    const inactivePages = totalPages - activePages;

    const totalSections = sections?.length || 0;
    const activeSections = sections?.filter(s => s.active).length || 0;
    const inactiveSections = totalSections - activeSections;

    return {
      pages: { total: totalPages, active: activePages, inactive: inactivePages },
      sections: { total: totalSections, active: activeSections, inactive: inactiveSections },
    };
  }, [pages, sections]);

  // Get sections for a specific page
  const getPageSections = (pageSlug: string) => {
    return sections?.filter(s => s.page_slug === pageSlug) || [];
  };

  if (pagesLoading || sectionsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Website Beheer</h1>
        <p className="text-muted-foreground mt-2">
          Beheer de zichtbaarheid van pagina's en secties op de website
        </p>
      </div>

      {/* Compact Statistics Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-2xl font-bold">{stats.pages.total}</div>
                <div className="text-xs text-muted-foreground">Pagina's</div>
              </div>
              <div className="flex gap-3 text-sm">
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  {stats.pages.active} actief
                </span>
                <span className="text-red-600 flex items-center gap-1">
                  <XCircle className="h-4 w-4" />
                  {stats.pages.inactive} uit
                </span>
              </div>
            </div>

            <div className="h-10 w-px bg-border" />

            <div className="flex items-center gap-6">
              <div>
                <div className="text-2xl font-bold">{stats.sections.total}</div>
                <div className="text-xs text-muted-foreground">Secties</div>
              </div>
              <div className="flex gap-3 text-sm">
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  {stats.sections.active} actief
                </span>
                <span className="text-red-600 flex items-center gap-1">
                  <XCircle className="h-4 w-4" />
                  {stats.sections.inactive} uit
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters - Sticky */}
      <div className="sticky top-14 z-10 bg-background pb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek pagina's..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Alle statussen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statussen</SelectItem>
              <SelectItem value="active">Alleen actief</SelectItem>
              <SelectItem value="inactive">Alleen inactief</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Alle categorieën" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle categorieën</SelectItem>
              <SelectItem value="main">Hoofdpagina's</SelectItem>
              <SelectItem value="projects">Projecten</SelectItem>
              <SelectItem value="blog">Blog</SelectItem>
              <SelectItem value="legal">Juridisch</SelectItem>
              <SelectItem value="dashboard">Dashboard</SelectItem>
              <SelectItem value="partners">Partners</SelectItem>
              <SelectItem value="other">Overige</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notice for Admins */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            ℹ️ Voor Administrators
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Als admin zie je alle pagina's en secties, ook de uitgeschakelde. Normale bezoekers zien alleen actieve content.
        </CardContent>
      </Card>

      {/* Pages grouped by category */}
      <div className="space-y-6">
        {Object.entries(groupedPages).map(([category, categoryPages]) => {
          const CategoryIcon = categoryIcons[category] || Globe;

          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <CategoryIcon className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold uppercase tracking-wide text-muted-foreground">
                  {categoryLabels[category] || category} ({categoryPages.length})
                </h3>
              </div>

              <div className="space-y-3">
                {categoryPages.map((page) => {
                  const pageSections = getPageSections(page.page_slug);
                  
                  return (
                    <Card key={page.id} className={!page.active ? 'opacity-60' : ''}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <CardTitle className="text-base truncate">{page.display_name}</CardTitle>
                              <Badge variant={page.active ? "default" : "secondary"} className="shrink-0">
                                {page.active ? "Actief" : "Inactief"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {page.page_slug}
                            </p>
                            {page.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {page.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Eye 
                              className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary" 
                              onClick={() => window.open(page.page_slug, '_blank')}
                            />
                            <Switch
                              checked={page.active}
                              onCheckedChange={() => togglePageMutation.mutate(page.id)}
                            />
                          </div>
                        </div>
                      </CardHeader>

                      {/* Accordion for Sections */}
                      {pageSections.length > 0 && (
                        <CardContent className="pt-0 border-t">
                          <Accordion type="single" collapsible>
                            <AccordionItem value="sections" className="border-none">
                              <AccordionTrigger className="py-2 hover:no-underline text-sm text-muted-foreground">
                                Secties ({pageSections.length})
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="pt-1 space-y-2">
                                  {pageSections.map((section) => (
                                    <div 
                                      key={section.id} 
                                      className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-md hover:bg-muted/50 transition-colors"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                          {section.title || section.section_key}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                          {section.section_key}
                                        </p>
                                      </div>
                                      <Switch
                                        checked={section.active}
                                        onCheckedChange={() => toggleSectionMutation.mutate(section.id)}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
