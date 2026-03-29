import { trackClarityEvent } from './clarity';
import { trackGAEvent, trackConversion } from './gtag';
import { supabase } from '@/integrations/supabase/client';

const VISITOR_STORAGE_KEY = "viva_visitor_id";
const USER_ID_STORAGE_KEY = "viva_user_id";
const SESSION_START_KEY = "viva_session_start";
const GHL_CONTACT_ID_KEY = "viva_ghl_contact_id";
const CRM_REGISTERED_KEY = "viva_crm_registered_session";

// ============================================================
// Debug logging - only logs when localStorage viva_debug=true
// ============================================================
function debugLog(...args: any[]): void {
  try {
    if (typeof window !== 'undefined' && localStorage.getItem('viva_debug') === 'true') {
      console.log(...args);
    }
  } catch {
    // Silently ignore - localStorage may be unavailable
  }
}

// ============================================================
// Environment detection
// ============================================================
function isPreviewEnvironment(): boolean {
  if (typeof window === 'undefined') return true;
  
  const hostname = window.location.hostname;
  const previewDomains = [
    'lovableproject.com',
    'localhost',
    '127.0.0.1',
  ];
  
  return previewDomains.some(domain => hostname.includes(domain));
}

// ============================================================
// Cookie consent
// ============================================================
const COOKIE_CONSENT_KEY = "viva_cookie_consent";

export type CookieConsent = "accepted" | "declined" | null;

export function getCookieConsent(): CookieConsent {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(COOKIE_CONSENT_KEY) as CookieConsent;
}

export function setCookieConsent(consent: "accepted" | "declined"): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(COOKIE_CONSENT_KEY, consent);
  
  if (consent === "declined") {
    localStorage.removeItem(VISITOR_STORAGE_KEY);
  }
}

export function hasConsentChoice(): boolean {
  return getCookieConsent() !== null;
}

// ============================================================
// CRM Tracking - Independent of Cookie Consent
// ============================================================
async function ensureCRMVisitorRegistered(): Promise<void> {
  if (isPreviewEnvironment()) {
    debugLog('[CRM] Skipped CRM tracking - preview environment detected');
    return;
  }
  
  const ghlContactId = getGHLContactId();
  if (!ghlContactId) return;

  const registeredGhlId = sessionStorage.getItem(CRM_REGISTERED_KEY);
  if (registeredGhlId === ghlContactId) {
    debugLog('[CRM] Already registered this session, skipping');
    return;
  }

  try {
    const utmParams = getUTMParams();
    const visitorId = getOrCreateVisitorId();
    
    debugLog('[CRM] Registering CRM visitor:', ghlContactId);
    
    await supabase.functions.invoke('register-crm-visitor', {
      body: {
        ghl_contact_id: ghlContactId,
        visitor_id: visitorId,
        utm_source: utmParams.utm_source,
        utm_medium: utmParams.utm_medium,
        utm_campaign: utmParams.utm_campaign,
      },
    });

    sessionStorage.setItem(CRM_REGISTERED_KEY, ghlContactId);
    debugLog('[CRM] Successfully registered CRM visitor:', ghlContactId);
  } catch (error) {
    console.error('[CRM] Registration error:', error);
  }
}

// Anonymous session tracking - disabled
function trackAnonymousSession(): void {
  debugLog('[Tracking] Anonymous session tracking disabled (not in allowlist)');
}

// ============================================================
// Page view state
// ============================================================
let currentPageViewId: string | null = null;
let pageViewStartTime: number | null = null;

// Deferred finalize: store previous page view data to send with next batch
interface DeferredFinalize {
  event_id: string;
  time_spent_seconds: number;
  session_end: string;
}
let pendingFinalize: DeferredFinalize | null = null;

// ============================================================
// Finalize page view - deferred (sends with next batch, not separate call)
// ============================================================
export async function finalizePageView(): Promise<void> {
  if (isPreviewEnvironment()) return;
  
  const pageViewId = currentPageViewId;
  const startTime = pageViewStartTime;
  
  // Reset state immediately
  currentPageViewId = null;
  pageViewStartTime = null;
  
  if (pageViewId && startTime) {
    const timeSpentSeconds = Math.floor((Date.now() - startTime) / 1000);
    
    debugLog('[Tracking] Deferring page view finalize:', {
      pageViewId: pageViewId.substring(0, 8) + '...',
      timeSpentSeconds,
    });
    
    // Store for next batch flush instead of making a separate edge function call
    pendingFinalize = {
      event_id: pageViewId,
      time_spent_seconds: timeSpentSeconds,
      session_end: new Date().toISOString(),
    };
  }
}

