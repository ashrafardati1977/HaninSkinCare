import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { Session } from '../types';
import { colors, radius, shadow, spacing, typography } from '../theme';
import { formatDuration, formatTime, relativeDayLabel } from '../utils/date';
import { formatMoney, getSessionStatus, STATUS_LABEL } from '../utils/format';
import { Badge } from './Badge';

interface Props {
  session: Session;
  currency: string;
  onPress: () => void;
  onTogglePaid?: () => void;
}

export function SessionCard({ session, currency, onPress, onTogglePaid }: Props) {
  const startAt = new Date(session.startAt);
  const endAt = new Date(session.endAt);
  const status = getSessionStatus(session);

  const statusTone =
    status === 'completed' ? 'neutral' : status === 'in-progress' ? 'warning' : 'info';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${session.patientName}, ${session.typeName}, ${STATUS_LABEL[status]}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.patient} numberOfLines={1}>
            {session.patientName}
          </Text>
          <View style={styles.typeRow}>
            <View style={[styles.typeDot, { backgroundColor: typeAccent(session.typeName) }]} />
            <Text style={styles.type} numberOfLines={1}>
              {session.typeName}
            </Text>
          </View>
        </View>
        <Text style={styles.price}>{formatMoney(session.price, currency)}</Text>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="time-outline" size={15} color={colors.textMuted} />
        <Text style={styles.metaText} numberOfLines={1}>
          {relativeDayLabel(startAt)} · {formatTime(startAt)} – {formatTime(endAt)}
        </Text>
        <Text style={styles.duration}>{formatDuration(startAt, endAt)}</Text>
      </View>

      <View style={styles.footer}>
        <Badge label={STATUS_LABEL[status]} tone={statusTone} />
        <Pressable
          onPress={onTogglePaid}
          disabled={!onTogglePaid}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={session.paid ? 'Mark as unpaid' : 'Mark as paid'}
        >
          <Badge
            label={session.paid ? 'Paid' : 'Unpaid'}
            tone={session.paid ? 'success' : 'danger'}
          />
        </Pressable>
      </View>
    </Pressable>
  );
}

/** Stable pseudo-random accent so a treatment type keeps the same colour everywhere. */
function typeAccent(name: string): string {
  const palette = ['#B8446A', '#4A6FA5', '#C77A21', '#7A4AA5', '#2F8E7A', '#C0392B', '#6F8F7B'];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 997;
  return palette[hash % palette.length];
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.card,
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.995 }] },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  headerText: { flex: 1, gap: spacing.xs },
  patient: { ...typography.heading, color: colors.text },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  typeDot: { width: 8, height: 8, borderRadius: radius.pill },
  type: { ...typography.body, color: colors.textMuted, flexShrink: 1 },
  price: { ...typography.heading, color: colors.primaryDark },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaText: { ...typography.caption, color: colors.textMuted, flexShrink: 1 },
  duration: { ...typography.caption, color: colors.textMuted, marginLeft: 'auto' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
