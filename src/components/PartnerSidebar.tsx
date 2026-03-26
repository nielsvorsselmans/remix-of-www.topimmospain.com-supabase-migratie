import { useLocation, useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { 
  LayoutDashboard, 
  Users, 
  FolderKanban,
  FileText,
  ShoppingBag, 
  BarChart3, 
  Settings,
  LogOut,
  ChevronDown,
  Euro
} from "lucide-react";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { PartnerViewSwitcher } from "@/components/partner/PartnerViewSwitcher";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

const overzichtItems = [
  { title: "Dashboard", url: "/partner/dashboard", icon: LayoutDashboard },
];

const klantenItems = [
  { title: "Mijn Klanten", url: "/partner/klanten", icon: Users },
];

const contentItems = [
  { title: "Projecten", url: "/partner/projecten", icon: FolderKanban },
  { title: "Content", url: "/partner/content", icon: FileText },
];

const resultatenItems = [
  { title: "Verkopen", url: "/partner/verkopen", icon: ShoppingBag },
  { title: "Commissies", url: "/partner/commissies", icon: Euro },
  { title: "Analytics", url: "/partner/analytics", icon: BarChart3 },
];

const accountItems = [
  { title: "Instellingen", url: "/partner/instellingen", icon: Settings },
];

interface NavSectionProps {
  label: string;
  items: Array<{ title: string; url: string; icon: React.ComponentType<{ className?: string }> }>;
  currentPath: string;
  collapsed: boolean;
  defaultOpen?: boolean;
}

function NavSection({ label, items, currentPath, collapsed, defaultOpen = true }: NavSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const hasActiveItem = items.some(item => currentPath === item.url);

  if (collapsed) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={currentPath === item.url}
                  tooltip={item.title}
                >
                  <NavLink to={item.url}>
                    <item.icon className="h-4 w-4" />
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <Collapsible open={isOpen || hasActiveItem} onOpenChange={setIsOpen}>
      <SidebarGroup>
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent/50 rounded-md transition-colors flex items-center justify-between pr-2">
            <span>{label}</span>
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform",
              (isOpen || hasActiveItem) && "rotate-180"
            )} />
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={currentPath === item.url}
                  >
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

export function PartnerSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, isMobile } = useSidebar();
  const { signOut, isAdmin } = useAuth();
  const collapsed = state === "collapsed";
  const currentPath = location.pathname;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <Sidebar collapsible="icon" className="border-r md:top-20 md:h-[calc(100svh-5rem)]">
      <SidebarContent className="pt-4">
        {/* View Mode Switcher for Admins and Partners */}
        <div className="px-3 pb-4">
          <PartnerViewSwitcher />
        </div>

        <NavSection
          label="Overzicht"
          items={overzichtItems}
          currentPath={currentPath}
          collapsed={collapsed}
        />

        <NavSection
          label="Klanten"
          items={klantenItems}
          currentPath={currentPath}
          collapsed={collapsed}
        />

        <NavSection
          label="Content"
          items={contentItems}
          currentPath={currentPath}
          collapsed={collapsed}
        />

        <NavSection
          label="Resultaten"
          items={resultatenItems}
          currentPath={currentPath}
          collapsed={collapsed}
        />

        <NavSection
          label="Account"
          items={accountItems}
          currentPath={currentPath}
          collapsed={collapsed}
        />
      </SidebarContent>

      <SidebarFooter className="border-t p-3">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10",
            collapsed && "justify-center px-2"
          )}
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Uitloggen</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