// sendBeacon-based finalize for beforeunload (last chance - must be direct)
function finalizePageViewBeacon(): void {
  if (isPreviewEnvironment()) return;
  
  const pageViewId = currentPageViewId;
  const startTime = pageViewStartTime;
  
  // Also include any pending finalize from previous page
  const finalizes: DeferredFinalize[] = [];
  
  if (pendingFinalize) {
    finalizes.push(pendingFinalize);
    pendingFinalize = null;
  }
  
  if (pageViewId && startTime) {
    const timeSpentSeconds = Math.floor((Date.now() - startTime) / 1000);
    finalizes.push({
      event_id: pageViewId,
      time_spent_seconds: timeSpentSeconds,
      session_end: new Date().toISOString(),
    });
  }
  
  if (finalizes.length === 0) return;
  
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-track`;
  const body = JSON.stringify({ deferred_updates: finalizes });
  
  // navigator.sendBeacon doesn't support custom headers, so we use fetch keepalive
  try {
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body,
      keepalive: true,
    }).catch(() => {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    });
  } catch {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon(url, blob);
  }
  
  debugLog('[Tracking] Sent finalize beacon for', finalizes.length, 'page views');
}

// ============================================================
// Event batching queue
// ============================================================
interface TrackingPayload {
  event_id: string;
  event_name: string;
  visitor_id: string;
  user_id: string | null;
  partner_id: string | null;
  site: string;
  path: string;
  full_url: string;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  ghl_contact_id: string | null;
  event_params: Record<string, any>;
  device_type: string;
  browser: string;
  browser_version: string | null;
  os: string;
  os_version: string | null;
  screen_width: number;
  screen_height: number;
  locale: string | null;
}

let eventQueue: TrackingPayload[] = [];
let flushInterval: number | null = null;

let flushRetryCount = 0;
const MAX_FLUSH_RETRIES = 2;

async function flushQueue(): Promise<void> {
  if (eventQueue.length === 0 && !pendingFinalize) return;
  
  const batch = [...eventQueue];
  const deferredUpdates: DeferredFinalize[] = [];
  
  // Include any pending finalize in this batch
  if (pendingFinalize) {
    deferredUpdates.push(pendingFinalize);
    pendingFinalize = null;
  }
  
  debugLog('[Tracking] Flushing event queue:', batch.length, 'events,', deferredUpdates.length, 'deferred updates');
  
  try {
    const body: any = {};
    if (batch.length > 0) body.batch = batch;
    if (deferredUpdates.length > 0) body.deferred_updates = deferredUpdates;
    
    const { error } = await supabase.functions.invoke('api-track', {
      body,
    });
    
    if (error) {
      console.error('[Tracking] Batch send error:', error);
      if (flushRetryCount < MAX_FLUSH_RETRIES) {
        flushRetryCount++;
        eventQueue.unshift(...batch);
        debugLog('[Tracking] Batch requeued for retry:', flushRetryCount, '/', MAX_FLUSH_RETRIES);
      } else {
        console.error('[Tracking] Batch dropped after', MAX_FLUSH_RETRIES, 'retries');
        flushRetryCount = 0;
      }
      return;
    }
    
    eventQueue = eventQueue.filter(e => !batch.includes(e));
    flushRetryCount = 0;
    debugLog('[Tracking] Batch sent successfully:', batch.length, 'events');
  } catch (error) {
    console.error('[Tracking] Batch network error:', error);
    if (flushRetryCount < MAX_FLUSH_RETRIES) {
      flushRetryCount++;
      eventQueue.unshift(...batch);
      debugLog('[Tracking] Batch requeued for retry:', flushRetryCount, '/', MAX_FLUSH_RETRIES);
    } else {
      console.error('[Tracking] Batch dropped after', MAX_FLUSH_RETRIES, 'retries');
      flushRetryCount = 0;
    }
  }
}

function flushQueueBeacon(): void {
  if (eventQueue.length === 0) return;
  
  const batch = [...eventQueue];
  eventQueue = [];
  
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-track`;
  const body = JSON.stringify({ batch });
  
  try {
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body,
      keepalive: true,
    }).catch(() => {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    });
  } catch {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon(url, blob);
  }
}

