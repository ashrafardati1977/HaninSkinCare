import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppData, Patient, Session, Settings, TreatmentType } from '../types';
import { DEFAULT_TREATMENT_TYPES } from '../theme';
import { createId } from '../utils/id';

const STORAGE_KEY = 'hanin-skincare:v1';

export const DEFAULT_SETTINGS: Settings = {
  clinicName: 'Hanin Skincare',
  currency: 'SAR',
  locale: 'en',
};

export function buildDefaultTreatmentTypes(): TreatmentType[] {
  return DEFAULT_TREATMENT_TYPES.map((t) => ({ ...t, id: createId('type_') }));
}

export function createEmptyData(): AppData {
  return {
    sessions: [],
    patients: [],
    treatmentTypes: buildDefaultTreatmentTypes(),
    settings: { ...DEFAULT_SETTINGS },
  };
}

/** Tolerant loader: unknown or legacy shapes fall back to safe defaults per field. */
function sanitise(raw: unknown): AppData {
  const base = createEmptyData();
  if (!raw || typeof raw !== 'object') return base;

  const value = raw as Partial<AppData>;
  const sessions = Array.isArray(value.sessions)
    ? value.sessions.filter(isValidSession)
    : base.sessions;
  const patients = Array.isArray(value.patients)
    ? value.patients.filter(isValidPatient)
    : base.patients;
  const treatmentTypes =
    Array.isArray(value.treatmentTypes) && value.treatmentTypes.length > 0
      ? value.treatmentTypes.filter(isValidTreatmentType)
      : base.treatmentTypes;

  return {
    sessions,
    patients,
    treatmentTypes,
    settings: { ...base.settings, ...(value.settings ?? {}) },
  };
}

function isValidSession(value: unknown): value is Session {
  const s = value as Partial<Session> | null;
  return (
    !!s &&
    typeof s.id === 'string' &&
    typeof s.patientName === 'string' &&
    typeof s.startAt === 'string' &&
    typeof s.endAt === 'string' &&
    typeof s.price === 'number'
  );
}

function isValidPatient(value: unknown): value is Patient {
  const p = value as Partial<Patient> | null;
  return !!p && typeof p.id === 'string' && typeof p.name === 'string';
}

function isValidTreatmentType(value: unknown): value is TreatmentType {
  const t = value as Partial<TreatmentType> | null;
  return !!t && typeof t.id === 'string' && typeof t.name === 'string';
}

export async function loadData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyData();
    return sanitise(JSON.parse(raw));
  } catch {
    return createEmptyData();
  }
}

export async function saveData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function clearData(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
