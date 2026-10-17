import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type {
  AppData,
  Patient,
  Session,
  SessionInput,
  Settings,
  TreatmentType,
} from '../types';
import { createId } from '../utils/id';
import { addMinutes } from '../utils/date';
import {
  buildDefaultTreatmentTypes,
  createEmptyData,
  DEFAULT_SETTINGS,
  loadData,
  saveData,
} from './persistence';

interface DataContextValue {
  ready: boolean;
  sessions: Session[];
  patients: Patient[];
  treatmentTypes: TreatmentType[];
  settings: Settings;

  createSession: (input: SessionInput) => Session;
  updateSession: (id: string, input: SessionInput) => void;
  deleteSession: (id: string) => void;
  toggleSessionPaid: (id: string) => void;

  createPatient: (patient: Omit<Patient, 'id' | 'createdAt'>) => Patient;
  updatePatient: (id: string, patient: Partial<Omit<Patient, 'id'>>) => void;
  deletePatient: (id: string) => void;

  createTreatmentType: (type: Omit<TreatmentType, 'id'>) => TreatmentType;
  updateTreatmentType: (id: string, type: Partial<Omit<TreatmentType, 'id'>>) => void;
  deleteTreatmentType: (id: string) => void;

  updateSettings: (settings: Partial<Settings>) => void;

  loadSampleData: () => void;
  resetAll: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

function toSession(input: SessionInput, id: string, createdAt?: string): Session {
  const now = new Date().toISOString();
  return {
    id,
    patientId: input.patientId,
    patientName: input.patientName.trim(),
    typeId: input.typeId,
    typeName: input.typeName,
    startAt: input.startAt.toISOString(),
    endAt: input.endAt.toISOString(),
    price: input.price,
    paid: input.paid,
    notes: input.notes?.trim() || undefined,
    createdAt: createdAt ?? now,
    updatedAt: now,
  };
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(createEmptyData);
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    let active = true;
    loadData().then((loaded) => {
      if (!active) return;
      setData(loaded);
      hydrated.current = true;
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Persist after hydration so the empty initial state never overwrites stored data.
  useEffect(() => {
    if (!hydrated.current) return;
    saveData(data).catch(() => {
      /* Storage failures are non-fatal; in-memory state stays authoritative. */
    });
  }, [data]);

  const createSession = useCallback((input: SessionInput) => {
    const session = toSession(input, createId('ses_'));
    setData((prev) => ({ ...prev, sessions: [session, ...prev.sessions] }));
    return session;
  }, []);

  const updateSession = useCallback((id: string, input: SessionInput) => {
    setData((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) =>
        s.id === id ? toSession(input, id, s.createdAt) : s,
      ),
    }));
  }, []);

  const deleteSession = useCallback((id: string) => {
    setData((prev) => ({ ...prev, sessions: prev.sessions.filter((s) => s.id !== id) }));
  }, []);

