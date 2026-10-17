import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '../theme';
import { Button } from './Button';

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  options: string[];
  onSelect: (value: string) => void;
  onClose: () => void;
}

export function OptionSheet({ visible, title, message, options, onSelect, onClose }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const close = () => {
    setSelected(null);
    onClose();
  };

  const confirm = () => {
    if (!selected) return;
    onSelect(selected);
    setSelected(null);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>
        </View>
        {message ? <Text style={styles.message}>{message}</Text> : null}

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {options.map((option) => {
            const isSelected = option === selected;
            return (
              <Pressable
                key={option}
                onPress={() => setSelected(option)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                style={[styles.row, isSelected && styles.rowSelected]}
              >
                <Text style={styles.rowText}>{option}</Text>
                {isSelected ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>

        <Button label="Confirm" onPress={confirm} disabled={!selected} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(46,34,38,0.35)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
    maxHeight: '75%',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.title, color: colors.text },
  message: { ...typography.body, color: colors.textMuted },
  list: { flexGrow: 0 },
  listContent: { gap: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  rowSelected: { backgroundColor: colors.primarySoft },
  rowText: { ...typography.body, color: colors.text, flex: 1 },
});
