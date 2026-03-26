import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function Sitemap() {
  useEffect(() => {
    const fetchSitemap = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('generate-sitemap');
        
        if (error) throw error;
        
        // Replace current page with XML response
        document.open();
        document.write(data);
        document.close();
      } catch (error) {
        console.error('Error loading sitemap:', error);
        document.body.innerHTML = '<h1>Error loading sitemap</h1>';
      }
    };
    
    fetchSitemap();
  }, []);

  return <div>Loading sitemap...</div>;
}
