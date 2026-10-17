import React from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useData } from '../storage/DataProvider';
import { colors, radius, spacing, typography } from '../theme';
import type { RootStackScreenProps } from '../navigation/props';
import { formatDate, formatDuration, formatTime, relativeDayLabel } from '../utils/date';
import { formatMoney, getSessionStatus, STATUS_LABEL } from '../utils/format';

type Props = RootStackScreenProps<'SessionDetail'>;

export function SessionDetailScreen({ route, navigation }: Props) {
  const { sessions, settings, deleteSession, toggleSessionPaid } = useData();
  const session = sessions.find((s) => s.id === route.params.sessionId);

  if (!session) {
    return (
      <View style={styles.missing}>
        <Ionicons name="alert-circle-outline" size={28} color={colors.textMuted} />
        <Text style={styles.missingText}>This session is no longer available.</Text>
        <Button label="Back to sessions" variant="secondary" fullWidth={false} onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const startAt = new Date(session.startAt);
  const endAt = new Date(session.endAt);
  const status = getSessionStatus(session);
  const statusTone = status === 'completed' ? 'neutral' : status === 'in-progress' ? 'warning' : 'info';

  const confirmDelete = () => {
    const remove = () => {
      deleteSession(session.id);
      navigation.goBack();
    };
    if (Platform.OS === 'web') {
      // Alert with buttons is a no-op on web, so use the browser confirm dialog.
      // eslint-disable-next-line no-alert
      if (typeof window !== 'undefined' && window.confirm('Delete this session?')) remove();
      return;
    }
    Alert.alert('Delete session', `Remove the ${session.typeName} session for ${session.patientName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: remove },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        <View style={styles.titleRow}>
          <View style={styles.titleText}>
            <Text style={styles.patient}>{session.patientName}</Text>
            <Text style={styles.type}>{session.typeName}</Text>
          </View>
          <Text style={styles.price}>{formatMoney(session.price, settings.currency)}</Text>
        </View>
        <View style={styles.badgeRow}>
          <Badge label={STATUS_LABEL[status]} tone={statusTone} />
          <Badge label={session.paid ? 'Paid' : 'Unpaid'} tone={session.paid ? 'success' : 'danger'} />
        </View>
      </Card>

      <Card title="Details">
        <DetailRow icon="calendar-outline" label="Day" value={`${relativeDayLabel(startAt)} · ${formatDate(startAt)}`} />
        <DetailRow icon="play-outline" label="Start session" value={formatTime(startAt)} />
        <DetailRow icon="stop-outline" label="End session" value={formatTime(endAt)} />
        <DetailRow icon="hourglass-outline" label="Duration" value={formatDuration(startAt, endAt)} />
        <DetailRow icon="pricetag-outline" label="Price" value={formatMoney(session.price, settings.currency)} />
        <DetailRow icon="grid-outline" label="Type of session" value={session.typeName} />
        {session.notes ? <DetailRow icon="document-text-outline" label="Notes" value={session.notes} /> : null}
      </Card>

      <View style={styles.actions}>
        <Button
          label={session.paid ? 'Mark as unpaid' : 'Mark as paid'}
          variant="secondary"
          icon={session.paid ? 'close-circle-outline' : 'checkmark-circle-outline'}
          onPress={() => toggleSessionPaid(session.id)}
        />
        <Button
          label="Edit session"
          icon="create-outline"
          onPress={() => navigation.navigate('SessionForm', { sessionId: session.id })}
        />
        <Button label="Delete" variant="danger" icon="trash-outline" onPress={confirmDelete} />
      </View>
    </ScrollView>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={styles.detailText}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  titleText: { flex: 1, gap: spacing.xs },
  patient: { ...typography.title, color: colors.text },
  type: { ...typography.body, color: colors.textMuted },
  price: { ...typography.title, color: colors.primaryDark },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailText: { flex: 1, gap: 1 },
  detailLabel: { ...typography.caption, color: colors.textMuted },
  detailValue: { ...typography.body, color: colors.text, fontWeight: '500' },
  actions: { gap: spacing.md },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  missingText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
