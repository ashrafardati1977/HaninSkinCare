import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';

export interface Option {
  value: string;
  label: string;
  color?: string;
}

interface Props {
  label: string;
  options: Option[];
  value: string | null;
  onChange: (value: string) => void;
  error?: string;
  emptyHint?: string;
}

export function ChipSelect({ label, options, value, onChange, error, emptyHint }: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      {options.length === 0 ? (
        <Text style={styles.hint}>{emptyHint ?? 'Nothing to choose yet.'}</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={option.label}
                onPress={() => onChange(option.value)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                {option.color ? (
                  <View style={[styles.dot, { backgroundColor: option.color }]} />
                ) : null}
                <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs + 2 },
  label: { ...typography.label, color: colors.textMuted, textTransform: 'uppercase' },
  row: { gap: spacing.sm, paddingVertical: 2, paddingRight: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    maxWidth: 240,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dot: { width: 8, height: 8, borderRadius: radius.pill },
  chipText: { ...typography.body, color: colors.text, fontWeight: '500' },
  chipTextSelected: { color: colors.textInverse, fontWeight: '600' },
  hint: { ...typography.caption, color: colors.textMuted },
  error: { ...typography.caption, color: colors.danger },
});
