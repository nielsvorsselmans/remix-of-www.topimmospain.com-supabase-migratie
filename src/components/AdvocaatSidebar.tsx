import { useLocation, useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { 
  LayoutDashboard, 
  Settings,
  LogOut,
  Scale
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
import { AdvocaatViewSwitcher } from "@/components/advocaat/AdvocaatViewSwitcher";
import { cn } from "@/lib/utils";

const overzichtItems = [
  { title: "Dashboard", url: "/advocaat/dashboard", icon: LayoutDashboard },
];

export function AdvocaatSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const { signOut } = useAuth();
  const collapsed = state === "collapsed";
  const currentPath = location.pathname;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <Sidebar collapsible="icon" className="border-r md:top-20 md:h-[calc(100svh-5rem)]">
      <SidebarContent className="pt-4">
        {/* View Mode Switcher */}
        <div className="px-3 pb-4">
          <AdvocaatViewSwitcher />
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Overzicht</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {overzichtItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={currentPath === item.url}
                    tooltip={item.title}
                  >
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
