import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import CitizenReportScreen from './src/screens/CitizenReportScreen';
import AdminVerifyScreen from './src/screens/AdminVerifyScreen';
import { registerBackgroundSyncWorker } from './src/services/OfflineSyncEngine';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null); // null | { role: 'CITIZEN' | 'ADMIN', name: string }

  useEffect(() => {
    registerBackgroundSyncWorker();
  }, []);

  const handleLoginSuccess = (userSession) => {
    setCurrentUser(userSession);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor="#f8fafc" />
      {!currentUser ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : currentUser.role === 'ADMIN' ? (
        <AdminVerifyScreen user={currentUser} onLogout={handleLogout} />
      ) : (
        <CitizenReportScreen user={currentUser} onLogout={handleLogout} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc', // Professional clean white/light slate background
  },
});
