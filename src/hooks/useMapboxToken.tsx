import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const CACHE_KEY = 'mapbox_token';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface TokenCache {
  token: string;
  timestamp: number;
}

export const useMapboxToken = () => {
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getToken = async () => {
      try {
        // Check cache first
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { token: cachedToken, timestamp }: TokenCache = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            console.log('[useMapboxToken] Using cached token');
            setToken(cachedToken);
            setLoading(false);
            return;
          }
        }

        // Fetch new token
        console.log('[useMapboxToken] Fetching new token');
        const { data, error: tokenError } = await supabase.functions.invoke('get-mapbox-token');
        
        if (tokenError) {
          throw tokenError;
        }

        if (data?.token) {
          // Cache the token
          const cacheData: TokenCache = {
            token: data.token,
            timestamp: Date.now()
          };
          localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
          console.log('[useMapboxToken] Token cached for 24 hours');
          
          setToken(data.token);
        } else {
          throw new Error('No token received');
        }
      } catch (err) {
        console.error('[useMapboxToken] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch Mapbox token');
      } finally {
        setLoading(false);
      }
    };

    getToken();
  }, []);

  return { token, loading, error };
};