// Start flush interval
function startFlushInterval(): void {
  if (flushInterval) return;
  flushInterval = window.setInterval(flushQueue, 30000);
}

// ============================================================
// beforeunload handler: finalize + flush queue
// ============================================================
if (typeof window !== 'undefined' && !isPreviewEnvironment()) {
  window.addEventListener('beforeunload', () => {
    finalizePageViewBeacon();
    flushQueueBeacon();
  });
  
  // Start the batch flush interval
  startFlushInterval();
}

// ============================================================
// Utility functions
// ============================================================
function generateUUID(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

function getStoredPartnerId(): string | null {
  return localStorage.getItem('viva_referred_by_partner');
}

function getStoredUserId(): string | null {
  return localStorage.getItem(USER_ID_STORAGE_KEY);
}

export function getOrCreateVisitorId(): string {
  let visitorId = localStorage.getItem(VISITOR_STORAGE_KEY);
  
  if (!visitorId) {
    visitorId = generateUUID();
    localStorage.setItem(VISITOR_STORAGE_KEY, visitorId);
    debugLog('[Tracking] Generated new visitor ID:', visitorId.substring(0, 8) + '...');
  } else {
    debugLog('[Tracking] Using existing visitor ID:', visitorId.substring(0, 8) + '...');
  }
  
  return visitorId;
}

function getOrCreateSessionStart(): number {
  let sessionStart = sessionStorage.getItem(SESSION_START_KEY);
  if (!sessionStart) {
    sessionStart = Date.now().toString();
    sessionStorage.setItem(SESSION_START_KEY, sessionStart);
  }
  return parseInt(sessionStart, 10);
}

function getGHLContactId(): string | null {
  const SESSION_CACHE_KEY = 'viva_ghl_contact_cached';
  
  // Check sessionStorage cache first
  try {
    const cached = sessionStorage.getItem(SESSION_CACHE_KEY);
    if (cached) return cached === '__null__' ? null : cached;
  } catch {
    // Ignore
  }
  
  // Check URL for fresh crm_id
  const urlCrmId = new URLSearchParams(window.location.search).get('crm_id');
  
  if (urlCrmId) {
    localStorage.setItem(GHL_CONTACT_ID_KEY, urlCrmId);
    sessionStorage.setItem(SESSION_CACHE_KEY, urlCrmId);
    debugLog('[CRM] Stored GHL contact ID:', urlCrmId);
    return urlCrmId;
  }
  
  // Fall back to localStorage
  const storedGhlId = localStorage.getItem(GHL_CONTACT_ID_KEY);
  sessionStorage.setItem(SESSION_CACHE_KEY, storedGhlId || '__null__');
  if (storedGhlId) {
    debugLog('[CRM] Using stored GHL contact ID:', storedGhlId);
  }
  return storedGhlId;
}

// ============================================================
// Cached UTM params (persisted in sessionStorage)
// ============================================================
function getUTMParams(): { utm_source: string | null; utm_medium: string | null; utm_campaign: string | null } {
  const CACHE_KEY = 'viva_utm_params';
  
  // Quick check: only parse URL if it actually contains utm_ params
  if (window.location.search.includes('utm_')) {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = {
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
    };
    
    if (fromUrl.utm_source || fromUrl.utm_medium || fromUrl.utm_campaign) {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(fromUrl));
      return fromUrl;
    }
  }
  
  // Return cached version (from landing page)
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Ignore parse errors
  }
  
  return { utm_source: null, utm_medium: null, utm_campaign: null };
}

