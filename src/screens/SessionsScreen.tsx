import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '../components/Button';
import { ChipSelect } from '../components/ChipSelect';
import { EmptyState } from '../components/EmptyState';
import { SessionCard } from '../components/SessionCard';
import { useData } from '../storage/DataProvider';
import { colors, radius, spacing, typography } from '../theme';
import type { SessionStatus } from '../types';
import type { RootStackParamList, TabParamList } from '../navigation/types';
import { formatMoney, getSessionStatus } from '../utils/format';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Sessions'>,
  NativeStackScreenProps<RootStackParamList>
>;

type StatusFilter = 'all' | SessionStatus;

export function SessionsScreen({ navigation }: Props) {
  const { sessions, treatmentTypes, settings, toggleSessionPaid } = useData();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [typeId, setTypeId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sessions
      .filter((s) => {
        if (needle && !s.patientName.toLowerCase().includes(needle)) return false;
        if (typeId && s.typeId !== typeId) return false;
        if (status !== 'all' && getSessionStatus(s) !== status) return false;
        return true;
      })
      .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
  }, [sessions, query, typeId, status]);

  const total = filtered.reduce((sum, s) => sum + s.price, 0);
  const unpaid = filtered.filter((s) => !s.paid).reduce((sum, s) => sum + s.price, 0);

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: `All (${sessions.length})` },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'in-progress', label: 'In progress' },
    { value: 'completed', label: 'Completed' },
  ];

  const typeFilterOptions = treatmentTypes.map((t) => ({
    value: t.id,
    label: t.name,
    color: t.color,
  }));

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.heading}>Sessions</Text>
        <Text style={styles.summary}>
          {filtered.length} shown · {formatMoney(total, settings.currency)}
          {unpaid > 0 ? ` · ${formatMoney(unpaid, settings.currency)} unpaid` : ''}
        </Text>

        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by patient name"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Search sessions by patient name"
            style={styles.searchInput}
          />
          {query.length > 0 ? (
            <Ionicons
              name="close-circle"
              size={18}
              color={colors.textMuted}
              onPress={() => setQuery('')}
              accessibilityLabel="Clear search"
            />
          ) : null}
        </View>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.filters}>
          <ChipSelect
            label="Status"
            options={statusOptions}
            value={status}
            onChange={(value) => setStatus(value as StatusFilter)}
          />
          <ChipSelect
            label="Type of session"
            options={typeFilterOptions}
            value={typeId}
            onChange={(value) => setTypeId(typeId === value ? null : value)}
            emptyHint="No treatment types defined."
          />
        </View>

        {filtered.length === 0 ? (
          <EmptyState
            icon="calendar-clear-outline"
            title={sessions.length === 0 ? 'No sessions yet' : 'No matching sessions'}
            message={
              sessions.length === 0
                ? 'Add your first session to start tracking patients, times and prices.'
                : 'Try a different name, status or type of session.'
            }
            actionLabel={sessions.length === 0 ? 'New session' : undefined}
            onAction={
              sessions.length === 0 ? () => navigation.navigate('SessionForm', {}) : undefined
            }
          />
        ) : (
          filtered.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              currency={settings.currency}
              onPress={() => navigation.navigate('SessionDetail', { sessionId: session.id })}
              onTogglePaid={() => toggleSessionPaid(session.id)}
            />
          ))
        )}
      </ScrollView>

      <View style={styles.fabWrap} pointerEvents="box-none">
        <Button
          label="New session"
          icon="add"
          fullWidth={false}
          onPress={() => navigation.navigate('SessionForm', {})}
          style={styles.fab}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.sm },
  heading: { ...typography.display, color: colors.text },
  summary: { ...typography.caption, color: colors.textMuted },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    minHeight: 46,
    marginTop: spacing.sm,
  },
  searchInput: { flex: 1, ...typography.body, color: colors.text },
  list: { flex: 1 },
  listContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
  filters: { gap: spacing.md, marginBottom: spacing.xs },
  fabWrap: { position: 'absolute', left: 0, right: 0, bottom: spacing.lg, alignItems: 'center' },
  fab: { paddingHorizontal: spacing.xl, borderRadius: radius.pill },
});
