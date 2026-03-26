import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BlogImportButtonProps {
  asDropdownItem?: boolean;
}

export function BlogImportButton({ asDropdownItem }: BlogImportButtonProps) {
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    setIsImporting(true);
    
    try {
      toast.info('Import gestart...', {
        description: 'Dit kan enkele seconden duren.'
      });

      const { data, error } = await supabase.functions.invoke('import-blog-posts');

      if (error) throw error;

      if (data?.success) {
        toast.success('Blog posts succesvol geïmporteerd!', {
          description: `${data.stats.successful} posts toegevoegd, ${data.stats.errors} fouten.`
        });
        
        // Refresh page after successful import
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        throw new Error(data?.error || 'Import failed');
      }
    } catch (error) {
      console.error('Error importing blog posts:', error);
      toast.error('Kon blog posts niet importeren', {
        description: 'Probeer het opnieuw of neem contact op met support.'
      });
    } finally {
      setIsImporting(false);
    }
  };

  if (asDropdownItem) {
    return (
      <DropdownMenuItem onClick={handleImport} disabled={isImporting}>
        {isImporting ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Download className="w-4 h-4 mr-2" />
        )}
        {isImporting ? "Importeren..." : "Importeer van Viva API"}
      </DropdownMenuItem>
    );
  }

  return (
    <Button
      onClick={handleImport}
      disabled={isImporting}
      variant="outline"
      className="gap-2"
    >
      {isImporting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Importeren...
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          Importeer van Viva API
        </>
      )}
    </Button>
  );
}