// ============================================================
// Cached device info (persisted in sessionStorage)
// ============================================================
function getDeviceInfo() {
  const CACHE_KEY = 'viva_device_info';
  
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Ignore parse errors
  }
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  let deviceType = 'desktop';
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
    deviceType = 'tablet';
  } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent)) {
    deviceType = 'mobile';
  }
  
  let browser = 'Unknown';
  let browserVersion = '';
  if (userAgent.includes('firefox')) {
    browser = 'Firefox';
    browserVersion = userAgent.match(/firefox\/([\d.]+)/)?.[1] || '';
  } else if (userAgent.includes('edg')) {
    browser = 'Edge';
    browserVersion = userAgent.match(/edg\/([\d.]+)/)?.[1] || '';
  } else if (userAgent.includes('chrome')) {
    browser = 'Chrome';
    browserVersion = userAgent.match(/chrome\/([\d.]+)/)?.[1] || '';
  } else if (userAgent.includes('safari')) {
    browser = 'Safari';
    browserVersion = userAgent.match(/version\/([\d.]+)/)?.[1] || '';
  }
  
  let os = 'Unknown';
  let osVersion = '';
  if (userAgent.includes('windows')) {
    os = 'Windows';
  } else if (userAgent.includes('mac')) {
    os = 'macOS';
  } else if (userAgent.includes('linux')) {
    os = 'Linux';
  } else if (userAgent.includes('android')) {
    os = 'Android';
    osVersion = userAgent.match(/android ([\d.]+)/)?.[1] || '';
  } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
    os = 'iOS';
    osVersion = userAgent.match(/os ([\d_]+)/)?.[1]?.replace(/_/g, '.') || '';
  }
  
  const info = {
    device_type: deviceType,
    browser: browser,
    browser_version: browserVersion || null,
    os: os,
    os_version: osVersion || null,
    screen_width: window.screen.width,
    screen_height: window.screen.height,
    locale: navigator.language || null,
  };
  
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(info));
  return info;
}

// ============================================================
// Page context extraction
// ============================================================
function extractPageContext(): Record<string, any> {
  const path = window.location.pathname;
  const context: Record<string, any> = {};
  
  const projectMatch = path.match(/^\/projecten\/([a-f0-9-]+)$/);
  if (projectMatch) {
    context.page_type = 'project_detail';
    context.project_id = projectMatch[1];
  }
  
  const blogMatch = path.match(/^\/blog\/(.+)$/);
  if (blogMatch) {
    context.page_type = 'blog_post';
    context.blog_post_slug = blogMatch[1];
  }
  
  const storyMatch = path.match(/^\/klantverhalen\/(.+)$/);
  if (storyMatch) {
    context.page_type = 'customer_story';
    context.story_slug = storyMatch[1];
  }
  
  const municipalityMatch = path.match(/^\/projecten\/gemeente\/(.+)$/);
  if (municipalityMatch) {
    context.page_type = 'municipality';
    context.city = decodeURIComponent(municipalityMatch[1]);
  }
  
  const partnerMatch = path.match(/^\/partners\/(.+)$/);
  if (partnerMatch) {
    context.page_type = 'partner_detail';
    context.partner_slug = partnerMatch[1];
  }
  
  const lpProjectMatch = path.match(/^\/lp\/project\/([a-f0-9-]+)$/);
  if (lpProjectMatch) {
    context.page_type = 'project_landing_page';
    context.project_id = lpProjectMatch[1];
    context.is_landing_page = true;
  }
  
  if (path === '/projecten' || path === '/projecten/') {
    context.page_type = 'projects_overview';
  }
  
  if (path === '/blog' || path === '/blog/') {
    context.page_type = 'blog_overview';
  }
  
  if (path === '/portaal' || path === '/portaal/') {
    context.page_type = 'portal';
  }
  
  if (path === '/' || path === '') {
    context.page_type = 'homepage';
  }
  
  return context;
}

