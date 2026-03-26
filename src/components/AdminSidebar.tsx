import { Users, Building2, LayoutDashboard, LogOut, FileText, FolderKanban, Star, MessageSquare, BookOpen, FileCode, Bot, Settings, Lightbulb, BarChart3, Handshake, Target, Video, Activity, HelpCircle, Film, Receipt, PiggyBank, ListTodo, CalendarDays, Compass, Share2, Sparkles, Calculator, Dna, FileEdit, Palette, MapPin, Globe, Loader2, AlertTriangle, ChevronDown } from "lucide-react";
import { NavLink } from "./NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ViewModeSwitcher } from "@/components/admin/ViewModeSwitcher";
import { useSyncManager } from "@/contexts/SyncManagerContext";
import { Badge } from "@/components/ui/badge";
import { friendlyError } from "@/lib/friendlyError";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";

const sidebarSections = [
  {
    label: "Overzicht",
    items: [
      { title: "Dashboard", url: "/admin/chat-analytics", icon: LayoutDashboard },
      { title: "Tracking Overzicht", url: "/admin/tracking", icon: Activity },
      { title: "Video Gesprekken", url: "/admin/meetings", icon: Video },
      { title: "Site Management", url: "/admin/site-management", icon: Settings },
    ],
  },
  {
    label: "Gebruikers",
    items: [
      { title: "Website Bezoekers", url: "/admin/crm-leads", icon: Target },
      { title: "Klantbeheer", url: "/admin/customers", icon: Users },
      { title: "Team", url: "/admin/team", icon: Users },
      { title: "Verkopen", url: "/admin/verkopen", icon: Receipt },
      { title: "Externe Panden", url: "/admin/externe-panden", icon: Globe },
      { title: "Taken", url: "/admin/taken", icon: ListTodo },
      { title: "Aftersales", url: "/admin/aftersales", icon: Activity },
      { title: "Financiën", url: "/admin/financien", icon: PiggyBank },
      { title: "Partners", url: "/admin/partners", icon: Handshake },
      { title: "Partner Analytics", url: "/admin/partner-analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Content",
    items: [
      { title: "Projecten", url: "/admin/projects", icon: FolderKanban },
      { title: "Panden", url: "/admin/properties", icon: Building2 },
      { title: "Video's", url: "/admin/videos", icon: Film },
      { title: "Blog Posts", url: "/admin/blog", icon: FileText },
      { title: "Blog Insights", url: "/admin/blog-insights", icon: BarChart3 },
      { title: "Oriëntatiegids", url: "/admin/orientation-guide", icon: Compass },
      { title: "Klant Reisgidsen", url: "/admin/reisgids", icon: FileText },
      { title: "Omgeving POI's", url: "/admin/reisgids-pois", icon: MapPin },
      { title: "Kostenindicatie", url: "/admin/kostenindicatie", icon: Calculator },
      { title: "Reviews", url: "/admin/reviews", icon: Star },
      { title: "FAQ Beheer", url: "/admin/faq", icon: HelpCircle },
    ],
  },
  {
    label: "Marketing",
    items: [
      { title: "Infoavonden", url: "/admin/infoavonden", icon: CalendarDays },
      { title: "Webinars", url: "/admin/webinars", icon: Video },
      { title: "Social Posts", url: "/admin/social-posts", icon: Share2 },
      { title: "Visual Studio", url: "/admin/visual-studio", icon: Palette },
      { title: "Content Engine", url: "/admin/content-engine", icon: Sparkles, children: [
        { title: "Blog", url: "/admin/content-engine/blog", icon: FileText },
        { title: "LinkedIn", url: "/admin/content-engine/linkedin", icon: Share2 },
        { title: "Pipeline", url: "/admin/content-engine/pipeline", icon: FolderKanban },
        { title: "Kalender", url: "/admin/content-engine/kalender", icon: CalendarDays },
      ]},
      { title: "Project Briefing", url: "/admin/project-briefing", icon: FileEdit },
      { title: "Style DNA", url: "/admin/style-dna", icon: Dna },
    ],
  },
  {
    label: "Chatbot",
    items: [
      { title: "Testing", url: "/admin/chatbot-testing", icon: MessageSquare },
      { title: "Instellingen", url: "/admin/chatbot-settings", icon: Bot },
      { title: "Insights", url: "/admin/chatbot-insights", icon: Lightbulb },
      { title: "Analytics", url: "/admin/chat-analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Documentatie",
    items: [
      { title: "Proces Overzicht", url: "/admin/process-documentation", icon: BookOpen },
      { title: "Verkoop Proces", url: "/admin/process-documentation/verkoop-proces", icon: Receipt },
      { title: "RedSP Property Import", url: "/admin/process-documentation/redsp-import", icon: FileCode },
    ],
  },
];

export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { hasActiveSyncs, activeSyncs, failedSyncs } = useSyncManager();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
        <ViewModeSwitcher />
        {hasActiveSyncs && (
          <div className="mt-2 space-y-1 px-1">
            {Object.values(activeSyncs)
              .filter(s => s.phase === 'scraping' || s.phase === 'processing-background')
              .map(s => (
                <div
                  key={s.projectId}
                  className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 rounded px-1 py-0.5"
                  onClick={() => navigate(`/admin/projects/${s.projectId}`)}
                >
                  <Badge variant="outline" className="text-blue-600 border-blue-600 text-[10px] animate-pulse">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    {s.phase === 'scraping' ? 'Analyseren' : s.phase === 'processing-background' ? 'Achtergrond' : 'Importeren'}
                  </Badge>
                  {s.projectName && (
                    <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                      {s.projectName}
                    </span>
                  )}
                </div>
              ))}
          </div>
        )}
        {failedSyncs.length > 0 && (
          <div className="mt-2 space-y-1 px-1">
            {failedSyncs.map(fs => (
              <div
                key={fs.projectId}
                className="flex items-center gap-2 cursor-pointer hover:bg-destructive/10 rounded px-1 py-0.5"
                onClick={() => navigate(`/admin/projects/${fs.projectId}`)}
                title={friendlyError(fs.error)}
              >
                <Badge variant="outline" className="text-destructive border-destructive text-[10px]">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Sync mislukt
                </Badge>
                <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                  {fs.projectName}
                </span>
              </div>
            ))}
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        {sidebarSections.map((section, sectionIndex) => (
          <SidebarGroup key={section.label} className={sectionIndex > 0 ? "mt-4 border-t border-border/40 pt-2" : ""}>
            <SidebarGroupLabel className="uppercase tracking-wider text-xs font-semibold px-3 py-1.5 text-muted-foreground/70">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const active = isActive(item.url);
                  const children = (item as any).children as typeof section.items | undefined;

                  if (children) {
                    const anyChildActive = children.some(c => currentPath.startsWith(c.url));
                    const parentActive = active || anyChildActive;
                    return (
                      <SidebarMenuItem key={item.title + item.url}>
                        <Collapsible defaultOpen={anyChildActive}>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                              isActive={parentActive}
                              className={`pl-3 transition-colors hover:bg-accent/50 justify-between ${parentActive ? "border-l-2 border-primary bg-primary/10 rounded-md" : ""}`}
                            >
                              <span className="flex items-center gap-2">
                                <item.icon className={`h-4 w-4 ${parentActive ? "text-primary" : ""}`} />
                                <span>{item.title}</span>
                              </span>
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenu className="mt-0.5">
                              {children.map((child) => {
                                const childActive = isActive(child.url);
                                return (
                                  <SidebarMenuItem key={child.title + child.url}>
                                    <SidebarMenuButton asChild isActive={childActive} className="h-7">
                                      <NavLink
                                        to={child.url}
                                        end
                                        className={`pl-8 text-xs transition-colors hover:bg-accent/50 ${childActive ? "border-l-2 border-primary bg-primary/10 rounded-md" : "text-muted-foreground"}`}
                                        activeClassName="text-primary font-medium"
                                      >
                                        <child.icon className={`h-3.5 w-3.5 ${childActive ? "text-primary" : ""}`} />
                                        <span>{child.title}</span>
                                      </NavLink>
                                    </SidebarMenuButton>
                                  </SidebarMenuItem>
                                );
                              })}
                            </SidebarMenu>
                          </CollapsibleContent>
                        </Collapsible>
                      </SidebarMenuItem>
                    );
                  }

                  return (
                    <SidebarMenuItem key={item.title + item.url}>
                      <SidebarMenuButton asChild isActive={active}>
                        <NavLink
                          to={item.url}
                          end
                          className={`pl-3 transition-colors hover:bg-accent/50 ${active ? "border-l-2 border-primary bg-primary/10 rounded-md" : ""}`}
                          activeClassName="text-primary font-medium"
                        >
                          <item.icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="sticky bottom-0 bg-sidebar p-4 border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              <span>Uitloggen</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
