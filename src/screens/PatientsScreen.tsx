import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { useData } from '../storage/DataProvider';
import { colors, radius, shadow, spacing, typography } from '../theme';
import type { Patient, Session } from '../types';
import type { RootStackParamList, TabParamList } from '../navigation/types';
import { formatMoney } from '../utils/format';
import { formatDate } from '../utils/date';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Patients'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function PatientsScreen({ navigation }: Props) {
  const { patients, sessions, settings, deletePatient } = useData();
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const statsByPatient = useMemo(() => {
    const map = new Map<string, { count: number; spent: number; last?: Session }>();
    for (const session of sessions) {
      const entry = map.get(session.patientId) ?? { count: 0, spent: 0 };
      entry.count += 1;
      entry.spent += session.price;
      if (!entry.last || new Date(session.startAt) > new Date(entry.last.startAt)) {
        entry.last = session;
      }
      map.set(session.patientId, entry);
    }
    return map;
  }, [sessions]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return patients
      .filter((p) => (needle ? p.name.toLowerCase().includes(needle) : true))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [patients, query]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.heading}>Patients</Text>
        <Text style={styles.summary}>{patients.length} total</Text>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search patients"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Search patients"
            style={styles.searchInput}
          />
          {query.length > 0 ? (
            <Ionicons name="close-circle" size={18} color={colors.textMuted} onPress={() => setQuery('')} />
          ) : null}
        </View>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title={patients.length === 0 ? 'No patients yet' : 'No matching patients'}
            message={
              patients.length === 0
                ? 'Add a patient to keep their sessions, prices and history together.'
                : 'Try a different name.'
            }
            actionLabel={patients.length === 0 ? 'Add a patient' : undefined}
            onAction={patients.length === 0 ? () => navigation.navigate('PatientForm', {}) : undefined}
          />
        ) : (
          filtered.map((patient) => (
            <PatientRow
              key={patient.id}
              patient={patient}
              currency={settings.currency}
              stats={statsByPatient.get(patient.id)}
              expanded={expandedId === patient.id}
              onToggle={() => setExpandedId(expandedId === patient.id ? null : patient.id)}
              onAddSession={() => navigation.navigate('SessionForm', { patientId: patient.id })}
              onEdit={() => navigation.navigate('PatientForm', { patientId: patient.id })}
              onDelete={() => deletePatient(patient.id)}
            />
          ))
        )}
      </ScrollView>

      <View style={styles.fabWrap} pointerEvents="box-none">
        <Button
          label="Add patient"
          icon="person-add-outline"
          fullWidth={false}
          onPress={() => navigation.navigate('PatientForm', {})}
          style={styles.fab}
        />
      </View>
    </View>
  );
}

function PatientRow({
  patient,
  currency,
  stats,
  expanded,
  onToggle,
  onAddSession,
  onEdit,
  onDelete,
}: {
  patient: Patient;
  currency: string;
  stats?: { count: number; spent: number; last?: Session };
  expanded: boolean;
  onToggle: () => void;
  onAddSession: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Pressable onPress={onToggle} accessibilityRole="button" style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(patient.name)}</Text>
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowHeader}>
          <Text style={styles.name} numberOfLines={1}>
            {patient.name}
          </Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textMuted}
          />
        </View>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {stats ? `${stats.count} session${stats.count === 1 ? '' : 's'} · ${formatMoney(stats.spent, currency)}` : 'No sessions yet'}
        </Text>
        {stats?.last ? (
          <Text style={styles.rowMeta} numberOfLines={1}>
            Last: {formatDate(new Date(stats.last.startAt))}
          </Text>
        ) : null}

        {expanded ? (
          <View style={styles.expanded}>
            {patient.phone ? (
              <InfoLine icon="call-outline" text={patient.phone} />
            ) : null}
            {patient.email ? (
              <InfoLine icon="mail-outline" text={patient.email} />
            ) : null}
            <InfoLine icon="calendar-outline" text={`Added ${formatDate(new Date(patient.createdAt))}`} />

            <View style={styles.rowActions}>
              <Button
                label="New session"
                variant="secondary"
                icon="add"
                fullWidth={false}
                onPress={onAddSession}
                style={styles.smallButton}
              />
              <Button
                label="Edit"
                variant="ghost"
                icon="create-outline"
                fullWidth={false}
                onPress={onEdit}
                style={styles.smallButton}
              />
              <Button
                label="Delete"
                variant="danger"
                icon="trash-outline"
                fullWidth={false}
                onPress={onDelete}
                style={styles.smallButton}
              />
            </View>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function InfoLine({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.infoLine}>
      <Ionicons name={icon} size={15} color={colors.textMuted} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
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
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typography.heading, color: colors.primaryDark },
  rowBody: { flex: 1, gap: spacing.xs },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  name: { ...typography.heading, color: colors.text, flex: 1 },
  rowMeta: { ...typography.caption, color: colors.textMuted },
  expanded: { gap: spacing.sm, marginTop: spacing.sm },
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoText: { ...typography.caption, color: colors.textMuted, flex: 1 },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  smallButton: { paddingHorizontal: spacing.lg, minHeight: 42 },
  fabWrap: { position: 'absolute', left: 0, right: 0, bottom: spacing.lg, alignItems: 'center' },
  fab: { paddingHorizontal: spacing.xl, borderRadius: radius.pill },
});
