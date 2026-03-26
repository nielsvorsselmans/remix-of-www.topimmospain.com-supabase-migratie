import { Home, Compass, FolderOpen, Plane, Building, Building2 } from "lucide-react";
import { useUserJourneyPhase } from "@/hooks/useUserJourneyPhase";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { NavLink as RouterNavLink } from "react-router-dom";

interface TabItem {
  title: string;
  url: string;
  icon: React.ElementType;
  badge?: number;
  end?: boolean;
}

function getBottomTabs(phase: string, hasSale: boolean): TabItem[] {
  const allTabs: (TabItem & { visible: boolean })[] = [
    { title: "Overzicht", url: "/dashboard", icon: Home, end: true, visible: true },
    { title: "Ontdekken", url: "/dashboard/ontdekken", icon: Compass, visible: true },
    { title: "Aanbod", url: "/dashboard/aanbod", icon: Building2, visible: true },
    { title: "Selectie", url: "/dashboard/projecten", icon: FolderOpen, visible: phase !== 'orientatie' },
    { title: "Reis", url: "/dashboard/bezichtiging", icon: Plane, visible: phase === 'bezichtiging' },
    { title: "Woning", url: "/dashboard/mijn-woning", icon: Building, visible: ['aankoop', 'overdracht', 'beheer'].includes(phase) || hasSale },
  ];

  return allTabs.filter(t => t.visible).slice(0, 5);
}

export function MobileBottomNav() {
  const { phase, hasSale, isLoading } = useUserJourneyPhase();

  if (isLoading) return null;

  const tabs = getBottomTabs(phase, hasSale);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => (
          <RouterNavLink
            key={tab.url}
            to={tab.url}
            end={tab.end}
            className={({ isActive }) =>
              cn("flex flex-col items-center justify-center flex-1 h-full transition-colors")
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <tab.icon className={cn(
                    "h-5 w-5 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )} />
                  {tab.badge && tab.badge > 0 && (
                    <Badge 
                      className="absolute -top-2 -right-2 h-4 min-w-4 p-0 flex items-center justify-center text-[10px]"
                    >
                      {tab.badge}
                    </Badge>
                  )}
                </div>
                <span className={cn(
                  "text-[10px] mt-1 font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {tab.title}
                </span>
              </>
            )}
          </RouterNavLink>
        ))}
      </div>
    </nav>
  );
}
