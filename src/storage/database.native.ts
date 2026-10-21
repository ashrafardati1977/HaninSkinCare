import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';

import type { AppData, Patient, Session, Settings, TreatmentType } from '../types';
import type { DataDiff } from './diff';
import {
  patientToRow,
  rowToPatient,
  rowToSession,
  rowToSettings,
  rowToTreatmentType,
  sessionToRow,
  settingsToRow,
  treatmentTypeToRow,
  type PatientRow,
  type SessionRow,
  type SettingsRow,
  type TreatmentTypeRow,
} from './rows';
import { createEmptyData, sanitiseAppData, STORAGE_KEY } from './schema';

const DB_NAME = 'hanin-skincare.db';
const MIGRATION_FLAG = 'asyncstorage_migrated_v1';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY NOT NULL,
  patient_id TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  type_id TEXT NOT NULL,
  type_name TEXT NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  price REAL NOT NULL,
  paid INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_start_at ON sessions (start_at);
CREATE INDEX IF NOT EXISTS idx_sessions_patient_id ON sessions (patient_id);
CREATE INDEX IF NOT EXISTS idx_sessions_paid ON sessions (paid);

CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients (name);

CREATE TABLE IF NOT EXISTS treatment_types (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  default_price REAL NOT NULL,
  default_duration_minutes INTEGER NOT NULL,
  color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  clinic_name TEXT NOT NULL,
  currency TEXT NOT NULL,
  locale TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function open(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await db.execAsync(SCHEMA_SQL);
      await migrateFromAsyncStorage(db);
      return db;
    })().catch((error) => {
      // Allow a later attempt to retry rather than caching a rejected promise.
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

/**
 * One-time copy of the legacy AsyncStorage payload into SQLite.
 *
 * The AsyncStorage entry is deliberately left in place: it costs one small
 * record and means a failed migration never destroys the only copy of the data.
 */
async function migrateFromAsyncStorage(db: SQLite.SQLiteDatabase): Promise<void> {
  const flag = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM meta WHERE key = ?',
    [MIGRATION_FLAG],
  );
  if (flag) return;

  let legacy: AppData | null = null;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) legacy = sanitiseAppData(JSON.parse(raw));
  } catch {
    legacy = null;
  }

  if (legacy) await writeAll(db, legacy);

  await db.runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [
    MIGRATION_FLAG,
    new Date().toISOString(),
  ]);
}

export async function loadAll(): Promise<AppData> {
  const db = await open();
  const [sessionRows, patientRows, typeRows, settingsRow] = await Promise.all([
    db.getAllAsync<SessionRow>('SELECT * FROM sessions ORDER BY start_at DESC'),
    db.getAllAsync<PatientRow>('SELECT * FROM patients ORDER BY created_at DESC'),
    db.getAllAsync<TreatmentTypeRow>('SELECT * FROM treatment_types'),
    db.getFirstAsync<SettingsRow>('SELECT * FROM settings WHERE id = 1'),
  ]);

  const base = createEmptyData();

  // Seed the defaults on a fresh database so their ids stay stable across launches.
  // Sessions reference treatment types by id, so regenerating them each start would
  // silently detach every session from its type.
  if (typeRows.length === 0) {
    await db.withExclusiveTransactionAsync(async (txn) => {
      for (const type of base.treatmentTypes) await upsertType(txn, type);
    });
  }
  if (!settingsRow) {
    await upsertSettings(db, base.settings);
  }

  return {
    sessions: sessionRows.map(rowToSession),
    patients: patientRows.map(rowToPatient),
    treatmentTypes: typeRows.length > 0 ? typeRows.map(rowToTreatmentType) : base.treatmentTypes,
    settings: settingsRow ? rowToSettings(settingsRow) : base.settings,
  };
}

const SESSION_UPSERT = `INSERT INTO sessions (
  id, patient_id, patient_name, type_id, type_name, start_at, end_at,
  price, paid, notes, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
  patient_id = excluded.patient_id,
  patient_name = excluded.patient_name,
  type_id = excluded.type_id,
  type_name = excluded.type_name,
  start_at = excluded.start_at,
  end_at = excluded.end_at,
  price = excluded.price,
  paid = excluded.paid,
  notes = excluded.notes,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at`;

