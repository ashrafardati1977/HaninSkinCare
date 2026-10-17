import React from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { DashboardScreen } from '../screens/DashboardScreen';
import { SessionsScreen } from '../screens/SessionsScreen';
import { SessionDetailScreen } from '../screens/SessionDetailScreen';
import { SessionFormScreen } from '../screens/SessionFormScreen';
import { PatientsScreen } from '../screens/PatientsScreen';
import { PatientFormScreen } from '../screens/PatientFormScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { colors, typography } from '../theme';
import type { RootStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<keyof TabParamList, keyof typeof Ionicons.glyphMap> = {
  Dashboard: 'home-outline',
  Sessions: 'calendar-outline',
  Patients: 'people-outline',
  Settings: 'settings-outline',
};

function TabsNavigator() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name]} size={size} color={color} />
        ),
      })}
    >
      <Tabs.Screen name="Dashboard" component={DashboardScreen} />
      <Tabs.Screen name="Sessions" component={SessionsScreen} />
      <Tabs.Screen name="Patients" component={PatientsScreen} />
      <Tabs.Screen name="Settings" component={SettingsScreen} />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: styles.header,
          headerTitleStyle: styles.headerTitle,
          headerTintColor: colors.primary,
          headerShadowVisible: false,
          contentStyle: styles.content,
        }}
      >
        <Stack.Screen name="Tabs" component={TabsNavigator} options={{ headerShown: false }} />
        <Stack.Screen
          name="SessionForm"
          component={SessionFormScreen}
          options={({ route }) => ({
            title: route.params?.sessionId ? 'Edit session' : 'New session',
            presentation: 'modal',
          })}
        />
        <Stack.Screen
          name="SessionDetail"
          component={SessionDetailScreen}
          options={{ title: 'Session' }}
        />
        <Stack.Screen
          name="PatientForm"
          component={PatientFormScreen}
          options={({ route }) => ({
            title: route.params?.patientId ? 'Edit patient' : 'New patient',
            presentation: 'modal',
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.background },
  headerTitle: { ...typography.heading, color: colors.text },
  content: { backgroundColor: colors.background },
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    height: 62,
    paddingTop: 6,
    paddingBottom: 8,
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
});
