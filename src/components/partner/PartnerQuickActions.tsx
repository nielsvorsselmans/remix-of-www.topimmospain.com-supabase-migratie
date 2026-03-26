import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Link2, Phone, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface PartnerQuickActionsProps {
  partnerId: string;
  referralCode: string;
  partnerSlug: string;
}

export function PartnerQuickActions({ partnerId, referralCode, partnerSlug }: PartnerQuickActionsProps) {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const referralLink = `${window.location.origin}/p/${partnerSlug}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success('Referral link gekopieerd!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Kon link niet kopiëren');
    }
  };

  const handleAddClient = () => {
    navigate('/partner/klanten', { state: { openAddDialog: true } });
  };

  const handleContactTopImmo = () => {
    window.location.href = 'mailto:info@topimmospain.com';
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={handleAddClient}
          >
            <UserPlus className="h-4 w-4" />
            Nieuwe Klant
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={handleCopyLink}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-600" />
                Gekopieerd!
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4" />
                Kopieer Referral Link
              </>
            )}
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={handleContactTopImmo}
          >
            <Phone className="h-4 w-4" />
            Contact Top Immo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