const PATIENT_UPSERT = `INSERT INTO patients (id, name, phone, email, notes, created_at)
VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  phone = excluded.phone,
  email = excluded.email,
  notes = excluded.notes,
  created_at = excluded.created_at`;

const TYPE_UPSERT = `INSERT INTO treatment_types (
  id, name, default_price, default_duration_minutes, color
) VALUES (?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  default_price = excluded.default_price,
  default_duration_minutes = excluded.default_duration_minutes,
  color = excluded.color`;

async function upsertSession(db: SQLite.SQLiteDatabase, session: Session): Promise<void> {
  const r = sessionToRow(session);
  await db.runAsync(SESSION_UPSERT, [
    r.id,
    r.patient_id,
    r.patient_name,
    r.type_id,
    r.type_name,
    r.start_at,
    r.end_at,
    r.price,
    r.paid,
    r.notes,
    r.created_at,
    r.updated_at,
  ]);
}

async function upsertPatient(db: SQLite.SQLiteDatabase, patient: Patient): Promise<void> {
  const r = patientToRow(patient);
  await db.runAsync(PATIENT_UPSERT, [r.id, r.name, r.phone, r.email, r.notes, r.created_at]);
}

async function upsertType(db: SQLite.SQLiteDatabase, type: TreatmentType): Promise<void> {
  const r = treatmentTypeToRow(type);
  await db.runAsync(TYPE_UPSERT, [
    r.id,
    r.name,
    r.default_price,
    r.default_duration_minutes,
    r.color,
  ]);
}

async function upsertSettings(db: SQLite.SQLiteDatabase, settings: Settings): Promise<void> {
  const r = settingsToRow(settings);
  await db.runAsync(
    `INSERT INTO settings (id, clinic_name, currency, locale) VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       clinic_name = excluded.clinic_name,
       currency = excluded.currency,
       locale = excluded.locale`,
    [r.clinic_name, r.currency, r.locale],
  );
}

async function deleteByIds(
  db: SQLite.SQLiteDatabase,
  table: string,
  ids: string[],
): Promise<void> {
  // Chunked so a large delete (reset, import-replace) does not build a huge
  // statement or exceed SQLite's variable limit.
  const CHUNK = 400;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const placeholders = chunk.map(() => '?').join(', ');
    await db.runAsync(`DELETE FROM ${table} WHERE id IN (${placeholders})`, chunk);
  }
}

/** Applies the minimal set of writes that turns the stored data into `diff`'s target. */
export async function applyDiff(diff: DataDiff): Promise<void> {
  const db = await open();
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const session of diff.sessions.upsert) await upsertSession(txn, session);
    await deleteByIds(txn, 'sessions', diff.sessions.deleteIds);

    for (const patient of diff.patients.upsert) await upsertPatient(txn, patient);
    await deleteByIds(txn, 'patients', diff.patients.deleteIds);

    for (const type of diff.treatmentTypes.upsert) await upsertType(txn, type);
    await deleteByIds(txn, 'treatment_types', diff.treatmentTypes.deleteIds);

    if (diff.settingsChanged) await upsertSettings(txn, diff.settingsValue);
  });
}

/** Replaces the whole database with `data`. Used by the one-time migration. */
async function writeAll(db: SQLite.SQLiteDatabase, data: AppData): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.execAsync('DELETE FROM sessions; DELETE FROM patients; DELETE FROM treatment_types;');
    for (const session of data.sessions) await upsertSession(txn, session);
    for (const patient of data.patients) await upsertPatient(txn, patient);
    for (const type of data.treatmentTypes) await upsertType(txn, type);
    await upsertSettings(txn, data.settings);
  });
}

export async function countRows(): Promise<{ sessions: number; patients: number }> {
  const db = await open();
  const s = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM sessions');
  const p = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM patients');
  return { sessions: s?.n ?? 0, patients: p?.n ?? 0 };
}
