import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
  Image,
  TextInput
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { OfflineSyncEngine } from '../services/OfflineSyncEngine';
import { supabase, SUPABASE_REPORTS_TABLE } from '../services/supabaseClient';

export default function AdminVerifyScreen({ user, onLogout }) {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'VERIFIED'
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchReports();
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(!!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // 1. Get all reports from local offline DB across all Gmail users
      const localReports = await OfflineSyncEngine.getLocalReports('ADMIN');

      // 2. Fetch latest online reports from Supabase if online
      const netState = await NetInfo.fetch();
      let combined = [...localReports];

      if (netState.isConnected) {
        try {
          // Try Field_reports (Capital F) first as shown in Supabase Schema Visualizer
          let { data, error } = await supabase
            .from('Field_reports')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) {
            // Fallback to lowercase field_reports
            const res = await supabase
              .from('field_reports')
              .select('*')
              .order('created_at', { ascending: false });
            data = res.data;
          }

          if (data && data.length > 0) {
            data.forEach(remote => {
              if (!combined.some(local => local.id === remote.id)) {
                combined.push({
                  id: remote.id,
                  category: remote.category,
                  severity: remote.severity_estimate,
                  latitude: remote.latitude,
                  longitude: remote.longitude,
                  description: remote.landmark_description,
                  imageBase64: remote.multimedia_url,
                  reporterName: remote.reporter_name,
                  userEmail: remote.user_email || 'citizen@gmail.com',
                  status: remote.status || 'PENDING_VERIFICATION',
                  syncedToSupabase: true,
                  timestamp: remote.created_at
                });
              }
            });
          }
        } catch (e) {
          console.warn('[AdminScreen] Supabase query note:', e.message);
        }
      }

      setReports(combined);
    } catch (err) {
      console.error('[AdminScreen] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyReport = async (reportId, newStatus) => {
    setActionLoading(true);
    try {
      await OfflineSyncEngine.adminVerifyReport(reportId, newStatus, adminNotes);
      Alert.alert(
        newStatus === 'VERIFIED' ? 'Report Verified ✅' : 'Report Rejected ❌',
        `Status updated to ${newStatus} for report ${reportId}.`
      );
      setSelectedReport(null);
      setAdminNotes('');
      await fetchReports();
    } catch (err) {
      Alert.alert('Verification Note', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredReports = reports.filter(item => {
    if (filter === 'PENDING') return item.status !== 'VERIFIED' && item.status !== 'REJECTED';
    if (filter === 'VERIFIED') return item.status === 'VERIFIED';
    return true;
  });

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Admin Top Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>🛡️ OFFICIAL ADMIN COMMAND CENTER</Text>
          </View>
          <Text style={styles.headerTitle}>{user?.name || 'Administrator'}</Text>
          <Text style={styles.headerSub}>
            📧 {user?.email || 'admin@mdoner.gov.in'} | 📍 Region: {user?.region || 'HQ'}
          </Text>
        </View>

        <TouchableOpacity style={styles.switchBtn} onPress={onLogout}>
          <Text style={styles.switchBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Network Ribbon */}
      <View style={styles.networkRibbon}>
        <View style={[styles.dot, { backgroundColor: isOnline ? '#10b981' : '#f59e0b' }]} />
        <Text style={styles.networkText}>
          SUPABASE CLOUD DB CONNECTION: {isOnline ? 'ACTIVE (LIVE SYNC)' : 'OFFLINE MODE'}
        </Text>
        <TouchableOpacity onPress={fetchReports}>
          <Text style={styles.refreshText}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'ALL' && styles.filterActive]}
          onPress={() => setFilter('ALL')}
        >
          <Text style={[styles.filterText, filter === 'ALL' && styles.filterTextActive]}>
            All Reports ({reports.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'PENDING' && styles.filterActive]}
          onPress={() => setFilter('PENDING')}
        >
          <Text style={[styles.filterText, filter === 'PENDING' && styles.filterTextActive]}>
            Pending
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'VERIFIED' && styles.filterActive]}
          onPress={() => setFilter('VERIFIED')}
        >
          <Text style={[styles.filterText, filter === 'VERIFIED' && styles.filterTextActive]}>
            Verified
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#0f172a" />
          <Text style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>Loading field reports across all Gmail accounts...</Text>
        </View>
      ) : filteredReports.length === 0 ? (
        <View style={styles.card}>
          <Text style={{ textAlign: 'center', color: '#64748b', marginVertical: 20 }}>
            No field reports match the selected filter.
          </Text>
        </View>
      ) : (
        filteredReports.map((item) => (
          <View key={item.id} style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Text style={styles.categoryBadge}>{item.category || 'INCIDENT'}</Text>
                  <Text style={[
                    styles.severityBadge,
                    item.severity === 'CRITICAL' || item.severity === 'HIGH' ? { backgroundColor: '#fef2f2', color: '#dc2626' } : { backgroundColor: '#ecfdf5', color: '#047857' }
                  ]}>
                    {item.severity || 'HIGH'}
                  </Text>
                </View>
                <Text style={styles.reportDesc}>{item.description}</Text>
                <Text style={styles.reportMeta}>
                  📧 Gmail: <Text style={{ fontWeight: '800', color: '#2563eb' }}>{item.userEmail || 'citizen@gmail.com'}</Text>
                </Text>
                <Text style={styles.reportMetaSub}>
                  📍 {item.latitude}° N, {item.longitude}° E | 🕒 {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>

              {item.imageBase64 && (
                <Image source={{ uri: item.imageBase64 }} style={styles.reportImage} />
              )}
            </View>

            {/* Verification Status */}
            <View style={styles.statusFooter}>
              <View style={[
                styles.statusTag,
                item.status === 'VERIFIED' ? { backgroundColor: '#dcfce7' } : { backgroundColor: '#fef3c7' }
              ]}>
                <Text style={[
                  styles.statusTagText,
                  item.status === 'VERIFIED' ? { color: '#15803d' } : { color: '#b45309' }
                ]}>
                  {item.status === 'VERIFIED' ? '✅ VERIFIED & PUBLISHED TO GIS' : '⏳ PENDING OFFICIAL VERIFICATION'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.inspectBtn}
                onPress={() => setSelectedReport(selectedReport?.id === item.id ? null : item)}
              >
                <Text style={styles.inspectBtnText}>
                  {selectedReport?.id === item.id ? 'Close Inspection ▲' : 'Inspect Report ▼'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Inspection & Verification Expandable Drawer */}
            {selectedReport?.id === item.id && (
              <View style={styles.inspectionDrawer}>
                <Text style={styles.drawerTitle}>Official Inspection & Assessment</Text>
                {item.imageBase64 && (
                  <Image source={{ uri: item.imageBase64 }} style={styles.fullImagePreview} resizeMode="cover" />
                )}

                <Text style={styles.inputLabel}>Admin Assessment & Inspection Notes:</Text>
                <TextInput
                  style={styles.adminInput}
                  placeholder="Enter assessment notes (e.g. Geotechnical team dispatched to Haflong)..."
                  placeholderTextColor="#94a3b8"
                  value={adminNotes}
                  onChangeText={setAdminNotes}
                  multiline
                />

                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => handleVerifyReport(item.id, 'VERIFIED')}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.actionBtnText}>✅ APPROVE & PUBLISH TO SUPABASE</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => handleVerifyReport(item.id, 'REJECTED')}
                    disabled={actionLoading}
                  >
                    <Text style={styles.actionBtnText}>❌ REJECT REPORT</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ))
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  adminBadge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  adminBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSub: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  switchBtn: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  switchBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  networkRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  networkText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  refreshText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 14,
    marginBottom: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  categoryBadge: {
    backgroundColor: '#f1f5f9',
    color: '#1e293b',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityBadge: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reportDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  reportMeta: {
    fontSize: 11,
    color: '#475569',
  },
  reportMetaSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  reportImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginLeft: 10,
  },
  statusFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  inspectBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  inspectBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  inspectionDrawer: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  drawerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  fullImagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  adminInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    color: '#0f172a',
    minHeight: 60,
    marginBottom: 12,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  approveBtn: {
    flex: 2,
    backgroundColor: '#16a34a',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#dc2626',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  }
});
