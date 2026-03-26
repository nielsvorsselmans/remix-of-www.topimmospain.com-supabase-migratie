import { User, Scale, ChevronDown, Shield, Handshake } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdvocaat } from "@/contexts/AdvocaatContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { AdvocaatImpersonationSelector } from "@/components/admin/AdvocaatImpersonationSelector";

type ViewMode = 'admin' | 'customer' | 'partner' | 'advocaat';

interface ViewModeConfig {
  id: ViewMode;
  label: string;
  icon: typeof User;
  path: string;
  color: string;
  bgColor: string;
  description: string;
}

const allViewModes: ViewModeConfig[] = [
  { 
    id: 'admin', 
    label: 'Admin', 
    icon: Shield, 
    path: '/admin/customers',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    description: 'Beheer alles'
  },
  { 
    id: 'customer', 
    label: 'Klant', 
    icon: User, 
    path: '/dashboard',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    description: 'Bekijk als klant'
  },
  { 
    id: 'partner', 
    label: 'Partner', 
    icon: Handshake, 
    path: '/partner/dashboard',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    description: 'Partner dashboard'
  },
  { 
    id: 'advocaat', 
    label: 'Advocaat', 
    icon: Scale, 
    path: '/advocaat/dashboard',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    description: 'Advocaat portaal'
  },
];

function getCurrentViewMode(pathname: string): ViewMode {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/partner')) return 'partner';
  if (pathname.startsWith('/advocaat')) return 'advocaat';
  return 'customer';
}

export function AdvocaatViewSwitcher() {
  const { isAdmin, isAdvocaat, rolesLoaded } = useAuth();
  const { isImpersonating } = useAdvocaat();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  
  if (!rolesLoaded) {
    return <div className="w-full h-9 bg-muted/50 rounded-md animate-pulse" />;
  }
  
  if (!isAdmin && !isAdvocaat) return null;
  
  // Admins see all views, advocaten see only customer and advocaat
  const viewModes = isAdmin 
    ? allViewModes 
    : allViewModes.filter(m => m.id === 'customer' || m.id === 'advocaat');
  
  const currentMode = getCurrentViewMode(location.pathname);
  const currentConfig = viewModes.find(m => m.id === currentMode) || viewModes[0];
  const CurrentIcon = currentConfig.icon;

  const handleViewChange = (mode: ViewModeConfig) => {
    setOpen(false);
    window.location.href = mode.path;
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn(
            "w-full justify-between gap-2 font-medium border-2 transition-all",
            currentConfig.color,
            "hover:bg-muted/50 hover:border-current"
          )}
        >
          <div className="flex items-center gap-2">
            <div className={cn("p-1 rounded", currentConfig.bgColor)}>
              <CurrentIcon className="h-3.5 w-3.5" />
            </div>
            <span>{currentConfig.label} View</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 bg-background border shadow-lg z-50">
        {viewModes.map((mode) => {
          const Icon = mode.icon;
          const isActive = mode.id === currentMode;
          
          // Admin users get advocaat submenu with impersonation selector
          if (mode.id === 'advocaat' && isAdmin) {
            return (
              <DropdownMenuSub key={mode.id}>
                <DropdownMenuSubTrigger
                  className={cn(
                    "flex items-center gap-3 cursor-pointer py-2.5",
                    isActive && "bg-muted"
                  )}
                >
                  <div className={cn("p-1.5 rounded", mode.bgColor)}>
                    <Icon className={cn("h-4 w-4", mode.color)} />
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className={cn("font-medium", isActive && "text-primary")}>
                      {mode.label} View
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Bekijk als advocaat
                    </span>
                  </div>
                  {isActive && (
                    <div className={cn("w-2 h-2 rounded-full", mode.color.replace('text-', 'bg-'))} />
                  )}
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="p-0 bg-background border shadow-lg">
                    <AdvocaatImpersonationSelector onSelect={() => setOpen(false)} />
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            );
          }

          return (
            <DropdownMenuItem
              key={mode.id}
              onClick={() => handleViewChange(mode)}
              className={cn(
                "flex items-center gap-3 cursor-pointer py-2.5",
                isActive && "bg-muted"
              )}
            >
              <div className={cn("p-1.5 rounded", mode.bgColor)}>
                <Icon className={cn("h-4 w-4", mode.color)} />
              </div>
              <div className="flex flex-col">
                <span className={cn("font-medium", isActive && "text-primary")}>
                  {mode.label} View
                </span>
                <span className="text-xs text-muted-foreground">
                  {mode.description}
                </span>
              </div>
              {isActive && (
                <div className={cn("ml-auto w-2 h-2 rounded-full", mode.color.replace('text-', 'bg-'))} />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
