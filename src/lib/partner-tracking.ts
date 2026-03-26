/**
 * Helper functions for partner tracking across lead magnets
 * This module provides utilities to easily integrate partner tracking into any lead magnet form
 */

const PARTNER_STORAGE_KEY = 'viva_referred_by_partner';
const VISITOR_STORAGE_KEY = 'viva_visitor_id';

/**
 * Get partner tracking data from localStorage
 * Use this when inserting a new lead/registration to include partner attribution
 */
export function getPartnerTrackingData(): {
  referred_by_partner_id: string | null;
  visitor_id: string | null;
} {
  if (typeof window === 'undefined') {
    return { referred_by_partner_id: null, visitor_id: null };
  }
  
  return {
    referred_by_partner_id: localStorage.getItem(PARTNER_STORAGE_KEY) || null,
    visitor_id: localStorage.getItem(VISITOR_STORAGE_KEY) || null,
  };
}

/**
 * Check if current visitor was referred by a partner
 */
export function isPartnerReferred(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(PARTNER_STORAGE_KEY);
}

/**
 * Get the referring partner ID if available
 */
export function getReferringPartnerId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PARTNER_STORAGE_KEY);
}

/**
 * Get the current visitor ID
 */
export function getVisitorId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(VISITOR_STORAGE_KEY);
}
