import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';

export const ADMIN_ACCOUNTS = [
  { id: 'admin1', email: 'admin1@mdoner.gov.in', name: 'Officer Assam (Haflong Sector)', region: 'Assam & NC Hills' },
  { id: 'admin2', email: 'admin2@mdoner.gov.in', name: 'Officer Meghalaya (Shillong Sector)', region: 'Shillong Plateau' },
  { id: 'admin3', email: 'admin3@mdoner.gov.in', name: 'Officer Mizoram (Aizawl Sector)', region: 'Mizo Hills' },
  { id: 'admin4', email: 'admin4@mdoner.gov.in', name: 'Officer Nagaland (Kohima Sector)', region: 'Naga Hills' },
  { id: 'admin5', email: 'admin5@mdoner.gov.in', name: 'Officer Manipur (Imphal Sector)', region: 'Manipur Basin' },
  { id: 'admin6', email: 'admin6@mdoner.gov.in', name: 'Officer Arunachal (Itanagar Sector)', region: 'Eastern Himalayas' },
  { id: 'admin7', email: 'admin7@mdoner.gov.in', name: 'Central GIS Command Chief', region: 'MDoNER HQ Headquarters' },
];

export default function LoginScreen({ onLoginSuccess }) {
  const [role, setRole] = useState('CITIZEN'); // 'CITIZEN' | 'ADMIN'
  const [gmailAddress, setGmailAddress] = useState('nirrmalg21@gmail.com');
  const [selectedAdminId, setSelectedAdminId] = useState('admin1');
  const [adminPassword, setAdminPassword] = useState('admin123');

  const handleCitizenSubmit = () => {
    const cleanEmail = gmailAddress.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      Alert.alert('Gmail Required', 'Please enter a valid Gmail address (e.g., nirrmalg21@gmail.com).');
      return;
    }

    onLoginSuccess({
      role: 'CITIZEN',
      email: cleanEmail,
      name: cleanEmail.split('@')[0],
      id: `citizen_${cleanEmail}`
    });
  };

  const handleAdminSubmit = (adminObj) => {
    const targetAdmin = adminObj || ADMIN_ACCOUNTS.find(a => a.id === selectedAdminId) || ADMIN_ACCOUNTS[0];
    if (!adminPassword || adminPassword !== 'admin123') {
      Alert.alert('Authentication Failed', 'Incorrect admin passcode.');
      return;
    }

    onLoginSuccess({
      role: 'ADMIN',
      email: targetAdmin.email,
      name: targetAdmin.name,
      region: targetAdmin.region,
      id: targetAdmin.id
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Branding Banner */}
        <View style={styles.brandHeader}>
          <View style={styles.emblemCircle}>
            <Text style={styles.emblemText}>🏛️</Text>
          </View>
          <Text style={styles.govTitle}>GOVERNMENT OF INDIA</Text>
          <Text style={styles.deptTitle}>Ministry of Development of North Eastern Region</Text>
          <Text style={styles.appName}>Landslide Risk Monitoring Platform</Text>
        </View>

        {/* Card Container */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Portal User Authentication</Text>
          <Text style={styles.cardHeaderSub}>Every account maintains isolated field report records</Text>

          {/* Role Switcher Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, role === 'CITIZEN' && styles.tabActive]}
              onPress={() => setRole('CITIZEN')}
            >
              <Text style={[styles.tabText, role === 'CITIZEN' && styles.tabTextActive]}>
                👤 Citizen Login (Gmail)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, role === 'ADMIN' && styles.tabActiveAdmin]}
              onPress={() => setRole('ADMIN')}
            >
              <Text style={[styles.tabText, role === 'ADMIN' && styles.tabTextActiveAdmin]}>
                🛡️ Admin Login (7 Portal Accounts)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Citizen Login Form */}
          {role === 'CITIZEN' ? (
            <View style={styles.formSection}>
              <View style={styles.badgeInfo}>
                <Text style={styles.badgeInfoText}>
                  📧 Login with your Gmail account. Reports submitted under your Gmail address are stored in your personal account history and synced to Supabase.
                </Text>
              </View>

              <Text style={styles.inputLabel}>Enter Gmail Address:</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. nirrmalg21@gmail.com"
                placeholderTextColor="#94a3b8"
                value={gmailAddress}
                onChangeText={setGmailAddress}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* Preset Sample Gmail Shortcuts */}
              <Text style={styles.presetLabel}>Quick Select Sample Gmail Accounts:</Text>
              <View style={styles.presetRow}>
                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() => setGmailAddress('nirrmalg21@gmail.com')}
                >
                  <Text style={styles.presetChipText}>nirrmalg21@gmail.com</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() => setGmailAddress('citizen.haflong@gmail.com')}
                >
                  <Text style={styles.presetChipText}>citizen.haflong@gmail.com</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={handleCitizenSubmit}>
                <Text style={styles.primaryButtonText}>LOGIN WITH GMAIL ACCOUNT →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Admin Login Form with 7 Pre-configured Admin Accounts */
            <View style={styles.formSection}>
              <View style={styles.adminBadgeInfo}>
                <Text style={styles.adminBadgeInfoText}>
                  🔒 Select 1 of 7 Official MDoNER Administrator Accounts to inspect and verify citizen landslide reports.
                </Text>
              </View>

              <Text style={styles.inputLabel}>Select Official Administrator Account:</Text>
              <View style={styles.adminList}>
                {ADMIN_ACCOUNTS.map((adm) => (
                  <TouchableOpacity
                    key={adm.id}
                    style={[
                      styles.adminCard,
                      selectedAdminId === adm.id && styles.adminCardSelected
                    ]}
                    onPress={() => setSelectedAdminId(adm.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.adminCardName}>{adm.name}</Text>
                      <Text style={styles.adminCardEmail}>{adm.email}</Text>
                      <Text style={styles.adminCardRegion}>📍 Region: {adm.region}</Text>
                    </View>
                    <Text style={styles.adminSelectBadge}>SELECT →</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Admin Passcode:</Text>
              <TextInput
                style={styles.input}
                placeholder="Password (Default: admin123)"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                value={adminPassword}
                onChangeText={setAdminPassword}
              />

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => handleAdminSubmit(ADMIN_ACCOUNTS.find(a => a.id === selectedAdminId) || ADMIN_ACCOUNTS[0])}
              >
                <Text style={styles.primaryButtonText}>LOGIN AS SELECTED ADMIN →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            MDoNER Disaster Portal • Multi-User Isolated Storage & Supabase Cloud Sync
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 48,
    alignItems: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  emblemCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eff6ff',
    borderWidth: 2,
    borderColor: '#bfdbfe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    elevation: 2,
  },
  emblemText: {
    fontSize: 26,
  },
  govTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748b',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  deptTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e3a8a',
    textAlign: 'center',
    marginBottom: 4,
  },
  appName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 20,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  cardHeaderSub: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tabActiveAdmin: {
    backgroundColor: '#1e293b',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#2563eb',
    fontWeight: '800',
  },
  tabTextActiveAdmin: {
    color: '#ffffff',
    fontWeight: '800',
  },
  formSection: {
    width: '100%',
  },
  badgeInfo: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  badgeInfoText: {
    fontSize: 11,
    color: '#1d4ed8',
    lineHeight: 16,
  },
  adminBadgeInfo: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  adminBadgeInfoText: {
    fontSize: 11,
    color: '#b91c1c',
    lineHeight: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    color: '#0f172a',
    marginBottom: 12,
  },
  presetLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  presetChip: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  presetChipText: {
    fontSize: 11,
    color: '#2563eb',
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  adminList: {
    gap: 8,
    marginBottom: 8,
  },
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
  },
  adminCardSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  adminCardName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  adminCardEmail: {
    fontSize: 11,
    color: '#2563eb',
    fontWeight: '600',
  },
  adminCardRegion: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  adminSelectBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
  }
});
