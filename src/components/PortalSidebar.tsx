import { useState, useEffect } from "react";
import logo from "@/assets/logo.png";
import { Home, Heart, LogOut, Compass, FolderOpen, User, Eye, ChevronDown, CreditCard, FileText, ClipboardCheck, Camera, Building, Building2, Plane } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
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
import { Badge } from "@/components/ui/badge";
import { useFavoritesCount } from "@/hooks/useFavorites";
import { useUserJourneyPhase, JourneyPhase } from "@/hooks/useUserJourneyPhase";
import { useCustomerPreview } from "@/contexts/CustomerPreviewContext";
import { useCustomerSales } from "@/hooks/useCustomerSales";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { PartnerViewSwitcher } from "@/components/partner/PartnerViewSwitcher";
import { PhasePreviewSelector } from "@/components/admin/PhasePreviewSelector";

// Menu item type
interface MenuItem {
  title: string;
  url: string;
  icon: React.ElementType;
  badge?: number;
  subItems?: MenuItem[];
}

// Get dynamic sidebar items based on journey phase
function getSidebarItems(phase: JourneyPhase, hasSale: boolean, favoritesCount: number): MenuItem[] {
  const baseItems: MenuItem[] = [
    { title: "Overzicht", url: "/dashboard", icon: Home },
  ];

  // Phase-specific items
  const phaseItems: Record<JourneyPhase, MenuItem[]> = {
    orientatie: [
      { title: "Aanbod", url: "/dashboard/aanbod", icon: Building2 },
      { title: "Ontdekken", url: "/dashboard/ontdekken", icon: Compass },
      { 
        title: "Mijn Selectie", 
        url: "/dashboard/projecten", 
        icon: FolderOpen,
        badge: favoritesCount > 0 ? favoritesCount : undefined
      },
    ],
    selectie: [
      { 
        title: "Mijn Selectie", 
        url: "/dashboard/projecten", 
        icon: FolderOpen,
        badge: favoritesCount > 0 ? favoritesCount : undefined
      },
      { title: "Ontdekken", url: "/dashboard/ontdekken", icon: Compass },
    ],
    bezichtiging: [
      { title: "Bezichtigingsreis", url: "/dashboard/bezichtiging", icon: Plane },
      { 
        title: "Mijn Selectie", 
        url: "/dashboard/projecten",
        icon: FolderOpen 
      },
      { title: "Ontdekken", url: "/dashboard/ontdekken", icon: Compass },
    ],
    aankoop: [
      { 
        title: "Mijn Woning", 
        url: "/dashboard/mijn-woning", 
        icon: Building,
        subItems: [
          { title: "Betalingen", url: "/dashboard/betalingen", icon: CreditCard },
          { title: "Documenten", url: "/dashboard/documenten", icon: FileText },
          { title: "Specificaties", url: "/dashboard/specificaties", icon: ClipboardCheck },
          { title: "Bouwupdates", url: "/dashboard/bouwupdates", icon: Camera },
        ]
      },
      { 
        title: "Mijn Selectie", 
        url: "/dashboard/projecten", 
        icon: FolderOpen 
      },
      { title: "Ontdekken", url: "/dashboard/ontdekken", icon: Compass },
    ],
    overdracht: [
      { 
        title: "Mijn Woning", 
        url: "/dashboard/mijn-woning", 
        icon: Building,
        subItems: [
          { title: "Betalingen", url: "/dashboard/betalingen", icon: CreditCard },
          { title: "Documenten", url: "/dashboard/documenten", icon: FileText },
          { title: "Specificaties", url: "/dashboard/specificaties", icon: ClipboardCheck },
          { title: "Bouwupdates", url: "/dashboard/bouwupdates", icon: Camera },
        ]
      },
      { title: "Mijn Selectie", url: "/dashboard/projecten", icon: FolderOpen },
      { title: "Ontdekken", url: "/dashboard/ontdekken", icon: Compass },
    ],
    beheer: [
      { 
        title: "Mijn Woning", 
        url: "/dashboard/mijn-woning", 
        icon: Building,
        subItems: [
          { title: "Betalingen", url: "/dashboard/betalingen", icon: CreditCard },
          { title: "Documenten", url: "/dashboard/documenten", icon: FileText },
          { title: "Specificaties", url: "/dashboard/specificaties", icon: ClipboardCheck },
          { title: "Bouwupdates", url: "/dashboard/bouwupdates", icon: Camera },
        ]
      },
      { title: "Mijn Selectie", url: "/dashboard/projecten", icon: FolderOpen },
      { title: "Ontdekken", url: "/dashboard/ontdekken", icon: Compass },
    ],
  };

  // Get items for current phase
  let items = [...baseItems, ...phaseItems[phase]];

  // If user has a sale but is in an earlier phase, still show Mijn Woning
  if (hasSale && !['aankoop', 'overdracht', 'beheer'].includes(phase)) {
    // Insert Mijn Woning after Overzicht
    const woningItem: MenuItem = {
      title: "Mijn Woning",
      url: "/dashboard/mijn-woning",
      icon: Building,
      subItems: [
        { title: "Betalingen", url: "/dashboard/betalingen", icon: CreditCard },
        { title: "Documenten", url: "/dashboard/documenten", icon: FileText },
        { title: "Specificaties", url: "/dashboard/specificaties", icon: ClipboardCheck },
        { title: "Bouwupdates", url: "/dashboard/bouwupdates", icon: Camera },
      ]
    };
    items.splice(1, 0, woningItem);
  }

  return items;
}

