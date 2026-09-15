import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, ScrollView } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { OfflineSyncEngine } from '../services/OfflineSyncEngine';

export default function FieldReportScreen() {
  const [description, setDescription] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default coordinate location for demonstration (Haflong Mountain Sector, Dima Hasao, Assam)
  const mockGeoLatitude = 25.18;
  const mockGeoLongitude = 93.02;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(!!state.isConnected);
    });
    OfflineSyncEngine.initializeNetworkObserver();
    return () => unsubscribe();
  }, []);

  const handleReportDispatch = async () => {
    if (!description.trim()) {
      Alert.alert('Validation Error', 'Please supply structural descriptions detailing visible slope or highway damage.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await OfflineSyncEngine.queueReport(
        description,
        mockGeoLatitude,
        mockGeoLongitude,
        "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80"
      );

      if (result.success) {
        if (!isOnline) {
          Alert.alert(
            'Offline Safeguard Active',
            'No cellular data channels available. Your report has been securely cached in the local offline queue and will upload automatically once cellular connection is restored.'
          );
        } else {
          Alert.alert('Report Transmitted', 'Hazard telemetry streamed successfully to MDoNER Central Command.');
        }
        setDescription('');
      }
    } catch (error) {
      Alert.alert('System Fault', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Network Status Banner */}
      <View style={styles.statusRibbon}>
        <View style={[styles.statusDot, { backgroundColor: isOnline ? '#10b981' : '#f43f5e' }]} />
        <Text style={styles.statusText}>
          CONNECTIVITY: {isOnline ? 'ONLINE (LIVE LINK)' : 'OFFLINE (SAFE LOCAL QUEUE ACTIVE)'}
        </Text>
      </View>

      <Text style={styles.title}>MDoNER Field Report</Text>
      <Text style={styles.subtitle}>Geotagged Landslide & Fracture Incident Ingestion</Text>

      <View style={styles.coordBox}>
        <Text style={styles.coordLabel}>GPS Coordinates (WGS84):</Text>
        <Text style={styles.coordValue}>{mockGeoLatitude}° N, {mockGeoLongitude}° E (Haflong / NH-27)</Text>
      </View>

      <TextInput
        style={styles.textInput}
        multiline
        numberOfLines={5}
        placeholder="Describe visible ground movement (e.g. tension crack across road shoulder, seepage, boulder rolling, retaining wall displacement)..."
        placeholderTextColor="#64748b"
        value={description}
        onChangeText={setDescription}
      />

      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: isOnline ? '#4f46e5' : '#d97706' }]}
        onPress={handleReportDispatch}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>
            {isOnline ? 'TRANSMIT REPORT TO GIS HUB' : 'SAVE TO OFFLINE QUEUE'}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#030712',
    padding: 24,
    justifyContent: 'center'
  },
  statusRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1f2937',
    marginBottom: 20
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8
  },
  statusText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: 'bold'
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 16
  },
  coordBox: {
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16
  },
  coordLabel: {
    fontSize: 10,
    color: '#6366f1',
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  coordValue: {
    fontSize: 12,
    color: '#e2e8f0',
    fontFamily: 'monospace',
    marginTop: 2
  },
  textInput: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 14,
    color: '#f1f5f9',
    textAlignVertical: 'top',
    minHeight: 120,
    marginBottom: 20,
    fontSize: 13
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5
  },
  btnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5
  }
});
