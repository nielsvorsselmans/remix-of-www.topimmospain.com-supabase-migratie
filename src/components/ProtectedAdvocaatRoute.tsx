import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedAdvocaatRouteProps {
  children: React.ReactNode;
}

export function ProtectedAdvocaatRoute({ children }: ProtectedAdvocaatRouteProps) {
  const { user, isAdvocaat, isAdmin, loading, rolesLoaded } = useAuth();

  if (loading || !rolesLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdvocaat && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
