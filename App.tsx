import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LoadingScreen } from './src/components/LoadingScreen';
import { RootNavigator } from './src/navigation/RootNavigator';
import { DataProvider, useData } from './src/storage/DataProvider';

function AppContent() {
  const { ready } = useData();
  if (!ready) return <LoadingScreen label="Loading your data" />;
  return <RootNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <DataProvider>
        <StatusBar style="dark" />
        <AppContent />
      </DataProvider>
    </SafeAreaProvider>
  );
}
