import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

interface Props {
  label: string;
  tone?: Tone;
  dotColor?: string;
}

export function Badge({ label, tone = 'neutral', dotColor }: Props) {
  const palette = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.background }]}>
      {dotColor ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

const TONES: Record<Tone, { background: string; text: string }> = {
  neutral: { background: colors.surfaceMuted, text: colors.textMuted },
  primary: { background: colors.primarySoft, text: colors.primaryDark },
  success: { background: colors.accentSoft, text: colors.accent },
  warning: { background: colors.warningSoft, text: colors.warning },
  danger: { background: colors.dangerSoft, text: colors.danger },
  info: { background: colors.infoSoft, text: colors.info },
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  dot: { width: 7, height: 7, borderRadius: radius.pill },
  label: { ...typography.caption, fontWeight: '600' },
});
