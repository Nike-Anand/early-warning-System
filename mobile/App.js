import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet } from 'react-native';
import FieldReportScreen from './src/screens/FieldReportScreen';
import { registerBackgroundSyncWorker } from './src/services/OfflineSyncEngine';

export default function App() {
  useEffect(() => {
    registerBackgroundSyncWorker();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <FieldReportScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
});
