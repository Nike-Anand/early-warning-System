/**
 * ==============================================================================
 * SIH ID 26001: MDoNER Landslide Risk Monitoring Platform
 * Offline-First IndexedDB Local Storage & Background Synchronization Service
 * ==============================================================================
 * Enables field officials and citizens in isolated NER areas to capture geo-tagged
 * reports without connectivity, and automatically uploads them upon network reconnection.
 */

const DB_NAME = 'MDoNER_Landslide_DB';
const DB_VERSION = 1;
const STORE_NAME = 'offline_reports';

/**
 * Initializes and opens the IndexedDB instance.
 */
export function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'offline_id' });
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject('IndexedDB initialization failed: ' + event.target.error);
    };
  });
}

/**
 * Saves a new crowd-sourced or field official report to local storage.
 */
export async function saveOfflineReport(reportData) {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const record = {
      offline_id: 'OFFLINE-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      ...reportData,
      synced: false,
      timestamp: new Date().toISOString()
    };

    const request = store.add(record);
    request.onsuccess = () => resolve(record);
    request.onerror = (e) => reject('Failed to write report to IndexedDB: ' + e.target.error);
  });
}

/**
 * Retrieves all pending unsynced reports from local storage.
 */
export async function getPendingOfflineReports() {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const all = request.result || [];
      const pending = all.filter(item => !item.synced);
      resolve(pending);
    };
    request.onerror = (e) => reject('Failed to read pending reports: ' + e.target.error);
  });
}

/**
 * Marks an offline report as successfully synced or deletes it.
 */
export async function markReportSynced(offline_id) {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(offline_id);
    request.onsuccess = () => resolve(true);
    request.onerror = (e) => reject('Failed to remove synced report: ' + e.target.error);
  });
}

/**
 * Attempts to upload all pending reports to the central FastAPI backend.
 */
export async function syncOfflineReports(apiBaseUrl = '') {
  if (!navigator.onLine) {
    console.log('📡 [OFFLINE SYNC] Device is offline. Retaining local queue.');
    return { syncedCount: 0, pendingCount: (await getPendingOfflineReports()).length };
  }

  const pending = await getPendingOfflineReports();
  if (pending.length === 0) return { syncedCount: 0, pendingCount: 0 };

  console.log(`📡 [OFFLINE SYNC] Connecting to backend to flush ${pending.length} pending report(s)...`);
  let syncedCount = 0;

  for (const report of pending) {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporter_name: report.reporter_name || 'Field Official',
          reporter_phone: report.reporter_phone,
          category: report.category,
          severity_estimate: report.severity_estimate || 'MEDIUM',
          longitude: report.longitude,
          latitude: report.latitude,
          landmark_description: report.landmark_description,
          multimedia_url: report.multimedia_url,
          offline_sync_id: report.offline_id
        })
      });

      if (res.ok) {
        await markReportSynced(report.offline_id);
        syncedCount++;
      }
    } catch (err) {
      console.warn(`Could not sync report ${report.offline_id}:`, err);
    }
  }

  const remaining = await getPendingOfflineReports();
  return { syncedCount, pendingCount: remaining.length };
}

/**
 * Registers automatic synchronization listeners on window 'online' event.
 */
export function registerBackgroundSync(onSyncComplete) {
  window.addEventListener('online', async () => {
    console.log('🌐 [NETWORK DETECTED] Cellular/WiFi connectivity restored! Triggering auto-sync...');
    const result = await syncOfflineReports();
    if (onSyncComplete) onSyncComplete(result);
  });
}
