import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { supabase, SUPABASE_REPORTS_TABLE } from './supabaseClient';

const STORAGE_QUEUE_KEY = '@mdoner_offline_reports_queue';
const STORAGE_HISTORY_KEY = '@mdoner_all_reports_history';
const BACKGROUND_SYNC_TASK = 'BACKGROUND_LANDSLIDE_REPORT_SYNC';

// 5-second timeout wrapper to prevent hanging network requests
const fetchWithTimeout = (promise, timeoutMs = 5000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Supabase cloud connection timeout')), timeoutMs)
    ),
  ]);
};

export const OfflineSyncEngine = {
  /**
   * 1. GET LOCALLY STAGED REPORTS (FILTERED BY GMAIL ACCOUNT IF SPECIFIED)
   */
  async getLocalReports(userEmail = null) {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_HISTORY_KEY);
      if (!raw) return [];
      const history = JSON.parse(raw);

      // Filter strictly by user email if citizen
      if (userEmail && userEmail !== 'ADMIN' && !userEmail.includes('@mdoner.gov.in')) {
        return history.filter(item => 
          item.userEmail?.toLowerCase() === userEmail.toLowerCase()
        );
      }
      return history;
    } catch (err) {
      console.error('[OfflineSyncEngine] Error reading local DB:', err);
      return [];
    }
  },

  /**
   * 2. SAVE OR UPDATE REPORT IN LOCAL DB
   */
  async saveLocalReport(report) {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_HISTORY_KEY);
      const history = raw ? JSON.parse(raw) : [];
      const existingIdx = history.findIndex(item => item.id === report.id);
      if (existingIdx >= 0) {
        history[existingIdx] = report;
      } else {
        history.unshift(report);
      }
      await AsyncStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(history));
    } catch (err) {
      console.error('[OfflineSyncEngine] Failed saving to local DB:', err);
    }
  },

  /**
   * 3. QUEUE REPORT IN OFFLINE DB & ATTEMPT SUPABASE SYNC
   */
  async queueReport({
    description,
    category = 'GROUND_CRACK',
    severity = 'HIGH',
    latitude = 25.18,
    longitude = 93.02,
    imageBase64 = null,
    reporterName = 'Citizen Reporter',
    userEmail = 'citizen@gmail.com',
    userRole = 'CITIZEN'
  }) {
    const reportId = uuidv4();
    const photoEvidence = (typeof imageBase64 === 'string' && imageBase64.trim().length > 0)
      ? imageBase64
      : 'https://images.unsplash.com/photo-1547683905-f686c993aae5';

    const newReport = {
      id: reportId,
      description,
      category,
      severity,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      imageBase64: photoEvidence,
      reporterName,
      userEmail: userEmail.toLowerCase(),
      userRole,
      status: 'PENDING_VERIFICATION',
      syncedToSupabase: false,
      timestamp: new Date().toISOString(),
      retryCount: 0
    };

    try {
      // Step A: Store in isolated local offline DB first
      await this.saveLocalReport(newReport);

      // Step B: Add to offline sync queue
      const existingQueueRaw = await AsyncStorage.getItem(STORAGE_QUEUE_KEY);
      const currentQueue = existingQueueRaw ? JSON.parse(existingQueueRaw) : [];
      currentQueue.push(newReport);
      await AsyncStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(currentQueue));

      console.log(`[SyncEngine] Local DB saved for ${newReport.userEmail}. Report ID: ${reportId}`);

      // Step C: Attempt immediate sync to Supabase Cloud
      let syncResult = { synced: false, note: '' };
      try {
        const netState = await NetInfo.fetch();
        if (netState.isConnected) {
          syncResult = await this.syncSingleReportToSupabase(newReport);
        } else {
          syncResult.note = 'Device is offline. Staged in local offline DB.';
        }
      } catch (e) {
        console.warn('[SyncEngine] Network sync check skipped:', e.message);
        syncResult.note = e.message;
      }

      return {
        success: true,
        reportId,
        synced: syncResult.synced,
        cachedOffline: !syncResult.synced,
        note: syncResult.note
      };
    } catch (error) {
      console.error('[SyncEngine] Staging error:', error);
      throw new Error('Local database storage failed.');
    }
  },

  /**
   * 4. SYNC SINGLE REPORT TO SUPABASE (SUPPORTS Field_reports & field_reports TABLE CASE SENSITIVITY)
   */
  async syncSingleReportToSupabase(report) {
    try {
      // Preserve uploaded photo URL/data URI without replacing with default unsplash
      const mediaUrl = (typeof report.imageBase64 === 'string' && report.imageBase64.trim().length > 0)
        ? report.imageBase64
        : 'https://images.unsplash.com/photo-1547683905-f686c993aae5';

      const payload = {
        id: String(report.id),
        category: report.category,
        severity_estimate: report.severity,
        latitude: report.latitude,
        longitude: report.longitude,
        landmark_description: report.description,
        multimedia_url: mediaUrl,
        reporter_name: report.reporterName,
        user_email: report.userEmail,
        status: report.status,
        created_at: report.timestamp,
        verified_by_admin: report.verifiedByAdmin || false
      };

      // Try primary table name 'Field_reports' (Capital F as shown in Supabase Schema Visualizer)
      let response = await fetchWithTimeout(
        supabase.from('Field_reports').upsert([payload], { onConflict: 'id' }),
        4000
      );

      // If 'Field_reports' returned table not found error, fallback to 'field_reports' (lowercase)
      if (response && response.error) {
        console.warn(`[SyncEngine] Trying lowercase table name 'field_reports'... (${response.error.message})`);
        response = await fetchWithTimeout(
          supabase.from('field_reports').upsert([payload], { onConflict: 'id' }),
          4000
        );
      }

      if (response && response.error) {
        console.warn(`[SyncEngine] Supabase table note: ${response.error.message}`);
        return { synced: false, note: `Supabase Table Error: ${response.error.message}` };
      }

      // Mark report as synced in local DB
      report.syncedToSupabase = true;
      await this.saveLocalReport(report);

      // Remove from offline queue
      const queueRaw = await AsyncStorage.getItem(STORAGE_QUEUE_KEY);
      if (queueRaw) {
        let queue = JSON.parse(queueRaw);
        queue = queue.filter(q => q.id !== report.id);
        await AsyncStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(queue));
      }

      console.log(`[SyncEngine] Report ${report.id} synced to Supabase Cloud for ${report.userEmail}`);
      return { synced: true, note: 'Successfully synced to Supabase Cloud.' };
    } catch (err) {
      console.warn(`[SyncEngine] Supabase sync fallback: ${err.message}`);
      return { synced: false, note: err.message };
    }
  },

  /**
   * 5. FLUSH & SYNC ALL STAGED QUEUED REPORTS
   */
  async triggerSyncProcess() {
    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) return false;

      const queueRaw = await AsyncStorage.getItem(STORAGE_QUEUE_KEY);
      if (!queueRaw) return true;

      let pendingQueue = JSON.parse(queueRaw);
      if (pendingQueue.length === 0) return true;

      console.log(`[SyncEngine] Flushing ${pendingQueue.length} queued report(s)...`);
      const remainingQueue = [];

      for (const report of pendingQueue) {
        const res = await this.syncSingleReportToSupabase(report);
        if (!res.synced) {
          report.retryCount = (report.retryCount || 0) + 1;
          if (report.retryCount < 5) {
            remainingQueue.push(report);
          }
        }
      }

      await AsyncStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(remainingQueue));
      return true;
    } catch (e) {
      console.warn('[SyncEngine] Trigger sync error:', e);
      return false;
    }
  },

  /**
   * 6. ADMIN VERIFY AND UPDATE REPORT STATUS
   */
  async adminVerifyReport(reportId, newStatus = 'VERIFIED', adminNotes = '') {
    try {
      const history = await this.getLocalReports();
      const target = history.find(r => r.id === reportId);
      if (!target) throw new Error('Report not found in local database.');

      target.status = newStatus;
      target.adminNotes = adminNotes;
      target.verifiedByAdmin = true;
      target.verifiedAt = new Date().toISOString();

      await this.saveLocalReport(target);

      // Sync updated verification status to Supabase
      await this.syncSingleReportToSupabase(target);

      return { success: true, report: target };
    } catch (err) {
      console.error('[SyncEngine] Admin verification error:', err);
      throw err;
    }
  },

  /**
   * 7. GET QUEUED COUNT
   */
  async getQueuedCount() {
    try {
      const queueRaw = await AsyncStorage.getItem(STORAGE_QUEUE_KEY);
      const queue = queueRaw ? JSON.parse(queueRaw) : [];
      return queue.length;
    } catch {
      return 0;
    }
  },

  /**
   * 8. INITIALIZE NETWORK OBSERVER
   */
  initializeNetworkObserver() {
    try {
      NetInfo.addEventListener(state => {
        if (state.isConnected) {
          this.triggerSyncProcess();
        }
      });
    } catch (e) {
      // Graceful fallback
    }
  }
};

// Background Task Registration
try {
  TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
    try {
      const hasSyncCompleted = await OfflineSyncEngine.triggerSyncProcess();
      return hasSyncCompleted ? BackgroundFetch.BackgroundFetchResult.NewData : BackgroundFetch.BackgroundFetchResult.NoData;
    } catch (error) {
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
} catch (e) {
  // Graceful fallback
}

export async function registerBackgroundSyncWorker() {
  try {
    return await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (e) {
    // Graceful fallback
  }
}
