import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProjectsList } from "@/hooks/useProjectsList";
import { useEffectiveCustomer } from "@/hooks/useEffectiveCustomer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ProjectAnalysisReport } from "@/components/ProjectAnalysisReport";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Building, TrendingUp } from "lucide-react";
import { trackEvent } from "@/lib/tracking";

const ProjectAnalyse = () => {
  const [searchParams] = useSearchParams();
  const projectIdFromUrl = searchParams.get("project");
  
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectIdFromUrl);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [investmentYears, setInvestmentYears] = useState(10);

  const { crmLeadId, isLoading: loadingCustomer } = useEffectiveCustomer();

  // Fetch user's favorite projects and selections
  const { data: userProjects, isLoading: loadingUserProjects } = useQuery({
    queryKey: ["user-project-selections", crmLeadId],
    queryFn: async () => {
      const { data: selections } = await supabase
        .from("customer_project_selections")
        .select(`
          project_id,
          project:projects(id, name, display_title, city, region, price_from, featured_image)
        `)
        .eq("crm_lead_id", crmLeadId!);

      return selections?.map(s => s.project).filter(Boolean) || [];
    },
    enabled: !!crmLeadId,
  });

  // Use cached project list
  const { data: allProjects, isLoading: loadingAllProjects } = useProjectsList();

  // Fetch properties for selected project
  const { data: properties, isLoading: loadingProperties } = useQuery({
    queryKey: ["project-properties", selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];

      const { data, error } = await supabase
        .from("properties")
        .select("id, title, price, bedrooms, bathrooms, area_sqm, status")
        .eq("project_id", selectedProjectId)
        .eq("status", "available")
        .order("price");

      if (error) throw error;
      return data;
    },
    enabled: !!selectedProjectId,
  });

  // Get selected project details
  const selectedProject = allProjects?.find(p => p.id === selectedProjectId) || 
                          userProjects?.find(p => p?.id === selectedProjectId);

  // Get selected property price
  const selectedProperty = properties?.find(p => p.id === selectedPropertyId);
  const purchasePrice = selectedProperty?.price || selectedProject?.price_from || 200000;

  // Track analysis view
  useEffect(() => {
    if (selectedProject && purchasePrice) {
      trackEvent("project_analysis_view", {
        project_id: selectedProjectId,
        project_name: selectedProject.display_title || selectedProject.name,
        purchase_price: purchasePrice,
        investment_years: investmentYears,
      });
    }
  }, [selectedProjectId, purchasePrice, investmentYears]);

  // Set default project from URL
  useEffect(() => {
    if (projectIdFromUrl && !selectedProjectId) {
      setSelectedProjectId(projectIdFromUrl);
    }
  }, [projectIdFromUrl]);

  const projects = userProjects?.length ? userProjects : allProjects;
  const isLoading = loadingCustomer || loadingUserProjects || loadingAllProjects;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }


  return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            Project Analyse
          </h1>
          <p className="text-muted-foreground mt-1">
            Bekijk een gedetailleerde rendementssimulatie voor je geselecteerde project
          </p>
        </div>

        {/* Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle>Selecteer een project</CardTitle>
            <CardDescription>
              Kies een project om de volledige investerings analyse te bekijken
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Project Selection */}
              <div className="space-y-2">
                <Label>Project</Label>
                <Select 
                  value={selectedProjectId || ""} 
                  onValueChange={(value) => {
                    setSelectedProjectId(value);
                    setSelectedPropertyId(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer een project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((project) => (
                      <SelectItem key={project?.id} value={project?.id || ""}>
                        {project?.display_title || project?.name} - {project?.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Property Selection */}
              <div className="space-y-2">
                <Label>Woning (optioneel)</Label>
                <Select 
                  value={selectedPropertyId || "__use_from_price__"} 
                  onValueChange={(value) => setSelectedPropertyId(value === "__use_from_price__" ? null : value)}
                  disabled={!selectedProjectId || loadingProperties}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingProperties ? "Laden..." : "Vanaf prijs gebruiken"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__use_from_price__">Vanaf prijs ({formatPrice(selectedProject?.price_from || 0)})</SelectItem>
                    {properties?.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.title} - {formatPrice(property.price || 0)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Investment Years */}
              <div className="space-y-2">
                <Label>Investeringshorizon: {investmentYears} jaar</Label>
                <Slider
                  value={[investmentYears]}
                  onValueChange={(value) => setInvestmentYears(value[0])}
                  min={5}
                  max={20}
                  step={1}
                  className="mt-3"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Report */}
        {selectedProject ? (
          <ProjectAnalysisReport
            project={selectedProject}
            purchasePrice={purchasePrice}
            investmentYears={investmentYears}
          />
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <Building className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <div>
                  <h3 className="text-lg font-medium">Selecteer een project</h3>
                  <p className="text-muted-foreground">
                    Kies hierboven een project om je persoonlijke rendements analyse te bekijken
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
  );
};

export default ProjectAnalyse;
