import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from './ui/card';
import { MapPin } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import ReactMarkdown from 'react-markdown';

interface CityInfoProps {
  city: string;
  country?: string;
}

export function CityInfo({ city, country = 'Spanje' }: CityInfoProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState<string>('');

  useEffect(() => {
    const loadCityInfo = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: functionError } = await supabase.functions.invoke('generate-city-info', {
          body: { city, country }
        });

        if (functionError) {
          throw functionError;
        }

        if (data?.description) {
          setDescription(data.description);
          console.log(data.cached ? 'Loaded from cache' : 'Generated with AI');
        } else {
          throw new Error('Geen beschrijving ontvangen');
        }
      } catch (err) {
        console.error('Error loading city info:', err);
        setError('Kon geen informatie laden over deze locatie');
      } finally {
        setLoading(false);
      }
    };

    if (city) {
      loadCityInfo();
    }
  }, [city, country]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-48" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return null; // Silently fail - city info is nice-to-have, not critical
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-primary/10 p-2 rounded-full">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">
            Over {city}
          </h3>
        </div>
        
        <div className="text-muted-foreground leading-relaxed prose prose-sm max-w-none prose-headings:text-foreground prose-headings:font-semibold prose-headings:mb-3 prose-p:text-muted-foreground prose-p:mb-4 prose-strong:text-foreground prose-strong:font-semibold">
          <ReactMarkdown>{description}</ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}
