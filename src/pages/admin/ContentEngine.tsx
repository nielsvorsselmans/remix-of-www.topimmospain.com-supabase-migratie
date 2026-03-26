import { useNavigate } from "react-router-dom";
import { FileText, Linkedin, CalendarDays, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionCards } from "@/components/admin/ActionCards";
import { Outlet, useLocation } from "react-router-dom";
import { useWorkflowCounts } from "@/hooks/useContentWorkflow";
import { useSocialPostCounts } from "@/hooks/useSocialPosts";
import { Badge } from "@/components/ui/badge";

export default function ContentEngine() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: counts } = useWorkflowCounts();
  const { data: postCounts } = useSocialPostCounts();
  
  // If on a sub-route, render the sub-page via Outlet
  const isHub = location.pathname === "/admin/content-engine";

  if (!isHub) {
    return <Outlet />;
  }

  const subPages = [
    {
      title: "Blog",
      description: "Ontdek klantvragen, creëer artikelen en publiceer.",
      icon: FileText,
      path: "/admin/content-engine/blog",
      badge: counts?.blogDrafts ? `${counts.blogDrafts} concepten` : undefined,
    },
    {
      title: "LinkedIn",
      description: "Schrijf, plan en publiceer LinkedIn posts.",
      icon: Linkedin,
      path: "/admin/content-engine/linkedin",
    },
    {
      title: "Pipeline",
      description: "Doorzoekbare database van alle social posts.",
      icon: FileText,
      path: "/admin/content-engine/pipeline",
      badge: postCounts ? `${(postCounts.draft || 0) + (postCounts.parked || 0)} concept/geparkeerd` : undefined,
    },
    {
      title: "Kalender",
      description: "Overzicht van alle geplande en gepubliceerde content.",
      icon: CalendarDays,
      path: "/admin/content-engine/kalender",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Content Engine</h1>
        <p className="text-sm text-muted-foreground">Wat moet er vandaag gebeuren?</p>
      </div>

      <ActionCards onNavigate={(tab) => {
        // Map old tab names to new routes
        const tabToRoute: Record<string, string> = {
          ontdekken: "/admin/content-engine/blog",
          creeren: "/admin/content-engine/blog",
          publiceren: "/admin/content-engine/blog",
          kalender: "/admin/content-engine/kalender",
          test: "/admin/content-engine/linkedin",
        };
        navigate(tabToRoute[tab] || "/admin/content-engine");
      }} />

      <div className="grid gap-4 md:grid-cols-3">
        {subPages.map((page) => (
          <Card
            key={page.path}
            className="cursor-pointer hover:border-primary/50 transition-colors group"
            onClick={() => navigate(page.path)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <page.icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{page.title}</CardTitle>
                </div>
                {page.badge && (
                  <Badge variant="secondary" className="text-xs">{page.badge}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>{page.description}</CardDescription>
              <Button variant="ghost" size="sm" className="mt-3 p-0 h-auto text-primary group-hover:underline">
                Openen <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
