import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * Context-aware back link for blog pages accessed from the dashboard.
 * Only shows for logged-in users, providing a quick path back to the Ontdekken page.
 */
export function DashboardBackLink() {
  const { user } = useAuth();
  
  if (!user) return null;
  
  return (
    <div className="bg-primary/5 border-b border-primary/20">
      <div className="container max-w-5xl mx-auto px-4 py-3">
        <Link 
          to="/dashboard/ontdekken" 
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Terug naar Ontdekken
        </Link>
      </div>
    </div>
  );
}
