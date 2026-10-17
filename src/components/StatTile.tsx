import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme';

interface Props {
  label: string;
  value: string;
  tone?: 'default' | 'positive' | 'muted';
}

export function StatTile({ label, value, tone = 'default' }: Props) {
  const valueColor =
    tone === 'positive' ? colors.accent : tone === 'muted' ? colors.textMuted : colors.text;

  return (
    <View style={styles.tile}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.value, { color: valueColor }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  label: { ...typography.caption, color: colors.textMuted },
  value: { ...typography.title, fontSize: 19 },
});
