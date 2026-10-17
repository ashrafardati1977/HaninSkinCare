import React, { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '../theme';
import { combineDateTime, formatDate, formatTime, toDateInputValue, toTimeInputValue } from '../utils/date';

interface Props {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  mode: 'date' | 'time';
  error?: string;
  minimumDate?: Date;
}

/**
 * Native pickers render nothing on web, so web falls back to typed input.
 * Everything else uses the platform dialog (Android) or a bottom sheet (iOS).
 */
export function DateTimeField({ label, value, onChange, mode, error, minimumDate }: Props) {
  const isWeb = Platform.OS === 'web';
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value);

  useEffect(() => setDraft(value), [value]);

  const display = mode === 'date' ? formatDate(value) : formatTime(value);

  if (isWeb) {
    return (
      <WebDateTimeInput
        label={label}
        value={value}
        onChange={onChange}
        mode={mode}
        error={error}
      />
    );
  }

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setOpen(false);
      if (event.type === 'set' && selected) onChange(selected);
      return;
    }
    if (selected) setDraft(selected);
  };

  const confirmIos = () => {
    setOpen(false);
    onChange(draft);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${display}`}
        onPress={() => {
          setDraft(value);
          setOpen(true);
        }}
        style={[styles.pressable, !!error && styles.pressableError]}
      >
        <Ionicons
          name={mode === 'date' ? 'calendar-outline' : 'time-outline'}
          size={18}
          color={colors.textMuted}
        />
        <Text style={styles.pressableText}>{display}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          value={value}
          mode={mode}
          display="default"
          minimumDate={minimumDate}
          onChange={handleChange}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <Pressable onPress={confirmIos} accessibilityRole="button" hitSlop={8}>
                <Text style={styles.sheetDone}>Done</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={draft}
              mode={mode}
              display="spinner"
              minimumDate={minimumDate}
              onChange={handleChange}
            />
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

function WebDateTimeInput({
  label,
  value,
  onChange,
  mode,
  error,
}: Omit<Props, 'minimumDate'>) {
  const [text, setText] = useState(mode === 'date' ? toDateInputValue(value) : toTimeInputValue(value));
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setText(mode === 'date' ? toDateInputValue(value) : toTimeInputValue(value));
  }, [value, mode]);

  const commit = (next: string) => {
    setText(next);
    setTouched(true);
    const datePart = mode === 'date' ? next : toDateInputValue(value);
    const timePart = mode === 'date' ? toTimeInputValue(value) : next;
    const parsed = combineDateTime(datePart, timePart);
    if (parsed) onChange(parsed);
  };

  const invalid = touched && !combineDateTime(
    mode === 'date' ? text : toDateInputValue(value),
    mode === 'date' ? toTimeInputValue(value) : text,
  );

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.pressable, (!!error || invalid) && styles.pressableError]}>
        <Ionicons
          name={mode === 'date' ? 'calendar-outline' : 'time-outline'}
          size={18}
          color={colors.textMuted}
        />
        <TextInput
          value={text}
          onChangeText={commit}
          accessibilityLabel={label}
          placeholder={mode === 'date' ? 'YYYY-MM-DD' : 'HH:MM'}
          placeholderTextColor={colors.textMuted}
          style={styles.webInput}
        />
      </View>
      {invalid ? (
        <Text style={styles.error}>
          {mode === 'date' ? 'Use YYYY-MM-DD' : 'Use HH:MM (24h)'}
        </Text>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs + 2 },
  label: { ...typography.label, color: colors.textMuted, textTransform: 'uppercase' },
  pressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 50,
  },
  pressableError: { borderColor: colors.danger },
  pressableText: { ...typography.body, color: colors.text },
  webInput: { flex: 1, ...typography.body, color: colors.text, paddingVertical: spacing.sm },
  error: { ...typography.caption, color: colors.danger },
  backdrop: { flex: 1, backgroundColor: 'rgba(46,34,38,0.35)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sheetTitle: { ...typography.heading, color: colors.text },
  sheetDone: { ...typography.heading, color: colors.primary },
});
