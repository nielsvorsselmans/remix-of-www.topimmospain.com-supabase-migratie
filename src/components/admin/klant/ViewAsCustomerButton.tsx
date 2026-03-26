import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ViewAsCustomerButtonProps {
  crmLeadId: string;
  firstName?: string | null;
  lastName?: string | null;
}

export function ViewAsCustomerButton({ crmLeadId, firstName, lastName }: ViewAsCustomerButtonProps) {
  const navigate = useNavigate();

  const handleViewAsCustomer = () => {
    // Navigate to dashboard with preview parameter
    // This keeps admin logged in and uses admin rights to view customer data
    navigate(`/dashboard?preview_crm_lead_id=${crmLeadId}`);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleViewAsCustomer}
    >
      <Eye className="h-4 w-4 mr-1" />
      Bekijk als Klant
    </Button>
  );
}
