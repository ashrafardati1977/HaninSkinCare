import type { AppData, Patient, Session, Settings, TreatmentType } from '../types';
import {
  patientToRow,
  rowToPatient,
  rowToSession,
  rowToTreatmentType,
  sessionToRow,
  settingsToRow,
  treatmentTypeToRow,
  type PatientRow,
  type SessionRow,
  type TreatmentTypeRow,
} from './rows';

export interface TableDiff<T> {
  upsert: T[];
  deleteIds: string[];
}

export interface DataDiff {
  sessions: TableDiff<Session>;
  patients: TableDiff<Patient>;
  treatmentTypes: TableDiff<TreatmentType>;
  settingsChanged: boolean;
  /** Target settings, written only when `settingsChanged` is true. */
  settingsValue: Settings;
}

/**
 * Works out the minimal set of writes needed to turn `prev` into `next`.
 *
 * Comparing serialised rows (rather than object identity) keeps this correct even
 * though the provider hands us a brand new object graph on every change, and it
 * means an untouched record is never rewritten.
 */
export function diffData(prev: AppData, next: AppData): DataDiff {
  return {
    sessions: diffTable(prev.sessions, next.sessions, (s) => s.id, sessionToRow),
    patients: diffTable(prev.patients, next.patients, (p) => p.id, patientToRow),
    treatmentTypes: diffTable(
      prev.treatmentTypes,
      next.treatmentTypes,
      (t) => t.id,
      treatmentTypeToRow,
    ),
    settingsChanged:
      JSON.stringify(settingsToRow(prev.settings)) !==
      JSON.stringify(settingsToRow(next.settings)),
    settingsValue: next.settings,
  };
}

function diffTable<T, R>(
  prev: T[],
  next: T[],
  getId: (item: T) => string,
  toRow: (item: T) => R,
): TableDiff<T> {
  const prevRows = new Map<string, string>();
  for (const item of prev) {
    prevRows.set(getId(item), JSON.stringify(toRow(item)));
  }

  const upsert: T[] = [];
  const seen = new Set<string>();
  for (const item of next) {
    const id = getId(item);
    seen.add(id);
    if (prevRows.get(id) !== JSON.stringify(toRow(item))) {
      upsert.push(item);
    }
  }

  const deleteIds: string[] = [];
  for (const id of prevRows.keys()) {
    if (!seen.has(id)) deleteIds.push(id);
  }

  return { upsert, deleteIds };
}

export function isEmptyDiff(diff: DataDiff): boolean {
  return (
    diff.sessions.upsert.length === 0 &&
    diff.sessions.deleteIds.length === 0 &&
    diff.patients.upsert.length === 0 &&
    diff.patients.deleteIds.length === 0 &&
    diff.treatmentTypes.upsert.length === 0 &&
    diff.treatmentTypes.deleteIds.length === 0 &&
    !diff.settingsChanged
  );
}

export { rowToPatient, rowToSession, rowToTreatmentType };
export type { PatientRow, SessionRow, TreatmentTypeRow };
