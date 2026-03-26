import { Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdvocaat } from '@/contexts/AdvocaatContext';
import { useNavigate } from 'react-router-dom';

export function AdvocaatImpersonationBanner() {
  const { impersonatedAdvocaat, isImpersonating, exitImpersonation } = useAdvocaat();
  const navigate = useNavigate();

  if (!isImpersonating || !impersonatedAdvocaat) return null;

  const handleExit = () => {
    exitImpersonation();
    navigate('/admin');
  };

  return (
    <div className="bg-purple-500 text-white px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4" />
        <span className="text-sm font-medium">
          Je bekijkt het portaal als: <strong>{impersonatedAdvocaat.name}</strong>
          {impersonatedAdvocaat.company ? ` (${impersonatedAdvocaat.company})` : ''}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleExit}
        className="h-7 text-white hover:bg-purple-600 hover:text-white"
      >
        <X className="h-4 w-4 mr-1" />
        Stop bekijken
      </Button>
    </div>
  );
}
