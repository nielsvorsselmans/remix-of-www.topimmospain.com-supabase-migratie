import React from 'react';
import { Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePartner } from '@/contexts/PartnerContext';
import { useNavigate } from 'react-router-dom';

export function PartnerImpersonationBanner() {
  const { impersonatedPartner, isImpersonating, exitImpersonation } = usePartner();
  const navigate = useNavigate();

  if (!isImpersonating || !impersonatedPartner) {
    return null;
  }

  const handleExit = () => {
    exitImpersonation();
    navigate('/admin');
  };

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4" />
        <span className="text-sm font-medium">
          Je bekijkt het portaal als: <strong>{impersonatedPartner.name}</strong> ({impersonatedPartner.company})
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleExit}
        className="h-7 text-amber-950 hover:bg-amber-600 hover:text-amber-950"
      >
        <X className="h-4 w-4 mr-1" />
        Stop bekijken
      </Button>
    </div>
  );
}
