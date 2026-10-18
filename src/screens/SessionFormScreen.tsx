import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ChipSelect } from '../components/ChipSelect';
import { DateTimeField } from '../components/DateTimeField';
import { TextField } from '../components/TextField';
import { useData } from '../storage/DataProvider';
import { colors, radius, spacing, typography } from '../theme';
import type { SessionInput } from '../types';
import {
  addMinutes,
  combineDateTime,
  formatDate,
  formatDuration,
  formatTime,
  toDateInputValue,
  toTimeInputValue,
} from '../utils/date';
import { formatMoney, currencySymbol } from '../utils/format';
import type { RootStackScreenProps } from '../navigation/props';

type Props = RootStackScreenProps<'SessionForm'>;

interface FormErrors {
  patient?: string;
  type?: string;
  start?: string;
  end?: string;
  price?: string;
}

const NEW_PATIENT = '__new_patient__';

export function SessionFormScreen({ route, navigation }: Props) {
  const {
    sessions,
    patients,
    treatmentTypes,
    settings,
    createSession,
    updateSession,
    createPatient,
  } = useData();

  const sessionId = route.params?.sessionId;
  const existing = sessionId ? sessions.find((s) => s.id === sessionId) : undefined;

  const initialStart = existing ? new Date(existing.startAt) : defaultStart();
  const initialType =
    (existing && treatmentTypes.find((t) => t.id === existing.typeId)) || treatmentTypes[0];
  const initialEnd = existing
    ? new Date(existing.endAt)
    : addMinutes(initialStart, initialType?.defaultDurationMinutes ?? 60);

  const [patientId, setPatientId] = useState<string>(
    existing?.patientId ?? route.params?.patientId ?? patients[0]?.id ?? NEW_PATIENT,
  );
  const [newPatientName, setNewPatientName] = useState('');
  const [typeId, setTypeId] = useState<string | null>(initialType?.id ?? null);
  const [startDate, setStartDate] = useState(initialStart);
  const [startTime, setStartTime] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);
  const [endTime, setEndTime] = useState(initialEnd);
  const [priceText, setPriceText] = useState(
    existing ? String(existing.price) : initialType ? String(initialType.defaultPrice) : '',
  );
  const [paid, setPaid] = useState(existing?.paid ?? false);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [errors, setErrors] = useState<FormErrors>({});

  const selectedType = treatmentTypes.find((t) => t.id === typeId) ?? null;
  const selectedPatient = patients.find((p) => p.id === patientId) ?? null;
  const isNewPatient = patientId === NEW_PATIENT;

  const startAt =
    combineDateTime(toDateInputValue(startDate), toTimeInputValue(startTime)) ?? startDate;
  const endAt = combineDateTime(toDateInputValue(endDate), toTimeInputValue(endTime)) ?? endTime;
  const durationValid = endAt.getTime() > startAt.getTime();

  const patientOptions = useMemo(
    () => patients.map((p) => ({ value: p.id, label: p.name })),
    [patients],
  );

  const typeOptions = useMemo(
    () =>
      treatmentTypes.map((t) => ({
        value: t.id,
        label: `${t.name} · ${formatMoney(t.defaultPrice, settings.currency)}`,
        color: t.color,
      })),
    [treatmentTypes, settings.currency],
  );

  const handleTypeChange = (nextId: string) => {
    setTypeId(nextId);
    setErrors((e) => ({ ...e, type: undefined }));
    const type = treatmentTypes.find((t) => t.id === nextId);
    if (!type || existing) return;
    // For a fresh session, seed the price and end time from the treatment defaults.
    setPriceText(String(type.defaultPrice));
    const nextEnd = addMinutes(startAt, type.defaultDurationMinutes);
    setEndDate(nextEnd);
    setEndTime(nextEnd);
  };

  const handleStartChange = (next: Date, part: 'date' | 'time') => {
    const nextStart = combineDateTime(
      part === 'date' ? toDateInputValue(next) : toDateInputValue(startDate),
      part === 'time' ? toTimeInputValue(next) : toTimeInputValue(startTime),
    );
    if (!nextStart) return;

    if (part === 'date') setStartDate(next);
    else setStartTime(next);

    // Preserve the original duration by shifting the end alongside the start.
    const durationMinutes = Math.max(0, Math.round((endAt.getTime() - startAt.getTime()) / 60_000));
    const nextEnd = addMinutes(nextStart, durationMinutes);
    setEndDate(nextEnd);
    setEndTime(nextEnd);
    setErrors((e) => ({ ...e, start: undefined, end: undefined }));
  };

  const handleEndChange = (next: Date, part: 'date' | 'time') => {
    if (part === 'date') setEndDate(next);
    else setEndTime(next);
    setErrors((e) => ({ ...e, end: undefined }));
  };

  const buildInput = (resolvedPatientId: string, patientName: string): SessionInput | null => {
    const next: FormErrors = {};
    if (isNewPatient) {
      if (newPatientName.trim().length < 2) {
        next.patient = 'Enter the patient name (at least 2 characters).';
      }
    } else if (!selectedPatient) {
      next.patient = 'Choose a patient.';
    }
    if (!selectedType) next.type = 'Choose the type of session.';
    if (!Number.isFinite(startAt.getTime())) next.start = 'Enter a valid start date and time.';
    if (!Number.isFinite(endAt.getTime())) next.end = 'Enter a valid end date and time.';
    else if (!durationValid) next.end = 'End time must be after the start time.';

    const price = Number(priceText.replace(/[^0-9.]/g, ''));
    if (priceText.trim() === '') next.price = 'Enter the session price.';
    else if (!Number.isFinite(price) || price < 0) next.price = 'Price must be a positive number.';

    setErrors(next);
    if (Object.keys(next).length > 0 || !selectedType) return null;

    return {
      patientId: resolvedPatientId,
      patientName,
      typeId: selectedType.id,
      typeName: selectedType.name,
      startAt,
      endAt,
      price,
      paid,
      notes,
    };
  };

  const handleSave = () => {
    // Validate everything first so a new patient is never created on invalid input.
    const probe = buildInput('', '');
    if (!probe) return;

    let resolvedId = patientId;
    let resolvedName = selectedPatient?.name ?? '';
    if (isNewPatient) {
      resolvedName = newPatientName.trim();
      resolvedId = createPatient({ name: resolvedName }).id;
    }

    const input = { ...probe, patientId: resolvedId, patientName: resolvedName };
    if (existing) updateSession(existing.id, input);
    else createSession(input);
    navigation.goBack();
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>{existing ? 'Edit session' : 'New session'}</Text>
      <Text style={styles.subheading}>
        Record the patient, the time window, the price and the type of session.
      </Text>

      <Card title="Patient">
        <ChipSelect
          label="Patient name"
          options={patientOptions}
          value={isNewPatient ? null : patientId}
          onChange={(id) => {
            setPatientId(id);
            setNewPatientName('');
            setErrors((e) => ({ ...e, patient: undefined }));
          }}
          error={isNewPatient ? undefined : errors.patient}
          emptyHint="No patients yet — add a new one below."
        />
        <Button
          label={isNewPatient ? 'Cancel new patient' : 'Add a new patient'}
          variant="ghost"
          icon={isNewPatient ? 'close' : 'person-add-outline'}
          onPress={() => {
            setPatientId(isNewPatient ? patients[0]?.id ?? NEW_PATIENT : NEW_PATIENT);
            setNewPatientName('');
            setErrors((e) => ({ ...e, patient: undefined }));
          }}
        />
        {isNewPatient ? (
          <TextField
            label="New patient name"
            value={newPatientName}
            onChangeText={(t) => {
              setNewPatientName(t);
              setErrors((e) => ({ ...e, patient: undefined }));
            }}
            placeholder="e.g. Layla Al-Harbi"
            autoCapitalize="words"
            error={errors.patient}
          />
        ) : null}
      </Card>

      <Card title="Type of session">
        <ChipSelect
          label="Treatment type"
          options={typeOptions}
          value={typeId}
          onChange={handleTypeChange}
          error={errors.type}
          emptyHint="Add treatment types in Settings first."
        />
        {selectedType ? (
          <View style={styles.typeInfo}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
            <Text style={styles.typeInfoText}>
              Default {formatMoney(selectedType.defaultPrice, settings.currency)} ·{' '}
              {selectedType.defaultDurationMinutes} min
            </Text>
          </View>
        ) : null}
      </Card>

      <Card title="Time">
        <View style={styles.row}>
          <DateTimeField
            label="Start date"
            mode="date"
            value={startDate}
            onChange={(d) => handleStartChange(d, 'date')}
            error={errors.start}
          />
          <DateTimeField
            label="Start time"
            mode="time"
            value={startTime}
            onChange={(d) => handleStartChange(d, 'time')}
          />
        </View>
        <View style={styles.row}>
          <DateTimeField
            label="End date"
            mode="date"
            value={endDate}
            onChange={(d) => handleEndChange(d, 'date')}
            error={errors.end}
          />
          <DateTimeField
            label="End time"
            mode="time"
            value={endTime}
            onChange={(d) => handleEndChange(d, 'time')}
          />
        </View>
        <View style={[styles.durationBar, !durationValid && styles.durationBarInvalid]}>
          <Ionicons
            name={durationValid ? 'hourglass-outline' : 'alert-circle-outline'}
            size={16}
            color={durationValid ? colors.accent : colors.danger}
          />
          <Text style={[styles.durationText, !durationValid && styles.durationTextInvalid]}>
            {durationValid
              ? `${formatDate(startAt)} · ${formatTime(startAt)} – ${formatTime(endAt)} (${formatDuration(startAt, endAt)})`
              : 'End time must be after the start time.'}
          </Text>
        </View>
      </Card>

      <Card title="Price">
        <TextField
          label="Session price"
          value={priceText}
          onChangeText={(t) => {
            setPriceText(t);
            setErrors((e) => ({ ...e, price: undefined }));
          }}
          keyboardType="decimal-pad"
          placeholder="0"
          suffix={currencySymbol(settings.currency)}
          error={errors.price}
        />
        <Pressable
          onPress={() => setPaid((p) => !p)}
          accessibilityRole="switch"
          accessibilityState={{ checked: paid }}
          accessibilityLabel="Paid"
          style={styles.paidRow}
        >
          <Ionicons
            name={paid ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={paid ? colors.accent : colors.textMuted}
          />
          <Text style={styles.paidText}>{paid ? 'Paid' : 'Not paid yet'}</Text>
        </Pressable>
      </Card>

      <Card title="Notes">
        <TextField
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything to remember about this session"
          multiline
        />
      </Card>

      <View style={styles.actions}>
        <Button
          label={existing ? 'Save changes' : 'Add session'}
          onPress={handleSave}
          icon="checkmark"
        />
        <Button label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
      </View>
    </ScrollView>
  );
}

/** Next half hour from now, so a new session rarely starts in the past. */
function defaultStart(): Date {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + (30 - (d.getMinutes() % 30)));
  return d;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  heading: { ...typography.display, color: colors.text },
  subheading: { ...typography.body, color: colors.textMuted, marginTop: -spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  typeInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  typeInfoText: { ...typography.caption, color: colors.textMuted },
  durationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  durationBarInvalid: { backgroundColor: colors.dangerSoft },
  durationText: { ...typography.caption, color: colors.accent, flex: 1 },
  durationTextInvalid: { color: colors.danger },
  paidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  paidText: { ...typography.body, color: colors.text },
  actions: { gap: spacing.md, marginTop: spacing.sm },
});