// ============================================================
// trackPageView - batched (no longer direct call)
// ============================================================
export async function trackPageView(): Promise<void> {
  if (isPreviewEnvironment()) {
    debugLog('[Tracking] Skipped page view - preview environment detected');
    return;
  }
  
  // CRM Tracking (always active)
  await ensureCRMVisitorRegistered();

  if (getCookieConsent() === "declined") {
    debugLog('[Tracking] Cookie tracking disabled - collecting anonymous stats only');
    trackAnonymousSession();
    return;
  }
  
  const visitorId = getOrCreateVisitorId();
  const ghlContactId = getGHLContactId();
  const { utm_source, utm_medium, utm_campaign } = getUTMParams();
  const deviceInfo = getDeviceInfo();
  const pageContext = extractPageContext();
  const partnerId = getStoredPartnerId();

  // Generate page view ID client-side so finalizePageView still works
  const pageViewEventId = generateUUID();
  currentPageViewId = pageViewEventId;
  pageViewStartTime = Date.now();

  const payload: TrackingPayload = {
    event_id: pageViewEventId,
    event_name: "page_view",
    visitor_id: visitorId,
    user_id: getStoredUserId(),
    partner_id: partnerId,
    site: "website",
    path: window.location.pathname,
    full_url: window.location.href,
    referrer: document.referrer || null,
    utm_source,
    utm_medium,
    utm_campaign,
    ghl_contact_id: ghlContactId,
    event_params: pageContext,
    ...deviceInfo,
  };

  debugLog('[Tracking] Queueing page view:', { path: window.location.pathname, eventId: pageViewEventId.substring(0, 8) + '...' });
  
  // Push to batch queue (will be sent with next flush)
  eventQueue.push(payload);
}

// ============================================================
// trackEvent - queued for batch sending (Clarity + GA still direct)
// ============================================================
export async function trackEvent(eventName: string, eventParams: Record<string, any> = {}): Promise<void> {
  if (isPreviewEnvironment()) {
    debugLog('[Tracking] Skipped event - preview environment detected');
    return;
  }
  
  if (getCookieConsent() === "declined") {
    debugLog('[Tracking] Event tracking disabled - user declined cookies');
    return;
  }
  
  const visitorId = getOrCreateVisitorId();
  const ghlContactId = getGHLContactId();
  const { utm_source, utm_medium, utm_campaign } = getUTMParams();
  const deviceInfo = getDeviceInfo();
  const partnerId = getStoredPartnerId();

  const payload: TrackingPayload = {
    event_id: generateUUID(),
    event_name: eventName,
    visitor_id: visitorId,
    user_id: getStoredUserId(),
    partner_id: partnerId,
    site: "website",
    path: window.location.pathname,
    full_url: window.location.href,
    referrer: document.referrer || null,
    utm_source,
    utm_medium,
    utm_campaign,
    ghl_contact_id: ghlContactId,
    event_params: eventParams,
    ...deviceInfo,
  };

  debugLog('[Tracking] Queueing event:', eventName);
  
  // Send to Clarity & GA immediately (client-side only, no cost)
  try {
    trackClarityEvent(eventName, eventParams);
    sendToGoogleAnalytics(eventName, eventParams);
  } catch (error) {
    console.warn('[Tracking] Clarity/GA error:', error);
  }
  
  // Only send core events to database; micro-events stay in Clarity/GA only
  const DB_ALLOWED_EVENTS = [
    'page_view',
    'project_view',
    'project_favorited',
    'project_unfavorited',
    'filter_applied',
    'calculator_used',
    'appointment_booked',
    'contact_form_submitted',
    'info_evening_registration',
    'webinar_registration',
  ];
  
  if (!DB_ALLOWED_EVENTS.includes(eventName)) {
    debugLog('[Tracking] Event only sent to Clarity/GA (not in DB allowlist):', eventName);
    return;
  }
  
  // Push to batch queue for database
  eventQueue.push(payload);
}

// ============================================================
// Google Analytics event mapping
// ============================================================
function sendToGoogleAnalytics(eventName: string, eventParams: Record<string, any>) {
  switch (eventName) {
    case 'project_view':
      trackConversion('view_item', {
        item_id: eventParams.project_id,
        item_name: eventParams.project_name,
        item_category: 'project',
      });
      break;
    
    case 'project_favorited':
      trackConversion('add_to_wishlist', {
        item_id: eventParams.project_id,
        item_name: eventParams.project_name,
      });
      break;
    
    case 'appointment_booked':
      trackConversion('generate_lead', {
        value: 1,
        currency: 'EUR',
      });
      break;
    
    case 'calculator_used':
      trackGAEvent('calculator_interaction', 'engagement', eventParams.calculator_type);
      break;
    
    case 'blog_post_view':
      trackGAEvent('blog_view', 'content', eventParams.slug);
      break;
    
    case 'filter_applied':
      trackGAEvent('filter_applied', 'search', eventParams.filter_type);
      break;
    
    default:
      trackGAEvent(eventName, 'engagement', JSON.stringify(eventParams));
  }
}
