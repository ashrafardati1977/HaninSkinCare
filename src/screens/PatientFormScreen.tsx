import React, { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { TextField } from '../components/TextField';
import { useData } from '../storage/DataProvider';
import { colors, spacing, typography } from '../theme';
import type { RootStackScreenProps } from '../navigation/props';

type Props = RootStackScreenProps<'PatientForm'>;

interface FormErrors {
  name?: string;
}

export function PatientFormScreen({ route, navigation }: Props) {
  const { patients, sessions, createPatient, updatePatient, deletePatient } = useData();

  const patientId = route.params?.patientId;
  const existing = patientId ? patients.find((p) => p.id === patientId) : undefined;
  const sessionCount = existing
    ? sessions.filter((s) => s.patientId === existing.id).length
    : 0;

  const [name, setName] = useState(existing?.name ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [errors, setErrors] = useState<FormErrors>({});

  const handleSave = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setErrors({ name: 'Enter the patient name (at least 2 characters).' });
      return;
    }

    const payload = {
      name: trimmed,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (existing) updatePatient(existing.id, payload);
    else createPatient(payload);
    navigation.goBack();
  };

  const handleDelete = () => {
    if (!existing) return;
    const remove = () => {
      deletePatient(existing.id);
      navigation.goBack();
    };
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (typeof window !== 'undefined' && window.confirm(`Delete ${existing.name}?`)) remove();
      return;
    }
    Alert.alert(
      'Delete patient',
      sessionCount > 0
        ? `${existing.name} has ${sessionCount} session${sessionCount === 1 ? '' : 's'}. Those sessions stay in history.`
        : `Remove ${existing.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: remove },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>{existing ? 'Edit patient' : 'New patient'}</Text>
      <Text style={styles.subheading}>
        Contact details are optional but help you reach the patient later.
      </Text>

      <Card>
        <TextField
          label="Patient name"
          value={name}
          onChangeText={(t) => {
            setName(t);
            setErrors({});
          }}
          placeholder="e.g. Layla Al-Harbi"
          autoCapitalize="words"
          error={errors.name}
        />
        <TextField
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          placeholder="+966 55 000 0000"
          keyboardType="phone-pad"
        />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="name@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextField
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Skin type, allergies, preferences"
          multiline
        />
      </Card>

      {existing ? (
        <Card title="History">
          <Text style={styles.history}>
            {sessionCount} session{sessionCount === 1 ? '' : 's'} recorded for this patient.
          </Text>
        </Card>
      ) : null}

      <View style={styles.actions}>
        <Button label={existing ? 'Save changes' : 'Add patient'} icon="checkmark" onPress={handleSave} />
        <Button label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
        {existing ? (
          <Button label="Delete patient" variant="danger" icon="trash-outline" onPress={handleDelete} />
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  heading: { ...typography.display, color: colors.text },
  subheading: { ...typography.body, color: colors.textMuted, marginTop: -spacing.sm },
  history: { ...typography.body, color: colors.textMuted },
  actions: { gap: spacing.md, marginTop: spacing.sm },
});
