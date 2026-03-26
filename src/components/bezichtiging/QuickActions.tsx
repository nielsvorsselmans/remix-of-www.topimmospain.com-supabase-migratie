import { Map, FileText, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface QuickActionsProps {
  hasViewings: boolean;
}

export function QuickActions({ hasViewings }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Button 
        variant="outline" 
        asChild 
        className="flex flex-col h-auto py-4 gap-2"
        disabled={!hasViewings}
      >
        <Link to="/dashboard/bezichtiging#viewings">
          <Map className="h-5 w-5 text-primary" />
          <span className="text-xs font-medium">Bekijk kaart</span>
        </Link>
      </Button>

      <Button 
        variant="outline" 
        asChild 
        className="flex flex-col h-auto py-4 gap-2"
      >
        <Link to="/dashboard/documenten">
          <FileText className="h-5 w-5 text-primary" />
          <span className="text-xs font-medium">Documenten</span>
        </Link>
      </Button>

      <Button 
        variant="outline" 
        asChild 
        className="flex flex-col h-auto py-4 gap-2"
      >
        <Link to="/dashboard/contact">
          <Phone className="h-5 w-5 text-primary" />
          <span className="text-xs font-medium">Contact</span>
        </Link>
      </Button>
    </div>
  );
}
