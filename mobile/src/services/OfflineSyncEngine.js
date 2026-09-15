/**
 * ==============================================================================
 * SIH ID 26001: MDoNER Landslide Risk Monitoring Platform
 * React Native Offline-First Synchronization Engine (Mobile Edge Layer)
 * ==============================================================================
 * Encapsulates asynchronous local storage staging and connectivity state watchers.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_QUEUE_KEY = '@mdoner_citizen_reports_queue';
const BACKGROUND_SYNC_TASK = 'BACKGROUND_LANDSLIDE_REPORT_SYNC';
const API_ENDPOINT = 'http://localhost:8000/api/v1/reports';

export const OfflineSyncEngine = {
  /**
   * 1. STAGE INBOUND REPORT DATA INTO LOCAL SAFE QUEUE
   */
  async queueReport(description, latitude, longitude, imageBase64 = null) {
    const newReport = {
      id: uuidv4(),
      description,
      latitude,
      longitude,
      imageBase64,
      timestamp: new Date().toISOString(),
      retryCount: 0
    };

    try {
      const existingQueueRaw = await AsyncStorage.getItem(STORAGE_QUEUE_KEY);
      const currentQueue = existingQueueRaw ? JSON.parse(existingQueueRaw) : [];
      currentQueue.push(newReport);
      await AsyncStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(currentQueue));
      console.log(`[SyncEngine] Local cache update successful. Report ${newReport.id} queued.`);

      // Proactively attempt immediate upload if device is online
      this.triggerSyncProcess();
      return { success: true, cachedOffline: true, id: newReport.id };
    } catch (error) {
      console.error('[SyncEngine] Failed staging report locally:', error);
      throw new Error('Local memory persistence layer failure.');
    }
  },

  /**
   * 2. SYNCHRONIZATION PIPELINE EXECUTION LOOP
   */
  async triggerSyncProcess() {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      console.log('[SyncEngine] Connection offline. Postponing server sync.');
      return false;
    }

    const queueRaw = await AsyncStorage.getItem(STORAGE_QUEUE_KEY);
    if (!queueRaw) return true;

    let pendingReports = JSON.parse(queueRaw);
    if (pendingReports.length === 0) return true;

    console.log(`[SyncEngine] Network connectivity active. Uploading ${pendingReports.length} pending report(s)...`);
    const remainingReports = [];

    for (const report of pendingReports) {
      try {
        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reporter_name: 'Field Official (Mobile App)',
            category: 'GROUND_CRACK',
            severity_estimate: 'HIGH',
            latitude: report.latitude,
            longitude: report.longitude,
            landmark_description: report.description,
            multimedia_url: report.imageBase64 || 'https://images.unsplash.com/photo-1547683905-f686c993aae5',
            offline_sync_id: report.id
          }),
        });

        if (response.ok || response.status === 201) {
          console.log(`[SyncEngine] Report ${report.id} uploaded successfully to PostGIS.`);
        } else {
          throw new Error(`Server returned code: ${response.status}`);
        }
      } catch (err) {
        console.warn(`[SyncEngine] Upload failed for report ${report.id}:`, err.message);
        report.retryCount += 1;
        if (report.retryCount < 5) {
          remainingReports.push(report);
        } else {
          console.error(`[SyncEngine] Dropping poisoned report payload ${report.id} after repeated failures.`);
        }
      }
    }

    await AsyncStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(remainingReports));
    return true;
  },

  /**
   * 3. INITIALIZE NETWORK OBSERVER HOOKS
   */
  initializeNetworkObserver() {
    NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable !== false) {
        console.log('[SyncEngine] NetInfo Event Triggered: Intercepted Online State Transition.');
        this.triggerSyncProcess();
      }
    });
  }
};

// Background Retry Worker Registration (OS Level)
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
  // Graceful fallback for non-native web previews
}

export async function registerBackgroundSyncWorker() {
  try {
    return await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (e) {
    console.warn("Background fetch registration skipped on unsupported environment.");
  }
}
