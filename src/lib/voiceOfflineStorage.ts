const DB_NAME = "viva-voice-snagging";
const DB_VERSION = 3;
const STORE_NAME = "recordings";
const PHOTOS_STORE = "photos";

export interface OfflineRecording {
  id: string;
  saleId: string;
  roomName: string;
  inspectionId: string;
  blob: Blob;
  timestamp: number;
  synced: boolean;
}

export interface OfflinePhoto {
  id: string;
  saleId: string;
  roomName: string;
  inspectionId: string;
  itemIndex: number;
  blob: Blob;
  timestamp: number;
  synced: boolean;
  localUrl?: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;
      if (oldVersion < 1) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("saleId", "saleId", { unique: false });
        store.createIndex("synced", "synced", { unique: false });
      }
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(PHOTOS_STORE)) {
          const photoStore = db.createObjectStore(PHOTOS_STORE, { keyPath: "id" });
          photoStore.createIndex("saleId", "saleId", { unique: false });
          photoStore.createIndex("synced", "synced", { unique: false });
        }
      }
      // v3: add inspectionId — no schema change needed since IndexedDB is schemaless for fields
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const voiceOfflineStorage = {
  // ===== RECORDINGS =====
  async save(blob: Blob, saleId: string, roomName: string, inspectionId: string): Promise<string> {
    const db = await openDB();
    const id = crypto.randomUUID();
    const record: OfflineRecording = { id, saleId, roomName, inspectionId, blob, timestamp: Date.now(), synced: false };
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => resolve(id);
      tx.onerror = () => reject(tx.error);
    });
  },

  async get(id: string): Promise<OfflineRecording | undefined> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async getUnsynced(saleId: string): Promise<OfflineRecording[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const index = tx.objectStore(STORE_NAME).index("saleId");
      const req = index.getAll(saleId);
      req.onsuccess = () => resolve((req.result || []).filter((r: OfflineRecording) => !r.synced));
      req.onerror = () => reject(req.error);
    });
  },

  async markSynced(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result) {
          req.result.synced = true;
          store.put(req.result);
        }
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  },

  async delete(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async deleteAllSynced(saleId: string): Promise<number> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("saleId");
      const req = index.getAll(saleId);
      let deleted = 0;
      req.onsuccess = () => {
        const synced = (req.result || []).filter((r: OfflineRecording) => r.synced);
        for (const rec of synced) {
          store.delete(rec.id);
          deleted++;
        }
      };
      tx.oncomplete = () => resolve(deleted);
      tx.onerror = () => reject(tx.error);
    });
  },

  // ===== PHOTOS =====
  async savePhoto(blob: Blob, saleId: string, roomName: string, itemIndex: number, inspectionId: string): Promise<OfflinePhoto> {
    const db = await openDB();
    const id = crypto.randomUUID();
    const localUrl = URL.createObjectURL(blob);
    const record: OfflinePhoto = { id, saleId, roomName, inspectionId, itemIndex, blob, timestamp: Date.now(), synced: false, localUrl };
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTOS_STORE, "readwrite");
      tx.objectStore(PHOTOS_STORE).put(record);
      tx.oncomplete = () => {
        console.log("[photo] persisted to IndexedDB", { id, saleId, roomName, itemIndex, inspectionId, blobSize: blob.size });
        resolve(record);
      };
      tx.onerror = () => {
        console.error("[photo] IndexedDB persist FAILED", { id, saleId, error: tx.error });
        reject(tx.error);
      };
    });
  },

  async getUnsyncedPhotos(saleId: string): Promise<OfflinePhoto[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTOS_STORE, "readonly");
      const index = tx.objectStore(PHOTOS_STORE).index("saleId");
      const req = index.getAll(saleId);
      req.onsuccess = () => resolve((req.result || []).filter((r: OfflinePhoto) => !r.synced));
      req.onerror = () => reject(req.error);
    });
  },

  async markPhotoSynced(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTOS_STORE, "readwrite");
      const store = tx.objectStore(PHOTOS_STORE);
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result) {
          req.result.synced = true;
          store.put(req.result);
        }
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  },

  async deletePhoto(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTOS_STORE, "readwrite");
      tx.objectStore(PHOTOS_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async deleteAllSyncedPhotos(saleId: string): Promise<number> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTOS_STORE, "readwrite");
      const store = tx.objectStore(PHOTOS_STORE);
      const index = store.index("saleId");
      const req = index.getAll(saleId);
      let deleted = 0;
      req.onsuccess = () => {
        const synced = (req.result || []).filter((r: OfflinePhoto) => r.synced);
        for (const rec of synced) {
          store.delete(rec.id);
          deleted++;
        }
      };
      tx.oncomplete = () => resolve(deleted);
      tx.onerror = () => reject(tx.error);
    });
  },
};
