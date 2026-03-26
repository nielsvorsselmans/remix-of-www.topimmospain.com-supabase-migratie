import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OTPLoginForm } from "@/components/auth/OTPLoginForm";

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, rolesLoaded, isAdmin, isPartner, isAdvocaat } = useAuth();

  const emailParam = searchParams.get("email") || "";

  useEffect(() => {
    if (user && rolesLoaded) {
      if (isAdmin) {
        navigate("/admin/customers");
      } else if (isPartner) {
        navigate("/partner/dashboard");
      } else if (isAdvocaat) {
        navigate("/advocaat/dashboard");
      } else {
        navigate("/dashboard");
      }
    }

    // Check for partner_invite parameter in URL
    const partnerInvite = searchParams.get("partner_invite");
    if (partnerInvite) {
      localStorage.setItem("partner_invite_code", partnerInvite);
    }
  }, [user, rolesLoaded, isAdmin, isPartner, isAdvocaat, navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Oriëntatie Portaal</CardTitle>
          <CardDescription>
            Voer je e-mailadres in om toegang te krijgen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OTPLoginForm 
            defaultEmail={emailParam}
            redirectUrl={`${window.location.origin}/dashboard`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
