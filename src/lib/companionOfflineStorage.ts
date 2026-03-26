/**
 * Offline storage for the Viewing Companion.
 * IndexedDB for structured JSON data (trips, notes).
 * Cache API for binary assets (images, PDFs, static maps).
 */

const DB_NAME = "companion-offline";
const DB_VERSION = 1;
const TRIPS_STORE = "trips";
const NOTES_STORE = "notes";
const META_STORE = "meta";
const CACHE_NAME = "companion-assets-v1";

// ─── IndexedDB helpers ──────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(TRIPS_STORE)) {
        db.createObjectStore(TRIPS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(NOTES_STORE)) {
        const store = db.createObjectStore(NOTES_STORE, { keyPath: "id" });
        store.createIndex("trip_id", "trip_id", { unique: false });
        store.createIndex("pendingSync", "pendingSync", { unique: false });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ─── Trip data (enriched trip JSON) ─────────────────────────────────

export async function cacheTripData(tripId: string, data: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRIPS_STORE, "readwrite");
    tx.objectStore(TRIPS_STORE).put({ id: tripId, data, cachedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedTripData(tripId: string): Promise<any | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRIPS_STORE, "readonly");
    const req = tx.objectStore(TRIPS_STORE).get(tripId);
    req.onsuccess = () => resolve(req.result?.data || null);
    req.onerror = () => reject(req.error);
  });
}

// ─── Notes data ─────────────────────────────────────────────────────

export async function cacheNotes(tripId: string, notes: any[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NOTES_STORE, "readwrite");
    const store = tx.objectStore(NOTES_STORE);
    notes.forEach((n) => store.put({ ...n, trip_id: tripId }));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedNotes(tripId: string): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NOTES_STORE, "readonly");
    const index = tx.objectStore(NOTES_STORE).index("trip_id");
    const req = index.getAll(tripId);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/** Save a note locally and mark as pending sync */
export async function saveNoteOffline(note: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NOTES_STORE, "readwrite");
    tx.objectStore(NOTES_STORE).put({ ...note, pendingSync: true, offlineUpdatedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingSyncNotes(): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NOTES_STORE, "readonly");
    const store = tx.objectStore(NOTES_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result || []).filter((n: any) => n.pendingSync === true));
    req.onerror = () => reject(req.error);
  });
}

export async function clearPendingSync(noteId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NOTES_STORE, "readwrite");
    const store = tx.objectStore(NOTES_STORE);
    const req = store.get(noteId);
    req.onsuccess = () => {
      if (req.result) {
        delete req.result.pendingSync;
        store.put(req.result);
      }
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Meta (offline readiness, timestamps) ───────────────────────────

export async function setMeta(key: string, value: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, "readwrite");
    tx.objectStore(META_STORE).put({ key, value, updatedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getMeta(key: string): Promise<any | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, "readonly");
    const req = tx.objectStore(META_STORE).get(key);
    req.onsuccess = () => resolve(req.result?.value ?? null);
    req.onerror = () => reject(req.error);
  });
}

// ─── Cache API for binary assets ────────────────────────────────────

export async function cacheAsset(url: string): Promise<boolean> {
  try {
    const cache = await caches.open(CACHE_NAME);
    // Check if already cached
    const existing = await cache.match(url);
    if (existing) return true;
    // Fetch and cache
    const response = await fetch(url, { mode: "cors" });
    if (response.ok) {
      await cache.put(url, response);
      return true;
    }
    return false;
  } catch (err) {
    console.warn("[companion-offline] Failed to cache asset:", url, err);
    return false;
  }
}

export async function getCachedAsset(url: string): Promise<Response | undefined> {
  try {
    const cache = await caches.open(CACHE_NAME);
    return await cache.match(url) || undefined;
  } catch {
    return undefined;
  }
}

export async function isAssetCached(url: string): Promise<boolean> {
  try {
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(url);
    return !!match;
  } catch {
    return false;
  }
}

// ─── Prefetch orchestration ─────────────────────────────────────────

export interface PrefetchProgress {
  done: number;
  total: number;
  label: string;
}

export type ProgressCallback = (progress: PrefetchProgress) => void;

/**
 * Collect all cacheable URLs from enriched viewings
 */
export function collectAssetUrls(
  viewings: any[],
  mapboxToken?: string
): string[] {
  const urls: string[] = [];

  viewings.forEach((v) => {
    // Hero image
    if (v.project_featured_image) {
      urls.push(v.project_featured_image);
    }

    // Documents (PDFs, brochures)
    if (v.documents && Array.isArray(v.documents)) {
      v.documents.forEach((doc: any) => {
        if (doc.file_url) urls.push(doc.file_url);
      });
    }

    // Static map image per viewing
    if (mapboxToken) {
      const lat = v.showhouse_latitude || v.project_latitude;
      const lng = v.showhouse_longitude || v.project_longitude;
      if (lat && lng) {
        const staticMapUrl = buildStaticMapUrl(lat, lng, v.project_name, mapboxToken);
        urls.push(staticMapUrl);
      }
    }
  });

  return [...new Set(urls)]; // deduplicate
}

export function buildStaticMapUrl(
  lat: number,
  lng: number,
  _name: string,
  token: string
): string {
  const pin = `pin-l+22c55e(${lng},${lat})`;
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${pin}/${lng},${lat},13/600x400@2x?access_token=${token}`;
}

/**
 * Prefetch all data and assets for a trip
 */
export async function prefetchTrip(
  tripId: string,
  tripData: any,
  notes: any[],
  viewings: any[],
  mapboxToken?: string,
  onProgress?: ProgressCallback
): Promise<void> {
  // 1. Cache structured data
  await cacheTripData(tripId, tripData);
  await cacheNotes(tripId, notes);

  // 2. Collect asset URLs
  const urls = collectAssetUrls(viewings, mapboxToken);
  const total = urls.length;

  // 3. Cache assets sequentially with progress
  let done = 0;
  for (const url of urls) {
    const label = url.includes("mapbox") ? "Kaart..." : url.split("/").pop()?.substring(0, 30) || "Bestand...";
    onProgress?.({ done, total, label });
    await cacheAsset(url);
    done++;
  }

  onProgress?.({ done: total, total, label: "Klaar!" });

  // 4. Mark as ready
  await setMeta(`offline-ready-${tripId}`, { ready: true, cachedAt: Date.now(), assetCount: total });
}

export async function isOfflineReady(tripId: string): Promise<{ ready: boolean; cachedAt: number | null }> {
  const meta = await getMeta(`offline-ready-${tripId}`);
  if (meta?.ready) {
    return { ready: true, cachedAt: meta.cachedAt };
  }
  return { ready: false, cachedAt: null };
}
