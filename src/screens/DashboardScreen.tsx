import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { SessionCard } from '../components/SessionCard';
import { StatTile } from '../components/StatTile';
import { useData } from '../storage/DataProvider';
import { colors, radius, spacing, typography } from '../theme';
import type { RootStackParamList, TabParamList } from '../navigation/types';
import { addDays, formatDayLabel, isSameDay, startOfDay, startOfWeek } from '../utils/date';
import { formatMoney, getSessionStatus } from '../utils/format';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Dashboard'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function DashboardScreen({ navigation }: Props) {
  const { sessions, patients, settings, toggleSessionPaid } = useData();
  const insets = useSafeAreaInsets();
  const now = new Date();

  const stats = useMemo(() => {
    const today = sessions.filter((s) => isSameDay(new Date(s.startAt), now));
    const weekStart = startOfWeek(now);
    const weekEnd = addDays(weekStart, 7);
    const week = sessions.filter((s) => {
      const start = new Date(s.startAt);
      return start >= weekStart && start < weekEnd;
    });

    const sum = (list: typeof sessions) => list.reduce((total, s) => total + s.price, 0);
    const unpaid = sessions.filter((s) => !s.paid);

    return {
      todayCount: today.length,
      todayRevenue: sum(today),
      weekRevenue: sum(week),
      unpaidCount: unpaid.length,
      unpaidAmount: sum(unpaid),
      today,
    };
  }, [sessions, now]);

  const upcoming = useMemo(
    () =>
      sessions
        .filter((s) => getSessionStatus(s, now) !== 'completed')
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
        .slice(0, 4),
    [sessions, now],
  );

  const recent = useMemo(
    () =>
      sessions
        .filter((s) => getSessionStatus(s, now) === 'completed')
        .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
        .slice(0, 3),
    [sessions, now],
  );

  const todaySorted = useMemo(
    () =>
      [...stats.today].sort(
        (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
      ),
    [stats.today],
  );

  const hasData = sessions.length > 0 || patients.length > 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm }]}
    >
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.greeting}>{settings.clinicName}</Text>
          <Text style={styles.heroDate}>{formatDayLabel(now)}</Text>
        </View>
        <View style={styles.heroIcon}>
          <Ionicons name="sparkles" size={20} color={colors.primary} />
        </View>
      </View>

      <Card>
        <Text style={styles.sectionLabel}>Today at a glance</Text>
        <View style={styles.statRow}>
          <StatTile label="Sessions" value={String(stats.todayCount)} />
          <View style={styles.divider} />
          <StatTile
            label="Expected"
            value={formatMoney(stats.todayRevenue, settings.currency)}
          />
        </View>
        <View style={styles.statRow}>
          <StatTile
            label="This week"
            value={formatMoney(stats.weekRevenue, settings.currency)}
            tone="positive"
          />
          <View style={styles.divider} />
          <StatTile
            label="Unpaid"
            value={formatMoney(stats.unpaidAmount, settings.currency)}
            tone={stats.unpaidCount > 0 ? 'default' : 'muted'}
          />
        </View>
        <Button
          label="Add a session"
          icon="add-circle-outline"
          onPress={() => navigation.navigate('SessionForm', {})}
        />
      </Card>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's schedule</Text>
        {todaySorted.length === 0 ? (
          <Card>
            <EmptyState
              icon="calendar-outline"
              title="Nothing booked today"
              message="Book a session to see the day's schedule here."
              actionLabel="New session"
              onAction={() => navigation.navigate('SessionForm', {})}
            />
          </Card>
        ) : (
          todaySorted.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              currency={settings.currency}
              onPress={() => navigation.navigate('SessionDetail', { sessionId: session.id })}
              onTogglePaid={() => toggleSessionPaid(session.id)}
            />
          ))
        )}
      </View>

      {upcoming.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coming up</Text>
          {upcoming.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              currency={settings.currency}
              onPress={() => navigation.navigate('SessionDetail', { sessionId: session.id })}
              onTogglePaid={() => toggleSessionPaid(session.id)}
            />
          ))}
        </View>
      ) : null}

      {recent.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recently completed</Text>
          {recent.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              currency={settings.currency}
              onPress={() => navigation.navigate('SessionDetail', { sessionId: session.id })}
              onTogglePaid={() => toggleSessionPaid(session.id)}
            />
          ))}
        </View>
      ) : null}

      {!hasData ? (
        <Card>
          <EmptyState
            icon="folder-open-outline"
            title="No data yet"
            message="Add your first session, or load sample data from Settings to explore the app."
            actionLabel="Add a session"
            onAction={() => navigation.navigate('SessionForm', {})}
          />
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroText: { flex: 1, gap: 2 },
  greeting: { ...typography.display, color: colors.text },
  heroDate: { ...typography.body, color: colors.textMuted },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: { ...typography.label, color: colors.textMuted, textTransform: 'uppercase' },
  statRow: { flexDirection: 'row', alignItems: 'center' },
  divider: { width: 1, height: 34, backgroundColor: colors.border },
  section: { gap: spacing.md },
  sectionTitle: { ...typography.title, color: colors.text },
});