// Collapsible menu item with sub-items
function CollapsibleMenuItem({ 
  item, 
  collapsed 
}: { 
  item: MenuItem; 
  collapsed: boolean;
}) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  
  // Check if any sub-item is active
  const isSubItemActive = item.subItems?.some(sub => location.pathname === sub.url);
  const isParentActive = location.pathname === item.url;
  
  // Auto-expand when a sub-item is active
  useEffect(() => {
    if (isSubItemActive) {
      setIsOpen(true);
    }
  }, [isSubItemActive]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton 
            className={cn(
              "w-full justify-between hover:bg-muted/50",
              (isSubItemActive || isParentActive) && "bg-muted text-primary font-medium"
            )}
          >
            <span className="flex items-center gap-2">
              <item.icon className="h-4 w-4" />
              {!collapsed && <span>{item.title}</span>}
            </span>
            {!collapsed && (
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform",
                isOpen && "rotate-180"
              )} />
            )}
          </SidebarMenuButton>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <SidebarMenu className="ml-4 mt-1 border-l pl-2">
            {item.subItems?.map((subItem) => (
                <SidebarMenuItem key={subItem.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={subItem.url}
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <subItem.icon className="h-4 w-4" />
                      {!collapsed && <span>{subItem.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

// Regular menu item
function RegularMenuItem({ 
  item, 
  collapsed 
}: { 
  item: MenuItem; 
  collapsed: boolean;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <NavLink
          to={item.url}
          end={item.url === "/dashboard"}
          className="hover:bg-muted/50"
          activeClassName="bg-muted text-primary font-medium"
        >
          <item.icon className="h-4 w-4" />
          {!collapsed && (
            <span className="flex items-center gap-2 flex-1">
              {item.title}
              {item.badge && item.badge > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {item.badge}
                </Badge>
              )}
            </span>
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

// Dynamic navigation section
function DynamicNavSection({ collapsed }: { collapsed: boolean }) {
  const { phase, hasSale, isLoading } = useUserJourneyPhase();
  const { data: favoritesCount = 0 } = useFavoritesCount();

  if (isLoading) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {[1, 2, 3].map((i) => (
              <SidebarMenuItem key={i}>
                <div className="h-8 bg-muted/30 rounded animate-pulse" />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  const menuItems = getSidebarItems(phase, hasSale, favoritesCount);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Mijn Portaal</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            item.subItems ? (
              <CollapsibleMenuItem 
                key={item.url} 
                item={item} 
                collapsed={collapsed} 
              />
            ) : (
              <RegularMenuItem 
                key={item.url} 
                item={item} 
                collapsed={collapsed} 
              />
            )
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

// Account section
function AccountSection({ collapsed }: { collapsed: boolean }) {
  return (
    <SidebarGroup className="mt-auto">
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink
                to="/dashboard/profiel"
                className="hover:bg-muted/50"
                activeClassName="bg-muted text-primary font-medium"
              >
                <User className="h-4 w-4" />
                {!collapsed && <span>Mijn Profiel</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function PortalSidebar() {
  const { state } = useSidebar();
  const { signOut, profile } = useAuth();
  const collapsed = state === "collapsed";
  const { isPreviewMode, previewCustomer } = useCustomerPreview();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  // In preview mode, show preview customer info; otherwise show logged-in user
  const displayName = isPreviewMode
    ? [previewCustomer?.first_name, previewCustomer?.last_name].filter(Boolean).join(" ") || "Preview Klant"
    : [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
  const displayEmail = isPreviewMode ? previewCustomer?.email : profile?.email;

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent>
        {/* Logo */}
        <div className="p-4 border-b">
          {!collapsed && (
            <img 
              src={logo} 
              alt="Top Immo Spain" 
              className="h-8"
            />
          )}
        </div>
        
        {/* Admin View Switcher & Phase Preview - only shows for admins */}
        {!collapsed && (
          <div className="px-4 pt-3 pb-2 space-y-2">
            <PartnerViewSwitcher />
            <PhasePreviewSelector />
          </div>
        )}

        {/* Preview Mode Indicator */}
        {isPreviewMode && !collapsed && (
          <div className="px-4 py-2 bg-amber-100 border-b border-amber-200">
            <div className="flex items-center gap-2 text-amber-800">
              <Eye className="h-4 w-4" />
              <span className="text-xs font-medium">Preview modus</span>
            </div>
          </div>
        )}

        {/* Dynamic Navigation */}
        <DynamicNavSection collapsed={collapsed} />

        {/* Account Section */}
        <AccountSection collapsed={collapsed} />
      </SidebarContent>

      <SidebarFooter>
        <div className="p-4 border-t">
          {!collapsed && (displayName || displayEmail) && (
            <div className="mb-2 text-sm text-muted-foreground">
              {isPreviewMode && (
                <Badge variant="outline" className="mb-1 text-xs bg-amber-50 text-amber-700 border-amber-200">
                  <Eye className="h-3 w-3 mr-1" />
                  Preview
                </Badge>
              )}
              {displayName && <p className="font-medium text-foreground">{displayName}</p>}
              {displayEmail && <p className="text-xs truncate">{displayEmail}</p>}
            </div>
          )}
          {!isPreviewMode && (
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Uitloggen</span>}
            </button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
