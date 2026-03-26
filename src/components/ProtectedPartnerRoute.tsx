import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedPartnerRouteProps {
  children: React.ReactNode;
}

export function ProtectedPartnerRoute({ children }: ProtectedPartnerRouteProps) {
  const { user, isPartner, isAdmin, loading, rolesLoaded } = useAuth();

  // Wacht tot authenticatie en rollen zijn geladen
  if (loading || !rolesLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Niet ingelogd → redirect naar login
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Geen partner of admin rol → redirect naar dashboard
  if (!isPartner && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
