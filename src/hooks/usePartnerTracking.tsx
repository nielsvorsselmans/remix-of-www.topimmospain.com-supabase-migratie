import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePartner } from '@/contexts/PartnerContext';

const PARTNER_STORAGE_KEY = 'viva_referred_by_partner';

export function usePartnerTracking() {
  const [searchParams] = useSearchParams();
  const { currentPartner, setCurrentPartner } = usePartner();

  useEffect(() => {
    const partnerParam = searchParams.get('partner');
    
    // Fallback: if no ?partner= but utm_source=partner + utm_campaign exists, use campaign as partner identifier
    const utmSource = searchParams.get('utm_source');
    const utmCampaign = searchParams.get('utm_campaign');
    const effectivePartner = partnerParam || (utmSource === 'partner' && utmCampaign ? utmCampaign : null);
    
    if (effectivePartner) {
      registerPartnerVisitor(effectivePartner);
      return;
    }

    // Check localStorage for previously detected partner
    const storedPartnerId = localStorage.getItem(PARTNER_STORAGE_KEY);
    if (storedPartnerId && !currentPartner) {
      loadPartnerFromStorage(storedPartnerId);
    }
  }, [searchParams, currentPartner]);

  // Page views are now tracked server-side via tracking_events pipeline
  // No client-side counter needed

  const loadPartnerFromStorage = async (partnerId: string) => {
    try {
      const { data: partner, error } = await supabase
        .from('partners')
        .select('*')
        .eq('id', partnerId)
        .single();

      if (!error && partner) {
        setCurrentPartner(partner);
        console.log('Loaded stored partner:', partner.name);
      }
    } catch (error) {
      console.error('Error loading partner from storage:', error);
    }
  };

  const registerPartnerVisitor = async (partnerIdentifier: string) => {
    try {
      let visitorId = localStorage.getItem('viva_visitor_id');
      if (!visitorId) {
        visitorId = generateUUID();
        localStorage.setItem('viva_visitor_id', visitorId);
      }

      const { data: partner, error: partnerError } = await supabase
        .from('partners')
        .select('*')
        .or(`referral_code.eq.${partnerIdentifier},slug.eq.${partnerIdentifier}`)
        .single();

      if (partnerError || !partner) {
        console.error('Partner not found:', partnerIdentifier);
        return;
      }

      setCurrentPartner(partner);
      localStorage.setItem(PARTNER_STORAGE_KEY, partner.id);

      const utmSource = searchParams.get('utm_source');
      const utmMedium = searchParams.get('utm_medium');
      const utmCampaign = searchParams.get('utm_campaign');

      const { error: trackError } = await supabase.functions.invoke('register-partner-visitor', {
        body: {
          partner_id: partner.id,
          visitor_id: visitorId,
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          landing_page: window.location.pathname + window.location.search,
        },
      });

      if (trackError) {
        console.error('Error tracking partner visitor:', trackError);
      } else {
        console.log('Partner visitor tracked successfully:', partner.name);
      }

    } catch (error) {
      console.error('Error in registerPartnerVisitor:', error);
    }
  };

  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  return { currentPartner };
}
