import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
  Image
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { OfflineSyncEngine } from '../services/OfflineSyncEngine';

export default function CitizenReportScreen({ user, onLogout }) {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('GROUND_CRACK');
  const [severity, setSeverity] = useState('HIGH');
  const [latitude, setLatitude] = useState(25.1802);
  const [longitude, setLongitude] = useState(93.0245);
  const [imageUri, setImageUri] = useState('https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80');

  const [isOnline, setIsOnline] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);
  const [myReportsHistory, setMyReportsHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('FORM'); // 'FORM' | 'MY_REPORTS'
  const [submittedReportNotice, setSubmittedReportNotice] = useState(null);

  const currentUserEmail = user?.email || 'nirrmalg21@gmail.com';

  useEffect(() => {
    loadLocalHistory();
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(!!state.isConnected);
      if (state.isConnected) {
        OfflineSyncEngine.triggerSyncProcess().then(loadLocalHistory);
      }
    });
    OfflineSyncEngine.initializeNetworkObserver();
    return () => unsubscribe();
  }, [user]);

  const loadLocalHistory = async () => {
    // Filter history strictly by the logged-in Gmail account
    const history = await OfflineSyncEngine.getLocalReports(currentUserEmail);
    setMyReportsHistory(history);
    const count = await OfflineSyncEngine.getQueuedCount();
    setQueuedCount(count);
  };

  const categories = [
    { label: 'Ground Crack', value: 'GROUND_CRACK', icon: '⚡' },
    { label: 'Rockfall', value: 'ROCKFALL', icon: '🪨' },
    { label: 'Mudslide', value: 'MUDSLIDE', icon: '🌋' },
    { label: 'Road Blocked', value: 'ROAD_BLOCKAGE', icon: '🚧' },
    { label: 'Subsidence', value: 'SUBSIDENCE', icon: '📉' },
    { label: 'Water Surge', value: 'WATER_SURGE', icon: '🌊' }
  ];

  const severities = [
    { label: 'Low Risk', value: 'LOW', color: '#10b981', bg: '#ecfdf5' },
    { label: 'Medium', value: 'MEDIUM', color: '#d97706', bg: '#fffbeb' },
    { label: 'High Alert', value: 'HIGH', color: '#ea580c', bg: '#fff7ed' },
    { label: 'Critical', value: 'CRITICAL', color: '#dc2626', bg: '#fef2f2' }
  ];

  // Pick image from camera or gallery
  const handlePickImage = async (sourceType) => {
    try {
      let result;
      if (sourceType === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera access permission is required.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          quality: 0.7,
          allowsEditing: true,
          aspect: [4, 3],
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Gallery access permission is required.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          quality: 0.7,
          allowsEditing: true,
          aspect: [4, 3],
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Image picker error:', err);
    }
  };

  // Acquire current device GPS location
  const handleAcquireLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLatitude(Number(location.coords.latitude.toFixed(4)));
        setLongitude(Number(location.coords.longitude.toFixed(4)));
        return;
      }
    } catch (err) {
      // Fallback
    }
    setLatitude(Number((25.18 + Math.random() * 0.05).toFixed(4)));
    setLongitude(Number((93.02 + Math.random() * 0.05).toFixed(4)));
  };

  const handleManualSync = async () => {
    setIsSubmitting(true);
    try {
      await OfflineSyncEngine.triggerSyncProcess();
      await loadLocalHistory();
      Alert.alert('Cloud Sync Flushed', 'Offline staged reports uploaded to Supabase Cloud DB.');
    } catch (e) {
      console.warn('Manual sync note:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReportDispatch = async () => {
    if (!description.trim()) {
      Alert.alert('Observations Required', 'Please describe visible ground movement or landmark damage.');
      return;
    }

    setIsSubmitting(true);
    setSubmittedReportNotice(null);

    try {
      const result = await OfflineSyncEngine.queueReport({
        description,
        category,
        severity,
        latitude,
        longitude,
        imageBase64: imageUri,
        reporterName: user?.name || currentUserEmail.split('@')[0],
        userEmail: currentUserEmail,
        userRole: 'CITIZEN'
      });

      if (result.success) {
        setSubmittedReportNotice({
          id: result.reportId,
          synced: result.synced,
          email: currentUserEmail,
          category,
          severity
        });

        // Clear current form inputs for the next submission
        setDescription('');
        await loadLocalHistory();
      }
    } catch (error) {
      console.error('Report submission error:', error);
      Alert.alert('Submission Error', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForAnotherSubmission = () => {
    setSubmittedReportNotice(null);
    setDescription('');
    setCategory('GROUND_CRACK');
    setSeverity('HIGH');
    setActiveTab('FORM');
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.headerTitle}>MDoNER Citizen Portal</Text>
          <Text style={styles.userBadgeText}>📧 Account: {currentUserEmail}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutBtnText}>Switch Account</Text>
        </TouchableOpacity>
      </View>

      {/* Network Status Ribbon */}
      <View style={styles.statusRibbon}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? '#10b981' : '#f59e0b' }]} />
          <Text style={styles.statusText}>
            {isOnline ? 'NETWORK: ONLINE (SUPABASE LIVE)' : 'NETWORK: OFFLINE (LOCAL DB ACTIVE)'}
          </Text>
        </View>
        {queuedCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{queuedCount} QUEUED</Text>
          </View>
        )}
      </View>

      {/* Segment Navigation */}
      <View style={styles.navSegments}>
        <TouchableOpacity
          style={[styles.segment, activeTab === 'FORM' && styles.segmentActive]}
          onPress={() => setActiveTab('FORM')}
        >
          <Text style={[styles.segmentText, activeTab === 'FORM' && styles.segmentTextActive]}>
            📝 Submit Field Report
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segment, activeTab === 'MY_REPORTS' && styles.segmentActive]}
          onPress={() => setActiveTab('MY_REPORTS')}
        >
          <Text style={[styles.segmentText, activeTab === 'MY_REPORTS' && styles.segmentTextActive]}>
            📋 My Reports ({myReportsHistory.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* SUBMISSION CONFIRMATION PROMPT CARD */}
      {submittedReportNotice && (
        <View style={styles.successNoticeCard}>
          <Text style={styles.successNoticeTitle}>✅ Field Report Successfully Recorded!</Text>
          <Text style={styles.successNoticeSub}>
            Report registered under account: <Text style={{ fontWeight: '800' }}>{submittedReportNotice.email}</Text>
          </Text>
          
          <View style={styles.statusRow}>
            <Text style={styles.statusTagOffline}>💾 Saved to Local Offline DB</Text>
            {submittedReportNotice.synced ? (
              <Text style={styles.statusTagSynced}>☁️ Synced to Supabase Cloud</Text>
            ) : (
              <Text style={styles.statusTagPending}>⏳ Scheduled for Supabase Sync</Text>
            )}
          </View>

          <View style={styles.noticeActionRow}>
            <TouchableOpacity style={styles.addAnotherBtn} onPress={handleResetForAnotherSubmission}>
              <Text style={styles.addAnotherBtnText}>➕ SUBMIT ANOTHER FIELD REPORT</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.viewHistoryBtn} onPress={() => setActiveTab('MY_REPORTS')}>
              <Text style={styles.viewHistoryBtnText}>📋 View My Reports →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {activeTab === 'FORM' ? (
        /* REPORT FORM CARD */
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Upload Landslide Hazard Report</Text>

          {/* Incident Category */}
          <Text style={styles.fieldLabel}>Incident Category:</Text>
          <View style={styles.gridRow}>
            {categories.map((c) => (
              <TouchableOpacity
                key={c.value}
                style={[styles.chip, category === c.value && styles.chipActive]}
                onPress={() => setCategory(c.value)}
              >
                <Text style={styles.chipIcon}>{c.icon}</Text>
                <Text style={[styles.chipText, category === c.value && styles.chipTextActive]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Severity Matrix */}
          <Text style={styles.fieldLabel}>Estimated Severity Level:</Text>
          <View style={styles.gridRow}>
            {severities.map((s) => (
              <TouchableOpacity
                key={s.value}
                style={[
                  styles.severityChip,
                  { backgroundColor: s.bg, borderColor: s.color },
                  severity === s.value && { borderWidth: 2, borderColor: s.color }
                ]}
                onPress={() => setSeverity(s.value)}
              >
                <Text style={[styles.severityText, { color: s.color }]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Photo Evidence Section */}
          <Text style={styles.fieldLabel}>Field Photo Evidence:</Text>
          <View style={styles.photoContainer}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.photoPreview} resizeMode="cover" />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={{ fontSize: 24 }}>📷</Text>
                <Text style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>No Photo Selected</Text>
              </View>
            )}

            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoActionBtn} onPress={() => handlePickImage('camera')}>
                <Text style={styles.photoActionText}>📸 Snap Camera Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoActionBtnSecondary} onPress={() => handlePickImage('gallery')}>
                <Text style={styles.photoActionTextSecondary}>🖼️ Choose Gallery Image</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* GPS Location Box */}
          <View style={styles.gpsBox}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.gpsTitle}>📍 GPS WGS84 Position</Text>
              <TouchableOpacity onPress={handleAcquireLocation}>
                <Text style={styles.gpsCalibrateBtn}>🔄 Calibrate GPS</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.gpsCoords}>{latitude}° N, {longitude}° E (Haflong / NH-27 Corridor)</Text>
          </View>

          {/* Description Input */}
          <Text style={styles.fieldLabel}>Landmark & Damage Observations:</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={4}
            placeholder="Describe visible ground tension cracks, rock slope movement, mud accumulation, or road obstruction..."
            placeholderTextColor="#94a3b8"
            value={description}
            onChangeText={setDescription}
          />

          {/* Submit Action Button */}
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: isSubmitting ? '#94a3b8' : '#2563eb' }]}
            onPress={handleReportDispatch}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator color="#ffffff" size="small" />
                <Text style={styles.submitBtnText}>SAVING TO DB & SYNCING TO SUPABASE...</Text>
              </View>
            ) : (
              <Text style={styles.submitBtnText}>
                {isOnline ? 'UPLOAD REPORT TO SUPABASE CLOUD →' : 'SAVE TO OFFLINE DATABASE 💾'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Manual Sync Trigger */}
          {isOnline && queuedCount > 0 && (
            <TouchableOpacity style={styles.syncBtn} onPress={handleManualSync}>
              <Text style={styles.syncBtnText}>⚡ Flush Offline Staged Reports ({queuedCount}) to Supabase</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        /* MY REPORTS HISTORY LIST - ISOLATED TO THIS GMAIL ACCOUNT */
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reports Submitted by {currentUserEmail} ({myReportsHistory.length})</Text>

          {myReportsHistory.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>📭</Text>
              <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600' }}>
                No reports submitted for account {currentUserEmail} yet.
              </Text>
            </View>
          ) : (
            myReportsHistory.map((item) => (
              <View key={item.id} style={styles.historyCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyCategory}>{item.category} • {item.severity}</Text>
                    <Text style={styles.historyDesc}>{item.description}</Text>
                    <Text style={styles.historyMeta}>
                      📧 {item.userEmail} | 📍 {item.latitude}° N, {item.longitude}° E | 🕒 {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>

                  {item.imageBase64 && (
                    <Image source={{ uri: item.imageBase64 }} style={styles.historyThumb} />
                  )}
                </View>

                {/* Status Badges */}
                <View style={styles.statusBadgesRow}>
                  {item.syncedToSupabase ? (
                    <View style={styles.statusSynced}>
                      <Text style={styles.statusSyncedText}>☁️ Synced to Supabase</Text>
                    </View>
                  ) : (
                    <View style={styles.statusOffline}>
                      <Text style={styles.statusOfflineText}>💾 Staged in Offline DB</Text>
                    </View>
                  )}

                  <View style={[
                    styles.verificationBadge,
                    item.status === 'VERIFIED' ? { backgroundColor: '#dcfce7' } : { backgroundColor: '#fef3c7' }
                  ]}>
                    <Text style={[
                      styles.verificationBadgeText,
                      item.status === 'VERIFIED' ? { color: '#15803d' } : { color: '#b45309' }
                    ]}>
                      {item.status === 'VERIFIED' ? '✅ Admin Verified' : '⏳ Pending Verification'}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f8fafc',
    padding: 18,
    paddingTop: 42,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  userBadgeText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '700',
  },
  logoutBtn: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  statusRibbon: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  badge: {
    backgroundColor: '#d97706',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  successNoticeCard: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  successNoticeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065f46',
    marginBottom: 4,
  },
  successNoticeSub: {
    fontSize: 12,
    color: '#047857',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statusTagOffline: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b45309',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusTagSynced: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369a1',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusTagPending: {
    fontSize: 10,
    fontWeight: '700',
    color: '#c2410c',
    backgroundColor: '#ffedd5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  noticeActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addAnotherBtn: {
    flex: 1,
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  addAnotherBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  viewHistoryBtn: {
    backgroundColor: '#065f46',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewHistoryBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  navSegments: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 9,
  },
  segmentActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  segmentTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  chipActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  chipIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextActive: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  severityChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  photoContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    marginBottom: 14,
  },
  photoPreview: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    marginBottom: 10,
  },
  photoPlaceholder: {
    width: '100%',
    height: 100,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 8,
  },
  photoActionBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  photoActionText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  photoActionBtnSecondary: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  photoActionTextSecondary: {
    color: '#1e293b',
    fontSize: 11,
    fontWeight: '700',
  },
  gpsBox: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  gpsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369a1',
  },
  gpsCalibrateBtn: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  gpsCoords: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#0c4a6e',
    marginTop: 4,
  },
  textArea: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    fontSize: 12,
    color: '#0f172a',
    textAlignVertical: 'top',
    minHeight: 80,
    marginBottom: 16,
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  syncBtn: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  syncBtnText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  historyCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 10,
  },
  historyCategory: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 2,
  },
  historyDesc: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 6,
  },
  historyMeta: {
    fontSize: 10,
    color: '#64748b',
  },
  historyThumb: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginLeft: 8,
  },
  statusBadgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  statusSynced: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusSyncedText: {
    fontSize: 10,
    color: '#0369a1',
    fontWeight: '700',
  },
  statusOffline: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusOfflineText: {
    fontSize: 10,
    color: '#b45309',
    fontWeight: '700',
  },
  verificationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  }
});
