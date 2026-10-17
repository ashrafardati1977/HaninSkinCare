import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ChipSelect } from '../components/ChipSelect';
import { OptionSheet } from '../components/OptionSheet';
import { TextField } from '../components/TextField';
import { useData } from '../storage/DataProvider';
import { colors, CURRENCIES, radius, spacing, typography } from '../theme';
import { formatMoney } from '../utils/format';

export function SettingsScreen() {
  const {
    settings,
    sessions,
    patients,
    treatmentTypes,
    updateSettings,
    createTreatmentType,
    updateTreatmentType,
    deleteTreatmentType,
    loadSampleData,
    resetAll,
  } = useData();

  const [currencySheet, setCurrencySheet] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypePrice, setNewTypePrice] = useState('');
  const [newTypeDuration, setNewTypeDuration] = useState('60');
  const [formError, setFormError] = useState<string | undefined>();
  const [editingId, setEditingId] = useState<string | null>(null);

  const addType = () => {
    const name = newTypeName.trim();
    const price = Number(newTypePrice.replace(/[^0-9.]/g, ''));
    const duration = Number(newTypeDuration.replace(/[^0-9]/g, ''));

    if (name.length < 2) return setFormError('Enter a treatment name.');
    if (treatmentTypes.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      return setFormError('That treatment type already exists.');
    }
    if (!Number.isFinite(price) || price < 0) return setFormError('Enter a valid price.');
    if (!Number.isFinite(duration) || duration <= 0) return setFormError('Enter a valid duration.');

    setFormError(undefined);
    createTreatmentType({
      name,
      defaultPrice: price,
      defaultDurationMinutes: duration,
      color: pickColor(treatmentTypes.length),
    });
    setNewTypeName('');
    setNewTypePrice('');
    setNewTypeDuration('60');
  };

  const confirmReset = () => {
    const run = () => resetAll();
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (typeof window !== 'undefined' && window.confirm('Delete all sessions, patients and settings?')) run();
      return;
    }
    Alert.alert('Delete everything', 'All sessions, patients and settings will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete all', style: 'destructive', onPress: run },
    ]);
  };

  const confirmLoadSample = () => {
    const run = () => loadSampleData();
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (typeof window !== 'undefined' && window.confirm('Replace current data with sample data?')) run();
      return;
    }
    Alert.alert('Load sample data', 'This replaces all current data with a demo dataset.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Load', onPress: run },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Settings</Text>

      <Card title="Clinic">
        <TextField
          label="Clinic name"
          value={settings.clinicName}
          onChangeText={(clinicName) => updateSettings({ clinicName })}
          placeholder="Hanin Skincare"
        />
        <View style={styles.currencyRow}>
          <Text style={styles.currencyLabel}>Currency</Text>
          <Pressable
            onPress={() => setCurrencySheet(true)}
            accessibilityRole="button"
            accessibilityLabel={`Currency ${settings.currency}`}
            style={styles.currencyButton}
          >
            <Text style={styles.currencyValue}>{settings.currency}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </Pressable>
        </View>
        <Text style={styles.preview}>
          Prices show as {formatMoney(450, settings.currency)}
        </Text>
      </Card>

      <Card title="Types of session">
        <Text style={styles.hint}>
          These fill the "type of session" choices and set the default price and length.
        </Text>

        {treatmentTypes.map((type) => {
          const editing = editingId === type.id;
          return (
            <View key={type.id} style={styles.typeRow}>
              <View style={[styles.typeSwatch, { backgroundColor: type.color }]} />
              <View style={styles.typeBody}>
                <Text style={styles.typeName}>{type.name}</Text>
                <Text style={styles.typeMeta}>
                  {formatMoney(type.defaultPrice, settings.currency)} · {type.defaultDurationMinutes} min
                </Text>
              </View>
              <Pressable
                onPress={() => setEditingId(editing ? null : type.id)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${type.name}`}
              >
                <Ionicons
                  name={editing ? 'chevron-up' : 'create-outline'}
                  size={19}
                  color={colors.textMuted}
                />
              </Pressable>
              <Pressable
                onPress={() => deleteTreatmentType(type.id)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${type.name}`}
              >
                <Ionicons name="trash-outline" size={19} color={colors.danger} />
              </Pressable>

              {editing ? (
                <View style={styles.editBox}>
                  <TextField
                    label="Name"
                    value={type.name}
                    onChangeText={(name) => updateTreatmentType(type.id, { name })}
                  />
                  <View style={styles.row}>
                    <TextField
                      label="Default price"
                      value={String(type.defaultPrice)}
                      onChangeText={(value) =>
                        updateTreatmentType(type.id, {
                          defaultPrice: Number(value.replace(/[^0-9.]/g, '')) || 0,
                        })
                      }
                      keyboardType="decimal-pad"
                      suffix={settings.currency}
                      style={styles.flex}
                    />
                    <TextField
                      label="Minutes"
                      value={String(type.defaultDurationMinutes)}
                      onChangeText={(value) =>
                        updateTreatmentType(type.id, {
                          defaultDurationMinutes: Number(value.replace(/[^0-9]/g, '')) || 0,
                        })
                      }
                      keyboardType="number-pad"
                      style={styles.flex}
                    />
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}

        <View style={styles.addBox}>
          <Text style={styles.addTitle}>Add a treatment type</Text>
          <TextField
            label="Name"
            value={newTypeName}
            onChangeText={(t) => {
              setNewTypeName(t);
              setFormError(undefined);
            }}
            placeholder="e.g. LED Light Therapy"
          />
          <View style={styles.row}>
            <TextField
              label="Default price"
              value={newTypePrice}
              onChangeText={(t) => {
                setNewTypePrice(t);
                setFormError(undefined);
              }}
              keyboardType="decimal-pad"
              placeholder="0"
              suffix={settings.currency}
              style={styles.flex}
            />
            <TextField
              label="Minutes"
              value={newTypeDuration}
              onChangeText={(t) => {
                setNewTypeDuration(t);
                setFormError(undefined);
              }}
              keyboardType="number-pad"
              style={styles.flex}
            />
          </View>
          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          <Button label="Add treatment type" variant="secondary" icon="add" onPress={addType} />
        </View>
      </Card>

      <Card title="Data">
        <Text style={styles.hint}>
          {sessions.length} sessions · {patients.length} patients. Stored on this device only.
        </Text>
        <Button label="Load sample data" variant="ghost" icon="download-outline" onPress={confirmLoadSample} />
        <Button label="Delete all data" variant="danger" icon="trash-outline" onPress={confirmReset} />
      </Card>

      <Text style={styles.version}>Hanin Skincare · v1.0.0</Text>

      <OptionSheet
        visible={currencySheet}
        title="Currency"
        options={[...CURRENCIES]}
        onSelect={(currency) => updateSettings({ currency })}
        onClose={() => setCurrencySheet(false)}
      />
    </ScrollView>
  );
}

const PALETTE = ['#B8446A', '#4A6FA5', '#C77A21', '#7A4AA5', '#2F8E7A', '#C0392B', '#6F8F7B'];

function pickColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  heading: { ...typography.display, color: colors.text },
  currencyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  currencyLabel: { ...typography.label, color: colors.textMuted, textTransform: 'uppercase' },
  currencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  currencyValue: { ...typography.heading, color: colors.text },
  preview: { ...typography.caption, color: colors.textMuted },
  hint: { ...typography.caption, color: colors.textMuted },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  typeSwatch: { width: 12, height: 12, borderRadius: radius.pill },
  typeBody: { flex: 1, gap: 1 },
  typeName: { ...typography.body, color: colors.text, fontWeight: '600' },
  typeMeta: { ...typography.caption, color: colors.textMuted },
  editBox: { width: '100%', gap: spacing.md, paddingBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  addBox: { gap: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  addTitle: { ...typography.heading, color: colors.text },
  error: { ...typography.caption, color: colors.danger },
  version: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});
