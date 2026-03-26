import { useState } from "react";
import { Shield, User, Handshake, ChevronDown, ChevronRight, Scale } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
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
import { PartnerImpersonationSelector } from "./PartnerImpersonationSelector";
import { AdvocaatImpersonationSelector } from "./AdvocaatImpersonationSelector";

export type ViewMode = 'admin' | 'customer' | 'partner' | 'advocaat';

interface ViewModeConfig {
  id: ViewMode;
  label: string;
  icon: typeof Shield;
  path: string;
  color: string;
  bgColor: string;
}

const viewModes: ViewModeConfig[] = [
  { 
    id: 'admin', 
    label: 'Admin', 
    icon: Shield, 
    path: '/admin/customers',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  { 
    id: 'customer', 
    label: 'Klant', 
    icon: User, 
    path: '/dashboard',
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  { 
    id: 'partner', 
    label: 'Partner', 
    icon: Handshake, 
    path: '/partner/dashboard',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
  },
  { 
    id: 'advocaat', 
    label: 'Advocaat', 
    icon: Scale, 
    path: '/advocaat/dashboard',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
];

function getCurrentViewMode(pathname: string): ViewMode {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/partner')) return 'partner';
  if (pathname.startsWith('/advocaat')) return 'advocaat';
  return 'customer';
}

export function ViewModeSwitcher() {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  
  // Only show for admins
  if (!isAdmin) return null;
  
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
          
          if (mode.id === 'partner') {
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
                      Bekijk als partner
                    </span>
                  </div>
                  {isActive && (
                    <div className={cn("w-2 h-2 rounded-full", mode.color.replace('text-', 'bg-'))} />
                  )}
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="p-0 bg-background border shadow-lg">
                    <PartnerImpersonationSelector onSelect={() => setOpen(false)} />
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            );
          }
          
          if (mode.id === 'advocaat') {
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
                  {mode.id === 'admin' && 'Beheer alles'}
                  {mode.id === 'customer' && 'Bekijk als klant'}
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

// Compact version for mobile or smaller spaces
export function ViewModeSwitcherCompact() {
  const { isAdmin } = useAuth();
  const location = useLocation();
  
  if (!isAdmin) return null;
  
  const currentMode = getCurrentViewMode(location.pathname);
  const currentConfig = viewModes.find(m => m.id === currentMode) || viewModes[0];
  const CurrentIcon = currentConfig.icon;

  const handleViewChange = (mode: ViewModeConfig) => {
    window.location.href = mode.path;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className={cn(
            "h-8 w-8 rounded-full",
            currentConfig.bgColor
          )}
        >
          <CurrentIcon className={cn("h-4 w-4", currentConfig.color)} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 bg-background border shadow-lg z-50">
        {viewModes.map((mode) => {
          const Icon = mode.icon;
          const isActive = mode.id === currentMode;
          
          return (
            <DropdownMenuItem
              key={mode.id}
              onClick={() => handleViewChange(mode)}
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                isActive && "bg-muted"
              )}
            >
              <Icon className={cn("h-4 w-4", mode.color)} />
              <span>{mode.label}</span>
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