  const toggleSessionPaid = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) =>
        s.id === id
          ? { ...s, paid: !s.paid, updatedAt: new Date().toISOString() }
          : s,
      ),
    }));
  }, []);

  const createPatient = useCallback((patient: Omit<Patient, 'id' | 'createdAt'>) => {
    const created: Patient = {
      ...patient,
      name: patient.name.trim(),
      id: createId('pat_'),
      createdAt: new Date().toISOString(),
    };
    setData((prev) => ({ ...prev, patients: [created, ...prev.patients] }));
    return created;
  }, []);

  const updatePatient = useCallback((id: string, patch: Partial<Omit<Patient, 'id'>>) => {
    setData((prev) => {
      const nextPatients = prev.patients.map((p) => (p.id === id ? { ...p, ...patch } : p));
      const renamed = nextPatients.find((p) => p.id === id);
      // Keep denormalised session names in sync with a rename.
      const nextSessions =
        renamed && patch.name
          ? prev.sessions.map((s) =>
              s.patientId === id ? { ...s, patientName: renamed.name } : s,
            )
          : prev.sessions;
      return { ...prev, patients: nextPatients, sessions: nextSessions };
    });
  }, []);

  const deletePatient = useCallback((id: string) => {
    setData((prev) => ({ ...prev, patients: prev.patients.filter((p) => p.id !== id) }));
  }, []);

  const createTreatmentType = useCallback((type: Omit<TreatmentType, 'id'>) => {
    const created: TreatmentType = { ...type, id: createId('type_') };
    setData((prev) => ({ ...prev, treatmentTypes: [...prev.treatmentTypes, created] }));
    return created;
  }, []);

  const updateTreatmentType = useCallback(
    (id: string, patch: Partial<Omit<TreatmentType, 'id'>>) => {
      setData((prev) => ({
        ...prev,
        treatmentTypes: prev.treatmentTypes.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      }));
    },
    [],
  );

  const deleteTreatmentType = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      treatmentTypes: prev.treatmentTypes.filter((t) => t.id !== id),
    }));
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setData((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }, []);

  const resetAll = useCallback(() => {
    setData({
      sessions: [],
      patients: [],
      treatmentTypes: buildDefaultTreatmentTypes(),
      settings: { ...DEFAULT_SETTINGS },
    });
  }, []);

  const loadSampleData = useCallback(() => {
    setData(buildSampleData());
  }, []);

  const value = useMemo<DataContextValue>(
    () => ({
      ready,
      sessions: data.sessions,
      patients: data.patients,
      treatmentTypes: data.treatmentTypes,
      settings: data.settings,
      createSession,
      updateSession,
      deleteSession,
      toggleSessionPaid,
      createPatient,
      updatePatient,
      deletePatient,
      createTreatmentType,
      updateTreatmentType,
      deleteTreatmentType,
      updateSettings,
      loadSampleData,
      resetAll,
    }),
    [
      ready,
      data,
      createSession,
      updateSession,
      deleteSession,
      toggleSessionPaid,
      createPatient,
      updatePatient,
      deletePatient,
      createTreatmentType,
      updateTreatmentType,
      deleteTreatmentType,
      updateSettings,
      loadSampleData,
      resetAll,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside a DataProvider');
  return ctx;
}

function buildSampleData(): AppData {
  const treatmentTypes = buildDefaultTreatmentTypes();
  const typeByName = (name: string) =>
    treatmentTypes.find((t) => t.name === name) ?? treatmentTypes[0];

  const patientNames = [
    { name: 'Layla Al-Harbi', phone: '+966 55 214 8890', email: 'layla@example.com' },
    { name: 'Noor Abdullah', phone: '+966 50 771 3320', email: 'noor@example.com' },
    { name: 'Sara Mansour', phone: '+966 53 908 1147', email: 'sara@example.com' },
    { name: 'Huda Kamal', phone: '+966 56 442 7719' },
    { name: 'Reem Youssef', phone: '+966 54 330 5521', email: 'reem@example.com' },
  ];

  const patients: Patient[] = patientNames.map((p, i) => ({
    ...p,
    id: `pat_sample_${i}`,
    createdAt: new Date().toISOString(),
  }));

  const base = new Date();
  base.setHours(10, 0, 0, 0);

  const plan: Array<{
    patientIndex: number;
    typeName: string;
    dayOffset: number;
    hour: number;
    minute: number;
    priceOffset?: number;
    paid: boolean;
  }> = [
    { patientIndex: 0, typeName: 'HydraFacial', dayOffset: 0, hour: 10, minute: 0, paid: true },
    { patientIndex: 1, typeName: 'Skin Consultation', dayOffset: 0, hour: 12, minute: 30, paid: true },
    { patientIndex: 2, typeName: 'Chemical Peel', dayOffset: 0, hour: 15, minute: 0, paid: false },
    { patientIndex: 3, typeName: 'Facial Treatment', dayOffset: 1, hour: 11, minute: 0, paid: false },
    { patientIndex: 4, typeName: 'Microneedling', dayOffset: 1, hour: 14, minute: 0, priceOffset: 50, paid: false },
    { patientIndex: 0, typeName: 'Laser Hair Removal', dayOffset: 3, hour: 16, minute: 0, paid: false },
    { patientIndex: 1, typeName: 'Acne Treatment', dayOffset: -2, hour: 9, minute: 30, paid: true },
    { patientIndex: 2, typeName: 'HydraFacial', dayOffset: -5, hour: 13, minute: 0, paid: true },
    { patientIndex: 4, typeName: 'Facial Treatment', dayOffset: -8, hour: 17, minute: 0, priceOffset: -30, paid: true },
  ];

  const sessions: Session[] = plan.map((entry, i) => {
    const type = typeByName(entry.typeName);
    const patient = patients[entry.patientIndex];
    const start = new Date(base);
    start.setDate(start.getDate() + entry.dayOffset);
    start.setHours(entry.hour, entry.minute, 0, 0);
    const end = addMinutes(start, type.defaultDurationMinutes);

    return {
      id: `ses_sample_${i}`,
      patientId: patient.id,
      patientName: patient.name,
      typeId: type.id,
      typeName: type.name,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      price: Math.max(0, type.defaultPrice + (entry.priceOffset ?? 0)),
      paid: entry.paid,
      notes: i === 2 ? 'Follow-up on pigmentation progress.' : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  return { sessions, patients, treatmentTypes, settings: { ...DEFAULT_SETTINGS } };
}
